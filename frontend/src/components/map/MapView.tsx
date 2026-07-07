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

export interface FireIncidentPoint {
  lat: number;
  lng: number;
}

export interface FireStationFeature {
  id: string;
  name: string;
  county_name: string;
  lat: number;
  lng: number;
}

/** tooltip 內容（generic 點位層 hover 用；value=null 只顯示 name） */
export interface MapTooltipContent {
  name: string;
  value: number | null;
  valueLabel?: string;
  valueUnit?: string;
}

/**
 * 泛用點位層 spec（theme-registry 宣告，靜態 module 常數）。
 * 一個 spec = 一個 circle layer（`{id}-pt`）+ 可選 symbol label（`{id}-label`）+ 可選 hover tooltip。
 */
export interface MapPointLayerSpec {
  /** mapbox source/layer id 前綴（全 app 唯一） */
  id: string;
  /** 原樣塞給 mapbox 的 circle paint（保持各主題既有視覺） */
  circlePaint: Record<string, unknown>;
  /** label 用 properties.name，字型/offset 與既有各層一致 */
  label?: { minzoom: number; textColor: string };
  tooltip?: (props: Record<string, unknown>) => MapTooltipContent | null;
}

export interface MapPointFeature {
  lat: number;
  lng: number;
  properties: Record<string, unknown>;
}

/** App 每 render 組出的 generic 層實例（spec 靜態 + 資料/可見性動態） */
export interface GenericMapPointLayer {
  spec: MapPointLayerSpec;
  visible: boolean;
  points: MapPointFeature[];
}

/**
 * 特殊主題層 props — 非標準層（water 基底層 / fire heatmap）保留手刻實作，
 * 由 theme-registry entry.specialMapProps 提供，App 直接 spread 進 MapView。
 */
export interface SpecialMapProps {
  /** 水主題基底層（河川流域線 + 河網 + 水庫 + 水位站），其他主題不傳 = false */
  showWaterBaseLayers?: boolean;
  reservoirPoints?: ReservoirPointFeature[];
  showReservoirs?: boolean;
  /** Cycle E：河川水位站點（圈圈依警戒等級上色） */
  riverStations?: RiverStationFeature[];
  showRiverStations?: boolean;
  /** B045：火災 heatmap 可見性（fire 主題 + user toggle） */
  showFireHeatmap?: boolean;
  /** B045：消防分隊 dot + label 可見性（fire 主題 + user toggle） */
  showFireStations?: boolean;
  /** B045：火災個案點位（給 heatmap source；只用 lat/lng） */
  fireIncidentPoints?: FireIncidentPoint[];
  /** B045：消防分隊點位 */
  fireStations?: FireStationFeature[];
}

interface MapViewProps extends SpecialMapProps {
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
  /** 「無染色」模式 — 22 縣市 fill 變灰底（想專心看 heatmap / 點位時用） */
  neutralChoropleth?: boolean;
  /** 泛用點位層（ports / rail / medical ...），由 theme-registry 宣告 */
  pointLayers?: GenericMapPointLayer[];
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
  // registry 化後預設 false：非 water 主題不傳此 prop（原本由 App 逐主題傳 theme === "water"）
  showWaterBaseLayers = false,
  showFireHeatmap = false,
  showFireStations = false,
  fireIncidentPoints = [],
  fireStations = [],
  neutralChoropleth = false,
  pointLayers = [],
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

        // ── B045: 火災主題基底層（heatmap + 消防分隊 dot + 分隊 label）──
        // SPEC.md 拍板「始終 on」，由 showFireBaseLayers prop 控 visibility
        // heatmap z-order：插在 counties-border 之前（壓在 fill 上），讓邊線 + 標籤 + 分隊 dot 仍在熱力圖之上
        map.addSource("fire-hotspots", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "fire-hotspots-heat",
          type: "heatmap",
          source: "fire-hotspots",
          maxzoom: 13,
          layout: { visibility: "none" },
          paint: {
            // 113 年 ~12k 點在 default zoom 全島都會疊飽和；降 weight + intensity 拉開漸層
            "heatmap-weight": 0.6,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 0.25, 10, 1.5],
            "heatmap-radius":    ["interpolate", ["linear"], ["zoom"], 6, 6,    10, 20],
            "heatmap-opacity":   ["interpolate", ["linear"], ["zoom"], 6, 0.78, 12, 0.55],
            // 7 個 color stop：低密度顯黃綠、中等橘、高密度才深紅
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0,    "rgba(255,255,255,0)",
              0.05, "rgba(254,243,199,0.55)",  // 淺黃 amber-100
              0.20, "rgba(253,224,71,0.72)",   // 黃 yellow-300
              0.40, "rgba(253,186,116,0.85)",  // 橘 orange-300
              0.60, "rgba(249,115,22,0.92)",   // 橘紅 orange-500
              0.80, "rgba(220,38,38,0.95)",    // 紅 red-600
              1.00, "rgba(127,29,29,1)",       // 深紅 red-900
            ],
          },
        }, "counties-border");
        map.addSource("fire-stations", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "fire-stations-pt",
          type: "circle",
          source: "fire-stations",
          layout: { visibility: "none" },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 8, 4, 11, 7],
            "circle-color": "#DC2626",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 10, 1.6],
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.7, 8, 0.95],
          },
        });
        map.addLayer({
          id: "fire-stations-label",
          type: "symbol",
          source: "fire-stations",
          minzoom: 8.5,
          layout: {
            visibility: "none",
            "text-field": ["get", "name"],
            "text-size": 10,
            "text-anchor": "top",
            "text-offset": [0, 0.85],
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-allow-overlap": false,
          },
          paint: { "text-color": "#7F1D1D", "text-halo-color": "#FFFFFF", "text-halo-width": 1.4 },
        });

        // 泛用點位層（ports / rail / medical ...）改由 pointLayers effect 動態 add（見下方）

        // 消防分隊 hover tooltip（mock 過渡期不顯示數值，標 "Sprint 2 待ETL"）
        map.on("mousemove", "fire-stations-pt", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const p = f.properties as { name: string; county_name: string };
          setTooltip({
            x: e.point.x,
            y: e.point.y,
            name: `${p.name} · ${p.county_name}`,
            value: null,
            valueLabel: "Sprint 2 待ETL",
            valueUnit: "",
          });
        });
        map.on("mouseleave", "fire-stations-pt", () => {
          map.getCanvas().style.cursor = "";
          setTooltip(null);
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

    // 無染色模式：22 縣市灰底（讓 fire heatmap / 點位視覺不被 ramp 紅吃掉）
    if (neutralChoropleth) {
      map.setPaintProperty("counties-fill", "fill-color", "#E5E9F0" as never);
      map.setPaintProperty("counties-fill", "fill-opacity", 0.55);
      return;
    }

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
  }, [ready, neutralChoropleth, metric, rampName, rampDirection, JSON.stringify(domain), JSON.stringify(metricValues), highlightCounties.join(","), JSON.stringify(highlightColors)]);

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

  // 水主題基底圖層（流域邊界 + 河網 + 水庫 + 水位站）visibility — 跟著 showWaterBaseLayers
  // 2026-05-16：reservoirs-pt / reservoirs-label / river-stations-pt 也納入 gate，
  // 避免 fire 主題下 hover 隱形 source 仍冒水主題 tooltip
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const vis = showWaterBaseLayers ? "visible" : "none";
    for (const id of [
      "river-basins-line",
      "river-lines-line",
      "reservoirs-pt",
      "reservoirs-label",
      "river-stations-pt",
    ]) {
      if (map.getLayer(id)) {
        try {
          map.setLayoutProperty(id, "visibility", vis);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(`[MapView] failed to toggle ${id}`, e);
        }
      }
    }
  }, [ready, showWaterBaseLayers]);

  // B045：火災 heatmap visibility（單獨 toggle）
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getLayer("fire-hotspots-heat")) return;
    try {
      map.setLayoutProperty(
        "fire-hotspots-heat",
        "visibility",
        showFireHeatmap ? "visible" : "none"
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[MapView] failed to toggle fire-hotspots-heat", e);
    }
  }, [ready, showFireHeatmap]);

  // B045：消防分隊 dot + label visibility（一起 toggle）
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const vis = showFireStations ? "visible" : "none";
    for (const id of ["fire-stations-pt", "fire-stations-label"]) {
      if (map.getLayer(id)) {
        try {
          map.setLayoutProperty(id, "visibility", vis);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(`[MapView] failed to toggle ${id}`, e);
        }
      }
    }
  }, [ready, showFireStations]);

  // B045：火災 heatmap source data — 從 props 同步，不受 toggle 影響（toggle 只控 visibility 避免重 fetch）
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const src = map.getSource("fire-hotspots") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const features = fireIncidentPoints
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: {},
      }));
    src.setData({ type: "FeatureCollection", features });
  }, [ready, fireIncidentPoints]);

  // B045：消防分隊 source data
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const src = map.getSource("fire-stations") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const features = fireStations
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          name: p.name,
          county_name: p.county_name,
        },
      }));
    src.setData({ type: "FeatureCollection", features });
  }, [ready, fireStations]);

  // ── 泛用點位層（ports / rail / medical ...）──
  // registry spec 宣告式驅動：首次遇到 spec.id → addSource/addLayer（+label +tooltip），
  // 之後每次只 setData + 切 visibility。主題切走後殘留層一律隱藏。
  // spec 是 module-level 常數（theme-registry），同 id 的 paint 永不變 → add 一次即可。
  const genericLayersRef = useRef<Map<string, { hasLabel: boolean }>>(new Map());
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    const setVis = (specId: string, hasLabel: boolean, visible: boolean) => {
      const vis = visible ? "visible" : "none";
      const ids = hasLabel ? [`${specId}-pt`, `${specId}-label`] : [`${specId}-pt`];
      for (const id of ids) {
        if (map.getLayer(id)) {
          try { map.setLayoutProperty(id, "visibility", vis); } catch (_) { /* ignore */ }
        }
      }
    };

    const active = new Set<string>();
    for (const L of pointLayers) {
      const { spec } = L;
      active.add(spec.id);

      if (!genericLayersRef.current.has(spec.id)) {
        map.addSource(spec.id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: `${spec.id}-pt`,
          type: "circle",
          source: spec.id,
          layout: { visibility: "none" },
          paint: spec.circlePaint as never,
        });
        if (spec.label) {
          map.addLayer({
            id: `${spec.id}-label`,
            type: "symbol",
            source: spec.id,
            minzoom: spec.label.minzoom,
            layout: {
              visibility: "none",
              "text-field": ["get", "name"],
              "text-size": 10,
              "text-anchor": "top",
              "text-offset": [0, 0.85],
              "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              "text-allow-overlap": false,
            },
            paint: { "text-color": spec.label.textColor, "text-halo-color": "#FFFFFF", "text-halo-width": 1.4 },
          });
        }
        if (spec.tooltip) {
          const buildTooltip = spec.tooltip;
          map.on("mousemove", `${spec.id}-pt`, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const content = buildTooltip((f.properties ?? {}) as Record<string, unknown>);
            if (!content) return;
            map.getCanvas().style.cursor = "pointer";
            setTooltip({ x: e.point.x, y: e.point.y, ...content });
          });
          map.on("mouseleave", `${spec.id}-pt`, () => {
            map.getCanvas().style.cursor = "";
            setTooltip(null);
          });
        }
        genericLayersRef.current.set(spec.id, { hasLabel: !!spec.label });
      }

      const src = map.getSource(spec.id) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: "FeatureCollection",
          features: L.points
            .filter((p) => p.lat != null && p.lng != null)
            .map((p) => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
              properties: p.properties,
            })),
        });
      }
      setVis(spec.id, !!spec.label, L.visible);
    }

    // 其他主題殘留的 generic 層（主題已切走）→ 隱藏
    for (const [specId, info] of genericLayersRef.current) {
      if (!active.has(specId)) setVis(specId, info.hasLabel, false);
    }
  }, [ready, pointLayers]);

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
