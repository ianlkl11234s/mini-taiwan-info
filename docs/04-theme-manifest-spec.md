# 04 · Theme Manifest 規格 v2

> 每個主題用一份 YAML 檔描述。前端讀 manifest 渲染對應的 KPI / Tab / 地圖圖層 / 爆炸圖 / 點位概況，主題之間共用同一套元件。
>
> **v2 變更（2026-05-14）**：加 `response_shape` API 契約、`point_profile` 規格、`hook_rules` 模板引擎規範化、`coverage_notes` 可消費 schema、`tabs[].layers` driven。動機見 audit-2（`_STATUS.md` 內 Decision Log）。

## 為什麼這樣做

- **加新主題零前端改動**：寫一份 yaml + 後端 view 就上線
- **主題間結構強制統一**：避免每主題各自亂長
- **設計師看 yaml 就知道每主題有什麼**：不必開 IDE
- **CI 可驗證**：欄位 schema 套 JSON Schema 自動檢查

## 檔案位置

```
themes/
├── _template.yaml         範本（必填欄位都列出來）
├── _schema.json           JSON Schema validator（CI 用）
├── home-basics.yaml       首頁 TGOS MOI + 戶政
├── water.yaml             水資源
├── fire.yaml              消防（之後）
└── ...
data/
└── counties.yaml          縣市 SSOT（id_moi/code3/slug，所有主題共用）
```

## 完整 Schema

```yaml
# === 基本資訊 ===
theme:
  id: water                       # 唯一 slug，[a-z][a-z0-9-]+
  name: 水資源                    # 中文顯示名
  name_en: Water Resources        # 英文顯示名（embed / SEO 用）
  emoji: 💧                       # 主題切換器顯示
  icon: drop                      # lucide-react icon 名（chrome.jsx ThemeSwitcher 用）
  color_accent: "#0EA5E9"         # 該主題的 accent color (Tailwind sky-500)
  color_ramp: blues               # choropleth 色階（見「欄位字典」）
  description: 縣市水資源狀況...   # 1 句話介紹
  tagline: "南北分裂的島嶼水帳"    # 主題 hero 副標
  priority: 10                    # 主題列排序（小的在前）
  status: production              # production / beta / draft / archived

# === View A 全國概覽 ===
overview:
  default_choropleth_metric: lpcd  # 預設地圖著色指標（須對應某 kpi.id 或 color_metric.id）
  color_metrics:                   # 「著色指標」選單（TwoSectionLayers radio）
    - id: lpcd
      label: 人均日用水量
      unit: L
      ramp_direction: reverse      # reverse=值越小越好（色越淺=越優）；default=值越大越好
      domain: [180, 340]           # choropleth 色階 min/max
    - id: reservoir_rate
      label: 蓄水率
      unit: "%"
      ramp_direction: default
      domain: [25, 100]

  kpis:                            # 全國 KPI 卡片（4-6 個）
    - id: total_reservoir_rate
      label: 全國蓄水率
      unit: "%"
      group: realtime              # realtime / governance / safety / structural（決定卡片視覺分組）
      source: wra_reservoir_realtime    # 須對應 data_sources[].id
      query: aggregate_national_reservoir   # 後端 view / RPC 名
      format:
        precision: 1
        compare_to: previous_day   # previous_day / previous_week / previous_year / none
        sentiment_when_up: positive # positive / negative / neutral（「上升」是好還是壞）
      response_shape:              # ⭐ v2 新增：強制契約
        value: number
        delta: number              # 與 compare_to 比的差值
        spark: number[30]?         # 可選，30 點 sparkline
      explode:
        - mode: dimension
          by: reservoir            # dimension / county / reservoir / station / vendor 等
          default: true
          response_shape:
            items: [{ id: string, name: string, value: number, county_id?: string }]
        - mode: time
          windows: [30d, 1y, all]
          response_shape:
            series: [{ x: timestamp, y: number }]
            annotations?: [{ at_index: int, label: string, severity: "info"|"warn"|"danger" }]

    - id: lpcd
      label: 全國平均 LPCD
      unit: L
      group: governance
      source: datagov_8316
      query: aggregate_national_lpcd
      format:
        precision: 0
        compare_to: previous_year
        sentiment_when_up: negative   # LPCD 上升是壞事
      response_shape:
        value: number
        delta: number
        spark: number[12]?

  point_profile:                   # ⭐ v2 新增：點位概況面板規格（View A）
    enabled: true
    title: 全國 40 座主要水庫
    source: water_reservoirs_with_status   # 對應 query
    response_shape:
      items: [{ id, name, value: number, county_id, region: string, capacity?: number, lat, lng }]
    modes:                         # 提供哪些檢視模式
      - id: bucket
        label: 蓄水率分布
        type: bucket
        thresholds:                # 由小到大；最後一桶是 "≥"
          - { lt: 30,  label: 紅線, color: "#EF4444" }
          - { lt: 60,  label: 警示, color: "#F59E0B" }
          - { gte: 60, label: 充足, color: "#10B981" }
      - id: region
        label: 按地理區
        type: region
        groups_from: data/counties.yaml  # 用 counties.yaml regions
      - id: scatter
        label: 容量 × 蓄水率
        type: scatter
        x_axis: { field: capacity,  label: 容量, unit: 萬m³, scale: log }
        y_axis: { field: value,     label: 蓄水率, unit: "%", scale: linear }
        bands:                     # 背景色帶（y 軸切）
          - { y_lt: 30, color: "#FEF2F2" }
          - { y_lt: 60, color: "#FFFBEB" }
          - { y_gte: 60, color: "#ECFDF5" }
    default_mode: bucket

  hook_rules:                      # 模板字串，按條件選取（前端 hook_engine.ts 評估）
    # 第一個 condition 為 true 的就用；都不中就用 default
    # variable 可從 overview response 的 hook_context 拿
    - id: drought_ratio
      condition: "ratio_max_min_lpcd > 1.5"
      template: "用水量縣市差異 {ratio} 倍 · 最高 {max_county} {max_value}L · 最低 {min_county} {min_value}L"
      severity: warn
    - id: reservoir_red_line
      condition: "reservoirs_below_30pct > 3"
      template: "全國 {n} 座水庫跌破 30% 紅線（{region_n} 集中）"
      severity: danger
    - default:
      template: "全國蓄水率 {total}% · 平均日用水 {lpcd}L · 接管率 {coverage}%"
      severity: info

  ranking:                         # 排名區塊
    primary_metric: lpcd           # 預設排名指標
    available_metrics: [lpcd, sewage_coverage, water_pollution_fines, flood_high_risk_pct]
    top_n: 5
    bottom_n: 5

# === View B 縣市儀錶板 ===
county_dashboard:
  hero:
    facts:                         # Hero 副標顯示哪些數字（從 county query 取）
      - { source: pop,        suffix: 萬人 }
      - { source: area,       suffix: km², format: num }
      - { source: reservoirs, suffix: 座水庫 }
      - { source: wwtp,       suffix: 座汙水廠 }
  default_tab: overview
  tabs:
    - id: overview
      label: 概覽
      icon: globe
      type: charts                 # charts / ranking_panel / map_only / custom
      layers:                      # 地圖該 tab 開啟的圖層（id 對應 layers_catalog）
        - river_basins
        - reservoirs_point
      kpis: [reservoir_count, wastewater_count, lpcd, sewage_coverage]
      charts:
        - id: county_reservoir_30d
          type: trend
          query: county_reservoir_status_30d
          response_shape:
            series: [{ x: timestamp, y: number }]
            annotations?: array
          windows: [30d, 90d, 1y]

    - id: reservoirs
      label: 水庫
      icon: droplet
      type: charts
      layers: [reservoirs_point, reservoir_polygons]
      kpis: [county_reservoir_rate]
      charts:
        - id: 30d_reservoir_multi
          type: trend_multi
          query: county_reservoir_each_30d
          response_shape:
            series: [{ name: string, color: string, data: [{ x, y }] }]
      explore_links:
        - to: "dataset/reservoir/:id"
          when: click_point_on_map

    - id: ranking
      label: 排名
      icon: trending-up
      type: ranking_panel
      metrics: [lpcd, sewage_coverage, reservoir_rate, flood_high_risk_pct]

# === View C 資料集詳情頁 ===
datasets:
  - id: reservoir
    label: 水庫
    layer: point
    source_table: reservoirs
    detail_fields:
      - { key: name,                       label: 水庫名稱 }
      - { key: built_year,                 label: 啟用年 }
      - { key: full_water_level_m,         label: 滿水位, unit: m }
      - { key: total_capacity_million_m3,  label: 總容量, unit: 萬 m³ }
      - { key: effective_capacity_million_m3, label: 有效容量, unit: 萬 m³ }
      - { key: catchment_area_km2,         label: 集水區, unit: km² }
    timeseries:
      - source: realtime.reservoir_status
        x: snapshot_at
        y: storage_rate_pct
        label: 蓄水率
        annotations_from: reservoir_events
      - source: realtime.reservoir_status
        x: snapshot_at
        y: water_level_m
        label: 水位
    events:                        # ⭐ v2 新增：時序圖事件註記 source
      source: reservoir_events
      response_shape:
        items: [{ date: date, severity: "info"|"warn"|"danger", text: string }]
    download:
      csv: /api/dataset/reservoir/:id/csv
      api: /api/dataset/reservoir/:id

# === View D 比較模式 ===
compare:
  comparable_metrics:
    - id: lpcd
      label: 人均日用水量 LPCD
      unit: L
      source: datagov_8316
      ranking_better: lower
      coverage_note: ~              # 全 22 縣市
    - id: sewage_coverage
      label: 污水接管率
      unit: "%"
      source: datagov_26815
      ranking_better: higher
    - id: realtime_reservoir_rate
      label: 即時蓄水率
      unit: "%"
      source: wra_reservoir_realtime
      ranking_better: higher
      coverage_note: 限有水庫的縣市

# === 跨主題聯動 ===
crosslink:
  - with: demographics
    metric_pair: [lpcd, aging_index]
    trigger: "abs(corr(lpcd, aging_index)) > 0.3"
    template: "{county} 高齡 {aging}% vs 全國 {national_aging}% · LPCD {lpcd}L"

# === 地圖圖層目錄 ===
layers_catalog:                    # ⭐ v2 新增：tabs[].layers 引用這
  - id: river_basins
    type: polygon
    source: public.river_basins
    style: { stroke: "#94A3B8", fill: "rgba(148,163,184,0.1)" }
  - id: reservoirs_point
    type: point
    source: water_reservoirs_with_status
    style:
      mode: rate                   # rate 依蓄水率紅黃綠 / default 純色
      label_min_zoom: 7.6
  # ...

# === 資料來源 ===
data_sources:
  - id: wra_reservoir_realtime
    title: 水利署即時水庫蓄水
    license: OGDL-Taiwan-1.0
    url: https://fhy.wra.gov.tw/ReservoirPage_2011/StorageCapacity.aspx
    updated_field: snapshot_at
    refresh_cadence: hourly
  - id: datagov_8316
    title: 自來水生活用水量統計
    license: OGDL-Taiwan-1.0
    url: https://data.gov.tw/dataset/8316
    updated_field: stat_year
    refresh_cadence: yearly

# === 元資料 ===
meta:
  version: "1.1.0"                 # manifest schema version (跟 spec doc 對齊)
  last_reviewed: "2026-05-14"
  reviewer: migu
  coverage_notes:                  # ⭐ v2 升級：可消費 schema
    - dataset: storm_drainage_pipes
      affected_counties: [A, H, I] # 用 id_moi
      mode: only_in                # only_in（僅這幾個有資料）/ excluded（這幾個沒）
      ui_treatment: warning_badge  # warning_badge / placeholder / hide
      reason: 「雨水下水道僅 3 縣市開放」
    - metric: water_loss_rate
      affected_counties: [A]
      mode: only_in
      ui_treatment: placeholder
      reason: 「漏水率僅台北市 + 全國，無 22 縣市對齊版」
```

## 必填欄位（最小可運作版本）

```yaml
theme:
  id: ...
  name: ...
  emoji: ...
  color_accent: ...
  status: draft

overview:
  default_choropleth_metric: ...
  color_metrics:
    - { id, label, unit, ramp_direction, domain }
  kpis:
    - { id, label, unit, source, query, response_shape: {value, delta} }

county_dashboard:
  default_tab: overview
  tabs:
    - { id, label }                  # 至少一個 Tab
```

其他都選填，沒填的前端走 fallback：
- 沒 `point_profile.enabled: true` → 不渲染該面板
- 沒 `ranking_metrics` → 不顯示 ranking panel
- 沒 `hook_rules` → 用 hardcoded default 文案 + 主題 tagline
- 沒 `crosslink` → 不顯示 InsightCard
- 沒 `coverage_notes` → 預設全 22 縣市都有資料

## 欄位字典

| 欄位 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `theme.color_ramp` | enum | blues | blues / reds / greens / purples / oranges / grays / teal |
| `theme.status` | enum | draft | production / beta / draft / archived |
| `theme.icon` | string | — | lucide-react icon 名（drop / fire / users / car / leaf / house / medical） |
| `kpis[].group` | enum | — | realtime / governance / safety / structural（決定卡片視覺分組） |
| `kpis[].format.precision` | int | 0 | 小數位 |
| `kpis[].format.compare_to` | enum | none | previous_day / previous_week / previous_year / none |
| `kpis[].format.sentiment_when_up` | enum | neutral | positive（升=好）/ negative（升=壞）/ neutral |
| `kpis[].explode[].mode` | enum | — | dimension / time / geo |
| `kpis[].explode[].by` | enum | — | dimension 模式可選：county / reservoir / station / vendor 等 |
| `kpis[].explode[].default` | bool | false | 預設展開哪個模式 |
| `color_metrics[].ramp_direction` | enum | default | default（高=深色）/ reverse（低=深色，給 LPCD 這類「低=好」） |
| `color_metrics[].domain` | [min, max] | 自動 | choropleth 色階區間 |
| `point_profile.modes[].type` | enum | — | bucket / region / scatter / heatmap |
| `point_profile.modes[].thresholds[].lt/gte` | number | — | bucket 切點，由小到大 |
| `tabs[].type` | enum | charts | charts / ranking_panel / map_only / custom |
| `tabs[].layers[]` | string | — | 對應 `layers_catalog[].id` |
| `compare.comparable_metrics[].ranking_better` | enum | higher | higher（越高越好）/ lower（越低越好）/ neutral（無方向，如 birth rate） |
| `compare.comparable_metrics[].coverage_note` | string\|null | null | 顯示在 UI 旁邊的小字（例如「限有水庫的縣市」） |
| `coverage_notes[].mode` | enum | only_in | only_in（僅這幾個縣市有）/ excluded（這幾個沒）/ partial（資料殘缺） |
| `coverage_notes[].ui_treatment` | enum | warning_badge | warning_badge / placeholder / hide |
| `coverage_notes[].affected_counties[]` | string[] | — | 用 `id_moi`（A-Z），不要用中文或 slug |
| `hook_rules[].severity` | enum | info | info / warn / danger（影響 hero 副標顏色） |
| `data_sources[].refresh_cadence` | enum | yearly | realtime（< 1hr）/ hourly / daily / monthly / yearly / static |

## API Response 契約（前端 ↔ 後端）

所有 KPI / chart / explode 的 response 都遵守以下統一信封：

```typescript
// 共同信封
type ApiResponse<T> = {
  data: T;
  meta: {
    source: string;             // data_sources[].id
    updated_at: string;         // ISO timestamp
    coverage_warnings?: Array<{ counties: string[]; reason: string }>;
  };
};

// 例：KPI overview
ApiResponse<{
  value: number;
  delta: number;
  spark?: number[];
}>

// 例：KPI explode by dimension (22 縣市 LPCD 排序)
ApiResponse<{
  items: Array<{
    id: string;       // 對應 manifest 的 by（county_id / reservoir_id 等）
    name: string;
    value: number;
    county_id?: string;
  }>;
}>

// 例：時序爆炸
ApiResponse<{
  series: Array<{ x: string; y: number }>;
  annotations?: Array<{ at_index: number; label: string; severity: 'info' | 'warn' | 'danger' }>;
}>

// 例：縣市儀錶板（一次回多 KPI + 多 chart）
ApiResponse<{
  county_id: string;
  kpis: Record<string /* kpi.id */, { value: number; delta?: number }>;
  charts: Record<string /* chart.id */, { series: Array<{ x; y }> }>;
}>
```

每個 `response_shape:` 都要對應上述其中之一（或註明 custom 並另定義）。

## 驗證規則（CI / pre-commit）

### 結構性
- `theme.id` 在所有 themes/*.yaml 中唯一
- `theme.id` 符合 `^[a-z][a-z0-9-]+$`
- `theme.color_accent` 必為合法 hex `#RRGGBB`
- `meta.version` 用 SemVer

### 引用一致性
- `kpis[].source` 必對應 `data_sources[].id`
- `kpis[].explode[].by` 為已知 dimension（在 dimension catalog 內，TBD）
- `tabs[].layers[]` 必對應 `layers_catalog[].id`
- `tabs[].kpis[]` 必對應 `overview.kpis[].id` 或 county-level KPI dict
- `tabs[].charts[].query` 必後端可解析（dev 模式給 stub）
- `compare.comparable_metrics[].id` 必對應某 KPI 或 color_metric
- `crosslink[].with` 必為已存在的另一 theme.id
- `coverage_notes[].affected_counties[]` 必為合法 `id_moi`（A-Z，排除 L/R/S）
- 無循環 crosslink（A → B → A）

### Response shape 一致性
- 所有 `response_shape:` 必對應「API Response 契約」一段所列之一
- explode mode=dimension 必填 `response_shape.items`
- explode mode=time 必填 `response_shape.series`

### Coverage notes 一致性
- 若某 KPI 引用的 source 在 `coverage_notes[].dataset` 出現 → UI 自動降級為該 `ui_treatment`
- 避免 hardcoded `<PlaceholderTab warning>` 在 view layer（v1 prototype 的問題）

## 不放進 manifest 的東西

- 顏色細節（hex 對映）→ `frontend/src/lib/design-tokens.ts`（但 `color_accent` 例外，因為前端讀 manifest 動態套色）
- 文案中的長描述 → `frontend/src/lib/i18n/`（之後做 i18n 時）
- 圖表詳細樣式（X 軸格式、tooltip 內容）→ 元件內部處理
- 後端 SQL → 後端 view / RPC 內部，manifest 只引用 `query` 名
- 鄉鎮/村里清單 → `data/townships.yaml`（之後）

## Migration: v1.0 → v1.1

`themes/*.yaml` 升級檢查表：
- [ ] 加 `overview.color_metrics`（從 prototype 的 `WATER_COLOR_METRICS` 抽出）
- [ ] 每個 `kpis[]` 加 `response_shape` 與 `format.sentiment_when_up`
- [ ] `overview.kpis[]` 加 `group: realtime|governance|safety|structural`
- [ ] 把 `point_profile` 從 prototype JSX 抽出寫成 manifest
- [ ] `meta.coverage_notes[]` 從自由文字改為 `{affected_counties[id_moi], mode, ui_treatment}` 結構
- [ ] `tabs[].layers[]` 名字對齊 `layers_catalog[]`
- [ ] `compare.comparable_metrics[]` 加 `source` 欄

Manifest 是「**主題長怎樣**」的宣告式描述，不是程式碼。CI validator 把這份規格變成 commit-time guard。
