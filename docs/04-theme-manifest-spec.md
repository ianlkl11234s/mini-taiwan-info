# 04 · Theme Manifest 規格

> 每個主題用一份 YAML 檔描述。前端讀 manifest 渲染對應的 KPI / Tab / 地圖圖層 / 爆炸圖，主題之間共用同一套元件。

## 為什麼這樣做

- **加新主題零前端改動**：寫一份 yaml + 後端 view 就上線
- **主題間結構強制統一**：避免每主題各自亂長
- **設計師看 yaml 就知道每主題有什麼**：不必開 IDE
- **CI 可驗證**：欄位 schema 套 JSON Schema 自動檢查

## 檔案位置

```
themes/
├── _template.yaml         範本（必填欄位都列出來）
├── home-basics.yaml       首頁 TGOS MOI + 戶政
├── water.yaml             水資源
├── fire.yaml              消防（之後）
├── demographics.yaml      人口（之後）
└── ...
```

## 完整 Schema

```yaml
# === 基本資訊 ===
theme:
  id: water                       # 唯一 slug，[a-z-]+
  name: 水資源                    # 中文顯示名
  name_en: Water Resources        # 英文顯示名（embed / SEO 用）
  emoji: 💧                       # 主題切換器顯示
  color_accent: "#0EA5E9"         # 該主題的 accent color (Tailwind sky-500)
  color_ramp: blues               # choropleth 用的色階（blues/reds/greens/purples/oranges）
  description: 縣市水資源狀況...   # 1 句話介紹
  tagline: "南北分裂的島嶼水帳"    # 主題 hero 副標
  priority: 1                     # 主題列排序（小的在前）
  status: production              # production / beta / draft / archived

# === View A 全國概覽 ===
overview:
  default_choropleth_metric: lpcd  # 預設地圖著色指標
  kpis:                            # 全國 KPI 卡片（建議 4-6 個）
    - id: total_reservoir_rate
      label: 全國蓄水率
      unit: "%"
      source: realtime.reservoir_status
      query: aggregate_national_reservoir  # 後端 view 名稱
      format:                              # 顯示格式
        precision: 1
        compare_to: previous_week          # 與上週比的箭頭
      explode:
        - mode: dimension
          by: reservoir                    # 拆成 40 座水庫
          default: true
        - mode: time
          windows: [30d, 1y, all]
      
    - id: lpcd
      label: 全國平均 LPCD
      unit: L
      source: datagov:8316
      query: aggregate_national_lpcd
      explode:
        - mode: dimension
          by: county                       # 拆 22 縣市
        - mode: time
          windows: [10y, all]

  ranking_metrics:                         # TOP/BOTTOM 排名可選的指標
    - lpcd
    - sewage_coverage
    - water_pollution_fines

# === View B 縣市儀錶板 ===
county_dashboard:
  tabs:
    - id: overview
      label: 概覽
      icon: globe
      layers:                              # 地圖圖層
        - river_basins
        - reservoirs_point
      kpis: [reservoir_count, wastewater_count, lpcd]
      
    - id: reservoirs
      label: 水庫
      layers: [reservoirs_point, reservoir_polygons]
      kpis: [county_reservoir_rate]
      charts:
        - id: 7d_reservoir_sparkline
          type: sparkline
          source: realtime.reservoir_status
          windows: [7d, 30d]
      explore_links:                       # 點某項進 View C
        - to: dataset/reservoir/:id
          when: click_point_on_map
          
    - id: water_quality
      label: 河川水質
      ...

    - id: ranking
      label: 排名
      type: ranking_panel                  # 特殊 Tab 類型
      metrics: [lpcd, sewage_coverage]

# === View C 資料集詳情頁 ===
datasets:
  - id: reservoir
    label: 水庫
    layer: point
    source_table: reservoirs
    detail_fields:                         # 詳情頁要顯示哪些欄位
      - { key: name, label: 水庫名稱 }
      - { key: built_year, label: 啟用年 }
      - { key: full_water_level, label: 滿水位, unit: m }
      - { key: total_capacity_million_m3, label: 總容量, unit: 萬 m³ }
    timeseries:                            # 時序圖配置
      - source: realtime.reservoir_status
        x: observed_at
        y: storage_rate_pct
        label: 蓄水率
      - source: realtime.reservoir_status
        x: observed_at
        y: water_level_m
        label: 水位
    download:
      csv: /api/dataset/reservoir/:id/csv
      api: /api/dataset/reservoir/:id

# === View D 比較模式 ===
compare:
  comparable_metrics:
    - id: lpcd
      label: 人均日用水量 LPCD
      unit: L
      source: datagov:8316
      ranking_better: lower                # 越低越好（用色階方向）
    - id: sewage_coverage
      label: 污水接管率
      unit: "%"
      ranking_better: higher

# === 跨主題聯動 ===
crosslink:                                 # 與其他主題的故事性聯動
  - with: demographics
    metric_pair: [lpcd, aging_index]
    hypothesis: "高齡縣市 LPCD 較低？"
  - with: economy
    metric_pair: [water_pollution_fines, manufacturing_employment]
    hypothesis: "污染外溢假設"

# === 資料來源 ===
data_sources:
  - id: wra_reservoir
    title: 水利署即時水庫蓄水
    license: OGDL-Taiwan-1.0
    url: https://fhy.wra.gov.tw/...
    updated_field: observed_at
  - id: datagov_8316
    title: 自來水生活用水量統計
    license: OGDL-Taiwan-1.0
    url: https://data.gov.tw/dataset/8316

# === 元資料 ===
meta:
  version: "1.0.0"
  last_reviewed: "2026-05-13"
  reviewer: migu
  coverage_notes:                          # 縣市覆蓋特殊狀況
    - dataset: storm_drainage
      counties: [taipei, taoyuan, chiayi]
      reason: 「雨水下水道僅 3 縣市開放」
```

## 必填欄位（最小可運作版本）

不是每個主題都要把上面全部填滿。最小可運作：

```yaml
theme:
  id: ...
  name: ...
  emoji: ...
  color_accent: ...
  status: draft

overview:
  default_choropleth_metric: ...
  kpis:
    - { id, label, unit, source, query }

county_dashboard:
  tabs:
    - { id, label }   # 至少一個 Tab
```

其他都選填，沒填的前端走 fallback（例如沒 ranking_metrics 就不顯示 ranking panel）。

## 欄位字典

| 欄位 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `theme.color_ramp` | enum | blues | choropleth 色階 (blues/reds/greens/purples/oranges/grays) |
| `theme.status` | enum | draft | production / beta / draft / archived |
| `kpis[].format.precision` | int | 0 | 小數位 |
| `kpis[].format.compare_to` | enum | none | previous_day / previous_week / previous_year |
| `kpis[].explode[].mode` | enum | — | dimension / time / geo |
| `kpis[].explode[].default` | bool | false | 預設展開哪個模式 |
| `tabs[].type` | enum | charts | charts / ranking_panel / map_only / custom |
| `compare.comparable_metrics[].ranking_better` | enum | higher | higher / lower（決定色階方向） |

## 驗證規則（CI / hooks）

- `theme.id` 必須唯一
- `kpis[].source` 必須對應 data_sources 內某 id（不是 ad-hoc 字串）
- `tabs[].layers[]` 引用的 layer 必須在 GIS 後端註冊
- `crosslink[].with` 必須是已存在的另一 theme.id

## 不放進 manifest 的東西

- 顏色細節（Tailwind class 名 / hex 對映）→ 放 design tokens
- 文案中的長描述 → 放 i18n 字典
- 圖表詳細樣式（X 軸格式、tooltip 內容）→ 元件內部處理
- 後端 SQL → 後端 view 內部

Manifest 是「**主題長怎樣**」的宣告式描述，不是程式碼。
