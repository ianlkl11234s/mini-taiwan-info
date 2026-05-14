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
| **LIVE badge** | 綠色小 badge 標記「此 KPI 是 Supabase 即時資料」 |
| **SSOT** | Single Source of Truth |
| **TIC（Theme Integration Catalog）** | taipei-gis-analytics 的概念，per-theme 跨 Layer 1/2/3 聚合 |
| **Layer 1 / 2 / 3** | (1) POI / 點位 (2) Polygon / 空間範圍 (3) Realtime / 時序感測 |

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
