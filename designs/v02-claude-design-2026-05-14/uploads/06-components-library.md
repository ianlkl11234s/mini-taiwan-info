# 06 · 元件庫

> 約 18 個核心元件，跨主題複用。元件命名以 `Atlas` prefix（暫名）避免與其他 mini-taiwan 衝突。

## 元件清單

### 全域 (Global)

| 元件 | 說明 | 出現位置 |
|---|---|---|
| `AtlasTopBar` | 頂部 nav，含主題下拉、年份選擇、搜尋、設定 | 所有 view |
| `ThemeSwitcher` | 底部主題列（emoji + 文字） | 所有 view |
| `Breadcrumb` | 麵包屑導航 | View B/C/D |
| `Footer` | 來源 / 授權 / About / GitHub | 所有 view |

### 地圖 (Map)

| 元件 | 說明 | Props |
|---|---|---|
| `MapCanvas` | 主地圖容器（MapLibre GL） | `theme`, `view`, `selectedCounty?` |
| `ChoroplethLayer` | 行政區著色層 | `data: {countyId: value}`, `metric`, `colorRamp`, `range` |
| `PointLayer` | 點位層（水庫、消防隊、汙水廠…） | `points: GeoJSON`, `style`, `onClick` |
| `PolygonLayer` | 面層（流域、淹水潛勢、集水區） | `polygons: GeoJSON`, `style` |
| `LineLayer` | 線層（河川、道路） | `lines: GeoJSON`, `style` |
| `MapLegend` | 圖例（色階 + 圖層 toggle） | `layers`, `colorRamp`, `range` |
| `MiniMap` | View C 用的小地圖 | `center`, `zoom`, `marker` |

### 儀錶板 (Dashboard)

| 元件 | 說明 | Props |
|---|---|---|
| `KPICard` | KPI 卡片 | `value`, `unit`, `label`, `trend?`, `explodable?` |
| `RankingPanel` | 排名長條 | `rows: [{rank, county, value}]`, `metric`, `highlight?` |
| `TrendChart` | 時序折線 | `series`, `xRange`, `yLabel`, `annotations?` |
| `SparkLine` | 迷你折線（KPI 卡內） | `data: number[]` |
| `MetricTable` | 詳細欄位表 | `rows`, `columns`, `fieldDict` |
| `TabBar` | 主題子分頁 | `tabs`, `active`, `onChange` |
| `ExplodedView` | 爆炸圖容器 | `mode: dimension/time/geo`, `data`, `onCollapse` |
| `InsightCard` | 跨主題洞察卡 | `crosslink`, `metricA`, `metricB`, `text` |

### 工具 (Utility)

| 元件 | 說明 | Props |
|---|---|---|
| `DataSourceBadge` | 資料來源 + 更新時間 + 下載 | `source`, `updatedAt`, `csvUrl?`, `apiUrl?` |
| `CountyPicker` | 縣市多選（比較模式用） | `selected[]`, `max`, `onChange` |
| `YearSelector` | 年份下拉 | `years[]`, `value`, `onChange` |
| `TimeRangeToggle` | 30d / 1y / all 切換 | `value`, `options`, `onChange` |
| `DataMissingState` | 「資料未開放」優雅狀態 | `reason`, `suggestUrl?` |
| `LoadingSkeleton` | 載入骨架 | `variant: kpi/chart/map` |
| `ErrorBoundary` | 錯誤捕捉 | `fallback`, `onReport` |

## 元件相依關係

```
View B 縣市儀錶板
├── Breadcrumb
├── MapCanvas
│   ├── ChoroplethLayer (鄉鎮層)
│   ├── PointLayer (水庫、汙水廠…)
│   └── MapLegend
├── TabBar
└── Tab 內容
    ├── KPICard ×3
    │   └── (點 ⤴) ExplodedView
    │       └── TrendChart / RankingPanel / ChoroplethLayer (mini)
    ├── TrendChart 主圖
    │   └── DataSourceBadge
    └── RankingPanel (排名 Tab)
```

## 設計 Tokens（給設計師）

```yaml
spacing:
  unit: 4px
  card_padding: 16px
  section_gap: 24px

typography:
  body: 14-16px / 1.5
  kpi_number: 32px / 1.2 / bold
  kpi_label: 14px / 1.4 / regular
  metadata: 12px / 1.4 / regular
  chart_title: 16px / 1.4 / semibold

elevation:
  card: 0 1px 3px rgba(0,0,0,0.08)
  card_hover: 0 4px 12px rgba(0,0,0,0.12)
  modal: 0 24px 48px rgba(0,0,0,0.18)

radius:
  card: 8px
  button: 6px
  pill: 9999px

colors:
  bg_primary: #FFFFFF / dark: #0F172A
  bg_secondary: #F8FAFC / dark: #1E293B
  text_primary: #0F172A / dark: #F1F5F9
  text_secondary: #64748B / dark: #94A3B8
  border: #E2E8F0 / dark: #334155
  accent_themes:
    water: #0EA5E9
    fire: #DC2626
    population: #8B5CF6
    transport: #F97316
    medical: #10B981
    environment: #22C55E
    real_estate: #F59E0B
    home_basics: #475569
```

## 元件契約（資料形狀）

### KPICard

```typescript
type KPICardProps = {
  id: string;
  value: number | string;
  unit?: string;
  label: string;
  trend?: {
    delta: number;       // 變化量
    direction: 'up' | 'down' | 'flat';
    baseline: string;    // "vs 上週"
    sentiment: 'positive' | 'negative' | 'neutral';
  };
  source?: DataSource;
  explodable?: boolean;
  onExplode?: () => void;
}
```

### TrendChart

```typescript
type TrendChartProps = {
  series: Array<{
    name: string;
    color: string;
    data: Array<{ x: Date; y: number }>;
  }>;
  xRange: { from: Date; to: Date };
  yLabel: string;
  yUnit: string;
  annotations?: Array<{ x: Date; label: string; severity: 'info'|'warn'|'danger' }>;
  source: DataSource;
}
```

### DataSource (共用型別)

```typescript
type DataSource = {
  id: string;            // 'wra_reservoir' 等
  title: string;         // 顯示名
  url: string;           // 來源 URL
  license: string;       // 'OGDL-Taiwan-1.0' 等
  updatedAt: Date;       // 最後更新時間
  csvDownloadUrl?: string;
}
```

## 元件不做的事

- ❌ 元件不直接打 API（透過 React Query / SWR 等資料層）
- ❌ 元件不存 i18n 字串（透過 `t('key')`）
- ❌ 元件不解析 theme manifest（manifest 在 page 層解析後傳入）
- ❌ 元件不知道「主題是什麼」（只接收 props，主題感由 color_accent 帶入）

## Phase 1 (MVP) 必做元件

優先實作（不做 phase 2 才上場的）：

✅ AtlasTopBar / Breadcrumb / Footer  
✅ MapCanvas / ChoroplethLayer / PointLayer / MapLegend  
✅ KPICard / RankingPanel / TrendChart / TabBar  
✅ DataSourceBadge / LoadingSkeleton / DataMissingState  
✅ ExplodedView（先做維度爆炸 + 時間爆炸）  
✅ CountyPicker / YearSelector / TimeRangeToggle

延後到 Phase 2-3：

⏳ InsightCard (跨主題洞察)  
⏳ ExplodedView 的空間爆炸模式  
⏳ MiniMap（View C 用）  
⏳ MetricTable（View C 用）

## 與其他 mini-taiwan 共用元件的可能性

未來可抽出共用 package `@minitw/ui`：
- MapCanvas / ChoroplethLayer（mini-taiwan-pulse 也用）
- KPICard / TrendChart（通用）
- AtlasTopBar / ThemeSwitcher（可能差異化太大不共用）

設計階段不強制共用，先各自做完 MVP 後再抽。
