/**
 * useTownshipData — 鄉鎮市區層級資料 hook（村里數 + 鄉鎮人口排名）
 *
 * Promise.allSettled 並行拉 demographics schema 兩個固定小 VIEW（各 ~368 列）：
 *   - township_village_count → 縣市村里合計 + 鄉鎮市區數（真實，內政部村里數）
 *   - township_rank（2024-12）→ 依 county_id 分組的鄉鎮人口排名（county_rank asc）
 *
 * 兩表皆固定小表，TTL_LONG 快取一次後全 session 共用，按 id_moi 建查詢 map。
 * 取代 ViewBHomeBasics 原本的村里數估算 + 鄉鎮名稱 mock（COUNTY_TOWNSHIPS_MOCK）。
 */

import { useEffect, useState } from "react";
import {
  fetchTownshipVillageCount,
  fetchTownshipRank,
  type TownshipRankRow,
} from "@/lib/queries/demographics";
import { cachedFetch, TTL_LONG } from "@/lib/cache";

export interface TownshipDataState {
  loading: boolean;
  error: Error | null;
  /** 縣市 id_moi → 村里合計（真實，內政部村里數，不含鄰） */
  villageCountByCountyId: Record<string, number>;
  /** 縣市 id_moi → 鄉鎮市區數（真實） */
  townCountByCountyId: Record<string, number>;
  /** 縣市 id_moi → 鄉鎮人口排名（county_rank asc，第一筆即該縣市最大鄉鎮） */
  ranksByCountyId: Record<string, TownshipRankRow[]>;
}

const EMPTY: TownshipDataState = {
  loading: true,
  error: null,
  villageCountByCountyId: {},
  townCountByCountyId: {},
  ranksByCountyId: {},
};

export function useTownshipData(opts: { enabled?: boolean } = {}): TownshipDataState {
  const { enabled = true } = opts;
  const [state, setState] = useState<TownshipDataState>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setState((prev) => (prev.loading ? { ...EMPTY, loading: false } : prev));
      return;
    }
    // 已有資料就不重設 loading（cachedFetch 命中時無 flash）
    setState((prev) => (prev.loading || prev.error ? { ...prev, loading: true, error: null } : prev));
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        cachedFetch("demographics:township_village_count", TTL_LONG, fetchTownshipVillageCount),
        cachedFetch("demographics:township_rank", TTL_LONG, fetchTownshipRank),
      ]);
      if (cancelled) return;

      const vcRows = results[0].status === "fulfilled" ? results[0].value : [];
      const rankRows = results[1].status === "fulfilled" ? results[1].value : [];
      const errors = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      const firstError = errors[0]?.reason instanceof Error ? errors[0].reason : null;

      const villageCountByCountyId: Record<string, number> = {};
      const townCountByCountyId: Record<string, number> = {};
      for (const r of vcRows) {
        villageCountByCountyId[r.county_id] = (villageCountByCountyId[r.county_id] ?? 0) + r.village_count;
        townCountByCountyId[r.county_id] = (townCountByCountyId[r.county_id] ?? 0) + 1;
      }

      const ranksByCountyId: Record<string, TownshipRankRow[]> = {};
      for (const r of rankRows) {
        (ranksByCountyId[r.county_id] ??= []).push(r);
      }
      for (const id of Object.keys(ranksByCountyId)) {
        ranksByCountyId[id].sort((a, b) => a.county_rank - b.county_rank);
      }

      setState({
        loading: false,
        error: firstError,
        villageCountByCountyId,
        townCountByCountyId,
        ranksByCountyId,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
