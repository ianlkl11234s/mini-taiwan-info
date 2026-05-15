/**
 * MapView — Mapbox GL with Taiwan county boundaries
 * 移植自 prototype map.jsx，改寫為 TS + ES module
 *
 * Phase 0b：基礎 choropleth + hover/click。
 * Phase 0c：加 reservoir points + WWTP + interactions。
 */

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { mapboxgl, MAP_STYLES, TAIWAN_DEFAULT_VIEW, COLOR_RAMPS, type MapStyleKey } from "@/lib/mapbox";
import { COUNTIES, normalizeCountyName } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { fmt } from "@/lib/format";

export interface ReservoirPointFeature {
  id: string;
  name: string;
  rate: number | null;       // 蓄水率 %
  capacity: number;          // 萬 m³
  lat: number;
  lng: number;
}

export interface RiverStationFeature {
  id: string;
  name: string;
  river: string | null;
  county: string | null;
  level_m: number | null;
  alert_level: 0 | 1 | 2 | 3 | null;
  observed_at: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  metric: string;
  rampName: string;
  rampDirection: "default" | "reverse";
  domain: [number, number];
  metricLabel: string;
  metricUnit: string;
  metricValues: Record<CountyCode3, number | null>;
  selectedCounty?: CountyCode3 | null;
  mapStyle?: MapStyleKey;
  highlightCounties?: CountyCode3[];
  highlightColors?: Record<CountyCode3, string>;
  drillCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
  reservoirPoints?: ReservoirPointFeature[];
  showReservoirs?: boolean;
  /** Cycle E：河川水位站點（圈圈依警戒等級上色） */
  riverStations?: RiverStationFeature[];
  showRiverStations?: boolean;
}

const TW_COUNTIES_URL = "/data/tw-counties.geo.json";
const RIVER_LINES_URL = "/data/river-lines.geo.json";
const RIVER_BASINS_URL = "/data/river-basins.geo.json";

export function MapView({
  metric,
  rampName,
  rampDirection,
  domain,
  metricLabel,
  metricUnit,
  metricValues,
  selectedCounty,
  mapStyle = "light",
  highlightCounties = [],
  highlightColors = {},
  drillCounty,
  onCountyClick,
  reservoirPoints = [],
  showReservoirs = false,
  riverStations = [],
  showRiverStations = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const onClickRef = useRef(onCountyClick);
  onClickRef.current = onCountyClick;

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<
    | {
        x: number;
        y: number;
        name: string;
        value: number | null;
        /** override label/unit；省略則 fallback 到 choropleth metric */
        valueLabel?: string;
        valueUnit?: string;
      }
    | null
  >(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[mapStyle] as never,
      center: TAIWAN_DEFAULT_VIEW.center,
      zoom: TAIWAN_DEFAULT_VIEW.zoom,
      minZoom: TAIWAN_DEFAULT_VIEW.minZoom,
      maxZoom: TAIWAN_DEFAULT_VIEW.maxZoom,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    let handled = false;
    const init = async () => {
      if (handled) return;
      handled = true;
      try {
        const resp = await fetch(TW_COUNTIES_URL);
        const geo = await resp.json();
        // Patch each feature with normalized name + code
        geo.features = geo.features.map((f: any) => {
          const rawName: string =
            f.properties.name ||
            f.properties.COUNTYNAME ||
            f.properties.C_Name ||
            f.properties.NAME ||
            "";
          const idMoi = normalizeCountyName(rawName);
          const code = idMoi
            ? COUNTIES.find((c) => c.id_moi === idMoi)?.code3 ?? "?"
            : "?";
          return {
            ...f,
            properties: { ...f.properties, name: rawName, code },
          };
        });
        map.addSource("counties", { type: "geojson", data: geo, generateId: true });

        map.addLayer({
          id: "counties-fill",
          type: "fill",
          source: "counties",
          paint: { "fill-color": "#E5E9F0", "fill-opacity": 0.92 },
        });
        map.addLayer({
          id: "counties-border",
          type: "line",
          source: "counties",
          paint: { "line-color": "#94A3B8", "line-width": 0.6, "line-opacity": 0.55 },
        });
        map.addLayer({
          id: "counties-selected",
          type: "line",
          source: "counties",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "code"], selectedCounty || "__"],
              "#0F172A",
              "transparent",
            ],
            "line-width": 2.5,
          },
        });

        // 隱藏 Mapbox 預設 settlement (city/town) labels 避免中英混雜疊到自己加的 label
        // light-v11 內常見 layer: settlement-major-label / settlement-minor-label / settlement-subdivision-label
        for (const layer of map.getStyle().layers ?? []) {
          if (layer.id.includes("settlement") || layer.id === "place-city-label") {
            try {
              map.setLayoutProperty(layer.id, "visibility", "none");
            } catch {
              /* 某些 layer 不允許 setLayout，忽略 */
            }
          }
        }

        // County labels — 優先用 label_lng/lat（行政中心 anchor），fallback centroid
        const labels = {
          type: "FeatureCollection" as const,
          features: COUNTIES.map((c) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [c.label_lng ?? c.centroid_lng, c.label_lat ?? c.centroid_lat],
            },
            properties: { name: c.name_zh, code: c.code3 },
          })),
        };
        map.addSource("county-labels", { type: "geojson", data: labels });
        map.addLayer({
          id: "county-labels",
          type: "symbol",
          source: "county-labels",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#475569",
            "text-halo-color": "rgba(255,255,255,0.92)",
            "text-halo-width": 1.5,
          },
        });

        // ── Cycle E: 河川流域邊界（虛線灰）+ 河網（細藍線 minzoom 7）──
        try {
          map.addSource("river-basins", { type: "geojson", data: RIVER_BASINS_URL });
          map.addLayer({
            id: "river-basins-line",
            type: "line",
            source: "river-basins",
            paint: {
              "line-color": "#6B7280",
              "line-width": 0.7,
              "line-opacity": 0.32,
              "line-dasharray": [3, 2],
            },
          });
          map.addSource("river-lines", { type: "geojson", data: RIVER_LINES_URL });
          map.addLayer({
            id: "river-lines-line",
            type: "line",
            source: "river-lines",
            minzoom: 7,
            paint: {
              "line-color": "#0EA5E9",
              "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 10, 1.5, 14, 2.5],
              "line-opacity": 0.55,
            },
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[MapView] river basins/lines layer init failed", e);
        }

        // ── Reservoir points layer ──
        map.addSource("reservoirs", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "reservoirs-pt",
          type: "circle",
          source: "reservoirs",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 8, 6, 12, 10],
            "circle-color": [
              "case",
              ["<", ["coalesce", ["get", "rate"], 100], 30], "#EF4444",
              ["<", ["coalesce", ["get", "rate"], 100], 60], "#F59E0B",
              "#10B981",
            ],
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2,
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.85, 7, 1],
          },
        });
        map.addLayer({
          id: "reservoirs-label",
          type: "symbol",
          source: "reservoirs",
          minzoom: 7.6,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 10.5,
            "text-anchor": "top",
            "text-offset": [0, 0.95],
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-allow-overlap": false,
          },
          paint: { "text-color": "#0F172A", "text-halo-color": "#FFFFFF", "text-halo-width": 1.4 },
        });

        // ── Cycle E: 河川水位站圈圈（依警戒等級配色）──
        map.addSource("river-stations", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "river-stations-pt",
          type: "circle",
          source: "river-stations",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 8, 5, 12, 8],
            // 水利署慣例：一級=最嚴重(紅) / 二級=橘 / 三級=黃(最先預警) / 0=正常綠
            "circle-color": [
              "match",
              ["get", "alert_level"],
              1, "#EF4444",
              2, "#F59E0B",
              3, "#FACC15",
              0, "#10B981",
              "#94A3B8", // null/unset
            ],
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 1.4,
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.85, 7, 1],
          },
        });

        // River station hover tooltip — 用 valueLabel/valueUnit override，避免被 choropleth metric 單位污染
        const ALERT_LBL: Record<string, string> = { "1": "一級警戒", "2": "二級警戒", "3": "三級警戒", "0": "正常" };
        map.on("mousemove", "river-stations-pt", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const p = f.properties as { name: string; river: string | null; level_m: number | null; alert_level: number | null };
          const lvl = p.alert_level == null ? "未設警戒值" : ALERT_LBL[String(p.alert_level)] ?? "—";
          setTooltip({
            x: e.point.x,
            y: e.point.y,
            name: `${p.name}${p.river ? "（" + p.river + "）" : ""} · ${lvl}`,
            value: typeof p.level_m === "number" ? p.level_m : null,
            valueLabel: "水位",
            valueUnit: "m",
          });
        });
        map.on("mouseleave", "river-stations-pt", () => {
          map.getCanvas().style.cursor = "";
          setTooltip(null);
        });

        // Reservoir hover — 也用 valueLabel/valueUnit override，避免被 choropleth metric 單位污染
        map.on("mousemove", "reservoirs-pt", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const p = f.properties as { name: string; rate: number | null; capacity: number };
          setTooltip({
            x: e.point.x,
            y: e.point.y,
            name: `${p.name}水庫 · 蓄水 ${p.rate ?? "—"}%`,
            value: typeof p.capacity === "number" ? p.capacity : null,
            valueLabel: "容量",
            valueUnit: "萬 m³",
          });
        });
        map.on("mouseleave", "reservoirs-pt", () => {
          map.getCanvas().style.cursor = "";
          setTooltip(null);
        });

        map.on("mousemove", "counties-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const code = (f.properties as any).code as CountyCode3;
          const name = (f.properties as any).name as string;
          const v = metricValues[code] ?? null;
          setTooltip({ x: e.point.x, y: e.point.y, name, value: v });
        });
        map.on("mouseleave", "counties-fill", () => {
          map.getCanvas().style.cursor = "";
          setTooltip(null);
        });
        map.on("click", "counties-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const code = (f.properties as any).code as CountyCode3;
          if (code && code !== "?" && onClickRef.current) onClickRef.current(code);
        });

        setReady(true);
        setLoading(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[MapView] failed to load boundaries", err);
        setLoading(false);
      }
    };
    if (map.loaded()) init();
    else {
      map.on("load", init);
      map.once("idle", init);
    }
    setTimeout(() => setLoading(false), 4000);
    map.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.warn("[MapView] map error", (e as any).error?.message ?? e);
    });

    return () => {
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update fill based on metric values
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getLayer("counties-fill")) return;

    const ramp = COLOR_RAMPS[rampName] ?? COLOR_RAMPS.blues;
    const colors = rampDirection === "reverse" ? [...ramp].reverse() : ramp;
    const [min, max] = domain;

    const stops: Array<string | number> = [];
    for (const c of COUNTIES) {
      const v = metricValues[c.code3];
      if (v == null) {
        stops.push(c.code3, colors[0]);
        continue;
      }
      const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
      const idx = Math.min(colors.length - 1, Math.floor(t * (colors.length - 1)));
      stops.push(c.code3, colors[idx]);
    }

    if (highlightCounties.length) {
      const base = ["match", ["get", "code"], ...stops, "#E5E9F0"];
      const hi = [
        "match",
        ["get", "code"],
        ...highlightCounties.flatMap((code) => [code, highlightColors[code] ?? "#94A3B8"]),
        base,
      ];
      map.setPaintProperty("counties-fill", "fill-color", hi as never);
      map.setPaintProperty("counties-fill", "fill-opacity", [
        "match",
        ["get", "code"],
        ...highlightCounties.flatMap((code) => [code, 0.85]),
        0.25,
      ] as never);
    } else {
      map.setPaintProperty("counties-fill", "fill-color", [
        "match",
        ["get", "code"],
        ...stops,
        "#E5E9F0",
      ] as never);
      map.setPaintProperty("counties-fill", "fill-opacity", 0.92);
    }
  }, [ready, metric, rampName, rampDirection, JSON.stringify(domain), JSON.stringify(metricValues), highlightCounties.join(","), JSON.stringify(highlightColors)]);

  // Update selected outline
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getLayer("counties-selected")) return;
    map.setPaintProperty("counties-selected", "line-color", [
      "case",
      ["==", ["get", "code"], selectedCounty || "__"],
      "#0F172A",
      "transparent",
    ] as never);
  }, [ready, selectedCounty]);

  // Update reservoirs source
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const src = map.getSource("reservoirs") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const features = showReservoirs
      ? reservoirPoints
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            properties: {
              id: p.id,
              name: p.name,
              rate: p.rate,
              capacity: p.capacity,
            },
          }))
      : [];
    src.setData({ type: "FeatureCollection", features });
  }, [ready, showReservoirs, JSON.stringify(reservoirPoints)]);

  // Cycle E: Update river-stations source
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const src = map.getSource("river-stations") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const features = showRiverStations
      ? riverStations
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            properties: {
              id: p.id,
              name: p.name,
              river: p.river,
              county: p.county,
              level_m: p.level_m,
              alert_level: p.alert_level,
              observed_at: p.observed_at,
            },
          }))
      : [];
    src.setData({ type: "FeatureCollection", features });
  }, [ready, showRiverStations, JSON.stringify(riverStations)]);

  // Zoom on drill
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (drillCounty) {
      const c = COUNTIES.find((cc) => cc.code3 === drillCounty);
      if (c) map.flyTo({ center: [c.centroid_lng, c.centroid_lat], zoom: 9, duration: 1200 });
    } else {
      map.flyTo({ center: TAIWAN_DEFAULT_VIEW.center, zoom: TAIWAN_DEFAULT_VIEW.zoom, duration: 1000 });
    }
  }, [ready, drillCounty]);

  return (
    <div className="map-pane">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {loading && (
        <div className="splash">
          <div className="spinner" />
        </div>
      )}

      {tooltip && (
        <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.name}</strong>
          {tooltip.value != null && (
            <span className="stat">
              {tooltip.valueLabel ?? metricLabel}{" "}
              <b>{fmt.num(tooltip.value, tooltip.value < 100 ? 1 : 0)}</b>{" "}
              {tooltip.valueUnit ?? metricUnit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
