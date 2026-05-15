---
name: scaffold-rpc-wrapper
description: 自動產生 PostgREST public schema wrapper migration + 對應 TypeScript query function。當使用者準備暴露非 public schema 的 RPC / MV / table 給前端（mini-taiwan-info），需要寫 wrapper migration 或前端 query function 時觸發，或在 `/check-schema-exposed` 偵測到 schema 沒 expose 後接手。會 psql 拿原 RPC / MV 的確切簽名，避免「return type mismatch」rework。主動更新時機：發現新的 wrapper 模式（如 RLS-bypass 場景）時更新「進階模式」章節；TypeScript 型別系統升級時更新「query function 範本」。
user_invocable: true
---

# /scaffold-rpc-wrapper — Wrapper migration + TS query 骨架產生器

## 核心原則

**抄確切簽名，不抄記憶**。PostgreSQL function 的 RETURNS TABLE 簽名（column 名 + type + 順序）必須跟原 function 完全一致，差一個 column 都會 apply 報 `return type mismatch`。

→ **永遠 psql 拿原簽名再寫 wrapper**。

## 何時觸發

- User 說「幫我寫 wrapper migration」「scaffold RPC」「產生 public wrapper」
- `/check-schema-exposed` 偵測到 schema 沒 expose、提示產 wrapper 時
- 接手新 schema 主題、確定要把 N 個 table/MV/RPC expose 給前端時

## 標準 5 步驟

### Step 1: 拿確切簽名（最關鍵，避免 rework）

```bash
# 從 gis-platform/.env 來
cd /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/gis-platform && source .env

# RPC 簽名（input args + return type）
psql "$DATABASE_URL" <<EOF
SELECT
  proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS returns
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE n.nspname='${SCHEMA}' AND proname IN ('${RPC1}', '${RPC2}', ...);
EOF

# Table / MV columns
psql "$DATABASE_URL" -c "\d ${SCHEMA}.${TABLE}"
psql "$DATABASE_URL" -c "\d ${SCHEMA}.${MV}"
```

**輸出抓 returns 那欄**例如：
```
TABLE(total_count bigint, total_deaths bigint, total_injury bigint, latest_year int)
```
這就是 wrapper RETURNS TABLE 必須完全照抄的。

### Step 2: 找下一個 migration 編號

```bash
ls /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/gis-platform/migrations/ | sort | tail -3
# 取最大編號 + 1
```

### Step 3: 寫 migration

範本（複製 `migrations/104_fire_public_wrappers.sql` 結構）：

```sql
-- {N}_{schema}_public_wrappers.sql
-- 在 public schema 建立 {schema} 主題的 wrapper views + functions
BEGIN;

-- Views
DROP VIEW IF EXISTS public.{schema}_{table};
CREATE VIEW public.{schema}_{table}
  WITH (security_invoker = true) AS
  SELECT col1, col2, ... FROM {schema}.{table};
GRANT SELECT ON public.{schema}_{table} TO anon, authenticated;

-- RPC wrappers
CREATE OR REPLACE FUNCTION public.{schema}_{rpc}(
  p_arg1 TYPE DEFAULT NULL,
  ...
) RETURNS TABLE (
  -- ⚠ 從 Step 1 pg_get_function_result 完全照抄
) LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT * FROM {schema}.{rpc}(p_arg1, ...);
$$;

GRANT EXECUTE ON FUNCTION public.{schema}_{rpc}(...) TO anon, authenticated;

COMMENT ON VIEW public.{schema}_{table} IS 'public-schema wrapper of {schema}.{table}';
COMMENT ON FUNCTION public.{schema}_{rpc}(...) IS 'public-schema wrapper of {schema}.{rpc}';

COMMIT;
```

**關鍵**：
- Views 必加 `WITH (security_invoker = true)` 否則 RLS bypass（owner 跑）
- Function 必加 `SECURITY INVOKER` + `STABLE`（不能省）
- 命名慣例 `public.{schema}_{name}` snake_case
- COMMENT 寫清楚是 wrapper（防後人困惑）

### Step 4: Apply + 驗證

```bash
psql "$DATABASE_URL" -f migrations/{N}_{schema}_public_wrappers.sql 2>&1 | tail -10
# 期望看到 BEGIN / CREATE / GRANT / COMMENT / COMMIT
# 任何 ERROR → 99% 是 Step 1 簽名抄錯，回去重抓

# 驗證 anon 能讀
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM public.{schema}_{table};"
psql "$DATABASE_URL" -c "SELECT * FROM public.{schema}_{rpc}(...);"
```

### Step 5: 產生 frontend query function

對應寫 `mini-taiwan-info/frontend/src/lib/queries/{schema}.ts`：

```typescript
import { supabase } from "../supabase";
// ⚠ 不要 withSchema("xxx")，走預設 public

const db = supabase;

export interface {Schema}{Table}Row {
  // 對齊 Step 1 看到的 column type
  // PostgreSQL bigint → TS number（用 Number() 轉，避免 string）
  col1: number;
  col2: string;
  // ...
}

export async function fetch{Schema}{Table}(): Promise<{Schema}{Table}Row[]> {
  const { data, error } = await db
    .from("{schema}_{table}")
    .select("*");
  if (error) {
    console.error("[{schema}] {table} failed:", error);
    throw error;
  }
  // bigint → number 強制轉換
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    col1: Number(r.col1),
    col2: String(r.col2),
    // ...
  }));
}

export interface {Schema}{Rpc}Args {
  arg1: number | null;
  // ...
}

export async function {schema}{Rpc}(args: {Schema}{Rpc}Args) {
  const { data, error } = await db.rpc("{schema}_{rpc}", {
    p_arg1: args.arg1 ?? null,
    // ...
  });
  if (error) throw error;
  return data;
}
```

## 常見陷阱

| 陷阱 | 症狀 | 對策 |
|---|---|---|
| RETURNS TABLE column 數量寫錯 | apply 報 `return type mismatch in function declared to return record` | psql `pg_get_function_result()` 完全照抄 |
| View 漏 `security_invoker=true` | anon 看得到不該看的 row | 永遠加，除非有意 bypass RLS |
| Function 漏 `SECURITY INVOKER` | 預設 SECURITY DEFINER → 以 owner 身分跑，bypass RLS | 永遠寫明 SECURITY INVOKER |
| `STABLE` 漏寫 | postgres 拒絕 prepared plan 優化 | 永遠寫，純讀取就是 STABLE |
| 漏 GRANT | anon 報 permission denied | wrapper view + function 兩者都要 GRANT |
| 前端仍寫 `withSchema("xxx")` | 仍報 Invalid schema | 改用預設 `supabase` client |
| bigint 從 supabase-js 回來是 string | TS 接 `number` 對不上 | 用 `Number(r.col)` 強制轉 |

## 既有範本

- **完整範本**：`../gis-platform/migrations/104_fire_public_wrappers.sql`（5 views + 2 RPC）
- **前端對應**：`frontend/src/lib/queries/fire.ts`（含 bigint 轉換 + 8 個 derivation helper）
- **PB-10 SOP**：`.claude/memory/PLAYBOOKS.md` 開新主題完整流程的 Step 1（wrapper migration）

## 何時更新這份 skill

| 情境 | 更新什麼 |
|---|---|
| Supabase 增加新 wrapper 必要欄位（如 leakproof）| Step 3 範本 |
| 撞到新 wrapper 寫法（如 LATERAL JOIN / materialized）| 新增「進階模式」章節 |
| TypeScript 型別系統升級 → bigint 自動轉 number | Step 5 範本減量 |
| 發現新陷阱（如 column 順序 vs 名稱） | 「常見陷阱」表追加 |

---

**設計理念**：把「人類最容易抄錯的部分」（RPC 簽名 + bigint 轉換）變成機械化步驟，靠 psql 拿確切簽名而非記憶。
