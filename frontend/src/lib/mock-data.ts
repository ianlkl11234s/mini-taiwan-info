/**
 * Mock data — Phase 0b 跑通骨架用
 *
 * 來源：移植自 designs/v02-claude-design-2026-05-14/js/data.js
 * 真實 Supabase 接入後（Phase 0c）會逐步取代。
 *
 * 注意：mock 的 county key 用 code3（'TPE'、'KHH'...）對齊 prototype。
 * 真實資料進來時統一改用 id_moi。
 */

import type { CountyCode3 } from "./types";

// ─────────────────────────────────────────────────
// 全國 KPI（水資源）
// ─────────────────────────────────────────────────

export const WATER_NATIONAL_MOCK = {
  reservoirRate: 72.3,
  reservoirRateDelta: +3.8,
  rain24: 12.4,
  rain24Delta: -4.2,
  alertReservoirs: 4,
  alertReservoirsDelta: 0,
  floodArea: 18.3,
  floodAreaDelta: +2.1,
  lpcd: 284,
  lpcdDelta: -6,
  sewage: 87.0,
  sewageDelta: +1.2,
};

// ─────────────────────────────────────────────────
// 縣市水資源（key = code3）
// ─────────────────────────────────────────────────

export interface WaterByCountyRow {
  lpcd: number;
  sewage: number;
  reservoir: number;
  rain24: number;
  pollutionFines: number;
  floodPct: number;
  reservoirs: number;
  wwtp: number;
}

export const WATER_BY_COUNTY_MOCK: Record<CountyCode3, WaterByCountyRow> = {
  TPE: { lpcd: 332, sewage: 99.6, reservoir: 92.4, rain24: 18.2, pollutionFines:  412, floodPct:  9.4, reservoirs: 1, wwtp:  3 },
  NTP: { lpcd: 269, sewage: 92.1, reservoir: 89.1, rain24: 16.7, pollutionFines: 1820, floodPct: 11.2, reservoirs: 1, wwtp:  8 },
  TYC: { lpcd: 295, sewage: 71.4, reservoir: 78.3, rain24: 12.3, pollutionFines: 3140, floodPct: 14.8, reservoirs: 2, wwtp:  6 },
  HSC: { lpcd: 268, sewage: 82.5, reservoir: 75.1, rain24: 10.1, pollutionFines:  730, floodPct:  7.3, reservoirs: 0, wwtp:  2 },
  HSH: { lpcd: 304, sewage: 31.2, reservoir: 75.1, rain24: 11.4, pollutionFines:  920, floodPct:  9.0, reservoirs: 1, wwtp:  2 },
  MIA: { lpcd: 312, sewage: 19.4, reservoir: 71.8, rain24:  9.7, pollutionFines:  540, floodPct:  6.4, reservoirs: 2, wwtp:  1 },
  TCH: { lpcd: 289, sewage: 47.6, reservoir: 64.5, rain24:  9.4, pollutionFines: 4220, floodPct: 12.1, reservoirs: 3, wwtp:  5 },
  CHA: { lpcd: 295, sewage: 13.8, reservoir: 64.5, rain24:  7.6, pollutionFines: 2810, floodPct: 26.5, reservoirs: 0, wwtp:  3 },
  NAN: { lpcd: 277, sewage: 12.3, reservoir: 59.8, rain24: 14.2, pollutionFines:  290, floodPct:  6.9, reservoirs: 1, wwtp:  1 },
  YUN: { lpcd: 290, sewage: 14.6, reservoir: 56.1, rain24:  7.1, pollutionFines: 1620, floodPct: 34.2, reservoirs: 0, wwtp:  2 },
  CYC: { lpcd: 186, sewage: 56.8, reservoir: 52.8, rain24:  6.4, pollutionFines:  220, floodPct: 18.7, reservoirs: 0, wwtp:  1 },
  CYH: { lpcd: 248, sewage: 12.1, reservoir: 52.8, rain24:  6.7, pollutionFines:  410, floodPct: 22.4, reservoirs: 1, wwtp:  1 },
  TNN: { lpcd: 264, sewage: 36.5, reservoir: 48.6, rain24:  5.8, pollutionFines: 3050, floodPct: 19.8, reservoirs: 2, wwtp:  4 },
  KHH: { lpcd: 285, sewage: 84.2, reservoir: 47.2, rain24:  5.4, pollutionFines: 5410, floodPct: 12.6, reservoirs: 3, wwtp: 12 },
  PIF: { lpcd: 273, sewage: 18.4, reservoir: 47.2, rain24:  8.2, pollutionFines: 1290, floodPct: 17.3, reservoirs: 1, wwtp:  3 },
  ILA: { lpcd: 258, sewage: 23.1, reservoir: 88.0, rain24: 42.8, pollutionFines:  480, floodPct: 11.6, reservoirs: 0, wwtp:  2 },
  HUA: { lpcd: 261, sewage: 18.6, reservoir: 81.4, rain24: 28.1, pollutionFines:  130, floodPct:  4.2, reservoirs: 0, wwtp:  2 },
  TTT: { lpcd: 205, sewage: 14.8, reservoir: 76.5, rain24: 21.4, pollutionFines:   80, floodPct:  3.8, reservoirs: 0, wwtp:  1 },
  PEH: { lpcd: 224, sewage: 38.2, reservoir: 63.2, rain24:  4.5, pollutionFines:   40, floodPct:  1.2, reservoirs: 1, wwtp:  1 },
  KMN: { lpcd: 232, sewage: 34.0, reservoir: 58.0, rain24:  3.8, pollutionFines:   20, floodPct:  0.8, reservoirs: 3, wwtp:  1 },
  LCC: { lpcd: 218, sewage: 29.6, reservoir: 81.0, rain24:  9.1, pollutionFines:    8, floodPct:  0.5, reservoirs: 0, wwtp:  1 },
  KLC: { lpcd: 212, sewage: 79.4, reservoir: 88.0, rain24: 21.1, pollutionFines:  210, floodPct:  8.6, reservoirs: 0, wwtp:  2 },
};

// ─────────────────────────────────────────────────
// 全國 40 座主要水庫 (PointProfile)
// ─────────────────────────────────────────────────

import { byCode3 } from "./counties";

interface ReservoirRaw {
  name: string;
  county: CountyCode3;
  rate: number;
  capacity: number;     // 萬 m³
  dlng: number;
  dlat: number;
}

const RAW_RESERVOIRS: ReservoirRaw[] = [
  { name: "翡翠",   county: "NTP", rate: 95.2, capacity: 32700, dlng:  0.08, dlat: -0.12 },
  { name: "石門",   county: "TYC", rate: 88.1, capacity: 20900, dlng:  0.10, dlat:  0.08 },
  { name: "寶山",   county: "HSH", rate: 78.4, capacity:   538, dlng: -0.05, dlat: -0.04 },
  { name: "寶山二", county: "HSH", rate: 72.5, capacity:  3147, dlng: -0.02, dlat: -0.08 },
  { name: "永和山", county: "MIA", rate: 68.4, capacity:  2961, dlng: -0.07, dlat:  0.04 },
  { name: "明德",   county: "MIA", rate: 72.8, capacity:  1659, dlng: -0.02, dlat: -0.05 },
  { name: "鯉魚潭", county: "MIA", rate: 81.2, capacity: 12600, dlng: -0.10, dlat: -0.02 },
  { name: "德基",   county: "TCH", rate: 64.5, capacity: 23200, dlng:  0.30, dlat: -0.10 },
  { name: "石岡壩", county: "TCH", rate: 60.3, capacity:   161, dlng:  0.10, dlat:  0.02 },
  { name: "霧社",   county: "NAN", rate: 58.2, capacity:  1463, dlng:  0.00, dlat:  0.10 },
  { name: "日月潭", county: "NAN", rate: 61.4, capacity: 17200, dlng: -0.08, dlat: -0.05 },
  { name: "湖山",   county: "YUN", rate: 56.1, capacity:  5300, dlng: -0.05, dlat: -0.02 },
  { name: "蘭潭",   county: "CYH", rate: 54.2, capacity:   860, dlng:  0.02, dlat:  0.05 },
  { name: "仁義潭", county: "CYH", rate: 52.8, capacity:  2700, dlng:  0.04, dlat:  0.02 },
  { name: "白河",   county: "TNN", rate: 41.6, capacity:  2510, dlng:  0.10, dlat:  0.12 },
  { name: "烏山頭", county: "TNN", rate: 25.9, capacity:  7340, dlng:  0.12, dlat:  0.04 },
  { name: "曾文",   county: "TNN", rate: 33.4, capacity: 49600, dlng:  0.20, dlat:  0.18 },
  { name: "南化",   county: "TNN", rate: 48.6, capacity:  9270, dlng:  0.18, dlat:  0.10 },
  { name: "阿公店", county: "KHH", rate: 28.3, capacity:  1880, dlng:  0.06, dlat:  0.20 },
  { name: "澄清湖", county: "KHH", rate: 65.2, capacity:   300, dlng:  0.02, dlat:  0.08 },
  { name: "鳳山",   county: "KHH", rate: 58.0, capacity:   870, dlng:  0.04, dlat:  0.02 },
  { name: "牡丹",   county: "PIF", rate: 47.2, capacity:  3138, dlng:  0.10, dlat: -0.20 },
  { name: "龍鑾潭", county: "PIF", rate: 52.4, capacity:    24, dlng:  0.02, dlat: -0.18 },
  { name: "羅好",   county: "ILA", rate: 88.0, capacity:   215, dlng: -0.04, dlat: -0.06 },
  { name: "新山",   county: "KLC", rate: 88.0, capacity:   970, dlng: -0.02, dlat:  0.02 },
  { name: "翠峰",   county: "TCH", rate: 91.0, capacity:   180, dlng:  0.20, dlat: -0.18 },
  { name: "谷關",   county: "TCH", rate: 87.2, capacity:   175, dlng:  0.25, dlat: -0.14 },
  { name: "天輪",   county: "TCH", rate: 84.0, capacity:   140, dlng:  0.22, dlat: -0.12 },
  { name: "馬鞍",   county: "TCH", rate: 71.2, capacity:   137, dlng:  0.18, dlat: -0.06 },
  { name: "明潭",   county: "NAN", rate: 72.5, capacity:  2820, dlng: -0.06, dlat: -0.08 },
  { name: "臺中港", county: "TCH", rate: 63.8, capacity:   480, dlng: -0.18, dlat:  0.02 },
  { name: "蘇澳",   county: "ILA", rate: 90.4, capacity:    65, dlng:  0.02, dlat: -0.10 },
  { name: "雙溪",   county: "NTP", rate: 82.3, capacity:   120, dlng:  0.18, dlat: -0.05 },
  { name: "西勢",   county: "KLC", rate: 86.1, capacity:    70, dlng: -0.06, dlat:  0.04 },
  { name: "新山子", county: "KLC", rate: 83.5, capacity:    50, dlng: -0.04, dlat:  0.05 },
  { name: "太平山", county: "ILA", rate: 86.8, capacity:    45, dlng: -0.08, dlat: -0.06 },
  { name: "佳冬",   county: "PIF", rate: 38.6, capacity:    35, dlng:  0.04, dlat: -0.12 },
  { name: "甘棠",   county: "KMN", rate: 56.4, capacity:    78, dlng:  0.02, dlat:  0.02 },
  { name: "榮湖",   county: "KMN", rate: 62.1, capacity:    60, dlng:  0.04, dlat: -0.02 },
  { name: "太湖",   county: "KMN", rate: 51.0, capacity:    52, dlng: -0.03, dlat:  0.01 },
];

export interface ReservoirPoint {
  id: string;
  name: string;
  county: CountyCode3;
  countyName: string;
  region: string;
  rate: number;
  capacity: number;
  lng: number;
  lat: number;
}

export const ALL_RESERVOIRS_MOCK: ReservoirPoint[] = RAW_RESERVOIRS.map((r) => {
  const c = byCode3[r.county];
  return {
    id: `${r.county}-${r.name}`,
    name: r.name,
    county: r.county,
    countyName: c?.name_zh ?? "",
    region: c?.region ?? "central",
    rate: r.rate,
    capacity: r.capacity,
    lng: (c?.centroid_lng ?? 121) + r.dlng,
    lat: (c?.centroid_lat ?? 23.7) + r.dlat,
  };
});

// ─────────────────────────────────────────────────
// 取 mock metric 值（給 choropleth 用）
// ─────────────────────────────────────────────────

export function getMockMetricValue(metric: string, code: CountyCode3): number | null {
  const row = WATER_BY_COUNTY_MOCK[code];
  if (!row) return null;
  switch (metric) {
    case "lpcd":               return row.lpcd;
    case "reservoir_rate":     return row.reservoir;
    case "sewage_coverage":    return row.sewage;
    case "rain_24hr":          return row.rain24;
    case "flood_high_risk_pct":return row.floodPct;
    default: return null;
  }
}
