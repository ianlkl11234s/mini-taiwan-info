/**
 * useRailData — 軌道主題全國資料 hook
 *
 * 並行拉 4 表：rail.stations / lines / station_daily_trips / ridership_by_station
 * 大表（ridership 6,847）分頁。Promise.allSettled，partial-failure 不拖垮。
 */

import { useEffect, useState } from "react";
import {
  fetchStations,
  fetchLines,
  fetchStationDailyTrips,
  fetchRidership,
  deriveSystems,
  deriveRailSummary,
  deriveHourlyProfile,
  deriveTRABreakdown,
  deriveTopStations,
  deriveTRAMonthly,
  deriveCountyAggregates,
  type StationRow,
  type LineRow,
  type StationDailyTripsRow,
  type RidershipRow,
  type RailSystemDerived,
  type RailNationalSummary,
  type TopStationRow,
  type TRABreakdownRow,
  type MonthlyRow,
  type CountyRailAggregate,
} from "@/lib/queries/rail";
import { cachedFetch, TTL_LONG, TTL_SHORT } from "@/lib/cache";

export interface RailDataState {
  loading: boolean;
  error: Error | null;
  // raw
  stations: StationRow[];
  lines: LineRow[];
  trips: StationDailyTripsRow[];
  ridership: RidershipRow[];
  // derived
  systems: RailSystemDerived[];
  summary: RailNationalSummary | null;
  hourly: Array<{ x: number; label: string; value: number }>;
  traBreakdown: TRABreakdownRow[];
  topStations: TopStationRow[];
  traMonthly: MonthlyRow[];
  countyAggregates: CountyRailAggregate[];
}

const EMPTY: RailDataState = {
  loading: true,
  error: null,
  stations: [],
  lines: [],
  trips: [],
  ridership: [],
  systems: [],
  summary: null,
  hourly: [],
  traBreakdown: [],
  topStations: [],
  traMonthly: [],
  countyAggregates: [],
};

export function useRailData(opts: { enabled?: boolean } = {}): RailDataState {
  const { enabled = true } = opts;
  const [state, setState] = useState<RailDataState>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    // 從 disabled 切到 enabled 時重設 loading=true，避免 view 瞬間看到 loading=false + summary=null
    setState((prev) => ({ ...prev, loading: true, error: null }));
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        cachedFetch("rail:stations", TTL_LONG, fetchStations),
        cachedFetch("rail:lines", TTL_LONG, fetchLines),
        cachedFetch("rail:station_daily_trips", TTL_SHORT, fetchStationDailyTrips),
        cachedFetch("rail:ridership", TTL_LONG, fetchRidership),
      ]);
      if (cancelled) return;

      const stations = results[0].status === "fulfilled" ? results[0].value : [];
      const lines = results[1].status === "fulfilled" ? results[1].value : [];
      const trips = results[2].status === "fulfilled" ? results[2].value : [];
      const ridership = results[3].status === "fulfilled" ? results[3].value : [];

      const errors = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      const firstError = errors[0]?.reason instanceof Error ? errors[0].reason : null;

      const systems = stations.length > 0 ? deriveSystems(stations, lines, ridership) : [];
      const summary =
        stations.length > 0 ? deriveRailSummary(systems, trips, stations) : null;
      const hourly = trips.length > 0 ? deriveHourlyProfile(trips) : [];
      const traBreakdown = trips.length > 0 ? deriveTRABreakdown(trips) : [];
      const topStations = trips.length > 0 ? deriveTopStations(trips, stations) : [];
      const traMonthly = ridership.length > 0 ? deriveTRAMonthly(ridership) : [];
      const countyAggregates =
        stations.length > 0 ? deriveCountyAggregates(stations, trips, ridership, lines) : [];

      setState({
        loading: false,
        error: firstError,
        stations,
        lines,
        trips,
        ridership,
        systems,
        summary,
        hourly,
        traBreakdown,
        topStations,
        traMonthly,
        countyAggregates,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
