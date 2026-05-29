# ETL maritime — 燈塔 + 漁業權 + 港埠運量（Flow B）

**日期**: 2026-05-30　**Flow**: B（taipei-gis-analytics + gis-platform，未動 data-collectors）

## 可行性結論：✅ 三項全處理完（非從零；本地早有成品，缺口只在「沒上 Supabase / 沒建 public 契約」）

盤點後發現：**本地 processed 成品全都在**，真缺口只是 gis-platform 沒對應表。各項判定：

| 子項 | 判定 | 真實狀況 |
|---|---|---|
| **燈塔 lighthouse** | 🟢 做完 | 本地 `light_house/lighthouse.geojson` 36 點（geometry 已十進位）。maritime schema 無表 → 建 mig 130 + 灌入。原本連 `spatial.environment_layers` 都沒有 lighthouse layer，確實缺。 |
| **漁業權 fishery_rights** | 🟢 做完 | 本地 `fishery_rights/fishery_rights.geojson` 19 polygon（13 Polygon+6 MultiPolygon，真實幾何，含 area_km2/county/status）。⚠️ **線上開放平台無向量範圍**（nid 49025 僅地名文字、nid 16 無 WMS）；本面層是先前漁業署 Shapefile 數位化的本地成品 → 建 mig 131 + 灌入。（資料另以 layer_type 散在 `spatial.environment_layers`19 筆，但前端要的 `public.fishery_rights` 從沒建。） |
| **港埠運量 port_traffic** | ✅ 已上線（fire 情況） | `maritime.port_traffic_yearly` 早已 48 筆（2025+2026），anon REST 實測 206。**後端不缺**，前端 placeholder 純接線問題（見下）。 |

## 新增 Supabase 物件（schema: maritime / public）

| 物件 | 內容 | migration |
|---|---|---|
| `maritime.lighthouses` | 36 點 Point(4326)。欄位 `id, name(唯一鍵), lng, lat, lat_dms, lon_dms, geom, source, properties` | **130** |
| `maritime.fishery_rights` | 19 polygon → 統一 MultiPolygon(4326)。欄位 `id, name(唯一鍵), county, county_id(FK reference.counties，19/19全對上), code, status(現存/屆期), area_km2, geom, properties` | **131** |
| `public.lighthouse` | security_invoker view → maritime.lighthouses（`id,name,lng,lat,geom,properties`） | **132** |
| `public.fishery_rights` | security_invoker view → maritime.fishery_rights（`id,name,county,county_id,code,status,area_km2,geom,properties`） | **132** |

- 三件套照 115/128：RLS read policy + **table-level `GRANT SELECT TO anon`**（fire 那輪漏這行 → 401，本輪沒踩）。
- **anon REST 實測全 206**：`maritime.lighthouses`/`maritime.fishery_rights`（帶 `Accept-Profile: maritime`）、`public.lighthouse`/`public.fishery_rights`（免 header）。
- ⚠️ **PostgREST cache**：新 public view 建好後一定要 `NOTIFY pgrst, 'reload schema';`（本輪已執行），否則 REST 回 404 PGRST205。

## 前端接線指引（本輪未動前端，下一輪做）

### Gap 1 — 燈塔 lighthouse（maritime.yaml 已宣告，本輪讓它真的可用）
- `layers_catalog.lighthouse_point` 的 `source: public.lighthouse` → **現在真的存在了**（先前 YAML 註「已上線」其實是 stale，本輪才上）。`supabase.from('lighthouse').select('name,lng,lat')`（public，免 Accept-Profile）。
- KPI `lighthouse_count`（query id `maritime_lighthouse_count`）→ `select count` from `lighthouse` = **36**。
- `county_dashboard.hero` 的 `{source: lighthouse, suffix: 座燈塔}` 同上。
- ⚠️ 目前僅 `name`+座標，無等級/塔高/光程。若 UI 要那些屬性 → 見 backlog enrich。

### Gap 2 — 漁業權 fishery_rights（同上，本輪讓 public.fishery_rights 真的可用）
- `layers_catalog.fishery_rights_polygon` 的 `source: public.fishery_rights` → 現在存在。`supabase.from('fishery_rights').select('name,county,status,area_km2,geom')`。
- `datasets.fishery_right` 的 `source_table: public.fishery_rights` → 對得上；detail_fields `name/county/status/area_km2` 欄位全有。
- KPI `fishery_rights_area_km2`（query `maritime_fishery_rights_area`）→ `SUM(area_km2)` from fishery_rights，可 `GROUP BY county_id` 出縣市 explode。
- hook `fishery_rights_count` → `count(*)` = **19**。
- ⚠️ 別再去讀 `spatial.environment_layers WHERE layer_type='fishery_rights'`（舊散裝）→ 改用乾淨的 `public.fishery_rights`。

### Gap 3 — 港埠運量 port_calls / container（後端早就 ready，純接線）
- `maritime.port_traffic_yearly`（48 筆）**已可讀**，需帶 `Accept-Profile: maritime`。長表結構：`scope(port/national), port_name, port_uid, stat_period(YYYY), period_type, metric, value, unit, breakdown`。
- KPI `port_calls_yearly`（query `maritime_port_calls_placeholder`）→ 取 `metric='port_calls_艘次'`，全國值用 `scope='national'`，最新 `stat_period='2025'`。**把 placeholder query 換成接此表即可。**
- KPI `container_teu_yearly`（query `maritime_container_teu_placeholder`）→ `metric='container_teu'`。
- ⚠️ metric 命名實際值：`port_calls_艘次` / `container_teu` / `cargo_volume_噸`（用 `SELECT DISTINCT metric` 確認）。`compare_to: previous_year` 目前只有 2025/2026，YoY 樣本少。
- ⚠️ 全國級無座標 → 維持指標卡/趨勢圖，勿嘗試 choropleth（除非用 scope='port' 的港別值 join maritime.ports 座標）。

### 附帶可一起接（非本輪 3 缺口，但後端其實也 ready）
- `maritime.fishery_stats_by_county`（632 筆，1996-2024）**早已上線**。maritime.yaml 標 Sprint 0 待撈的 `fishery_production_tonnes`/`fishery_value_billion`/`fishing_vessels_count`（除漁船數全 NULL 外）其實可直接接，免再 ETL。

## Commit（皆未 push，依指示）

- **gis-platform** `7d7d4a9` `feat(maritime): lighthouses + fishery_rights tables + public wrappers (mig130-132)`（mig 130/131/132 + data-inventory；migration 已實際 apply 到線上 Supabase 並 anon REST 206 驗過）
- **taipei-gis-analytics** `27b7270` `feat(maritime): lighthouse + fishery_rights upsert pipeline + catalog`（02_upsert ×2 + 2 catalog .md + registry platform_target）
- 灌資料用 analytics `pipelines/transportation/light_house/02_upsert_lighthouse_supabase.py`、`pipelines/environment/fishery_rights/02_upsert_fishery_rights_supabase.py`（psycopg2 + ON CONFLICT(name)，可重跑）。

## 後續（非本輪 scope）

- **燈塔 enrich**：目前只有名稱+座標。塔高/燈高/光程/光質/啟用年代可從 datagov:38866（觀光署「台灣燈塔」CSV，32 座，DMS 文字需 parser）/ 28142（航港局燈質表）補進 `maritime.lighthouses.properties`。
- **漁業權 county 名 normalize**：來源含「台中市」等「台」字，已在 upsert 端用 `reference.counties.name_zh_alt` 對齊 county_id（19/19 OK），但 `county` 原始字串仍保留「台」字，前端顯示如要統一「臺」需自行 normalize。
- **漁業權法定範圍更新**：若要最新/更精細範圍，須向漁業署索取 SHP（非開放），或探 NLSC 海域使用分區。
- **maritime.yaml 升版**：data_sources 註解 `public.lighthouse 已上線 / public.fishery_rights 已上線` 從本輪起才為真；`status: beta`、3 個 fishery 統計 placeholder 可改接 fishery_stats_by_county。

=== DONE etl_maritime ===
