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
