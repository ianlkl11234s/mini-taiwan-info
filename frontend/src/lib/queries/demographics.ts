/**
 * Demographics theme · Supabase queries
 *
 * 對應 themes/demographics.yaml KPI。Backend schema 已 exposed（PostgREST 直連），
 * 無需 public wrapper，用 withSchema('demographics') / withSchema('spatial') 直接 query。
 *
 * 資料來源：
 *   - demographics.population_by_age_sex_county         — 22 縣市 × 男女 × age_band；2024(19組,幼齡合計0-14)
 *                                                          + 2025(21組,0-4/5-9/10-14細分)兩年並存（混粒度，依 stat_year 篩選）
 *   - demographics.county_indicators_yearly (22)        — 縣市別官方指標（aging/dependency/density/sex_ratio/household_size），最新年 2025
 *   - spatial.national_population_trend (10)            — 民國 104-113 全國加總
 *   - spatial.village_demographics_yearly (77,811)      — 民國 104-113 村里級
 *
 * 設計來源：designs Mini Taiwan Info.html / data-population.js (mock 為 SSOT 數字)
 */

import { withSchema } from "../supabase";
import { COUNTIES, byIdMoi } from "../counties";
import type { CountyCode3, CountyIdMoi } from "../types";

const db = withSchema("demographics");
const dbSpatial = withSchema("spatial");

// 民國年 → 西元 (year_minguo + 1911 = year_western)
const MINGUO_OFFSET = 1911;
const LATEST_YEAR_MINGUO = 113; // = 2024
const BASE_YEAR_MINGUO = 104;   // = 2015

// ─────────────────────────────────────────────────
// 1. Raw row 型別
// ─────────────────────────────────────────────────

export interface PopulationByAgeSexRow {
  county_id: CountyIdMoi;      // 'A' - 'Z'
  county_name: string;          // '臺北市' / '新北市' ...
  age_band: string;             // '0-4', '5-9', ..., '95-99', '100+'
  sex: "male" | "female" | "M" | "F" | string;
  population: number;
  stat_year: number;            // 西元；目前 2024(19 band) + 2025(21 band) 並存
}

export async function fetchPopulationByAgeSex(): Promise<PopulationByAgeSexRow[]> {
  // 多年並存固定小表（~1,760 筆），精選 6 欄避免 '*' 抓額外欄位／metadata；年度篩選在 derive 端做
  const { data, error } = await db
    .from("population_by_age_sex_county")
    .select("county_id,county_name,age_band,sex,population,stat_year");
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[demographics] population_by_age_sex failed:", error);
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    county_id: String(r.county_id) as CountyIdMoi,
    county_name: String(r.county_name ?? ""),
    age_band: String(r.age_band ?? ""),
    sex: String(r.sex ?? "") as "male" | "female",
    population: Number(r.population ?? 0),
    stat_year: Number(r.stat_year ?? 0),
  }));
}

export interface NationalTrendRow {
  year: number;                 // 民國年 (104-113)
  village_count: number;
  total_population: number;
  avg_elderly_ratio: number;    // %
  avg_aging_index: number;      // 65+ / 0-14 × 100
  avg_median_age: number;
  total_births: number;
  total_deaths: number;
  total_natural_increase: number;
}

export async function fetchNationalTrend(): Promise<NationalTrendRow[]> {
  // 10 筆固定表，精選 9 欄
  const { data, error } = await dbSpatial
    .from("national_population_trend")
    .select(
      "year,village_count,total_population,avg_elderly_ratio,avg_aging_index,avg_median_age,total_births,total_deaths,total_natural_increase",
    )
    .order("year");
  if (error) {
    console.error("[demographics] national_population_trend failed:", error);
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    year: Number(r.year),
    village_count: Number(r.village_count ?? 0),
    total_population: Number(r.total_population ?? 0),
    avg_elderly_ratio: Number(r.avg_elderly_ratio ?? 0),
    avg_aging_index: Number(r.avg_aging_index ?? 0),
    avg_median_age: Number(r.avg_median_age ?? 0),
    total_births: Number(r.total_births ?? 0),
    total_deaths: Number(r.total_deaths ?? 0),
    total_natural_increase: Number(r.total_natural_increase ?? 0),
  }));
}

export interface VillageDemographicsRow {
  year: number;                  // 民國年
  county: string;                // 中文縣市名 e.g. '新北市'
  town: string;
  village: string;
  household_count: number | null;
  population: number;
  male_count: number;
  female_count: number;
  age_0_14: number;
  age_15_64: number;
  age_65_up: number;
  sex_ratio: number;
  dependency_ratio: number;
  aging_index: number;
  median_age: number;
  birth_total: number;
  death_total: number;
  natural_increase: number;
}

/** 每年硬上界：村里總數 ~7,800，留餘裕設 12,000，避免分頁失控無限拉 */
const VILLAGE_MAX_ROWS_PER_YEAR = 12_000;

/**
 * 拉指定民國年的村里資料（egress 防護版）
 *
 * 只 SELECT consumer 真正用到的 10 欄：deriveCountyAggregates 用 county/year/
 * household_count/population/birth_total/death_total/natural_increase/median_age/
 * dependency_ratio；ViewBDemographics 鄉鎮排名另用 town。其餘欄位（village/
 * male_count/female_count/age_0_14/15_64/65_up/sex_ratio/aging_index）目前無
 * consumer，省去傳輸。型別欄位保留，未抓者填預設值不破壞 shape。
 *
 * 每年加 VILLAGE_MAX_ROWS_PER_YEAR 硬上界，分頁到上界即停。
 */
export async function fetchVillageYearly(years: number[]): Promise<VillageDemographicsRow[]> {
  if (years.length === 0) return [];
  const out: VillageDemographicsRow[] = [];
  // 每年 ~7,800 筆 > PostgREST 預設 max-rows 1000 → 拆 year 多次 fetch 並 range
  for (const y of years) {
    let from = 0;
    const pageSize = 1000; // PostgREST 預設 max-rows，超過會被截
    // pagination 直到取完或撞硬上界
    while (from < VILLAGE_MAX_ROWS_PER_YEAR) {
      const to = Math.min(from + pageSize, VILLAGE_MAX_ROWS_PER_YEAR) - 1;
      const { data, error } = await dbSpatial
        .from("village_demographics_yearly")
        .select(
          "year,county,town,household_count,population,dependency_ratio,median_age,birth_total,death_total,natural_increase",
        )
        .eq("year", y)
        .range(from, to);
      if (error) {
        console.error(`[demographics] village_yearly year=${y} failed:`, error);
        throw error;
      }
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      for (const r of rows) {
        out.push({
          year: Number(r.year),
          county: String(r.county ?? ""),
          town: String(r.town ?? ""),
          village: "",
          household_count: r.household_count == null ? null : Number(r.household_count),
          population: Number(r.population ?? 0),
          male_count: 0,
          female_count: 0,
          age_0_14: 0,
          age_15_64: 0,
          age_65_up: 0,
          sex_ratio: 0,
          dependency_ratio: Number(r.dependency_ratio ?? 0),
          aging_index: 0,
          median_age: Number(r.median_age ?? 0),
          birth_total: Number(r.birth_total ?? 0),
          death_total: Number(r.death_total ?? 0),
          natural_increase: Number(r.natural_increase ?? 0),
        });
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────
// 1b. 鄉鎮市區層級（村里數 + 人口排名）— demographics schema 固定小表
// ─────────────────────────────────────────────────

export interface TownshipVillageCountRow {
  county_id: CountyIdMoi;
  county_name: string;
  town_id: string;
  town_name: string;
  village_count: number;       // 該鄉鎮市區村里數（不含鄰）
}

/** demographics.township_village_count VIEW（368 鄉鎮，固定小表，全 SELECT 一次） */
export async function fetchTownshipVillageCount(): Promise<TownshipVillageCountRow[]> {
  const { data, error } = await db
    .from("township_village_count")
    .select("county_id,county_name,town_id,town_name,village_count");
  if (error) {
    console.error("[demographics] township_village_count failed:", error);
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    county_id: String(r.county_id) as CountyIdMoi,
    county_name: String(r.county_name ?? ""),
    town_id: String(r.town_id ?? ""),
    town_name: String(r.town_name ?? ""),
    village_count: Number(r.village_count ?? 0),
  }));
}

export interface TownshipRankRow {
  national_rank: number;       // 全國排名
  county_rank: number;         // 縣市內排名
  county_id: CountyIdMoi;
  county_name: string;
  town_name: string;
  population: number;          // 該期別月底人口
  households: number;
  year_month: string;          // 期別 e.g. '2025-12'（VIEW 自動切最新月，前端動態顯示，不寫死）
}

/** demographics.township_rank VIEW（368 鄉鎮，VIEW 自動切最新月，固定小表，依 national_rank 排序拉一次） */
export async function fetchTownshipRank(): Promise<TownshipRankRow[]> {
  const { data, error } = await db
    .from("township_rank")
    .select("national_rank,county_rank,county_id,county_name,town_name,population,households,year_month")
    .order("national_rank");
  if (error) {
    console.error("[demographics] township_rank failed:", error);
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    national_rank: Number(r.national_rank ?? 0),
    county_rank: Number(r.county_rank ?? 0),
    county_id: String(r.county_id) as CountyIdMoi,
    county_name: String(r.county_name ?? ""),
    town_name: String(r.town_name ?? ""),
    population: Number(r.population ?? 0),
    households: Number(r.households ?? 0),
    year_month: String(r.year_month ?? ""),
  }));
}

// ─────────────────────────────────────────────────
// 1c. 縣市別官方指標（county_indicators_yearly）— demographics schema 固定小表
// ─────────────────────────────────────────────────

export interface CountyIndicatorRow {
  county_id: CountyIdMoi;          // = id_moi（A-Z 單字母）
  stat_year: number;               // 西元，目前最新 2025
  agingIndex: number;              // 老化指數
  dependencyRatio: number;         // 扶養比
  childDependencyRatio: number;    // 幼年扶養比
  oldDependencyRatio: number;      // 老年扶養比
  popDensity: number;              // 人口密度（人/km²）
  sexRatio: number;                // 性別比 ♂/100♀
  householdSize: number;           // 平均戶量（人/戶）
}

/**
 * demographics.county_indicators_yearly（22 縣市 × 年度，PK county_id+stat_year，county_id=id_moi）。
 * 縣市儀錶板/比較頁的官方權威指標來源（取代 pyramid/village 計算值）。
 */
export async function fetchCountyIndicatorsYearly(): Promise<CountyIndicatorRow[]> {
  const { data, error } = await db
    .from("county_indicators_yearly")
    .select(
      "county_id,stat_year,aging_index,dependency_ratio,child_dependency_ratio,old_dependency_ratio,pop_density,sex_ratio,household_size",
    );
  if (error) {
    console.error("[demographics] county_indicators_yearly failed:", error);
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    county_id: String(r.county_id) as CountyIdMoi,
    stat_year: Number(r.stat_year ?? 0),
    agingIndex: Number(r.aging_index ?? 0),
    dependencyRatio: Number(r.dependency_ratio ?? 0),
    childDependencyRatio: Number(r.child_dependency_ratio ?? 0),
    oldDependencyRatio: Number(r.old_dependency_ratio ?? 0),
    popDensity: Number(r.pop_density ?? 0),
    sexRatio: Number(r.sex_ratio ?? 0),
    householdSize: Number(r.household_size ?? 0),
  }));
}

/** 取最新年的縣市指標 map（county_id → row），供 deriveCountyAggregates 覆寫計算值 */
export function buildCountyIndicatorMap(
  rows: CountyIndicatorRow[],
): Map<CountyIdMoi, CountyIndicatorRow> {
  let latest = 0;
  for (const r of rows) if (r.stat_year > latest) latest = r.stat_year;
  const map = new Map<CountyIdMoi, CountyIndicatorRow>();
  for (const r of rows) if (r.stat_year === latest) map.set(r.county_id, r);
  return map;
}

// ─────────────────────────────────────────────────
// 2. Derived 型別
// ─────────────────────────────────────────────────

export interface DemographicsNationalSummary {
  totalPop: number;
  popMale: number;
  popFemale: number;
  sexRatio: number;        // ♂/100♀
  pct014: number;          // %
  pct1564: number;
  pct65: number;
  agingIndex: number;      // 65+/0-14 × 100
  dependencyRatio: number; // (0-14 + 65+) / 15-64 × 100
  depYoung: number;        // 0-14 / 15-64 × 100
  depOld: number;          // 65+ / 15-64 × 100
  density: number;         // 人/km²
  household: number;       // 戶量
  births: number;
  deaths: number;
  natural: number;
  /** 較民國 104 的 10 年成長率（%） */
  growth10y: number;
  /** 死亡交叉年（民國年） */
  crossYearMinguo: number | null;
  /** 較民國 112 變動 */
  totalPopDelta: number;
}

export interface AgeRow {
  age: string;       // 依該年實際 age_band（2024: 0-14.. / 2025: 0-4,5-9,10-14..100+）
  male: number;
  female: number;
}

export interface VitalRow {
  year: number;      // 西元
  yearMinguo: number;
  birth: number;
  death: number;
  natural: number;
}

export interface AgingHistoryRow {
  year: number;      // 西元
  yearMinguo: number;
  value: number;     // aging_index
}

export interface CountyDemographics {
  code3: CountyCode3;
  id_moi: CountyIdMoi;
  name: string;
  pop: number;
  popMale: number;
  popFemale: number;
  density: number;
  agingIndex: number;
  growth10y: number;     // %
  depRatio: number;
  depYoung: number;
  depOld: number;
  hhSize: number;
  medianAge: number;
  birth: number;
  death: number;
  natural: number;
  /** 出生 - 死亡 已含 natural；社會增加 = pop(113) - pop(104) - 自然增加(累計10年) — approx */
  social: number;
}

// ─────────────────────────────────────────────────
// 3. Derive functions
// ─────────────────────────────────────────────────

/** 把不同口徑 sex 統一成 'M' / 'F' */
function normSex(s: string): "M" | "F" | null {
  const u = s.toLowerCase();
  if (u === "m" || u === "male" || u === "男") return "M";
  if (u === "f" || u === "female" || u === "女") return "F";
  return null;
}

/** 解析 age_band 中的下界數字（用於排序與 0-14 / 15-64 / 65+ 分群） */
function parseAgeLow(band: string): number {
  const m = band.match(/(\d+)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/** population_by_age_sex_county 的最新統計年（西元）；空陣列回 0。預設金字塔/概覽以此年展示 */
export function latestStatYear(rows: PopulationByAgeSexRow[]): number {
  let max = 0;
  for (const r of rows) if (r.stat_year > max) max = r.stat_year;
  return max;
}

/**
 * 全國人口金字塔 — 先依 stat_year 篩選，再動態讀該年實際 age_band 清單來畫。
 * 2024(19 組,幼齡合計 0-14) 與 2025(21 組,0-4/5-9/10-14 細分) 皆原樣呈現，
 * 不寫死組數、不強制合併最高齡組（混粒度相容）。
 */
export function deriveNationalPyramid(rows: PopulationByAgeSexRow[], statYear: number): AgeRow[] {
  const bucket = new Map<string, { male: number; female: number }>();
  for (const r of rows) {
    if (r.stat_year !== statYear) continue;
    const sex = normSex(r.sex);
    if (!sex) continue;
    const band = r.age_band.trim();
    const slot = bucket.get(band) ?? { male: 0, female: 0 };
    if (sex === "M") slot.male += r.population;
    else slot.female += r.population;
    bucket.set(band, slot);
  }
  return Array.from(bucket.entries())
    .map(([age, v]) => ({ age, ...v }))
    .sort((a, b) => parseAgeLow(a.age) - parseAgeLow(b.age));
}

/** 全國 KPI 加總（依 statYear 篩選 pyramid + national trend + 縣市 area + village rows 算戶量） */
export function deriveNationalSummary(
  rows: PopulationByAgeSexRow[],
  trend: NationalTrendRow[],
  statYear: number,
  villageRows?: VillageDemographicsRow[],
): DemographicsNationalSummary {
  let male = 0;
  let female = 0;
  let p014 = 0;
  let p1564 = 0;
  let p65 = 0;
  let prevYearTotal = 0;        // 前一統計年總人口（同表 YoY，apples-to-apples）
  for (const r of rows) {
    if (r.stat_year === statYear - 1) {
      prevYearTotal += r.population;
      continue;
    }
    if (r.stat_year !== statYear) continue;
    const sex = normSex(r.sex);
    if (!sex) continue;
    if (sex === "M") male += r.population;
    else female += r.population;
    const low = parseAgeLow(r.age_band);
    if (low < 15) p014 += r.population;
    else if (low < 65) p1564 += r.population;
    else p65 += r.population;
  }
  const totalPop = male + female;
  const sexRatio = female > 0 ? (male / female) * 100 : 0;
  const agingIndex = p014 > 0 ? (p65 / p014) * 100 : 0;
  const depYoung = p1564 > 0 ? (p014 / p1564) * 100 : 0;
  const depOld = p1564 > 0 ? (p65 / p1564) * 100 : 0;
  const dependencyRatio = depYoung + depOld;

  const totalArea = COUNTIES.reduce((s, c) => s + (c.area_km2 ?? 0), 0);
  const density = totalArea > 0 ? totalPop / totalArea : 0;

  // Batch3 D-1：trend 已含民114（national_vital_yearly 修正後）。vitals（出生/死亡/自然增加）
  // 取 trend 可得最新年（114），與下方 deriveVitalsTrend 末點口徑一致，避免 KPI label 顯 2025
  // 但值卻是民113 的 mismatch。
  const latestTrendYear = trend.length
    ? Math.max(...trend.map((t) => t.year))
    : LATEST_YEAR_MINGUO;
  const latest = trend.find((t) => t.year === latestTrendYear);
  const base = trend.find((t) => t.year === BASE_YEAR_MINGUO);
  const growth10y =
    base && base.total_population > 0
      ? ((totalPop - base.total_population) / base.total_population) * 100
      : 0;

  // 死亡交叉年：首年 total_natural_increase < 0
  let crossYearMinguo: number | null = null;
  for (const t of trend) {
    if (t.total_natural_increase < 0) {
      crossYearMinguo = t.year;
      break;
    }
  }

  // 戶量：從 village_demographics_yearly year=113 加總 household_count + population 算，null 才 fallback
  const v113 = (villageRows ?? []).filter((v) => v.year === LATEST_YEAR_MINGUO);
  const totalHH = v113.reduce((s, v) => s + (v.household_count ?? 0), 0);
  const totalPopV = v113.reduce((s, v) => s + v.population, 0);
  const household = totalHH > 0 && totalPopV > 0
    ? Number((totalPopV / totalHH).toFixed(4))
    : 2.53;

  return {
    totalPop,
    popMale: male,
    popFemale: female,
    sexRatio: Number(sexRatio.toFixed(2)),
    pct014: totalPop > 0 ? Number(((p014 / totalPop) * 100).toFixed(2)) : 0,
    pct1564: totalPop > 0 ? Number(((p1564 / totalPop) * 100).toFixed(2)) : 0,
    pct65: totalPop > 0 ? Number(((p65 / totalPop) * 100).toFixed(2)) : 0,
    agingIndex: Number(agingIndex.toFixed(1)),
    dependencyRatio: Number(dependencyRatio.toFixed(1)),
    depYoung: Number(depYoung.toFixed(1)),
    depOld: Number(depOld.toFixed(1)),
    density: Math.round(density),
    household,
    births: latest?.total_births ?? 0,
    deaths: latest?.total_deaths ?? 0,
    natural: latest?.total_natural_increase ?? 0,
    growth10y: Number(growth10y.toFixed(2)),
    crossYearMinguo,
    totalPopDelta: prevYearTotal > 0 ? totalPop - prevYearTotal : 0,
  };
}

/** 出生 vs 死亡 雙線（民國 104-113 = 西元 2015-2024） */
export function deriveVitalsTrend(trend: NationalTrendRow[]): VitalRow[] {
  return trend.map((t) => ({
    year: t.year + MINGUO_OFFSET,
    yearMinguo: t.year,
    birth: t.total_births,
    death: t.total_deaths,
    natural: t.total_natural_increase,
  }));
}

/**
 * 老化指數歷年（民國 104-113）。
 * Batch3 D-1：avg_aging_index 民104-113 為「村里未加權平均」口徑（113≈270.9）；民114 改「全國
 * 彙總」口徑（174.25）。兩者不可混用（鐵則2），歷年連線只取同口徑的 ≤113，避免 113→114 視覺斷崖。
 * 民114 最新老化指數由金字塔計算值（summary.agingIndex）另行呈現。
 */
export function deriveAgingHistory(trend: NationalTrendRow[]): AgingHistoryRow[] {
  return trend
    .filter((t) => t.year <= LATEST_YEAR_MINGUO)
    .map((t) => ({
      year: t.year + MINGUO_OFFSET,
      yearMinguo: t.year,
      value: Number(t.avg_aging_index.toFixed(1)),
    }));
}

/**
 * 22 縣市 demographics 聚合 — pyramid(依 statYear 篩選) + village rows 加總（year=113 + year=104 給 growth）。
 * indicators（county_indicators_yearly 最新年）若提供，aging/dep/density/hhSize 改用官方值，缺則用計算值。
 */
export function deriveCountyAggregates(
  pyramid: PopulationByAgeSexRow[],
  villages: VillageDemographicsRow[],
  statYear: number,
  indicators?: Map<CountyIdMoi, CountyIndicatorRow>,
): CountyDemographics[] {
  // 縣市中文名 → id_moi
  const zhToId = new Map<string, CountyIdMoi>();
  for (const c of COUNTIES) {
    zhToId.set(c.name_zh, c.id_moi);
    if (c.name_zh_alt && c.name_zh_alt !== c.name_zh) zhToId.set(c.name_zh_alt, c.id_moi);
  }

  // pyramid 加總每縣市 — pop / male / female / age_0_14 / 15-64 / 65+
  const pyramidAgg = new Map<
    CountyIdMoi,
    { pop: number; male: number; female: number; p014: number; p1564: number; p65: number }
  >();
  for (const r of pyramid) {
    if (r.stat_year !== statYear) continue;
    const slot =
      pyramidAgg.get(r.county_id) ?? { pop: 0, male: 0, female: 0, p014: 0, p1564: 0, p65: 0 };
    const sex = normSex(r.sex);
    if (sex === "M") slot.male += r.population;
    else if (sex === "F") slot.female += r.population;
    slot.pop += r.population;
    const low = parseAgeLow(r.age_band);
    if (low < 15) slot.p014 += r.population;
    else if (low < 65) slot.p1564 += r.population;
    else slot.p65 += r.population;
    pyramidAgg.set(r.county_id, slot);
  }

  // village 加總 — 用 county 中文名匹配
  // year=113: hh / pop / birth / death / natural / medianAge weighted / depRatio weighted
  // year=104: pop（給 growth10y）
  const v113 = new Map<
    CountyIdMoi,
    {
      hh: number;
      pop: number;
      birth: number;
      death: number;
      natural: number;
      medianAgeWeighted: number;
      depRatioWeighted: number;
      weight: number;
    }
  >();
  const v104 = new Map<CountyIdMoi, { pop: number }>();
  for (const v of villages) {
    const id = zhToId.get(v.county);
    if (!id) continue;
    if (v.year === LATEST_YEAR_MINGUO) {
      const slot =
        v113.get(id) ??
        { hh: 0, pop: 0, birth: 0, death: 0, natural: 0, medianAgeWeighted: 0, depRatioWeighted: 0, weight: 0 };
      slot.hh += v.household_count ?? 0;
      slot.pop += v.population;
      slot.birth += v.birth_total;
      slot.death += v.death_total;
      slot.natural += v.natural_increase;
      slot.medianAgeWeighted += v.median_age * v.population;
      slot.depRatioWeighted += v.dependency_ratio * v.population;
      slot.weight += v.population;
      v113.set(id, slot);
    } else if (v.year === BASE_YEAR_MINGUO) {
      const s = v104.get(id) ?? { pop: 0 };
      s.pop += v.population;
      v104.set(id, s);
    }
  }

  return COUNTIES.map((c) => {
    const pyr = pyramidAgg.get(c.id_moi) ?? { pop: 0, male: 0, female: 0, p014: 0, p1564: 0, p65: 0 };
    const v = v113.get(c.id_moi);
    const vBase = v104.get(c.id_moi);
    const popLatest = pyr.pop || (v?.pop ?? 0);
    const area = c.area_km2 ?? 0;
    const density = area > 0 ? popLatest / area : 0;
    const aging = pyr.p014 > 0 ? (pyr.p65 / pyr.p014) * 100 : 0;
    const depRatio = pyr.p1564 > 0 ? ((pyr.p014 + pyr.p65) / pyr.p1564) * 100 : 0;
    const depYoung = pyr.p1564 > 0 ? (pyr.p014 / pyr.p1564) * 100 : 0;
    const depOld = pyr.p1564 > 0 ? (pyr.p65 / pyr.p1564) * 100 : 0;
    const growth10y =
      vBase && vBase.pop > 0 ? ((popLatest - vBase.pop) / vBase.pop) * 100 : 0;
    const hhSize = v && v.hh > 0 ? v.pop / v.hh : 0;
    const medianAge = v && v.weight > 0 ? v.medianAgeWeighted / v.weight : 0;
    const natural = v?.natural ?? 0;
    // social = popDelta(113-104) - natural10yr — 但只有 birth/death 12月當月值 → 用 popDelta 近似
    const popDelta = vBase ? popLatest - vBase.pop : 0;
    const social = popDelta; // 近似：含社會 + 自然，UI 標明
    // 官方縣市指標（county_indicators_yearly 最新年）優先；缺則用 pyramid/village 計算值
    const ind = indicators?.get(c.id_moi);
    return {
      code3: c.code3,
      id_moi: c.id_moi,
      name: c.name_zh,
      pop: popLatest,
      popMale: pyr.male,
      popFemale: pyr.female,
      density: ind ? Math.round(ind.popDensity) : Math.round(density),
      agingIndex: ind ? ind.agingIndex : Number(aging.toFixed(1)),
      growth10y: Number(growth10y.toFixed(2)),
      depRatio: ind ? ind.dependencyRatio : Number(depRatio.toFixed(1)),
      depYoung: ind ? ind.childDependencyRatio : Number(depYoung.toFixed(1)),
      depOld: ind ? ind.oldDependencyRatio : Number(depOld.toFixed(1)),
      hhSize: ind ? ind.householdSize : Number(hhSize.toFixed(2)),
      medianAge: Number(medianAge.toFixed(1)),
      birth: v?.birth ?? 0,
      death: v?.death ?? 0,
      natural,
      social,
    };
  });
}

export { LATEST_YEAR_MINGUO, BASE_YEAR_MINGUO, MINGUO_OFFSET, byIdMoi };
