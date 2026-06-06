// frontend/src/lib/mock-medical.ts
// Medical theme mock data — converted from prototype data-medical.js

import type { CountyCode3 } from "./types";

// ---------------------------------------------------------------------------
// National totals
// ---------------------------------------------------------------------------

export interface MedicalNational {
  hospitals: number;
  clinics: number;
  pharmacies: number;
  nursingFacility: number;
  nursingBeds: number;
  aed: number;
  emergencyHosp: number;
  ems5moDispatch: number;
  desertPct: number;
  ltcSites: number;
  ltcA: number;
  ltcB: number;
  ltcC: number;
  influenza: number;
  enterovirus: number;
  diarrhea: number;
  redEye: number;
  triage1In8hr: number;
  triage2In8hr: number;
  triage3In8hr: number;
  hospitalDelta: number;
  aedDelta: number;
  ltcSitesDelta: number;
  fluDelta: number;
}

export const MEDICAL_NATIONAL: MedicalNational = {
  hospitals: 480,
  clinics: 23700,
  pharmacies: 7680,
  nursingFacility: 1499,
  nursingBeds: 49775,
  aed: 15490,
  emergencyHosp: 252,
  ems5moDispatch: 360890,
  desertPct: 8.4,
  ltcSites: 30764,
  ltcA: 856,
  ltcB: 24017,
  ltcC: 5891,
  influenza: 172418,
  enterovirus: 33245,
  diarrhea: 72481,
  redEye: 9824,
  triage1In8hr: 65,
  triage2In8hr: 62,
  triage3In8hr: 69,
  hospitalDelta: -2,
  aedDelta: 618,
  ltcSitesDelta: 4218,
  fluDelta: 12.4,
};

// ---------------------------------------------------------------------------
// Per-county data (22 counties)
// ---------------------------------------------------------------------------

export interface MedicalCountyData {
  hosp: number;
  clinic: number;
  pharm: number;
  nfac: number;
  nbed: number;
  aed: number;
  eHosp: number;
  ems: number;
  desert: number;
  ltc: number;
  ltcA: number;
  ltcB: number;
  ltcC: number;
  flu: number;
  ev: number;
  diar: number;
  red: number;
}

export const MEDICAL_BY_COUNTY: Record<CountyCode3, MedicalCountyData> = {
  TPE: { hosp: 42, clinic: 3431, pharm: 987, nfac: 133, nbed: 4399, aed: 3174, eHosp: 35, ems: 54951, desert: 0.4, ltc: 2549, ltcA: 68, ltcB: 1893, ltcC: 588, flu: 13082, ev: 2168, diar: 5321, red: 853 },
  NTP: { hosp: 38, clinic: 3187, pharm: 1102, nfac: 163, nbed: 5853, aed: 2600, eHosp: 30, ems: 80038, desert: 4.2, ltc: 3427, ltcA: 89, ltcB: 2684, ltcC: 654, flu: 14832, ev: 3190, diar: 6871, red: 939 },
  TYC: { hosp: 22, clinic: 1615, pharm: 568, nfac: 90, nbed: 3561, aed: 976, eHosp: 15, ems: 41992, desert: 6.8, ltc: 1861, ltcA: 41, ltcB: 1508, ltcC: 312, flu: 12120, ev: 2341, diar: 4792, red: 659 },
  HSC: { hosp: 8, clinic: 397, pharm: 145, nfac: 17, nbed: 461, aed: 290, eHosp: 4, ems: 8200, desert: 3.1, ltc: 340, ltcA: 9, ltcB: 275, ltcC: 56, flu: 2980, ev: 520, diar: 1280, red: 162 },
  HSH: { hosp: 7, clinic: 293, pharm: 167, nfac: 31, nbed: 1109, aed: 220, eHosp: 4, ems: 7800, desert: 12.4, ltc: 478, ltcA: 11, ltcB: 381, ltcC: 86, flu: 3210, ev: 610, diar: 1421, red: 184 },
  MIA: { hosp: 11, clinic: 389, pharm: 190, nfac: 35, nbed: 1484, aed: 240, eHosp: 6, ems: 8400, desert: 18.2, ltc: 612, ltcA: 14, ltcB: 482, ltcC: 116, flu: 3120, ev: 580, diar: 1380, red: 178 },
  TCH: { hosp: 37, clinic: 2604, pharm: 797, nfac: 145, nbed: 4929, aed: 1264, eHosp: 25, ems: 53533, desert: 5.6, ltc: 2714, ltcA: 62, ltcB: 2155, ltcC: 497, flu: 12574, ev: 2648, diar: 5048, red: 695 },
  CHA: { hosp: 15, clinic: 908, pharm: 411, nfac: 66, nbed: 2960, aed: 560, eHosp: 10, ems: 21420, desert: 9.4, ltc: 1420, ltcA: 28, ltcB: 1102, ltcC: 290, flu: 6940, ev: 1380, diar: 2820, red: 392 },
  NAN: { hosp: 10, clinic: 370, pharm: 132, nfac: 31, nbed: 1456, aed: 282, eHosp: 6, ems: 6800, desert: 24.6, ltc: 580, ltcA: 13, ltcB: 462, ltcC: 105, flu: 2840, ev: 582, diar: 1180, red: 162 },
  YUN: { hosp: 8, clinic: 427, pharm: 200, nfac: 32, nbed: 1720, aed: 316, eHosp: 6, ems: 12480, desert: 14.8, ltc: 720, ltcA: 16, ltcB: 556, ltcC: 148, flu: 3680, ev: 728, diar: 1582, red: 218 },
  CYC: { hosp: 11, clinic: 366, pharm: 112, nfac: 33, nbed: 1372, aed: 185, eHosp: 4, ems: 4800, desert: 1.2, ltc: 220, ltcA: 6, ltcB: 175, ltcC: 39, flu: 2120, ev: 410, diar: 956, red: 124 },
  CYH: { hosp: 4, clinic: 253, pharm: 154, nfac: 25, nbed: 1410, aed: 198, eHosp: 4, ems: 6420, desert: 21.3, ltc: 548, ltcA: 12, ltcB: 428, ltcC: 108, flu: 2580, ev: 502, diar: 1118, red: 145 },
  TNN: { hosp: 26, clinic: 1745, pharm: 655, nfac: 102, nbed: 4085, aed: 868, eHosp: 18, ems: 40401, desert: 7.8, ltc: 2413, ltcA: 43, ltcB: 1852, ltcC: 518, flu: 8972, ev: 1842, diar: 3781, red: 512 },
  KHH: { hosp: 38, clinic: 2447, pharm: 939, nfac: 133, nbed: 4800, aed: 1312, eHosp: 28, ems: 57767, desert: 11.2, ltc: 3212, ltcA: 66, ltcB: 2506, ltcC: 640, flu: 10756, ev: 2533, diar: 5162, red: 687 },
  PIF: { hosp: 14, clinic: 533, pharm: 294, nfac: 52, nbed: 2476, aed: 430, eHosp: 9, ems: 14820, desert: 19.6, ltc: 1060, ltcA: 22, ltcB: 832, ltcC: 206, flu: 4820, ev: 982, diar: 2120, red: 286 },
  ILA: { hosp: 9, clinic: 335, pharm: 172, nfac: 45, nbed: 760, aed: 280, eHosp: 6, ems: 9100, desert: 15.3, ltc: 680, ltcA: 15, ltcB: 525, ltcC: 140, flu: 3420, ev: 680, diar: 1480, red: 198 },
  HUA: { hosp: 10, clinic: 265, pharm: 114, nfac: 28, nbed: 868, aed: 234, eHosp: 6, ems: 6200, desert: 28.4, ltc: 540, ltcA: 12, ltcB: 410, ltcC: 118, flu: 2380, ev: 482, diar: 1080, red: 142 },
  TTT: { hosp: 6, clinic: 132, pharm: 62, nfac: 16, nbed: 500, aed: 216, eHosp: 5, ems: 5540, desert: 35.8, ltc: 623, ltcA: 14, ltcB: 450, ltcC: 159, flu: 1330, ev: 278, diar: 621, red: 123 },
  PEH: { hosp: 3, clinic: 63, pharm: 26, nfac: 7, nbed: 127, aed: 115, eHosp: 2, ems: 1824, desert: 18.6, ltc: 155, ltcA: 6, ltcB: 109, ltcC: 40, flu: 522, ev: 124, diar: 286, red: 42 },
  KMN: { hosp: 3, clinic: 44, pharm: 25, nfac: 6, nbed: 64, aed: 86, eHosp: 2, ems: 1240, desert: 12.4, ltc: 82, ltcA: 3, ltcB: 62, ltcC: 17, flu: 368, ev: 82, diar: 204, red: 31 },
  LCC: { hosp: 1, clinic: 5, pharm: 3, nfac: 1, nbed: 4, aed: 11, eHosp: 1, ems: 73, desert: 42.8, ltc: 13, ltcA: 1, ltcB: 8, ltcC: 4, flu: 79, ev: 17, diar: 54, red: 11 },
  KLC: { hosp: 9, clinic: 274, pharm: 108, nfac: 20, nbed: 484, aed: 340, eHosp: 5, ems: 10200, desert: 3.8, ltc: 400, ltcA: 9, ltcB: 312, ltcC: 79, flu: 3280, ev: 638, diar: 1421, red: 192 },
};

// ---------------------------------------------------------------------------
// Hospital tier distribution
// ---------------------------------------------------------------------------

export interface HospitalTier {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

export const MEDICAL_HOSPITAL_TIER: HospitalTier[] = [
  { id: "center", label: "醫學中心", value: 26, pct: 5.4, color: "#047857" },
  { id: "regional", label: "區域醫院", value: 82, pct: 17.1, color: "#10B981" },
  { id: "local", label: "地區醫院", value: 372, pct: 77.5, color: "#A7F3D0" },
];

// ---------------------------------------------------------------------------
// Long-term care ABC tiers
// ---------------------------------------------------------------------------

export interface LtcTier {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
  note: string;
}

export const MEDICAL_LTC_TIER: LtcTier[] = [
  { id: "A", label: "A 級 · 社區整合型", value: 856, pct: 2.8, color: "#047857", note: "核心服務站" },
  { id: "B", label: "B 級 · 複合型", value: 24017, pct: 78.1, color: "#10B981", note: "複合長照服務" },
  { id: "C", label: "C 級 · 巷弄站", value: 5891, pct: 19.1, color: "#6EE7B7", note: "貼近社區" },
];

// ---------------------------------------------------------------------------
// Epidemic trend (weekly data for 4 diseases)
// ---------------------------------------------------------------------------

export interface EpidemicPoint {
  x: number;
  y: number;
}

export interface EpidemicTrend {
  flu: EpidemicPoint[];
  ev: EpidemicPoint[];
  di: EpidemicPoint[];
  re: EpidemicPoint[];
  weeks: number;
}

function generateEpidemicTrend(): EpidemicTrend {
  const weeks = 22;

  function _r(s: number) {
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  const r = _r(914);
  const flu: EpidemicPoint[] = [];
  const ev: EpidemicPoint[] = [];
  const di: EpidemicPoint[] = [];
  const re: EpidemicPoint[] = [];

  for (let w = 1; w <= weeks; w++) {
    const fluBase = 9000 - w * 280 + (r() - 0.5) * 1200;
    flu.push({ x: w, y: Math.max(2400, Math.round(fluBase)) });

    const evBase = 800 + w * 95 + (r() - 0.5) * 220;
    ev.push({ x: w, y: Math.round(evBase) });

    di.push({ x: w, y: Math.round(3200 + Math.sin(w / 3) * 800 + (r() - 0.5) * 380) });
    re.push({ x: w, y: Math.round(420 + (r() - 0.5) * 80) });
  }

  return { flu, ev, di, re, weeks };
}

export const MEDICAL_EPIDEMIC_TREND: EpidemicTrend = generateEpidemicTrend();

// ---------------------------------------------------------------------------
// ER quality indicators
// ---------------------------------------------------------------------------

export interface ErQualityItem {
  id: string;
  label: string;
  pct: number;
  target: number;
  severity: "info" | "warn" | "danger";
  reverse?: boolean;
}

export const MEDICAL_ER_QUALITY: ErQualityItem[] = [
  { id: "t1", label: "檢傷一級 <8hr 轉床", pct: 79.4, target: 80, severity: "info" },
  { id: "t2", label: "檢傷二級 <8hr 轉床", pct: 62.1, target: 70, severity: "warn" },
  { id: "t3", label: "檢傷三級 <8hr 轉床", pct: 69.0, target: 75, severity: "warn" },
  { id: "stay", label: "急診暫留 >48hr 比率", pct: 6.8, target: 3, severity: "danger", reverse: true },
];

// ---------------------------------------------------------------------------
// Overview / hero section
// ---------------------------------------------------------------------------

export interface MedicalOverview {
  topHospCounty: string;
  topHospCountyN: number;
  desertWorst: string;
  desertWorstPct: number;
  ltcSitesGrowth: number;
  fluYoY: number;
  redItems: { label: string; reason: string }[];
}

export const MEDICAL_OVERVIEW: MedicalOverview = {
  topHospCounty: "臺北市",
  topHospCountyN: 42,
  desertWorst: "臺東縣",
  desertWorstPct: 35.8,
  ltcSitesGrowth: 15.9,
  fluYoY: 12.4,
  redItems: [
    { label: "醫師數明細", reason: "NHI 39296 待匯入" },
    { label: "等時圈醫療沙漠", reason: "OSRM 計算待跑" },
    { label: "COVID-19 監測", reason: "dataset 177292 接通中" },
    { label: "院別評鑑結果", reason: "衛福部 PDF 半結構化" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers: rankings from county data
// ---------------------------------------------------------------------------

import { COUNTIES, byCode3 } from "./counties";

export interface MedRankRow {
  code: string;
  name: string;
  value: number;
}

export function medRankBy(key: keyof MedicalCountyData): MedRankRow[] {
  return COUNTIES.map((c) => ({
    code: c.code3,
    name: c.name_zh,
    value: MEDICAL_BY_COUNTY[c.code3 as CountyCode3]?.[key] ?? 0,
  })).sort((a, b) => b.value - a.value);
}

export function medRankHospPerWan(): MedRankRow[] {
  return COUNTIES.map((c) => ({
    code: c.code3,
    name: c.name_zh,
    value: +(MEDICAL_BY_COUNTY[c.code3 as CountyCode3]?.hosp / c.pop_2024_wan).toFixed(2),
  })).sort((a, b) => b.value - a.value);
}

// ---------------------------------------------------------------------------
// Choropleth metric calculation
// ---------------------------------------------------------------------------

export function getMedicalMetricValue(metric: string, code: CountyCode3): number | null {
  const m = MEDICAL_BY_COUNTY[code];
  if (!m) return null;
  const c = byCode3[code];
  if (!c) return null;
  switch (metric) {
    case "med_hosp_per_wan": return +(m.hosp / c.pop_2024_wan).toFixed(3);
    case "med_aed": return m.aed;
    case "med_ltc": return m.ltc;
    case "med_desert": return m.desert;
    case "med_flu": return m.flu;
    default: return null;
  }
}
