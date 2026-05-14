/* ============================================================
   MapView — Mapbox GL with Taiwan county boundaries
   ============================================================ */

const { useEffect: muEffect, useRef: muRef, useState: muState } = React;

// Set via env or replace inline before serving the prototype HTML.
// Frontend production version reads from VITE_MAPBOX_TOKEN (see frontend/src/lib/mapbox.ts).
const MAPBOX_TOKEN = (typeof window !== "undefined" && window.MAPBOX_TOKEN) || "__MAPBOX_TOKEN_PLACEHOLDER__";

// Taiwan counties simplified GeoJSON (decimated locally, ~460KB)
const TW_COUNTIES_URL = "data/tw-counties.geo.json";

// Name normalization: g0v uses 台 (simplified-ish), we want 臺
const normalizeName = (n) => (n || "").replace("台", "臺").replace("台北", "臺北").trim();

// Build name->code lookup from COUNTIES
const NAME_TO_CODE = (() => {
  const out = {};
  for (const c of window.COUNTIES) {
    out[c.name] = c.code;
    out[c.name.replace("臺", "台")] = c.code;
  }
  return out;
})();

const MAP_STYLES = {
  light:  "mapbox://styles/mapbox/light-v11",
  gray:   "mapbox://styles/mapbox/dark-v11",
  blank:  {
    version: 8,
    sources: {},
    layers: [{ id: "bg", type: "background", paint: { "background-color": "#F4F7FB" } }],
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  },
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
};

// Color ramps per theme
const RAMPS = {
  water: ["#F0F9FF", "#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0369A1"],
  home:  ["#F8FAFC", "#E2E8F0", "#CBD5E1", "#94A3B8", "#64748B", "#475569", "#1E293B"],
};

// metric definitions: where to find value + range
const METRIC_CONFIG = {
  // water
  lpcd:              { ds: "WATER_BY_COUNTY", key: "lpcd",           label: "人均日用水量",      unit: "L",   min: 180, max: 340, ramp: "water" },
  sewage:            { ds: "WATER_BY_COUNTY", key: "sewage",         label: "汙水接管率",        unit: "%",   min:   0, max: 100, ramp: "water" },
  reservoir:         { ds: "WATER_BY_COUNTY", key: "reservoir",      label: "蓄水率",            unit: "%",   min:  25, max: 100, ramp: "water" },
  rain24:            { ds: "WATER_BY_COUNTY", key: "rain24",         label: "24hr 均雨量",       unit: "mm",  min:   0, max:  45, ramp: "water" },
  floodPct:          { ds: "WATER_BY_COUNTY", key: "floodPct",       label: "淹水高潛勢面積",    unit: "%",   min:   0, max:  35, ramp: "water" },
  // home
  agingIndex:        { ds: "HOME_BY_COUNTY",  key: "agingIndex",     label: "老化指數",          unit: "",    min:  70, max: 240, ramp: "home" },
  pop:               { ds: "COUNTIES",         key: "pop",            label: "總人口",            unit: "萬",  min:   1, max: 410, ramp: "home" },
  birthRate:         { ds: "HOME_BY_COUNTY",  key: "birthRate",      label: "出生率",            unit: "‰",   min:   4, max:  10, ramp: "home" },
};

function getMetricValue(metricId, code) {
  const cfg = METRIC_CONFIG[metricId];
  if (!cfg) return null;
  if (cfg.ds === "COUNTIES") {
    return window.byCode[code]?.[cfg.key];
  }
  return window[cfg.ds]?.[code]?.[cfg.key];
}

function MapView({
  metric,                // e.g. "lpcd"
  theme,                 // "water" | "home"
  selectedCounty,        // code or null
  highlightCounties = [],// for compare mode
  highlightColors = {},  // { code: cssColor }
  mapStyle = "light",
  onCountyClick,
  onCountyHover,
  showReservoirs = false,
  showWWTP = false,
  drillCounty,           // when set, zoom in to that county
  reservoirPoints = [],
  reservoirMode = "default", // "rate" colors by status, "default" plain
  wwtpPoints = [],
  onReservoirClick,
}) {
  const containerRef = muRef(null);
  const mapRef = muRef(null);
  const onReservoirClickRef = muRef(onReservoirClick);
  muEffect(() => { onReservoirClickRef.current = onReservoirClick; }, [onReservoirClick]);
  const [ready, setReady] = muState(false);
  const [tooltip, setTooltip] = muState(null);
  const [loading, setLoading] = muState(true);
  const cfg = METRIC_CONFIG[metric] || METRIC_CONFIG.lpcd;
  const ramp = RAMPS[cfg.ramp] || RAMPS.water;

  // Init map once
  muEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const styleSpec = MAP_STYLES[mapStyle] || MAP_STYLES.light;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleSpec,
      center: [120.95, 23.7],
      zoom: 6.4,
      minZoom: 5.5,
      maxZoom: 12,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    let handlerRan = false;
    const handleLoad = async () => {
      if (handlerRan) return;
      handlerRan = true;
      try {
        const resp = await fetch(TW_COUNTIES_URL);
        const geo = await resp.json();
        // Patch each feature with normalized name + code
        geo.features = geo.features.map((f) => {
          const rawName = f.properties.name || f.properties.COUNTYNAME || f.properties.C_Name || f.properties.NAME || "";
          const name = normalizeName(rawName);
          const code = NAME_TO_CODE[name] || NAME_TO_CODE[rawName];
          return {
            ...f,
            properties: { ...f.properties, name, code: code || "?" },
          };
        });
        map.addSource("counties", { type: "geojson", data: geo, generateId: true });

        // base choropleth
        map.addLayer({
          id: "counties-fill",
          type: "fill",
          source: "counties",
          paint: {
            "fill-color": "#E5E9F0",
            "fill-opacity": 0.92,
          },
        });
        // border
        map.addLayer({
          id: "counties-border",
          type: "line",
          source: "counties",
          paint: {
            "line-color": "#94A3B8",
            "line-width": 0.6,
            "line-opacity": 0.55,
          },
        });
        // selected outline
        map.addLayer({
          id: "counties-selected",
          type: "line",
          source: "counties",
          paint: {
            "line-color": ["case",
              ["==", ["get", "code"], selectedCounty || "__"],
              "#0F172A",
              "transparent"],
            "line-width": 2.5,
          },
        });

        // labels  — use a separate source of centroids
        const labels = {
          type: "FeatureCollection",
          features: window.COUNTIES.map((c) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [c.lng, c.lat] },
            properties: { name: c.name, code: c.code },
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

        // empty point sources for reservoirs / wwtp
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

        map.addSource("wwtp", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "wwtp-pt",
          type: "circle",
          source: "wwtp",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 6],
            "circle-color": "#10B981",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 1.5,
          },
        });

        // Hover & click handlers
        map.on("mousemove", "counties-fill", (e) => {
          const f = e.features[0];
          map.getCanvas().style.cursor = "pointer";
          const code = f.properties.code;
          const name = f.properties.name;
          const val = getMetricValue(metric, code);
          setTooltip({
            x: e.point.x,
            y: e.point.y,
            name,
            metricLabel: cfg.label,
            value: val,
            unit: cfg.unit,
          });
        });
        map.on("mouseleave", "counties-fill", () => {
          map.getCanvas().style.cursor = "";
          setTooltip(null);
        });
        map.on("click", "counties-fill", (e) => {
          const f = e.features[0];
          const code = f.properties.code;
          if (code && onCountyClick) onCountyClick(code);
        });

        // Reservoir interactions
        map.on("mousemove", "reservoirs-pt", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features[0];
          const p = f.properties;
          setTooltip({
            x: e.point.x, y: e.point.y,
            name: `${p.name}水庫`,
            metricLabel: "蓄水率",
            value: parseFloat(p.rate),
            unit: "%",
            subtitle: p.countyName ? `${p.countyName} · 容量 ${fmt.num(parseFloat(p.capacity || 0))} 萬m³` : "",
            tone: parseFloat(p.rate) < 30 ? "danger" : parseFloat(p.rate) < 60 ? "warn" : "ok",
          });
        });
        map.on("mouseleave", "reservoirs-pt", () => {
          map.getCanvas().style.cursor = "";
          setTooltip(null);
        });
        map.on("click", "reservoirs-pt", (e) => {
          e.originalEvent?.stopPropagation?.();
          const p = e.features[0].properties;
          if (onReservoirClickRef.current) {
            onReservoirClickRef.current({
              name: p.name,
              countyCode: p.countyCode,
              countyName: p.countyName,
              rate: parseFloat(p.rate),
              capacity: parseFloat(p.capacity || 0),
            });
          }
        });

        setReady(true);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load Taiwan boundaries", err);
        setLoading(false);
      }
    };
    if (map.loaded?.()) {
      handleLoad();
    } else {
      map.on("load", handleLoad);
      // Failsafe: Mapbox sometimes resolves with 'idle' instead of 'load'
      map.once("idle", handleLoad);
    }

    // Final failsafe: hide splash after 4s
    setTimeout(() => setLoading(false), 4000);

    map.on("error", (e) => console.warn("map error", e.error?.message || e));

    return () => map.remove();
  }, []);

  // Update map style when changed
  muEffect(() => {
    if (!mapRef.current || !ready) return;
    // Style change is heavy — we'd need to re-add sources. For prototype: just update background opacity instead
    // Actually let's do proper style swap.
    const map = mapRef.current;
    if (map._currentStyle === mapStyle) return;
    map._currentStyle = mapStyle;
    const handler = () => {
      // Re-fire load logic
      // For brevity in prototype, this is a heavy operation; skip for now.
    };
    // Simple approach: only swap on the very first if requested; otherwise reload page-level state.
    // For now, skip swap dynamically — tweaks panel reloads.
  }, [mapStyle, ready]);

  // Update choropleth fill based on metric
  muEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getLayer("counties-fill")) return;

    // Build a match expression for fill color
    const stops = [];
    for (const c of window.COUNTIES) {
      const v = getMetricValue(metric, c.code);
      if (v == null) { stops.push(c.code, ramp[0]); continue; }
      const t = Math.max(0, Math.min(1, (v - cfg.min) / (cfg.max - cfg.min)));
      const idx = Math.min(ramp.length - 1, Math.floor(t * (ramp.length - 1)));
      stops.push(c.code, ramp[idx]);
    }

    // override for highlight (compare mode)
    if (highlightCounties.length) {
      const base = ["match", ["get", "code"], ...stops, "#E5E9F0"];
      const hi = ["match", ["get", "code"],
        ...highlightCounties.flatMap((code) => [code, highlightColors[code] || "#94A3B8"]),
        base];
      map.setPaintProperty("counties-fill", "fill-color", hi);
      map.setPaintProperty("counties-fill", "fill-opacity", [
        "match", ["get", "code"],
        ...highlightCounties.flatMap((code) => [code, 0.85]),
        0.25,
      ]);
    } else {
      map.setPaintProperty("counties-fill", "fill-color", ["match", ["get", "code"], ...stops, "#E5E9F0"]);
      map.setPaintProperty("counties-fill", "fill-opacity", 0.92);
    }
  }, [ready, metric, theme, highlightCounties.join(","), Object.keys(highlightColors).join(",")]);

  // Update selected outline
  muEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getLayer("counties-selected")) return;
    map.setPaintProperty("counties-selected", "line-color",
      ["case", ["==", ["get", "code"], selectedCounty || "__"], "#0F172A", "transparent"]);
  }, [ready, selectedCounty]);

  // Zoom to county
  muEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (drillCounty) {
      const c = window.byCode[drillCounty];
      if (c) map.flyTo({ center: [c.lng, c.lat], zoom: 9, duration: 1200 });
    } else {
      // Default: fly back to whole island
      map.flyTo({ center: [120.95, 23.7], zoom: 6.4, duration: 1000 });
    }
  }, [ready, drillCounty]);

  // Update reservoirs source
  muEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const feats = showReservoirs ? reservoirPoints.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: {
        name: p.name,
        rate: p.rate,
        capacity: p.capacity || 0,
        id: p.id,
        countyCode: p.countyCode || p.county || "",
        countyName: p.countyName || "",
      },
    })) : [];
    map.getSource("reservoirs")?.setData({ type: "FeatureCollection", features: feats });
  }, [ready, showReservoirs, JSON.stringify(reservoirPoints)]);

  // Update wwtp source
  muEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const feats = showWWTP ? wwtpPoints.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { name: p.name, id: p.id },
    })) : [];
    map.getSource("wwtp")?.setData({ type: "FeatureCollection", features: feats });
  }, [ready, showWWTP, JSON.stringify(wwtpPoints)]);

  return (
    <div className="map-pane">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {loading && (
        <div className="splash">
          <div className="spinner" />
        </div>
      )}

      {tooltip && (
        <div className={`map-tooltip ${tooltip.tone ? `tone-${tooltip.tone}` : ""}`} style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.name}</strong>
          {tooltip.subtitle && <span className="sub">{tooltip.subtitle}</span>}
          {tooltip.value != null && (
            <span className="stat">{tooltip.metricLabel} <b>{fmt.num(tooltip.value, tooltip.value < 100 ? 1 : 0)}</b> {tooltip.unit}</span>
          )}
        </div>
      )}
    </div>
  );
}

window.MapView = MapView;
window.METRIC_CONFIG = METRIC_CONFIG;
window.RAMPS = RAMPS;
