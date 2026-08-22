# 資料形狀 × 視覺化 pattern 對照表

> `/theme-bootstrap` Stage 3 視覺化選型用。**只列專案已存在的 pattern**（盤點日 2026-07-07）。
> 表外的選型 = 新元件成本，必須在 Stage 4 明標給 user 拍板。
> 路徑一律相對 `frontend/src/components/`。

## 使用方式

每個 KPI：判資料形狀 → 查對應段落 → 選 pattern → 在選型表記下實作參照。同形狀多個 pattern 時，先看「適用 / 不適用」欄，再看該 pattern 已服役的主題數（越多 = 越通用越穩）。

---

## 1. 全國 / 縣市單值 + delta（KPI 數字）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| KPI stat 卡（含 explode 就地展開 + DeltaBadge） | `kpi/KPICard.tsx` | water / fire / demographics / rail / maritime / medical(B) | 單值 + 比較基期 delta（response_shape: value + delta + spark?） | 無比較基期 → `compare_to: none`，不硬湊 delta |

## 2. 縣市單值 × 22（分布 / 排名）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| **Choropleth 縣市著色 + metric 切換** | `map/MapView.tsx`（`counties-fill`）+ `map/TwoSectionLayers.tsx`（radio）+ `map/MapLegend.tsx` | 全部（manifest 驅動） | 每主題必備；manifest `overview.color_metrics[]` 定 domain / ramp_direction | 覆蓋不全（<22 縣市）的指標 → 加 `coverage_note`，或不進 color_metrics |
| 無染色灰底（neutral） | `map/TwoSectionLayers.tsx`（`METRIC_NONE`）+ MapView `neutralChoropleth` | 全部 | 想專心看點位 / 熱力圖時 | — |
| 縣市 highlight 模式 | `map/MapView.tsx`（`highlightCounties` / `highlightColors`） | 通用 | 特殊敘事著色（指定縣市上色） | 連續值分布（用 choropleth） |
| Ranking bar 橫式（可點進 ViewB） | `common/HRankBar.tsx` | demographics / medical / rail / maritime | Top/Bottom 排名 + 鑽取；**新主題首選** | — |
| Ranking bar 雙欄直式（Top/Bottom） | `views/ViewA.tsx` 內 `RankBars` | water | water 版位既有樣式 | 新主題（用 HRankBar 較通用） |
| 22 柱縣市排序 bar | `fire/FireTables.tsx`（`FireCountyBars`） | fire | 一次看全 22 縣市高低 | 窄 pane 22 柱會擠（<900px 慎用） |
| KPI 爆炸圖（卡內展開 22 縣市 bar） | `views/ViewA.tsx` 內 `SimpleExplode` | water | KPI 卡 `explode: mode: dimension, by: county` | — |
| Donut 排名圓環（n/total + tier） | `charts/Donut.tsx` | water(B) / fire(B) | ViewB「該縣市在 22 縣市位次」 | 全國視角（它是單縣市視角） |

## 3. 縣市 × 2 值（關聯）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| 散布圖（size=人口、color=區域、警示象限） | `fire/FireScatter.tsx` | fire（S3 量能落差） | 兩指標關聯敘事（如「密度低 × 事件多」象限） | 單指標排名（用 ranking bar） |

## 4. 縣市 × 時間（時序）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| 時間趨勢線（多 series + area + 警戒線 + annotation） | `charts/TrendChart.tsx` | water / demographics / maritime / rail / home | 月度 / 年度時序、多縣市或多實體疊線 | 高頻即時（分鐘級）另議 |
| 時間長條（自動切 365 點折線） | `fire/FireBarRow.tsx` | fire | 日 / 月 bucket 計數 | — |
| 堆疊長條（time bucket × segment） | `fire/FireStackedBar.tsx` | fire（爆炸視圖） | 縣市 × 類別 × 時間三維 | 二維資料（用 TrendChart / FireBarRow 較單純） |

## 5. 單實體 × 時間（迷你趨勢）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| Sparkline 迷你趨勢線 | `charts/Sparkline.tsx` | water（水庫卡） | KPI 卡 / 列表內 30 點內小趨勢 | 需要軸標 / tooltip 的正式圖（用 TrendChart） |
| HistorySparkline / DualHistorySparkline（含死亡交叉標記） | `common/HistorySparkline.tsx` | home-basics | 歷年單線 / 雙線交叉敘事（出生 vs 死亡） | — |

## 6. 類別 × 值（組成 / 佔比）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| 佔比圓餅 donut | `fire/FireDonut.tsx`（+ `FireDonutLegend`） | fire(S1) | 5-7 類組成佔比（22 類先縮 5 大類） | 類別 > 8（改表格 / 橫條） |
| 類別橫條（分組，非堆疊） | `views/ViewBMaritime.tsx` inline `.mar-class-bars` | maritime（港口 5 大類） | 少量類別計數對比 | 注意：inline 實作，複用要抽 |
| 階層表格（可排序 / 5→22 展開 / 佔比 bar） | `fire/FireTables.tsx`（`FireCountyTable` / `FireCauseTable` / `FireLocationTable`） | fire | 類別多、要精確數字、要 drill | 一眼看趨勢的場景（用圖） |
| KPI 爆炸視圖（scale × dim 矩陣切換） | `fire/FireKpiExplode.tsx` | fire | 縣市 × 類別 × 時間可切換探索 | 簡單單維（用 SimpleExplode） |

## 7. 年齡 × 性別

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| 人口金字塔 | `views/ViewADemographics.tsx` 內 `S2Pyramid`（inline CSS `.pop-pyramid`） | demographics | age band × 男/女 | **非共用元件** — 他主題要用需先抽出，算輕量新元件成本 |

## 8. 點位（經緯度）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| Circle layer（縮放插值半徑 + 條件著色）+ symbol label 層 | `map/MapView.tsx`（`*-pt` + `*-label`，label 用 minzoom 控） | water（水庫 / 河川站）/ fire（分隊）/ maritime（港口）/ rail（車站）/ medical | 點位名錄 + 狀態著色（蓄水率紅橘綠、警戒級） | 數萬點密度型（用 heatmap） |
| **多種點位同 source filter 切分** | `map/MapView.tsx` medical 3 層（`filter: ["==",["get","layer"],...]`：急救醫院 / AED / 長照） | medical | 一主題多種點位（新主題首選做法，一個 source 多 layer） | — |
| Heatmap 熱力圖 | `map/MapView.tsx`（`fire-hotspots-heat`，7 段 color stop） | fire only | 事件 / 個案密度（點太多不宜逐點畫） | 點位少（<數百，circle 即可）；需要點擊單點鑽取 |
| 點位概況面板（bucket 分布 / 地理區聚合 / 散布 3 模式） | `point-profile/PointProfile.tsx` | water（40 水庫） | manifest `point_profile`（thresholds bucket + region + scatter），點集合每點有分類值 | 點位無「狀態值」可分桶時只剩名錄價值 |
| 點位 × 2 值散布（log 軸 + 三色帶） | `point-profile/PointProfile.tsx`（`ScatterMode`） | water | 容量 × 蓄水率這類雙屬性 | — |

## 9. 線幾何 / 面幾何（底圖層）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| 線 + 面底圖層（河網 / 流域） | `map/MapView.tsx`（`river-lines-line` / `river-basins-line`，`showWaterBaseLayers` prop 控） | water | 主題專屬地理脈絡層 | ⚠️ **必加 `showXxxBaseLayers` prop** — 新主題加層前先 grep MapView.tsx 找寫死層，避免污染他主題（新主題加層前必檢，事故見 `.claude/memory/INCIDENTS.md` 2026-05-15） |

## 10. 無資料 / 佔位（鐵則 1 必用）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| PendingDataCard 待補卡（虛線 clock） | `common/PendingDataCard.tsx` | home-basics / demographics(B) / maritime(B) / rail | 等 ETL / 待搜集，版位保留 | 永久缺口（用 MissingDataCard） |
| MissingDataCard 缺口卡 | `common/MissingDataCard.tsx` | maritime | 上游根本不開放、永久缺 | 只是還沒接（用 PendingDataCard） |

## 11. 期別 / 時效標註（鐵則 1a / 3 必用）

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| DataAgeBadge（分級 live / 年度 / 停採） | `DataAgeBadge.tsx` | water | 每個對外數字標「哪年 / 哪月」；**只有 collector cron 持續抓的才標綠 LIVE** | — |
| 資料來源卡 | `common/DataSourceBadge.tsx` | 多數主題 | 區塊尾列 data_sources | — |

## 12. 敘事 / 章節

| Pattern | 實作 | 已用主題 | 適用 | 不適用 |
|---|---|---|---|---|
| hook_rules 自動敘事（hero 副標，條件模板） | manifest `overview.hook_rules` + 前端 hook engine | water / fire（manifest 驅動） | 「差 N 倍」「跌破紅線」這類自動 insight | — |
| Insight callout 警示敘事框 | `views/ViewB.tsx` / `ViewC.tsx` inline `.insight` | water | 段落級敘事重點 | — |
| 章節標題 | `common/CatHeader.tsx`（通用）/ `fire/FireCatHeader.tsx` / `water/WaterCatHeader.tsx` | 依主題 | 新主題用通用 `CatHeader` | — |

---

## 專案「不存在」的 pattern（選了就是新元件成本，Stage 4 必須明標）

- hexbin 聚合
- flow map / OD 線
- sankey
- treemap
- calendar heatmap
- 等時圈（isochrone）計算與渲染（medical 醫療沙漠標「估算值 · 等時圈計算待跑」即此缺口）

## MapView 著色機制備忘（manifest 驅動要點）

- **著色指標**：`manifest.overview.color_metrics[]`（id / label / unit / domain:[min,max] / ramp_direction / coverage_note?），預設取 `default_choropleth_metric`
- **色帶**：ramp 名取 `theme.color_ramp`（blues / reds / greens / purples / oranges / grays / teal → `lib/mapbox.ts` `COLOR_RAMPS`）；`ramp_direction` 才是 per-metric。**新主題別留 blues，整片會變水藍**（memory 指路牌）
- **切換 UI**：`TwoSectionLayers.tsx` 由 `metricOptions` 渲染 radio + `METRIC_NONE` 灰底
- **鑽取**：`counties-fill` click → `onCountyClick` → ViewB（drillCounty flyTo zoom 9），全主題標配
- **v1.0 manifest 缺 color_metrics** → `lib/themes.ts` 補 fallback（新 manifest 一律直接寫 v1.1 欄位）
