/**
 * Mock data for fire theme — only used for components whose backend data
 * is NOT yet imported (Sprint 2/3/4 deliverables).
 *
 * Each entry tagged with `待ETL` and a Sprint reference so UI can surface
 * the placeholder status.
 *
 * 拍板 (2026-05-15)：真實資料優先 > mock。Sprint 進度後逐項替換真實資料。
 */

import type { CountyCode3 } from "./types";

// ────────────────────────────────────────────────────────
// 設計來源：data-fire.js（v03 design bundle）
// 全部標 待ETL，UI 上以 "資料 placeholder" badge 顯示
// ────────────────────────────────────────────────────────

export interface FireMockCounty {
  /** 分隊數 (Sprint 2) */
  stations: number;
  stationsPerWan: number;
  stationsPer100km2: number;
  /** 5min 圈外人口比 (Sprint 3) */
  outOf5MinPct: number;
  /** 消防栓總數 (Sprint 2，限 4 都) */
  hydrants: number;
  /** OHCA 件數 (Sprint 4，限部分縣市) */
  ohca: number;
  /** 救護出勤 (Sprint 4) */
  emsTrips: number;
  /** 急救醫院 (Sprint 4) */
  hospitals: number;
  /** 山林風險點 (Sprint 4) */
  riskPoints: number;
  /** 火災財損 百萬 (Sprint 1 TODO-3) */
  damageMillion: number;
}

/**
 * 待ETL — 22 縣市 placeholder
 * 真實資料端口（Sprint 1-4 完成後 swap）
 */
export const FIRE_MOCK_BY_COUNTY: Record<CountyCode3, FireMockCounty> = {
  TPE: { stations:  65, stationsPerWan: 2.6, stationsPer100km2: 24.0, outOf5MinPct:  0.2, hydrants: 32500, ohca: 612, emsTrips: 320500, hospitals: 22, riskPoints:  42, damageMillion:  48 },
  NTP: { stations: 101, stationsPerWan: 2.5, stationsPer100km2:  4.9, outOf5MinPct:  3.8, hydrants:     0, ohca: 902, emsTrips: 415200, hospitals: 28, riskPoints: 128, damageMillion:  96 },
  TYC: { stations:  56, stationsPerWan: 2.4, stationsPer100km2:  4.6, outOf5MinPct:  6.4, hydrants:     0, ohca: 480, emsTrips: 282400, hospitals: 18, riskPoints:  84, damageMillion:  72 },
  HSC: { stations:  12, stationsPerWan: 2.7, stationsPer100km2: 11.5, outOf5MinPct:  1.0, hydrants:     0, ohca:  92, emsTrips:  58200, hospitals:  6, riskPoints:  12, damageMillion:  14 },
  HSH: { stations:  18, stationsPerWan: 3.1, stationsPer100km2:  1.3, outOf5MinPct: 14.2, hydrants:     0, ohca:  86, emsTrips:  62100, hospitals:  4, riskPoints:  68, damageMillion:  18 },
  MIA: { stations:  21, stationsPerWan: 3.9, stationsPer100km2:  1.2, outOf5MinPct: 18.4, hydrants:     0, ohca:  78, emsTrips:  58400, hospitals:  3, riskPoints:  92, damageMillion:  21 },
  TCH: { stations:  78, stationsPerWan: 2.8, stationsPer100km2:  3.5, outOf5MinPct:  8.2, hydrants: 22100, ohca: 560, emsTrips: 340800, hospitals: 24, riskPoints: 152, damageMillion:  86 },
  CHA: { stations:  28, stationsPerWan: 2.3, stationsPer100km2:  2.6, outOf5MinPct: 11.6, hydrants:     0, ohca: 240, emsTrips: 152300, hospitals: 10, riskPoints:  64, damageMillion:  38 },
  NAN: { stations:  24, stationsPerWan: 4.9, stationsPer100km2:  0.6, outOf5MinPct: 24.8, hydrants:     0, ohca:  84, emsTrips:  61400, hospitals:  3, riskPoints: 184, damageMillion:  18 },
  YUN: { stations:  27, stationsPerWan: 4.1, stationsPer100km2:  2.1, outOf5MinPct: 10.8, hydrants:     0, ohca: 152, emsTrips:  89200, hospitals:  4, riskPoints:  72, damageMillion:  24 },
  CYC: { stations:   8, stationsPerWan: 3.0, stationsPer100km2: 13.3, outOf5MinPct:  0.4, hydrants:     0, ohca:  64, emsTrips:  42100, hospitals:  3, riskPoints:   8, damageMillion:   9 },
  CYH: { stations:  20, stationsPerWan: 4.1, stationsPer100km2:  1.1, outOf5MinPct: 21.4, hydrants:     0, ohca:  72, emsTrips:  56800, hospitals:  2, riskPoints: 112, damageMillion:  16 },
  TNN: { stations:  54, stationsPerWan: 2.9, stationsPer100km2:  2.5, outOf5MinPct:  9.8, hydrants: 18200, ohca: 380, emsTrips: 218300, hospitals: 16, riskPoints: 142, damageMillion:  62 },
  KHH: { stations:  62, stationsPerWan: 2.3, stationsPer100km2:  2.1, outOf5MinPct: 12.4, hydrants: 28300, ohca: 502, emsTrips: 286400, hospitals: 21, riskPoints: 168, damageMillion:  82 },
  PIF: { stations:  31, stationsPerWan: 3.9, stationsPer100km2:  1.1, outOf5MinPct: 22.6, hydrants:     0, ohca: 184, emsTrips: 102400, hospitals:  6, riskPoints: 196, damageMillion:  41 },
  ILA: { stations:  22, stationsPerWan: 4.9, stationsPer100km2:  1.0, outOf5MinPct: 16.2, hydrants:     0, ohca:  98, emsTrips:  72100, hospitals:  3, riskPoints:  86, damageMillion:  19 },
  HUA: { stations:  26, stationsPerWan: 8.2, stationsPer100km2:  0.6, outOf5MinPct: 28.4, hydrants:     0, ohca:  86, emsTrips:  60200, hospitals:  3, riskPoints: 148, damageMillion:  17 },
  TTT: { stations:  29, stationsPerWan:13.6, stationsPer100km2:  0.8, outOf5MinPct: 28.0, hydrants:     0, ohca:  72, emsTrips:  48200, hospitals:  3, riskPoints: 142, damageMillion:  11 },
  PEH: { stations:   9, stationsPerWan: 8.4, stationsPer100km2:  7.1, outOf5MinPct:  6.4, hydrants:     0, ohca:  18, emsTrips:  12400, hospitals:  1, riskPoints:   8, damageMillion:   2 },
  KMN: { stations:   8, stationsPerWan: 5.6, stationsPer100km2:  5.3, outOf5MinPct:  8.2, hydrants:     0, ohca:  16, emsTrips:  10200, hospitals:  1, riskPoints:  12, damageMillion:   3 },
  LCC: { stations:   5, stationsPerWan:38.5, stationsPer100km2: 17.2, outOf5MinPct:  5.0, hydrants:     0, ohca:   4, emsTrips:   1800, hospitals:  1, riskPoints:   2, damageMillion:   0.4 },
  KLC: { stations:  12, stationsPerWan: 3.3, stationsPer100km2:  9.0, outOf5MinPct:  4.6, hydrants:     0, ohca:  56, emsTrips:  38400, hospitals:  3, riskPoints:  18, damageMillion:  11 },
};

/** 4 都消防栓統計 (Sprint 2 待 ETL) */
export interface FireHydrantStats {
  code: CountyCode3;
  county: string;
  total: number;
  ground: number;
  underground: number;
  densityPerKm2: number;
}

export const FIRE_HYDRANT_STATS: FireHydrantStats[] = [
  { code: "TPE", county: "臺北市", total: 32500, ground: 28400, underground: 4100, densityPerKm2: 119.9 },
  { code: "KHH", county: "高雄市", total: 28300, ground: 25200, underground: 3100, densityPerKm2:   9.6 },
  { code: "TCH", county: "臺中市", total: 22100, ground: 19800, underground: 2300, densityPerKm2:  10.0 },
  { code: "TNN", county: "臺南市", total: 18200, ground: 16500, underground: 1700, densityPerKm2:   8.3 },
];

/** 災變時間軸 (Sprint 4 待中央災變紀錄 ETL) */
export interface FireDisasterEvent {
  year: number;
  date: string;
  name: string;
  deaths: number;
  injuries: number;
  tag: "颱風" | "地震" | "事故";
}

export const FIRE_DISASTER_TIMELINE: FireDisasterEvent[] = [
  { year: 2024, date: "2024-07-25", name: "凱米颱風",     deaths:  6, injuries:  23, tag: "颱風" },
  { year: 2023, date: "2023-09-03", name: "海葵颱風",     deaths:  0, injuries:  12, tag: "颱風" },
  { year: 2022, date: "2022-09-18", name: "0918 池上地震", deaths:  1, injuries: 146, tag: "地震" },
  { year: 2021, date: "2021-04-02", name: "太魯閣號出軌", deaths: 49, injuries: 213, tag: "事故" },
  { year: 2020, date: "2020-10-29", name: "玉里地震",     deaths:  0, injuries:  14, tag: "地震" },
  { year: 2019, date: "2019-10-01", name: "南方澳大橋斷裂", deaths: 6, injuries:  12, tag: "事故" },
];

/** 起火處所 (Sprint 1 TODO-3 待 MOI 統計處 ETL) */
export interface FireLocationRow {
  label: string;
  incidents: number;
  pct: number;
  fatalityRate: number;
}

export const FIRE_LOCATIONS_MOCK: FireLocationRow[] = [
  { label: "住宅",       incidents: 4210, pct: 27.3, fatalityRate: 1.2 },
  { label: "工廠/倉儲",  incidents: 1540, pct: 10.0, fatalityRate: 0.8 },
  { label: "車輛",       incidents: 1820, pct: 11.8, fatalityRate: 0.4 },
  { label: "山林田野",   incidents: 2310, pct: 15.0, fatalityRate: 0.1 },
  { label: "商店",       incidents:  680, pct:  4.4, fatalityRate: 0.7 },
  { label: "其他",       incidents: 4845, pct: 31.5, fatalityRate: 0.6 },
];

/** 全國 mock placeholder（Sprint 1-4 各項） */
export const FIRE_NATIONAL_MOCK = {
  /** 火災財損 百萬 (Sprint 1 TODO-3 待 ETL) */
  damageMillion: 838,
  damageDeltaPct: 12.4,
  /** 消防分隊總數 (Sprint 2 待 ETL) */
  stationsTotal: 629,
  stationsDelta: 4,
  /** 消防栓總數 — 4 都 (Sprint 2 待 ETL) */
  hydrantsTotal: 101100,
  /** 分隊密度 (Sprint 3 待 ETL) */
  stationsPerWan: 1.8,
  stationsPer100Km2: 4.2,
  outOf5MinPct: 8.3,
  /** 救護出勤 (Sprint 4 待 ETL) */
  emsTrips: 4200000,
  emsTripsDelta: 3.1,
  emergencyHospitals: 178,
  forestRiskPoints: 1842,
};

/** 區域顏色 (scatter 用) */
export const FIRE_REGION_COLORS: Record<string, string> = {
  north:   "#0EA5E9",
  central: "#F59E0B",
  south:   "#DC2626",
  east:    "#10B981",
  island:  "#8B5CF6",
};

/** 嚴重度色碼 (5 大類起火原因) */
export const FIRE_SEVERITY_COLORS: Record<string, string> = {
  high:    "#DC2626",
  med:     "#F59E0B",
  low:     "#10B981",
  unknown: "#9CA3AF",
};
