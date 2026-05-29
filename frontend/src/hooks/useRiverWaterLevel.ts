/**
 * useRiverWaterLevel — Cycle E 河川水位 hook
 *
 * 平行拉：
 *   - get_river_water_level_latest()      → 356 row（全國 active 站最新水位）
 *   - from('river_flow_stations')         → 188 row（含警戒水位 1/2/3）
 *
 * 前端聚合：
 *   - 每站 alert_level（依水位 vs 警戒值）
 *   - 22 縣市 alert_pct = (達任一警戒站數) / (有警戒值設定的站數)
 *   - 22 縣市 n_active / max_water_level_m / latest_observed_at
 *
 * 真 LIVE：上游 WRA 每 10 分鐘更新 + collector cron + RPC 直接服務。
 */

import { useEffect, useState } from "react";
import {
  fetchRiverWaterLevelLatest,
  fetchRiverFlowStations,
  classifyAlertLevel,
  type RiverWaterLevelRow,
  type RiverFlowStation,
  type AlertLevel,
} from "@/lib/queries/river";
import { normalizeCountyName, codeConvert } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { cachedFetch, TTL_LIVE } from "@/lib/cache";

/**
 * 合併過的單站 — RPC latest reading + 站表警戒水位
 */
export interface RiverStation {
  station_id: string;
  station_name: string;
  river_name: string | null;
  county_id_moi: string | null;   // normalize 後的 id_moi
  county_code3: CountyCode3 | null;
  lat: number;
  lng: number;
  water_level_m: number | null;
  observed_at: string;
  check_result: number | null;
  alert_level_1_m: number | null;
  alert_level_2_m: number | null;
  alert_level_3_m: number | null;
  alert_level: AlertLevel;        // 0/1/2/3 or null（無警戒門檻）
}

export interface RiverCountySummary {
  county_id_moi: string;
  code3: CountyCode3;
  n_total: number;                // 該縣市總站數（latest 有回的）
  n_with_alert: number;           // 有設警戒門檻的站數
  n_alert_1: number;
  n_alert_2: number;
  n_alert_3: number;
  n_any_alert: number;            // 達任一警戒（>=1）
  alert_pct: number;              // n_any_alert / n_with_alert * 100（無警戒站時為 0）
  max_water_level_m: number | null;
  latest_observed_at: string | null;
}

export interface RiverWaterLevelState {
  loading: boolean;
  error: Error | null;
  stations: RiverStation[];
  countySummary: RiverCountySummary[];
  byCode3: Record<CountyCode3, RiverCountySummary>;
  /** 全國最新 reading 時間（max of 所有 stations.observed_at） */
  latestObservedAt: string | null;
  /** 全國達警戒站數 (任一級) */
  nationalAlertCount: number;
  /** 全國有警戒門檻設定的站總數 */
  nationalAlertableCount: number;
}

export function useRiverWaterLevel(): RiverWaterLevelState {
  const [state, setState] = useState<RiverWaterLevelState>({
    loading: true,
    error: null,
    stations: [],
    countySummary: [],
    byCode3: {} as Record<CountyCode3, RiverCountySummary>,
    latestObservedAt: null,
    nationalAlertCount: 0,
    nationalAlertableCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [latest, stations] = await Promise.all([
          cachedFetch("river_water_level:latest", TTL_LIVE, fetchRiverWaterLevelLatest),
          cachedFetch("river_water_level:flow_stations", TTL_LIVE, fetchRiverFlowStations),
        ]);
        if (cancelled) return;

        // index 站表（id → alert levels）
        const stationMeta = new Map<string, RiverFlowStation>();
        for (const s of stations) stationMeta.set(s.id, s);

        // 合併
        const merged: RiverStation[] = latest.map((r: RiverWaterLevelRow) => {
          const meta = stationMeta.get(r.station_id);
          const idMoi = normalizeCountyName(r.county ?? "");
          const code = idMoi ? codeConvert.idMoiToCode3(idMoi) : null;
          const a1 = meta?.alert_level_1_m ?? null;
          const a2 = meta?.alert_level_2_m ?? null;
          const a3 = meta?.alert_level_3_m ?? null;
          return {
            station_id: r.station_id,
            station_name: r.station_name,
            river_name: meta?.river_name ?? null,
            county_id_moi: idMoi,
            county_code3: (code as CountyCode3 | null) ?? null,
            lat: r.lat,
            lng: r.lng,
            water_level_m: r.water_level_m,
            observed_at: r.observed_at,
            check_result: r.check_result,
            alert_level_1_m: a1,
            alert_level_2_m: a2,
            alert_level_3_m: a3,
            alert_level: classifyAlertLevel(r.water_level_m, a1, a2, a3),
          };
        });

        // 22 縣市聚合
        const byCode3: Record<string, RiverCountySummary> = {};
        for (const st of merged) {
          if (!st.county_code3 || !st.county_id_moi) continue;
          const k = st.county_code3;
          let row = byCode3[k];
          if (!row) {
            row = {
              county_id_moi: st.county_id_moi,
              code3: k as CountyCode3,
              n_total: 0,
              n_with_alert: 0,
              n_alert_1: 0,
              n_alert_2: 0,
              n_alert_3: 0,
              n_any_alert: 0,
              alert_pct: 0,
              max_water_level_m: null,
              latest_observed_at: null,
            };
            byCode3[k] = row;
          }
          row.n_total++;
          const hasAlert =
            st.alert_level_1_m != null ||
            st.alert_level_2_m != null ||
            st.alert_level_3_m != null;
          if (hasAlert) row.n_with_alert++;
          if (st.alert_level === 1) row.n_alert_1++;
          if (st.alert_level === 2) row.n_alert_2++;
          if (st.alert_level === 3) row.n_alert_3++;
          if (st.alert_level != null && st.alert_level >= 1) row.n_any_alert++;
          if (st.water_level_m != null) {
            row.max_water_level_m = Math.max(
              row.max_water_level_m ?? Number.NEGATIVE_INFINITY,
              st.water_level_m
            );
          }
          if (
            row.latest_observed_at == null ||
            st.observed_at > row.latest_observed_at
          ) {
            row.latest_observed_at = st.observed_at;
          }
        }
        for (const row of Object.values(byCode3)) {
          row.alert_pct =
            row.n_with_alert > 0 ? (row.n_any_alert / row.n_with_alert) * 100 : 0;
        }

        const countySummary = Object.values(byCode3).sort(
          (a, b) => b.alert_pct - a.alert_pct
        );

        // 全國
        let nationalAlertCount = 0;
        let nationalAlertableCount = 0;
        let latestTs: string | null = null;
        for (const st of merged) {
          const hasAlert =
            st.alert_level_1_m != null ||
            st.alert_level_2_m != null ||
            st.alert_level_3_m != null;
          if (hasAlert) nationalAlertableCount++;
          if (st.alert_level != null && st.alert_level >= 1) nationalAlertCount++;
          if (latestTs == null || st.observed_at > latestTs) {
            latestTs = st.observed_at;
          }
        }

        setState({
          loading: false,
          error: null,
          stations: merged,
          countySummary,
          byCode3: byCode3 as Record<CountyCode3, RiverCountySummary>,
          latestObservedAt: latestTs,
          nationalAlertCount,
          nationalAlertableCount,
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
        console.error("[useRiverWaterLevel] fetch failed:", e);
        setState((s) => ({ ...s, loading: false, error: err }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
