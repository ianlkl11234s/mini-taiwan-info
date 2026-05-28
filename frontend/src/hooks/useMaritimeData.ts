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
  derivePortClass,
  deriveMaritimeSummary,
  deriveFisheryTrend,
  deriveTopCommPorts,
  deriveCountyAggregates,
  type PortRow,
  type FisheryStatsRow,
  type PortTrafficRow,
  type PortClassRow,
  type MaritimeNationalSummary,
  type FisheryTrendRow,
  type TopCommPortRow,
  type CountyMaritimeAggregate,
} from "@/lib/queries/maritime";

export interface MaritimeDataState {
  loading: boolean;
  error: Error | null;
  ports: PortRow[];
  fishery: FisheryStatsRow[];
  traffic: PortTrafficRow[];
  summary: MaritimeNationalSummary | null;
  portClass: PortClassRow[];
  fisheryTrend: FisheryTrendRow[];
  topCommPorts: TopCommPortRow[];
  countyAggregates: CountyMaritimeAggregate[];
}

const EMPTY: MaritimeDataState = {
  loading: true,
  error: null,
  ports: [],
  fishery: [],
  traffic: [],
  summary: null,
  portClass: [],
  fisheryTrend: [],
  topCommPorts: [],
  countyAggregates: [],
};

export function useMaritimeData(opts: { enabled?: boolean } = {}): MaritimeDataState {
  const { enabled = true } = opts;
  const [state, setState] = useState<MaritimeDataState>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        fetchPorts(),
        fetchFisheryStats(),
        fetchPortTraffic(),
      ]);
      if (cancelled) return;

      const ports = results[0].status === "fulfilled" ? results[0].value : [];
      const fishery = results[1].status === "fulfilled" ? results[1].value : [];
      const traffic = results[2].status === "fulfilled" ? results[2].value : [];
      const errors = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      const firstError = errors[0]?.reason instanceof Error ? errors[0].reason : null;

      const portClass = ports.length > 0 ? derivePortClass(ports) : [];
      const summary =
        ports.length > 0 ? deriveMaritimeSummary(ports, fishery, traffic) : null;
      const fisheryTrend = fishery.length > 0 ? deriveFisheryTrend(fishery) : [];
      const topCommPorts = traffic.length > 0 ? deriveTopCommPorts(traffic, ports) : [];
      const countyAggregates =
        ports.length > 0 ? deriveCountyAggregates(ports, fishery, traffic) : [];

      setState({
        loading: false,
        error: firstError,
        ports,
        fishery,
        traffic,
        summary,
        portClass,
        fisheryTrend,
        topCommPorts,
        countyAggregates,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
