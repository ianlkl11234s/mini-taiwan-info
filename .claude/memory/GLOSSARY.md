# GLOSSARY — 術語表

> 第一次遇到新詞時記下。三類：(1) 專案自造詞 (2) 外部 API 術語 (3) 代碼對照

---

## 專案自造詞

| 詞 | 意思 |
|---|---|
| **mini-taiwan-info** | 本專案，各縣市開放資料儀錶板 |
| **GIS 三部曲** | mini-taiwan-info + gis-platform + taipei-gis-analytics |
| **manifest-driven** | 從 `themes/*.yaml` 渲染整個 view，不寫死特定主題 |
| **爆炸圖（Exploded View）** | KPI 卡點下去就地展開（22 縣市排序 / 歷年趨勢）|
| **PointProfile** | View A 點位概況面板，三模式：bucket / region / scatter |
| **TwoSectionLayers** | 地圖左上控制：著色指標 radio + 點位圖層 checkbox |
| **LIVE badge** | 嚴格定義（2026-05-14 拍板）：data collector 設 cron 自動持續抓 + 上游 realtime。**不是「DB 真資料」就叫 LIVE**。月/季/年資料標「資料時間 YYYY-MM-DD」 |
| **資料時間 badge** | 非 LIVE 資料的標示方式，顯示「最新採樣日」或「最新更新日」+ staleness 級別（日/月/年/已停採） |
| **freshness 級別** | 即時 (LIVE，cron 持續抓) / 日 (近 24hr 更新) / 月 (近月度更新) / 年 (年度 batch) / 已停 (半年以上未更新) |
| **SSOT** | Single Source of Truth |
| **TIC（Theme Integration Catalog）** | taipei-gis-analytics 的概念，per-theme 跨 Layer 1/2/3 聚合 |
| **Layer 1 / 2 / 3** | (1) POI / 點位 (2) Polygon / 空間範圍 (3) Realtime / 時序感測 |
| **Cycle** | `/water-loop` skill 的工作單位。一個 Cycle = 一個 P0 fix / 一個資料整合 / 一個視覺重做。Cycle 1 = 三 P0 fix（2026-05-14） |
| **Cycle Mode P/D/V** | P = 純前端 fix；D = 資料整合（含 migration）；V = 視覺重做。決定 cycle 走哪個分支 |
| **`__MAPBOX_TOKEN_PLACEHOLDER__`** | Mapbox token 取代慣例。其他 token 比照辦理（`__SUPABASE_ANON_KEY_PLACEHOLDER__` 等）。實際值放 .env / .env.local |
| **fetch 時序假象** | agent-browser headless 截圖時 SPA 尚未 hydrate 完成，KPI 顯示 ━ 但實際非 0。Cycle 1 P0-2 誤判由此而來；Discovery 截圖須 wait 3500ms+ 再 eval value 非 ━ 才當有效樣本 |
| **ViewB IA v2** | 2026-05-14 Cycle B 拍板：7 tabs 依水循環層重組（概覽/水庫/河川/地下水/防洪/用水與配送/排名）；取消「水質」「基礎設施」獨立 tab；水質拆解到對應水體 |
| **WaterQualitySection** | 共用 helper component (frontend/src/components/views/ViewB.tsx)：stationType 由 prop 鎖定，給 ReservoirsTab / RiverTab / GroundwaterTab 三 tab 共用 |
| **DataAgeBadge** | 替代 LIVE badge 用於非 collector cron 資料。6 級 freshness 自動分類（fresh/recent/month/year/stale/none），hover tooltip 顯示精確時間。位置 frontend/src/components/DataAgeBadge.tsx |
| **data-collectors** | sibling repo `/GIS/data-collectors/`，部署在 Zeabur 自動跑 cron 的 collector pipelines。LIVE 嚴格定義依據「collector 是否在這 repo 內有對應 cron」判定 |

## Supabase 水資源新 RPC（Cycle A 加）

| RPC | 簽名 | 用途 |
|---|---|---|
| `get_water_quality_county_summary(p_param, p_days, p_station_type)` | (TEXT, INT default 365, TEXT) | 22 縣市 × 該參數平均 + 站數 + reading 數 + 最新時間 |
| `get_water_quality_station_latest(p_station_type, p_county_id)` | (TEXT, VARCHAR) | 測站清單 + 每站最新 reading jsonb |
| `jq_extract_numeric(p_params, p_keys)` | (JSONB, TEXT[]) | jsonb 從多 key alias 取第一個非 null numeric。給水質 jsonb case mix 用（DO/do / NH3N/NH3-N/NH3_N）|

## Supabase 水資源新表（已建未接 Cycle Roadmap 對應）

| 表 | 列數 | 對應 Cycle | 用途 |
|---|---|---|---|
| `water_quality_stations` | 2,449 | A | epa_river/reservoir/gw + wra_gw |
| `water_quality_readings` | 8,775 | A | jsonb parameters，最新 epa_reservoir 2026-05-11 |
| `river_flow_stations` | 188 | E | 河川流量站 |
| `river_lines` | 2,015 | E | 河川 polyline |
| `river_basins` | 116 | E | 集水區 polygon |
| `reservoir_polygons` | 80 | G | 水庫範圍 polygon |
| `detention_basins` | 140 | I | 滯洪池 polygon |
| `groundwater_zones` | 21 | F | 地下水分區（西部 9 區 only） |
| `realtime.groundwater_level_readings` | 2,075,470 | F | 地下水位 realtime（collector cron） |
| `sewage_treatment_plants` | 82 | D | 汙水廠（lat/lng NULL 待 TGOS） |
| `storm_drainage_pipes` | 26,652 | I | 雨水下水道（3 縣市 only） |
| `storm_drainage_manholes` | 28,609 | I | 雨水下水道人孔 |
| `water_facilities` | 609 | D2 | 給水設施 |

## 縣市代碼三軌

| id_moi | code3 | slug | name_zh | name_en | region |
|---|---|---|---|---|---|
| A | TPE | taipei | 臺北市 | Taipei | north |
| B | TCH | taichung | 臺中市 | Taichung | central |
| C | KLC | keelung | 基隆市 | Keelung | north |
| D | TNN | tainan | 臺南市 | Tainan | south |
| E | KHH | kaohsiung | 高雄市 | Kaohsiung | south |
| F | NTP | new-taipei | 新北市 | New Taipei | north |
| G | ILA | yilan | 宜蘭縣 | Yilan | east |
| H | TYC | taoyuan | 桃園市 | Taoyuan | north |
| I | CYC | chiayi-city | 嘉義市 | Chiayi City | south |
| J | HSH | hsinchu-county | 新竹縣 | Hsinchu County | north |
| K | MIA | miaoli | 苗栗縣 | Miaoli | central |
| M | NAN | nantou | 南投縣 | Nantou | central |
| N | CHA | changhua | 彰化縣 | Changhua | central |
| O | HSC | hsinchu-city | 新竹市 | Hsinchu City | north |
| P | YUN | yunlin | 雲林縣 | Yunlin | central |
| Q | CYH | chiayi-county | 嘉義縣 | Chiayi County | south |
| T | PIF | pingtung | 屏東縣 | Pingtung | south |
| U | HUA | hualien | 花蓮縣 | Hualien | east |
| V | TTT | taitung | 臺東縣 | Taitung | east |
| W | KMN | kinmen | 金門縣 | Kinmen | island |
| X | PEH | penghu | 澎湖縣 | Penghu | island |
| Z | LCC | lienchiang | 連江縣 | Lienchiang | island |

歷史代碼（已退休，alias 仍認）：
- L → B（臺中縣併入臺中市，2010）
- R → D（臺南縣併入臺南市，2010）
- S → E（高雄縣併入高雄市，2010）

## Supabase RPC（本專案會用到）

| RPC | 簽名 | 回傳 | 用途 |
|---|---|---|---|
| `get_reservoir_status_latest()` | () | 37 列水庫即時 | View A 蓄水率 KPI + 40 點位 + PointProfile |
| `get_reservoir_status_day(date)` | (date) | day-level 時序 | （未用） |
| `get_reservoir_timeseries(id, from, to)` | (text, ts, ts) | hourly 時序 | View C 1 年 trend |
| `get_rain_gauge_latest()` | () | 1306 站 24hr 雨量 | View A 雨量 KPI |
| `get_flood_pct_by_county(rain, dur)` | (int, int) | 22 列縣市 % | View A 淹水 KPI |

## Supabase 表（本專案會用到）

| Schema.Table | 用途 |
|---|---|
| `reference.counties` | 22 縣市 SSOT |
| `reference.county_aliases` view | 中英/歷史名 → id_moi |
| `reference.county_regions` view | 5 區分組 |
| `public.water_reservoirs` | 40 水庫靜態 |
| `realtime.reservoir_status` | 水庫每小時時序 |
| `public.reservoir_situation_v` | 蓄水率 + alert_level view |
| `realtime.rain_gauge_readings` | 雨量站每 10 分鐘 |
| `public.flood_hazard_zones` | 17,303 個淹水多邊形 |
| `public.flood_hazard_pct_by_county` MV | 縣市 × 情境 高潛勢 % |
| `public.water_usage_yearly` | 22 × 17 年 LPCD（datagov 8316） |
| `public.sewage_coverage_yearly` | 22 縣市接管率（datagov 26815） |

## Mapbox

| 術語 | 意思 |
|---|---|
| **Mapbox GL JS** | 用的版本 3.9.0 |
| **light-v11** | 預設 style，淡色底圖 |
| **choropleth** | 行政區依數值著色（fill-color expression） |
| **circle layer** | 點位圖層（reservoirs / rain gauges） |
| **GeoJSON source** | 用 `tw-counties.geo.json` 460KB 簡化邊界 |
| **WebGL** | Mapbox 需要；agent-browser 無 WebGL（已用 ErrorBoundary 隔離） |

## datagov（政府資料平台）

| Dataset ID | 內容 | 對應 pipeline |
|---|---|---|
| 8316 | 自來水生活用水量 LPCD（縣市×年） | datagov_8316_lpcd.py |
| 26815 | 污水下水道用戶接管普及率 | datagov_26815_sewage.py |
| 45134 | 水污染稽查次數 | （未做） |
| 45135 | 水污染罰鍰次數 | （未做） |
| 45136 | 水污染實收罰鍰 | （未做） |
| 35644 | 農田水利署各管理處灌溉用水（18 處）| （未做） |
| 89034 | 河川 RPI 污染指標 | （未做） |

## CSS / 設計

| 詞 | 意思 |
|---|---|
| `.section` | 卡片容器（white 背景 + radius + padding） |
| `.kpi-card` | KPI 卡片 |
| `.exp-row` | 爆炸圖 row（rank + name + bar + value） |
| `.between` | flex space-between（已客製 min-width:0 + first/last child rules） |
| `.section-subtitle` | section 下方副標（已修 margin-top -8 → 4） |
| `--accent` | 主題色（CSS var，會跟 theme 切換） |
| `var(--positive-soft)` | LIVE badge 綠底 |

## 工具指令

| 指令 | 用途 |
|---|---|
| `pnpm dev` | 啟 Vite dev server (frontend/) |
| `pnpm typecheck` | tsc --noEmit |
| `psql "$DATABASE_URL" -c "..."` | Supabase 查詢 |
| `agent-browser --session-name miniti open URL` | 開瀏覽器 session |
| `agent-browser --session-name miniti screenshot path` | 截圖 |

## 消防主題（Fire）2026-05-15 加

| 詞 | 意思 |
|---|---|
| **fire 主題 4 區塊（S1/S2/S3/S4）** | S1 火災發生（incidents） / S2 火災救災（response） / S3 火災交叉量能（capacity） / S4 其他救災救護（others）。對應 ViewA-Fire 4 個 cat-block，設計來源 designs/v03-fire-design-brief-2026-05-15/SPEC.md |
| **5 大類起火原因（cause_5_id）** | 22 細項 → 5 大類 mapping：`intentional`（人為故意 縱火/自殺）/ `chemical`（化學燃料 瓦斯爆炸）/ `electrical`（電氣機械）/ `careless`（用火不慎 爐火/菸蒂/掃墓）/ `other`（其他不明）。對齊 fire.cause_taxonomy SSOT |
| **severity_signal** | 5 大類嚴重度色碼 `high`(紅 #DC2626 intentional+chemical) / `med`(黃 #F59E0B electrical) / `low`(綠 #10B981 careless) / `unknown`(灰 #9CA3AF other)。用件數最多 ≠ 致死率最高（用火不慎件數最多但自殺致死率 64.6% 最高）— 色碼幫 user 分辨「危險 vs 常見」 |
| **民國年（minguo year）** | fire.incidents.data_year_minguo 用民國年（111-113），西元 = minguo + 1911（113 = 2024）。frontend 顯示時換算 |
| **public.fire_* wrapper** | PostgREST 不 expose fire schema，故 migration 104 在 public 建 wrapper views/RPCs：`public.fire_cause_taxonomy`、`public.fire_incidents_by_*`、`public.fire_aggregate_count`、`public.fire_list_incidents`。Frontend 一律走 public |
| **`.dashboard-pane`** | 右側儀錶板容器，佔 viewport ~40%（左地圖 60% / 右儀錶板 40%）。必加 `overflow-x:hidden + min-width:0` 防內部元件超寬產生橫卷 |
| **`.cat-block`** | 4 區塊容器，每塊頂端有 `.cat-head`（含 `.cat-num` 編號 01-04 + 標題 + tagline + 右上 `.cat-badge.tone-*`） |
| **「待ETL」label** | 元件級 mock 標示。慣例：placeholder KPI 在 label 旁顯示 `<span class="muted">待ETL</span>`，明示「這格還沒接真實」 |

## B045/B046 Fire 後續詞彙（2026-05-16）

| 詞 | 定義 |
|---|---|
| **METRIC_NONE / 無染色** | `"_none_"` sentinel value，TwoSectionLayers 第一個 radio。User 選了 → 22 縣市 fill 變灰底 (#E5E9F0 + opacity 0.55)，讓 fire heatmap / 點位視覺不被著色 ramp 紅吃掉 |
| **showFireHeatmap / showFireStations** | MapView 的 fire 主題層 visibility prop（split 自 B045 原 `showFireBaseLayers`）。可獨立 toggle 火災 heatmap 跟分隊 dot/label。`showFireBaseLayers` deprecated |
| **FIRE_RADAR_AXES (5 軸)** | B046 ViewBFire 雷達圖 5 軸固定常數：fireDensity / deathRate / stationDensity / outOf5Min / hydrantDensity。每軸 `better: "higher" \| "lower"`。SPEC 原 6 軸去掉「財損」(schema 無 property_loss) |
| **雷達 score-unified** | 統一 normalized score 公式：higher-better `v/max`、lower-better `1 - v/max`，外圈永遠 = 表現好。Verdict `diff > 0 = better` 簡化（不用 goodDir flag）。詳 PRINCIPLES 2026-05-16 |
| **FIRE_MOCK_STATIONS** | mock-fire.ts 22 縣市質心 jitter 出 ~629 個分隊點位（B045 過渡，Sprint 2 真實 ETL 後 swap）。jitter 範圍依 area_km2 調整（大縣 0.12° / 小縣 0.04° / 連江 0.02°），deterministic pseudoRandom |
| **FIRE_KHH_OUTOF_VILLAGES** | mock-fire.ts 高雄市 10 個圈外村里 placeholder（桃源/茂林/三民/六龜...），ViewBFire Service tab Top 10 表用。Sprint 3 PostGIS ST_Buffer 衍生表 + 村里 polygon GeoJSON 接通後 swap |
| **public.fire_incidents_by_county_cause_year** | gis-platform migration 105 新 MV wrapper。縣市 × 年 × 5 大類 × 22 細項起火原因，823 rows。LEFT JOIN cause_taxonomy 保留 null cause（前端 `deriveCountyCauseAggregates` 合進 'other' bucket） |
| **「設計稿 className 移植」** | 從 `/tmp/{theme}_design/.../js/{view}.jsx` 移植元件時，JSX className 對應的 styles.css section 必須一併 append 到 globals.css。否則 dev server 看起來「跟 word 沒兩樣」純文字。PB-12 詳細 4 步 SOP |
