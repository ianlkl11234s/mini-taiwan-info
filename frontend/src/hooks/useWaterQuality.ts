/**
 * useWaterQuality — Cycle A 水質測站資料
 *
 * 拉兩支 RPC（縣市平均 + 該縣市測站清單），給 ViewB 河川水質 / 水質 tab 用。
 */

import { useEffect, useState } from "react";
import {
  fetchWaterQualityByCounty,
  fetchWaterQualityStations,
  type WaterQualityCountySummary,
  type WaterQualityStation,
  type WaterStationType,
  type WaterParam,
} from "@/lib/queries/water";
import { cachedFetch, TTL_SHORT } from "@/lib/cache";

export interface WaterQualityState {
  loading: boolean;
  error: Error | null;
  /** 22 縣市某參數平均（依 param 拉一次） */
  countySummary: WaterQualityCountySummary[];
  /** 該縣市測站清單 + 最新 reading */
  stations: WaterQualityStation[];
}

export function useWaterQuality(
  param: WaterParam = "DO",
  countyIdMoi: string | null = null,
  stationType: WaterStationType | "all" = "reservoir"
): WaterQualityState {
  const [state, setState] = useState<WaterQualityState>({
    loading: true,
    error: null,
    countySummary: [],
    stations: [],
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const type = stationType === "all" ? undefined : stationType;
        const typeKey = type ?? "all";
        const [summary, stations] = await Promise.all([
          cachedFetch(
            `water_quality:by_county:${param}:${typeKey}`,
            TTL_SHORT,
            () => fetchWaterQualityByCounty(param, 365, type),
          ),
          countyIdMoi
            ? cachedFetch(
                `water_quality:stations:${typeKey}:${countyIdMoi}`,
                TTL_SHORT,
                () => fetchWaterQualityStations(type, countyIdMoi),
              )
            : Promise.resolve([] as WaterQualityStation[]),
        ]);
        if (cancelled) return;
        setState({ loading: false, error: null, countySummary: summary, stations });
      } catch (e) {
        if (cancelled) return;
        setState({
          loading: false,
          error: e instanceof Error ? e : new Error(String(e)),
          countySummary: [],
          stations: [],
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [param, countyIdMoi, stationType]);

  return state;
}
