/**
 * 河川水位 — Cycle E
 *
 * 後端表：
 *   - public.river_flow_stations (188 站 metadata，含警戒水位 1/2/3)
 *   - realtime.river_water_level (1.16M 筆 readings，每 10 分鐘更新，真 LIVE)
 *
 * 注意：水利署 OpenData 不公開「流量」(cms / m³/s) 時序，只有水位 (m)。
 * 上游有 IoT WRA「流量子類」可選擴充，本 cycle 不接。
 */

import { supabase } from "../supabase";

// ─────────────────────────────────────────────────
// 1. 全國河川水位 latest（RPC: get_river_water_level_latest）
// ─────────────────────────────────────────────────

export interface RiverWaterLevelRow {
  station_id: string;
  station_name: string;
  county: string | null;          // 中文 (dirty)，需 normalizeCountyName
  lat: number;
  lng: number;
  water_level_m: number | null;
  check_result: number | null;    // 1=正常, 其他=異常
  observed_at: string;            // ISO timestamp
}

export async function fetchRiverWaterLevelLatest(): Promise<RiverWaterLevelRow[]> {
  const { data, error } = await supabase.rpc("get_river_water_level_latest");
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[query] get_river_water_level_latest failed:", error.message);
    return [];
  }
  return (data ?? []) as RiverWaterLevelRow[];
}

// ─────────────────────────────────────────────────
// 2. 河川測站 metadata + 警戒水位（from table）
// ─────────────────────────────────────────────────

export interface RiverFlowStation {
  id: string;
  station_name: string;
  river_name: string | null;
  basin_id: string | null;
  basin_name: string | null;
  lng: number | null;
  lat: number | null;
  alert_level_1_m: number | null;
  alert_level_2_m: number | null;
  alert_level_3_m: number | null;
  is_active: boolean;
}

export async function fetchRiverFlowStations(): Promise<RiverFlowStation[]> {
  const { data, error } = await supabase
    .from("river_flow_stations")
    .select(
      "id, station_name, river_name, basin_id, basin_name, lng, lat, alert_level_1_m, alert_level_2_m, alert_level_3_m, is_active"
    );
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[query] river_flow_stations failed:", error.message);
    return [];
  }
  return (data ?? []) as RiverFlowStation[];
}

// ─────────────────────────────────────────────────
// 3. 單站水位時序（RPC: get_river_water_level_timeseries）
//    給 ViewC 個別測站歷史趨勢用
// ─────────────────────────────────────────────────

export interface RiverWaterLevelTimeseriesRow {
  observed_at: string;
  water_level_m: number | null;
  check_result: number | null;
}

export async function fetchRiverWaterLevelTimeseries(
  stationId: string,
  from: Date,
  to: Date
): Promise<RiverWaterLevelTimeseriesRow[]> {
  const { data, error } = await supabase.rpc("get_river_water_level_timeseries", {
    p_station_id: stationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[query] river timeseries failed:", error.message);
    return [];
  }
  return (data ?? []) as RiverWaterLevelTimeseriesRow[];
}

// ─────────────────────────────────────────────────
// 4. 警戒等級判定 helper
// ─────────────────────────────────────────────────

/**
 * 水利署河川水位警戒慣例（實證：秀朗站 alert_1=11.3m > alert_2=9.1m > alert_3=5.9m）：
 *   一級警戒 = 最高水位門檻 = 最嚴重（紅）
 *   二級警戒 = 中（橘）
 *   三級警戒 = 最低水位門檻 = 最先預警（黃）
 *   0 = 正常 / null = 無警戒水位門檻設定
 */
export type AlertLevel = 0 | 1 | 2 | 3 | null;

export function classifyAlertLevel(
  waterLevelM: number | null | undefined,
  alert1: number | null,
  alert2: number | null,
  alert3: number | null
): AlertLevel {
  if (waterLevelM == null) return null;
  // 一級水位門檻最高（最嚴重），優先判定
  if (alert1 != null && waterLevelM >= alert1) return 1;
  if (alert2 != null && waterLevelM >= alert2) return 2;
  if (alert3 != null && waterLevelM >= alert3) return 3;
  // 有設警戒值但水位低於三級門檻 → 正常
  if (alert1 != null || alert2 != null || alert3 != null) return 0;
  // 完全沒設 → 不可判定
  return null;
}

export const ALERT_COLORS: Record<NonNullable<AlertLevel>, string> = {
  0: "#10B981", // 綠 正常
  1: "#EF4444", // 紅 一級（最嚴重）
  2: "#F59E0B", // 橘 二級
  3: "#FACC15", // 黃 三級（最先預警）
};

export const ALERT_LABELS: Record<NonNullable<AlertLevel>, string> = {
  0: "正常",
  1: "一級警戒",
  2: "二級警戒",
  3: "三級警戒",
};
