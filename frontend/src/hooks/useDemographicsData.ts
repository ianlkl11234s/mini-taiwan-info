/**
 * useDemographicsData — 人口主題全國資料 hook
 *
 * Promise.allSettled 並行拉：
 *   - demographics.population_by_age_sex_county（836，金字塔 + 縣市加總用）
 *   - spatial.national_population_trend（10，民國 104-113 全國加總）
 *   - spatial.village_demographics_yearly（限 year=104 + year=113，~16,000 筆，給縣市 growth/hhSize/birth/death）
 *
 * 對應 themes/demographics.yaml（status=draft）。
 */

import { useEffect, useState } from "react";
import {
  fetchPopulationByAgeSex,
  fetchNationalTrend,
  fetchVillageYearly,
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
  type DemographicsNationalSummary,
  type AgeRow,
  type VitalRow,
  type AgingHistoryRow,
  type CountyDemographics,
} from "@/lib/queries/demographics";

export interface DemographicsDataState {
  loading: boolean;
  error: Error | null;
  // raw
  pyramidRows: PopulationByAgeSexRow[];
  trendRows: NationalTrendRow[];
  villageRows: VillageDemographicsRow[];
  // derived
  summary: DemographicsNationalSummary | null;
  pyramid: AgeRow[];                  // 19 組
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
      setState({ ...EMPTY, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        fetchPopulationByAgeSex(),
        fetchNationalTrend(),
        fetchVillageYearly([BASE_YEAR_MINGUO, LATEST_YEAR_MINGUO]),
      ]);
      if (cancelled) return;

      const pyramidRows = results[0].status === "fulfilled" ? results[0].value : [];
      const trendRows = results[1].status === "fulfilled" ? results[1].value : [];
      const villageRows = results[2].status === "fulfilled" ? results[2].value : [];

      const errors = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      const firstError = errors[0]?.reason instanceof Error ? errors[0].reason : null;

      // partial-data fallback：任一表失敗，仍以拿到的算 derived（其他 derive 對應 null）
      const summary =
        pyramidRows.length > 0 && trendRows.length > 0
          ? deriveNationalSummary(pyramidRows, trendRows)
          : null;
      const pyramid = pyramidRows.length > 0 ? deriveNationalPyramid(pyramidRows) : [];
      const vitalsTrend = trendRows.length > 0 ? deriveVitalsTrend(trendRows) : [];
      const agingHistory = trendRows.length > 0 ? deriveAgingHistory(trendRows) : [];
      const countyAggregates =
        pyramidRows.length > 0 ? deriveCountyAggregates(pyramidRows, villageRows) : [];

      setState({
        loading: false,
        error: firstError,
        pyramidRows,
        trendRows,
        villageRows,
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
