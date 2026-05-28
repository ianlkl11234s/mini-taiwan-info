# 主題詳規 · ⚓ 航運（maritime）

> 新主題（draft）。資料分布：**港口點位類齊全**（277 筆含完整分類，現成成品），**漁業 / 港埠運量統計類粒度粗**（縣市級 no_spatial，多數尚未撈）。本主題定位 = **靜態的海洋帳**。
>
> **🔴 定位界線**：mini-taiwan-info 只放「靜態統計」。**即時 AIS 船舶動態（同一時間多少船在海上跑）歸 mini-taiwan-pulse，本主題不放即時。** 使用者原問的「同時多少船在運作」改以漁業能量（漁船數 / 產量 / 產值）與港埠運量（年進出港船舶 / 貨櫃量）這類靜態統計回答；若要海域船數，僅取 `ship_trails_days_summary` 的「歷史日均」彙整值當低調指標。

---

## 主題定位

「**環島港口與漁業的靜態帳**」—— 台灣是海島，港口與漁業是國土邊界的骨架。本主題透過：
- 277 處港口的分類與縣市分布 → 看「漁業之島」的港埠骨架
- 漁業生產量 / 產值 / 漁船數 → 看各縣市的海洋經濟能量
- 港埠運量（進出港船舶 / 貨櫃量）→ 看商港的吞吐規模

**三大敘事支柱**：
1. **港埠骨架**：277 處港口分類（國際商港 7 / 國內商港 4 / 漁港 221 / 渡輪觀光 16…）+ 縣市分布
2. **海洋經濟**：漁業生產量 / 產值 / 現有漁船數（縣市級統計）
3. **吞吐規模**：商港進出港船舶艘次、貨櫃 TEU（iMarine，全國級無座標 → 指標 / 趨勢）

> 對比 fire（5 分鐘命運線）、water（南北分裂水帳）：maritime 的最強敘事 = **「漁業之島」的港口密度**——全國港口逾 7 成是漁港，離島小港密度遠勝本島。

---

## View A · 全台概覽

### 全國 KPI 卡片（含 3 個 placeholder 待 Sprint 0 ETL）

```
┌─ 港埠骨架（teal 卡）───────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │  277     │ │  221     │ │  XX.X    │ │  36      │  │
│ │ 總港口數 │ │ 漁港數   │ │ 漁業權   │ │ 燈塔數   │  │
│ │          │ │          │ │ km²      │ │          │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────────────────────────────────────────────────────┘

┌─ 海洋經濟（待 Sprint 0）──────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │  ▦▦▦     │ │  ▦▦▦     │ │  ▦▦▦     │      │
│ │ 漁業生產 │ │ 漁業產值 │ │ 現有漁船 │      │
│ │ 量(公噸) │ │ (億)     │ │ (艘)     │      │
│ │ ⏳ ETL   │ │ ⏳ ETL   │ │ ⏳ ETL   │      │
│ └──────────┘ └──────────┘ └──────────┘      │
└────────────────────────────────────────────────┘

┌─ 吞吐規模（待 Sprint 0 iMarine）──────┐
│ ┌──────────┐ ┌──────────┐            │
│ │  ▦▦▦     │ │  ▦▦▦     │            │
│ │ 年進出港 │ │ 年貨櫃量 │            │
│ │ 船舶艘次 │ │ TEU      │            │
│ │ ⏳ ETL   │ │ ⏳ ETL   │            │
│ └──────────┘ └──────────┘            │
└────────────────────────────────────────┘
```

| # | 指標 | 單位 | 來源 | 爆炸模式 | 狀態 |
|---|---|---|---|---|---|
| 1 | 總港口數 | 處 | ports_merged 277 筆 | dim(港口分類) + dim(縣市) | ✅ 現成（缺口 1 全量上 Supabase 後） |
| 2 | 漁港數 | 處 | ports_merged | dim(縣市) | ✅ 現成 |
| 3 | 商港數 | 處 | ports_merged | — | ✅ 現成（國際 7 + 國內 4） |
| 4 | 漁業權水域面積 | km² | fishery_rights | dim(縣市) | ✅ 已上線 |
| 5 | 燈塔數 | 座 | lighthouse | — | ✅ 已上線（36 座） |
| 6 | 漁業生產量 | 公噸 | 漁業署縣市統計 | dim(縣市) + time | 🔴 placeholder（缺口 2） |
| 7 | 漁業產值 | 億 | 漁業署縣市統計 | dim(縣市) + time | 🔴 placeholder（缺口 2） |
| 8 | 現有漁船數 | 艘 | 主計處 | dim(縣市) | 🔴 placeholder（缺口 2，no_spatial） |
| 9 | 年進出港船舶 | 艘次 | iMarine 171745 | dim(港口) + time | 🔴 placeholder（缺口 3，全國級） |
| 10 | 年貨櫃量 | TEU | iMarine 171741-3 | dim(港口) + time | 🔴 placeholder（缺口 3） |

### Choropleth 預設 = 各縣市港口數

清楚顯示「沿海 vs 內陸」「離島港多 vs 本島港少」的視覺差距。可切換為：
- 漁港數
- 漁業產值（待 Sprint 0）
- 年進出港船舶（待 Sprint 0，僅商港縣市著色）

**內陸縣市留白**：南投縣 / 嘉義市無海岸無港，choropleth `hide`；非沿海僅內陸養殖的縣市以 `warning_badge` 標示。

### 點位概況面板（point_profile，View A）

全國 277 處港口，兩種檢視模式：
- **按港口分類**（預設）：國際商港 `#0F766E` / 國內商港 `#14B8A6` / 漁港 `#5EEAD4` / 渡輪觀光 `#99F6E4`
- **按地理區**：北北基 / 桃竹苗 / 中彰投 / 雲嘉南 / 高屏 / 宜花東 / 離島

### 自動產出 hook

```yaml
hook_rules:
  - condition: "fishing_port_pct > 0.7"
    text: "全國 {total_ports} 處港口，漁港占 {fishing_port_pct}%（{fishing_port_count} 處）— 這是一座漁業之島。"
  - condition: "top_port_county == '澎湖'"
    text: "澎湖以 {top_port_count} 處港口居冠 — 離島小港密度遠勝本島。"
  - default:
    text: "環島 {total_ports} 處港口、{lighthouse_count} 座燈塔、{fishery_rights_count} 處漁業權水域 — 一份靜態的海洋帳。"
```

---

## View B · 縣市儀錶板 Tab 結構

5 個 Tab：

```
高雄市 / ⚓ 航運
├── [概覽]    港口 + 漁港 + 漁業權 + 燈塔 KPI（地圖疊四圖層）
├── [港口] ⭐ 港口點位（依分類著色）+ 港區 polygon + 分類組成
├── [漁業]    漁業生產量 / 產值 / 漁船數（待 Sprint 0）
├── [航線]    離島 / 跨港定期客船航線（多數本島縣市無）
└── [排名]    該縣市在 22 縣市的港口 / 漁業位次
```

### Tab 1「概覽」

```
KPI: 27 處港口 · 24 處漁港 · X km² 漁業權 · X 座燈塔

[地圖] 高雄市海岸線
  ⚓ 港口點（依分類著色：商港深 teal / 漁港淺 teal）
  ▒ 港區 polygon（OSM）
  ▒ 漁業權水域 polygon
  🔺 燈塔點

[餅圖] 該縣市港口分類組成
```

### Tab 2「港口」⭐ 主視覺

```
[地圖] 高雄市港口
  ⚓ 高雄港（國際商港）+ 各漁港
  ▒ 港區 polygon

[KPI] 商港數 / 漁港數 / 渡輪碼頭數

[長條] 各港口分類數量
[爆炸] 點某港 → View C 港口詳情頁
```

### Tab 3「漁業」（待 Sprint 0）

```
KPI: 漁業生產量 X 公噸 / 產值 X 億 / 現有漁船 X 艘

[時序] 漁業產值年度趨勢（縣市 vs 全國）
[長條] 漁業類別組成（遠洋 / 近海 / 沿岸 / 養殖）

⚠️ 等 Sprint 0 漁業署縣市統計 ETL 完成才上線
```

### Tab 4「航線」

```
[地圖] 該縣市定期客船航線（LineString，虛線）
[列表] 起訖港 / 距離 / 票價 / 營運商

⚠️ 離島 / 澎湖為主（36 條），多數本島縣市無定期航線 → 顯示「無定期航線」
```

### Tab 5「排名」

該縣市在以下指標的全台位次：
- 港口數
- 漁港數
- 漁業權水域面積
- 漁業產值（待 Sprint 0）

---

## View C · 資料集深入 — wow demo

### Demo 1 · 「漁業之島：港口分類地圖」⭐⭐ 最強敘事

```
背景：台灣到底有多少港？分布長怎樣？

[地圖] 全台 277 處港口
  ⚓ 國際商港 7（基隆 / 高雄 / 臺中 / 花蓮 / 臺北 / 蘇澳 / 安平）
  ⚓ 國內商港 4（布袋 / 馬公 / 金門水頭…）
  • 第一類漁港 9 + 第二類漁港 212（小點）
  ◌ 渡輪 / 觀光碼頭 16

[KPI] 漁港占比 X% · 離島港口數

[排名] 各縣市港口數（澎湖 73 居冠）

[敘事] 「全國逾 7 成港口是漁港，離島澎湖一縣就占 73 處 — 港口密度反映的是漁業而非商業版圖」
```

### Demo 2 · 「漁業縣市帳：產量 × 產值 × 漁船」（待 Sprint 0）

```
[地圖] 22 縣市 choropleth（漁業產值）
[散布] 漁船數（x） × 漁業產值（y） — 找「高效率小縣 vs 大艦隊」
[長條] 各縣市漁業類別組成

[敘事] 「高雄遠洋漁業產值居冠，但屏東 / 宜蘭近海沿岸艘數更多」
```

### Demo 3 · 「商港吞吐：進出港船舶 × 貨櫃量」（待 Sprint 0 iMarine）

```
[長條 / 趨勢] 各國際商港年進出港船舶艘次 + 貨櫃 TEU
  高雄港（貨櫃龍頭）vs 基隆 vs 臺中 vs 臺北港

[敘事] 「高雄港貨櫃量占全國 X%，是台灣對外貿易的單點命脈」

⚠️ iMarine 為全國 / 港別表格無座標，以「指標卡 + 趨勢圖」呈現，
   join 到港口點位後可在地圖標註各商港吞吐規模（氣泡大小）
```

---

## View D · 跨縣市比較指標

```yaml
comparable_metrics:
  - id: port_count               # 港口數，neutral（內陸縣市留白）
  - id: fishing_port_count       # 漁港數，neutral（限沿海）
  - id: fishery_rights_area_km2  # 漁業權水域面積，neutral（限 12 沿海縣市）
  - id: fishery_value_billion    # 漁業產值，higher（待 Sprint 0）
  - id: port_calls_yearly        # 年進出港船舶，neutral（限商港縣市，待 Sprint 0）
```

---

## 爆炸圖實例

### Case 1 · 港口 277 處 → 維度爆炸（港口分類）

```
[KPI: 全國 277 處港口]
   ⤴ 按分類
┌────────────────────────────────────────┐
│ 港口分類組成                            │
│ ────────────────────────────────────── │
│ 第二類漁港   ▮▮▮▮▮▮▮▮▮▮  212 (77%)  │
│ 廢止漁港     ▮▮             18 ( 6%)  │
│ 渡輪/觀光    ▮▮             16 ( 6%)  │
│ 第一類漁港   ▮               9 ( 3%)  │
│ 國際商港     ▮               7 ( 3%)  │
│ 對岸港口     ▮               6 ( 2%)  │
│ 國內商港     ▮               4 ( 1%)  │
│ 客運/離島渡輪 ▮              5 ( 2%)  │
└────────────────────────────────────────┘
[切] [按縣市]
```

### Case 2 · 港口 277 處 → 空間爆炸（22 縣市）

```
[KPI: 全國 277 處港口]
   ⤴ 按縣市
┌────────────────────────────────────────┐
│ [小地圖 22 縣市 choropleth]            │
│                                        │
│ 澎湖   73 ▮▮▮▮▮▮▮▮▮▮ ⚠️ 離島小港密  │
│ 新北   38 ▮▮▮▮▮                       │
│ 高雄   27 ▮▮▮▮                        │
│ 屏東   26 ▮▮▮▮                        │
│ ...                                    │
│ 南投    0  （內陸無港，留白）          │
│ 嘉義市  0  （內陸無港，留白）          │
└────────────────────────────────────────┘
```

---

## 跨主題聯動

```yaml
crosslink:
  - with: demographics
    metric_pair: [fishing_vessels_count, aging_index]
    trigger: "abs(corr(fishing_vessels_count, aging_index)) > 0.3"
    text: "{county} 漁船 {vessels} 艘 · 高齡 {aging}% — 漁村人口老化假設"

  - with: socioeconomic
    metric_pair: [fishery_value_billion, gdp_per_capita]
    trigger: "always"
    text: "{county} 漁業產值 {value} 億 · 人均所得 {income} 萬"
```

---

## ⚠️ 縣市覆蓋警告

| 資料 | 限制 |
|---|---|
| **港口點位** | 涵蓋 16 沿海縣市；**南投 / 嘉義市內陸無港**（choropleth hide）；另含對岸福建/浙江港口 6 處不對映本國縣市 |
| **漁業權水域** | 僅 12 沿海縣市開放（19 筆 polygon） |
| **漁業生產量 / 產值** | 縣市級 `has_admin_district` 可著色，但**尚未撈**（Sprint 0）；內陸縣市僅內陸養殖 / 淡水漁業 |
| **現有漁船數** | 主計處縣市表，**no_spatial 只能 KPI + choropleth**，無逐港落點 |
| **iMarine 進出港 / 貨櫃** | 全國 / 港別**表格無座標**，只能指標卡 + 趨勢，join 港口後氣泡標註 |
| **逐港漁船數** | catalog 未見現成逐港資料，**無法落點到單一漁港**，只能縣市彙整 |
| **AIS 即時船舶** | **歸 mini-taiwan-pulse，本主題不放即時**；僅取歷史日均彙整當選用低調指標 |

UI 處理：漁業 / 港埠運量等 no_spatial 統計用「**縣市著色 + 排名 + 時序**」呈現，明確標「無逐港級資料」。

---

## 資料源完整清單

### Layer 1（Supabase）— 待 Sprint 0 ETL

| 表 | 來源 | 頻率 | 狀態 |
|---|---|---|---|
| `maritime.ports` | 漁業署漁港 + TDX 商港 合併 277 筆 | static | 🔴 缺口 1：線上 `ports` 僅 73 筆，全量同步 |
| `public.fishery_rights` | 漁業署漁業權水域（19 筆 polygon） | yearly | ✅ 已上線 |
| `public.lighthouse` | 航港局燈塔（36 座） | static | ✅ 已上線 |
| `public.port_polygons` | OSM 港區 polygon | static | 🟡 mini-pulse 靜態，待上 Supabase |
| `maritime.fishery_stats_by_county` | 漁業署 + 主計處縣市統計 | yearly | 🔴 缺口 2：新 pipeline |
| `maritime.port_traffic_yearly` | 航港局 iMarine 進出港 / 貨櫃 | yearly | 🔴 缺口 3：新 pipeline |
| `maritime.ship_routes` | TDX 定期客船航線（36 條） | monthly | 🟡 有 JSON，待上表 |

### 主要資料源 ID

| 來源 | dataset id / 端點 | 內容 |
|---|---|---|
| 農業部漁業署 | data.gov.tw 27130 等 | 漁港位置（239 漁港） |
| TDX | `/v3/Ship/Port`、`/Route` | 商港 / 客運港 73 筆、定期船班 36 條 |
| 農業部漁業署 | 「漁業生產量 / 產值─按縣市別分」 | 縣市級漁業統計（has_admin_district） |
| 主計總處 | 各縣市現有漁船數 / 養殖面積 | 縣市級指標（no_spatial） |
| 交通部航港局 | iMarine 171745 / 171741-3 / 171744 | 進出港船舶 / 貨櫃 / 承運量（全國，無座標） |
| 航港局 | data.gov.tw 26944 | 全國燈塔（36 座） |
| 漁業署 | data.gov.tw 25785 | 漁業權水域 polygon |

---

## MVP 範圍

### Sprint 0 · 前置 ETL（上線前置，不可跳）⭐ 關鍵路徑

> 兩定案落實：**缺口先補再上線**。前端 view 之前必須先把以下資料落地 Supabase。

- **ETL-A 缺口 1**：把 `ports_merged_latest.geojson` 277 筆全量同步 → `maritime.ports`（含 `port_class` / `county` / `county_id`），取代現有僅 73 筆的線上 `ports` 表
- **ETL-B 缺口 2**：撈漁業署「漁業生產量 / 產值─按縣市別分」+ 主計處各縣市現有漁船數 → `maritime.fishery_stats_by_county`（縣市維、年度）
- **ETL-C 缺口 3**：撈航港局 iMarine 進出港船舶（171745）+ 貨櫃（171741-3）→ `maritime.port_traffic_yearly`（港別 / 全國，年度；無座標，後續 join 港口）
- **ETL-D**：OSM 港區 polygon 上 `public.port_polygons`；TDX 航線 → `maritime.ship_routes`
- 縣市維 view：`v_county_port_counts`（依 port_class 分組計數）/ `v_county_fishery_stats`

### Sprint 1 · View A（現成資料先行）

- `themes/maritime.yaml`（已完成 draft）
- 套 View A：KPI 1-5（港口 / 漁港 / 商港 / 漁業權 / 燈塔，全現成）+ 港口數 choropleth
- point_profile 277 港口（按分類 / 按地理區）
- 地圖主視覺：港口點位（分類著色）+ 港區 + 漁業權 + 燈塔
- Demo 1「漁業之島：港口分類地圖」（主視覺）

### Sprint 2 · 漁業 / 運量解鎖 + View B

- KPI 6-10 解鎖（漁業生產量 / 產值 / 漁船數 + iMarine 進出港 / 貨櫃）
- View B Tab 1-3（概覽 / 港口 / 漁業）
- Demo 2「漁業縣市帳」+ Demo 3「商港吞吐」

### Sprint 3 · 整合 + polish

- View B Tab 4-5（航線 / 排名）
- View D 比較
- 跨主題 InsightCard（demographics / socioeconomic）
- 「無逐港級資料」UI 規範套到 no_spatial 指標

### 延後（之後）

- 即時 AIS 船舶（歸 mini-taiwan-pulse）
- 逐港漁船數（catalog 無現成，需另尋）
- 貨物 21 大類細分（先做總量）

---

## 預估工時

- Sprint 0 前置 ETL（港口同步 + 漁業 + iMarine 三 pipeline）：1.5 週（關鍵路徑）
- Sprint 1 View A + 港口分類 demo：1 週
- Sprint 2 漁業 / 運量 + View B：1 週
- Sprint 3 整合 + polish：1 週

**約 4.5 週**（前置 ETL 為瓶頸）。

---

## 參考檔案

- Manifest: `themes/maritime.yaml`
- 資料盤點 SSOT:
  - `taipei-gis-analytics/data/processed/transportation/ports/ports_merged_latest.geojson`（277 筆）
  - `taipei-gis-analytics/data/processed/environment/fishery_rights/fishery_rights.geojson`
  - `taipei-gis-analytics/data/processed/transportation/ship/taiwan_ship_routes.json`
  - `mini-taiwan-pulse/public/geo/port_polygons.geojson` / `lighthouse.geojson`
  - `taipei-gis-analytics/docs/systems/transport_tic.md`（航運整合視圖）
- pipeline: `pipelines/transportation/port/02_fetch_ports_merged.py`、`environment/fishery_rights/01_process_fishery_rights.py`
