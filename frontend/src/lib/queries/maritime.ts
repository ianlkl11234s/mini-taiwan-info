/**
 * Maritime theme · Supabase queries
 *
 * 對應 themes/maritime.yaml KPI。Backend：maritime schema 已 exposed。
 *
 * 資料來源：
 *   - maritime.ports (277)                  — 全國港口靜態
 *   - maritime.fishery_stats_by_county (632) — 22 縣市 × 29 年（1996-2024）
 *   - maritime.port_traffic_yearly (48)      — iMarine 港埠運量
 *
 * 缺口：fishery_rights / lighthouse 表不存在；fishing_vessels_count / aquaculture_area_ha 全 NULL
 * 設計來源：data-maritime.js
 */

import { withSchema } from "../supabase";
import { COUNTIES } from "../counties";
import type { CountyCode3, CountyIdMoi } from "../types";

const db = withSchema("maritime");

const LATEST_YEAR = 2024;
const BASE_YEAR = 2015;

// ─────────────────────────────────────────────────
// 1. Raw rows
// ─────────────────────────────────────────────────

export interface PortRow {
  id: number;
  name: string;
  name_en: string;
  county: string;
  county_id: CountyIdMoi | null;
  lng: number;
  lat: number;
  port_class: string | null;       // '漁港', '國際商港', '國內商港', '渡輪', '其他'
  port_class_group: string | null;
  phone: string | null;
}

export async function fetchPorts(): Promise<PortRow[]> {
  const out: PortRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("ports")
      .select("id,name,name_en,county,county_id,lng,lat,port_class,port_class_group,phone")
      .range(from, from + pageSize - 1);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[maritime] ports failed:", error);
      throw error;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    for (const r of rows) {
      out.push({
        id: Number(r.id),
        name: String(r.name ?? ""),
        name_en: String(r.name_en ?? ""),
        county: String(r.county ?? ""),
        county_id: r.county_id == null ? null : (String(r.county_id) as CountyIdMoi),
        lng: Number(r.lng ?? 0),
        lat: Number(r.lat ?? 0),
        port_class: r.port_class == null ? null : String(r.port_class),
        port_class_group: r.port_class_group == null ? null : String(r.port_class_group),
        phone: r.phone == null ? null : String(r.phone),
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export interface FisheryStatsRow {
  county_id: CountyIdMoi;
  county_name: string;
  stat_year: number;
  fishery_production_tonnes: number | null;
  fishery_value_thousand: number | null;
  aquaculture_area_ha: number | null;
  fishing_vessels_count: number | null;
}

export async function fetchFisheryStats(): Promise<FisheryStatsRow[]> {
  const out: FisheryStatsRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("fishery_stats_by_county")
      .select("county_id,county_name,stat_year,fishery_production_tonnes,fishery_value_thousand,aquaculture_area_ha,fishing_vessels_count")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("[maritime] fishery_stats failed:", error);
      throw error;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    for (const r of rows) {
      out.push({
        county_id: String(r.county_id ?? "") as CountyIdMoi,
        county_name: String(r.county_name ?? ""),
        stat_year: Number(r.stat_year ?? 0),
        fishery_production_tonnes:
          r.fishery_production_tonnes == null ? null : Number(r.fishery_production_tonnes),
        fishery_value_thousand:
          r.fishery_value_thousand == null ? null : Number(r.fishery_value_thousand),
        aquaculture_area_ha:
          r.aquaculture_area_ha == null ? null : Number(r.aquaculture_area_ha),
        fishing_vessels_count:
          r.fishing_vessels_count == null ? null : Number(r.fishing_vessels_count),
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export interface PortTrafficRow {
  scope: string;                  // 'national' / 'port'
  port_name: string | null;
  port_uid: string | null;
  stat_period: string;            // '2025' (= 2024 全年快照) / '2026' (=2025-Q1)
  metric: string;                 // 'cargo_volume_噸' / 'container_TEU' / 'ship_calls'
  value: number;
  unit: string;
}

export async function fetchPortTraffic(): Promise<PortTrafficRow[]> {
  const { data, error } = await db
    .from("port_traffic_yearly")
    .select("scope,port_name,port_uid,stat_period,metric,value,unit");
  if (error) {
    console.error("[maritime] port_traffic_yearly failed:", error);
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    scope: String(r.scope ?? ""),
    port_name: r.port_name == null ? null : String(r.port_name),
    port_uid: r.port_uid == null ? null : String(r.port_uid),
    stat_period: String(r.stat_period ?? ""),
    metric: String(r.metric ?? ""),
    value: Number(r.value ?? 0),
    unit: String(r.unit ?? ""),
  }));
}

// ─────────────────────────────────────────────────
// 2. Derived 型別
// ─────────────────────────────────────────────────

export interface MaritimeNationalSummary {
  ports: number;
  fishingPorts: number;
  commercialIntl: number;
  commercialDomestic: number;
  ferryPorts: number;
  otherPorts: number;
  fisheryQty: number;          // 公噸 2024 全國
  fisheryValueY: number;       // 億元 2024 全國
  qty2015: number;
  value2015: number;
  shipTraffic: number;         // 艘次 2024
  containers: number;          // TEU
  cargoTon: number;            // 億噸
}

export interface PortClassRow {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface FisheryTrendRow {
  year: number;
  qty: number;
  value: number;   // 億元
}

export interface TopCommPortRow {
  name: string;
  countyCode: CountyCode3 | null;
  ships: number;
  containers: number;
  share: number;       // %
}

export interface CountyMaritimeAggregate {
  code3: CountyCode3;
  id_moi: CountyIdMoi;
  name: string;
  ports: number;
  fishing: number;
  commercial: number;
  ferry: number;
  fisheryValue: number;       // 億元 2024
  fisheryQty: number;         // 公噸 2024
  shipTraffic: number;
  containers: number;
}

// ─────────────────────────────────────────────────
// 3. Derive functions
// ─────────────────────────────────────────────────

/** 把不同口徑 port_class 歸到 5 大類 */
function classifyPort(p: PortRow): "intl_comm" | "dom_comm" | "fishing" | "ferry" | "other" {
  const cls = (p.port_class ?? "").toLowerCase();
  const grp = (p.port_class_group ?? "").toLowerCase();
  if (cls.includes("漁") || grp.includes("漁")) return "fishing";
  if (cls.includes("國際") || cls.includes("intl") || cls.includes("international")) return "intl_comm";
  if (cls.includes("國內") || cls.includes("商港") || cls.includes("commercial")) return "dom_comm";
  if (cls.includes("渡") || cls.includes("觀光") || cls.includes("ferry") || cls.includes("tourism"))
    return "ferry";
  return "other";
}

export function derivePortClass(ports: PortRow[]): PortClassRow[] {
  const counts: Record<string, number> = {
    fishing: 0, ferry: 0, intl_comm: 0, dom_comm: 0, other: 0,
  };
  for (const p of ports) {
    counts[classifyPort(p)] += 1;
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const meta: Record<string, { label: string; color: string }> = {
    fishing:   { label: "漁港",       color: "#0D9488" },
    ferry:     { label: "渡輪/觀光",  color: "#06B6D4" },
    intl_comm: { label: "國際商港",   color: "#0369A1" },
    dom_comm:  { label: "國內商港",   color: "#1E40AF" },
    other:     { label: "其他",       color: "#94A3B8" },
  };
  const order = ["fishing", "ferry", "intl_comm", "dom_comm", "other"];
  return order.map((id) => ({
    id,
    label: meta[id].label,
    value: counts[id],
    pct: total > 0 ? Number(((counts[id] / total) * 100).toFixed(1)) : 0,
    color: meta[id].color,
  }));
}

export function deriveMaritimeSummary(
  ports: PortRow[],
  fishery: FisheryStatsRow[],
  traffic: PortTrafficRow[],
): MaritimeNationalSummary {
  const cls = derivePortClass(ports);
  const get = (id: string) => cls.find((c) => c.id === id)?.value ?? 0;

  // 2024 漁業全國
  const fy2024 = fishery.filter((f) => f.stat_year === LATEST_YEAR);
  const fyQty = fy2024.reduce((s, f) => s + (f.fishery_production_tonnes ?? 0), 0);
  const fyValThousand = fy2024.reduce((s, f) => s + (f.fishery_value_thousand ?? 0), 0);

  const fy2015 = fishery.filter((f) => f.stat_year === BASE_YEAR);
  const qty2015 = fy2015.reduce((s, f) => s + (f.fishery_production_tonnes ?? 0), 0);
  const val2015 = fy2015.reduce((s, f) => s + (f.fishery_value_thousand ?? 0), 0);

  // port_traffic：stat_period='2025' = 2024 全年（依 collector 標籤口徑）
  const t2024 = traffic.filter((t) => t.stat_period === "2025" && t.scope === "national");
  const ships = t2024.find((t) => t.metric.includes("port_calls") || t.metric.includes("ship_calls") || t.metric.includes("艘次") || t.metric.includes("船舶"))?.value
    ?? traffic.filter((t) => t.stat_period === "2025" && (t.metric.includes("port_calls") || t.metric.includes("ship_calls") || t.metric.includes("艘次") || t.metric.includes("船舶"))).reduce((s, x) => s + x.value, 0);
  const teu = t2024.find((t) => t.metric.toLowerCase().includes("teu"))?.value
    ?? traffic.filter((t) => t.stat_period === "2025" && (t.metric.toLowerCase().includes("teu"))).reduce((s, x) => s + x.value, 0);
  const cargo = t2024.find((t) => t.metric.includes("cargo_volume"))?.value ?? 0;

  return {
    ports: ports.length,
    fishingPorts: get("fishing"),
    commercialIntl: get("intl_comm"),
    commercialDomestic: get("dom_comm"),
    ferryPorts: get("ferry"),
    otherPorts: get("other"),
    fisheryQty: Math.round(fyQty),
    fisheryValueY: Number((fyValThousand / 1e5).toFixed(2)),       // 千元 → 億元（÷1e5）
    qty2015: Math.round(qty2015),
    value2015: Number((val2015 / 1e5).toFixed(2)),
    shipTraffic: Math.round(ships),
    containers: Math.round(teu),
    cargoTon: Number((cargo / 1e8).toFixed(2)),
  };
}

export function deriveFisheryTrend(fishery: FisheryStatsRow[]): FisheryTrendRow[] {
  const byYear = new Map<number, { qty: number; value: number }>();
  for (const f of fishery) {
    if (f.stat_year < BASE_YEAR || f.stat_year > LATEST_YEAR) continue;
    const slot = byYear.get(f.stat_year) ?? { qty: 0, value: 0 };
    slot.qty += f.fishery_production_tonnes ?? 0;
    slot.value += f.fishery_value_thousand ?? 0;
    byYear.set(f.stat_year, slot);
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, v]) => ({
      year,
      qty: Math.round(v.qty),
      value: Math.round(v.value / 1e5),
    }));
}

export function deriveTopCommPorts(
  traffic: PortTrafficRow[],
  ports: PortRow[],
  limit = 5,
): TopCommPortRow[] {
  // 找 stat_period='2025' & scope='port' 的 ship_calls 與 container_TEU
  const t = traffic.filter((x) => x.stat_period === "2025" && x.scope === "port");
  const byPort = new Map<string, { ships: number; containers: number }>();
  for (const r of t) {
    const key = r.port_name ?? r.port_uid ?? "";
    if (!key) continue;
    const slot = byPort.get(key) ?? { ships: 0, containers: 0 };
    if (r.metric.includes("port_calls") || r.metric.includes("ship_calls") || r.metric.includes("艘次") || r.metric.includes("船舶")) slot.ships += r.value;
    if (r.metric.toLowerCase().includes("teu")) slot.containers += r.value;
    byPort.set(key, slot);
  }
  const totalShips = Array.from(byPort.values()).reduce((s, x) => s + x.ships, 0);
  const totalTeu = Array.from(byPort.values()).reduce((s, x) => s + x.containers, 0);
  const portIdx = new Map(ports.map((p) => [p.name, p]));
  return Array.from(byPort.entries())
    .map(([name, v]) => {
      const p = portIdx.get(name);
      // 占比依貨櫃為主，無貨櫃用艘次
      const share =
        totalTeu > 0 && v.containers > 0
          ? (v.containers / totalTeu) * 100
          : totalShips > 0
            ? (v.ships / totalShips) * 100
            : 0;
      return {
        name,
        countyCode: p?.county_id ? mapIdMoiToCode3(p.county_id) : null,
        ships: Math.round(v.ships),
        containers: Math.round(v.containers),
        share: Number(share.toFixed(1)),
      };
    })
    .sort((a, b) => b.containers - a.containers || b.ships - a.ships)
    .slice(0, limit);
}

function mapIdMoiToCode3(id: CountyIdMoi): CountyCode3 | null {
  const c = COUNTIES.find((x) => x.id_moi === id);
  return c?.code3 ?? null;
}

export function deriveCountyAggregates(
  ports: PortRow[],
  fishery: FisheryStatsRow[],
  traffic: PortTrafficRow[],
): CountyMaritimeAggregate[] {
  // 港口 by county_id
  const portsByCounty = new Map<CountyIdMoi, { ports: number; fishing: number; commercial: number; ferry: number }>();
  for (const p of ports) {
    if (!p.county_id) continue;
    const cls = classifyPort(p);
    const slot = portsByCounty.get(p.county_id) ?? { ports: 0, fishing: 0, commercial: 0, ferry: 0 };
    slot.ports += 1;
    if (cls === "fishing") slot.fishing += 1;
    if (cls === "intl_comm" || cls === "dom_comm") slot.commercial += 1;
    if (cls === "ferry") slot.ferry += 1;
    portsByCounty.set(p.county_id, slot);
  }

  // 2024 漁業 by county
  const fyByCounty = new Map<CountyIdMoi, { value: number; qty: number }>();
  for (const f of fishery) {
    if (f.stat_year !== LATEST_YEAR) continue;
    fyByCounty.set(f.county_id, {
      value: Number(((f.fishery_value_thousand ?? 0) / 1e5).toFixed(2)),  // → 億元
      qty: Math.round(f.fishery_production_tonnes ?? 0),
    });
  }

  // 港埠運量 by port_name → join 到 county
  const portCountyMap = new Map<string, CountyIdMoi>();
  for (const p of ports) {
    if (!p.county_id) continue;
    portCountyMap.set(p.name, p.county_id);
  }
  const trafByCounty = new Map<CountyIdMoi, { ships: number; containers: number }>();
  for (const t of traffic) {
    if (t.stat_period !== "2025" || t.scope !== "port" || !t.port_name) continue;
    const id = portCountyMap.get(t.port_name);
    if (!id) continue;
    const slot = trafByCounty.get(id) ?? { ships: 0, containers: 0 };
    if (t.metric.includes("port_calls") || t.metric.includes("ship_calls") || t.metric.includes("艘次") || t.metric.includes("船舶")) slot.ships += t.value;
    if (t.metric.toLowerCase().includes("teu")) slot.containers += t.value;
    trafByCounty.set(id, slot);
  }

  return COUNTIES.map((c) => {
    const p = portsByCounty.get(c.id_moi) ?? { ports: 0, fishing: 0, commercial: 0, ferry: 0 };
    const fy = fyByCounty.get(c.id_moi) ?? { value: 0, qty: 0 };
    const tr = trafByCounty.get(c.id_moi) ?? { ships: 0, containers: 0 };
    return {
      code3: c.code3,
      id_moi: c.id_moi,
      name: c.name_zh,
      ports: p.ports,
      fishing: p.fishing,
      commercial: p.commercial,
      ferry: p.ferry,
      fisheryValue: fy.value,
      fisheryQty: fy.qty,
      shipTraffic: Math.round(tr.ships),
      containers: Math.round(tr.containers),
    };
  });
}
