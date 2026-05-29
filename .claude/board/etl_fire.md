# ETL fire — 火災財損 + 起火處所（Flow B）

**日期**: 2026-05-30　**Flow**: B（taipei-gis-analytics + gis-platform，未動 data-collectors）

## 可行性結論：✅ 已完成（不是從零，是「前一個 Sprint D 已做 95%，補最後一哩 + 修一個 grant bug + 一個資料 bug」）

探索後發現基礎設施**早已存在**：
- gis-platform `migration 107`（建 6 張 fire MOI 表）+ `109`（public wrapper views，security_invoker）
- analytics `pipelines/environment/fire/07_fetch_moi_stats.py` + `12c_upload_all_fire_stats.py`（已抓取+上傳）
- 資料已灌入 Supabase

真正的缺口只有 3 個，已全部修掉：
1. 🔧 **財損 anon 401**：`fire.casualty_property_by_county_year` 漏 anon table GRANT（其餘 5 張都有）→ security_invoker wrapper 報 `42501 permission denied` → 前端讀不到。
2. 🔧 **起火處所資料錯誤**：11952 raw 同時含「年度總計列 + 12 月別列」，normalize 全收 → **雙重計算（≈×2）**。DB 全國 2022 原本只有 1,575（覆蓋式 upsert 又把多筆覆蓋成一筆，反而過低），修正後 = **15,811**（官方年度 15,890，差 0.5% 屬處所子欄映射）。
3. ➕ 缺方便前端取用的「全國年度彙整 view」。

## 新增 / 修正的 Supabase 物件（schema: fire / public）

| public view（anon REST 200 實測） | 內容 | migration |
|---|---|---|
| `fire_casualty_property_by_county_year` | 縣市×年 死傷+財損（22 列 / **2020**）。**本輪修好 401** | 107表/109/**128 grant** |
| `fire_damage_national_yearly` | 全國年度財損 1 列：`year, loss_total_thousand(千元), damage_yi(億), damage_million(百萬), deaths, injuries, house_damage_units, ...` | **128** |
| `fire_incidents_by_location_type` | 縣市×年×6 大類（126 列 / **2022**） | 107表/109 |
| `fire_location_type_national_yearly` | 全國年度起火處所 6 列：`year, location_type, location_type_zh, incidents, pct` | **129** |

起火處所 6 大類碼→中文：`residential`住宅 / `commercial`商業場所 / `industrial`工廠倉儲 / `vehicle_outdoor`車輛 / `outdoor`田野戶外 / `other`其他。

## ⚠️ 資料覆蓋限制（前端須知）

datagov 11955/11952 **只發布最新單一年度快照**，非歷年序列：
- 火災財損 = **只有 2020（民國 109）**
- 起火處所 = **只有 2022（民國 111）**

→ 多年回填需手爬統計處歷年報表（大量、格式破碎），**本輪刻意不做**（time-box）。

## 前端接線指引（本輪未動前端，下一輪做）

### Gap 1 — 火災財損 KPI（取代 `themes/fire.yaml` 的 `yearly_damage_million` placeholder query）
- **查**：`supabase.from('fire_damage_national_yearly').select('year,damage_yi,damage_million,loss_total_thousand,deaths,injuries')`（public schema，免 Accept-Profile）
- **取值**：fire.yaml `unit: 億` → 用 **`damage_yi`**（2020 = **3.9 億**）。若要百萬則 `damage_million`（388.9）。
- **取代**：把 `query: fire_damage_million_placeholder` 換成接此 view。
- ⚠️ `compare_to: previous_year` 目前**無前一年**（單年）→ YoY 顯示 N/A 即可。
- 備選：縣市別用 `fire_casualty_property_by_county_year`（現已 200）。

### Gap 2 — 起火處所 donut（取代 `src/data/mock-fire.ts` 的 `FIRE_LOCATIONS_MOCK`）
- **查**：`supabase.from('fire_location_type_national_yearly').select('location_type,location_type_zh,incidents,pct').order('incidents',{ascending:false})`
- **對應**：`label ← location_type_zh`、`incidents ← incidents`、`pct ← pct`（已算好占比，免前端加總 22 縣市）。
- ⚠️ **`fatalityRate` 無法提供**：來源沒有「按起火處所分的死亡數」→ 前端請拿掉 fatalityRate 欄或設 null（死傷只有全國/縣市級，在財損表）。
- ⚠️ **分類差異**：mock 的「山林田野」「車輛」分開；DB 是 `outdoor`(田野/戶外) 與 `vehicle_outdoor`(車輛)，無獨立「山林」（真正山林火在 `fire.incidents_by_severity` 的 forest，另一張表、本輪未上線）。實際真值 2022：其他40.6% / 住宅23.9% / 車輛21.6% / 田野戶外7.8% / 工廠倉儲4.9% / 商業1.3%。

## Commit

- **gis-platform** `7980ea3` `feat(fire): 火災財損+起火處所表(mig128/129)`（mig128/129 + data-inventory）
- **taipei-gis-analytics** `068655a` `feat(fire): 火災財損+起火處所 pipeline+catalog`（07 聚合 bug 修 + catalog + registry + manifest）
- 皆**未 push**（依指示）。migration 128/129 已實際 apply 到線上 Supabase 並 anon REST 200 驗過。

## 後續（非本輪 scope）

- 起火原因 22 細項（11953）/ 火災類別 severity / 消防人力車輛 仍 `planned` 未上線。
- ⚠️ **11953/severity normalizer 可能有同款「年度列+月別列雙重計算」bug**，上線前須比對。
- 長期：`07_fetch_moi_stats.py` 應改寫到 `data/processed/fire/moi_statistics/` 子目錄（目前 flat + 子目錄兩處並存）。
- ⚠️ `opdadm.moi.gov.tw` TLS 憑證缺 Subject Key Identifier，重抓需 verify=False 或用快取 raw。

=== DONE etl_fire ===
