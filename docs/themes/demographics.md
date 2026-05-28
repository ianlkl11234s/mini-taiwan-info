# 主題詳規 · 👥 人口（demographics）

> 縣市統計儀錶板的「**深入版人口專題**」。資料盤點已跨 repo 查證完成：總人數 / 縣市成長率 / 性別比三大核心中，**前兩者線上 Supabase 現成可上線**，第三者（標準性別金字塔）為**唯一硬缺口**，必須在前端 view 之前用 Sprint 0 前置 ETL 補齊。
>
> 本 repo（mini-taiwan-info）定位是**靜態統計資料策展**，即時/動態歸 mini-taiwan-pulse。人口本就是靜態（月報/年報），完全符合。

---

## 🚨 與 home-basics 的主題邊界（先講清楚）

本專案已有 `home-basics`（priority 1，首頁主題）。人口資料在兩個主題都出現，但分工明確、互補不重複：

| | **home-basics**（基礎統計, priority 1） | **demographics**（本主題, priority 15） |
|---|---|---|
| 定位 | 打開網站第一眼的 **vital signs 總覽** | 深入版 **人口結構分析** |
| 深度 | 一句話輪廓（總人口 / 縣市數 / 村里數 / 老化指數） | 標準性別金字塔 / 年齡結構 / 成長分解 / 城鄉與老化差距 |
| 性別金字塔 | 縣市 Tab 一個 pyramid（粗粒度，男女兩維） | **5 歲組 × 性別交叉**標準金字塔（男左女右每組）+ vs 全國雷達 |
| 成長 | 出生死亡率（‰） | 成長分解：自然增加 vs 社會增加（遷徙）+ 10 年成長率排名 |
| 城鄉 | 鄉鎮 choropleth | 村里 / 最小統計區 / H3 三級下鑽 + 日夜人流 |
| 死亡交叉 | 不強調 | **核心敘事**：出生率 vs 死亡率交叉 TrendChart |

一句話：home-basics 回答「**台灣人口長怎樣**」，demographics 回答「**為什麼會變成這樣、各縣市差在哪**」。

---

## 主題定位

「**人口金字塔下的島嶼結構**」—— 用三層敘事解剖台灣的人口危機與城鄉裂痕：

**三大敘事支柱**：
1. **結構**：標準性別金字塔（5 歲組×性別）— 看少子化把金字塔底座削尖、看戰後嬰兒潮鼓起的腰
2. **動態**：死亡交叉（出生率被死亡率超車）+ 成長分解（自然 vs 社會增加），看人口為何減、往哪流
3. **空間**：老化指數 / 密度 / 10 年成長率的縣市與村里差距，下鑽到統計區 + 日夜人流

使用者明指要的三件事 = ① 總人數+各縣市人數 ② 各縣市成長率 ③ 性別比例（金字塔）— 三者皆為本主題的 KPI 與核心圖表。

---

## View A · 全台概覽

### 全國 KPI 卡片（6 個）

```
┌─ 結構（紫卡）─────────────────────────────────────────────────┐
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│ │ 23,408,011 │ │   98.2     │ │   162.5    │                  │
│ │ 全國總人口 │ │  性別比    │ │  老化指數  │                  │
│ │ ↓ -0.3%/yr │ │ ♂/100♀     │ │ ↑ +6.1/yr  │                  │
│ └────────────┘ └────────────┘ └────────────┘                  │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│ │   42.1%    │ │    651     │ │    2.49    │                  │
│ │  扶養比    │ │ 人口密度   │ │   戶量     │                  │
│ │ ↑ +1.2/yr  │ │ 人/km²     │ │ 人/戶 ↓    │                  │
│ └────────────┘ └────────────┘ └────────────┘                  │
└────────────────────────────────────────────────────────────────┘
```

| # | 指標 | 單位 | group | 來源 | 爆炸模式 |
|---|---|---|---|---|---|
| 1 | 全國總人口 | 人 | structural | `reference.national_basics_latest` | dim(22 縣市) + time(10y/all) |
| 2 | 性別比 | ♂/100♀ | structural | `reference.national_basics_latest` | （無爆炸） |
| 3 | 老化指數 | （比值） | structural | `reference.national_basics_latest` | dim(22 縣市) + time(10y/all) |
| 4 | 扶養比 | % | structural | `reference.national_basics_latest` | （無爆炸） |
| 5 | 人口密度 | 人/km² | structural | `reference.counties` | dim(22 縣市) |
| 6 | 戶量 | 人/戶 | structural | `reference.national_basics_latest` | （無爆炸） |

> KPI 1/3/5 直接打現成線上表，**Sprint 0 完全不需等缺口補完**即可先上 4-6 個 KPI + choropleth。

### 核心圖表（View A 直接渲染，非 KPI 卡）

1. **全國性別金字塔**（pyramid，5 歲組×性別，男左女右）— ⚠️ 依賴 Sprint 0 缺口表，前端先 placeholder
2. **出生率 vs 死亡率「死亡交叉」**（TrendChart 雙線，標註交叉年）— 走 `village_population_trend` 衍生，現成
3. **縣市 10 年成長率排名**（bar，正負雙向著色）— 走 `village_population_trend`，現成

### Choropleth 預設 = 老化指數

視覺差距最大、有政策意涵（離島/東部極高 vs 都會/竹科極低）。可下拉切換為：
- 總人口（絕對量）
- 人口密度
- 10 年成長率（正成長深紫 / 負成長淺）

### 自動產出 hook

```yaml
hook_rules:
  - condition: "national_death_rate > national_birth_rate"
    text: "全國已過「死亡交叉」— 死亡率 {death_rate}‰ 超越出生率 {birth_rate}‰，自然減少 {natural_decrease} 人。"
    severity: danger
  - condition: "max_county_aging / min_county_aging > 3"
    text: "老化指數縣市差距達 {ratio} 倍 — 最老 {max_county}（{max_value}）vs 最年輕 {min_county}（{min_value}）。"
    severity: warn
  - default:
    text: "全國 {total} 人 · 性別比 {sex_ratio} · 老化指數 {aging} · 扶養比 {dependency}% · 戶量 {household_size} 人/戶。"
    severity: info
```

---

## View B · 縣市儀錶板 Tab 結構

4 個 Tab：

```
新竹市 / 👥 人口
├── [概覽]       縣市 4 KPI + 10 年人口時序（vs 全國平均疊圖）
├── [年齡結構]   縣市性別金字塔 ⭐ + 縣市三分組 vs 全國雷達圖
├── [人口動態]   出生死亡率時序 + 自然增加 vs 社會增加長條
└── [城鄉分布]   村里/統計區/H3 三級下鑽 choropleth + 日夜人流
```

### Tab 1「概覽」

```
KPI: 總人口 448,000 人 · 老化指數 78.5（全台最低之一）· 扶養比 35.2% · 10年成長 +12.4%

[時序] 近 10 年總人口（主線）+ 全國平均成長率疊圖
       新竹市逆勢成長（竹科紅利），與全國負成長對照
```

### Tab 2「年齡結構」⭐ 主視覺

```
[金字塔] 新竹市 vs 全國（半透明疊影）        ⚠️ Sprint 0 缺口表
   男 ◀────┤ 0-4   ├────▶ 女
   男 ◀───┤ 5-9    ├───▶ 女
   ...
   男 ◀┤ 100+ ├▶ 女
   觀察點：竹科縣市 30-44 歲（工作人口）異常鼓起

[雷達] 三分組（0-14 / 15-64 / 65+）縣市 vs 全國
[KPI]  中位數年齡 / 性別比 / 老化指數
```

### Tab 3「人口動態」

```
KPI: 出生率 / 死亡率 / 社會增加率

[時序] 出生率 vs 死亡率雙線（標註該縣市死亡交叉年；竹市尚未交叉是亮點）
[長條] 自然增加（出生-死亡）vs 社會增加（移入-移出）逐年堆疊
       拆解「人口成長到底靠生小孩還是靠移入」
```

### Tab 4「城鄉分布」

```
[地圖] 三級粒度切換
  ▒ 村里 polygon（7,800 村里 × 10 年，密度 choropleth）
  ▒ 最小統計區 polygon（157,933 區，最細粒度）
  ⬡ H3 hexbin（get_h3_demographics_yearly）

[KPI] 縣市人口密度 / 日夜人流比
[長條] 日間人口 vs 夜間人口（通勤吸入/吐出）  ⚠️ 大數據模擬 10% 抽樣，標註非戶籍

[爆炸] 點某村里 → 下鑽該村里 10 年人口 + 生死遷曲線
```

---

## View C · 資料集深入 — 三個 wow demo

### Demo 1 · 「死亡交叉時鐘」⭐⭐ 最強敘事

```
背景：台灣哪一年被死神超車？各縣市先後？

[時序] 全國出生率 vs 死亡率雙線（民國 104-113）
  - 交叉點打 annotation：全國約 2020（民國 109）後死亡 > 出生
  - 切換縣市：看 22 縣市各自的交叉年（離島/東部早交叉，竹市尚未）

[排名] 「距死亡交叉還有幾年 / 已交叉幾年」22 縣市

[敘事] 「人口負成長不是未來式 — 全國早在 {year} 就被死神超車，{n} 個縣市更早。」
```

### Demo 2 · 「性別金字塔變形記」（依賴 Sprint 0）

```
[金字塔] 該縣市 5 歲組 × 性別             ⚠️ Sprint 0 缺口表
  - 底座削尖 = 少子化
  - 70+ 女多於男 = 女性餘命長
  - 竹科/工業縣市 25-44 男性鼓起 = 移工/單身工作人口

[切] 切換縣市對比，或疊全國半透明

[敘事] 「{county} 的金字塔不是金字塔，是 {shape}（燈籠/倒三角/葫蘆）。」
```

### Demo 3 · 「成長分解：靠生還是靠搬」

```
[堆疊長條] 各縣市逐年：自然增加（出生-死亡）vs 社會增加（移入-移出）
  - 桃園/新竹：社會增加為主（移入紅利）
  - 多數縣市：自然減少 + 社會減少雙負

[地圖] 村里級 10 年成長率 choropleth（移入熱區 vs 流失帶）

[敘事] 「{county} 10 年增 {growth}% 中，{social_pct}% 靠移入、{natural_pct}% 靠自然 — 紅利能撐多久？」
```

---

## View D · 跨縣市比較指標

```yaml
comparable_metrics:
  - id: population
    label: 總人口
    unit: 人
    ranking_better: neutral
  - id: population_density
    label: 人口密度
    unit: 人/km²
    ranking_better: neutral
  - id: aging_index
    label: 老化指數
    unit: （比值）
    ranking_better: lower
  - id: growth_10y_pct
    label: 10 年成長率
    unit: "%"
    ranking_better: higher
  - id: dependency_ratio
    label: 扶養比
    unit: "%"
    ranking_better: lower
  - id: median_age
    label: 中位數年齡
    unit: 歲
    ranking_better: lower
  - id: sex_ratio
    label: 性別比
    unit: ♂/100♀
    ranking_better: neutral          # ⚠️ 等 Sprint 0 缺口表
```

---

## 爆炸圖實例

### Case 1 · 全國總人口 23,408,011 → 維度爆炸（22 縣市）

```
[KPI: 全國總人口 23,408,011 人 ↓ -0.3%/yr]
   ⤴ 按縣市
┌────────────────────────────────────────┐
│ [小地圖 22 縣市 choropleth]            │
│                                        │
│ 新北   4,032,000 ▮▮▮▮▮▮▮▮▮▮          │
│ 台中   2,830,000 ▮▮▮▮▮▮▮              │
│ 高雄   2,734,000 ▮▮▮▮▮▮▮              │
│ ...                                    │
│ 澎湖     107,000 ▮                     │
│ 連江      13,000 ·         ⚠️ 最少     │
└────────────────────────────────────────┘
[切] [按時間 10y] [回老化指數]
```

### Case 2 · 老化指數 162.5 → 維度爆炸（22 縣市，含縣市差距 hook）

```
[KPI: 全國老化指數 162.5 ↑ +6.1/yr]
   ⤴ 按縣市
┌────────────────────────────────────────┐
│ 嘉義縣  290 ▮▮▮▮▮▮▮▮▮▮ ⚠️ 最老        │
│ 雲林縣  255 ▮▮▮▮▮▮▮▮▮                 │
│ 台北市  205 ▮▮▮▮▮▮▮                   │
│ ...                                    │
│ 桃園市   95 ▮▮▮                        │
│ 新竹市   78 ▮▮       ⚠️ 最年輕（竹科） │
└────────────────────────────────────────┘
hook: 「老化指數縣市差距達 3.7 倍 — 嘉義縣 290 vs 新竹市 78」
```

### Case 3 · 性別金字塔 → 維度爆炸（5 歲組×性別）

```
[KPI: 全國性別比 98.2 ♂/100♀]   ⚠️ Sprint 0 缺口表
   ⤴ 展開金字塔
┌────────────────────────────────────────┐
│         男 ◀────────┼────────▶ 女       │
│  0-4    ▮▮▮▮▮▮▮▮    │   ▮▮▮▮▮▮▮▮         │
│  ...                │                   │
│ 30-34   ▮▮▮▮▮▮▮▮▮▮  │ ▮▮▮▮▮▮▮▮▮▮         │
│  ...                │                   │
│ 75-79   ▮▮▮▮        │   ▮▮▮▮▮▮▮ ← 女多   │
│ 100+    ·           │   ▮ ← 女多         │
└────────────────────────────────────────┘
[切] [按縣市] [疊全國]
```

---

## 跨主題聯動

```yaml
crosslink:
  - with: water
    metric_pair: [aging_index, lpcd]
    trigger: "abs(corr(aging_index, lpcd)) > 0.3"
    text: "{county} 高齡 {aging} vs 全國 {national_aging} · 人均用水 {lpcd}L — 老化 vs 用水"

  - with: fire
    metric_pair: [aging_index, fire_per_10k]
    trigger: "abs(corr(aging_index, fire_per_10k)) > 0.3"
    text: "老化 {aging} vs 火災 {fire}件/萬人 — 獨居長者電氣火災假設"

  - with: medical
    metric_pair: [aging_index, hospital_bed_per_capita]
    trigger: "always"
    text: "高齡 {aging} · 醫療床位 {beds}/萬人 — 老人 vs 醫療量能"
```

> crosslink 寫法對齊 home-basics.yaml（aging_index 為共用 anchor 指標）。

---

## ⚠️ 縣市覆蓋警告

| 資料 | 限制 | UI 處理 |
|---|---|---|
| **性別×5歲年齡組金字塔** | 🔴 唯一硬缺口：現有本地「5 歲組」與「性別」是**兩個獨立維度未交叉**，畫不了標準金字塔 | Sprint 0 補 `demographics.population_by_age_sex_county` 前 placeholder |
| **全國村里面圖** | 本地成品已備（7,800 村里×10 年），但線上 Supabase 目前只有雙北+新竹 | Sprint 0 全國上傳前 warning_badge |
| **最小統計區 345 欄** | 本地成品（157,933 區），尚未上 Supabase | Sprint 0 上傳前 placeholder |
| **日夜人流** | 內政部大數據「**模擬**」資料 10% 抽樣，**非真實戶籍** | UI 必標「模擬/抽樣」字樣，不可當戶籍人口呈現 |
| **全國 vital signs** | `national_basics_latest` 為 national 級彙總 | 縣市級老化/扶養/性別比走 `h3_demographics_yearly` + `village_population_trend` 補齊 22 縣市 |

---

## 資料源完整清單

### Layer 1（Supabase）— 現成可直接上線

| 表 / RPC | 來源 | 內容 | 頻率 | migration |
|---|---|---|---|---|
| `reference.counties` | 戶政司 | 22 縣市 pop_2024_wan + area_km2 + centroid | 年 | 093 ✅ |
| `reference.national_basics_latest` | 戶政司 | 總/男/女人口 + 密度 + 戶數 + 三分組(0-14/15-64/65+) + 老化指數 + 扶養比 + 出生率 + 死亡率 | 月（當靜態） | 114 ✅ |
| `spatial.village_population_trend` | segis | year×county 的 total_population / avg_median_age 趨勢 → **成長率來源** | 年 | 017 ✅ |
| `get_h3_demographics_yearly` (RPC) | segis | 民國 104-113，sex_ratio / aging_index / median_age / 三分組 | 年 | 020 ✅ |

### Layer 1（待上 Supabase）— 本地成品在 taipei-gis-analytics

| 目標表 | 本地檔 | 規模 | Sprint |
|---|---|---|---|
| `spatial.village_demographics_yearly` | `data/processed/demographics/population/yearly/village_demographics_all.parquet` | 77,821 列（7,800 村里×民國104-113，含 population/birth/death/natural/migration_in/out/social） | 0 |
| `spatial.village_comprehensive` | `village_comprehensive/village_comprehensive.geojson` | 7,973 村里 polygon，170 欄（21 個 5 歲組 + 男女總數 + 變動率） | 0 |
| `spatial.minimal_statistical_area` | `minimal_statistical_area/minimal_area_comprehensive.geojson` | 157,933 區 polygon，345 欄 | 0 |
| （併入上表） | `taiwan_daynight_population.parquet` | 157,933 統計區日夜人流（模擬 10% 抽樣） | 0 |

### 缺口 — Sprint 0 必抓

| 目標表 | 來源候選 | 粒度 |
|---|---|---|
| `demographics.population_by_age_sex_county` | 戶政司「現住人口性別、年齡、婚姻狀況(含同婚)」(national, data.gov.tw 有 DL) **或** 各縣市民政局「現住人口數按性別及年齡分」(catalog 命中臺南107-115/臺中/基隆/新竹縣/澎湖/連江) | national 級 / 鄉鎮·村里級 |

---

## MVP 範圍（Sprint 切分）

> 硬定案：**先補關鍵缺口再上線**。Sprint 0 = 前置 ETL，必須在任何前端 view 之前完成。

### Sprint 0 · 前置 ETL（缺口補齊）— 上線前置，不可跳過

- **ETL-A（核心缺口）**：抓性別×5歲年齡組交叉資料 → `demographics.population_by_age_sex_county`
  - 優先走戶政司 national 級「現住人口性別、年齡、婚姻狀況」(有 DL)
  - 縣市級補各民政局「按性別及年齡分」(catalog 已命中多縣市現成 DL)
  - 走 taipei-gis-analytics pipeline → 產 processed + manifest → gis-platform migration 建表
- **ETL-B**：村里 10 年歷年 parquet → 上 `spatial.village_demographics_yearly`（全國，解除「線上只有雙北+新竹」）
- **ETL-C**：村里綜合 170 欄 + 最小統計區 345 欄 geojson + 日夜人流 → 上 Supabase
- 縣市維 view：`v_county_growth_10y` / `v_county_natural_social_increase`（衍生自 village_demographics_yearly）

### Sprint 1 · View A 前端（先用現成表）

- `themes/demographics.yaml`（本檔）→ status draft → beta
- View A：6 KPI（總人口/性別比/老化/扶養/密度/戶量）+ 老化指數 choropleth + 切換指標
- 核心圖表 2/3（死亡交叉 TrendChart、10 年成長率排名）先上 — **不依賴缺口表**
- 核心圖表 1（全國性別金字塔）接 Sprint 0 ETL-A 成果
- ExplodedView：總人口 / 老化指數 → 維度爆炸（22 縣市）標竿

### Sprint 2 · View B 縣市儀錶板

- Tab 1/2/3（概覽 / 年齡結構 / 人口動態）
- demo 1「死亡交叉時鐘」（主視覺）
- demo 3「成長分解」（自然 vs 社會增加）

### Sprint 3 · 城鄉下鑽 + 整合 polish

- Tab 4「城鄉分布」：村里/統計區/H3 三級 choropleth + 日夜人流
- demo 2「性別金字塔變形記」（接 Sprint 0 ETL-A）
- View D 比較模式
- 跨主題 InsightCard（與 water / fire / medical）
- 「模擬/抽樣」「全國村里」覆蓋警告 UI 套到對應指標

### 延後（後續）

- 同婚/婚姻狀況維度（ETL-A 已抓回但首發不展開）
- 鄉鎮級金字塔下鑽（先做縣市級）
- 移工/外籍人口分層（戶籍 vs 常住差異）

---

## 預估工時

- Sprint 0 前置 ETL（缺口 + 村里/統計區上 Supabase）：1.5 週
- Sprint 1 View A 前端（現成表先行）：1 週
- Sprint 2 View B Tab 1-3 + 2 demo：1 週
- Sprint 3 城鄉下鑽 + View D + 跨主題 + polish：1 週

**約 4.5 週**（前置 ETL 是關鍵路徑，金字塔缺口不補則 View A 核心圖表 1 與 Tab 2 無法上）。

---

## 參考檔案

- Manifest: `themes/demographics.yaml`
- 縣市 SSOT: `data/counties.yaml`（id_moi A-Z）
- 邊界對照: `docs/themes/home-basics.md`（首頁 vital signs 主題）
- 後端現成表: gis-platform migrations 093 / 114 / 017 / 020
- 本地成品: taipei-gis-analytics `data/processed/demographics/population/`
  - `yearly/village_demographics_all.parquet` — 村里 10 年歷年
  - `village_comprehensive/village_comprehensive.geojson` — 村里 170 欄
  - `minimal_statistical_area/minimal_area_comprehensive.geojson` — 統計區 345 欄
  - `taiwan_daynight_population.parquet` — 日夜人流（模擬 10% 抽樣）
