/**
 * useMaritimeData — 航運主題全國資料 hook
 *
 * 並行拉 3 表：maritime.ports / fishery_stats_by_county / port_traffic_yearly
 * Promise.allSettled，partial-failure 不拖垮。
 */

import { useEffect, useState } from "react";
import {
  fetchPorts,
  fetchFisheryStats,
  fetchPortTraffic,
  fetchLighthouses,
  fetchFisheryRights,
  derivePortClass,
  deriveMaritimeSummary,
  deriveFisheryTrend,
  deriveTopCommPorts,
  deriveCountyAggregates,
  deriveMaritimeFacilities,
  type PortRow,
  type FisheryStatsRow,
  type PortTrafficRow,
  type LighthouseRow,
  type FisheryRightRow,
  type PortClassRow,
  type MaritimeNationalSummary,
  type FisheryTrendRow,
  type TopCommPortRow,
  type CountyMaritimeAggregate,
  type MaritimeFacilities,
} from "@/lib/queries/maritime";
import { cachedFetch, TTL_LONG } from "@/lib/cache";

export interface MaritimeDataState {
  loading: boolean;
  error: Error | null;
  ports: PortRow[];
  fishery: FisheryStatsRow[];
  traffic: PortTrafficRow[];
  lighthouses: LighthouseRow[];
  fisheryRights: FisheryRightRow[];
  summary: MaritimeNationalSummary | null;
  portClass: PortClassRow[];
  fisheryTrend: FisheryTrendRow[];
  topCommPorts: TopCommPortRow[];
  countyAggregates: CountyMaritimeAggregate[];
  facilities: MaritimeFacilities | null;
}

const EMPTY: MaritimeDataState = {
  loading: true,
  error: null,
  ports: [],
  fishery: [],
  traffic: [],
  lighthouses: [],
  fisheryRights: [],
  summary: null,
  portClass: [],
  fisheryTrend: [],
  topCommPorts: [],
  countyAggregates: [],
  facilities: null,
};

export function useMaritimeData(opts: { enabled?: boolean } = {}): MaritimeDataState {
  const { enabled = true } = opts;
  const [state, setState] = useState<MaritimeDataState>(EMPTY);

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
        cachedFetch("maritime:ports", TTL_LONG, fetchPorts),
        cachedFetch("maritime:fishery_stats", TTL_LONG, fetchFisheryStats),
        cachedFetch("maritime:port_traffic", TTL_LONG, fetchPortTraffic),
        cachedFetch("maritime:lighthouse", TTL_LONG, fetchLighthouses),
        cachedFetch("maritime:fishery_rights", TTL_LONG, fetchFisheryRights),
      ]);
      if (cancelled) return;

      const ports = results[0].status === "fulfilled" ? results[0].value : [];
      const fishery = results[1].status === "fulfilled" ? results[1].value : [];
      const traffic = results[2].status === "fulfilled" ? results[2].value : [];
      const lighthouses = results[3].status === "fulfilled" ? results[3].value : [];
      const fisheryRights = results[4].status === "fulfilled" ? results[4].value : [];
      const errors = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      const firstError = errors[0]?.reason instanceof Error ? errors[0].reason : null;

      const portClass = ports.length > 0 ? derivePortClass(ports) : [];
      const summary =
        ports.length > 0 ? deriveMaritimeSummary(ports, fishery, traffic) : null;
      const fisheryTrend = fishery.length > 0 ? deriveFisheryTrend(fishery) : [];
      const topCommPorts = traffic.length > 0 ? deriveTopCommPorts(traffic, ports) : [];
      const countyAggregates =
        ports.length > 0 ? deriveCountyAggregates(ports, fishery, traffic) : [];
      const facilities =
        lighthouses.length > 0 || fisheryRights.length > 0
          ? deriveMaritimeFacilities(lighthouses, fisheryRights)
          : null;

      setState({
        loading: false,
        error: firstError,
        ports,
        fishery,
        traffic,
        lighthouses,
        fisheryRights,
        summary,
        portClass,
        fisheryTrend,
        topCommPorts,
        countyAggregates,
        facilities,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
