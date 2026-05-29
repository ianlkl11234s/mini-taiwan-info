/**
 * Home theme mock data — 待 ETL 補真實前，給 H4/H5 趨勢線與 22 縣市 ranking 用
 *
 * SSOT 真實值（人口、出生死亡、老化指數現值）走 useNationalBasics → Supabase。
 * 本檔只負責：
 *   - HOME_BY_COUNTY        22 縣市老化指數 ranking
 *   - AGING_HISTORY         1994-2024 老化指數歷年（用於 H4 趨勢）
 *   - BIRTH_DEATH_HISTORY   2000-2026 出生死亡雙線（用於 H5 趨勢）
 *   - DENSITY_COMPARE       全球密度比較（用於 H3）
 *
 * 後續 ETL → `reference.national_basics_yearly` 補出生死亡歷年欄位後可移除。
 */

export interface HomeCountyDemographic {
  agingIndex: number;
  birthRate: number;
  deathRate: number;
  natural: number;
  townCount: number;
  growth: number;
}

/** 22 縣市老化指數等指標（mock）— 對齊 designs 2026-05-15 baseline */
export const HOME_BY_COUNTY: Record<string, HomeCountyDemographic> = {
  TPE: { agingIndex: 188.4, birthRate: 5.42, deathRate: 8.78,  natural: -3.36, townCount: 12, growth: -0.42 },
  NTP: { agingIndex: 145.6, birthRate: 6.21, deathRate: 7.32,  natural: -1.11, townCount: 29, growth: -0.18 },
  TYC: { agingIndex:  96.2, birthRate: 7.84, deathRate: 6.50,  natural:  1.34, townCount: 13, growth:  0.42 },
  HSC: { agingIndex:  96.1, birthRate: 8.92, deathRate: 5.41,  natural:  3.51, townCount:  3, growth:  0.62 },
  HSH: { agingIndex: 104.2, birthRate: 8.71, deathRate: 5.78,  natural:  2.93, townCount: 13, growth:  0.58 },
  MIA: { agingIndex: 168.4, birthRate: 5.30, deathRate: 8.84,  natural: -3.54, townCount: 18, growth: -0.34 },
  TCH: { agingIndex: 127.6, birthRate: 6.62, deathRate: 6.91,  natural: -0.29, townCount: 29, growth:  0.12 },
  CHA: { agingIndex: 178.0, birthRate: 4.97, deathRate: 9.31,  natural: -4.34, townCount: 26, growth: -0.41 },
  NAN: { agingIndex: 197.6, birthRate: 4.62, deathRate: 11.21, natural: -6.59, townCount: 13, growth: -0.71 },
  YUN: { agingIndex: 207.8, birthRate: 4.21, deathRate: 12.10, natural: -7.89, townCount: 20, growth: -0.82 },
  CYC: { agingIndex: 178.6, birthRate: 5.20, deathRate: 9.10,  natural: -3.90, townCount:  2, growth: -0.34 },
  CYH: { agingIndex: 239.3, birthRate: 4.13, deathRate: 14.20, natural:-10.07, townCount: 18, growth: -1.10 },
  TNN: { agingIndex: 168.4, birthRate: 5.10, deathRate: 8.95,  natural: -3.85, townCount: 37, growth: -0.36 },
  KHH: { agingIndex: 156.4, birthRate: 5.62, deathRate: 8.18,  natural: -2.56, townCount: 38, growth: -0.28 },
  PIF: { agingIndex: 182.8, birthRate: 5.34, deathRate: 10.42, natural: -5.08, townCount: 33, growth: -0.51 },
  ILA: { agingIndex: 161.3, birthRate: 5.72, deathRate: 9.10,  natural: -3.38, townCount: 12, growth: -0.25 },
  HUA: { agingIndex: 168.4, birthRate: 6.20, deathRate: 9.85,  natural: -3.65, townCount: 13, growth: -0.34 },
  TTT: { agingIndex: 175.1, birthRate: 6.80, deathRate: 10.20, natural: -3.40, townCount: 16, growth: -0.27 },
  PEH: { agingIndex: 124.6, birthRate: 6.92, deathRate: 8.30,  natural: -1.38, townCount:  6, growth: -0.14 },
  KMN: { agingIndex:  78.4, birthRate: 9.41, deathRate: 5.62,  natural:  3.79, townCount:  6, growth:  0.62 },
  LCC: { agingIndex:  82.4, birthRate: 9.10, deathRate: 5.20,  natural:  3.90, townCount:  4, growth:  1.42 },
  KLC: { agingIndex: 173.4, birthRate: 5.12, deathRate: 9.06,  natural: -3.94, townCount:  7, growth: -0.51 },
};

/** 老化指數歷年（1994-2024）— 平滑遞增，2024 = 178.57 對齊 baseline */
export const AGING_HISTORY: Array<{ year: number; value: number }> = (() => {
  const arr: Array<{ year: number; value: number }> = [];
  // 從 60 線性 + 微噪音遞增到 178.57
  let v = 60;
  for (let y = 1994; y <= 2024; y++) {
    const step = (178.57 - 60) / (2024 - 1994);
    v += step + (((y * 31) % 7) - 3) * 0.4;  // deterministic micro noise
    arr.push({ year: y, value: +v.toFixed(1) });
  }
  arr[arr.length - 1].value = 178.57;
  return arr;
})();

/** 出生 vs 死亡率歷年（2000-2026，‰）— 2020 死亡交叉 */
export const BIRTH_DEATH_HISTORY: Array<{ year: number; birth: number; death: number }> = (() => {
  const arr: Array<{ year: number; birth: number; death: number }> = [];
  for (let y = 2000; y <= 2026; y++) {
    const t = (y - 2000) / 26;
    // 出生率：13.8 → 4.26
    const b = 13.8 - 9.4 * Math.pow(t, 1.15) + (((y * 17) % 5) - 2) * 0.06;
    // 死亡率：5.7 → 8.36
    const d = 5.7 + 2.6 * t + (((y * 23) % 5) - 2) * 0.05;
    arr.push({ year: y, birth: +b.toFixed(2), death: +d.toFixed(2) });
  }
  arr[arr.length - 1].birth = 4.26;
  arr[arr.length - 1].death = 8.36;
  return arr;
})();

/** 全球人口密度比較（人/km²）— 用於 H3 density chip */
export const DENSITY_COMPARE: Array<{ name: string; v: number; self: boolean }> = [
  { name: "新加坡", v: 8358, self: false },
  { name: "孟加拉", v: 1265, self: false },
  { name: "台灣",   v: 642.66, self: true },
  { name: "韓國",   v: 532,    self: false },
  { name: "日本",   v: 333,    self: false },
];

/* ─────────────────────────────────────────────────
   ViewB Home — per-county 補充 mock（移植自設計檔 view-b.jsx）
   待 ETL：`reference.national_basics_by_county_yearly`
   （鄉鎮市區人口排名已接真實：demographics.township_rank，見 useTownshipData）
─────────────────────────────────────────────────── */

/** 直轄市升格年（含臺北 1967） */
export const MUNI_INFO: Record<string, { year: number }> = {
  TPE: { year: 1967 },
  NTP: { year: 2010 },
  TYC: { year: 2014 },
  TCH: { year: 2010 },
  TNN: { year: 2010 },
  KHH: { year: 1979 },
};

/** 縣市海岸線長度（km；內陸 = 0） */
export const COASTAL_COUNTIES: Record<string, number> = {
  TPE: 0,   NTP: 122, TYC: 38,  HSC: 18,  HSH: 17,  MIA: 50,
  TCH: 41,  CHA: 61,  YUN: 53,  CYC: 41,  TNN: 65,  KHH: 63,
  PIF: 89,  ILA: 106, HUA: 122, TTT: 176, PEH: 320, KMN: 134,
  LCC: 130, KLC: 17,  NAN: 0,   CYH: 0,
};
