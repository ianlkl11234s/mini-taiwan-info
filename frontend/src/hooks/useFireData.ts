/**
 * useFireData — 消防主題全國資料 hook
 *
 * 一次拉所有 MV + RPC，聚合給 ViewAFire 用。
 * 對應 themes/fire.yaml (v2)。Backend: gis-platform/migrations/099_fire_schema.sql
 */

import { useEffect, useState } from "react";
import {
  fetchCauseTaxonomy,
  fetchIncidentsByCountyYear,
  fetchIncidentsByCauseYear,
  fetchIncidentsByHourMonth,
  fetchIncidentsByDayOfYear,
  listIncidents,
  deriveNationalSummary,
  deriveCountyAggregates,
  deriveCauseAggregates,
  deriveMonthlyTotals,
  deriveHourlyTotals,
  deriveDaypart,
  deriveYearlyTotals,
  deriveDayOfYearSeries,
  type CauseTaxonomyRow,
  type FireNationalSummary,
  type FireCountyAggregate,
  type FireCauseAggregate,
  type IncidentsByCountyYearRow,
  type IncidentsByCauseYearRow,
  type IncidentsByHourMonthRow,
  type IncidentsByDayOfYearRow,
  type IncidentRow,
} from "@/lib/queries/fire";

export interface FireDataState {
  loading: boolean;
  error: Error | null;

  /** Raw MV rows（給進階聚合 / county view 用） */
  countyYear: IncidentsByCountyYearRow[];
  causeYear: IncidentsByCauseYearRow[];
  hourMonth: IncidentsByHourMonthRow[];
  dayOfYear: IncidentsByDayOfYearRow[];
  taxonomy: CauseTaxonomyRow[];

  /** 個案點位（最新年）— heatmap 用 */
  incidentPoints: IncidentRow[];

  /** Derived */
  summary: FireNationalSummary | null;
  countyAggregates: FireCountyAggregate[];
  causeAggregates: FireCauseAggregate[];
  yearlyTotals: Array<{ year_minguo: number; incidents: number }>;
  monthlyTotals: Array<{ month: number; incidents: number }>;
  hourlyTotals: Array<{ hour: number; incidents: number }>;
  dayOfYearSeries: Array<{ day_index: number; month: number; day: number; incidents: number }>;
  daypart: Array<{ label: string; bucket: string; value: number }>;
}

const EMPTY_STATE: FireDataState = {
  loading: true,
  error: null,
  countyYear: [],
  causeYear: [],
  hourMonth: [],
  dayOfYear: [],
  taxonomy: [],
  incidentPoints: [],
  summary: null,
  countyAggregates: [],
  causeAggregates: [],
  yearlyTotals: [],
  monthlyTotals: [],
  hourlyTotals: [],
  dayOfYearSeries: [],
  daypart: [],
};

export function useFireData(opts: { enabled?: boolean } = {}): FireDataState {
  const { enabled = true } = opts;
  const [state, setState] = useState<FireDataState>(EMPTY_STATE);

  useEffect(() => {
    if (!enabled) {
      setState({ ...EMPTY_STATE, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [taxonomy, countyYear, causeYear, hourMonth, dayOfYear, incidentPoints] =
          await Promise.all([
            fetchCauseTaxonomy(),
            fetchIncidentsByCountyYear(),
            fetchIncidentsByCauseYear(),
            fetchIncidentsByHourMonth(),
            // 最新民國年 365 點：取 113 一年（壓縮 payload）
            fetchIncidentsByDayOfYear(113),
            // B045：113 年單年個案點位給 map heatmap（~12k 點，gzip ~400KB）
            listIncidents({ yearMin: 113, yearMax: 113, limit: 50000 }),
          ]);
        if (cancelled) return;

        const summary = deriveNationalSummary(countyYear, causeYear);
        const latest = summary?.latest_year_minguo ?? 113;

        setState({
          loading: false,
          error: null,
          countyYear,
          causeYear,
          hourMonth,
          dayOfYear,
          taxonomy,
          incidentPoints,
          summary,
          countyAggregates: deriveCountyAggregates(countyYear),
          causeAggregates: deriveCauseAggregates(causeYear, latest),
          yearlyTotals: deriveYearlyTotals(countyYear),
          monthlyTotals: deriveMonthlyTotals(hourMonth),
          hourlyTotals: deriveHourlyTotals(hourMonth),
          dayOfYearSeries: deriveDayOfYearSeries(dayOfYear),
          daypart: deriveDaypart(hourMonth),
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
        console.error("[useFireData] fetch failed:", e);
        setState({ ...EMPTY_STATE, loading: false, error: err });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
