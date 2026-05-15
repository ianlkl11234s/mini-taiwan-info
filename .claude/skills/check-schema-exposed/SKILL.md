---
name: check-schema-exposed
description: Supabase 新 schema 接入前的 PostgREST exposed-schemas 預檢 + public wrapper 產生指引。當使用者準備寫第一個 cross-schema query（withSchema("xxx")）、新增非 public schema 主題（fire/demographics/safety/realtime ...）、或撞到 "Invalid schema: xxx" 錯誤時觸發。也可在 `/theme-loop` Stage 1 Discovery 階段主動呼叫。主動更新時機：發現新的 schema 陷阱（如 RLS 邏輯與 wrapper 衝突）時更新「常見陷阱」章節；Supabase / PostgREST 規格有變化時更新「why」章節。
user_invocable: true
---

# /check-schema-exposed — PostgREST schema 預檢

## 核心原則

**不要相信 typecheck pass 就代表 query 跑得起來。** PostgREST 在 Supabase Cloud 預設只 expose `public` schema，其他 schema 即使 GRANT 給了權限，runtime 仍會回 `Invalid schema: xxx`。這是平台層的設定，不是 SQL 能改的。

→ **任何新 schema 主題的 query 必須走 `public.{schema}_*` wrapper**。

## 何時觸發

- User 說「我要寫新主題的 query / 接 fire/demographics/safety schema」
- User 撞到 console error `Invalid schema: xxx`
- 設計新 manifest 開始接 RPC 前
- `/theme-loop` Stage 1 Discovery 階段自動呼叫
- 開新 schema 主題加進 ViewA 前

## 三步驟流程

### Step 1: 偵測該 schema 是否 expose

```bash
# 從 mini-taiwan-info root 跑
cd /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/gis-platform && source .env

# 試 SELECT 一個 schema 內任意表（schema 已在）
psql "$DATABASE_URL" -c "SELECT nspname FROM pg_namespace WHERE nspname='${SCHEMA_NAME}';"

# 但更關鍵：透過 Supabase REST API 試（這才是前端會撞的）
curl -s "${VITE_SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Accept-Profile: ${SCHEMA_NAME}" \
  -H "Content-Profile: ${SCHEMA_NAME}" \
  | head -3

# 若回 "Invalid schema" → 沒 expose，必須走 wrapper
# 若回 OpenAPI swagger JSON → 已 expose（罕見，user 手動加過）
```

或更簡單：列現有已 wrapper 的 schema：
```bash
psql "$DATABASE_URL" -c "
  SELECT DISTINCT regexp_replace(table_name, '^([a-z]+)_.*', '\\1') AS likely_wrapped_schema
  FROM information_schema.views
  WHERE table_schema='public' AND table_name ~ '^[a-z]+_'
"
```

### Step 2: 若沒 expose → 列 wrapper 需求清單

```bash
# 列該 schema 所有 tables / views / functions（給 wrapper 設計參考）
psql "$DATABASE_URL" <<EOF
SELECT 'table' AS kind, schemaname, tablename FROM pg_tables WHERE schemaname='${SCHEMA_NAME}'
UNION ALL
SELECT 'matview', schemaname, matviewname FROM pg_matviews WHERE schemaname='${SCHEMA_NAME}'
UNION ALL
SELECT 'function', n.nspname, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE n.nspname='${SCHEMA_NAME}'
ORDER BY 1, 3;
EOF
```

### Step 3: 提示產生 wrapper migration

把清單給 user 看，然後**建議呼叫 `/scaffold-rpc-wrapper`** 產 migration，或自己寫（參考 `gis-platform/migrations/104_fire_public_wrappers.sql` 範本）。

Wrapper 必備規格（≠ user 自己亂寫）：
- View 加 `WITH (security_invoker = true)` 保 RLS pass-through
- RPC 用 `LANGUAGE sql STABLE SECURITY INVOKER` 包原 function
- 命名慣例 `public.{schema}_{name}`（如 `public.fire_cause_taxonomy` / `public.fire_aggregate_count`）
- RPC RETURNS TABLE 簽名**必須** psql 跑 `pg_get_function_result()` 確認，不能憑記憶

## 常見陷阱

| 陷阱 | 症狀 | 對策 |
|---|---|---|
| 以為 GRANT USAGE 就能 expose | typecheck pass，runtime "Invalid schema" | 寫 public wrapper |
| 嘗試 `ALTER ROLE authenticator SET pgrst.db_schemas` | psql 報 `unrecognized configuration parameter` | 只能 Dashboard 改或走 wrapper |
| Wrapper RPC 簽名抄錯 | apply migration 報 `return type mismatch` | psql `pg_get_function_result()` 拿確切簽名 |
| 加了 wrapper 但 frontend 沒改 | 仍報 Invalid schema | 改 query 從 `withSchema("xxx")` → 預設 `supabase` client |
| Wrapper 漏 GRANT | runtime 報 permission denied | `GRANT SELECT/EXECUTE TO anon, authenticated` |

## 既有範本與 reference

- **範本 migration**：`../gis-platform/migrations/104_fire_public_wrappers.sql`
- **PRINCIPLES 條目**：`.claude/memory/PRINCIPLES.md` 2026-05-15 "PostgREST exposed schema 限制 → public schema wrapper 模式"
- **INCIDENTS 條目**：`.claude/memory/INCIDENTS.md` 2026-05-15 "PostgREST 拒絕 fire schema"

## 何時更新這份 skill

| 情境 | 更新什麼 |
|---|---|
| 撞到新的 schema 陷阱（RLS / 權限 / type） | 「常見陷阱」表追加 |
| Supabase / PostgREST 規格有變化 | 「核心原則」+ Step 1 偵測指令 |
| 多次走過相同 wrapper migration → 已有 `/scaffold-rpc-wrapper` skill | Step 3 連結它，本 skill 純預檢職責 |
| 撞到 `withSchema()` 在某 schema 意外 work | 重新驗證原則是否還成立 |

---

**設計理念**：給原則（「不信 typecheck」），不窮舉每個 schema 的處理方式。User 觸發後我會用 Step 1 偵測命中後再決定下一步。
