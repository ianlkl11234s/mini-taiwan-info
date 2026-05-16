/**
 * Fire / Public Safety theme — Supabase queries
 *
 * 對應 themes/fire.yaml 內 KPI 的 `query` 欄位。
 * Backend schema: gis-platform/migrations/099_fire_schema.sql
 *
 * 真實資料端點：
 *   - RPC `fire.aggregate_fire_count(year, county, cause_5)` — 全國 / 縣市 / 大類 加總
 *   - RPC `fire.list_incidents(...)`               — 個案明細（地圖點位用）
 *   - MV  `fire.incidents_by_county_year`          — 22 縣市 × 年（含死傷 / 反應時間）
 *   - MV  `fire.incidents_by_cause_year`           — 5 大類 + 22 細項 × 年
 *   - MV  `fire.incidents_by_hour_month`           — 24h × 12 月 × 22 縣市
 *   - MV  `fire.incidents_by_day_of_year`          — 365 點 × 年 × 縣市
 *   - Table `fire.cause_taxonomy`                   — 22 → 5 大類 mapping + severity
 *
 * 民國年 → 西元：minguo + 1911（113 = 2024）
 */

import { supabase } from "../supabase";

// Fire schema 不在 PostgREST 預設 exposed list；改用 public.fire_* wrapper views/RPCs
// （見 gis-platform/migrations/104_fire_public_wrappers.sql）
const db = supabase;

// ─────────────────────────────────────────────────
// 0. 共用型別
// ─────────────────────────────────────────────────

/** 起火原因嚴重度：high (高致死率) / med / low / unknown */
export type FireSeverity = "high" | "med" | "low" | "unknown";

/** 5 大類起火原因 id（對齊 fire.cause_taxonomy.cause_5_id） */
export type Cause5Id = "intentional" | "chemical" | "electrical" | "careless" | "other";

// ─────────────────────────────────────────────────
// 1. 22 → 5 大類 taxonomy
// ─────────────────────────────────────────────────

export interface CauseTaxonomyRow {
  cause_22_id: string;       // "01" ~ "21", "99"
  cause_22_name: string;
  cause_5_id: Cause5Id;
  cause_5_name: string;
  severity_signal: "high" | "med" | "low";
  note: string | null;
}

export async function fetchCauseTaxonomy(): Promise<CauseTaxonomyRow[]> {
  const { data, error } = await db
    .from("fire_cause_taxonomy")
    .select("*")
    .order("cause_22_id");
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[fire] cause_taxonomy failed:", error);
    throw error;
  }
  return (data ?? []) as CauseTaxonomyRow[];
}

// ─────────────────────────────────────────────────
// 2. 縣市 × 年 彙整（核心 MV）
// ─────────────────────────────────────────────────

export interface IncidentsByCountyYearRow {
  county_id: string;         // id_moi (A/B/...)
  data_year_minguo: number;  // 111-113
  incident_count: number;
  total_deaths: number;
  total_injuries: number;
  total_casualty: number;
  avg_response_minutes: number | null;
}

export async function fetchIncidentsByCountyYear(): Promise<IncidentsByCountyYearRow[]> {
  const { data, error } = await db
    .from("fire_incidents_by_county_year")
    .select("*");
  if (error) {
    console.error("[fire] incidents_by_county_year failed:", error);
    throw error;
  }
  // pg bigint → string via supabase-js；強制轉 number
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    county_id: String(r.county_id),
    data_year_minguo: Number(r.data_year_minguo),
    incident_count: Number(r.incident_count),
    total_deaths: Number(r.total_deaths),
    total_injuries: Number(r.total_injuries),
    total_casualty: Number(r.total_casualty),
    avg_response_minutes:
      r.avg_response_minutes == null ? null : Number(r.avg_response_minutes),
  }));
}

// ─────────────────────────────────────────────────
// 3. 5 大類 / 22 細項 × 年
// ─────────────────────────────────────────────────

export interface IncidentsByCauseYearRow {
  data_year_minguo: number;
  cause_5_id: Cause5Id;
  cause_5_name: string;
  cause_22_id: string;
  cause_22_name: string;
  incident_count: number;
  total_deaths: number;
  total_injuries: number;
}

export async function fetchIncidentsByCauseYear(): Promise<IncidentsByCauseYearRow[]> {
  const { data, error } = await db
    .from("fire_incidents_by_cause_year")
    .select("*");
  if (error) {
    console.error("[fire] incidents_by_cause_year failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    data_year_minguo: Number(r.data_year_minguo),
    cause_5_id: String(r.cause_5_id) as Cause5Id,
    cause_5_name: String(r.cause_5_name),
    cause_22_id: String(r.cause_22_id),
    cause_22_name: String(r.cause_22_name),
    incident_count: Number(r.incident_count),
    total_deaths: Number(r.total_deaths),
    total_injuries: Number(r.total_injuries),
  }));
}

// ─────────────────────────────────────────────────
// 4. 24h × 12 月 熱力（時段分析用）
// ─────────────────────────────────────────────────

export interface IncidentsByHourMonthRow {
  county_id: string;
  month: number;        // 1-12
  hour: number;         // 0-23
  incident_count: number;
}

export async function fetchIncidentsByHourMonth(): Promise<IncidentsByHourMonthRow[]> {
  const { data, error } = await db
    .from("fire_incidents_by_hour_month")
    .select("*");
  if (error) {
    console.error("[fire] incidents_by_hour_month failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    county_id: String(r.county_id),
    month: Number(r.month),
    hour: Number(r.hour),
    incident_count: Number(r.incident_count),
  }));
}

// ─────────────────────────────────────────────────
// 4b. 縣市 × 年 × 5+22 起火原因（B046 ViewB 用）
// ─────────────────────────────────────────────────
// Backend: migration 105_fire_incidents_by_county_cause_year.sql
// 跟 4 的 IncidentsByCauseYearRow 只差一個 county_id 維度

export interface IncidentsByCountyCauseYearRow {
  county_id: string;          // id_moi
  data_year_minguo: number;
  cause_5_id: Cause5Id | null;
  cause_5_name: string | null;
  cause_22_id: string | null;
  cause_22_name: string | null;
  incident_count: number;
  total_deaths: number;
  total_injuries: number;
}

export async function fetchIncidentsByCountyCauseYear(): Promise<IncidentsByCountyCauseYearRow[]> {
  const { data, error } = await db
    .from("fire_incidents_by_county_cause_year")
    .select("*");
  if (error) {
    console.error("[fire] incidents_by_county_cause_year failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    county_id: String(r.county_id),
    data_year_minguo: Number(r.data_year_minguo),
    cause_5_id: r.cause_5_id == null ? null : (String(r.cause_5_id) as Cause5Id),
    cause_5_name: r.cause_5_name == null ? null : String(r.cause_5_name),
    cause_22_id: r.cause_22_id == null ? null : String(r.cause_22_id),
    cause_22_name: r.cause_22_name == null ? null : String(r.cause_22_name),
    incident_count: Number(r.incident_count),
    total_deaths: Number(r.total_deaths),
    total_injuries: Number(r.total_injuries),
  }));
}

// ─────────────────────────────────────────────────
// 5. 365 點折線（day scale 用）
// ─────────────────────────────────────────────────

export interface IncidentsByDayOfYearRow {
  county_id: string;
  data_year_minguo: number;
  month: number;
  day: number;
  incident_count: number;
  deaths: number;
  injuries: number;
}

export async function fetchIncidentsByDayOfYear(
  yearMinguo?: number
): Promise<IncidentsByDayOfYearRow[]> {
  let q = db.from("fire_incidents_by_day_of_year").select("*");
  if (yearMinguo != null) {
    q = q.eq("data_year_minguo", yearMinguo);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[fire] incidents_by_day_of_year failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    county_id: String(r.county_id),
    data_year_minguo: Number(r.data_year_minguo),
    month: Number(r.month),
    day: Number(r.day),
    incident_count: Number(r.incident_count),
    deaths: Number(r.deaths),
    injuries: Number(r.injuries),
  }));
}

// ─────────────────────────────────────────────────
// 6. RPC aggregate_fire_count
// ─────────────────────────────────────────────────

export interface FireAggregateRow {
  total_count: number;
  total_deaths: number;
  total_injury: number;
  latest_year: number;
}

/**
 * 全國 / 縣市 / 大類 加總（RPC）
 * @param year - 民國年（如 113）；null = 全部
 * @param county - id_moi（'A'/'B'/...）；null = 全國
 * @param cause5 - 'electrical' | 'intentional' | ...；null = 全部
 */
export async function aggregateFireCount(
  year: number | null = null,
  county: string | null = null,
  cause5: Cause5Id | null = null
): Promise<FireAggregateRow | null> {
  const { data, error } = await db.rpc("fire_aggregate_count", {
    p_year: year,
    p_county: county,
    p_cause_5: cause5,
  });
  if (error) {
    console.error("[fire] aggregate_fire_count failed:", error);
    throw error;
  }
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    total_count: Number(r.total_count),
    total_deaths: Number(r.total_deaths),
    total_injury: Number(r.total_injury),
    latest_year: Number(r.latest_year),
  };
}

// ─────────────────────────────────────────────────
// 7. 個案明細 RPC list_incidents（地圖點位 / 熱點圖用）
// ─────────────────────────────────────────────────

export interface IncidentRow {
  case_no: string;
  county_id: string;
  district: string | null;
  reported_at: string;        // ISO
  cause_22_id: string | null;
  cause_5_id: Cause5Id | null;
  deaths: number;
  injuries: number;
  lat: number | null;
  lng: number | null;
  precision_level: string | null;
}

export async function listIncidents(opts: {
  county?: string | null;
  yearMin?: number;
  yearMax?: number;
  cause5?: Cause5Id | null;
  limit?: number;
} = {}): Promise<IncidentRow[]> {
  const { data, error } = await db.rpc("fire_list_incidents", {
    p_county: opts.county ?? null,
    p_year_min: opts.yearMin ?? null,
    p_year_max: opts.yearMax ?? null,
    p_cause_5: opts.cause5 ?? null,
    p_limit: opts.limit ?? 2000,
  });
  if (error) {
    console.error("[fire] list_incidents failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    case_no: String(r.case_no),
    county_id: String(r.county_id),
    district: r.district == null ? null : String(r.district),
    reported_at: String(r.reported_at),
    cause_22_id: r.cause_22_id == null ? null : String(r.cause_22_id),
    cause_5_id: r.cause_5_id == null ? null : (String(r.cause_5_id) as Cause5Id),
    deaths: Number(r.deaths ?? 0),
    injuries: Number(r.injuries ?? 0),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    precision_level: r.precision_level == null ? null : String(r.precision_level),
  }));
}

// ─────────────────────────────────────────────────
// 8. 高階聚合 helpers（前端 hook 用）
// ─────────────────────────────────────────────────

export interface FireNationalSummary {
  /** 最新年（民國）的全國件數 */
  yearly_incidents: number;
  /** 同年總死亡 */
  total_deaths: number;
  /** 同年總受傷 */
  total_injuries: number;
  /** 跟去年比的 % 變動（incidents） */
  incidents_delta_pct: number | null;
  /** 死亡較去年的絕對差 */
  deaths_delta: number | null;
  /** 受傷較去年的絕對差 */
  injuries_delta: number | null;
  /** 主因 5 大類（用件數，最新年） */
  top_cause_5_id: Cause5Id | null;
  top_cause_5_name: string | null;
  top_cause_5_pct: number | null;
  /** 最新年（資料時間） */
  latest_year_minguo: number;
}

/**
 * 從 MV 算 national summary。傳入 by_county_year + by_cause_year。
 */
export function deriveNationalSummary(
  countyYear: IncidentsByCountyYearRow[],
  causeYear: IncidentsByCauseYearRow[]
): FireNationalSummary | null {
  if (!countyYear.length) return null;

  // 找最新年
  const years = [...new Set(countyYear.map((r) => r.data_year_minguo))].sort(
    (a, b) => b - a
  );
  const latest = years[0];
  const prev = years.find((y) => y < latest) ?? null;

  const sumYear = (y: number) =>
    countyYear
      .filter((r) => r.data_year_minguo === y)
      .reduce(
        (acc, r) => ({
          inc: acc.inc + r.incident_count,
          d: acc.d + r.total_deaths,
          i: acc.i + r.total_injuries,
        }),
        { inc: 0, d: 0, i: 0 }
      );

  const cur = sumYear(latest);
  const prv = prev == null ? null : sumYear(prev);

  // 主因 5 大類（最新年，cause_22_id 不重複加，sum by cause_5_id）
  const causeMap = new Map<string, { id: Cause5Id; name: string; count: number }>();
  for (const r of causeYear) {
    if (r.data_year_minguo !== latest) continue;
    const prev2 = causeMap.get(r.cause_5_id);
    if (prev2) {
      prev2.count += r.incident_count;
    } else {
      causeMap.set(r.cause_5_id, {
        id: r.cause_5_id,
        name: r.cause_5_name,
        count: r.incident_count,
      });
    }
  }
  const sortedCauses = [...causeMap.values()].sort((a, b) => b.count - a.count);
  const top = sortedCauses[0] ?? null;
  const totalCauses = sortedCauses.reduce((s, c) => s + c.count, 0);

  return {
    yearly_incidents: cur.inc,
    total_deaths: cur.d,
    total_injuries: cur.i,
    incidents_delta_pct:
      prv && prv.inc > 0 ? ((cur.inc - prv.inc) / prv.inc) * 100 : null,
    deaths_delta: prv ? cur.d - prv.d : null,
    injuries_delta: prv ? cur.i - prv.i : null,
    top_cause_5_id: top?.id ?? null,
    top_cause_5_name: top?.name ?? null,
    top_cause_5_pct:
      top && totalCauses > 0 ? (top.count / totalCauses) * 100 : null,
    latest_year_minguo: latest,
  };
}

export interface FireCountyAggregate {
  county_id: string;          // id_moi
  incidents: number;          // latest year
  deaths: number;
  injuries: number;
  /** 火災密度 件/萬人，需縣市人口 join */
  density_per_wan?: number;
  /** 致死率 (deaths / incidents * 1000) */
  death_per_thousand?: number;
  avg_response_minutes: number | null;
}

/**
 * 由 by_county_year 取最新年產出 22 縣市 aggregate
 */
export function deriveCountyAggregates(
  countyYear: IncidentsByCountyYearRow[]
): FireCountyAggregate[] {
  if (!countyYear.length) return [];
  const latest = Math.max(...countyYear.map((r) => r.data_year_minguo));
  return countyYear
    .filter((r) => r.data_year_minguo === latest)
    .map((r) => ({
      county_id: r.county_id,
      incidents: r.incident_count,
      deaths: r.total_deaths,
      injuries: r.total_injuries,
      death_per_thousand:
        r.incident_count > 0 ? (r.total_deaths / r.incident_count) * 1000 : 0,
      avg_response_minutes: r.avg_response_minutes,
    }));
}

/** 5 大類聚合 (across all years 或 latest year only) */
export interface FireCauseAggregate {
  cause_5_id: Cause5Id;
  cause_5_name: string;
  severity: FireSeverity;
  incidents: number;
  pct: number;        // 佔總件數
  deaths: number;
  injuries: number;
  fatality_rate: number; // deaths / incidents * 100
  children: Array<{
    cause_22_id: string;
    cause_22_name: string;
    incidents: number;
    fatality_rate: number;
  }>;
}

const CAUSE_5_SEVERITY: Record<Cause5Id, FireSeverity> = {
  intentional: "high",
  chemical: "high",
  electrical: "med",
  careless: "low",
  other: "unknown",
};

/** Display order 給 5 大類 table */
const CAUSE_5_ORDER: Cause5Id[] = [
  "intentional",
  "chemical",
  "electrical",
  "careless",
  "other",
];

/**
 * 縣市版 5+22 cause aggregate — 給 ViewBFire 用
 * 用 `incidents_by_county_cause_year` MV，filter 該 county_id 後沿用 deriveCauseAggregates 邏輯
 *
 * null cause（taxonomy LEFT JOIN miss）合進 'other' / 22→'99' 不明，避免靜默漏算總件數
 */
export function deriveCountyCauseAggregates(
  rows: IncidentsByCountyCauseYearRow[],
  countyId: string,
  yearFilter?: number
): FireCauseAggregate[] {
  const filtered = rows
    .filter((r) => r.county_id === countyId)
    .map((r) => ({
      data_year_minguo: r.data_year_minguo,
      cause_5_id: (r.cause_5_id ?? "other") as Cause5Id,
      cause_5_name: r.cause_5_name ?? "其他不明",
      cause_22_id: r.cause_22_id ?? "99",
      cause_22_name: r.cause_22_name ?? "不明",
      incident_count: r.incident_count,
      total_deaths: r.total_deaths,
      total_injuries: r.total_injuries,
    }));
  return deriveCauseAggregates(filtered, yearFilter);
}

export function deriveCauseAggregates(
  causeYear: IncidentsByCauseYearRow[],
  yearFilter?: number
): FireCauseAggregate[] {
  if (!causeYear.length) return [];
  const latest =
    yearFilter ?? Math.max(...causeYear.map((r) => r.data_year_minguo));
  const rows = causeYear.filter((r) => r.data_year_minguo === latest);

  const total = rows.reduce((s, r) => s + r.incident_count, 0) || 1;

  const groups = new Map<Cause5Id, FireCauseAggregate>();
  for (const r of rows) {
    const id = r.cause_5_id;
    let g = groups.get(id);
    if (!g) {
      g = {
        cause_5_id: id,
        cause_5_name: r.cause_5_name,
        severity: CAUSE_5_SEVERITY[id],
        incidents: 0,
        pct: 0,
        deaths: 0,
        injuries: 0,
        fatality_rate: 0,
        children: [],
      };
      groups.set(id, g);
    }
    g.incidents += r.incident_count;
    g.deaths += r.total_deaths;
    g.injuries += r.total_injuries;
    g.children.push({
      cause_22_id: r.cause_22_id,
      cause_22_name: r.cause_22_name,
      incidents: r.incident_count,
      fatality_rate:
        r.incident_count > 0 ? (r.total_deaths / r.incident_count) * 100 : 0,
    });
  }
  // finalize pct + fatality_rate
  for (const g of groups.values()) {
    g.pct = (g.incidents / total) * 100;
    g.fatality_rate =
      g.incidents > 0 ? (g.deaths / g.incidents) * 100 : 0;
    g.children.sort((a, b) => b.incidents - a.incidents);
  }

  // 排序：固定大類順序
  return CAUSE_5_ORDER.map((id) => groups.get(id)).filter(
    (x): x is FireCauseAggregate => x != null
  );
}

/**
 * 月份聚合 12 月（全國 across years，給時間長條 "month" mode）
 * 把 hour_month 的 hour 維度 sum 掉
 */
export function deriveMonthlyTotals(
  hourMonth: IncidentsByHourMonthRow[]
): Array<{ month: number; incidents: number }> {
  const acc = new Map<number, number>();
  for (const r of hourMonth) {
    acc.set(r.month, (acc.get(r.month) ?? 0) + r.incident_count);
  }
  const out: Array<{ month: number; incidents: number }> = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ month: m, incidents: acc.get(m) ?? 0 });
  }
  return out;
}

/**
 * 小時聚合 24 點（全國 across months）
 */
export function deriveHourlyTotals(
  hourMonth: IncidentsByHourMonthRow[]
): Array<{ hour: number; incidents: number }> {
  const acc = new Map<number, number>();
  for (const r of hourMonth) {
    acc.set(r.hour, (acc.get(r.hour) ?? 0) + r.incident_count);
  }
  const out: Array<{ hour: number; incidents: number }> = [];
  for (let h = 0; h <= 23; h++) {
    out.push({ hour: h, incidents: acc.get(h) ?? 0 });
  }
  return out;
}

/**
 * 早 / 中 / 晚 / 半夜 4 bucket donut
 */
export function deriveDaypart(
  hourMonth: IncidentsByHourMonthRow[]
): Array<{ label: string; bucket: "midnight" | "morning" | "afternoon" | "evening"; value: number }> {
  const acc = { midnight: 0, morning: 0, afternoon: 0, evening: 0 };
  for (const r of hourMonth) {
    const h = r.hour;
    if (h < 6) acc.midnight += r.incident_count;
    else if (h < 12) acc.morning += r.incident_count;
    else if (h < 18) acc.afternoon += r.incident_count;
    else acc.evening += r.incident_count;
  }
  return [
    { label: "0-6 半夜",  bucket: "midnight",  value: acc.midnight },
    { label: "6-12 早",   bucket: "morning",   value: acc.morning },
    { label: "12-18 中",  bucket: "afternoon", value: acc.afternoon },
    { label: "18-24 晚",  bucket: "evening",   value: acc.evening },
  ];
}

/**
 * 年聚合（民國 → 件數）
 */
export function deriveYearlyTotals(
  countyYear: IncidentsByCountyYearRow[]
): Array<{ year_minguo: number; incidents: number }> {
  const acc = new Map<number, number>();
  for (const r of countyYear) {
    acc.set(r.data_year_minguo, (acc.get(r.data_year_minguo) ?? 0) + r.incident_count);
  }
  return [...acc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year_minguo, incidents]) => ({ year_minguo, incidents }));
}

/**
 * 365 點全國折線（across counties）
 */
export function deriveDayOfYearSeries(
  dayOfYear: IncidentsByDayOfYearRow[]
): Array<{ day_index: number; month: number; day: number; incidents: number }> {
  // 把 county 維度 sum 掉，month/day 保留
  const acc = new Map<string, { month: number; day: number; count: number }>();
  for (const r of dayOfYear) {
    const key = `${r.month}-${r.day}`;
    const prev = acc.get(key);
    if (prev) prev.count += r.incident_count;
    else acc.set(key, { month: r.month, day: r.day, count: r.incident_count });
  }
  // sort by month, day
  const sorted = [...acc.values()].sort((a, b) =>
    a.month === b.month ? a.day - b.day : a.month - b.month
  );
  // build day_index 1..365
  return sorted.map((r, i) => ({
    day_index: i + 1,
    month: r.month,
    day: r.day,
    incidents: r.count,
  }));
}

// ─────────────────────────────────────────────────
// 9. 消防分隊 (fire.stations，716 筆，22 縣市齊)
// ─────────────────────────────────────────────────

export interface FireStationRow {
  station_id: string;
  county_id: string;
  name: string;
  type: string | null;          // 分隊 / 大隊 / 分駐所 / 中隊 / 小隊
  address: string | null;
  phone: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  geocoding_precision: string | null;
}

export async function fetchFireStations(opts: { county?: string | null } = {}): Promise<FireStationRow[]> {
  let q = db.from("fire_stations").select("station_id,county_id,name,type,address,phone,district,lat,lng,geocoding_precision");
  if (opts.county) q = q.eq("county_id", opts.county);
  const { data, error } = await q;
  if (error) {
    console.error("[fire] fetchFireStations failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    station_id: String(r.station_id),
    county_id: String(r.county_id),
    name: String(r.name),
    type: r.type == null ? null : String(r.type),
    address: r.address == null ? null : String(r.address),
    phone: r.phone == null ? null : String(r.phone),
    district: r.district == null ? null : String(r.district),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    geocoding_precision: r.geocoding_precision == null ? null : String(r.geocoding_precision),
  }));
}

// ─────────────────────────────────────────────────
// 10. 消防栓 (fire.hydrants，39,395 筆，目前僅高雄 county_id='E')
// ─────────────────────────────────────────────────

export interface FireHydrantRow {
  hydrant_id: string;
  county_id: string;
  type: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * 抓消防栓（預設取所有縣市）。
 * 由於目前資料量大且僅高雄有，前端通常 `county='E'` 拉出後做 heatmap。
 */
export async function fetchFireHydrants(opts: { county?: string | null; limit?: number } = {}): Promise<FireHydrantRow[]> {
  let q = db.from("fire_hydrants").select("hydrant_id,county_id,type,lat,lng");
  if (opts.county) q = q.eq("county_id", opts.county);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    console.error("[fire] fetchFireHydrants failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    hydrant_id: String(r.hydrant_id),
    county_id: String(r.county_id),
    type: r.type == null ? null : String(r.type),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
  }));
}

/** 全國消防栓總數（不拉明細，避免下載 39k 筆）*/
export async function fetchFireHydrantNationalCount(): Promise<number> {
  const { count, error } = await db
    .from("fire_hydrants")
    .select("hydrant_id", { count: "exact", head: true });
  if (error) {
    console.error("[fire] fetchFireHydrantNationalCount failed:", error);
    throw error;
  }
  return count ?? 0;
}

/** 全國分隊總數（不拉明細）*/
export async function fetchFireStationsNationalCount(): Promise<number> {
  const { count, error } = await db
    .from("fire_stations")
    .select("station_id", { count: "exact", head: true });
  if (error) {
    console.error("[fire] fetchFireStationsNationalCount failed:", error);
    throw error;
  }
  return count ?? 0;
}

/** 全國避難所總數（不拉明細）*/
export async function fetchShelterNationalCount(): Promise<number> {
  const { count, error } = await db
    .from("safety_emergency_shelters")
    .select("shelter_id", { count: "exact", head: true });
  if (error) {
    console.error("[fire] fetchShelterNationalCount failed:", error);
    throw error;
  }
  return count ?? 0;
}

/** 各縣市消防栓數量（不拉點位） */
export interface FireHydrantCountRow {
  county_id: string;
  hydrant_count: number;
}

export async function fetchFireHydrantCountsByCounty(): Promise<FireHydrantCountRow[]> {
  // PostgREST 沒原生 GROUP BY，前端 fetch all county_id 後 reduce
  const { data, error } = await db.from("fire_hydrants").select("county_id");
  if (error) {
    console.error("[fire] fetchFireHydrantCountsByCounty failed:", error);
    throw error;
  }
  const acc = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ county_id: string }>) {
    const id = String(r.county_id);
    acc.set(id, (acc.get(id) ?? 0) + 1);
  }
  return [...acc.entries()].map(([county_id, hydrant_count]) => ({ county_id, hydrant_count }));
}

// ─────────────────────────────────────────────────
// 11. 緊急避難收容處所 (safety.emergency_shelters，5,947 筆，22 縣市齊)
// ─────────────────────────────────────────────────

export interface EmergencyShelterRow {
  shelter_id: string;
  county_id: string;
  district: string | null;
  name: string;
  category: string | null;
  address: string | null;
  capacity: number | null;
  lat: number | null;
  lng: number | null;
  managing_agency: string | null;
}

export async function fetchEmergencyShelters(opts: { county?: string | null; limit?: number } = {}): Promise<EmergencyShelterRow[]> {
  let q = db
    .from("safety_emergency_shelters")
    .select("shelter_id,county_id,district,name,category,address,capacity,lat,lng,managing_agency");
  if (opts.county) q = q.eq("county_id", opts.county);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    console.error("[fire] fetchEmergencyShelters failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    shelter_id: String(r.shelter_id),
    county_id: String(r.county_id),
    district: r.district == null ? null : String(r.district),
    name: String(r.name),
    category: r.category == null ? null : String(r.category),
    address: r.address == null ? null : String(r.address),
    capacity: r.capacity == null ? null : Number(r.capacity),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    managing_agency: r.managing_agency == null ? null : String(r.managing_agency),
  }));
}

/** 各縣市避難所數量（不拉明細） */
export interface ShelterCountRow {
  county_id: string;
  shelter_count: number;
  total_capacity: number;
}

export async function fetchShelterCountsByCounty(): Promise<ShelterCountRow[]> {
  const { data, error } = await db.from("safety_emergency_shelters").select("county_id,capacity");
  if (error) {
    console.error("[fire] fetchShelterCountsByCounty failed:", error);
    throw error;
  }
  const acc = new Map<string, { c: number; cap: number }>();
  for (const r of (data ?? []) as Array<{ county_id: string; capacity: number | null }>) {
    const id = String(r.county_id);
    const prev = acc.get(id) ?? { c: 0, cap: 0 };
    prev.c += 1;
    prev.cap += r.capacity == null ? 0 : Number(r.capacity);
    acc.set(id, prev);
  }
  return [...acc.entries()].map(([county_id, v]) => ({
    county_id,
    shelter_count: v.c,
    total_capacity: v.cap,
  }));
}

// ─────────────────────────────────────────────────
// 12. 中央災變紀錄 (fire.disaster_incidents，55,798 筆，2022-09~2024-11)
// ─────────────────────────────────────────────────

export interface DisasterIncidentRow {
  incident_id: string;
  disaster_name: string;
  occurred_at: string;
  occurred_date: string;
  county_id: string;
  county_name_raw: string | null;
  town: string | null;
  incident_type: string | null;
  deaths: number | null;
  injuries: number | null;
  data_source: string;
}

export async function fetchDisasterIncidents(opts: {
  county?: string | null;
  limit?: number;
  orderDesc?: boolean;
} = {}): Promise<DisasterIncidentRow[]> {
  let q = db
    .from("fire_disaster_incidents")
    .select("incident_id,disaster_name,occurred_at,occurred_date,county_id,county_name_raw,town,incident_type,deaths,injuries,data_source");
  if (opts.county) q = q.eq("county_id", opts.county);
  q = q.order("occurred_date", { ascending: !opts.orderDesc });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    console.error("[fire] fetchDisasterIncidents failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    incident_id: String(r.incident_id),
    disaster_name: String(r.disaster_name),
    occurred_at: String(r.occurred_at),
    occurred_date: String(r.occurred_date),
    county_id: String(r.county_id),
    county_name_raw: r.county_name_raw == null ? null : String(r.county_name_raw),
    town: r.town == null ? null : String(r.town),
    incident_type: r.incident_type == null ? null : String(r.incident_type),
    deaths: r.deaths == null ? null : Number(r.deaths),
    injuries: r.injuries == null ? null : Number(r.injuries),
    data_source: String(r.data_source),
  }));
}

// ─────────────────────────────────────────────────
// 13. 山林火災風險點 (fire.forest_fire_risk_snapshot)
// ─────────────────────────────────────────────────

export interface ForestFireRiskRow {
  snapshot_id: number;
  region: string;
  risk_level: number | null;          // 1=安全 ... 5=最危險
  risk_level_chinese: string | null;
  snapshot_date: string | null;
  lat: number | null;
  lng: number | null;
}

export async function fetchForestFireRisk(opts: { minRiskLevel?: number; limit?: number } = {}): Promise<ForestFireRiskRow[]> {
  let q = db.from("fire_forest_fire_risk_snapshot").select("snapshot_id,region,risk_level,risk_level_chinese,snapshot_date,lat,lng");
  if (opts.minRiskLevel != null) q = q.gte("risk_level", opts.minRiskLevel);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    console.error("[fire] fetchForestFireRisk failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    snapshot_id: Number(r.snapshot_id),
    region: String(r.region),
    risk_level: r.risk_level == null ? null : Number(r.risk_level),
    risk_level_chinese: r.risk_level_chinese == null ? null : String(r.risk_level_chinese),
    snapshot_date: r.snapshot_date == null ? null : String(r.snapshot_date),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
  }));
}

/** 全國 forest_fire_risk 風險等級分布 */
export interface ForestFireRiskSummary {
  total: number;
  by_level: Record<string, number>;     // "安全" / "注意" / "警告" / "危險" / "最危險"
  high_risk_count: number;              // risk_level >= 3 (警告+危險+最危險)
}

export async function fetchForestFireRiskSummary(): Promise<ForestFireRiskSummary> {
  const { data, error } = await db.from("fire_forest_fire_risk_snapshot").select("risk_level,risk_level_chinese");
  if (error) {
    console.error("[fire] fetchForestFireRiskSummary failed:", error);
    throw error;
  }
  const byLevel: Record<string, number> = {};
  let total = 0;
  let high = 0;
  for (const r of (data ?? []) as Array<{ risk_level: number | null; risk_level_chinese: string | null }>) {
    total += 1;
    const lvl = r.risk_level_chinese ?? "未知";
    byLevel[lvl] = (byLevel[lvl] ?? 0) + 1;
    if (r.risk_level != null && Number(r.risk_level) >= 3) high += 1;
  }
  return { total, by_level: byLevel, high_risk_count: high };
}

// ─────────────────────────────────────────────────
// 14. MOI 統計處 5 表（年度 KPI）
// ─────────────────────────────────────────────────

export interface IncidentsBySeverityRow {
  year: number;
  county_id: string;
  severity_type: "building" | "vehicle" | "forest" | "other";
  count: number;
  source_dataset: string;
}

export async function fetchIncidentsBySeverity(): Promise<IncidentsBySeverityRow[]> {
  const { data, error } = await db.from("fire_incidents_by_severity").select("year,county_id,severity_type,count,source_dataset");
  if (error) {
    console.error("[fire] fetchIncidentsBySeverity failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    year: Number(r.year),
    county_id: String(r.county_id),
    severity_type: String(r.severity_type) as IncidentsBySeverityRow["severity_type"],
    count: Number(r.count),
    source_dataset: String(r.source_dataset),
  }));
}

export interface IncidentsByLocationTypeRow {
  year: number;
  county_id: string;
  location_type: "residential" | "commercial" | "industrial" | "vehicle_outdoor" | "outdoor" | "other";
  count: number;
}

export async function fetchIncidentsByLocationType(): Promise<IncidentsByLocationTypeRow[]> {
  const { data, error } = await db.from("fire_incidents_by_location_type").select("year,county_id,location_type,count");
  if (error) {
    console.error("[fire] fetchIncidentsByLocationType failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    year: Number(r.year),
    county_id: String(r.county_id),
    location_type: String(r.location_type) as IncidentsByLocationTypeRow["location_type"],
    count: Number(r.count),
  }));
}

export interface IncidentsByCause22YearlyRow {
  year: number;
  county_id: string;
  cause_22_id: string;
  count: number;
}

export async function fetchIncidentsByCause22Yearly(): Promise<IncidentsByCause22YearlyRow[]> {
  const { data, error } = await db.from("fire_incidents_by_cause_22_yearly").select("year,county_id,cause_22_id,count");
  if (error) {
    console.error("[fire] fetchIncidentsByCause22Yearly failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    year: Number(r.year),
    county_id: String(r.county_id),
    cause_22_id: String(r.cause_22_id),
    count: Number(r.count),
  }));
}

export interface CasualtyPropertyRow {
  year: number;
  county_id: string;
  deaths: number | null;
  injuries: number | null;
  house_damage_units: number | null;
  vehicle_damage_units: number | null;
  loss_house_thousand: number | null;
  loss_other_thousand: number | null;
  loss_total_thousand: number | null;
}

export async function fetchCasualtyProperty(): Promise<CasualtyPropertyRow[]> {
  const { data, error } = await db
    .from("fire_casualty_property_by_county_year")
    .select("year,county_id,deaths,injuries,house_damage_units,vehicle_damage_units,loss_house_thousand,loss_other_thousand,loss_total_thousand");
  if (error) {
    console.error("[fire] fetchCasualtyProperty failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    year: Number(r.year),
    county_id: String(r.county_id),
    deaths: r.deaths == null ? null : Number(r.deaths),
    injuries: r.injuries == null ? null : Number(r.injuries),
    house_damage_units: r.house_damage_units == null ? null : Number(r.house_damage_units),
    vehicle_damage_units: r.vehicle_damage_units == null ? null : Number(r.vehicle_damage_units),
    loss_house_thousand: r.loss_house_thousand == null ? null : Number(r.loss_house_thousand),
    loss_other_thousand: r.loss_other_thousand == null ? null : Number(r.loss_other_thousand),
    loss_total_thousand: r.loss_total_thousand == null ? null : Number(r.loss_total_thousand),
  }));
}

export interface PersonnelVehiclesRow {
  year: number;
  county_id: string;
  personnel_establishment: number | null;
  personnel_budget: number | null;
  personnel_actual: number | null;
  personnel_shortage: number | null;
  fire_engines: number | null;
  ladder_trucks: number | null;
  ambulances: number | null;
  rescue_vehicles: number | null;
}

export async function fetchPersonnelVehicles(): Promise<PersonnelVehiclesRow[]> {
  const { data, error } = await db
    .from("fire_personnel_vehicles_yearly")
    .select("year,county_id,personnel_establishment,personnel_budget,personnel_actual,personnel_shortage,fire_engines,ladder_trucks,ambulances,rescue_vehicles");
  if (error) {
    console.error("[fire] fetchPersonnelVehicles failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    year: Number(r.year),
    county_id: String(r.county_id),
    personnel_establishment: r.personnel_establishment == null ? null : Number(r.personnel_establishment),
    personnel_budget: r.personnel_budget == null ? null : Number(r.personnel_budget),
    personnel_actual: r.personnel_actual == null ? null : Number(r.personnel_actual),
    personnel_shortage: r.personnel_shortage == null ? null : Number(r.personnel_shortage),
    fire_engines: r.fire_engines == null ? null : Number(r.fire_engines),
    ladder_trucks: r.ladder_trucks == null ? null : Number(r.ladder_trucks),
    ambulances: r.ambulances == null ? null : Number(r.ambulances),
    rescue_vehicles: r.rescue_vehicles == null ? null : Number(r.rescue_vehicles),
  }));
}

// ─────────────────────────────────────────────────
// 15. EMS 救護統計 (3 表)
// ─────────────────────────────────────────────────

export interface EmsByCountyYearRow {
  year: number;
  county_id: string;
  dispatch_count: number | null;
  transport_count: number | null;
  ohca_count: number | null;
  trauma_count: number | null;
}

export async function fetchEmsByCountyYear(): Promise<EmsByCountyYearRow[]> {
  const { data, error } = await db
    .from("fire_ems_stats_by_county_year")
    .select("year,county_id,dispatch_count,transport_count,ohca_count,trauma_count");
  if (error) {
    console.error("[fire] fetchEmsByCountyYear failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    year: Number(r.year),
    county_id: String(r.county_id),
    dispatch_count: r.dispatch_count == null ? null : Number(r.dispatch_count),
    transport_count: r.transport_count == null ? null : Number(r.transport_count),
    ohca_count: r.ohca_count == null ? null : Number(r.ohca_count),
    trauma_count: r.trauma_count == null ? null : Number(r.trauma_count),
  }));
}

export interface EmsMonthlyRow {
  year_month: string;   // "2025-01"
  county_id: string;
  dispatch_count: number | null;
  transport_count: number | null;
  ohca_count: number | null;
  trauma_count: number | null;
}

export async function fetchEmsMonthly(): Promise<EmsMonthlyRow[]> {
  const { data, error } = await db
    .from("fire_ems_stats_monthly")
    .select("year_month,county_id,dispatch_count,transport_count,ohca_count,trauma_count");
  if (error) {
    console.error("[fire] fetchEmsMonthly failed:", error);
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    year_month: String(r.year_month).trim(),
    county_id: String(r.county_id),
    dispatch_count: r.dispatch_count == null ? null : Number(r.dispatch_count),
    transport_count: r.transport_count == null ? null : Number(r.transport_count),
    ohca_count: r.ohca_count == null ? null : Number(r.ohca_count),
    trauma_count: r.trauma_count == null ? null : Number(r.trauma_count),
  }));
}

// ─────────────────────────────────────────────────
// 16. 高階聚合 helpers（給 hook 用）
// ─────────────────────────────────────────────────

/** 全國最新年 financial loss（萬元 → 億元） */
export interface FireFinancialLossSummary {
  year: number;
  total_loss_billion: number;     // 億元
  total_house_billion: number;
  total_other_billion: number;
  total_deaths: number;
  total_injuries: number;
  total_house_damage_units: number;
  total_vehicle_damage_units: number;
  /** 缺前一年資料時為 null */
  loss_delta_pct: number | null;
}

export function deriveFinancialLoss(rows: CasualtyPropertyRow[]): FireFinancialLossSummary | null {
  if (!rows.length) return null;
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
  const latest = years[0];
  const prev = years.find((y) => y < latest) ?? null;

  const sumYear = (y: number) =>
    rows.filter((r) => r.year === y).reduce(
      (a, r) => ({
        loss: a.loss + (r.loss_total_thousand ?? 0),
        loss_h: a.loss_h + (r.loss_house_thousand ?? 0),
        loss_o: a.loss_o + (r.loss_other_thousand ?? 0),
        d: a.d + (r.deaths ?? 0),
        i: a.i + (r.injuries ?? 0),
        hd: a.hd + (r.house_damage_units ?? 0),
        vd: a.vd + (r.vehicle_damage_units ?? 0),
      }),
      { loss: 0, loss_h: 0, loss_o: 0, d: 0, i: 0, hd: 0, vd: 0 }
    );
  const cur = sumYear(latest);
  const prv = prev == null ? null : sumYear(prev);

  // 千元 → 億元：÷ 100000
  const thousandToBillion = (v: number) => v / 100000;

  return {
    year: latest,
    total_loss_billion: thousandToBillion(cur.loss),
    total_house_billion: thousandToBillion(cur.loss_h),
    total_other_billion: thousandToBillion(cur.loss_o),
    total_deaths: cur.d,
    total_injuries: cur.i,
    total_house_damage_units: cur.hd,
    total_vehicle_damage_units: cur.vd,
    loss_delta_pct: prv && prv.loss > 0 ? ((cur.loss - prv.loss) / prv.loss) * 100 : null,
  };
}

/** 全國最新年 EMS 出勤總量 */
export interface FireEmsSummary {
  year: number;
  total_dispatch: number;
  total_transport: number;
  total_ohca: number;
  total_trauma: number;
}

export function deriveEmsSummary(rows: EmsByCountyYearRow[]): FireEmsSummary | null {
  if (!rows.length) return null;
  const latest = Math.max(...rows.map((r) => r.year));
  const filtered = rows.filter((r) => r.year === latest);
  return {
    year: latest,
    total_dispatch: filtered.reduce((s, r) => s + (r.dispatch_count ?? 0), 0),
    total_transport: filtered.reduce((s, r) => s + (r.transport_count ?? 0), 0),
    total_ohca: filtered.reduce((s, r) => s + (r.ohca_count ?? 0), 0),
    total_trauma: filtered.reduce((s, r) => s + (r.trauma_count ?? 0), 0),
  };
}

/** 全國最新年 量能（分隊 / 車輛 / 人力） */
export interface FireCapacitySummary {
  year: number;
  personnel_actual: number;
  personnel_shortage: number;
  fire_engines: number;
  ladder_trucks: number;
  ambulances: number;
  rescue_vehicles: number;
}

export function deriveCapacitySummary(rows: PersonnelVehiclesRow[]): FireCapacitySummary | null {
  if (!rows.length) return null;
  const latest = Math.max(...rows.map((r) => r.year));
  const filtered = rows.filter((r) => r.year === latest);
  return {
    year: latest,
    personnel_actual: filtered.reduce((s, r) => s + (r.personnel_actual ?? 0), 0),
    personnel_shortage: filtered.reduce((s, r) => s + (r.personnel_shortage ?? 0), 0),
    fire_engines: filtered.reduce((s, r) => s + (r.fire_engines ?? 0), 0),
    ladder_trucks: filtered.reduce((s, r) => s + (r.ladder_trucks ?? 0), 0),
    ambulances: filtered.reduce((s, r) => s + (r.ambulances ?? 0), 0),
    rescue_vehicles: filtered.reduce((s, r) => s + (r.rescue_vehicles ?? 0), 0),
  };
}

/** 起火處所最新年聚合 (全國) */
export interface LocationTypeAggregate {
  year: number;
  total: number;
  by_type: Array<{ type: string; label: string; count: number; pct: number }>;
}

const LOCATION_TYPE_LABEL: Record<IncidentsByLocationTypeRow["location_type"], string> = {
  residential: "住宅",
  commercial: "商業",
  industrial: "工業",
  vehicle_outdoor: "車輛/戶外",
  outdoor: "戶外",
  other: "其他",
};

export function deriveLocationTypeAgg(rows: IncidentsByLocationTypeRow[]): LocationTypeAggregate | null {
  if (!rows.length) return null;
  const latest = Math.max(...rows.map((r) => r.year));
  const filtered = rows.filter((r) => r.year === latest);
  const acc = new Map<string, number>();
  for (const r of filtered) {
    acc.set(r.location_type, (acc.get(r.location_type) ?? 0) + r.count);
  }
  const total = [...acc.values()].reduce((s, v) => s + v, 0);
  return {
    year: latest,
    total,
    by_type: [...acc.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        label: LOCATION_TYPE_LABEL[type as IncidentsByLocationTypeRow["location_type"]] ?? type,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      })),
  };
}

/** 嚴重度（建物 vs 車輛 vs 山林 vs 其他）— 最新年全國 */
export interface SeverityAggregate {
  year: number;
  total: number;
  by_type: Array<{ type: string; label: string; count: number; pct: number }>;
}

const SEVERITY_TYPE_LABEL: Record<IncidentsBySeverityRow["severity_type"], string> = {
  building: "建築物",
  vehicle: "車輛",
  forest: "山林",
  other: "其他",
};

export function deriveSeverityAgg(rows: IncidentsBySeverityRow[]): SeverityAggregate | null {
  if (!rows.length) return null;
  const latest = Math.max(...rows.map((r) => r.year));
  const filtered = rows.filter((r) => r.year === latest);
  const acc = new Map<string, number>();
  for (const r of filtered) {
    acc.set(r.severity_type, (acc.get(r.severity_type) ?? 0) + r.count);
  }
  const total = [...acc.values()].reduce((s, v) => s + v, 0);
  return {
    year: latest,
    total,
    by_type: [...acc.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        label: SEVERITY_TYPE_LABEL[type as IncidentsBySeverityRow["severity_type"]] ?? type,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      })),
  };
}
