/**
 * theme-registry — 每主題一個宣告式 entry，消滅 App.tsx / MapView.tsx 的 theme 字串 ladder
 *
 * 加一個標準新主題（choropleth 著色 + N 個點位層 + 專屬 ViewA/ViewB + hook）：
 *   1. 寫好該主題的 queries / hook / views 檔案
 *   2. 在本檔加一個 defineTheme entry + push 進 THEME_REGISTRY
 *   → App.tsx 與 MapView.tsx 零修改。
 *
 * 特殊地圖層（water 基底層 / fire heatmap）不強求泛化：
 * 由 entry.specialMapProps 回傳 SpecialMapProps flag/data，MapView 內既有實作承接。
 */

import { useMemo, type ReactNode } from "react";
import type { AppView, CountyCode3, ThemeManifest } from "@/lib/types";
import type {
  SpecialMapProps,
  MapPointLayerSpec,
  MapPointFeature,
  FireIncidentPoint,
  FireStationFeature,
  ReservoirPointFeature,
  RiverStationFeature,
} from "@/components/map/MapView";
import { COUNTIES, byCode3, byIdMoi, codeConvert, normalizeCountyName } from "@/lib/counties";
import { isLayerLocked, type GateContext } from "@/lib/layerGates";
import { getNearestCounty } from "@/lib/reverseGeocode";
import { FIRE_MOCK_BY_COUNTY } from "@/lib/mock-fire";

// hooks
import { useWaterKpis, type WaterKpisState } from "@/hooks/useWaterKpis";
import { useRiverWaterLevel, type RiverWaterLevelState } from "@/hooks/useRiverWaterLevel";
import { useFireData, type FireDataState } from "@/hooks/useFireData";
import { useDemographicsData, type DemographicsDataState } from "@/hooks/useDemographicsData";
import { useRailData, type RailDataState } from "@/hooks/useRailData";
import { useMaritimeData, type MaritimeDataState } from "@/hooks/useMaritimeData";
import { useMedicalData, type MedicalDataState } from "@/hooks/useMedicalData";

// views
import { ViewAWater } from "@/components/views/ViewAWater";
import { ViewAFire } from "@/components/views/ViewAFire";
import { ViewAHome } from "@/components/views/ViewAHome";
import { ViewADemographics } from "@/components/views/ViewADemographics";
import { ViewARail } from "@/components/views/ViewARail";
import { ViewAMaritime } from "@/components/views/ViewAMaritime";
import { ViewAMedical } from "@/components/views/ViewAMedical";
import { ViewB } from "@/components/views/ViewB";
import { ViewBFire } from "@/components/views/ViewBFire";
import { ViewBHomeBasics } from "@/components/views/ViewBHomeBasics";
import { ViewBDemographics } from "@/components/views/ViewBDemographics";
import { ViewBRail } from "@/components/views/ViewBRail";
import { ViewBMaritime } from "@/components/views/ViewBMaritime";
import { ViewBMedical } from "@/components/views/ViewBMedical";
import { ViewC } from "@/components/views/ViewC";

// ─────────────────────────────────────────────────
// Registry 型別
// ─────────────────────────────────────────────────

/** 傳給 renderViewA/B/C 的 App 端 context */
export interface ThemeViewContext {
  manifest: ThemeManifest;
  county: CountyCode3 | null;
  metric: string;
  onMetricChange: (id: string) => void;
  onCountyClick: (code: CountyCode3) => void;
  /** goHome（View B「返回」） */
  onBack: () => void;
  /** 進 View C（水庫 detail）；非 water 主題目前不會用到 */
  onDrillReservoir: (reservoirId: string) => void;
}

/** 宣告式點位層：TwoSectionLayers toggle + MapView 泛用 circle/label 層 */
export interface PointLayerDef<TData> {
  id: string;
  label: string;
  color: string;
  shape: "ring" | "dot" | "small" | "square";
  /** false = placeholder（Phase 1+ 規劃中），checkbox disabled */
  enabled: boolean;
  defaultOn: boolean;
  /**
   * 會員鎖層 key（gated_layers.layer_key，如 "info_medical_ltc"）。
   * 有值時由 App 依 isLayerLocked(gateKey, tier, gates) 判定 locked：
   * locked → toggle 顯示 🔒 + tier 標示、地圖層隱藏、資料不 fetch。
   */
  gateKey?: string;
  /** toggle 顯示的數量（真實資料層用） */
  count?: (data: TData) => number;
  /** 固定數量（placeholder 層用，如雨量站 1306） */
  staticCount?: number;
  /**
   * 地圖渲染 spec；省略 = 純 toggle（該層由 specialMapProps 特殊路徑承接，
   * 如 water reservoir/riverLevel、fire hotspots/stations）
   */
  map?: {
    spec: MapPointLayerSpec;
    getPoints: (data: TData, view: AppView, county: CountyCode3 | null) => MapPointFeature[];
    /** 可見性；預設 (on) => on */
    visibleWhen?: (on: boolean, view: AppView) => boolean;
  };
}

export interface ThemeRegistryEntry<TData = unknown> {
  id: string;
  /** hook 啟用條件；預設 (t) => t === id */
  enabledFor?: (activeTheme: string) => boolean;
  /**
   * 主題資料 hook wrapper。所有 entry 的 useData 每次 render 都會被呼叫
   * （見 useThemeRegistryData 的 Rules-of-Hooks 說明）。
   * 省略 = 無自己的資料（搭配 dataFrom 共用其他 entry）。
   * 第二參數 gate = 會員閘門 context（tier + gates），tier-gated 層據此決定
   * 是否 fetch（資料防漏）；無鎖層的 entry 可忽略。
   */
  useData?: (enabled: boolean, gate: GateContext) => TData;
  /** 改用其他 entry 的資料（home-basics 共用 demographics = SSOT） */
  dataFrom?: string;
  /**
   * 手選品牌 deep/soft 色（accent 一律取 manifest.theme.color_accent = 單一 SSOT）。
   * 缺 entry / 缺 override → 從 color_ramp 推導（App 端有 DEV warning，
   * 防「theme accent key miss → 整片變水藍」舊坑）。
   */
  accentOverride?: { deep: string; soft: string };
  /** choropleth：metric → { code3: value }。缺 key = 該縣無資料（灰） */
  metricResolver?: (data: TData, metric: string) => Partial<Record<CountyCode3, number | null>>;
  /**
   * true = 缺值 fallback 到水主題 mock（getMockMetricValue）。
   * 僅 water 開啟（既有行為）；無 entry 的 draft 主題也會走 mock fallback（鐵則 1 地雷，App 端 DEV warn）。
   */
  mockMetricFallback?: boolean;
  /** MapView 特殊層 props（water 基底層 / fire heatmap 等非標準層） */
  specialMapProps?: (
    data: TData,
    args: { on: Record<string, boolean>; view: AppView; county: CountyCode3 | null }
  ) => SpecialMapProps;
  pointLayers?: Array<PointLayerDef<TData>>;
  /**
   * 專屬 view。缺 renderViewA → App fallback 到 generic ViewA
   * （generic ViewA 內含水主題 mock KPI 版位 — 鐵則 1 地雷，正式主題必須提供真 view）。
   */
  renderViewA?: (data: TData, ctx: ThemeViewContext) => ReactNode;
  renderViewB?: (data: TData, ctx: ThemeViewContext) => ReactNode;
  renderViewC?: (
    data: TData,
    ctx: ThemeViewContext & { reservoirId: string; onBackFromDetail: () => void }
  ) => ReactNode;
}

// registry 陣列需要異質 TData 共存；函式參數 contravariance 使
// ThemeRegistryEntry<X> 不能直接 assign 給 ThemeRegistryEntry<unknown>，故用 any。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyThemeEntry = ThemeRegistryEntry<any>;

/** 保留 entry 內部型別推導，再擦除為 AnyThemeEntry 收進陣列 */
function defineTheme<TData>(entry: ThemeRegistryEntry<TData>): AnyThemeEntry {
  return entry as AnyThemeEntry;
}

// ─────────────────────────────────────────────────
// water — 特殊基底層（河網/流域/水庫/水位站）+ mock fallback（鐵則 1 已知殘留）
// ─────────────────────────────────────────────────

interface WaterThemeData {
  water: WaterKpisState;
  river: RiverWaterLevelState;
}

function waterMetricResolver(
  { water, river }: WaterThemeData,
  metric: string
): Partial<Record<CountyCode3, number | null>> {
  const out: Partial<Record<CountyCode3, number | null>> = {};
  if (metric === "lpcd" || metric === "sewage_coverage") {
    // governance.{lpcd|sewage}_by_county（key=id_moi）→ code3
    const src =
      metric === "lpcd"
        ? water.governance?.lpcd_by_county
        : water.governance?.sewage_by_county;
    if (src) {
      for (const [idMoi, v] of Object.entries(src)) {
        const code = codeConvert.idMoiToCode3(idMoi);
        if (code) out[code as CountyCode3] = v;
      }
    }
  } else if (metric === "rain_24hr") {
    // 雨量站（中文 county）聚合成 22 縣市平均 24hr 雨量（原 App.tsx rain24ByCode3）
    const buckets = new Map<CountyCode3, number[]>();
    for (const s of water.rainStations) {
      const idMoi = normalizeCountyName(s.county || "");
      if (!idMoi) continue;
      const code = codeConvert.idMoiToCode3(idMoi);
      if (!code) continue;
      const v = s.precipitation_24hr;
      if (v == null) continue;
      const list = buckets.get(code as CountyCode3) ?? [];
      list.push(v);
      buckets.set(code as CountyCode3, list);
    }
    for (const [k, vs] of buckets) {
      out[k] = vs.reduce((s, v) => s + v, 0) / vs.length;
    }
  } else if (metric === "river_alert_pct") {
    // 沿舊行為：無資料縣市顯 0（非 null）
    for (const c of COUNTIES) {
      out[c.code3 as CountyCode3] = river.byCode3[c.code3]?.alert_pct ?? 0;
    }
  }
  return out;
}

/** View A: 全部水庫；View B/C: 只該縣市（聚焦上下文） */
function buildReservoirPoints(
  water: WaterKpisState,
  view: AppView,
  county: CountyCode3 | null
): ReservoirPointFeature[] {
  if (!water.reservoirs.length) return [];
  const all = water.reservoirs.map((r) => ({
    id: r.reservoir_id,
    name: r.name,
    rate: r.storage_ratio_pct,
    capacity: Number(r.effective_capacity_wan) || 0,
    lat: r.lat,
    lng: r.lng,
  }));
  if ((view === "B" || view === "C") && county) {
    return all.filter(
      (p) => p.lat != null && p.lng != null && getNearestCounty(p.lng, p.lat) === county
    );
  }
  return all;
}

/** View A: 全國水位站；View B/C: 只該縣市 */
function buildRiverStationPoints(
  river: RiverWaterLevelState,
  view: AppView,
  county: CountyCode3 | null
): RiverStationFeature[] {
  if (!river.stations.length) return [];
  const all = river.stations.map((s) => ({
    id: s.station_id,
    name: s.station_name,
    river: s.river_name,
    county: s.county_id_moi,
    level_m: s.water_level_m,
    alert_level: s.alert_level,
    observed_at: s.observed_at,
    lat: s.lat,
    lng: s.lng,
  }));
  if ((view === "B" || view === "C") && county) {
    return all.filter((p) => p.county != null && codeConvert.idMoiToCode3(p.county) === county);
  }
  return all;
}

const waterEntry = defineTheme<WaterThemeData>({
  id: "water",
  // useWaterKpis / useRiverWaterLevel 尚無 enabled 參數 —
  // 維持既有行為：一進站就 fetch（不分主題）。之後要省 quota 再加 enabled。
  useData: () => {
    const water = useWaterKpis();
    const river = useRiverWaterLevel();
    return useMemo(() => ({ water, river }), [water, river]);
  },
  accentOverride: { deep: "#0369A1", soft: "#E0F2FE" },
  metricResolver: waterMetricResolver,
  // 鐵則 1 已知殘留：水主題缺值仍以 mock 補（reservoir_rate / flood_high_risk_pct 等）
  mockMetricFallback: true,
  specialMapProps: ({ water, river }, { on, view, county }) => ({
    showWaterBaseLayers: true,
    reservoirPoints: buildReservoirPoints(water, view, county),
    showReservoirs: view === "A" ? !!on.reservoir : true,
    riverStations: buildRiverStationPoints(river, view, county),
    showRiverStations: view === "A" ? !!on.riverLevel : true,
  }),
  // reservoir / riverLevel 無 map spec：由上方 specialMapProps 的水基底層承接
  pointLayers: [
    { id: "reservoir",  label: "主要水庫",   color: "#0EA5E9", shape: "ring",   enabled: true,  defaultOn: true,  count: (d) => d.water.reservoirs.length },
    { id: "rainGauge",  label: "雨量站",     color: "#10B981", shape: "dot",    enabled: false, defaultOn: false, staticCount: 1306 },
    { id: "waterQC",    label: "水質測站",   color: "#A855F7", shape: "small",  enabled: false, defaultOn: false, staticCount: 2269 },
    { id: "riverLevel", label: "河川水位站", color: "#F59E0B", shape: "dot",    enabled: true,  defaultOn: false, count: (d) => d.river.stations.length },
    { id: "polluter",   label: "列管事業",   color: "#EF4444", shape: "small",  enabled: false, defaultOn: false, staticCount: 8420 },
    { id: "wwtp",       label: "汙水處理廠", color: "#64748B", shape: "square", enabled: false, defaultOn: false, staticCount: 82 },
  ],
  renderViewA: ({ water, river }, ctx) => (
    <ViewAWater
      water={water}
      river={river}
      selectedCounty={ctx.county}
      onCountyClick={ctx.onCountyClick}
      onDrillReservoir={ctx.onDrillReservoir}
    />
  ),
  renderViewB: ({ water }, ctx) => (
    <ViewB
      manifest={ctx.manifest}
      county={ctx.county!}
      allReservoirs={water.reservoirs}
      nationalLpcd={water.governance?.lpcd_national_avg ?? null}
      nationalSewage={water.governance?.sewage_national_avg ?? null}
      lpcdByCountyId={water.governance?.lpcd_by_county ?? {}}
      sewageByCountyId={water.governance?.sewage_by_county ?? {}}
      onBack={ctx.onBack}
      onDrillReservoir={ctx.onDrillReservoir}
    />
  ),
  renderViewC: ({ water }, ctx) => (
    <ViewC
      reservoirId={ctx.reservoirId}
      allReservoirs={water.reservoirs}
      nationalAvg={water.summary?.reservoir_rate_avg ?? null}
      onBack={ctx.onBackFromDetail}
    />
  ),
});

// ─────────────────────────────────────────────────
// fire — 特殊層（heatmap + 分隊 dot/label）
// ─────────────────────────────────────────────────

function fireMetricResolver(
  fire: FireDataState,
  metric: string
): Partial<Record<CountyCode3, number | null>> {
  const out: Partial<Record<CountyCode3, number | null>> = {};
  if (metric === "fire_density_per_wan") {
    for (const a of fire.countyAggregates) {
      const c = COUNTIES.find((x) => x.id_moi === a.county_id);
      if (c && c.pop_2024_wan > 0) out[c.code3 as CountyCode3] = a.incidents / c.pop_2024_wan;
    }
  } else if (metric === "station_density_per_wan") {
    const stationsByCounty = new Map<string, number>();
    for (const s of fire.stations) {
      stationsByCounty.set(s.county_id, (stationsByCounty.get(s.county_id) ?? 0) + 1);
    }
    for (const c of COUNTIES) {
      if (c.pop_2024_wan > 0) {
        out[c.code3 as CountyCode3] = (stationsByCounty.get(c.id_moi) ?? 0) / c.pop_2024_wan;
      }
    }
  } else if (metric === "out_of_5min_pct") {
    // 鐵則 1 已知殘留：5min 圈外仍 mock（FIRE_MOCK_BY_COUNTY），待等時圈 ETL
    for (const c of COUNTIES) {
      out[c.code3 as CountyCode3] = FIRE_MOCK_BY_COUNTY[c.code3]?.outOf5MinPct ?? null;
    }
  } else if (metric === "hydrant_density_per_km2") {
    for (const h of fire.hydrantCounts) {
      if (h.coverage === "sparse") continue; // 屏東零星視為無資料不著色
      const c = COUNTIES.find((x) => x.id_moi === h.county_id);
      if (c && h.hydrant_count > 0 && c.area_km2 > 0) {
        out[c.code3 as CountyCode3] = h.hydrant_count / c.area_km2;
      }
    }
  }
  return out;
}

/** heatmap 點位：View A 全國；View B 只該縣市 */
function buildFireIncidentPoints(
  fire: FireDataState,
  view: AppView,
  county: CountyCode3 | null
): FireIncidentPoint[] {
  if (!fire.incidentPoints.length) return [];
  if (view === "B" && county) {
    const idMoi = byCode3[county]?.id_moi;
    if (idMoi) {
      return fire.incidentPoints
        .filter((p) => p.county_id === idMoi && p.lat != null && p.lng != null)
        .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
    }
  }
  return fire.incidentPoints
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
}

function buildFireStationFeatures(
  fire: FireDataState,
  view: AppView,
  county: CountyCode3 | null
): FireStationFeature[] {
  if (!fire.stations.length) return [];
  const all = fire.stations
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({
      id: s.station_id,
      name: s.name,
      county_name: byIdMoi[s.county_id as keyof typeof byIdMoi]?.name_zh ?? s.county_id,
      lat: s.lat as number,
      lng: s.lng as number,
    }));
  if (view === "B" && county) {
    const idMoi = codeConvert.code3ToIdMoi(county);
    return all.filter(
      (s) => fire.stations.find((st) => st.station_id === s.id)?.county_id === idMoi
    );
  }
  return all;
}

const fireEntry = defineTheme<FireDataState>({
  id: "fire",
  useData: (enabled) => useFireData({ enabled }),
  accentOverride: { deep: "#991B1B", soft: "#FEF2F2" },
  metricResolver: fireMetricResolver,
  specialMapProps: (data, { on, view, county }) => ({
    showFireHeatmap: !!on.hotspots,
    showFireStations: !!on.stations,
    fireIncidentPoints: buildFireIncidentPoints(data, view, county),
    fireStations: buildFireStationFeatures(data, view, county),
  }),
  // hotspots / stations 無 map spec：由 specialMapProps 的 fire 特殊層承接
  pointLayers: [
    { id: "hotspots",    label: "火災熱點",           color: "#DC2626", shape: "small",  enabled: true,  defaultOn: true,  count: (d) => d.incidentPoints.filter((p) => p.lat != null && p.lng != null).length },
    { id: "stations",    label: "消防分隊",           color: "#DC2626", shape: "dot",    enabled: true,  defaultOn: false, count: (d) => d.stations.filter((s) => s.lat != null && s.lng != null).length },
    { id: "hydrants",    label: "消防栓（部分縣市）", color: "#0EA5E9", shape: "small",  enabled: false, defaultOn: false, count: (d) => d.hydrantCounts.reduce((s, h) => s + h.hydrant_count, 0) },
    { id: "forestRisk",  label: "林火風險點",         color: "#84CC16", shape: "ring",   enabled: false, defaultOn: false, count: (d) => d.forestRisk?.total ?? 0 },
    { id: "emsHospital", label: "避難收容所",         color: "#10B981", shape: "square", enabled: false, defaultOn: false, count: (d) => d.shelterNationalCount },
  ],
  renderViewA: (data, ctx) => (
    <ViewAFire data={data} selectedCounty={ctx.county} onCountyClick={ctx.onCountyClick} />
  ),
  renderViewB: (data, ctx) => (
    <ViewBFire data={data} county={ctx.county!} onBack={ctx.onBack} />
  ),
});

// ─────────────────────────────────────────────────
// demographics / home-basics — 共用 useDemographicsData（SSOT）
// ─────────────────────────────────────────────────

function demographicsMetricResolver(
  data: DemographicsDataState,
  metric: string
): Partial<Record<CountyCode3, number | null>> {
  const out: Partial<Record<CountyCode3, number | null>> = {};
  for (const agg of data.countyAggregates) {
    const code = agg.code3 as CountyCode3;
    if (metric === "aging_index") out[code] = agg.agingIndex;
    else if (metric === "population") out[code] = agg.pop;
    else if (metric === "population_density") out[code] = agg.density;
    else if (metric === "growth_10y_pct") out[code] = agg.growth10y;
    else if (metric === "area_km2") out[code] = byCode3[code]?.area_km2 ?? null;
  }
  return out;
}

const demographicsEntry = defineTheme<DemographicsDataState>({
  id: "demographics",
  // home-basics 也吃 demographics 資料（aging history + 地圖染色）→ 兩主題都 enable
  enabledFor: (t) => t === "demographics" || t === "home-basics",
  useData: (enabled) => useDemographicsData({ enabled }),
  accentOverride: { deep: "#5B21B6", soft: "#F3E8FF" },
  metricResolver: demographicsMetricResolver,
  renderViewA: (data, ctx) => (
    <ViewADemographics data={data} selectedCounty={ctx.county} onCountyClick={ctx.onCountyClick} />
  ),
  renderViewB: (data, ctx) => (
    <ViewBDemographics data={data} county={ctx.county!} onBack={ctx.onBack} />
  ),
});

const homeBasicsEntry = defineTheme<DemographicsDataState>({
  id: "home-basics",
  dataFrom: "demographics", // 無自己的 useData — 共用 demographics entry 的 hook 資料
  accentOverride: { deep: "#1E293B", soft: "#F1F5F9" },
  metricResolver: demographicsMetricResolver,
  renderViewA: (data, ctx) => (
    <ViewAHome selectedCounty={ctx.county} onCountyClick={ctx.onCountyClick} demographics={data} />
  ),
  renderViewB: (_data, ctx) => (
    <ViewBHomeBasics county={ctx.county!} onBack={ctx.onBack} onCityClick={ctx.onCountyClick} />
  ),
});

// ─────────────────────────────────────────────────
// rail — 泛用點位層（車站，per-feature 路線色）
// ─────────────────────────────────────────────────

const RAIL_STATIONS_SPEC: MapPointLayerSpec = {
  id: "rail-stations",
  circlePaint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 8, 4, 11, 7],
    "circle-color": ["coalesce", ["get", "color"], "#4F46E5"],
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 10, 1.5],
    "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 8, 0.95],
  },
  label: { minzoom: 9, textColor: "#312E81" },
  tooltip: (p) => ({
    name: `${p.name}（${String(p.system_id).toUpperCase()}）`,
    value: null,
    valueLabel: "",
    valueUnit: "",
  }),
};

function railMetricResolver(
  data: RailDataState,
  metric: string
): Partial<Record<CountyCode3, number | null>> {
  const out: Partial<Record<CountyCode3, number | null>> = {};
  for (const agg of data.countyAggregates) {
    const code = agg.code3 as CountyCode3;
    if (metric === "station_count") out[code] = agg.stations;      // 0 站為真實值（無軌道縣市）
    else if (metric === "rail_length_km") out[code] = agg.km;      // 0 km 為真實值
    else if (metric === "daily_trips_per_station")
      out[code] = agg.stations > 0 ? Math.round(agg.dailyTrips / agg.stations) : null;
    else if (metric === "ridership_per_capita") out[code] = null;  // Sprint 0 待補
  }
  return out;
}

const railEntry = defineTheme<RailDataState>({
  id: "rail",
  useData: (enabled) => useRailData({ enabled }),
  accentOverride: { deep: "#3730A3", soft: "#E0E7FF" },
  metricResolver: railMetricResolver,
  pointLayers: [
    {
      id: "stations",
      label: "車站",
      color: "#4F46E5",
      shape: "dot",
      enabled: true,
      defaultOn: true,
      count: (d) => d.stations.filter((s) => s.lat != null && s.lng != null).length,
      map: {
        spec: RAIL_STATIONS_SPEC,
        // View B/C 只顯示該縣市車站（聚焦上下文，比照水庫/港口）；View A 全國
        getPoints: (d, view, county) => {
          const idMoi = county ? codeConvert.code3ToIdMoi(county) : null;
          return d.stations
            .filter((s) => s.lat != null && s.lng != null)
            .filter((s) => ((view === "B" || view === "C") && idMoi ? s.county_id === idMoi : true))
            .map((s) => ({
              lat: s.lat as number,
              lng: s.lng as number,
              properties: {
                id: s.station_id,
                name: s.name,
                system_id: s.system_id,
                color: s.color ?? "#4F46E5",
              },
            }));
        },
        visibleWhen: (on, view) => (view === "A" ? on : true),
      },
    },
  ],
  renderViewA: (data, ctx) => (
    <ViewARail data={data} selectedCounty={ctx.county} onCountyClick={ctx.onCountyClick} />
  ),
  renderViewB: (data, ctx) => (
    <ViewBRail data={data} county={ctx.county!} onBack={ctx.onBack} />
  ),
});

// ─────────────────────────────────────────────────
// maritime — 泛用點位層（港口）
// ─────────────────────────────────────────────────

const PORTS_SPEC: MapPointLayerSpec = {
  id: "ports",
  circlePaint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 8, 5, 11, 8],
    "circle-color": "#0D9488",
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 10, 1.5],
    "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 8, 0.95],
  },
  label: { minzoom: 9, textColor: "#115E59" },
  tooltip: (p) => ({
    name: `${p.name}（${p.port_class_group ?? "其他"}）`,
    value: null,
    valueLabel: "",
    valueUnit: "",
  }),
};

function maritimeMetricResolver(
  data: MaritimeDataState,
  metric: string
): Partial<Record<CountyCode3, number | null>> {
  const out: Partial<Record<CountyCode3, number | null>> = {};
  for (const agg of data.countyAggregates) {
    const code = agg.code3 as CountyCode3;
    if (metric === "port_count") out[code] = agg.ports;            // 0 港為真實值（內陸縣市）
    else if (metric === "fishing_port_count") out[code] = agg.fishing;
    else if (metric === "fishery_value_billion")
      out[code] = agg.fisheryValue > 0 ? agg.fisheryValue : null;  // coverage 不全 → 缺值 null
    else if (metric === "port_calls_yearly")
      out[code] = agg.shipTraffic > 0 ? agg.shipTraffic : null;    // 僅商港縣市有 → 缺值 null
  }
  return out;
}

const maritimeEntry = defineTheme<MaritimeDataState>({
  id: "maritime",
  useData: (enabled) => useMaritimeData({ enabled }),
  accentOverride: { deep: "#115E59", soft: "#CCFBF1" },
  metricResolver: maritimeMetricResolver,
  pointLayers: [
    {
      id: "ports",
      label: "港口",
      color: "#0D9488",
      shape: "dot",
      enabled: true,
      defaultOn: true,
      count: (d) => d.ports.filter((p) => p.lat != null && p.lng != null).length,
      map: {
        spec: PORTS_SPEC,
        getPoints: (d) =>
          d.ports
            .filter((p) => p.lat != null && p.lng != null)
            .map((p) => ({
              lat: p.lat,
              lng: p.lng,
              properties: { id: p.id, name: p.name, port_class_group: p.port_class_group },
            })),
        visibleWhen: (on, view) => view === "A" && on,
      },
    },
  ],
  renderViewA: (data, ctx) => (
    <ViewAMaritime data={data} selectedCounty={ctx.county} onCountyClick={ctx.onCountyClick} />
  ),
  renderViewB: (data, ctx) => (
    <ViewBMaritime data={data} county={ctx.county!} onBack={ctx.onBack} />
  ),
});

// ─────────────────────────────────────────────────
// medical — 泛用點位層 ×3（急救醫院 / AED / 長照）
// ─────────────────────────────────────────────────

const MEDICAL_EMERGENCY_SPEC: MapPointLayerSpec = {
  id: "medical-emergency",
  circlePaint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 8, 6, 11, 9],
    "circle-color": "#DC2626",
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 1.5,
    "circle-opacity": 0.9,
  },
  label: { minzoom: 10, textColor: "#991B1B" },
};

const MEDICAL_AED_SPEC: MapPointLayerSpec = {
  id: "medical-aed",
  circlePaint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 8, 3, 11, 5],
    "circle-color": "#F59E0B",
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 0.8,
    "circle-opacity": 0.8,
  },
};

const MEDICAL_LTC_SPEC: MapPointLayerSpec = {
  id: "medical-ltc",
  circlePaint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 8, 3, 11, 5],
    "circle-color": "#7C3AED",
    "circle-stroke-color": "#FFFFFF",
    "circle-stroke-width": 0.8,
    "circle-opacity": 0.75,
  },
};

function medicalMetricResolver(
  data: MedicalDataState,
  metric: string
): Partial<Record<CountyCode3, number | null>> {
  const out: Partial<Record<CountyCode3, number | null>> = {};
  for (const ma of data.countyAggregates) {
    const code = ma.code3 as CountyCode3;
    const pop = byCode3[code]?.pop_2024_wan ?? 1;
    if (metric === "med_hosp_per_wan") out[code] = +(ma.hosp / pop).toFixed(3);
    else if (metric === "med_aed") out[code] = ma.aed;
    else if (metric === "med_ltc") out[code] = ma.ltc;
    else if (metric === "med_desert") out[code] = null; // 等時圈計算待跑
    else if (metric === "med_flu") out[code] = ma.flu;
  }
  return out;
}

/** 長照點位的 gated_layers key（migration 281：required_tier=member, lock_type=full） */
const MEDICAL_LTC_GATE_KEY = "info_medical_ltc";

const medicalEntry = defineTheme<MedicalDataState>({
  id: "medical",
  // 長照點位 tier-gated：locked（281 apply 後 gates 有列且 tier 不足）→ 不 fetch（資料防漏）。
  // gates 尚未有此列（281 前）→ isLayerLocked=false → 照舊 fetch。
  useData: (enabled, gate) =>
    useMedicalData({
      enabled,
      ltcEnabled: !isLayerLocked(MEDICAL_LTC_GATE_KEY, gate.tier, gate.gates),
    }),
  accentOverride: { deep: "#047857", soft: "#D1FAE5" },
  metricResolver: medicalMetricResolver,
  pointLayers: [
    {
      id: "emergency",
      label: "急救醫院",
      color: "#DC2626",
      shape: "dot",
      enabled: true,
      defaultOn: true,
      count: (d) => d.emergencyHospitalPoints.length,
      map: {
        spec: MEDICAL_EMERGENCY_SPEC,
        getPoints: (d) =>
          d.emergencyHospitalPoints.map((p) => ({
            lat: Number(p.lat),
            lng: Number(p.lng),
            properties: { id: p.hospital_id, name: p.name, county: p.county_id, extra: p.level ?? "" },
          })),
      },
    },
    {
      id: "aed",
      label: "AED",
      color: "#F59E0B",
      shape: "ring",
      enabled: true,
      defaultOn: true,
      count: (d) => d.aedPoints.length,
      map: {
        spec: MEDICAL_AED_SPEC,
        getPoints: (d) =>
          d.aedPoints.map((p) => ({
            lat: Number(p.lat),
            lng: Number(p.lng),
            properties: { id: p.place_id, name: p.place_name, county: p.county ?? "" },
          })),
      },
    },
    {
      id: "ltc",
      label: "長照據點",
      color: "#7C3AED",
      shape: "small",
      enabled: true,
      defaultOn: false,
      gateKey: MEDICAL_LTC_GATE_KEY,
      count: (d) => d.ltcPoints.length,
      map: {
        spec: MEDICAL_LTC_SPEC,
        getPoints: (d) =>
          d.ltcPoints.map((p) => ({
            lat: Number(p.lat),
            lng: Number(p.lng),
            properties: { id: p.org_code, name: p.name, county: p.county ?? "", extra: p.abc_type ?? "" },
          })),
      },
    },
  ],
  renderViewA: (data, ctx) => (
    <ViewAMedical data={data} selectedCounty={ctx.county} onCountyClick={ctx.onCountyClick} />
  ),
  renderViewB: (data, ctx) => (
    <ViewBMedical data={data} county={ctx.county!} onBack={ctx.onBack} />
  ),
});

// ─────────────────────────────────────────────────
// Registry 本體 + helpers
// ─────────────────────────────────────────────────

/**
 * ⚠ module-level 常數陣列 — useThemeRegistryData 依此順序呼叫各 entry 的 hooks，
 * 順序 / 數量在 runtime 永遠固定。禁止 runtime 增刪 entry。
 */
export const THEME_REGISTRY: readonly AnyThemeEntry[] = [
  waterEntry,
  fireEntry,
  homeBasicsEntry,
  demographicsEntry,
  railEntry,
  maritimeEntry,
  medicalEntry,
];

export function getThemeEntry(themeId: string): AnyThemeEntry | null {
  return THEME_REGISTRY.find((e) => e.id === themeId) ?? null;
}

/**
 * 呼叫所有 entry 的 useData，回傳 { themeId: data }。
 *
 * Rules of Hooks 說明：這裡在 for 迴圈內呼叫 hooks，看似違規，實際合法 —
 * THEME_REGISTRY 是 module-level 常數（見上方警告），每次 render 迭代的
 * entry 順序、數量、以及每個 useData 內部的 hook 組成完全固定，
 * 等價於逐一明呼 useWaterKpis()/useFireData()/... 的寫法。
 */
export function useThemeRegistryData(activeTheme: string, gate: GateContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const entry of THEME_REGISTRY) {
    const enabled = entry.enabledFor ? entry.enabledFor(activeTheme) : activeTheme === entry.id;
    // entry.useData 是否存在為 module-load 時決定，每次 render 條件結果固定 → hook 順序穩定
    // eslint-disable-next-line react-hooks/rules-of-hooks
    out[entry.id] = entry.useData ? entry.useData(enabled, gate) : undefined;
  }
  return out;
}

/** entry 的資料（dataFrom 轉指到共用 entry） */
export function resolveThemeData(
  dataMap: Record<string, unknown>,
  entry: AnyThemeEntry | null
): unknown {
  if (!entry) return null;
  return dataMap[entry.dataFrom ?? entry.id] ?? null;
}

/** 各主題點位層 toggle 初始 state（來自 registry defaultOn） */
export function buildDefaultLayerToggles(): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  for (const e of THEME_REGISTRY) {
    if (e.pointLayers?.length) {
      out[e.id] = Object.fromEntries(e.pointLayers.map((L) => [L.id, L.defaultOn]));
    }
  }
  return out;
}
