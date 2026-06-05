/**
 * useHomeBasics — 首頁/縣市 basics 主題 hook
 *
 * 載入順序：
 *   1) 立即用 mock 渲染（不空白等網路）
 *   2) 背景 fetch Supabase reference.national_basics_yearly / _by_county_yearly
 *   3) 成功 → 替換為真實；失敗 → 保留 mock
 *
 * 對應後端：gis-platform/migrations/144_reference_national_basics_history.sql
 */
import { useEffect, useState } from "react";
import {
  fetchAgingHistory,
  fetchBirthDeathHistory,
  fetchHomeByCounty,
  type AgingHistoryPoint,
  type BirthDeathHistoryPoint,
} from "@/lib/queries/home-basics";
import {
  AGING_HISTORY,
  BIRTH_DEATH_HISTORY,
  HOME_BY_COUNTY,
  type HomeCountyDemographic,
} from "@/lib/mock-home";
import { cachedFetch, TTL_LONG } from "@/lib/cache";
import type { CountyCode3 } from "@/lib/types";

interface State {
  agingHistory: AgingHistoryPoint[];
  birthDeathHistory: BirthDeathHistoryPoint[];
  homeByCounty: Record<CountyCode3, HomeCountyDemographic>;
  loading: boolean;
  /** true 表全部或部分資料走 mock fallback */
  isFallback: boolean;
}

const INITIAL: State = {
  agingHistory: AGING_HISTORY,
  birthDeathHistory: BIRTH_DEATH_HISTORY,
  homeByCounty: HOME_BY_COUNTY as Record<CountyCode3, HomeCountyDemographic>,
  loading: true,
  isFallback: true,
};

export function useHomeBasics(): State {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cachedFetch("home_basics:aging_history",       TTL_LONG, fetchAgingHistory),
      cachedFetch("home_basics:birth_death_history", TTL_LONG, fetchBirthDeathHistory),
      cachedFetch("home_basics:home_by_county",      TTL_LONG, fetchHomeByCounty),
    ])
      .then(([aging, birthDeath, byCounty]) => {
        if (cancelled) return;
        // isFallback 判定：3 個結果只要任一是 mock 既有引用，就視為部分 fallback
        const isFallback = aging === AGING_HISTORY
                        || birthDeath === BIRTH_DEATH_HISTORY
                        || byCounty === (HOME_BY_COUNTY as unknown);
        setState({
          agingHistory: aging,
          birthDeathHistory: birthDeath,
          homeByCounty: byCounty,
          loading: false,
          isFallback,
        });
      })
      .catch((e) => {
        console.warn("[useHomeBasics] all-fetch failed, staying on mock:", e);
        if (cancelled) return;
        setState({ ...INITIAL, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
