/**
 * useReservoirDetail — 單一水庫詳情（給 ViewC）
 *
 * 從 allReservoirs 找 metadata，呼叫 get_reservoir_timeseries 拿 1 年時序。
 */

import { useEffect, useState } from "react";
import {
  fetchReservoirTimeseries,
  type ReservoirStatusRow,
  type ReservoirTimeseriesRow,
} from "@/lib/queries/water";

export interface ReservoirDetail {
  loading: boolean;
  error: Error | null;
  /** 該水庫當前 status（從 allReservoirs 找到的） */
  current: ReservoirStatusRow | null;
  /** 過去 1 年時序（每小時一筆 ≈ 8760 筆，前端視覺會 downsample） */
  timeseries: ReservoirTimeseriesRow[];
}

export function useReservoirDetail(
  reservoirId: string | null,
  allReservoirs: ReservoirStatusRow[]
): ReservoirDetail {
  const [state, setState] = useState<ReservoirDetail>({
    loading: !!reservoirId,
    error: null,
    current: null,
    timeseries: [],
  });

  useEffect(() => {
    if (!reservoirId) {
      setState({ loading: false, error: null, current: null, timeseries: [] });
      return;
    }

    const current = allReservoirs.find((r) => r.reservoir_id === reservoirId) ?? null;

    const to = new Date();
    const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, current }));
    (async () => {
      try {
        const timeseries = await fetchReservoirTimeseries(reservoirId, from, to);
        if (cancelled) return;
        setState({ loading: false, error: null, current, timeseries });
      } catch (e) {
        if (cancelled) return;
        setState({
          loading: false,
          error: e instanceof Error ? e : new Error(String(e)),
          current,
          timeseries: [],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reservoirId, allReservoirs]);

  return state;
}

/**
 * 將高頻時序 downsample 成 N 個點（給 TrendChart 用）
 * 取 LTTB 演算法的簡化版（按 stride 取樣）。
 */
export function downsampleTimeseries<T>(
  rows: T[],
  targetN = 365
): T[] {
  if (rows.length <= targetN) return rows;
  const stride = Math.floor(rows.length / targetN);
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += stride) {
    out.push(rows[i]);
  }
  // 確保最後一筆在內
  if (out[out.length - 1] !== rows[rows.length - 1]) {
    out.push(rows[rows.length - 1]);
  }
  return out;
}
