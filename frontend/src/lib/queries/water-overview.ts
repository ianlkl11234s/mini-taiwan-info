/**
 * 水主題 ViewA · 全台概覽 6 章敘事 — 新 query 集
 *
 * 對應 components/views/ViewAWater.tsx 章 1-6。
 * 對應後端 migration 098-102（5/15 commit d06ae9f 全 apply）。
 *
 * 設計來源：design bundle handoff `/tmp/water-design/extracted/.../view-a.jsx`
 * 後端 audit：見 _CYCLE_water_viewa.md「Discovery Agent B + mini-audit」
 *
 * Schema 命名差異（規劃 vs 實際）：
 *   - water_supply_penetration（無 _yearly suffix）
 *   - twc_supply_system_monthly
 *   - water_treatment_plants_large
 *   - twc_customer_yearly
 */
import { supabase } from "../supabase";

// ─────────────────────────────────────────────────
// 章 1 · 現況 — 6 stat tiles
// ─────────────────────────────────────────────────

export interface WaterFactRow {
  fact_key: string;
  label: string;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  source: string | null;
}

/**
 * water_facts_official 7 列 metadata（含 26 河川 / 2041 km / 2449 水質測站 / 1306 雨量站）。
 * Schema 不確定時 fallback 空陣列，前端用 hardcode 補。
 */
export async function fetchWaterFacts(): Promise<WaterFactRow[]> {
  const { data, error } = await supabase.from("water_facts_official").select("*");
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] water_facts_official not available:", error.message);
    return [];
  }
  return (data ?? []) as WaterFactRow[];
}

/** 章 1 六個 stat 值。實際讀 facts 表 + reservoirs/rain count 撈整 */
export interface OverviewScale {
  reservoirs_total: number;        // 主要水庫（COUNT）
  central_rivers: number;          // 26 中央管河川（facts）
  central_rivers_km: number;       // 2041 河川總長（facts）
  river_systems: number;           // 116 水系（facts 或 COUNT river_basins）
  water_quality_stations: number;  // 2449 水質測站（facts 或 COUNT）
  rain_gauges: number;             // 1306 雨量站（facts 或 RPC count）
}

/**
 * 從 water_facts_official + fallback default 組出 6 stat。
 * facts 表回得到值就用，回不到就用設計 bundle 的 hardcode（已驗 2026-05-16 跟內政部對齊）。
 */
export function buildScale(facts: WaterFactRow[], reservoirsCount: number, rainStationsCount: number): OverviewScale {
  // 把 facts 轉 key → number lookup
  const byKey = new Map<string, number>();
  for (const f of facts) {
    if (f.value_num != null) byKey.set(f.fact_key, f.value_num);
  }
  const num = (key: string, fallback: number) => byKey.get(key) ?? fallback;
  return {
    reservoirs_total: reservoirsCount > 0 ? reservoirsCount : num("reservoirs_total", 40),
    central_rivers: num("central_rivers_count", 26),
    central_rivers_km: num("central_rivers_total_length_km", 2041),
    river_systems: num("water_systems_count", 116),
    water_quality_stations: num("water_quality_stations_count", 2449),
    rain_gauges: rainStationsCount > 0 ? rainStationsCount : num("rain_gauges_count", 1306),
  };
}

// ─────────────────────────────────────────────────
// 章 3 · 水情燈號（drought_alert_current / _history）
// ─────────────────────────────────────────────────

export interface DroughtAlertRow {
  region_name: string;
  alert_level: string;          // 綠/黃/橙/紅/藍（藍=未發布）
  alert_color: string | null;
  published_date: string | null;
  fetched_at: string | null;
  source_hash: string | null;
}

/** 取當前各區水情燈號 */
export async function fetchDroughtAlertCurrent(): Promise<DroughtAlertRow[]> {
  const { data, error } = await supabase
    .from("drought_alert_current")
    .select("*")
    .order("region_name");
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] drought_alert_current not available:", error.message);
    return [];
  }
  return (data ?? []) as DroughtAlertRow[];
}

/** 取歷史燈號變動（給 5 年 timeline，目前 collector 才上線歷史薄） */
export interface DroughtAlertHistoryRow {
  region_name: string;
  alert_level: string;
  alert_color: string | null;
  published_date: string;
  fetched_at: string;
}

export async function fetchDroughtAlertHistory(limit = 200): Promise<DroughtAlertHistoryRow[]> {
  const { data, error } = await supabase
    .from("drought_alert_history")
    .select("*")
    .order("published_date", { ascending: true })
    .limit(limit);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] drought_alert_history not available:", error.message);
    return [];
  }
  return (data ?? []) as DroughtAlertHistoryRow[];
}

// ─────────────────────────────────────────────────
// 章 4 · 處理 — 自來水基建
// ─────────────────────────────────────────────────

export interface PipelineYearRow {
  year: number;
  pipe_length_km: number | null;
}

export interface CustomerYearRow {
  year: number;
  total_customers: number | null;
}

export interface TreatmentPlantsLargeRow {
  plant_name: string;
  capacity_cmd: number | null;
  county: string | null;
}

export interface MonthlySupplyAggRow {
  year: number;
  month: number;
  total_supply_m3: number;
}

/** 配水管線 10 年 trend（給 S4 flow-step.B sparkline） */
export async function fetchPipelineHistory(): Promise<PipelineYearRow[]> {
  const { data, error } = await supabase
    .from("water_pipe_length_yearly")
    .select("year, pipe_length_km")
    .order("year", { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] water_pipe_length_yearly not available:", error.message);
    return [];
  }
  return (data ?? []) as PipelineYearRow[];
}

/** 用戶數 10 年 trend（給 S4 flow-step.C sparkline） */
export async function fetchCustomerHistory(): Promise<CustomerYearRow[]> {
  const { data, error } = await supabase
    .from("twc_customer_yearly")
    .select("year, total_customers")
    .order("year", { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] twc_customer_yearly not available:", error.message);
    return [];
  }
  return (data ?? []) as CustomerYearRow[];
}

/** 大型淨水場列表（COUNT 用 length，schema: plant_name PK / capacity_cmd / county） */
export async function fetchTreatmentPlantsLarge(): Promise<TreatmentPlantsLargeRow[]> {
  const { data, error } = await supabase
    .from("water_treatment_plants_large")
    .select("plant_name, capacity_cmd, county");
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] water_treatment_plants_large not available:", error.message);
    return [];
  }
  return (data ?? []) as TreatmentPlantsLargeRow[];
}

/** 公共汙水廠 COUNT */
export async function fetchSewagePlantsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("sewage_treatment_plants")
    .select("*", { count: "exact", head: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] sewage_treatment_plants count failed:", error.message);
    return 82; // fallback
  }
  return count ?? 82;
}

/** 最新月全國總供水量（億 m³） */
export interface LatestMonthSupply {
  year: number;
  month: number;
  total_billion_m3: number;
  system_count: number;
}

export async function fetchLatestMonthSupply(): Promise<LatestMonthSupply | null> {
  // 先撈最大年 + 月
  const { data, error } = await supabase
    .from("twc_supply_system_monthly")
    .select("year, month, supply_m3")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(100);
  if (error || !data || data.length === 0) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] twc_supply_system_monthly not available:", error?.message);
    return null;
  }
  const top = data[0];
  const latest = data.filter((r) => r.year === top.year && r.month === top.month);
  const total = latest.reduce((s, r) => s + Number(r.supply_m3 ?? 0), 0);
  return {
    year: top.year,
    month: top.month,
    total_billion_m3: total / 1e8, // m³ → 億 m³
    system_count: latest.length,
  };
}

// ─────────────────────────────────────────────────
// 章 5 · 使用 — 漏水率 + 全國接管率 trend
// ─────────────────────────────────────────────────

export interface WaterLossRateRow {
  year: number;
  loss_pct: number | null;
}

/** 漏水率最新年 + 上一年 delta（water_loss_rate_yearly 本身就是全國表，PK=year） */
export interface WaterLossSummary {
  national_latest: number | null;
  national_year: number | null;
  national_delta_pp: number | null;
}

export async function fetchWaterLossRate(): Promise<WaterLossSummary> {
  const { data, error } = await supabase
    .from("water_loss_rate_yearly")
    .select("year, loss_pct")
    .order("year", { ascending: false })
    .limit(5);
  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] water_loss_rate_yearly not available:", error?.message);
    return { national_latest: null, national_year: null, national_delta_pp: null };
  }
  const rows = (data as WaterLossRateRow[]).filter((r) => r.loss_pct != null);
  if (rows.length === 0) {
    return { national_latest: null, national_year: null, national_delta_pp: null };
  }
  const latest = rows[0];
  const prev = rows.find((r) => r.year === latest.year - 1);
  const delta = prev?.loss_pct != null && latest.loss_pct != null
    ? Number(latest.loss_pct) - Number(prev.loss_pct)
    : null;
  return {
    national_latest: Number(latest.loss_pct),
    national_year: latest.year,
    national_delta_pp: delta,
  };
}

/** 全國接管率歷年 trend（給 S4 KPI sparkline + S5 right column） */
export async function fetchSewageNationalHistory(): Promise<Array<{ year: number; coverage_avg: number }>> {
  const { data, error } = await supabase
    .from("sewage_coverage_yearly")
    .select("year, coverage_pct");
  if (error || !data) return [];
  const byYear = new Map<number, number[]>();
  for (const row of data as { year: number; coverage_pct: number | null }[]) {
    if (row.coverage_pct == null) continue;
    const list = byYear.get(row.year) ?? [];
    list.push(row.coverage_pct);
    byYear.set(row.year, list);
  }
  return Array.from(byYear.entries())
    .map(([year, vs]) => ({ year, coverage_avg: vs.reduce((s, v) => s + v, 0) / vs.length }))
    .sort((a, b) => a.year - b.year);
}

// ─────────────────────────────────────────────────
// 章 6 · 災防 — 滯洪池 / 地層下陷
// ─────────────────────────────────────────────────

export interface DetentionCountyRow {
  county: string | null;       // slug（tainan / kaohsiung / hsinchu_park ...）
  count: number;
  total_vol_m3: number | null;
}

export interface DetentionSummary {
  total_basins: number;
  total_volume_m3: number;
  by_county: DetentionCountyRow[];
  /** 行政縣市（非園區） */
  admin_counties: string[];
  /** 科學園區 */
  parks: string[];
}

const PARK_SLUGS = new Set(["hsinchu_park", "central_park", "south_park"]);

/** 滯洪池：依縣市 group + 區分行政縣市 vs 科學園區 */
export async function fetchDetentionSummary(): Promise<DetentionSummary> {
  const { data, error } = await supabase
    .from("detention_basins")
    .select("county, designed_volume_m3");
  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] detention_basins not available:", error?.message);
    return { total_basins: 0, total_volume_m3: 0, by_county: [], admin_counties: [], parks: [] };
  }
  const rows = data as { county: string | null; designed_volume_m3: number | null }[];
  // Batch3 W-3：designed_volume_m3 在台北/台南/桃園/台中 全 NULL（來源缺設計容量欄，非真 0）。
  // 只 sum 非 NULL；某縣市全 NULL → total_vol_m3 = null（前端顯「—（容量待補）」），座數照常。
  const byCounty = new Map<string, { count: number; vol: number; hasVol: boolean }>();
  for (const r of rows) {
    const key = r.county ?? "(unknown)";
    const cur = byCounty.get(key) ?? { count: 0, vol: 0, hasVol: false };
    cur.count += 1;
    if (r.designed_volume_m3 != null) {
      cur.vol += Number(r.designed_volume_m3);
      cur.hasVol = true;
    }
    byCounty.set(key, cur);
  }
  const list = Array.from(byCounty.entries())
    .map(([county, v]) => ({ county, count: v.count, total_vol_m3: v.hasVol ? v.vol : null }))
    .sort((a, b) => b.count - a.count);
  const adminCounties = list.filter((r) => r.county && !PARK_SLUGS.has(r.county)).map((r) => r.county!);
  const parks = list.filter((r) => r.county && PARK_SLUGS.has(r.county)).map((r) => r.county!);
  return {
    total_basins: rows.length,
    total_volume_m3: list.reduce((s, r) => s + (r.total_vol_m3 ?? 0), 0),
    by_county: list,
    admin_counties: adminCounties,
    parks,
  };
}

export interface SubsidenceCountyRow {
  county: string;     // 中文（雲林縣 / 彰化縣）
  stations: number;
  avg_mm: number | null;
  max_mm: number | null;
}

/**
 * 地層下陷近 2 年平均下沉 top 5 縣市。
 * 用 land_subsidence_stations + readings JOIN，分組計算。
 *
 * 因 PostgREST JOIN 限制，先撈 stations 取得 county → id 對應，再撈 readings AVG（兩階段）。
 * 對 ~104 站、~276k readings：兩個 query OK，但若慢可改 RPC。
 */
export async function fetchSubsidenceTopCounties(limit = 5): Promise<SubsidenceCountyRow[]> {
  // 1. 撈所有站 (id, county)
  const { data: stationsData, error: e1 } = await supabase
    .from("land_subsidence_stations")
    .select("id, county");
  if (e1 || !stationsData) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] land_subsidence_stations not available:", e1?.message);
    return [];
  }
  const stations = stationsData as { id: number | string; county: string | null }[];
  const stationsByCounty = new Map<string, (number | string)[]>();
  for (const s of stations) {
    if (!s.county) continue;
    const list = stationsByCounty.get(s.county) ?? [];
    list.push(s.id);
    stationsByCounty.set(s.county, list);
  }
  // 2. 撈近 2 年 readings，前端 GROUP BY station_id → county
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const { data: readingsData, error: e2 } = await supabase
    .from("land_subsidence_readings")
    .select("station_id, subsidence_mm")
    .gte("observed_at", twoYearsAgo.toISOString())
    .not("subsidence_mm", "is", null)
    .limit(100000);
  if (e2 || !readingsData) {
    // eslint-disable-next-line no-console
    console.warn("[water-overview] land_subsidence_readings not available:", e2?.message);
    return [];
  }
  const stationIdToCounty = new Map<string | number, string>();
  for (const [county, ids] of stationsByCounty) for (const id of ids) stationIdToCounty.set(id, county);
  // 聚合
  const byCounty = new Map<string, { sum: number; n: number; max: number }>();
  for (const r of readingsData as { station_id: number | string; subsidence_mm: number | null }[]) {
    const county = stationIdToCounty.get(r.station_id);
    if (!county || r.subsidence_mm == null) continue;
    const cur = byCounty.get(county) ?? { sum: 0, n: 0, max: -Infinity };
    cur.sum += r.subsidence_mm;
    cur.n += 1;
    if (r.subsidence_mm > cur.max) cur.max = r.subsidence_mm;
    byCounty.set(county, cur);
  }
  const out: SubsidenceCountyRow[] = [];
  for (const [county, v] of byCounty) {
    out.push({
      county,
      stations: stationsByCounty.get(county)?.length ?? 0,
      avg_mm: v.n > 0 ? v.sum / v.n : null,
      max_mm: v.max > -Infinity ? v.max : null,
    });
  }
  out.sort((a, b) => (b.avg_mm ?? 0) - (a.avg_mm ?? 0));
  return out.slice(0, limit);
}

// ─────────────────────────────────────────────────
// 雨水下水道 — by 縣市 count（4 縣市 only：北/中/桃/嘉市）
// ─────────────────────────────────────────────────

/**
 * migration 090 storm_drainage_manholes / _pipes 的 county 欄位是 underscore slug：
 * taipei / taichung / taoyuan / chiayi_city。其他 18 縣市無資料。
 */
const STORM_DRAIN_COUNTY_BY_IDMOI: Record<string, string> = {
  A: "taipei",
  B: "taichung",
  H: "taoyuan",
  I: "chiayi_city",
};

/** 該縣市是否在雨水下水道 dataset 覆蓋內（4 縣 only） */
export function isStormDrainCovered(idMoi: string | null): boolean {
  return !!idMoi && idMoi in STORM_DRAIN_COUNTY_BY_IDMOI;
}

export interface StormDrainCountySummary {
  manholes: number;
  pipes: number;
}

/**
 * 拿單一縣市的雨水下水道 manhole + pipe count。
 * 非涵蓋縣回 null（4 縣外 ds 沒資料，免 fetch）。
 */
export async function fetchStormDrainByCountyIdMoi(
  idMoi: string | null
): Promise<StormDrainCountySummary | null> {
  if (!idMoi) return null;
  const slug = STORM_DRAIN_COUNTY_BY_IDMOI[idMoi];
  if (!slug) return null;
  const [mh, pp] = await Promise.all([
    supabase
      .from("storm_drainage_manholes")
      .select("*", { count: "exact", head: true })
      .eq("county", slug),
    supabase
      .from("storm_drainage_pipes")
      .select("*", { count: "exact", head: true })
      .eq("county", slug),
  ]);
  return {
    manholes: mh.count ?? 0,
    pipes: pp.count ?? 0,
  };
}

// ─────────────────────────────────────────────────
// 滯洪池 — coverage 對映（manifest [A, F, H] + 3 科學園區）
// ─────────────────────────────────────────────────

/** 滯洪池 detention_basins by_county slug ↔ id_moi 對映 */
const DETENTION_SLUG_BY_IDMOI: Record<string, string> = {
  A: "taipei",
  F: "new-taipei",
  H: "taoyuan",
  D: "tainan",
  E: "kaohsiung",
};

/** 該縣市是否在滯洪池 dataset 覆蓋內 */
export function isDetentionCovered(idMoi: string | null): boolean {
  return !!idMoi && idMoi in DETENTION_SLUG_BY_IDMOI;
}

/** 從 DetentionSummary.by_county 找該縣市紀錄（無則回 null） */
export function findDetentionForCounty(
  detention: DetentionSummary | null,
  idMoi: string | null
): { count: number; total_vol_m3: number | null } | null {
  if (!detention || !idMoi) return null;
  const slug = DETENTION_SLUG_BY_IDMOI[idMoi];
  if (!slug) return null;
  const row = detention.by_county.find((r) => r.county === slug);
  if (!row) return null;
  return { count: row.count, total_vol_m3: row.total_vol_m3 };
}
