/**
 * useFireCountyData — 消防主題「縣市」layer 資料 hook
 *
 * 給 ViewBFire 用：傳入 countyId（id_moi），lazy fetch 4 類縣市資料：
 *   - 該縣市分隊清單（fire.stations）
 *   - 該縣市消防栓數（fire.hydrants）— 目前僅高雄
 *   - 該縣市避難所清單（safety.emergency_shelters）
 *   - 該縣市中央災變紀錄（fire.disaster_incidents，依日期 DESC）
 *
 * Promise.allSettled — 任一 query 失敗不拖垮其他（PB-13 / Session 8）。
 *
 * Backend wrapper: gis-platform/migrations/109_fire_safety_public_wrappers_batch.sql
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchFireStations,
  fetchEmergencyShelters,
  fetchDisasterIncidents,
  type FireStationRow,
  type EmergencyShelterRow,
  type DisasterIncidentRow,
} from "@/lib/queries/fire";
import { cachedFetch, TTL_LONG, TTL_SHORT } from "@/lib/cache";

export interface FireCountyDataState {
  loading: boolean;
  error: Error | null;
  countyId: string | null;
  stations: FireStationRow[];
  shelters: EmergencyShelterRow[];
  /** 該縣市消防栓總數（不拉明細） */
  hydrantCount: number;
  /** 該縣市中央災變紀錄（最近 N 筆，DESC） */
  disasters: DisasterIncidentRow[];
}

const EMPTY: FireCountyDataState = {
  loading: true,
  error: null,
  countyId: null,
  stations: [],
  shelters: [],
  hydrantCount: 0,
  disasters: [],
};

/** 縣市消防栓總數（不拉明細） */
async function fetchCountyHydrantCount(county: string): Promise<number> {
  const { count, error } = await supabase
    .from("fire_hydrants")
    .select("hydrant_id", { count: "exact", head: true })
    .eq("county_id", county);
  if (error) {
    console.error("[useFireCountyData] hydrant count failed:", error);
    throw error;
  }
  return count ?? 0;
}

export function useFireCountyData(
  countyId: string | null,
  opts: { enabled?: boolean; disasterLimit?: number } = {}
): FireCountyDataState {
  const { enabled = true, disasterLimit = 50 } = opts;
  const [state, setState] = useState<FireCountyDataState>(EMPTY);

  useEffect(() => {
    if (!enabled || !countyId) {
      setState({ ...EMPTY, loading: false, countyId });
      return;
    }
    let cancelled = false;
    setState({ ...EMPTY, countyId });

    (async () => {
      const results = await Promise.allSettled([
        cachedFetch(`fire:stations:${countyId}`, TTL_LONG, () => fetchFireStations({ county: countyId })),                              // 0
        cachedFetch(`fire:shelters:${countyId}`, TTL_LONG, () => fetchEmergencyShelters({ county: countyId, limit: 500 })),             // 1
        cachedFetch(`fire:hydrant_count:${countyId}`, TTL_LONG, () => fetchCountyHydrantCount(countyId)),                                // 2
        cachedFetch(`fire:disasters:${countyId}:${disasterLimit}`, TTL_SHORT, () => fetchDisasterIncidents({ county: countyId, limit: disasterLimit, orderDesc: true })), // 3
      ]);
      if (cancelled) return;

      const get = <T,>(idx: number, fallback: T): T =>
        results[idx].status === "fulfilled"
          ? ((results[idx] as PromiseFulfilledResult<T>).value ?? fallback)
          : fallback;

      const names = ["stations", "shelters", "hydrant_count", "disasters"];
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          // eslint-disable-next-line no-console
          console.warn(`[useFireCountyData:${countyId}] ${names[i]} failed:`, r.reason);
        }
      });

      const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      // 全失敗才視為 error（個別失敗用 fallback）
      const allFailed = results.every((r) => r.status === "rejected");
      const error = allFailed && firstError
        ? (firstError.reason instanceof Error ? firstError.reason : new Error(String(firstError.reason)))
        : null;

      setState({
        loading: false,
        error,
        countyId,
        stations: get(0, [] as FireStationRow[]),
        shelters: get(1, [] as EmergencyShelterRow[]),
        hydrantCount: get(2, 0),
        disasters: get(3, [] as DisasterIncidentRow[]),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [countyId, enabled, disasterLimit]);

  return state;
}
