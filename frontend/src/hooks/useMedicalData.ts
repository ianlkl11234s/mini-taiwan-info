/**
 * useMedicalData — 醫療主題全國資料 hook
 *
 * 並行拉 4 個 RPC：county_stats + AED 點位 + LTC 點位 + 急救醫院點位。
 * Promise.allSettled，partial-failure 不拖垮。
 */

import { useEffect, useState } from "react";
import {
  fetchMedicalCountyStats,
  fetchAedPoints,
  fetchLtcPoints,
  fetchEmergencyHospitalPoints,
  deriveCountyAggregates,
  deriveNationalSummary,
  type MedicalCountyRow,
  type AedPointRow,
  type LtcPointRow,
  type EmergencyHospitalPointRow,
  type CountyMedicalAggregate,
  type MedicalNationalSummary,
} from "@/lib/queries/medical";
import { cachedFetch, TTL_LONG } from "@/lib/cache";

export interface MedicalDataState {
  loading: boolean;
  error: Error | null;
  rows: MedicalCountyRow[];
  countyAggregates: CountyMedicalAggregate[];
  summary: MedicalNationalSummary | null;
  aedPoints: AedPointRow[];
  ltcPoints: LtcPointRow[];
  emergencyHospitalPoints: EmergencyHospitalPointRow[];
}

const EMPTY: MedicalDataState = {
  loading: true,
  error: null,
  rows: [],
  countyAggregates: [],
  summary: null,
  aedPoints: [],
  ltcPoints: [],
  emergencyHospitalPoints: [],
};

export function useMedicalData(opts: { enabled?: boolean } = {}): MedicalDataState {
  const enabled = opts.enabled ?? true;
  const [state, setState] = useState<MedicalDataState>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setState({ ...EMPTY, loading: false });
      return;
    }

    let cancelled = false;
    setState(EMPTY);

    (async () => {
      try {
        const [statsResult, aedResult, ltcResult, ehResult] = await Promise.allSettled([
          cachedFetch<MedicalCountyRow[]>("medical:county_stats", TTL_LONG, fetchMedicalCountyStats),
          cachedFetch<AedPointRow[]>("medical:aed_points", TTL_LONG, fetchAedPoints),
          cachedFetch<LtcPointRow[]>("medical:ltc_points", TTL_LONG, fetchLtcPoints),
          cachedFetch<EmergencyHospitalPointRow[]>("medical:eh_points", TTL_LONG, fetchEmergencyHospitalPoints),
        ]);

        if (cancelled) return;

        const rows = statsResult.status === "fulfilled" ? statsResult.value : [];
        const aedPoints = aedResult.status === "fulfilled" ? aedResult.value : [];
        const ltcPoints = ltcResult.status === "fulfilled" ? ltcResult.value : [];
        const emergencyHospitalPoints = ehResult.status === "fulfilled" ? ehResult.value : [];

        if (statsResult.status === "rejected") {
          throw statsResult.reason;
        }

        const countyAggregates = deriveCountyAggregates(rows);
        const summary = deriveNationalSummary(countyAggregates);

        setState({
          loading: false,
          error: null,
          rows,
          countyAggregates,
          summary,
          aedPoints,
          ltcPoints,
          emergencyHospitalPoints,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[useMedicalData]", err);
        setState({
          ...EMPTY,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  return state;
}
