/**
 * useWaterKpis — 水主題全國 KPI hook（單一大 hook，仿 fire pattern）
 *
 * 並行 fetch：
 *   - reservoir status / rain gauge / governance / flood（原有 4 個）
 *   - water_facts_official / drought_alert / treatment（淨水場/管線/用戶/汙水廠/月供水）
 *   - water_loss / sewage_history / detention / subsidence（新增 7 個）
 *
 * 各 query 失敗獨立 fallback（不會整個 hook 死），給 ViewAWater 6 章敘事用。
 * 既有 ViewA / ViewB 沿用 summary/reservoirs/rainStations/governance/flood 欄位（向下相容）。
 */

import { useEffect, useState } from "react";
import {
  fetchReservoirStatusLatest,
  fetchRainGaugeLatest,
  fetchGovernanceSummary,
  fetchFloodPctByCounty,
  fetchGroundwaterLatest,
  deriveGroundwaterSummary,
  aggregateWaterKpis,
  aggregateFloodPct,
  type ReservoirStatusRow,
  type RainGaugeRow,
  type WaterKpiSummary,
  type GovernanceSummary,
  type FloodSummary,
  type GroundwaterStationRow,
  type GroundwaterSummary,
} from "@/lib/queries/water";
import {
  fetchWaterFacts,
  buildScale,
  fetchDroughtAlertCurrent,
  fetchDroughtAlertHistory,
  fetchPipelineHistory,
  fetchCustomerHistory,
  fetchTreatmentPlantsLarge,
  fetchSewagePlantsCount,
  fetchLatestMonthSupply,
  fetchWaterLossRate,
  fetchSewageNationalHistory,
  fetchDetentionSummary,
  fetchSubsidenceTopCounties,
  type WaterFactRow,
  type OverviewScale,
  type DroughtAlertRow,
  type DroughtAlertHistoryRow,
  type PipelineYearRow,
  type CustomerYearRow,
  type TreatmentPlantsLargeRow,
  type LatestMonthSupply,
  type WaterLossSummary,
  type DetentionSummary,
  type SubsidenceCountyRow,
} from "@/lib/queries/water-overview";

export interface WaterKpisState {
  loading: boolean;
  error: Error | null;
  // 原有（向下相容 ViewA / ViewB）
  summary: WaterKpiSummary | null;
  reservoirs: ReservoirStatusRow[];
  rainStations: RainGaugeRow[];
  governance: GovernanceSummary | null;
  flood: FloodSummary | null;
  // 新增（給 ViewAWater 6 章）
  scale: OverviewScale | null;                          // 章 1
  facts: WaterFactRow[];
  droughtCurrent: DroughtAlertRow[];                    // 章 3 當前燈號
  droughtHistory: DroughtAlertHistoryRow[];             // 章 3 timeline（collector 累積中）
  pipelineHistory: PipelineYearRow[];                   // 章 4 配水管線 trend
  customerHistory: CustomerYearRow[];                   // 章 4 用戶數 trend
  treatmentPlantsLarge: TreatmentPlantsLargeRow[];      // 章 4 大型淨水場
  sewagePlantsCount: number;                            // 章 4 公共汙水廠
  monthlySupply: LatestMonthSupply | null;              // 章 4 最新月供水
  waterLoss: WaterLossSummary;                          // 章 5 漏水率
  sewageNationalHistory: Array<{ year: number; coverage_avg: number }>; // 章 5 trend
  detention: DetentionSummary | null;                   // 章 6 滯洪池
  subsidenceTop: SubsidenceCountyRow[];                 // 章 6 地層下陷
  // 章 2 補：地下水即時水位（migration 046 + Collector cron 每小時，959 監測井）
  groundwaterStations: GroundwaterStationRow[];
  groundwaterSummary: GroundwaterSummary | null;
}

const EMPTY_STATE: WaterKpisState = {
  loading: true,
  error: null,
  summary: null,
  reservoirs: [],
  rainStations: [],
  governance: null,
  flood: null,
  scale: null,
  facts: [],
  droughtCurrent: [],
  droughtHistory: [],
  pipelineHistory: [],
  customerHistory: [],
  treatmentPlantsLarge: [],
  sewagePlantsCount: 82,
  monthlySupply: null,
  waterLoss: { national_latest: null, national_year: null, national_delta_pp: null },
  sewageNationalHistory: [],
  detention: null,
  subsidenceTop: [],
  groundwaterStations: [],
  groundwaterSummary: null,
};

export function useWaterKpis(): WaterKpisState {
  const [state, setState] = useState<WaterKpisState>(EMPTY_STATE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 用 Promise.allSettled 避免任一 query throw 拖垮整個 hook。
        // fetchReservoirStatusLatest / fetchRainGaugeLatest 內部仍會 throw（向下相容
        // ViewA / ViewB 的舊行為），這層獨立 fallback。
        const results = await Promise.allSettled([
          fetchReservoirStatusLatest(),          // 0
          fetchRainGaugeLatest(),                // 1
          fetchGovernanceSummary(),              // 2
          fetchFloodPctByCounty(350, 24),        // 3
          fetchWaterFacts(),                     // 4
          fetchDroughtAlertCurrent(),            // 5
          fetchDroughtAlertHistory(200),         // 6
          fetchPipelineHistory(),                // 7
          fetchCustomerHistory(),                // 8
          fetchTreatmentPlantsLarge(),           // 9
          fetchSewagePlantsCount(),              // 10
          fetchLatestMonthSupply(),              // 11
          fetchWaterLossRate(),                  // 12
          fetchSewageNationalHistory(),          // 13
          fetchDetentionSummary(),               // 14
          fetchSubsidenceTopCounties(5),         // 15
          fetchGroundwaterLatest(),              // 16
        ]);
        if (cancelled) return;

        // helper：fulfilled 值或 fallback
        const get = <T,>(idx: number, fallback: T): T =>
          results[idx].status === "fulfilled"
            ? ((results[idx] as PromiseFulfilledResult<T>).value ?? fallback)
            : fallback;

        // log 失敗的 query 名（給 dev 看，不阻塞 UI）
        const queryNames = [
          "reservoir", "rain", "governance", "flood",
          "facts", "drought_current", "drought_history",
          "pipeline", "customer", "treatment_plants_large",
          "sewage_plants_count", "monthly_supply", "water_loss",
          "sewage_national_history", "detention", "subsidence",
          "groundwater",
        ];
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            // eslint-disable-next-line no-console
            console.warn(`[useWaterKpis] ${queryNames[i]} fetch failed:`, r.reason);
          }
        });

        const reservoirs = get(0, [] as ReservoirStatusRow[]);
        const rainStations = get(1, [] as RainGaugeRow[]);
        const governance = get<GovernanceSummary | null>(2, null);
        const floodRows = get(3, [] as Awaited<ReturnType<typeof fetchFloodPctByCounty>>);
        const facts = get(4, [] as WaterFactRow[]);
        const droughtCurrent = get(5, [] as DroughtAlertRow[]);
        const droughtHistory = get(6, [] as DroughtAlertHistoryRow[]);
        const pipelineHistory = get(7, [] as PipelineYearRow[]);
        const customerHistory = get(8, [] as CustomerYearRow[]);
        const treatmentPlantsLarge = get(9, [] as TreatmentPlantsLargeRow[]);
        const sewagePlantsCount = get(10, 82);
        const monthlySupply = get<LatestMonthSupply | null>(11, null);
        const waterLoss = get<WaterLossSummary>(12, EMPTY_STATE.waterLoss);
        const sewageNationalHistory = get(13, [] as Array<{ year: number; coverage_avg: number }>);
        const detention = get<DetentionSummary | null>(14, null);
        const subsidenceTop = get(15, [] as SubsidenceCountyRow[]);
        const groundwaterStations = get(16, [] as GroundwaterStationRow[]);
        const summary = aggregateWaterKpis(reservoirs, rainStations);
        const flood = aggregateFloodPct(floodRows);
        const scale = buildScale(facts, reservoirs.length, rainStations.length);
        setState({
          loading: false,
          error: null,
          summary,
          reservoirs,
          rainStations,
          governance,
          flood,
          scale,
          facts,
          droughtCurrent,
          droughtHistory,
          pipelineHistory,
          customerHistory,
          treatmentPlantsLarge,
          sewagePlantsCount,
          monthlySupply,
          waterLoss,
          sewageNationalHistory,
          detention,
          subsidenceTop,
          groundwaterStations,
          groundwaterSummary: deriveGroundwaterSummary(groundwaterStations),
        });
      } catch (e) {
        if (cancelled) return;
        const err =
          e instanceof Error
            ? e
            : new Error(
                (e as { message?: string })?.message ??
                  (typeof e === "object" ? JSON.stringify(e) : String(e))
              );
        // eslint-disable-next-line no-console
        console.error("[useWaterKpis] fetch failed:", e);
        setState({ ...EMPTY_STATE, loading: false, error: err });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
