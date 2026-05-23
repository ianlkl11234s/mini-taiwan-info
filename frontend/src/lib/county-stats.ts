/**
 * ViewB Home 用的 per-county helper functions
 *
 * 移植自設計檔 view-b.jsx：deriveHomeStats / rankAmongCounties / vsNationalTag / neighborCounties
 * 設計依據：docs/themes/home-basics-county-indicators.md
 *
 * 注意：deriveHomeStats 是 mock 推導（基於 mock-home + COUNTIES SSOT），
 * 未來 ETL `reference.national_basics_by_county_monthly` 上線後可換成真實 query。
 */

import { COUNTIES, byCode3 } from "./counties";
import { type HomeCountyDemographic } from "./mock-home";
import type { County, CountyCode3 } from "./types";

export interface HomeCountyStats {
  popTotal: number;
  popMale: number;
  popFemale: number;
  sexRatio: number;
  pct014: number;
  pct1564: number;
  pct65: number;
  pop014: number;
  pop1564: number;
  pop65: number;
  dependencyRatio: number;
  households: number;
  householdSize: number;
  density: number;
  villages: number;
  neighborhoods: number;
}

/** 縣市性別比 mock（女多於男佔多數，原鄉略男多） */
const SEX_RATIO_MAP: Record<string, number> = {
  KMN: 105, LCC: 104, TTT: 103, HUA: 101, NAN: 100, MIA: 99,
  YUN: 98,  PIF: 98,  CHA: 97,  CYC: 97,  CYH: 95,
  TPE: 92,  NTP: 94,
};

/** 縣市戶量 mock（依區域差異 2.4-2.85） */
function householdSizeOf(region: County["region"]): number {
  switch (region) {
    case "north":   return 2.42;
    case "south":   return 2.65;
    case "east":    return 2.58;
    case "island":  return 2.85;
    case "central":
    default:        return 2.62;
  }
}

/** 從 COUNTIES SSOT + HOME_BY_COUNTY mock 推導 per-county 統計
 *
 *  ⚠️ Mock 階段：年齡三段、男女、戶數、村里、鄰 都是反推/估算。
 *  上 ETL 後改成 query reference.national_basics_by_county_monthly。
 */
export function deriveHomeStats(c: County, hd: HomeCountyDemographic): HomeCountyStats {
  const popTotal = Math.round(c.pop_2024_wan * 10000);

  // 男女
  const sexRatio = SEX_RATIO_MAP[c.code3] ?? 96.75;
  const popMale = Math.round((popTotal * sexRatio) / (100 + sexRatio));
  const popFemale = popTotal - popMale;

  // 年齡三段：固定 pct1564 ≈ 68，由 agingIndex 反推 0-14 / 65+
  const pct1564 = 68.0;
  const remain = 100 - pct1564;
  const pct014 = remain / (1 + hd.agingIndex / 100);
  const pct65 = remain - pct014;
  const pop014 = Math.round((popTotal * pct014) / 100);
  const pop65 = Math.round((popTotal * pct65) / 100);
  const pop1564 = popTotal - pop014 - pop65;
  const dependencyRatio = ((pop014 + pop65) / pop1564) * 100;

  // 戶數 + 戶量
  const householdSize = householdSizeOf(c.region);
  const households = Math.round(popTotal / householdSize);

  // 密度
  const density = popTotal / c.area_km2;

  // 村里、鄰 估算（全國均值：7748/368=21.05、144820/7748=18.69）
  const villages = Math.round(hd.townCount * 21.05);
  const neighborhoods = Math.round(villages * 18.69);

  return {
    popTotal, popMale, popFemale, sexRatio,
    pct014, pct1564, pct65, pop014, pop1564, pop65,
    dependencyRatio,
    households, householdSize,
    density,
    villages, neighborhoods,
  };
}

export interface RankResult {
  rank: number;
  total: number;
  top: { code: CountyCode3; value: number };
  bottom: { code: CountyCode3; value: number };
}

/** 22 縣市排名（依 getter 取值，由大到小） */
export function rankAmongCounties(
  code: CountyCode3,
  getter: (c: County) => number,
): RankResult {
  const arr = COUNTIES.map((cc) => ({ code: cc.code3, value: getter(cc) }));
  arr.sort((a, b) => b.value - a.value);
  const rank = arr.findIndex((r) => r.code === code) + 1;
  return { rank, total: arr.length, top: arr[0], bottom: arr[arr.length - 1] };
}

export type VsClass = "pos" | "neg" | "flat";

export interface VsNational {
  delta: number;
  pct: number;
  cls: VsClass;
  arrow: "↑" | "↓" | "→";
}

/** vs 全國比較 — invert=true 時值高為負面（如老化指數、死亡率） */
export function vsNationalTag(self: number, nat: number, invert = false): VsNational {
  const delta = self - nat;
  const pct = nat !== 0 ? (delta / nat) * 100 : 0;
  const cls: VsClass = Math.abs(delta) < nat * 0.01
    ? "flat"
    : delta > 0
      ? (invert ? "neg" : "pos")
      : (invert ? "pos" : "neg");
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  return { delta, pct, cls, arrow };
}

/** 同區域其他縣市（用於 H2 鄰縣 chip） */
export function neighborCounties(code: CountyCode3): CountyCode3[] {
  const c = byCode3[code];
  if (!c) return [];
  return COUNTIES
    .filter((cc) => cc.region === c.region && cc.code3 !== code)
    .map((cc) => cc.code3);
}
