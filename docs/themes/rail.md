# 主題詳規 · 🚆 軌道運輸（rail）

> Draft 主題（priority 50）。定位是**靜態 / 半靜態統計策展**：站、線、班次的「家底帳」。
> **即時列車位置、到離站誤點不在本 repo**（歸 mini-taiwan-pulse）；但「從時刻表 derive 的統計」（每站每日停靠車次、尖峰離峰班次、車種占比）算半靜態（隨時刻表改版月更）—— 放本 repo。
> 資料分布：**點位 / 路線 / 時刻表齊全（現成於姐妹 repo）**，**站級運量人次與逐站縣市歸屬是缺口（Sprint 0 必補）**。

---

## 主題定位

「**站、線、班次的統計帳**」—— 把全島 9 套軌道系統（台鐵、高鐵 + 7 捷運/輕軌）的家底量化成可比、可排名、可按縣市切的統計。

**三大敘事支柱**：
1. **車站家底分級**：多少站、大站 vs 小站、各系統與各縣市分布
2. **班次密度與結構**：每站每日停靠車次、尖峰離峰差異、台鐵車種班次組成
3. **運量集中度**：站級進出站人次排名、縣市運量 choropleth（🔴 Sprint 0 待補）

**跨縣市系統處理**：北捷跨北北（台北市 + 新北市）、桃捷跨北桃（新北 + 桃園）。點選縣市時提示並同時呈現兩縣市的路網 —— 靠 Sprint 0 的逐站 `county_id` 解 `line → counties[]` 映射。

---

## View A · 全台概覽

### 全國 KPI 卡片（6 個）

```
┌─ 家底（結構，indigo 卡）──────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ │  491     │ │   18     │ │ 1,420 km │              │
│ │ 總車站數 │ │ 總路線數 │ │ 營運里程 │              │
│ └──────────┘ └──────────┘ └──────────┘              │
└──────────────────────────────────────────────────────┘

┌─ 班次（治理，藍卡）─────────────────────┐
│ ┌──────────┐ ┌──────────┐              │
│ │ 12,800   │ │ 2.4 倍   │              │
│ │ 每日車次 │ │ 尖離峰比 │              │
│ └──────────┘ └──────────┘              │
└──────────────────────────────────────────┘

┌─ 運量（結構，🔴 待補）──┐
│ ┌──────────┐            │
│ │  ──      │ Sprint 0   │
│ │ 年度運量 │ 待補       │
│ │ 人次     │            │
│ └──────────┘            │
└──────────────────────────┘
```

| # | 指標 | 單位 | 來源 | 爆炸模式 | 狀態 |
|---|---|---|---|---|---|
| 1 | 總車站數 | 站 | `rail.stations`（491 點） | dim(系統) + dim(縣市) | ✅ 現成 |
| 2 | 總路線數 | 條 | `rail.lines` | dim(系統) | ✅ 現成 |
| 3 | 營運里程 | km | `rail.lines`（tracks LineString） | dim(系統) | ✅ 現成 |
| 4 | 每日總停靠車次 | 次 | `rail.station_daily_trips`（時刻表 derive） | dim(系統) + dim(station 排名) | ✅ 半靜態 |
| 5 | 尖峰離峰班次比 | 倍 | `rail.station_daily_trips` | time(24h 逐時) | ✅ 半靜態 |
| 6 | 年度總運量 | 人次 | `rail.ridership_by_station` | dim(station 排名) + dim(縣市) | 🔴 Sprint 0 待補 |

> 另有 KPI「台鐵主力車種占比」（區間/自強/普悠瑪/莒光…）走 `tra_static`，donut 爆炸；放車站/路線 tab。

### Choropleth 預設 = 各縣市車站數

最直觀呈現「軌道家底縣市落差」。可切換為：
- 每站日均停靠車次（班次密度）
- 營運里程
- **各縣市運量 / 人均年運量**（🔴 Sprint 0 完成後解鎖）

### Point Profile 面板（491 車站）

三種檢視模式（manifest `point_profile.modes`）：
- **按系統**：台鐵 212 / 高鐵 12 / 北捷 / 桃捷 22 / 高捷 39 / 台中 18 / 高雄輕軌 38 / 淡海 14 / 安坑 9
- **站等分級**：bucket（class 0 大站 / class 1 一般站）—— ⚠️ 僅台鐵 + 高鐵有 class
- **停靠車次 × 系統**：scatter，看哪些系統的站「班次密但站少」

### 自動產出 hook

```yaml
hook_rules:
  - condition: "top5_station_trips_share > 0.25"
    text: "全台前 5 大站包辦 {top5_share}% 停靠車次 — {top_station} 每日 {top_trips} 班居冠。"
  - condition: "ridership_total == null"
    text: "站、線、班次帳已備齊；站級運量人次仍待 Sprint 0 ETL 補上。"
  - default:
    text: "全島 {stations_total} 站、{lines_total} 線、{rail_length_km} km，每日 {daily_trips_total} 班車次。"
```

---

## View B · 縣市儀錶板 Tab 結構

5 個 Tab：

```
新北市 / 🚆 軌道運輸
├── [概覽]       家底 KPI + 各系統車次長條 + 路網主視覺
├── [車站] ⭐    該縣市各系統車站列表 + 每站停靠車次排名 + 站點地圖
├── [路線時刻]   尖峰離峰逐時班次分布 + 台鐵車種 donut（可切系統/路線）
├── [運量]       站級進出站運量趨勢（🔴 Sprint 0 待補）
└── [排名]       該縣市在 22 縣市的位次
```

### Tab 1「概覽」

```
KPI: 車站 78 站 · 路線 9 線 · 里程 142 km · 每日 4,200 班

[地圖] ⭐ 主視覺：新北市軌道網
  ━ tracks LineString 依系統著色（台鐵藍 / 北捷各線 / 淡海/安坑輕軌）
  ● stations 點位，大站放大
  ⚠️ 跨縣市系統：點新北 → 北捷紅藍綠橘環狀同時亮台北市段
                  並提示「北捷跨北北、桃捷跨北桃」

[長條] 各系統車站數 / 車次（台鐵 vs 北捷 vs 輕軌）
```

### Tab 2「車站」⭐ 核心

```
[表格] 該縣市各系統車站列表
  站名 | 系統 | 所屬路線 | 站等 | 日均停靠車次 ↓
  板橋   台鐵   縱貫線    大站   312
  台北   台鐵   縱貫線    大站   408   (跨縣市顯示)
  ...

[長條] 大站每日停靠車次 Top（時刻表 derive）

[爆炸] 點某站 → View C 車站詳情（逐時停靠車次 + 月運量）
```

### Tab 3「路線時刻」

```
KPI: 路線 9 線 · 尖離峰比 2.4 倍 · 台鐵自強占 18%

[長條] 24 小時逐時班次分布（尖峰 07-09 / 17-19 vs 離峰）
       [切] 全系統 / 台鐵 / 北捷板南線 / ...

[Donut] 台鐵車種班次占比
        區間 52% · 自強 18% · 普悠瑪 9% · 莒光 7% · 其他 14%
```

### Tab 4「運量」🔴 Sprint 0 待補

```
KPI: 年度運量 ── 人次（placeholder）

[時序] 站級進出站運量月趨勢
       資料源 rail.ridership_by_station（台鐵 gateInComingCnt/gateOutGoingCnt
       + 各捷運入站/出站 + 高鐵運量）

⚠️ UI：coverage_note placeholder，Sprint 0 ETL 完成前顯示「運量資料整備中」
```

### Tab 5「排名」

該縣市在以下指標的全台位次：
- 車站數
- 每日總停靠車次
- 營運里程
- 年度運量（🔴 Sprint 0 待補）

---

## View C · 資料集深入 — 三個 wow demo

### Demo 1 · 「全台軌道網 + 大站停靠車次」⭐⭐ 最強敘事

```
背景：哪些站是全島的軌道心臟？

[地圖] 全台
  ━ 所有系統 tracks LineString 依系統著色
  ● 491 車站，按日均停靠車次決定點大小（大站爆大）
  ▒ 縣市 choropleth（車站數 / 可切運量）

[排名] 大站每日停靠車次 Top 20（台北 / 板橋 / 桃園 / 台中 / 高雄…）

[敘事] 「全台前 5 大站包辦 X% 停靠車次 — 軌道流量高度集中於西部走廊。」
```

### Demo 2 · 「尖峰離峰班次熱力 + 車種切片」

```
[熱力/長條] 某路線 24 小時逐時班次（顏色越深班次越密）
  - 主線：總班次
  - 切片：按車種（台鐵）或按起訖站類型

[Donut] 台鐵車種班次占比（區間 / 自強 / 普悠瑪 / 莒光…）

[爆炸] 點某時段 → 展開該時段各車種班次

[敘事] 「通勤尖峰 07-09 點班次達離峰 2.4 倍 — 區間車主撐尖峰。」
```

### Demo 3 · 「跨縣市系統聯動」⭐ 跨縣市看點

```
背景：北捷不只在台北，桃捷橫跨北桃。

[地圖] 點台北市
  → 北捷紅藍綠橘環狀亮起，但同步 highlight 新北市路段
  → 側欄列出「此路線跨越：台北市 + 新北市」

[表格] line → counties[] 映射（靠 Sprint 0 逐站 county_id 聚合）
  淡水信義線：台北市 + 新北市
  機場捷運：  新北市 + 桃園市

[敘事] 「軌道不認縣市界 — 北捷淡水信義線 X 站在新北、Y 站在台北。」
```

---

## View D · 跨縣市比較指標

```yaml
comparable_metrics:
  - id: station_count
    label: 車站數
    unit: 站
    ranking_better: higher
  - id: rail_length_km
    label: 營運里程
    unit: km
    ranking_better: higher
  - id: daily_trips_per_station
    label: 每站日均停靠車次
    unit: 次/站
    ranking_better: higher
  - id: ridership_per_capita
    label: 人均年運量
    unit: 人次/人
    ranking_better: higher
    coverage_note: 🔴 Sprint 0 待補
```

---

## 爆炸圖實例

### Case 1 · 每日車次 12,800 班 → 維度爆炸（系統）

```
[KPI: 全台每日 12,800 班]
   ⤴ 按系統
┌────────────────────────────────────────┐
│ 各系統每日停靠車次                       │
│ ────────────────────────────────────── │
│ 台北捷運  ▮▮▮▮▮▮▮▮▮▮  5,200 (41%)    │
│ 台鐵      ▮▮▮▮▮▮       3,100 (24%)    │
│ 高雄捷運  ▮▮▮            1,400 (11%)    │
│ 高鐵      ▮▮               980 ( 8%)    │
│ 桃園捷運  ▮▮               760 ( 6%)    │
│ ...輕軌   ▮▮             1,360 (10%)    │
└────────────────────────────────────────┘
[切] [按車站排名] [按縣市]
```

### Case 2 · 台鐵車種占比 → 維度爆炸（車種）

```
[KPI: 台鐵主力車種 區間車 52%]
   ⤴ 按車種
┌────────────────────────────────────────┐
│ 台鐵車種班次占比                         │
│ ────────────────────────────────────── │
│ 區間車    ▮▮▮▮▮▮▮▮▮▮  52%             │
│ 自強      ▮▮▮▮          18%             │
│ 普悠瑪    ▮▮             9%             │
│ 莒光      ▮▮             7%             │
│ 太魯閣    ▮              5%             │
│ ...其他   ▮▮             9%             │
└────────────────────────────────────────┘
```

### Case 3 · 大站停靠車次 → 維度爆炸（車站排名）

```
[KPI: 每日 12,800 班]
   ⤴ 按車站
┌────────────────────────────────────────┐
│ 大站每日停靠車次 TOP（時刻表 derive）   │
│ ────────────────────────────────────── │
│ 台北   ▮▮▮▮▮▮▮▮▮▮  408 (台北市)        │
│ 板橋   ▮▮▮▮▮▮▮▮     312 (新北市) 跨    │
│ 桃園   ▮▮▮▮▮▮       268 (桃園市)        │
│ 台中   ▮▮▮▮▮        242 (台中市)        │
│ 高雄   ▮▮▮▮▮        238 (高雄市)        │
│ ...                                    │
└────────────────────────────────────────┘
🔴 切「按運量」需 Sprint 0 ridership_by_station
```

---

## 跨主題聯動

```yaml
crosslink:
  - with: demographics
    metric_pair: [ridership_per_capita, pop_density]
    trigger: "abs(corr(ridership_per_capita, pop_density)) > 0.3"
    text: "{county} 人口密度 {density} · 人均年運量 {ridership} 人次 — 軌道可達性 vs 人口"

  - with: real_estate
    metric_pair: [daily_trips_per_station, price_per_ping]
    trigger: "always"
    text: "{county} 每站日均 {trips} 班 · 房價 {price}/坪 — 站點密度 vs 房價"
```

---

## ⚠️ 縣市覆蓋警告

| 資料 | 限制 |
|---|---|
| **站級運量人次** | 🔴 **Sprint 0 缺口**：catalog 已索引（台鐵每日各站進出站 / 各捷運入出站 / 高鐵運量）但全部未撈，撈完才能上「大站運量排名」「縣市運量 choropleth」 |
| **逐站縣市歸屬** | 🔴 **Sprint 0 缺口**：現況用 `system_id/line_code` 區分系統，無乾淨 `county_id`。需站點座標空間 join 行政區邊界（或解析台鐵 address），是「跨縣市系統」與「按縣市篩選」的前提 |
| **大站 polygon / 站等分級** | 僅台鐵 32 + 高鐵 12（44 大站，class 0/1）；捷運 / 輕軌**無 polygon、無大小站分級**（缺口 3，可用運量補算或標 placeholder） |
| **即時列車位置 / 誤點** | **不在本 repo**，歸 mini-taiwan-pulse |
| **時刻表頻率** | 隨改版月更（半靜態），非每日即時；本 repo 取 derive 統計而非即時班表 |
| **無軌道縣市** | 部分離島 / 純鄉村縣市無軌道，車站數為 0，choropleth 顯示空值非 0 誤導 |

UI 處理：運量缺口走 `pending_geocode` placeholder；捷運站等用 placeholder（不顯示分級）；無軌道縣市明確標「無軌道資料」。

---

## 資料源完整清單

### Layer 1 (Supabase) — Sprint 0 建表

| 表 | 來源 | 頻率 | 狀態 |
|---|---|---|---|
| `rail.stations` | 各系統車站點位（含 system / class / **county_id**） | 月 | Sprint 0：現成 GeoJSON 上表 + 加 county_id |
| `rail.lines` | 各系統路線幾何 + 里程（含 county_ids[]） | 月 | Sprint 0：tracks GeoJSON 上表 |
| `rail.station_daily_trips` | 每站每日停靠車次 + 尖峰離峰逐時（時刻表 derive） | 月 | Sprint 0：time-table derive ETL |
| `rail.ridership_by_station` | 站級進出站運量人次 | 月 | 🔴 Sprint 0：**新 pipeline 撈** datagov + join 站碼→座標 |

### 現成可直接用（姐妹 repo / collector 歸檔）

| 資料 | 位置 | 內容 |
|---|---|---|
| 車站點位（分系統） | `mini-taiwan-pulse/public/rail/{sys}/stations/*.geojson` | 台鐵 244（含 class）/ 高鐵 12 / 北捷紅51藍23綠20橘26棕24 / 桃捷22 / 高捷39 / 台中18 / 高雄輕軌38 / 淡海14 / 安坑9 / 新北14 |
| 車站合併版 | `mini-taiwan-pulse/public/geo/station_points.geojson` | 491 點（system_id: tra212/trtc184/krtc39/klrt38/tmrt18） |
| 大站 polygon | `mini-taiwan-pulse/public/geo/station_polygons.geojson` | 44 大站（台鐵 32 + 高鐵 12，class 0=16 / 1=28） |
| 捷運出入口 | `taipei-gis-analytics/data/processed/transportation/mrt/mrt_stations_all.geojson` | 587 出入口 |
| 路線幾何 | `mini-taiwan-pulse/public/rail/{sys}/tracks/*.geojson` | 台鐵267段 / 北捷94 / 高捷4 / 高鐵2 / 台中2 / 高雄輕軌2 LineString |
| 時刻表 / 車次 / 車種 | 台鐵 `master_schedule.json`、各捷運 schedules JSON | derive 每站每日停靠車次、尖峰離峰、車種占比 |
| collector 歸檔 | data-collectors `rail_timetable.py`（每日台鐵+高鐵時刻表）+ `tra_static.py`（TrainType/Line/StationOfLine/Shape） | 半靜態 derive 的原料 |

### 主要資料源 ID / API

| 來源 | 端點 / dataset | 內容 | 頻率 |
|---|---|---|---|
| TDX | Rail/TRA（NetworkID） | 台鐵車站 / 路線 / 時刻表 / 車種 | monthly |
| TDX | THSR | 高鐵車站 / 路線 / 時刻表 | monthly |
| TDX | Metro（各系統 NetworkID：TRTC/TYMC/KRTC/TMRT/KLRT/NTDLRT/NTALRT） | 各捷運輕軌車站 / 路線 / 時刻表 | monthly |
| datagov | 台鐵「每日各站點進出站人數」（gateInComingCnt/gateOutGoingCnt） | 站級運量 🔴 | monthly |
| datagov | 各捷運「各站旅運量」入站 / 出站 | 站級運量 🔴 | monthly |
| datagov | 高鐵運量統計 | 站級運量 🔴 | monthly |

---

## MVP 範圍（Sprint 切分）

### Sprint 0 · 前置 ETL（⭐ 在任何前端 view 之前完成）

**目標：把站 / 線 / 車次統計與運量 / 縣市歸屬補齊上 Supabase。**

- **缺口 2（逐站縣市歸屬）**：站點座標 ST_Within 空間 join 行政區邊界（reference 已有邊界）→ 每站加 `county_id`；台鐵可雙軌用 address 解析校驗。產 `line → county_ids[]` 映射（解跨縣市系統）。
- **缺口 1（站級運量）**：新 pipeline 撈台鐵/各捷運/高鐵 datagov 運量 → join 站碼 → 站點座標 → 產 `rail.ridership_by_station`（月）。
- **車站 / 路線上表**：現成 GeoJSON（491 站 / tracks）→ `rail.stations`（含 system/class/county_id）+ `rail.lines`（含 length_km / county_ids[]）。
- **車次統計 derive**：從台鐵 `master_schedule.json` + 各捷運 schedules + collector 歸檔 → derive 每站每日停靠車次、尖峰離峰逐時、台鐵車種班次占比 → `rail.station_daily_trips`。
- **縣市維 view**：`v_county_rail_stations`（按系統車站數 + 車次）/ `v_county_rail_length` / `v_station_daily_trips_rank`。
- **缺口 3（捷運站等）**：先標 placeholder；可選用運量分位數補算 class。

### Sprint 1 · View A + 車站/路線 tab

- `themes/rail.yaml`（本檔已備）
- View A：6 KPI（運量先 placeholder）+ 車站數 choropleth + point_profile（491 站，按系統 / 站等 / scatter）
- ExplodedView：系統爆炸、台鐵車種 donut、大站車次排名
- 地圖主視覺：全台軌道網（tracks 依系統著色 + stations 大站放大）
- View B Tab 1（概覽）/ Tab 2（車站）/ Tab 3（路線時刻）

### Sprint 2 · 運量 + 跨縣市 + 比較

- 站級運量 ETL 落地 → 解鎖 KPI 6、運量 choropleth、Tab 4（運量）、運量版大站排名
- **跨縣市系統聯動**（Demo 3）：點北捷/桃捷同時呈現兩縣市路網（靠 Sprint 0 county_ids[]）
- View D 比較（4 指標）+ Tab 5（排名）
- 跨主題 InsightCard（demographics 人口密度 / real_estate 房價）

### 延後（後續）

- 貓空纜車（非軌道嚴格定義，可選掛入）
- 站別無障礙 / 轉乘 / 出入口數整合（587 出入口已現成，可後補進車站詳情）
- 路線停駛 / 改點歷史（事件型，偏 pulse）
- 規劃中 / 興建中路線（北捷環狀線南北環、基隆捷運等 — 屬規劃資料另議）

---

## 預估工時

- Sprint 0 前置 ETL（空間 join + 運量撈 + 車次 derive + 上表）：1.5 週
- Sprint 1 View A + 車站/路線/概覽 tab：1 週
- Sprint 2 運量 + 跨縣市聯動 + 比較 + crosslink：1 週

**約 3.5 週**（Sprint 0 較重，因含兩個關鍵缺口的 ETL）。

---

## 參考檔案

- Manifest: `themes/rail.yaml`
- 現成資料（姐妹 repo）:
  - `mini-taiwan-pulse/public/geo/station_points.geojson` — 491 車站
  - `mini-taiwan-pulse/public/geo/station_polygons.geojson` — 44 大站
  - `mini-taiwan-pulse/public/rail/{sys}/tracks/*.geojson` — 路線幾何
- collector 歸檔: data-collectors `rail_timetable.py` / `tra_static.py`
- 縣市 SSOT: `data/counties.yaml`
