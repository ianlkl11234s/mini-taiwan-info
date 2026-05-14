/* ============================================================
   Mini Taiwan Info — Mock data
   References: water.md, home-basics.md
   ============================================================ */

// 22 縣市基本資料：[code, name, population(萬), area(km²), centroid lng/lat]
window.COUNTIES = [
  { code: "TPE", name: "臺北市",   pop: 248.8, area: 271,  lng: 121.565, lat: 25.038, region: "north" },
  { code: "NTP", name: "新北市",   pop: 403.2, area: 2052, lng: 121.609, lat: 25.012, region: "north" },
  { code: "TYC", name: "桃園市",   pop: 230.4, area: 1221, lng: 121.220, lat: 24.953, region: "north" },
  { code: "HSC", name: "新竹市",   pop:  44.8, area: 104,  lng: 120.969, lat: 24.807, region: "north" },
  { code: "HSH", name: "新竹縣",   pop:  58.2, area: 1427, lng: 121.130, lat: 24.683, region: "north" },
  { code: "MIA", name: "苗栗縣",   pop:  53.9, area: 1820, lng: 120.943, lat: 24.488, region: "central" },
  { code: "TCH", name: "臺中市",   pop: 283.0, area: 2215, lng: 120.967, lat: 24.149, region: "central" },
  { code: "CHA", name: "彰化縣",   pop: 124.4, area: 1074, lng: 120.541, lat: 23.999, region: "central" },
  { code: "NAN", name: "南投縣",   pop:  48.5, area: 4106, lng: 120.971, lat: 23.961, region: "central" },
  { code: "YUN", name: "雲林縣",   pop:  66.1, area: 1290, lng: 120.431, lat: 23.709, region: "central" },
  { code: "CYC", name: "嘉義市",   pop:  26.4, area: 60,   lng: 120.452, lat: 23.481, region: "south" },
  { code: "CYH", name: "嘉義縣",   pop:  48.7, area: 1903, lng: 120.574, lat: 23.450, region: "south" },
  { code: "TNN", name: "臺南市",   pop: 184.6, area: 2191, lng: 120.227, lat: 23.130, region: "south" },
  { code: "KHH", name: "高雄市",   pop: 273.4, area: 2952, lng: 120.566, lat: 22.628, region: "south" },
  { code: "PIF", name: "屏東縣",   pop:  78.9, area: 2776, lng: 120.620, lat: 22.555, region: "south" },
  { code: "ILA", name: "宜蘭縣",   pop:  44.7, area: 2143, lng: 121.633, lat: 24.703, region: "east" },
  { code: "HUA", name: "花蓮縣",   pop:  31.7, area: 4628, lng: 121.382, lat: 23.737, region: "east" },
  { code: "TTT", name: "臺東縣",   pop:  21.3, area: 3515, lng: 121.110, lat: 22.760, region: "east" },
  { code: "PEH", name: "澎湖縣",   pop:  10.7, area: 127,  lng: 119.617, lat: 23.567, region: "island" },
  { code: "KMN", name: "金門縣",   pop:  14.2, area: 152,  lng: 118.317, lat: 24.450, region: "island" },
  { code: "LCC", name: "連江縣",   pop:   1.3, area: 29,   lng: 119.953, lat: 26.160, region: "island" },
  { code: "KLC", name: "基隆市",   pop:  36.0, area: 133,  lng: 121.744, lat: 25.131, region: "north" },
];

// Quick lookup
window.byCode = Object.fromEntries(COUNTIES.map((c) => [c.code, c]));

// 主題定義
window.THEMES = [
  { id: "home",        name: "基礎",     icon: "home",   accent: "var(--accent-home)",        cssVar: "home" },
  { id: "water",       name: "水資源",   icon: "water",  accent: "var(--accent-water)",       cssVar: "water" },
  { id: "fire",        name: "火災",     icon: "fire",   accent: "var(--accent-fire)",        cssVar: "fire",       disabled: true },
  { id: "medical",     name: "醫療",     icon: "medical",accent: "var(--accent-medical)",     cssVar: "medical",    disabled: true },
  { id: "transport",   name: "交通",     icon: "car",    accent: "var(--accent-transport)",   cssVar: "transport",  disabled: true },
  { id: "population",  name: "人口",     icon: "users",  accent: "var(--accent-population)",  cssVar: "population", disabled: true },
  { id: "environment", name: "環境",     icon: "leaf",   accent: "var(--accent-environment)", cssVar: "environment",disabled: true },
  { id: "realestate",  name: "不動產",   icon: "house",  accent: "var(--accent-real-estate)", cssVar: "realestate", disabled: true },
];

/* ===== 水資源資料 ===== */
// LPCD 人均日用水量 (L)   ranking_better=lower
// sewage 接管率 (%)        ranking_better=higher
// reservoir 蓄水率 (%)
// rain24 24hr雨量 (mm)
// pollutionFines 水污染罰鍰 (千元)
// floodPct 淹水高潛勢面積佔比 (%)
// reservoirs: 該縣市水庫數
// wwtp: 該縣市汙水處理廠數
window.WATER_BY_COUNTY = {
  TPE: { lpcd: 332, sewage: 99.6, reservoir: 92.4, rain24: 18.2, pollutionFines: 412,  floodPct:  9.4, reservoirs: 1, wwtp:  3 },
  NTP: { lpcd: 269, sewage: 92.1, reservoir: 89.1, rain24: 16.7, pollutionFines: 1820, floodPct: 11.2, reservoirs: 1, wwtp:  8 },
  TYC: { lpcd: 295, sewage: 71.4, reservoir: 78.3, rain24: 12.3, pollutionFines: 3140, floodPct: 14.8, reservoirs: 2, wwtp:  6 },
  HSC: { lpcd: 268, sewage: 82.5, reservoir: 75.1, rain24: 10.1, pollutionFines: 730,  floodPct:  7.3, reservoirs: 0, wwtp:  2 },
  HSH: { lpcd: 304, sewage: 31.2, reservoir: 75.1, rain24: 11.4, pollutionFines: 920,  floodPct:  9.0, reservoirs: 1, wwtp:  2 },
  MIA: { lpcd: 312, sewage: 19.4, reservoir: 71.8, rain24:  9.7, pollutionFines: 540,  floodPct:  6.4, reservoirs: 2, wwtp:  1 },
  TCH: { lpcd: 289, sewage: 47.6, reservoir: 64.5, rain24:  9.4, pollutionFines: 4220, floodPct: 12.1, reservoirs: 3, wwtp:  5 },
  CHA: { lpcd: 295, sewage: 13.8, reservoir: 64.5, rain24:  7.6, pollutionFines: 2810, floodPct: 26.5, reservoirs: 0, wwtp:  3 },
  NAN: { lpcd: 277, sewage: 12.3, reservoir: 59.8, rain24: 14.2, pollutionFines: 290,  floodPct:  6.9, reservoirs: 1, wwtp:  1 },
  YUN: { lpcd: 290, sewage: 14.6, reservoir: 56.1, rain24:  7.1, pollutionFines: 1620, floodPct: 34.2, reservoirs: 0, wwtp:  2 },
  CYC: { lpcd: 186, sewage: 56.8, reservoir: 52.8, rain24:  6.4, pollutionFines: 220,  floodPct: 18.7, reservoirs: 0, wwtp:  1 },
  CYH: { lpcd: 248, sewage: 12.1, reservoir: 52.8, rain24:  6.7, pollutionFines: 410,  floodPct: 22.4, reservoirs: 1, wwtp:  1 },
  TNN: { lpcd: 264, sewage: 36.5, reservoir: 48.6, rain24:  5.8, pollutionFines: 3050, floodPct: 19.8, reservoirs: 2, wwtp:  4 },
  KHH: { lpcd: 285, sewage: 84.2, reservoir: 47.2, rain24:  5.4, pollutionFines: 5410, floodPct: 12.6, reservoirs: 3, wwtp: 12 },
  PIF: { lpcd: 273, sewage: 18.4, reservoir: 47.2, rain24:  8.2, pollutionFines: 1290, floodPct: 17.3, reservoirs: 1, wwtp:  3 },
  ILA: { lpcd: 258, sewage: 23.1, reservoir: 88.0, rain24: 42.8, pollutionFines: 480,  floodPct: 11.6, reservoirs: 0, wwtp:  2 },
  HUA: { lpcd: 261, sewage: 18.6, reservoir: 81.4, rain24: 28.1, pollutionFines: 130,  floodPct:  4.2, reservoirs: 0, wwtp:  2 },
  TTT: { lpcd: 205, sewage: 14.8, reservoir: 76.5, rain24: 21.4, pollutionFines:  80,  floodPct:  3.8, reservoirs: 0, wwtp:  1 },
  PEH: { lpcd: 224, sewage: 38.2, reservoir: 63.2, rain24:  4.5, pollutionFines:  40,  floodPct:  1.2, reservoirs: 1, wwtp:  1 },
  KMN: { lpcd: 232, sewage: 34.0, reservoir: 58.0, rain24:  3.8, pollutionFines:  20,  floodPct:  0.8, reservoirs: 3, wwtp:  1 },
  LCC: { lpcd: 218, sewage: 29.6, reservoir: 81.0, rain24:  9.1, pollutionFines:   8,  floodPct:  0.5, reservoirs: 0, wwtp:  1 },
  KLC: { lpcd: 212, sewage: 79.4, reservoir: 88.0, rain24: 21.1, pollutionFines: 210,  floodPct:  8.6, reservoirs: 0, wwtp:  2 },
};

/* ===== 基礎統計（人口）===== */
// agingIndex 老化指數 = 65歲以上 / 0-14歲 × 100
// birthRate / deathRate / naturalIncrease  ‰
// townCount 鄉鎮市區數
window.HOME_BY_COUNTY = {
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

/* ===== 全國 KPI 摘要 ===== */
window.WATER_NATIONAL = {
  reservoirRate: 72.3,
  reservoirRateDelta: +3.8,         // 較昨日 pp
  rain24: 12.4,
  rain24Delta: -4.2,
  alertReservoirs: 4,
  alertReservoirsDelta: 0,
  floodArea: 18.3,
  floodAreaDelta: +2.1,
  lpcd: 284,
  lpcdDelta: -6,                    // L
  sewage: 87.0,
  sewageDelta: +1.2,
};

window.HOME_NATIONAL = {
  totalPop: 23515973,
  growth: -0.14,
  counties: 22,
  townships: 368,
  villages: 7748,
  birthRate: 6.17,
  deathRate: 7.90,
  natural: -1.73,
  agingIndex: 161.3,
  agingDelta: +5.7,
};

/* ===== 高雄水庫 (3 座) ===== */
window.KHH_RESERVOIRS = [
  { id: "agp",  name: "阿公店水庫",  capacity: 2500, storage: 28.3, rate: 28.3, level: 23.4, fullLevel: 39.6, established: 1953, basin: 31.87, supply: "高雄都會區" },
  { id: "cch",  name: "澄清湖水庫",  capacity:  300, storage: 65.2, rate: 65.2, level: 12.8, fullLevel: 19.0, established: 1942, basin:  3.2,  supply: "高雄市區、左營" },
  { id: "fsh",  name: "鳳山水庫",    capacity:  900, storage: 58.0, rate: 58.0, level: 18.2, fullLevel: 26.0, established: 1984, basin:  9.6,  supply: "高雄、屏東、台南" },
];

/* ===== 高雄汙水處理廠 (12 座, 部分 lng/lat 為示意) ===== */
window.KHH_WWTP = [
  { id: "agk", name: "阿公店污水廠",   lng: 120.310, lat: 22.880, dailyMTon:  3.2 },
  { id: "akg", name: "阿公店河污水廠", lng: 120.302, lat: 22.806, dailyMTon:  2.6 },
  { id: "ksn", name: "旗津污水廠",     lng: 120.292, lat: 22.589, dailyMTon:  4.8 },
  { id: "ksh", name: "岡山污水廠",     lng: 120.300, lat: 22.802, dailyMTon:  6.4 },
  { id: "nzh", name: "楠梓污水廠",     lng: 120.314, lat: 22.728, dailyMTon: 10.2 },
  { id: "lin", name: "臨海污水廠",     lng: 120.312, lat: 22.560, dailyMTon: 18.6 },
  { id: "xgi", name: "小港污水廠",     lng: 120.323, lat: 22.560, dailyMTon: 12.4 },
  { id: "zhg", name: "中區污水廠",     lng: 120.310, lat: 22.620, dailyMTon: 14.8 },
  { id: "drs", name: "大樹污水廠",     lng: 120.428, lat: 22.668, dailyMTon:  2.1 },
  { id: "nbn", name: "鳥松污水廠",     lng: 120.366, lat: 22.665, dailyMTon:  3.0 },
  { id: "gas", name: "甲仙污水廠",     lng: 120.589, lat: 23.085, dailyMTon:  1.2 },
  { id: "rzh", name: "仁武污水廠",     lng: 120.355, lat: 22.700, dailyMTon:  4.6 },
];

/* ===== 時序資料生成 ===== */
function seedRand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// 阿公店 30天蓄水率時序
window.AGP_30D = (() => {
  const r = seedRand(1953);
  const days = 30;
  const out = [];
  let val = 38;
  for (let i = 0; i < days; i++) {
    val = Math.max(20, val - 0.4 + (r() - 0.55) * 0.8);
    out.push({ x: i, date: `5/${(13 - days + i + 1 + 30) % 31 || 30}`, rate: +val.toFixed(1) });
  }
  out[out.length - 1].rate = 28.3;
  return out;
})();

// 翡翠 30天蓄水率
window.FEI_30D = (() => {
  const r = seedRand(1987);
  const out = [];
  let val = 88;
  for (let i = 0; i < 30; i++) {
    val = Math.min(98, Math.max(85, val + (r() - 0.4) * 1.2));
    out.push({ x: i, rate: +val.toFixed(1) });
  }
  return out;
})();

// 高雄總蓄水率 30天
window.KHH_30D = (() => {
  const r = seedRand(2024);
  const out = [];
  let val = 78;
  for (let i = 0; i < 30; i++) {
    if (i > 20) val -= 0.6;
    val = Math.max(60, Math.min(82, val + (r() - 0.5) * 1.3));
    out.push({ x: i, rate: +val.toFixed(1) });
  }
  out[out.length - 1].rate = 72.4;
  return out;
})();

// LPCD 歷年 (2008-2024)
window.LPCD_HISTORY = (() => {
  const years = [];
  let val = 320;
  for (let y = 2008; y <= 2024; y++) {
    val -= 1.5 + Math.random() * 1.5;
    if (y === 2015) val += 6;
    if (y === 2021) val += 4;
    years.push({ year: y, value: +val.toFixed(0) });
  }
  years[years.length - 1].value = 284;
  return years;
})();

// 人均用水量縣市比較 (近 10 年)
window.LPCD_COMPARE = (() => {
  const cities = ["NTP", "TCH", "KHH"];
  const baseStart = { NTP: 281, TCH: 246, KHH: 199 };
  const out = {};
  cities.forEach((c) => {
    const r = seedRand(c.charCodeAt(0) + c.charCodeAt(1));
    let v = baseStart[c];
    const arr = [];
    for (let y = 2014; y <= 2023; y++) {
      v = v + (r() - 0.5) * 8;
      arr.push({ year: y, value: +v.toFixed(0) });
    }
    arr[arr.length - 1].value = c === "NTP" ? 269 : c === "TCH" ? 252 : 228;
    out[c] = arr;
  });
  // national avg
  const navg = [];
  for (let y = 2014; y <= 2023; y++) {
    navg.push({ year: y, value: 250 + (Math.random() - 0.5) * 8 });
  }
  navg[navg.length - 1].value = 253;
  out._national = navg;
  return out;
})();

// 老化指數歷年
window.AGING_HISTORY = (() => {
  const years = [];
  let val = 60;
  for (let y = 1994; y <= 2024; y++) {
    val += 2.5 + (Math.random() - 0.5) * 1.5;
    years.push({ year: y, value: +val.toFixed(1) });
  }
  years[years.length - 1].value = 161.3;
  return years;
})();

// 人口歷年
window.POP_HISTORY = (() => {
  const years = [];
  let v = 21490000;
  for (let y = 2014; y <= 2024; y++) {
    v += 25000 + (Math.random() - 0.4) * 20000;
    years.push({ year: y, value: Math.round(v) });
  }
  years[years.length - 1].value = 23515973;
  return years;
})();

// 全國 40 座水庫（補上估計容量與座標）
window.ALL_RESERVOIRS = (() => {
  // [name, county code, rate%, capacity 萬m³, lng offset, lat offset]
  const raw = [
    ["翡翠",     "NTP", 95.2, 32700,  0.08, -0.12],
    ["石門",     "TYC", 88.1, 20900,  0.10,  0.08],
    ["寶山",     "HSH", 78.4,   538, -0.05, -0.04],
    ["寶山二",   "HSH", 72.5,  3147, -0.02, -0.08],
    ["永和山",   "MIA", 68.4,  2961, -0.07,  0.04],
    ["明德",     "MIA", 72.8,  1659, -0.02, -0.05],
    ["鯉魚潭",   "MIA", 81.2, 12600, -0.10, -0.02],
    ["德基",     "TCH", 64.5, 23200,  0.30, -0.10],
    ["石岡壩",   "TCH", 60.3,   161,  0.10,  0.02],
    ["霧社",     "NAN", 58.2,  1463,  0.00,  0.10],
    ["日月潭",   "NAN", 61.4, 17200, -0.08, -0.05],
    ["湖山",     "YUN", 56.1,  5300, -0.05, -0.02],
    ["蘭潭",     "CYH", 54.2,   860,  0.02,  0.05],
    ["仁義潭",   "CYH", 52.8,  2700,  0.04,  0.02],
    ["白河",     "TNN", 41.6,  2510,  0.10,  0.12],
    ["烏山頭",   "TNN", 25.9,  7340,  0.12,  0.04],
    ["曾文",     "TNN", 33.4, 49600,  0.20,  0.18],
    ["南化",     "TNN", 48.6,  9270,  0.18,  0.10],
    ["阿公店",   "KHH", 28.3,  1880,  0.06,  0.20],
    ["澄清湖",   "KHH", 65.2,   300,  0.02,  0.08],
    ["鳳山",     "KHH", 58.0,   870,  0.04,  0.02],
    ["牡丹",     "PIF", 47.2,  3138,  0.10, -0.20],
    ["龍鑾潭",   "PIF", 52.4,    24,  0.02, -0.18],
    ["羅好",     "ILA", 88.0,   215, -0.04, -0.06],
    ["新山",     "KLC", 88.0,   970, -0.02,  0.02],
    // 補滿 40 座
    ["翠峰",     "TCH", 91.0,   180,  0.20, -0.18],
    ["谷關",     "TCH", 87.2,   175,  0.25, -0.14],
    ["天輪",     "TCH", 84.0,   140,  0.22, -0.12],
    ["馬鞍",     "TCH", 71.2,   137,  0.18, -0.06],
    ["明潭",     "NAN", 72.5,  2820, -0.06, -0.08],
    ["臺中港",   "TCH", 63.8,   480, -0.18,  0.02],
    ["蘇澳",     "ILA", 90.4,    65,  0.02, -0.10],
    ["雙溪",     "NTP", 82.3,   120,  0.18, -0.05],
    ["西勢",     "KLC", 86.1,    70, -0.06,  0.04],
    ["新山子",   "KLC", 83.5,    50, -0.04,  0.05],
    ["太平山",   "ILA", 86.8,    45, -0.08, -0.06],
    ["佳冬",     "PIF", 38.6,    35,  0.04, -0.12],
    ["甘棠",     "KMN", 56.4,    78,  0.02,  0.02],
    ["榮湖",     "KMN", 62.1,    60,  0.04, -0.02],
    ["太湖",     "KMN", 51.0,    52, -0.03,  0.01],
  ];
  return raw.map(([n, c, rate, capacity, dlng, dlat]) => {
    const co = window.byCode[c];
    return {
      name: n,
      county: c,
      countyName: co?.name || "",
      region: co?.region || "central",
      rate,
      capacity,
      lng: (co?.lng || 121) + dlng,
      lat: (co?.lat || 23.7) + dlat,
    };
  });
})();

// 全國點位圖層（mock 點數）— 用於 View A「點位圖層」面板
window.POINT_LAYERS_WATER = [
  { id: "reservoir",  label: "主要水庫",     count: 40,    color: "#0EA5E9", shape: "ring",   ds: "水利署",        defaultOn: true  },
  { id: "rainGauge",  label: "雨量站",       count: 242,   color: "#10B981", shape: "dot",    ds: "中央氣象署",    defaultOn: false },
  { id: "waterQC",    label: "水質測站",     count: 1201,  color: "#A855F7", shape: "small",  ds: "環境部",        defaultOn: false },
  { id: "riverLevel", label: "河川水位站",   count: 188,   color: "#F59E0B", shape: "dot",    ds: "水利署",        defaultOn: false },
  { id: "polluter",   label: "列管事業",     count: 8420,  color: "#EF4444", shape: "small",  ds: "環境部",        defaultOn: false },
  { id: "wwtp",       label: "汙水處理廠",   count: 82,    color: "#64748B", shape: "square", ds: "內政部營建署",  defaultOn: false },
];

// 著色指標可選清單（View A 水資源）
window.WATER_COLOR_METRICS = [
  { id: "lpcd",      label: "人均日用水量", unit: "L"  },
  { id: "reservoir", label: "蓄水率",       unit: "%"  },
  { id: "sewage",    label: "汙水接管率",   unit: "%"  },
  { id: "rain24",    label: "24hr 均雨量",  unit: "mm" },
  { id: "floodPct",  label: "淹水高潛勢面積", unit: "%" },
];

/* ===== 高雄水資源 30 日雨量 ===== */
window.KHH_RAIN_30D = (() => {
  const r = seedRand(101);
  const out = [];
  for (let i = 0; i < 30; i++) {
    const rain = r() > 0.7 ? r() * 25 : (r() > 0.4 ? r() * 5 : 0);
    out.push({ x: i, rain: +rain.toFixed(1) });
  }
  return out;
})();

/* ===== 高雄 38 區 (示意，僅前 8 名) ===== */
window.KHH_DISTRICTS_LPCD = [
  { name: "前金區", value: 318 },
  { name: "苓雅區", value: 305 },
  { name: "新興區", value: 297 },
  { name: "鼓山區", value: 291 },
  { name: "鹽埕區", value: 286 },
  { name: "三民區", value: 281 },
  { name: "左營區", value: 276 },
  { name: "前鎮區", value: 268 },
];

console.log("[mini-taiwan-info] mock data loaded:", COUNTIES.length, "counties");
