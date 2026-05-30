/**
 * Theme manifest TypeScript types
 * 對應 docs/04-theme-manifest-spec.md v1.1
 *
 * 所有 themes/*.yaml 載入後都應該符合 `ThemeManifest` shape。
 */

// ─────────────────────────────────────────────────
// 縣市相關
// ─────────────────────────────────────────────────

export type CountyIdMoi = string; // 'A' | 'B' | ... | 'Z'，不含 'L'|'R'|'S'
export type CountyCode3 = string; // 'TPE' | 'KHH' | ...
export type CountySlug = string; // 'taipei' | 'kaohsiung' | ...
export type Region = "north" | "central" | "south" | "east" | "island";

export interface County {
  id_moi: CountyIdMoi;
  code3: CountyCode3;
  slug: CountySlug;
  name_zh: string;
  name_zh_alt: string;
  name_en: string;
  name_en_short: string;
  region: Region;
  is_special_municipality: boolean;
  became_special_in: number | null;
  centroid_lng: number;       // polygon centroid（給 reverseGeocode 用）
  centroid_lat: number;
  label_lng?: number;         // 可選 anchor — 行政中心或視覺中心（給 map symbol label 用）
  label_lat?: number;         // fallback 用 centroid_lng/lat
  area_km2: number;
  pop_2024_wan: number;
}

export interface RegionDef {
  id: Region;
  name_zh: string;
  name_en: string;
  counties: CountyCode3[];
}

// ─────────────────────────────────────────────────
// Theme manifest
// ─────────────────────────────────────────────────

export type ThemeStatus = "production" | "beta" | "draft" | "archived";
export type ColorRamp =
  | "blues"
  | "reds"
  | "greens"
  | "purples"
  | "oranges"
  | "grays"
  | "teal";

export interface ThemeMeta {
  id: string;
  name: string;
  name_en: string;
  emoji: string;
  icon: string;
  color_accent: string;
  color_ramp: ColorRamp;
  description: string;
  tagline: string;
  priority: number;
  status: ThemeStatus;
}

// ── color_metrics ──
export type RampDirection = "default" | "reverse";

export interface ColorMetric {
  id: string;
  label: string;
  unit: string;
  ramp_direction: RampDirection;
  domain: [number, number];
  coverage_note?: string;       // 部分縣市無資料時的口徑說明（M-5：圖例下顯 warning badge）
}

// ── KPI ──
export type KpiGroup = "realtime" | "governance" | "safety" | "structural";
export type CompareTo =
  | "previous_day"
  | "previous_week"
  | "previous_year"
  | "none";
export type Sentiment = "positive" | "negative" | "neutral";

export interface KpiFormat {
  precision: number;
  compare_to: CompareTo;
  sentiment_when_up: Sentiment;
}

export type ExplodeMode = "dimension" | "time" | "geo";
export type ExplodeBy = "county" | "reservoir" | "station" | "vendor" | string;

export interface ExplodeDimension {
  mode: "dimension";
  by: ExplodeBy;
  default?: boolean;
  response_shape?: unknown;
}

export interface ExplodeTime {
  mode: "time";
  windows: string[]; // e.g. ['30d','1y','all']
  response_shape?: unknown;
}

export interface ExplodeGeo {
  mode: "geo";
  level: "township" | "village";
  response_shape?: unknown;
}

export type ExplodeConfig = ExplodeDimension | ExplodeTime | ExplodeGeo;

export interface KpiDefinition {
  id: string;
  label: string;
  unit: string;
  group: KpiGroup;
  source: string; // data_sources[].id
  query: string;
  format: KpiFormat;
  response_shape?: unknown;
  explode?: ExplodeConfig[];
  meta?: Record<string, unknown>;
}

// ── PointProfile ──
export type PointProfileMode = BucketMode | RegionMode | ScatterMode;

export interface BucketMode {
  id: string;
  label: string;
  type: "bucket";
  thresholds: BucketThreshold[];
}

export interface BucketThreshold {
  lt?: number;
  gte?: number;
  label: string;
  color: string;
}

export interface RegionMode {
  id: string;
  label: string;
  type: "region";
  groups_from: string; // "data/counties.yaml"
}

export interface ScatterMode {
  id: string;
  label: string;
  type: "scatter";
  x_axis: ScatterAxis;
  y_axis: ScatterAxis;
  bands?: ScatterBand[];
}

export interface ScatterAxis {
  field: string;
  label: string;
  unit: string;
  scale: "linear" | "log";
}

export interface ScatterBand {
  y_lt?: number;
  y_gte?: number;
  color: string;
}

export interface PointProfileConfig {
  enabled: boolean;
  title: string;
  source: string;
  query: string;
  response_shape?: unknown;
  modes: PointProfileMode[];
  default_mode: string;
}

// ── Hook rules ──
export type HookSeverity = "info" | "warn" | "danger";

export interface HookRule {
  id?: string;
  condition?: string;
  template?: string;
  default?: boolean;
  severity: HookSeverity;
}

// ── Ranking ──
export interface RankingConfig {
  primary_metric: string;
  available_metrics: string[];
  top_n: number;
  bottom_n: number;
}

// ── View B ──
export interface HeroFact {
  source: string;
  suffix: string;
  format?: "num" | "num1" | "num2";
}

export interface HeroConfig {
  facts: HeroFact[];
}

export type TabType = "charts" | "ranking_panel" | "map_only" | "custom";

export interface ChartDef {
  id: string;
  type: "trend" | "trend_multi" | "bar" | "sparkline" | "donut" | "scatter" | "heatmap" | "pyramid";
  query: string;
  response_shape?: unknown;
  windows?: string[];
  group_by?: string;
}

export interface ExploreLink {
  to: string;
  when: string;
}

export interface TabDef {
  id: string;
  label: string;
  icon: string;
  type: TabType;
  layers?: string[];
  kpis?: string[];
  charts?: ChartDef[];
  metrics?: string[]; // for ranking_panel
  explore_links?: ExploreLink[];
  meta?: Record<string, unknown>;
}

export interface CountyDashboardConfig {
  hero?: HeroConfig;
  default_tab: string;
  tabs: TabDef[];
}

// ── View C ──
export interface DetailField {
  key: string;
  label: string;
  unit?: string;
}

export interface TimeseriesDef {
  source: string;
  x: string;
  y: string;
  label: string;
  annotations_from?: string;
}

export interface DatasetDef {
  id: string;
  label: string;
  layer: "point" | "polygon" | "line";
  source_table: string;
  detail_fields: DetailField[];
  timeseries: TimeseriesDef[];
  events?: { source: string; response_shape?: unknown };
  download: { csv: string; api: string };
}

// ── View D ──
export type RankingBetter = "higher" | "lower" | "neutral";

export interface ComparableMetric {
  id: string;
  label: string;
  unit: string;
  source: string;
  ranking_better: RankingBetter;
  coverage_note?: string;
}

export interface CompareConfig {
  comparable_metrics: ComparableMetric[];
}

// ── Crosslink ──
export interface CrosslinkDef {
  with: string;
  metric_pair: [string, string];
  trigger: string;
  template: string;
}

// ── Layers catalog ──
export type LayerType = "polygon" | "line" | "point";

export interface LayerStyleBase {
  stroke?: string;
  fill?: string;
  color?: string;
  width?: number;
  radius?: number;
  shape?: "circle" | "square" | "ring";
}

export interface LayerCatalogEntry {
  id: string;
  type: LayerType;
  source: string;
  style: LayerStyleBase & {
    mode?: "rate" | "default";
    label_min_zoom?: number;
    thresholds?: BucketThreshold[];
  };
}

// ── Data sources ──
export type RefreshCadence = "realtime" | "hourly" | "daily" | "monthly" | "yearly" | "static";

export interface DataSource {
  id: string;
  title: string;
  license: string;
  url: string;
  updated_field?: string;
  refresh_cadence?: RefreshCadence;
  supabase_tables?: string[];
  note?: string;
}

// ── Meta + coverage notes ──
export type CoverageMode = "only_in" | "excluded" | "partial" | "pending_geocode";
export type CoverageUiTreatment = "warning_badge" | "placeholder" | "hide";

export interface CoverageNote {
  dataset?: string;
  metric?: string;
  affected_counties: CountyIdMoi[];
  mode: CoverageMode;
  ui_treatment: CoverageUiTreatment;
  reason: string;
}

export interface ManifestMeta {
  version: string;
  spec_version?: string;
  last_reviewed: string;
  reviewer: string;
  coverage_notes?: CoverageNote[];
}

// ── Overview ──
export interface OverviewConfig {
  default_choropleth_metric: string;
  color_metrics: ColorMetric[];
  kpis: KpiDefinition[];
  point_profile?: PointProfileConfig;
  hook_rules?: HookRule[];
  ranking?: RankingConfig;
}

// ─────────────────────────────────────────────────
// 完整 ThemeManifest
// ─────────────────────────────────────────────────

export interface ThemeManifest {
  theme: ThemeMeta;
  overview: OverviewConfig;
  county_dashboard?: CountyDashboardConfig;
  datasets?: DatasetDef[];
  compare?: CompareConfig;
  crosslink?: CrosslinkDef[];
  layers_catalog?: LayerCatalogEntry[];
  data_sources: DataSource[];
  meta: ManifestMeta;
}

// ─────────────────────────────────────────────────
// API response 信封
// ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiResponseMeta {
  source: string;
  updated_at: string;
  coverage_warnings?: Array<{
    counties: CountyIdMoi[];
    reason: string;
  }>;
}

// 常見 KPI response payload shape
export interface KpiOverviewPayload {
  value: number;
  delta?: number;
  spark?: number[];
}

export interface ExplodeDimensionPayload {
  items: Array<{
    id: string;
    name: string;
    value: number;
    county_id?: CountyIdMoi;
    [k: string]: unknown;
  }>;
}

export interface ExplodeTimePayload {
  series: Array<{ x: string | number; y: number }>;
  annotations?: Array<{
    at_index: number;
    label: string;
    severity: HookSeverity;
  }>;
}

export interface CountyDashboardPayload {
  county_id: CountyIdMoi;
  kpis: Record<string, { value: number; delta?: number }>;
  charts: Record<string, { series: Array<{ x: string | number; y: number }> }>;
}

// ─────────────────────────────────────────────────
// App state
// ─────────────────────────────────────────────────

export type AppView = "A" | "B" | "C";

export interface AppState {
  theme: string;
  view: AppView;
  county: CountyCode3 | null;
  reservoirId: string | null;
  metric: string; // 當前 choropleth 著色指標
}
