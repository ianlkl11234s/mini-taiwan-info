/**
 * useDemographicsData — 人口主題全國資料 hook
 *
 * Promise.allSettled 並行拉：
 *   - demographics.population_by_age_sex_county（2024+2025 並存，金字塔 + 縣市加總；derive 端依最新 statYear 篩選）
 *   - spatial.national_population_trend（10，民國 104-113 全國加總）
 *   - spatial.village_demographics_yearly（限 year=104 + year=113，~16,000 筆，給縣市 growth/hhSize/birth/death）
 *   - demographics.county_indicators_yearly（22，官方縣市指標 2025；非關鍵增強，失敗不阻斷）
 *
 * 對應 themes/demographics.yaml（status=draft）。
 */

import { useEffect, useState } from "react";
import {
  fetchPopulationByAgeSex,
  fetchNationalTrend,
  fetchVillageYearly,
  fetchCountyIndicatorsYearly,
  buildCountyIndicatorMap,
  latestStatYear,
  deriveNationalPyramid,
  deriveNationalSummary,
  deriveVitalsTrend,
  deriveAgingHistory,
  deriveCountyAggregates,
  LATEST_YEAR_MINGUO,
  BASE_YEAR_MINGUO,
  type PopulationByAgeSexRow,
  type NationalTrendRow,
  type VillageDemographicsRow,
  type CountyIndicatorRow,
  type DemographicsNationalSummary,
  type AgeRow,
  type VitalRow,
  type AgingHistoryRow,
  type CountyDemographics,
} from "@/lib/queries/demographics";
import { cachedFetch, TTL_LONG } from "@/lib/cache";

export interface DemographicsDataState {
  loading: boolean;
  error: Error | null;
  // raw（pyramidRows 含全部年度，derive 端依 statYear 篩選）
  pyramidRows: PopulationByAgeSexRow[];
  trendRows: NationalTrendRow[];
  villageRows: VillageDemographicsRow[];
  // 金字塔 / 概覽展示的統計年（西元，最新年；目前 2025）
  statYear: number;
  // derived
  summary: DemographicsNationalSummary | null;
  pyramid: AgeRow[];                  // 該年實際 age_band（2025=21 組）
  vitalsTrend: VitalRow[];            // 民 104-113 西元 2015-2024
  agingHistory: AgingHistoryRow[];
  countyAggregates: CountyDemographics[];
}

const EMPTY: DemographicsDataState = {
  loading: true,
  error: null,
  pyramidRows: [],
  trendRows: [],
  villageRows: [],
  statYear: 0,
  summary: null,
  pyramid: [],
  vitalsTrend: [],
  agingHistory: [],
  countyAggregates: [],
};

export function useDemographicsData(opts: { enabled?: boolean } = {}): DemographicsDataState {
  const { enabled = true } = opts;
  const [state, setState] = useState<DemographicsDataState>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      // 保留已拿到的資料（切回時無 loading flash）；若還沒載就標 loading=false
      setState((prev) => prev.loading ? { ...EMPTY, loading: false } : prev);
      return;
    }
    // 有資料就不重設 loading=true，直接沿用（cachedFetch 會在背景靜默刷新）
    setState((prev) => prev.summary !== null ? prev : { ...prev, loading: true, error: null });
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        cachedFetch("demographics:population_by_age", TTL_LONG, fetchPopulationByAgeSex),
        cachedFetch("demographics:national_trend", TTL_LONG, fetchNationalTrend),
        cachedFetch(
          `demographics:village_yearly:${BASE_YEAR_MINGUO}-${LATEST_YEAR_MINGUO}`,
          TTL_LONG,
          () => fetchVillageYearly([BASE_YEAR_MINGUO, LATEST_YEAR_MINGUO]),
        ),
        cachedFetch("demographics:county_indicators_yearly", TTL_LONG, fetchCountyIndicatorsYearly),
      ]);
      if (cancelled) return;

      const pyramidRows = results[0].status === "fulfilled" ? results[0].value : [];
      const trendRows = results[1].status === "fulfilled" ? results[1].value : [];
      const villageRows = results[2].status === "fulfilled" ? results[2].value : [];
      const indicatorRows: CountyIndicatorRow[] =
        results[3].status === "fulfilled" ? results[3].value : [];

      // county_indicators_yearly 為非關鍵增強來源，失敗不算 error（沿用計算值即可）
      const errors = results
        .slice(0, 3)
        .filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      const firstError = errors[0]?.reason instanceof Error ? errors[0].reason : null;

      // 金字塔/概覽預設展示最新統計年（目前 2025）；空資料退回 0
      const statYear = latestStatYear(pyramidRows);
      const indicatorMap = buildCountyIndicatorMap(indicatorRows);

      // partial-data fallback：任一表失敗，仍以拿到的算 derived（其他 derive 對應 null）
      const summary =
        pyramidRows.length > 0 && trendRows.length > 0
          ? deriveNationalSummary(pyramidRows, trendRows, statYear, villageRows)
          : null;
      const pyramid = pyramidRows.length > 0 ? deriveNationalPyramid(pyramidRows, statYear) : [];
      const vitalsTrend = trendRows.length > 0 ? deriveVitalsTrend(trendRows) : [];
      const agingHistory = trendRows.length > 0 ? deriveAgingHistory(trendRows) : [];
      const countyAggregates =
        pyramidRows.length > 0
          ? deriveCountyAggregates(pyramidRows, villageRows, statYear, indicatorMap)
          : [];

      setState({
        loading: false,
        error: firstError,
        pyramidRows,
        trendRows,
        villageRows,
        statYear,
        summary,
        pyramid,
        vitalsTrend,
        agingHistory,
        countyAggregates,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
