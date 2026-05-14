/**
 * Reverse geocode — lat/lng → county code3
 *
 * v1：用最近-centroid (haversine distance)。
 * 邊界縣市可能會錯，但對水庫這種「明顯在縣市中心附近」的點位足夠。
 *
 * 未來：可改為從 public/data/tw-counties.geo.json 載入 polygon 做 point-in-polygon，
 * 或在 Supabase 端加 admin.counties polygon table + ST_Contains RPC。
 */

import { COUNTIES } from "./counties";
import type { CountyCode3 } from "./types";

/**
 * Haversine distance (km)
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 找最接近的縣市 centroid
 */
export function getNearestCounty(lng: number, lat: number): CountyCode3 | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  let bestCode: CountyCode3 | null = null;
  let bestDist = Infinity;
  for (const c of COUNTIES) {
    const d = haversineKm(lat, lng, c.centroid_lat, c.centroid_lng);
    if (d < bestDist) {
      bestDist = d;
      bestCode = c.code3;
    }
  }
  return bestCode;
}

/**
 * 批次把 reservoirs/points 補上 inferred county_code3
 */
export function attachCounty<T extends { lat: number; lng: number }>(
  items: T[]
): Array<T & { county_code3: CountyCode3 | null }> {
  return items.map((it) => ({ ...it, county_code3: getNearestCounty(it.lng, it.lat) }));
}
