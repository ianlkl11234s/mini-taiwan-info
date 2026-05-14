/**
 * useCountyData — 單一縣市的所有水資源資料
 *
 * 給 ViewB（高雄）/ ViewC（阿公店）用。
 */

import { useEffect, useState } from "react";
import {
  fetchLpcdHistory,
  fetchSewageHistory,
  type LpcdRow,
  type SewageRow,
  type ReservoirStatusRow,
} from "@/lib/queries/water";
import { getNearestCounty } from "@/lib/reverseGeocode";
import type { CountyCode3 } from "@/lib/types";
import { codeConvert } from "@/lib/counties";

export interface CountyData {
  loading: boolean;
  error: Error | null;
  /** 該縣市 LPCD 歷年（年遞增） */
  lpcdHistory: LpcdRow[];
  /** 該縣市接管率歷年 */
  sewageHistory: SewageRow[];
  /** 該縣市水庫（由 reservoir lat/lng nearest-centroid 推得） */
  countyReservoirs: ReservoirStatusRow[];
}

export function useCountyData(
  countyCode3: CountyCode3 | null,
  allReservoirs: ReservoirStatusRow[]
): CountyData {
  const [state, setState] = useState<CountyData>({
    loading: !!countyCode3,
    error: null,
    lpcdHistory: [],
    sewageHistory: [],
    countyReservoirs: [],
  });

  useEffect(() => {
    if (!countyCode3) {
      setState({
        loading: false,
        error: null,
        lpcdHistory: [],
        sewageHistory: [],
        countyReservoirs: [],
      });
      return;
    }

    const idMoi = codeConvert.code3ToIdMoi(countyCode3);
    if (!idMoi) {
      setState((s) => ({ ...s, loading: false, error: new Error(`Unknown county: ${countyCode3}`) }));
      return;
    }

    // 推算該縣市的水庫
    const countyReservoirs = allReservoirs.filter(
      (r) =>
        r.lat != null &&
        r.lng != null &&
        getNearestCounty(r.lng, r.lat) === countyCode3
    );

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const [lpcdHistory, sewageHistory] = await Promise.all([
          fetchLpcdHistory(idMoi),
          fetchSewageHistory(idMoi),
        ]);
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          lpcdHistory,
          sewageHistory,
          countyReservoirs,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          loading: false,
          error: e instanceof Error ? e : new Error(String(e)),
          lpcdHistory: [],
          sewageHistory: [],
          countyReservoirs,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countyCode3, allReservoirs]);

  return state;
}
