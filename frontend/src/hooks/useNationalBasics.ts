/**
 * useNationalBasics — 首頁「全台概覽」基礎統計 hook
 *
 * 載入順序：
 *   1) 立即用 hardcode FALLBACK 渲染（不空白等網路）
 *   2) 背景 fetch Supabase reference.national_basics_latest
 *   3) 成功 → 換成真實資料；失敗 → 保留 FALLBACK
 *
 * 對應後端：gis-platform/migrations/114_reference_national_basics.sql
 */
import { useEffect, useState } from "react";
import {
  fetchNationalBasicsLatest,
  type NationalBasicsViewModel,
} from "@/lib/queries/national-basics";
import {
  POPULATION,
  AGE_STRUCTURE,
  VITAL_STATISTICS,
  ADMINISTRATIVE,
  TERRITORY,
} from "@/lib/national-basics";
import { cachedFetch, TTL_LONG } from "@/lib/cache";

type State = {
  data: NationalBasicsViewModel;
  loading: boolean;
  error: string | null;
};

// 與 queries/national-basics.ts 的 FALLBACK 同步（為 SSR / 初次渲染省去 import 鏈）
const INITIAL: NationalBasicsViewModel = {
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
  source:              "hardcode（initial）",
  source_url:          "https://www.ris.gov.tw/app/portal/346",
  is_fallback:         true,
};

export function useNationalBasics(): State {
  const [state, setState] = useState<State>({
    data: INITIAL,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    cachedFetch("national_basics:latest", TTL_LONG, fetchNationalBasicsLatest)
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          data: INITIAL,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
