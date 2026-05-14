/**
 * 水資源主題 — Supabase 查詢
 *
 * 對應 themes/water.yaml 內 KPI 的 `query` 欄位。
 * Phase 0c-1：接 4 個 ready KPI（蓄水率/雨量/警戒/水庫點位）
 * Phase 0c-2/3：LPCD + 接管率（等 ETL pipeline 跑完，再加 queries）
 */

import { supabase } from "../supabase";

// ─────────────────────────────────────────────────
// 1. 全國水庫水情（RPC: get_reservoir_status_latest）
// ─────────────────────────────────────────────────

export interface ReservoirStatusRow {
  reservoir_id: string;
  name: string;
  region: string;                 // 北/中/南/東
  lat: number;
  lng: number;
  effective_capacity_wan: number; // 有效容量 萬 m³
  snapshot_at: string;            // ISO timestamp
  water_level_m: number | null;
  effective_storage_wan_m3: number | null;
  storage_ratio_pct: number | null;
  alert_level: string | null;     // normal / warning / critical
  inflow_cms: number | null;
  total_outflow_cms: number | null;
  basin_rainfall_mm: number | null;
}

/**
 * 取得全國所有水庫最新水情。
 * 一個 RPC 就能服務 3 個 KPI（蓄水率 / 警戒水庫 / 40 點位）— 不重複呼叫。
 */
export async function fetchReservoirStatusLatest(): Promise<ReservoirStatusRow[]> {
  const { data, error } = await supabase.rpc("get_reservoir_status_latest");
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[query] get_reservoir_status_latest failed:", error);
    throw error;
  }
  return (data ?? []) as ReservoirStatusRow[];
}

// ─────────────────────────────────────────────────
// 1b. 單一水庫歷史時序（RPC: get_reservoir_timeseries）
// ─────────────────────────────────────────────────

export interface ReservoirTimeseriesRow {
  snapshot_at: string;
  water_level_m: number | null;
  effective_storage_wan_m3: number | null;
  storage_ratio_pct: number | null;
  inflow_cms: number | null;
  total_outflow_cms: number | null;
  basin_rainfall_mm: number | null;
}

/**
 * 取單一水庫指定區間時序（給 ViewC 1 年蓄水率折線）。
 */
export async function fetchReservoirTimeseries(
  reservoirId: string,
  from: Date,
  to: Date
): Promise<ReservoirTimeseriesRow[]> {
  const { data, error } = await supabase.rpc("get_reservoir_timeseries", {
    p_reservoir_id: reservoirId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[query] get_reservoir_timeseries failed:", error.message);
    return [];
  }
  return (data ?? []) as ReservoirTimeseriesRow[];
}

// ─────────────────────────────────────────────────
// 2. 全國雨量（RPC: get_rain_gauge_latest）
// ─────────────────────────────────────────────────

export interface RainGaugeRow {
  station_id: string;
  station_name: string;
  county: string;        // 中文，須 normalize → id_moi
  town: string;
  lat: number;
  lng: number;
  precipitation_10min: number | null;
  precipitation_1hr: number | null;
  precipitation_3hr: number | null;
  precipitation_6hr: number | null;
  precipitation_12hr: number | null;
  precipitation_24hr: number | null;
  observed_at: string;
}

export async function fetchRainGaugeLatest(): Promise<RainGaugeRow[]> {
  const { data, error } = await supabase.rpc("get_rain_gauge_latest");
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[query] get_rain_gauge_latest failed:", error);
    throw error;
  }
  return (data ?? []) as RainGaugeRow[];
}

// ─────────────────────────────────────────────────
// 3. 聚合：National KPIs
// ─────────────────────────────────────────────────

export interface WaterKpiSummary {
  reservoir_rate_avg: number | null;
  alert_reservoir_count: number;
  rain_24hr_avg: number | null;
  reservoir_count_total: number;
  rain_station_count: number;
  /** 最近一筆 snapshot 時間（取 max of reservoir & rain） */
  updated_at: string | null;
}

export function aggregateWaterKpis(
  reservoirs: ReservoirStatusRow[],
  rainStations: RainGaugeRow[]
): WaterKpiSummary {
  const validReservoirs = reservoirs.filter((r) => r.storage_ratio_pct != null);
  const reservoirRateAvg =
    validReservoirs.length > 0
      ? validReservoirs.reduce((s, r) => s + (r.storage_ratio_pct ?? 0), 0) /
        validReservoirs.length
      : null;

  const alertReservoirCount = reservoirs.filter(
    (r) => r.alert_level === "warning" || r.alert_level === "critical"
  ).length;

  const validRain = rainStations.filter((s) => s.precipitation_24hr != null);
  const rain24hrAvg =
    validRain.length > 0
      ? validRain.reduce((s, r) => s + (r.precipitation_24hr ?? 0), 0) /
        validRain.length
      : null;

  // 取最近時間戳
  const ts: string[] = [];
  for (const r of reservoirs) if (r.snapshot_at) ts.push(r.snapshot_at);
  for (const r of rainStations) if (r.observed_at) ts.push(r.observed_at);
  ts.sort();
  const updatedAt = ts.length > 0 ? ts[ts.length - 1] : null;

  return {
    reservoir_rate_avg: reservoirRateAvg,
    alert_reservoir_count: alertReservoirCount,
    rain_24hr_avg: rain24hrAvg,
    reservoir_count_total: reservoirs.length,
    rain_station_count: rainStations.length,
    updated_at: updatedAt,
  };
}

// ─────────────────────────────────────────────────
// 3b. 淹水高潛勢 % by 縣市（RPC: get_flood_pct_by_county）
// ─────────────────────────────────────────────────

export interface FloodPctRow {
  county_id: string;
  county_name: string;
  pct_of_county: number;
  hazard_km2: number;
}

/**
 * 取指定情境（雨量/時長）的縣市淹水高潛勢面積 %。
 * Phase 0d migration 096 後可用；表不存在時回傳空陣列。
 *
 * @param rainfallMm 雨量情境 (預設 350)
 * @param durationHr 時長 (預設 24)
 */
export async function fetchFloodPctByCounty(
  rainfallMm = 350,
  durationHr = 24
): Promise<FloodPctRow[]> {
  const { data, error } = await supabase.rpc("get_flood_pct_by_county", {
    p_rainfall_mm: rainfallMm,
    p_duration_hr: durationHr,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[query] flood pct not available yet:", error.message);
    return [];
  }
  return (data ?? []) as FloodPctRow[];
}

/**
 * 從 FloodPctRow[] 聚合出全國平均 + by-county lookup
 */
export interface FloodSummary {
  national_avg_pct: number | null;
  by_county_idmoi: Record<string, number>;  // id_moi → pct
}

export function aggregateFloodPct(rows: FloodPctRow[]): FloodSummary {
  if (rows.length === 0) {
    return { national_avg_pct: null, by_county_idmoi: {} };
  }
  const avg = rows.reduce((s, r) => s + r.pct_of_county, 0) / rows.length;
  const by: Record<string, number> = {};
  for (const r of rows) by[r.county_id] = r.pct_of_county;
  return { national_avg_pct: avg, by_county_idmoi: by };
}

// ─────────────────────────────────────────────────
// 4. Region → 中文 + 對應到 PointProfile 的 region 桶
// ─────────────────────────────────────────────────

const REGION_NORMALIZE: Record<string, "north" | "central" | "south" | "east" | "island"> = {
  北: "north", 北部: "north", 北區: "north",
  中: "central", 中部: "central", 中區: "central",
  南: "south", 南部: "south", 南區: "south",
  東: "east", 東部: "east", 東區: "east",
  離島: "island", 外島: "island",
};

/**
 * 把 reservoir RPC 回的 region (中文) 轉成 5 區英文。
 */
export function normalizeReservoirRegion(zh: string | null): "north" | "central" | "south" | "east" | "island" | null {
  if (!zh) return null;
  return REGION_NORMALIZE[zh] ?? null;
}

// ─────────────────────────────────────────────────
// 5. LPCD 縣市 × 年 (Phase 0c-2 ETL 完成後啟用)
//    來源：public.water_usage_yearly (migration 094)
// ─────────────────────────────────────────────────

export interface LpcdRow {
  county_id: string;
  year: number;
  lpcd: number | null;
}

/**
 * 取最新一年 LPCD（每縣市），給 KPI 全國平均 + 22 縣市 explode 用。
 * 表不存在或為空時回傳空陣列（前端 fallback mock）。
 */
export async function fetchLpcdLatest(): Promise<LpcdRow[]> {
  const { data, error } = await supabase
    .from("water_usage_yearly")
    .select("county_id, year, lpcd")
    .order("year", { ascending: false })
    .limit(22);
  if (error) {
    // 表不存在（migration 未 apply）回傳空陣列，不 throw
    // eslint-disable-next-line no-console
    console.warn("[query] LPCD not available yet:", error.code, error.message);
    return [];
  }
  return (data ?? []) as LpcdRow[];
}

/**
 * 取單一縣市 LPCD 歷年（給 ViewB / ViewC 時序圖）。
 */
export async function fetchLpcdHistory(countyId: string): Promise<LpcdRow[]> {
  const { data, error } = await supabase
    .from("water_usage_yearly")
    .select("county_id, year, lpcd")
    .eq("county_id", countyId)
    .order("year", { ascending: true });
  if (error) return [];
  return (data ?? []) as LpcdRow[];
}

/**
 * 取單一縣市接管率歷年。
 */
export async function fetchSewageHistory(countyId: string): Promise<SewageRow[]> {
  const { data, error } = await supabase
    .from("sewage_coverage_yearly")
    .select("county_id, year, coverage_pct")
    .eq("county_id", countyId)
    .order("year", { ascending: true });
  if (error) return [];
  return (data ?? []) as SewageRow[];
}

/**
 * 取全國 LPCD 歷年（22 縣市 avg by year）。給 KPI sparkline + time explode。
 */
export async function fetchLpcdNationalHistory(): Promise<Array<{ year: number; lpcd_avg: number }>> {
  const { data, error } = await supabase
    .from("water_usage_yearly")
    .select("year, lpcd");
  if (error) return [];
  const byYear = new Map<number, number[]>();
  for (const row of (data ?? []) as LpcdRow[]) {
    if (row.lpcd == null) continue;
    const list = byYear.get(row.year) ?? [];
    list.push(row.lpcd);
    byYear.set(row.year, list);
  }
  return Array.from(byYear.entries())
    .map(([year, vs]) => ({ year, lpcd_avg: vs.reduce((s, v) => s + v, 0) / vs.length }))
    .sort((a, b) => a.year - b.year);
}

// ─────────────────────────────────────────────────
// 6. 污水接管率 (Phase 0c-3 ETL 完成後啟用)
//    來源：public.sewage_coverage_yearly (migration 095)
// ─────────────────────────────────────────────────

export interface SewageRow {
  county_id: string;
  year: number;
  coverage_pct: number | null;
}

export async function fetchSewageCoverageLatest(): Promise<SewageRow[]> {
  const { data, error } = await supabase
    .from("sewage_coverage_yearly")
    .select("county_id, year, coverage_pct")
    .order("year", { ascending: false })
    .limit(22);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[query] sewage not available yet:", error.code, error.message);
    return [];
  }
  return (data ?? []) as SewageRow[];
}

/**
 * 全國 LPCD 平均 + 全國接管率 平均（最新一年）
 */
export interface GovernanceSummary {
  lpcd_national_avg: number | null;
  lpcd_year: number | null;
  sewage_national_avg: number | null;
  sewage_year: number | null;
  lpcd_by_county: Record<string, number>; // county_id → lpcd
  sewage_by_county: Record<string, number>;
}

export async function fetchGovernanceSummary(): Promise<GovernanceSummary> {
  const [lpcdLatest, sewageLatest] = await Promise.all([
    fetchLpcdLatest(),
    fetchSewageCoverageLatest(),
  ]);

  // LPCD: 取最新年的所有縣市
  const lpcdYear = lpcdLatest.length > 0 ? Math.max(...lpcdLatest.map((r) => r.year)) : null;
  const lpcdAtYear = lpcdYear ? lpcdLatest.filter((r) => r.year === lpcdYear && r.lpcd != null) : [];
  const lpcdAvg =
    lpcdAtYear.length > 0
      ? lpcdAtYear.reduce((s, r) => s + (r.lpcd ?? 0), 0) / lpcdAtYear.length
      : null;
  const lpcdByCounty = Object.fromEntries(lpcdAtYear.map((r) => [r.county_id, r.lpcd ?? 0]));

  const sewageYear = sewageLatest.length > 0 ? Math.max(...sewageLatest.map((r) => r.year)) : null;
  const sewageAtYear = sewageYear
    ? sewageLatest.filter((r) => r.year === sewageYear && r.coverage_pct != null)
    : [];
  const sewageAvg =
    sewageAtYear.length > 0
      ? sewageAtYear.reduce((s, r) => s + (r.coverage_pct ?? 0), 0) / sewageAtYear.length
      : null;
  const sewageByCounty = Object.fromEntries(
    sewageAtYear.map((r) => [r.county_id, r.coverage_pct ?? 0])
  );

  return {
    lpcd_national_avg: lpcdAvg,
    lpcd_year: lpcdYear,
    sewage_national_avg: sewageAvg,
    sewage_year: sewageYear,
    lpcd_by_county: lpcdByCounty,
    sewage_by_county: sewageByCounty,
  };
}
