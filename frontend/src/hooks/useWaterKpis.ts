/**
 * useWaterKpis — 水主題全國 KPI hook
 *
 * 一次拉兩個 RPC（水庫 + 雨量），聚合給 ViewA 用。
 * Phase 0c-1：取代 mock-data 的 WATER_NATIONAL_MOCK。
 */

import { useEffect, useState } from "react";
import {
  fetchReservoirStatusLatest,
  fetchRainGaugeLatest,
  fetchGovernanceSummary,
  aggregateWaterKpis,
  type ReservoirStatusRow,
  type RainGaugeRow,
  type WaterKpiSummary,
  type GovernanceSummary,
} from "@/lib/queries/water";

export interface WaterKpisState {
  loading: boolean;
  error: Error | null;
  summary: WaterKpiSummary | null;
  reservoirs: ReservoirStatusRow[];
  rainStations: RainGaugeRow[];
  /** Phase 0c-2/0c-3：LPCD + 接管率（表存在才有資料；空表 fallback 為 null） */
  governance: GovernanceSummary | null;
}

export function useWaterKpis(): WaterKpisState {
  const [state, setState] = useState<WaterKpisState>({
    loading: true,
    error: null,
    summary: null,
    reservoirs: [],
    rainStations: [],
    governance: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reservoirs, rainStations, governance] = await Promise.all([
          fetchReservoirStatusLatest(),
          fetchRainGaugeLatest(),
          fetchGovernanceSummary(),
        ]);
        if (cancelled) return;
        const summary = aggregateWaterKpis(reservoirs, rainStations);
        setState({
          loading: false,
          error: null,
          summary,
          reservoirs,
          rainStations,
          governance,
        });
      } catch (e) {
        if (cancelled) return;
        // Supabase PostgrestError 是 {message, code, details, hint} 物件
        const err =
          e instanceof Error
            ? e
            : new Error(
                (e as { message?: string })?.message ??
                  (typeof e === "object" ? JSON.stringify(e) : String(e))
              );
        // eslint-disable-next-line no-console
        console.error("[useWaterKpis] fetch failed:", e);
        setState({
          loading: false,
          error: err,
          summary: null,
          reservoirs: [],
          rainStations: [],
          governance: null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
