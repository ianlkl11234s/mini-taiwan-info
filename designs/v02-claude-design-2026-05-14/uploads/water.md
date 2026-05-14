# 主題詳規 · 💧 水資源（water）

> Mini Taiwan Info 的 **MVP 主題**。資料最完整、Layer 1/2/3 齊備、有最強敘事（南北分裂的島嶼水帳）。
> 本檔是水資源主題的完整實作藍圖，包含全部 view 規劃 + 爆炸圖實例 + 跨主題聯動。

---

## 主題定位

「**南北分裂的島嶼水帳**」—— 透過縣市儀錶板，把分散在水利署 / 環境部 / 農業部 / 國土署 / 各縣市環保局的水資源資料整合成「縣市 × 用水週期 × 治理績效」的可探索視覺。

**敘事三大支柱**：
1. **時序變化**：即時水庫蓄水率、近 30 天雨量 → 看「南部水又緊了」的瞬時故事
2. **跨縣市落差**：LPCD 從苗栗 312L 到嘉義市 186L（1.7 倍差） → 看結構性差異
3. **治理績效**：水污染裁罰 / 接管率 / 灌溉用水 → 看政府做了什麼

---

## View A · 全台概覽

### 全國 KPI 卡片（6 個，分兩排）

```
┌─ 即時排（藍卡）────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 72.3%    │ │ 12.4 mm  │ │ 4 座     │ │ 18.3%    │ │
│ │ 蓄水率   │ │ 24hr 均雨│ │ 高警戒   │ │ 高潛勢面積│ │
│ │ ↑ +5.2%  │ │ ↑ vs 昨日│ │ —        │ │ 350mm/24h│ │
│ │ ⤴ explode│ │ ⤴ explode│ │ ⤴ explode│ │ ⤴ explode│ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────────────────────────────────┘

┌─ 治理排（綠卡）──────────────────────────┐
│ ┌──────────┐ ┌──────────┐               │
│ │ 284 L    │ │ 87.0%    │               │
│ │ LPCD     │ │ 接管率   │               │
│ │ ↓ -3L    │ │ ↑ +1%    │               │
│ │ ⤴ explode│ │ ⤴ explode│               │
│ └──────────┘ └──────────┘               │
└──────────────────────────────────────────┘
```

| # | 指標 | 單位 | 來源 | 爆炸模式 |
|---|---|---|---|---|
| 1 | 全國蓄水率 | % | `realtime.reservoir_status` | dim(40 座水庫) + time(30d) |
| 2 | 24hr 全國均雨量 | mm | `realtime.rain_gauge_readings` | dim(22 縣市) + time(7d) |
| 3 | 高警戒水庫數 | 座 | `reservoir_situation_v` | dim(列出哪 4 座) |
| 4 | 淹水高潛勢面積佔比 | % | `flood_hazard_zones` | dim(縣市 + 情境切換) |
| 5 | 全國平均 LPCD | L | `socioeconomic.lpcd_by_county` (8316) | dim(22 縣市) + time(歷年) |
| 6 | 全國接管率 | % | `infra.sewage_coverage_by_county` (26815) | dim(22 縣市) + time(歷年) |

### Choropleth 預設 = LPCD（人均日用水量）

差距明顯、color ramp blues 適配、歷年資料齊。可下拉切換為：
- 即時蓄水率（限有水庫的縣市）
- 接管率
- 水污染裁罰實收金額
- 淹水高潛勢面積佔比

### 自動產出 hook

```yaml
hook_rules:
  - condition: "max_county_lpcd / min_county_lpcd > 1.5"
    text: "用水量縣市差異 {ratio} 倍 · 最高 {max_county} {max_value}L · 最低 {min_county} {min_value}L"
  - condition: "reservoir_count_below_30pct > 3"
    text: "全國 {n} 座水庫跌破 30% 紅線（南部 {south_n} 座）"
  - default:
    text: "全國蓄水率 {total} % · 平均日用水 {lpcd}L · 接管率 {coverage}%"
```

---

## View B · 縣市儀錶板 Tab 結構

7 個 Tab（從原 6 個 + 新增「用水 & 衛生」）：

```
高雄市 / 💧 水資源
├── [概覽]         流域 + 水庫點 + 該縣市 KPI
├── [水庫]         水庫蓄水率 + 點位 + 即時資料
├── [河川水質]     水質測站 BOD/DO + 列管事業點
├── [防洪]         淹水潛勢 + 滯洪池 + 即時雨量
├── [基礎設施]     汙水廠 + 給水設施（部分縣市無資料）
├── [用水 & 衛生]  ⭐ NEW — LPCD + 接管率 + 灌溉
└── [排名]         該縣市在 22 縣市的位次
```

### Tab 1「概覽」

#### 該縣市 KPI 卡片

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 3 座 │ │ 12 座│ │ 285L │ │ 84%  │
│ 水庫 │ │汙水廠│ │ LPCD │ │ 接管 │
└──────┘ └──────┘ └──────┘ └──────┘
```

#### 主圖 = 該縣市流域 + 河川 + 水庫疊圖

```
[小地圖：高雄市]
  ⊙ 阿公店水庫
  ⊙ 澄清湖
  ⊙ 鳳山水庫
  ──── 高屏溪
  ──── 愛河
  ──── 後勁溪
  ▒▒▒ 高屏溪流域邊界
```

底部：「📈 近 30 天總蓄水率折線」

### Tab 2「水庫」

```
[KPI: 該縣市 3 座水庫總蓄水率] · [⤴ 展開: 看 3 座個別]

[地圖] 水庫點 + 集水區 polygon

[時序] 過去 30 天各水庫蓄水率折線（3 條疊）

[點水庫 → View C 進詳情]
```

### Tab 3「河川水質」

```
[KPI: 該縣市 RPI 嚴重污染河段比例]
[KPI: 該縣市去年水污染裁罰實收金額]  ← 新增

[地圖] 水質測站點（按 BOD/DO 著色） + 列管事業點 (45174)

[時序] 主要河川 RPI 年度變化（高屏溪 / 愛河 / ...）

[長條] 該縣市 vs 全國 水污染裁罰排名
```

### Tab 4「防洪」

```
[KPI: 該縣市淹水高潛勢面積] · 情境切換 [200/350/500mm/24hr]

[地圖] 淹水潛勢 polygon（半透明紅）+ 滯洪池點 + 即時雨量站熱點

[時序] 該縣市過去 24hr 雨量站時序疊圖

[事件] 該縣市過去水利災情點 (86030)
```

### Tab 5「基礎設施」

```
[KPI: 給水普及率]
[KPI: 漏水率 — ⚠️ 全國資料 / 北水單市，無 22 縣市]

[地圖] 汙水廠點 (待 geocode) + 給水設施

⚠️ 雨水下水道 / 滯洪池僅部分縣市開放 — 該縣市無資料時顯示「資料未開放」
```

### Tab 6「用水 & 衛生」⭐ NEW

```
[KPI: 該縣市 LPCD] · [⤴ 維度: 生活/工業/農業] · [⤴ 時間: 16 年] 
[KPI: 該縣市接管率] · [⤴ 時間: 歷年]
[KPI: 灌溉用水量] · proxy from 18 水利會處別 (35644)

[排名] 該縣市 LPCD 全台排名 + 接管率全台排名
```

### Tab 7「排名」

該縣市在以下指標的全台位次（22 縣市，highlight 該縣市）：

- LPCD（人均用水）
- 接管率
- 水污染稽查次數 per 萬人
- 水污染罰鍰實收
- 淹水高潛勢面積佔比
- 即時蓄水率（限有水庫的縣市）

---

## View C · 資料集深入 — 三個 wow demo

### Demo 1 · 「翡翠 vs 曾文：南北分裂的 30 天蓄水率對照」

```
背景：翡翠水庫（新北）vs 曾文水庫（嘉南）的對比敘事。
即使受同場鋒面，命運天差地別。

[地圖] 北部翡翠流域 + 南部曾文流域 mini map（並排）

[時序] 雙軸：
  - 翡翠蓄水率（藍）
  - 曾文蓄水率（橙）
  - 該流域內雨量（淺灰條柱）

[標註] 鋒面通過時間（4/15 紅線）

[敘事] 「同一場鋒面、翡翠補水 12%、曾文僅 3%」
```

### Demo 2 · 「淡水河流域 + 沿岸 8 個監測站即時水位」

```
[地圖] 淡水河流域 polygon + 8 個 river_water_level 站點
       站點 hover 顯示即時水位 24hr sparkline

[互動] 點站名 → 跳出該站 24hr 折線圖

[敘事] 「從烏來到淡水入海口，水位如何沿河遞減」
```

### Demo 3 · 「彰雲地層下陷 30 年推進」

```
[地圖] land_subsidence_contours（等值線）
       時間軸 slider：1991 → 2024

[拖動 slider] 看下陷區域擴張動畫

[時序] 主要觀測樁 30 年累積下陷量

[敘事] 「30 年沉降 X 公分，等於 4 層樓地板沉下去」
```

---

## View D · 跨縣市比較指標

```yaml
comparable_metrics:
  - id: lpcd
    label: 人均日用水量
    unit: L
    ranking_better: lower
  - id: sewage_coverage
    label: 污水接管率
    unit: "%"
    ranking_better: higher
  - id: water_pollution_fines_per_capita
    label: 水污染罰鍰實收 / 萬人
    unit: 元
    ranking_better: higher  # 表示治理積極
  - id: flood_high_risk_area_pct
    label: 淹水高潛勢面積佔比
    unit: "%"
    ranking_better: lower
  - id: realtime_reservoir_rate
    label: 即時蓄水率
    unit: "%"
    ranking_better: higher
    coverage_note: 限有水庫的縣市
```

---

## 爆炸圖實例

### Case 1 · 蓄水率 72.3% → 維度爆炸（40 座水庫）

```
[KPI 卡片: 全國蓄水率 72.3%]
   ⤴
┌────────────────────────────────────────┐
│ 全國 40 座主要水庫 · 即時蓄水率        │
│ ────────────────────────────────────── │
│ 翡翠   95.2% ▮▮▮▮▮▮▮▮▮▮▮             │
│ 石門   88.1% ▮▮▮▮▮▮▮▮▮▮              │
│ 寶山二 72.5% ▮▮▮▮▮▮▮▮                │
│ ...                                    │
│ 阿公店 28.3% ▮▮ 🔴                    │
│ 烏山頭 25.9% ▮▮ 🔴                    │
│                                        │
│ 🔴 4 座跌破 30% 紅線（南部 3 座）      │
└────────────────────────────────────────┘
```

### Case 2 · LPCD 284L → 時間爆炸 + 維度爆炸（toggle）

```
[KPI 卡片: 全國平均 LPCD 284 L]
   ⤴
┌────────────────────────────────────────┐
│ [按時間] [按縣市]                       │
│ ────────────────────────────────────── │
│ 按時間視圖（近 16 年）                  │
│ 320 ┐                                  │
│ 300 │ ⋱⋱⋱⋱___                        │
│ 280 │       ⋱⋱⋱___ (現在 284)        │
│ 260 │                                  │
│     2008                  2024         │
│ 趨勢：節水教育生效，10 年降 36L         │
└────────────────────────────────────────┘
```

### Case 3 · 24hr 均雨量 12.4mm → 空間爆炸（22 縣市熱圖）

```
[KPI 卡片: 24hr 全國均雨 12.4mm]
   ⤴
┌────────────────────────────────────────┐
│ 22 縣市 · 過去 24hr 平均雨量            │
│ ────────────────────────────────────── │
│ [小地圖 22 縣市著色]                    │
│                                        │
│ 宜蘭   45.2 mm 🔵🔵🔵🔵🔵              │
│ 花蓮   28.1 mm 🔵🔵🔵                  │
│ 台北   12.4 mm 🔵                       │
│ ...                                    │
│ 嘉義   0.0 mm — 連續 7 日無雨 ⚠️      │
└────────────────────────────────────────┘
```

---

## 跨主題聯動

### Insight Cards（自動觸發）

```yaml
crosslink:
  - with: demographics
    metric_pair: [lpcd, aging_index]
    trigger: "abs(corr(lpcd, aging_index)) > 0.3"
    text: "高齡縣市 LPCD 相關性 {corr}（{interpretation}）"
    
  - with: demographics
    metric_pair: [lpcd, household_size]
    text: "戶量小的縣市單人戶占比高，LPCD 反而上升"
    
  - with: economy  # 待建主題
    metric_pair: [water_pollution_fines, manufacturing_employment]
    trigger: "always"
    text: "{county} 製造業就業 {emp}%、水污染裁罰 {fines} 元，與全國均值對比 {compare}"
    
  - with: real_estate
    metric_pair: [sewage_coverage, housing_price_median]
    text: "接管率 vs 房價 — 都會化滯後假設"
```

---

## ⚠️ 縣市覆蓋警告（UI 必須優雅揭露）

| 表 / 指標 | 限制 |
|---|---|
| `storm_drainage_*` | 只北/桃/嘉 3 縣市 |
| `detention_basins` | 132 筆 5 縣市+3 科學園區 |
| `groundwater_zones` | 西部 9 區，東部/離島無 |
| `seawall_zones` | 沿海縣市，內陸 0 |
| `debris_flow_*` | 山區縣市 |
| `sewage_treatment_plants` | 82 筆 lng/lat 全 NULL，待 TGOS geocode |
| **漏水率** | 全國 + 北水單市，**無 22 縣市** |
| **工業用水量** | 只 4 區（北/中/南/東），**無縣市** |
| **灌溉用水量** | 18 水利會處別 → 縣市映射 proxy |
| **縣市 GDP / CPI** | 不存在於水資源主題的範疇外，但聯動會碰到 |

UI 處理：
- 該縣市無資料 → Tab 內顯示 `DataMissingState` 元件：「資料未開放 — 建議向 {主管機關} 反映」
- 「需 proxy」的指標旁加 ⚠️ icon，hover 顯示資料說明
- 全國級指標但被點縣市 → 顯示「此指標僅全國級，請看排名 Tab」

---

## 資料源完整清單

### Layer 1 (Supabase) — 已上線

| 表 | 用途 |
|---|---|
| `realtime.reservoir_status` | 即時水庫 |
| `realtime.rain_gauge_readings` | 即時雨量 |
| `realtime.river_water_level` | 即時水位 |
| `public.reservoirs` / `reservoir_storage` | 水庫靜態 |
| `public.river_basins` | 流域 polygon |
| `public.river_lines` / `river_levees` | 河川 |
| `public.flood_hazard_zones` | 淹水潛勢（10 情境） |
| `public.water_quality_stations` / `readings` | 水質測站 |
| `public.land_subsidence_*` | 地層下陷 |
| `realtime.intake_diversion_daily` | 川流量（限 2 堰）|

### Layer 1 (Supabase) — 待 Phase 1 W3 建表

| 表 | 來源 | 對應 KPI |
|---|---|---|
| `socioeconomic.lpcd_by_county` | datagov:8316 | LPCD |
| `infra.sewage_coverage_by_county` | datagov:26815 | 接管率 |
| `environment.water_pollution_inspection` | datagov:45134 | 稽查次數 |
| `environment.water_pollution_fines` | datagov:45135 | 罰鍰次數 |
| `environment.water_pollution_fines_collected` | datagov:45136 | 實收金額 |
| `agriculture.irrigation_water_by_office` | datagov:35644 | 灌溉用水（18 處）|
| `infra.water_pollution_regulated_entities` | datagov:45174 | 列管事業點位 |

### Layer 3 (TGOS MOI) — Phase 2+ 加碼

- 點地圖反查 → drill 鄉鎮 / 村里水資源細部

---

## MVP 範圍（Phase 1 · W3-5）

### 必做（W3-5）

✅ View A：6 個 KPI + LPCD choropleth + ranking  
✅ View B：7 個 Tab（部分用 stub，視資料完整度）  
✅ View C：3 個 demo（翡翠 vs 曾文、淡水河、彰雲）  
✅ View D：5 個指標可比  
✅ 維度爆炸（40 水庫、22 縣市）  
✅ 時間爆炸（30 天、歷年）  
✅ 縣市覆蓋警告 UI（DataMissingState）

### 延後（Phase 2+）

⏳ 空間爆炸（縣市 → 鄉鎮 → 村里）  
⏳ 跨主題 InsightCard 自動觸發  
⏳ 列管事業點位疊圖  
⏳ 即時水位站動畫（demo 2 的 hover sparkline）

---

## 預估工時

| W3 | 後端 ETL + 縣市維 view |
|---|---|
| W4 | 前端套 view + manifest |
| W5 | 整合 + polish + 文案 |

**3 週 MVP** + 中後段 polish 持續到上線。

---

## 參考檔案

- Manifest: `themes/water.yaml`
- 範例資料: `samples/water/`
  - `lpcd-22county-sample.json` — datagov:8316 樣本
  - `sewage-coverage-sample.json` — datagov:26815 樣本
  - `reservoir-realtime-sample.json` — 即時水庫快照
- 對應 TIC SSOT: `taipei-gis-analytics/docs/systems/water_tic.md`（資料端真相）
