/**
 * Mapbox config + helpers
 *
 * Token 從 .env.local 拿（VITE_MAPBOX_TOKEN）。
 * production 必須是 URL-restricted token。
 */

import mapboxgl from "mapbox-gl";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

if (!token) {
  // eslint-disable-next-line no-console
  console.warn(
    "[mapbox] VITE_MAPBOX_TOKEN 未設定，地圖會空白。複製 .env.example 到 .env.local。"
  );
}

mapboxgl.accessToken = token ?? "";

export { mapboxgl };

// ─────────────────────────────────────────────────
// Style presets
// ─────────────────────────────────────────────────

export const MAP_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  blank: {
    version: 8 as const,
    sources: {},
    layers: [{ id: "bg", type: "background" as const, paint: { "background-color": "#F4F7FB" } }],
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  },
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

// ─────────────────────────────────────────────────
// Taiwan default extent + zoom
// ─────────────────────────────────────────────────

export const TAIWAN_DEFAULT_VIEW = {
  center: [120.95, 23.7] as [number, number],
  zoom: 6.4,
  minZoom: 5.5,
  maxZoom: 12,
};

// ─────────────────────────────────────────────────
// Color ramps (依 manifest theme.color_ramp)
// ─────────────────────────────────────────────────

export const COLOR_RAMPS: Record<string, string[]> = {
  blues:   ["#F0F9FF", "#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0369A1"],
  reds:    ["#FEF2F2", "#FECACA", "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B"],
  greens:  ["#F0FDF4", "#DCFCE7", "#BBF7D0", "#86EFAC", "#4ADE80", "#22C55E", "#15803D"],
  purples: ["#FAF5FF", "#F3E8FF", "#E9D5FF", "#D8B4FE", "#C084FC", "#A855F7", "#7E22CE"],
  oranges: ["#FFF7ED", "#FFEDD5", "#FED7AA", "#FDBA74", "#FB923C", "#F97316", "#C2410C"],
  grays:   ["#F8FAFC", "#E2E8F0", "#CBD5E1", "#94A3B8", "#64748B", "#475569", "#1E293B"],
  teal:    ["#F0FDFA", "#CCFBF1", "#99F6E4", "#5EEAD4", "#2DD4BF", "#14B8A6", "#0F766E"],
};

/**
 * 取得依 ramp + ramp_direction + domain 的 fill-color expression
 */
export function buildChoroplethExpression(opts: {
  rampName: string;
  rampDirection: "default" | "reverse";
  domain: [number, number];
  countyValues: Record<string, number>;
  fallback?: string;
}): mapboxgl.ExpressionSpecification {
  const ramp = COLOR_RAMPS[opts.rampName] ?? COLOR_RAMPS.blues;
  const colors = opts.rampDirection === "reverse" ? [...ramp].reverse() : ramp;
  const [min, max] = opts.domain;

  const stops: Array<[string, string]> = [];
  for (const [code, v] of Object.entries(opts.countyValues)) {
    if (v == null) {
      stops.push([code, colors[0]]);
      continue;
    }
    const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
    const idx = Math.min(colors.length - 1, Math.floor(t * (colors.length - 1)));
    stops.push([code, colors[idx]]);
  }

  return [
    "match",
    ["get", "code"],
    ...stops.flat(),
    opts.fallback ?? "#E5E9F0",
  ] as unknown as mapboxgl.ExpressionSpecification;
}
