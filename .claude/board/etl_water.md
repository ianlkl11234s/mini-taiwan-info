# ETL_WATER — water 主題缺的兩個全國 KPI 後端（LPCD + 污水接管率）

**日期**：2026-05-30　**流程**：Flow B（analytics + gis-platform，未動 data-collectors）
**結論**：✅ 兩項皆完成（屬「infra 早在、只缺最後一哩」型）

---

## 1. 可行性結論

兩個 KPI 的底表 + pipeline **早已存在且有資料**，真正缺的只有「全國彙整 RPC」+ inventory/catalog 同步。約 35 分鐘完成，無破碎來源、無 🔴。

| 項目 | apply 前狀態 |
|------|------|
| `public.water_usage_yearly`（LPCD 縣市×年） | ✅ 已建（mig 094）、**374 列**（22 縣市 × 2008–2024）、anon 200 |
| `public.sewage_coverage_yearly`（接管率 縣市×年） | ✅ 已建（mig 095）、**22 列（僅 2024 單一年度）**、anon 200 |
| RPC `aggregate_national_lpcd` | ❌ 404（前端 yaml 宣告但後端未實裝）→ 本輪建 |
| RPC `aggregate_national_sewage_coverage` | ❌ 404 → 本輪建 |
| pipeline | ✅ `analytics/pipelines/socioeconomic/datagov_8316_lpcd.py`、`pipelines/infrastructure/datagov_26815_sewage.py`（production 級） |

> 註：前端 `themes/water.yaml` 把 KPI 的 `query` 寫成 `aggregate_national_lpcd` / `aggregate_national_sewage_coverage`，但目前 `frontend/src/lib/queries/water.ts` 其實是用 supabase-js `.from(table).select()` 直查表、在 JS 端算平均（這兩個 RPC 名是 spec-only，前端程式尚未呼叫）。本輪把 RPC 依 yaml 宣告補齊，前端可選擇遷移到 RPC（見 §5）。

---

## 2. 各子項做了什麼

### 2-1. LPCD 人均日用水量 ✅
- 新增 RPC `public.aggregate_national_lpcd(p_spark_years INT DEFAULT 16)`（gis-platform mig **133**）。
- anon REST 實測 **200**：`{value:272.6, value_weighted:289.1, latest_year:2024, delta:1.9, spark:[16 年升冪], n_counties:22}`。
- `value` = 22 縣市算術平均（對齊前端現行語意）；`value_weighted` = 人口加權（per-capita 更正確，289.1 L）。

### 2-2. 污水接管率 ✅（含 🟡 限制）
- 新增 RPC `public.aggregate_national_sewage_coverage(p_spark_years INT DEFAULT 10)`（gis-platform mig **134**）。
- anon REST 實測 **200**：`{value:52.8, latest_year:2024, delta:null, spark:[52.8], n_counties:22}`。
- 🟡 **限制 1**：`sewage_coverage_yearly` 目前**只有 2024 單一年度** → `delta=null`、`spark` 長度=1（spark[10] 待回填）。下次抓 26815 歷史年度即自動生效，RPC 邏輯不需改。下次怎抓：`analytics/pipelines/infrastructure/datagov_26815_sewage.py`，確認 26815 是否提供歷年（若只給當期，需找內政部營建署污水接管率歷年序列另補來源）。
- 🟡 **限制 2（語意警告）**：`value=52.8%` 是 **22 縣市算術平均**，非戶數加權的全國整體接管率。因 095 表 `served_households/total_households` 為 NULL，無法戶數加權。實務全國接管率（六都權重大）通常高於此數；前端 placeholder 寫 87% 可能是別的口徑。**前端標數字時建議註明「縣市平均」**或待回填戶數後改加權。

---

## 3. 新表 + RPC 名 + 欄位

無新建表（094/095 已存在）。新增 2 個 RPC（public schema，已 `GRANT EXECUTE TO anon, authenticated` + `NOTIFY pgrst`）：

| RPC | 參數 | 回傳（單列） | 底表 | migration |
|-----|------|------|------|-----------|
| `aggregate_national_lpcd` | `p_spark_years INT=16` | `value, value_weighted, latest_year(SMALLINT), delta, spark NUMERIC[], n_counties` | `public.water_usage_yearly` | 133 |
| `aggregate_national_sewage_coverage` | `p_spark_years INT=10` | `value, latest_year(SMALLINT), delta, spark NUMERIC[], n_counties` | `public.sewage_coverage_yearly` | 134 |

> migration 編號分配 133/134/135，本輪只用 **133、134**（135 未用，無新表故不需要）。

---

## 4. Commit（兩 repo，未 push）

- **gis-platform** `c8aeb41` — `feat(water): LPCD+接管率 全國彙整 RPC (mig133-134)`
  - `migrations/133_water_national_lpcd_rpc.sql`、`migrations/134_water_national_sewage_coverage_rpc.sql`、`docs/data-inventory.md`
- **taipei-gis-analytics** `45f5c88` — `feat(water): LPCD+接管率 catalog + registry 補全國 RPC`
  - 新建 `docs/data-catalog/water_resources/water_usage_yearly.md`、`…/sewage_coverage_yearly.md`
  - `docs/data-registry.yaml`（兩條目補 `rpc:`；lpcd status `ready_to_import`→`production`）

---

## 5. 前端接線指引（本輪未動前端，下次接）

**取代對象**：`ViewA.tsx` 的 mock fallback（`mock-data.ts` `WATER_NATIONAL_MOCK` 的 `lpcd:284 / sewage:87.0`，`isReal:false` 標記）。

**RPC base**：`https://utcmcikhvxnohbxchbrs.supabase.co/rest/v1/rpc/<fn>`（anon 可呼叫，已 200）。

**建議接法（supabase-js）**：
```ts
// LPCD KPI card
const { data } = await supabase.rpc("aggregate_national_lpcd");
// data[0] = { value, value_weighted, latest_year, delta, spark, n_counties }
//   KPI value ← data[0].value（或要 per-capita 正確值用 value_weighted）
//   delta     ← data[0].delta（vs 前一年，sentiment_when_up: negative）
//   spark     ← data[0].spark（已升冪、長度≤16，直接餵 response_shape.spark:number[16]）

// 接管率 KPI card
const { data } = await supabase.rpc("aggregate_national_sewage_coverage");
//   value ← data[0].value（52.8，⚠️縣市平均；delta 暫 null、spark 長度1）
```

**對應 yaml**：`themes/water.yaml` KPI `lpcd`（query: aggregate_national_lpcd）、`sewage_coverage`（query: aggregate_national_sewage_coverage）— RPC 已對齊該 query 名與 `response_shape:{value,delta,spark}`。

**各縣市值（choropleth / ranking / ViewB explode）不在這兩個 RPC**：
- 維持現行 `supabase.from("water_usage_yearly").select("county_id,year,lpcd")`（表已 374 列在線，正常）。
- sewage 同理 `from("sewage_coverage_yearly").select("county_id,year,coverage_pct")`。
- `county_id` = counties.yaml 的 `id_moi`（A/F/H… 單字母）。
- 若要 by-county 也走 RPC，未來再加 `*_by_county`（本輪未做）。

**驗收**：接線後 `ViewA` 兩張 KPI card 的 `isReal` 應轉 true；LPCD 顯示 ~272.6 L（或加權 289.1）、接管率 ~52.8%。

---

## 6. 其他備註 / 待辦
- 🟡 接管率歷年回填（見 §2-2 限制 1）— 補後 delta/spark 自動生效。
- 🟡 接管率戶數加權（見 §2-2 限制 2）— 需 095 表回填 served/total_households。
- twc_opendata 既有 `get_water_consumption_yearly`（全國 LPCD 時序 mig100）與本輪 094/133 互補：100 是台水全國時序，094 是 datagov 縣市切片，勿混用。
- `analytics/docs/systems/water_tic.md` 第 8 層仍標部分「待建」(舊狀態)，但該檔本 session 前已有他人未提交修改，**本輪刻意未動**避免混入；下次處理 water_tic 時順手同步。

=== DONE etl_water ===
