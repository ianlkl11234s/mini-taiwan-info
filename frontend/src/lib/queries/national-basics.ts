/**
 * 全國基礎統計 query — Supabase fetch + hardcode fallback
 *
 * 對應後端：gis-platform/migrations/114_reference_national_basics.sql
 *   - reference.national_basics_latest（VIEW）— 一次拿月度 + 年度
 *
 * 設計：
 *   - Supabase 失敗時，回退到 ../national-basics.ts 的 hardcode baseline
 *   - 動態指標（pop/age/birth/death）以 Supabase 為準
 *   - 靜態指標（縣市/面積/海岸線）永遠走 hardcode（不入 DB）
 */
import { supabase } from "../supabase";
import {
  POPULATION,
  AGE_STRUCTURE,
  VITAL_STATISTICS,
  ADMINISTRATIVE,
  TERRITORY,
  NARRATIVE,
} from "../national-basics";

export interface NationalBasicsLatestRow {
  // Monthly
  year_month: string;
  pop_total: number;
  pop_male: number;
  pop_female: number;
  sex_ratio: number | null;
  pop_density: number | null;
  households: number | null;
  household_size: number | null;
  pop_0_14: number;
  pop_15_64: number;
  pop_65_plus: number;
  pct_0_14: number | null;
  pct_15_64: number | null;
  pct_65_plus: number | null;
  aging_index: number | null;
  dependency_ratio: number | null;
  birth_rate: number | null;
  death_rate: number | null;
  // Yearly
  yearly_year: number | null;
  villages_total: number | null;
  neighborhoods_total: number | null;
  natural_increase_rate: number | null;
  life_expectancy_total: number | null;
  // Meta
  monthly_source: string | null;
  monthly_source_url: string | null;
  monthly_fetched_at: string | null;
  yearly_fetched_at: string | null;
}

/** 整合 Supabase 動態 + 前端靜態 + 文案的單一 view-model */
export interface NationalBasicsViewModel {
  // 動態（Supabase 優先 / hardcode fallback）
  pop_total: number;
  pop_male: number;
  pop_female: number;
  sex_ratio: number;
  pop_density: number;
  households: number;
  household_size: number;
  pop_0_14: number;
  pop_15_64: number;
  pop_65_plus: number;
  pct_0_14: number;
  pct_15_64: number;
  pct_65_plus: number;
  aging_index: number;
  dependency_ratio: number;
  birth_rate: number;
  death_rate: number;
  natural_increase_rate: number;
  villages_total: number;
  neighborhoods_total: number;
  // 靜態（永遠 hardcode）
  cities_total: number;
  townships_total: number;
  total_area_km2: number;
  main_island_km2: number;
  offshore_islands_km2: number;
  inland_water_km2: number;
  coastline_km: number;
  // Meta
  as_of_month: string;   // "YYYY-MM"
  as_of_year: number;
  source: string;
  source_url: string;
  is_fallback: boolean;  // true 表 Supabase 拿不到，用 hardcode
}

/** Fallback baseline — 來自 national-basics.ts hardcode */
const FALLBACK: NationalBasicsViewModel = {
  pop_total:       POPULATION.total,
  pop_male:        POPULATION.male,
  pop_female:      POPULATION.female,
  sex_ratio:       POPULATION.sex_ratio,
  pop_density:     POPULATION.density,
  households:      POPULATION.households,
  household_size:  POPULATION.household_size,
  pop_0_14:        AGE_STRUCTURE.pop_0_14.value,
  pop_15_64:       AGE_STRUCTURE.pop_15_64.value,
  pop_65_plus:     AGE_STRUCTURE.pop_65_plus.value,
  pct_0_14:        AGE_STRUCTURE.pop_0_14.pct,
  pct_15_64:       AGE_STRUCTURE.pop_15_64.pct,
  pct_65_plus:     AGE_STRUCTURE.pop_65_plus.pct,
  aging_index:     AGE_STRUCTURE.aging_index,
  dependency_ratio: AGE_STRUCTURE.dependency_ratio,
  birth_rate:      VITAL_STATISTICS.birth_rate,
  death_rate:      VITAL_STATISTICS.death_rate,
  natural_increase_rate: VITAL_STATISTICS.natural_increase_rate,
  villages_total:      ADMINISTRATIVE.villages,
  neighborhoods_total: ADMINISTRATIVE.neighborhoods,
  cities_total:        ADMINISTRATIVE.cities.total,
  townships_total:     ADMINISTRATIVE.townships.total,
  total_area_km2:      TERRITORY.total_area_km2,
  main_island_km2:     TERRITORY.main_island_km2,
  offshore_islands_km2: TERRITORY.offshore_islands_km2,
  inland_water_km2:    TERRITORY.inland_water_km2,
  coastline_km:        TERRITORY.coastline_km,
  as_of_month:         POPULATION.as_of,
  as_of_year:          2024,
  source:              "內政部戶政司 / 統計處（hardcode baseline）",
  source_url:          "https://www.ris.gov.tw/app/portal/346",
  is_fallback:         true,
};

export async function fetchNationalBasicsLatest(): Promise<NationalBasicsViewModel> {
  try {
    const { data, error } = await supabase
      .schema("reference")
      .from("national_basics_latest")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn("[national-basics] Supabase fetch failed, using fallback:", error?.message);
      return FALLBACK;
    }

    const row = data as NationalBasicsLatestRow;
    return {
      pop_total:       row.pop_total       ?? FALLBACK.pop_total,
      pop_male:        row.pop_male        ?? FALLBACK.pop_male,
      pop_female:      row.pop_female      ?? FALLBACK.pop_female,
      sex_ratio:       row.sex_ratio       ?? FALLBACK.sex_ratio,
      pop_density:     row.pop_density     ?? FALLBACK.pop_density,
      households:      row.households      ?? FALLBACK.households,
      household_size:  row.household_size  ?? FALLBACK.household_size,
      pop_0_14:        row.pop_0_14        ?? FALLBACK.pop_0_14,
      pop_15_64:       row.pop_15_64       ?? FALLBACK.pop_15_64,
      pop_65_plus:     row.pop_65_plus     ?? FALLBACK.pop_65_plus,
      pct_0_14:        row.pct_0_14        ?? FALLBACK.pct_0_14,
      pct_15_64:       row.pct_15_64       ?? FALLBACK.pct_15_64,
      pct_65_plus:     row.pct_65_plus     ?? FALLBACK.pct_65_plus,
      aging_index:     row.aging_index     ?? FALLBACK.aging_index,
      dependency_ratio: row.dependency_ratio ?? FALLBACK.dependency_ratio,
      birth_rate:      row.birth_rate      ?? FALLBACK.birth_rate,
      death_rate:      row.death_rate      ?? FALLBACK.death_rate,
      natural_increase_rate: row.natural_increase_rate ?? FALLBACK.natural_increase_rate,
      villages_total:      row.villages_total      ?? FALLBACK.villages_total,
      neighborhoods_total: row.neighborhoods_total ?? FALLBACK.neighborhoods_total,
      // 靜態：永遠走 hardcode
      cities_total:        FALLBACK.cities_total,
      townships_total:     FALLBACK.townships_total,
      total_area_km2:      FALLBACK.total_area_km2,
      main_island_km2:     FALLBACK.main_island_km2,
      offshore_islands_km2: FALLBACK.offshore_islands_km2,
      inland_water_km2:    FALLBACK.inland_water_km2,
      coastline_km:        FALLBACK.coastline_km,
      as_of_month:         row.year_month  ?? FALLBACK.as_of_month,
      as_of_year:          row.yearly_year ?? FALLBACK.as_of_year,
      source:              row.monthly_source ?? FALLBACK.source,
      source_url:          row.monthly_source_url ?? FALLBACK.source_url,
      is_fallback:         false,
    };
  } catch (e) {
    console.warn("[national-basics] exception, using fallback:", e);
    return FALLBACK;
  }
}

/** 文案 helper — 動態組合 oneLiner */
export function composeOneLiner(vm: NationalBasicsViewModel): string {
  const popWan = Math.round(vm.pop_total / 10000);
  const popText = popWan.toLocaleString("en-US");
  return `${popText} 萬人，${vm.cities_total} 縣市，${vm.townships_total} 鄉鎮市區，${vm.villages_total.toLocaleString()} 村里 — ${vm.total_area_km2.toLocaleString()} km² 上的台灣`;
}

export { NARRATIVE };
