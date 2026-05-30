/**
 * Rail theme · Supabase queries
 *
 * 對應 themes/rail.yaml KPI。Backend：rail schema 已 exposed，withSchema('rail') 直連。
 *
 * 資料來源：
 *   - rail.stations (503)              — 9 系統靜態車站
 *   - rail.lines (29)                  — 路線（含 county_ids[]）
 *   - rail.station_daily_trips (528)   — 每站日均班次 + 尖峰/離峰 + 24hr 分布 + tra 車種 JSONB
 *   - rail.ridership_by_station (6,847) — 月度站級運量
 *
 * 9 系統色票：tra 深藍 / thsr 橘 / trtc 紅 / krtc 黃 / tymc 紫 / tmrt 天藍 / klrt 綠 / dlrt 青 / aklrt 粉
 * 設計來源：data-rail.js
 */

import { withSchema } from "../supabase";
import { COUNTIES } from "../counties";
import type { CountyCode3, CountyIdMoi } from "../types";

const db = withSchema("rail");

export type RailSystemId =
  | "tra" | "thsr" | "trtc" | "krtc" | "tymc"
  | "tmrt" | "klrt" | "dlrt" | "aklrt";

export interface RailSystemMeta {
  id: RailSystemId;
  label: string;
  short: string;
  color: string;
}

/** 9 系統 metadata（label/short/color SSOT）— 對齊設計檔 data-rail.js */
export const RAIL_SYSTEMS_META: Readonly<Record<RailSystemId, RailSystemMeta>> = Object.freeze({
  tra:   { id: "tra",   label: "臺鐵",     short: "TRA",   color: "#1E3A8A" },
  thsr:  { id: "thsr",  label: "高鐵",     short: "THSR",  color: "#EA580C" },
  trtc:  { id: "trtc",  label: "臺北捷運", short: "TRTC",  color: "#DC2626" },
  krtc:  { id: "krtc",  label: "高雄捷運", short: "KRTC",  color: "#F59E0B" },
  tymc:  { id: "tymc",  label: "桃園捷運", short: "TYMC",  color: "#7C3AED" },
  tmrt:  { id: "tmrt",  label: "臺中捷運", short: "TMRT",  color: "#0EA5E9" },
  klrt:  { id: "klrt",  label: "高雄輕軌", short: "KLRT",  color: "#84CC16" },
  dlrt:  { id: "dlrt",  label: "淡海輕軌", short: "DLRT",  color: "#06B6D4" },
  aklrt: { id: "aklrt", label: "安坑輕軌", short: "AKLRT", color: "#EC4899" },
});

const SYSTEM_IDS = Object.keys(RAIL_SYSTEMS_META) as RailSystemId[];

// ── egress 防護：分頁硬上界（避免上游 row 暴增時無限分頁拉爆 egress）──
// stations ~503 / station_daily_trips ~528 / ridership_by_station ~6,847
const STATIONS_MAX_ROWS = 5_000;
const TRIPS_MAX_ROWS = 5_000;
const RIDERSHIP_MAX_ROWS = 20_000;

// ─────────────────────────────────────────────────
// 1. Raw rows
// ─────────────────────────────────────────────────

export interface StationRow {
  id: number;
  system_id: RailSystemId | string;
  station_id: string;
  name: string;
  name_en: string;
  line: string | null;
  station_class: string | null;
  county_id: CountyIdMoi | null;
  county_name: string | null;
  lng: number;
  lat: number;
  color: string | null;
}

export async function fetchStations(): Promise<StationRow[]> {
  const out: StationRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (from < STATIONS_MAX_ROWS) {
    const to = Math.min(from + pageSize, STATIONS_MAX_ROWS) - 1;
    const { data, error } = await db
      .from("stations")
      .select("id,system_id,station_id,name,name_en,line,station_class,county_id,county_name,lng,lat,color")
      .range(from, to);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[rail] stations failed:", error);
      throw error;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    for (const r of rows) {
      out.push({
        id: Number(r.id),
        system_id: String(r.system_id ?? "") as RailSystemId,
        station_id: String(r.station_id ?? ""),
        name: String(r.name ?? ""),
        name_en: String(r.name_en ?? ""),
        line: r.line == null ? null : String(r.line),
        station_class: r.station_class == null ? null : String(r.station_class),
        county_id: r.county_id == null ? null : (String(r.county_id) as CountyIdMoi),
        county_name: r.county_name == null ? null : String(r.county_name),
        lng: Number(r.lng ?? 0),
        lat: Number(r.lat ?? 0),
        color: r.color == null ? null : String(r.color),
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export interface LineRow {
  system_id: RailSystemId | string;
  line_id: string;
  name_zh: string;
  name_en: string;
  color: string | null;
  station_count: number;
  length_km: number;
  origin_station: string | null;
  destination_station: string | null;
  county_ids: CountyIdMoi[];
}

export async function fetchLines(): Promise<LineRow[]> {
  const { data, error } = await db
    .from("lines")
    .select("system_id,line_id,name_zh,name_en,color,station_count,length_km,origin_station,destination_station,county_ids");
  if (error) {
    console.error("[rail] lines failed:", error);
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    system_id: String(r.system_id ?? "") as RailSystemId,
    line_id: String(r.line_id ?? ""),
    name_zh: String(r.name_zh ?? ""),
    name_en: String(r.name_en ?? ""),
    color: r.color == null ? null : String(r.color),
    station_count: Number(r.station_count ?? 0),
    length_km: Number(r.length_km ?? 0),
    origin_station: r.origin_station == null ? null : String(r.origin_station),
    destination_station: r.destination_station == null ? null : String(r.destination_station),
    county_ids: Array.isArray(r.county_ids) ? (r.county_ids as string[]).map((x) => x as CountyIdMoi) : [],
  }));
}

export interface StationDailyTripsRow {
  system_id: RailSystemId | string;
  station_id: string;
  line_id: string | null;
  daily_stop_count: number;
  peak_count: number;
  offpeak_count: number;
  hourly_distribution: number[] | null;
  by_train_type: Record<string, number> | null;
}

export async function fetchStationDailyTrips(): Promise<StationDailyTripsRow[]> {
  const out: StationDailyTripsRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (from < TRIPS_MAX_ROWS) {
    const to = Math.min(from + pageSize, TRIPS_MAX_ROWS) - 1;
    const { data, error } = await db
      .from("station_daily_trips")
      .select("system_id,station_id,line_id,daily_stop_count,peak_count,offpeak_count,hourly_distribution,by_train_type")
      .range(from, to);
    if (error) {
      console.error("[rail] station_daily_trips failed:", error);
      throw error;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    for (const r of rows) {
      out.push({
        system_id: String(r.system_id ?? "") as RailSystemId,
        station_id: String(r.station_id ?? ""),
        line_id: r.line_id == null ? null : String(r.line_id),
        daily_stop_count: Number(r.daily_stop_count ?? 0),
        peak_count: Number(r.peak_count ?? 0),
        offpeak_count: Number(r.offpeak_count ?? 0),
        hourly_distribution: Array.isArray(r.hourly_distribution)
          ? (r.hourly_distribution as number[]).map((x) => Number(x))
          : null,
        by_train_type:
          r.by_train_type && typeof r.by_train_type === "object"
            ? (r.by_train_type as Record<string, number>)
            : null,
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export interface RidershipRow {
  system_id: RailSystemId | string;
  station_id: string | null;
  station_name: string;
  county_id: CountyIdMoi | null;
  stat_period: string;             // e.g. "2026-01" or "2024"
  period_type: string;
  ridership_total: number;
}

export async function fetchRidership(): Promise<RidershipRow[]> {
  const out: RidershipRow[] = [];
  // PostgREST 預設 max-rows = 1000，超過會被截斷 → 用 1000 分頁穩妥
  const pageSize = 1000;
  let from = 0;
  while (from < RIDERSHIP_MAX_ROWS) {
    const to = Math.min(from + pageSize, RIDERSHIP_MAX_ROWS) - 1;
    const { data, error } = await db
      .from("ridership_by_station")
      .select("system_id,station_id,station_name,county_id,stat_period,period_type,ridership_total")
      // 降冪：RIDERSHIP_MAX_ROWS 硬上界截斷時保留「最新期」，避免 consumer（2026 月度 / 2024 年度）資料被砍
      .order("stat_period", { ascending: false })
      .range(from, to);
    if (error) {
      console.error("[rail] ridership_by_station failed:", error);
      throw error;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    for (const r of rows) {
      out.push({
        system_id: String(r.system_id ?? "") as RailSystemId,
        station_id: r.station_id == null ? null : String(r.station_id),
        station_name: String(r.station_name ?? ""),
        county_id: r.county_id == null ? null : (String(r.county_id) as CountyIdMoi),
        stat_period: String(r.stat_period ?? ""),
        period_type: String(r.period_type ?? ""),
        ridership_total: Number(r.ridership_total ?? 0),
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

// ─────────────────────────────────────────────────
// 2. Derived 型別
// ─────────────────────────────────────────────────

export interface RailSystemDerived extends RailSystemMeta {
  stations: number;
  lines: number;
  km: number;
  ridership24: number | null;   // 億人次
  note?: string;
}

export interface RailNationalSummary {
  stations: number;
  lines: number;
  kmTotal: number;
  dailyTrips: number;
  peakTrips: number;
  offpeakTrips: number;
  peakRatio: number;             // 尖峰/離峰
  ridership24: number;           // 億人次
  trtcShare: number;             // %
  zeroStationCounties: CountyIdMoi[];
}

export interface TopStationRow {
  name: string;
  system: RailSystemId | string;
  county: CountyIdMoi | null;
  trips: number;
  peak: number;
  offpeak: number;
  note?: string;
}

export interface TRABreakdownRow {
  id: string;
  label: string;
  pct: number;
  trips: number;
  color: string;
}

export interface MonthlyRow {
  ym: string;            // "26-01"
  value: number;         // 百萬人次
  partial?: boolean;
}

export interface CountyRailAggregate {
  code3: CountyCode3;
  id_moi: CountyIdMoi;
  name: string;
  stations: number;
  lines: number;
  km: number;
  dailyTrips: number;
  ridership24: number;          // 億人次
  systems: RailSystemId[];
}

// ─────────────────────────────────────────────────
// 3. Derive functions
// ─────────────────────────────────────────────────

/** 9 系統明細 stat（站數 / 線數 / km / 2024 運量） */
export function deriveSystems(
  stations: StationRow[],
  lines: LineRow[],
  ridership: RidershipRow[],
): RailSystemDerived[] {
  return SYSTEM_IDS.map((id) => {
    const meta = RAIL_SYSTEMS_META[id];
    const stCount = stations.filter((s) => s.system_id === id).length;
    const sysLines = lines.filter((l) => l.system_id === id);
    const km = sysLines.reduce((s, l) => s + l.length_km, 0);
    // 2024 年運量：找 stat_period 含 "2024" 或 period_type=year + period_type 包含 24
    const sysRid = ridership.filter((r) => r.system_id === id);
    const yearRows = sysRid.filter(
      (r) => r.period_type === "yearly" || r.period_type === "year" || /^\d{4}$/.test(r.stat_period),
    );
    let total24 = 0;
    if (yearRows.length > 0) {
      const r24 = yearRows.filter((r) => r.stat_period === "2024");
      total24 = r24.reduce((s, x) => s + x.ridership_total, 0);
    }
    // fallback: 加總 2026 月度
    if (total24 === 0) {
      const monthly = sysRid.filter(
        (r) => /^\d{4}-\d{2}$/.test(r.stat_period) && r.stat_period.startsWith("2024"),
      );
      total24 = monthly.reduce((s, x) => s + x.ridership_total, 0);
    }
    return {
      ...meta,
      stations: stCount,
      lines: sysLines.length,
      km: Number(km.toFixed(2)),
      ridership24: total24 > 0 ? Number((total24 / 1e8).toFixed(2)) : null,
    };
  });
}

/** 全國 KPI 加總 */
export function deriveRailSummary(
  systems: RailSystemDerived[],
  trips: StationDailyTripsRow[],
  stations: StationRow[],
): RailNationalSummary {
  const totalStations = stations.length;
  const totalLines = systems.reduce((s, x) => s + x.lines, 0);
  const kmTotal = systems.reduce((s, x) => s + x.km, 0);
  const dailyTrips = trips.reduce((s, t) => s + t.daily_stop_count, 0);
  const peakTrips = trips.reduce((s, t) => s + t.peak_count, 0);
  const offpeakTrips = trips.reduce((s, t) => s + t.offpeak_count, 0);
  const peakRatio = offpeakTrips > 0 ? peakTrips / offpeakTrips : 0;
  const ridership24Total = systems.reduce((s, x) => s + (x.ridership24 ?? 0), 0);
  const trtcSys = systems.find((s) => s.id === "trtc");
  const trtcShare =
    trtcSys && trtcSys.ridership24 != null && ridership24Total > 0
      ? Math.round((trtcSys.ridership24 / ridership24Total) * 100)
      : 0;

  // 22 縣市車站數，0 站者
  const countyStationCount = new Map<CountyIdMoi, number>();
  for (const s of stations) {
    if (!s.county_id) continue;
    countyStationCount.set(s.county_id, (countyStationCount.get(s.county_id) ?? 0) + 1);
  }
  const zeroCounties = COUNTIES.filter(
    (c) => (countyStationCount.get(c.id_moi) ?? 0) === 0,
  ).map((c) => c.id_moi);

  return {
    stations: totalStations,
    lines: totalLines,
    kmTotal: Number(kmTotal.toFixed(2)),
    dailyTrips,
    peakTrips,
    offpeakTrips,
    peakRatio: Number(peakRatio.toFixed(2)),
    ridership24: Number(ridership24Total.toFixed(2)),
    trtcShare,
    zeroStationCounties: zeroCounties,
  };
}

/**
 * 24 小時逐時班次 — 從 station_daily_trips 的 hourly_distribution 加總
 * systemFilter：限定系統（group.systems）→ 該分類自己的時段分布形狀（非全國縮放）。
 * null/undefined = 全系統。
 */
export function deriveHourlyProfile(
  trips: StationDailyTripsRow[],
  systemFilter?: RailSystemId[] | null,
): Array<{ x: number; label: string; value: number }> {
  const sysSet = systemFilter ? new Set(systemFilter) : null;
  const buckets = new Array(24).fill(0);
  for (const t of trips) {
    if (sysSet && !sysSet.has(t.system_id as RailSystemId)) continue;
    if (!t.hourly_distribution || t.hourly_distribution.length !== 24) continue;
    for (let h = 0; h < 24; h++) buckets[h] += t.hourly_distribution[h];
  }
  return buckets.map((v, h) => ({
    x: h,
    label: h % 4 === 0 ? `${h}:00` : "",
    value: v,
  }));
}

/** 臺鐵車種佔比（從 by_train_type JSONB reduce） */
export function deriveTRABreakdown(trips: StationDailyTripsRow[]): TRABreakdownRow[] {
  // 只挑 system_id = 'tra' 的
  const traTrips = trips.filter((t) => t.system_id === "tra");
  const sum: Record<string, number> = {};
  for (const t of traTrips) {
    if (!t.by_train_type) continue;
    for (const [code, n] of Object.entries(t.by_train_type)) {
      sum[code] = (sum[code] ?? 0) + Number(n);
    }
  }
  const total = Object.values(sum).reduce((s, v) => s + v, 0);
  const meta: Record<string, { label: string; color: string }> = {
    LC:      { label: "區間車",    color: "#1E3A8A" },
    CK:      { label: "莒光",      color: "#3B82F6" },
    TC:      { label: "自強",      color: "#60A5FA" },
    "TC-PP": { label: "自強 (PP)", color: "#93C5FD" },
    PP:      { label: "其他 PP",   color: "#BFDBFE" },
    TZ:      { label: "推拉",      color: "#DBEAFE" },
    CG:      { label: "復興",      color: "#94A3B8" },
  };
  const out: TRABreakdownRow[] = Object.entries(sum)
    .map(([id, trips]) => ({
      id,
      label: meta[id]?.label ?? id,
      pct: total > 0 ? Number(((trips / total) * 100).toFixed(1)) : 0,
      trips,
      color: meta[id]?.color ?? "#94A3B8",
    }))
    .sort((a, b) => b.trips - a.trips);
  return out;
}

/**
 * 貓纜回填占位辨識：trtc 的 line_id='MK'（動物園站/動物園南站/指南宮站/貓空站，各寫死 962）。
 * 962 = 兩方向各 481 班次靜態快照，非真實停靠車次，且占全國 daily_stop_count TOP1-4，
 * 混進「大車站車次排名」會把 4 個真實大站擠出榜外並誤導。故排除。
 * ⚠ 用 line_id='MK' 精準辨識，不用站名 — 文湖線真實「動物園」(BR01) 名稱近似但 line_id='BR'，不可誤殺。
 */
function isCableBackfill(t: StationDailyTripsRow): boolean {
  return t.system_id === "trtc" && t.line_id === "MK";
}

/**
 * Top N 大站（依 daily_stop_count）
 * systemFilter：限定系統（group.systems）→ 切高鐵只出高鐵站。null/undefined = 全系統。
 * 一律排除貓纜回填占位站（見 isCableBackfill）。
 */
export function deriveTopStations(
  trips: StationDailyTripsRow[],
  stations: StationRow[],
  systemFilter?: RailSystemId[] | null,
  limit = 10,
): TopStationRow[] {
  const sysSet = systemFilter ? new Set(systemFilter) : null;
  // station_id × system_id 對應到 stations
  const stMap = new Map<string, StationRow>();
  for (const s of stations) {
    stMap.set(`${s.system_id}|${s.station_id}`, s);
  }
  return trips
    .filter((t) => (!sysSet || sysSet.has(t.system_id as RailSystemId)) && !isCableBackfill(t))
    .sort((a, b) => b.daily_stop_count - a.daily_stop_count)
    .slice(0, limit)
    .map((t) => {
      const st = stMap.get(`${t.system_id}|${t.station_id}`);
      const note = st?.name === "臺北車站" && t.system_id === "trtc"
        ? "板南+淡水信義 雙線"
        : undefined;
      return {
        name: st?.name ?? t.station_id,
        system: t.system_id,
        county: st?.county_id ?? null,
        trips: t.daily_stop_count,
        peak: t.peak_count,
        offpeak: t.offpeak_count,
        note,
      };
    });
}

/** 臺鐵 2026 月度運量（從 ridership_by_station 取 system=tra + stat_period like '2026-01'） */
export function deriveTRAMonthly(ridership: RidershipRow[]): MonthlyRow[] {
  const tra26 = ridership.filter(
    (r) => r.system_id === "tra" && /^2026-\d{2}$/.test(r.stat_period),
  );
  // 對 stat_period 加總
  const monthly = new Map<string, number>();
  for (const r of tra26) {
    monthly.set(r.stat_period, (monthly.get(r.stat_period) ?? 0) + r.ridership_total);
  }
  const months = Array.from(monthly.entries()).sort();
  // 找最後一個月 partial 判斷：< 上月 50%
  const out: MonthlyRow[] = months.map(([ym, total], i, arr) => {
    const prev = i > 0 ? arr[i - 1][1] : null;
    const partial = prev != null && total < prev * 0.3;
    return {
      ym: ym.replace(/^20/, ""),       // "2026-01" → "26-01"
      value: Number((total / 1e6).toFixed(1)),
      partial,
    };
  });
  return out;
}

/** 22 縣市軌道聚合 */
export function deriveCountyAggregates(
  stations: StationRow[],
  trips: StationDailyTripsRow[],
  ridership: RidershipRow[],
  lines: LineRow[],
): CountyRailAggregate[] {
  // 22 縣市 stations + system 集合
  const stByCounty = new Map<CountyIdMoi, StationRow[]>();
  for (const s of stations) {
    if (!s.county_id) continue;
    const arr = stByCounty.get(s.county_id) ?? [];
    arr.push(s);
    stByCounty.set(s.county_id, arr);
  }

  // trips index by station
  const tripMap = new Map<string, number>();
  for (const t of trips) {
    tripMap.set(`${t.system_id}|${t.station_id}`, t.daily_stop_count);
  }

  // 縣市運量加總（2024）
  const ridCounty = new Map<CountyIdMoi, number>();
  for (const r of ridership) {
    if (!r.county_id) continue;
    if (!/2024/.test(r.stat_period)) continue;
    ridCounty.set(r.county_id, (ridCounty.get(r.county_id) ?? 0) + r.ridership_total);
  }

  return COUNTIES.map((c) => {
    const cStations = stByCounty.get(c.id_moi) ?? [];
    const systems = Array.from(new Set(cStations.map((s) => s.system_id))) as RailSystemId[];
    const cLines = lines.filter((l) => l.county_ids.includes(c.id_moi));
    const km = cLines.reduce((s, l) => s + l.length_km, 0);
    const dailyTrips = cStations.reduce(
      (s, st) => s + (tripMap.get(`${st.system_id}|${st.station_id}`) ?? 0),
      0,
    );
    const rid = ridCounty.get(c.id_moi) ?? 0;
    return {
      code3: c.code3,
      id_moi: c.id_moi,
      name: c.name_zh,
      stations: cStations.length,
      lines: cLines.length,
      km: Number(km.toFixed(1)),
      dailyTrips,
      ridership24: Number((rid / 1e8).toFixed(2)),
      systems,
    };
  });
}

export interface CountySystemTripsRow {
  id: RailSystemId;
  label: string;
  short: string;
  color: string;
  stations: number;
  trips: number;          // 日均停靠車次（daily_stop_count 加總）
}

/**
 * 指定縣市 × 各系統的車站數 + 日均停靠車次（real）
 * stations(county_id) join station_daily_trips(system_id|station_id)，按 system 聚合。
 * 各系統 trips 加總 = deriveCountyAggregates 的 dailyTrips（同一 tripMap join，內部一致）。
 */
export function deriveCountySystemTrips(
  countyIdMoi: CountyIdMoi,
  stations: StationRow[],
  trips: StationDailyTripsRow[],
): CountySystemTripsRow[] {
  const tripMap = new Map<string, number>();
  for (const t of trips) tripMap.set(`${t.system_id}|${t.station_id}`, t.daily_stop_count);

  const bySystem = new Map<RailSystemId, { stations: number; trips: number }>();
  for (const s of stations) {
    if (s.county_id !== countyIdMoi) continue;
    const sid = s.system_id as RailSystemId;
    if (!RAIL_SYSTEMS_META[sid]) continue;
    const cur = bySystem.get(sid) ?? { stations: 0, trips: 0 };
    cur.stations += 1;
    cur.trips += tripMap.get(`${sid}|${s.station_id}`) ?? 0;
    bySystem.set(sid, cur);
  }

  return Array.from(bySystem.entries())
    .map(([sid, v]) => {
      const meta = RAIL_SYSTEMS_META[sid];
      return { id: sid, label: meta.label, short: meta.short, color: meta.color, stations: v.stations, trips: v.trips };
    })
    .sort((a, b) => b.trips - a.trips);
}

// ─────────────────────────────────────────────────
// 系統分類（tab 切換用）
// ─────────────────────────────────────────────────

export interface RailGroup {
  id: "all" | "tra" | "thsr" | "metro";
  label: string;
  short: string;
  systems: RailSystemId[] | null; // null = 全部
}

export const RAIL_GROUPS: RailGroup[] = [
  { id: "all",   label: "全部",      short: "全部",  systems: null },
  { id: "tra",   label: "台鐵",      short: "TRA",   systems: ["tra"] },
  { id: "thsr",  label: "高鐵",      short: "THSR",  systems: ["thsr"] },
  { id: "metro", label: "捷運+輕軌", short: "捷運",  systems: ["trtc", "krtc", "tymc", "tmrt", "klrt", "dlrt", "aklrt"] },
];

/** 依系統分類，回傳各縣市車站數排名（value>0，由多到少） */
export function railGroupCountyRank(
  systems: RailSystemId[] | null,
  stations: StationRow[],
  countyAggregates: CountyRailAggregate[],
): Array<{ code: string; name: string; value: number }> {
  if (!systems) {
    return countyAggregates
      .map((c) => ({ code: c.code3, name: c.name, value: c.stations }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }
  const sysSet = new Set(systems);
  // 計算每縣市在指定系統的車站數
  const byCounty = new Map<CountyIdMoi, number>();
  for (const s of stations) {
    if (!s.county_id || !sysSet.has(s.system_id as RailSystemId)) continue;
    byCounty.set(s.county_id, (byCounty.get(s.county_id) ?? 0) + 1);
  }
  return countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: byCounty.get(c.id_moi) ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** 依系統分類，回傳各系統每日停靠車次（含色票，由多到少） */
export function railGroupSysTrips(
  systems: RailSystemId[] | null,
  trips: StationDailyTripsRow[],
  systemsMeta: RailSystemDerived[],
): Array<{ id: string; label: string; short: string; color: string; trips: number }> {
  const sysSet = systems ? new Set(systems) : null;
  const bySystem = new Map<string, number>();
  for (const t of trips) {
    if (sysSet && !sysSet.has(t.system_id as RailSystemId)) continue;
    bySystem.set(t.system_id, (bySystem.get(t.system_id) ?? 0) + t.daily_stop_count);
  }
  return Array.from(bySystem.entries())
    .map(([id, tripCount]) => {
      const meta = systemsMeta.find((s) => s.id === id);
      return {
        id,
        label: meta?.label ?? id,
        short: meta?.short ?? id,
        color: meta?.color ?? "#4F46E5",
        trips: tripCount,
      };
    })
    .filter((s) => s.trips > 0)
    .sort((a, b) => b.trips - a.trips);
}
