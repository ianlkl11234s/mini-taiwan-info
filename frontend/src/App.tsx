/**
 * App — 根組件 + 路由 state machine
 *
 * 對應 prototype app.jsx：管理 view (A/B/C/D) / theme / county / compare 狀態。
 * 把 manifest + mock data 餵給 ViewA。
 */

import { useEffect, useMemo, useState } from "react";
import { loadAllManifests, getThemeList } from "@/lib/themes";
import type { AppView, CountyCode3, ThemeManifest } from "@/lib/types";
import { TopBar } from "@/components/chrome/TopBar";
import { ThemeSwitcher } from "@/components/chrome/ThemeSwitcher";
import type { CrumbItem } from "@/components/chrome/Breadcrumb";
import { MapView, type PortPointFeature, type RailStationPointFeature } from "@/components/map/MapView";
import { MapLegend } from "@/components/map/MapLegend";
import { COLOR_RAMPS } from "@/lib/mapbox";
import { TwoSectionLayers, type PointLayerToggle, METRIC_NONE } from "@/components/map/TwoSectionLayers";
import { ViewA } from "@/components/views/ViewA";
import { ViewAFire } from "@/components/views/ViewAFire";
import { ViewAWater } from "@/components/views/ViewAWater";
import { ViewAHome } from "@/components/views/ViewAHome";
import { ViewBHomeBasics } from "@/components/views/ViewBHomeBasics";
import { ViewB } from "@/components/views/ViewB";
import { ViewBFire } from "@/components/views/ViewBFire";
import { ViewC } from "@/components/views/ViewC";
import { getMockMetricValue } from "@/lib/mock-data";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useWaterKpis } from "@/hooks/useWaterKpis";
import { useRiverWaterLevel } from "@/hooks/useRiverWaterLevel";
import { useFireData } from "@/hooks/useFireData";
import { useDemographicsData } from "@/hooks/useDemographicsData";
import { useRailData } from "@/hooks/useRailData";
import { useMaritimeData } from "@/hooks/useMaritimeData";
import { ViewADemographics } from "@/components/views/ViewADemographics";
import { ViewARail } from "@/components/views/ViewARail";
import { ViewAMaritime } from "@/components/views/ViewAMaritime";
import { ViewBDemographics } from "@/components/views/ViewBDemographics";
import { ViewBRail } from "@/components/views/ViewBRail";
import { ViewBMaritime } from "@/components/views/ViewBMaritime";
import { codeConvert, normalizeCountyName, COUNTIES, byCode3, byIdMoi } from "@/lib/counties";
import { getNearestCounty } from "@/lib/reverseGeocode";
import { FIRE_MOCK_BY_COUNTY } from "@/lib/mock-fire";

// 主題色映射（與 manifest theme.color_accent 對齊）
// key 必須對齊 theme state 值（= manifest theme.id），否則 THEME_ACCENT_VARS[theme]
// 會 miss 而 fallback 到 water — home-basics 之前就因 key 寫 "home" 而整片變水藍。
const THEME_ACCENT_VARS: Record<string, { accent: string; deep: string; soft: string }> = {
  water:         { accent: "#0EA5E9", deep: "#0369A1", soft: "#E0F2FE" },
  fire:          { accent: "#DC2626", deep: "#991B1B", soft: "#FEF2F2" },
  "home-basics": { accent: "#475569", deep: "#1E293B", soft: "#F1F5F9" },
  demographics:  { accent: "#7C3AED", deep: "#5B21B6", soft: "#F3E8FF" },
  rail:          { accent: "#4F46E5", deep: "#3730A3", soft: "#E0E7FF" },
  maritime:      { accent: "#0D9488", deep: "#115E59", soft: "#CCFBF1" },
};

// Phase 0b+ A-2: 水主題點位圖層定義（reservoir 已 LIVE，其他 Phase 1+ 規劃）
function buildPointLayers(
  on: Record<string, boolean>,
  reservoirCount: number,
  riverStationCount: number
): PointLayerToggle[] {
  return [
    { id: "reservoir",  label: "主要水庫",  count: reservoirCount,    color: "#0EA5E9", shape: "ring",   enabled: true,  on: on.reservoir },
    { id: "rainGauge",  label: "雨量站",    count: 1306,              color: "#10B981", shape: "dot",    enabled: false, on: on.rainGauge },
    { id: "waterQC",    label: "水質測站",  count: 2269,              color: "#A855F7", shape: "small",  enabled: false, on: on.waterQC },
    { id: "riverLevel", label: "河川水位站", count: riverStationCount, color: "#F59E0B", shape: "dot",    enabled: true,  on: on.riverLevel },
    { id: "polluter",   label: "列管事業",  count: 8420,              color: "#EF4444", shape: "small",  enabled: false, on: on.polluter },
    { id: "wwtp",       label: "汙水處理廠", count: 82,               color: "#64748B", shape: "square", enabled: false, on: on.wwtp },
  ];
}

// fire 主題點位圖層定義（hotspots / stations 已接通真實；hydrants 限高雄、forest 全國、ems 仍缺）
function buildFirePointLayers(
  on: Record<string, boolean>,
  stationCount: number,
  hotspotCount: number,
  hydrantCount: number,
  forestRiskCount: number,
  shelterCount: number
): PointLayerToggle[] {
  return [
    { id: "hotspots",    label: "火災熱點",          count: hotspotCount,  color: "#DC2626", shape: "small",  enabled: true,  on: on.hotspots },
    { id: "stations",    label: "消防分隊",          count: stationCount,  color: "#DC2626", shape: "dot",    enabled: true,  on: on.stations },
    { id: "hydrants",    label: "消防栓（限高雄）",  count: hydrantCount,  color: "#0EA5E9", shape: "small",  enabled: false, on: on.hydrants },
    { id: "forestRisk",  label: "林火風險點",        count: forestRiskCount, color: "#84CC16", shape: "ring",   enabled: false, on: on.forestRisk },
    { id: "emsHospital", label: "避難收容所",        count: shelterCount,  color: "#10B981", shape: "square", enabled: false, on: on.emsHospital },
  ];
}

export default function App() {
  // 載入所有 manifest（startup-time，static glob import）
  const manifests = useMemo(() => loadAllManifests(), []);
  const themeList = useMemo(() => getThemeList(manifests), [manifests]);

  // App state
  const [theme, setTheme] = useState<string>(import.meta.env.VITE_DEFAULT_THEME ?? "home-basics");
  const [view, setView] = useState<AppView>("A");
  const [county, setCounty] = useState<CountyCode3 | null>(null);
  const [reservoirId, setReservoirId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  // URL search params 解析（?county=TNN&view=B&theme=home-basics）— 給分享連結與 deeplink 用
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("theme");
    const c = sp.get("county");
    const v = sp.get("view");
    if (t) setTheme(t);
    if (c && /^[A-Z]{3}$/.test(c)) setCounty(c as CountyCode3);
    if (v === "A" || v === "B" || v === "C" || v === "D") setView(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manifest: ThemeManifest | null = manifests[theme] ?? null;

  // 預設 choropleth 指標：用 manifest 的設定
  const defaultMetric = manifest?.overview.default_choropleth_metric ?? "lpcd";
  const [metric, setMetric] = useState<string>(defaultMetric);
  useEffect(() => {
    setMetric(manifest?.overview.default_choropleth_metric ?? "lpcd");
  }, [theme, manifest?.overview.default_choropleth_metric]);

  // 主題色 apply 到 :root CSS var
  // 對應 prototype app.jsx：除了 accent/deep/soft，還要 rebind 7 階 --accent-ramp-*，
  // 否則 dashboard 圖表（人口金字塔 / ranking bar / vs-bar）會殘留 :root 預設的水藍 ramp。
  // 三色 + ramp 都跟 manifest 同一 SSOT：THEME_ACCENT_VARS 有精準品牌色就用，沒有
  // （如 socioeconomic）就從 manifest.theme.color_accent + color_ramp 推導，避免 miss-key
  // fallback 成水藍（home-basics / socioeconomic 之前就因此整片變水藍）。
  useEffect(() => {
    if (!manifest) return;
    const root = document.documentElement;
    const ramp = COLOR_RAMPS[manifest.theme.color_ramp] ?? COLOR_RAMPS.blues;
    const preset = THEME_ACCENT_VARS[theme] ?? {
      accent: manifest.theme.color_accent,
      deep: ramp[ramp.length - 1],
      soft: ramp[1],
    };
    root.style.setProperty("--accent", preset.accent);
    root.style.setProperty("--accent-deep", preset.deep);
    root.style.setProperty("--accent-soft", preset.soft);
    ramp.forEach((c, i) => root.style.setProperty(`--accent-ramp-${i}`, c));
  }, [theme, manifest]);

  // 從 manifest 找當前 metric 的設定
  const colorMetric = manifest?.overview.color_metrics.find((m) => m.id === metric) ?? null;

  // 真實 Supabase KPI（只在 water 主題啟用）
  const water = useWaterKpis();
  const river = useRiverWaterLevel();
  const useRealData = theme === "water";

  // 消防主題 Supabase 資料（只在 fire 主題啟用，省 RPC quota）
  const fire = useFireData({ enabled: theme === "fire" });
  const useFireRealData = theme === "fire";

  // 三新主題 Supabase 資料（依 theme enable，省往返）
  // home-basics 也需要 demographics 資料（SSOT：aging history + 地圖染色）
  const demographics = useDemographicsData({ enabled: theme === "demographics" || theme === "home-basics" });
  const rail = useRailData({ enabled: theme === "rail" });
  const maritime = useMaritimeData({ enabled: theme === "maritime" });

  // 把雨量站（中文 county）聚合成 22 縣市平均 24hr 雨量 → code3
  const rain24ByCode3 = useMemo(() => {
    if (!useRealData) return {} as Record<CountyCode3, number>;
    const buckets = new Map<CountyCode3, number[]>();
    for (const s of water.rainStations) {
      const idMoi = normalizeCountyName(s.county || "");
      if (!idMoi) continue;
      const code = codeConvert.idMoiToCode3(idMoi);
      if (!code) continue;
      const v = s.precipitation_24hr;
      if (v == null) continue;
      const list = buckets.get(code as CountyCode3) ?? [];
      list.push(v);
      buckets.set(code as CountyCode3, list);
    }
    const out = {} as Record<CountyCode3, number>;
    for (const [k, vs] of buckets) {
      out[k] = vs.reduce((s, v) => s + v, 0) / vs.length;
    }
    return out;
  }, [useRealData, water.rainStations]);

  // 無染色模式：metric === METRIC_NONE → 不算 metricValues、MapView 渲染灰底
  const neutralChoropleth = metric === METRIC_NONE;

  // demographics / home-basics 縣市聚合 Map（O(1) 查詢用）
  const demoAggByCode3 = useMemo(() => {
    const m = new Map<CountyCode3, (typeof demographics.countyAggregates)[0]>();
    for (const a of demographics.countyAggregates) m.set(a.code3 as CountyCode3, a);
    return m;
  }, [demographics.countyAggregates]);
  const useDemoRealData =
    (theme === "demographics" || theme === "home-basics") && demoAggByCode3.size > 0;

  // 計算 22 縣市 metric values — 真實資料優先，缺則 mock
  const metricValues = useMemo(() => {
    const out: Record<CountyCode3, number | null> = {} as never;
    if (neutralChoropleth) return out; // 無染色模式不需計算

    // 把 governance.{lpcd|sewage}_by_county（key=id_moi）轉成 code3
    const lpcdByCode3: Record<CountyCode3, number> = {} as never;
    const sewageByCode3: Record<CountyCode3, number> = {} as never;
    if (water.governance) {
      for (const [idMoi, v] of Object.entries(water.governance.lpcd_by_county)) {
        const code = codeConvert.idMoiToCode3(idMoi);
        if (code) lpcdByCode3[code as CountyCode3] = v;
      }
      for (const [idMoi, v] of Object.entries(water.governance.sewage_by_county)) {
        const code = codeConvert.idMoiToCode3(idMoi);
        if (code) sewageByCode3[code as CountyCode3] = v;
      }
    }

    // Fire choropleth：火災密度 / 分隊密度 / 栓密度 真實；5min 圈外仍 mock
    const fireDensityByCode3 = new Map<CountyCode3, number>();
    const stationsPerWanByCode3 = new Map<CountyCode3, number>();
    const hydrantsByCode3 = new Map<CountyCode3, number>();
    if (useFireRealData) {
      for (const a of fire.countyAggregates) {
        const c = COUNTIES.find((x) => x.id_moi === a.county_id);
        if (c && c.pop_2024_wan > 0) {
          fireDensityByCode3.set(
            c.code3 as CountyCode3,
            a.incidents / c.pop_2024_wan
          );
        }
      }
      // 真實分隊密度：fire.stations groupBy county_id
      const stationsByCounty = new Map<string, number>();
      for (const s of fire.stations) {
        stationsByCounty.set(s.county_id, (stationsByCounty.get(s.county_id) ?? 0) + 1);
      }
      for (const c of COUNTIES) {
        const cnt = stationsByCounty.get(c.id_moi) ?? 0;
        if (c.pop_2024_wan > 0) {
          stationsPerWanByCode3.set(c.code3 as CountyCode3, cnt / c.pop_2024_wan);
        }
      }
      // 真實栓密度（目前只高雄）
      // hydrantNationalCount 是 1 個整數，要走縣市 fetch 才能 by county；簡化做法：
      // 只給高雄 = hydrantNationalCount / 高雄 area，其他縣市 null（地圖會 gray）
      const khh = COUNTIES.find((x) => x.id_moi === "E");
      if (khh && fire.hydrantNationalCount > 0 && khh.area_km2 > 0) {
        hydrantsByCode3.set(khh.code3 as CountyCode3, fire.hydrantNationalCount / khh.area_km2);
      }
    }

    for (const code of Object.keys(byCode3) as CountyCode3[]) {
      let value: number | null = null;
      if (useRealData) {
        if (metric === "lpcd" && lpcdByCode3[code] != null) {
          value = lpcdByCode3[code];
        } else if (metric === "sewage_coverage" && sewageByCode3[code] != null) {
          value = sewageByCode3[code];
        } else if (metric === "rain_24hr" && rain24ByCode3[code] != null) {
          value = rain24ByCode3[code];
        } else if (metric === "river_alert_pct") {
          value = river.byCode3[code]?.alert_pct ?? 0;
        }
      } else if (useFireRealData) {
        const mock = FIRE_MOCK_BY_COUNTY[code];
        if (metric === "fire_density_per_wan") {
          value = fireDensityByCode3.get(code) ?? null;
        } else if (metric === "station_density_per_wan") {
          value = stationsPerWanByCode3.get(code) ?? null;
        } else if (metric === "out_of_5min_pct") {
          value = mock?.outOf5MinPct ?? null;
        } else if (metric === "hydrant_density_per_km2") {
          value = hydrantsByCode3.get(code) ?? null;
        }
      } else if (useDemoRealData) {
        // demographics / home-basics — 真實縣市聚合資料
        const agg = demoAggByCode3.get(code);
        if (agg) {
          if (metric === "aging_index")        value = agg.agingIndex;
          else if (metric === "population")    value = agg.pop;
          else if (metric === "population_density") value = agg.density;
          else if (metric === "growth_10y_pct") value = agg.growth10y;
          else if (metric === "area_km2") {
            const c = byCode3[code];
            value = c?.area_km2 ?? null;
          }
        }
      }
      // fallback to mock (water mock; fire / demographics 無資料則保持 null)
      if (value == null && !useFireRealData && !useDemoRealData) value = getMockMetricValue(metric, code);
      out[code] = value;
    }
    return out;
  }, [metric, neutralChoropleth, useRealData, useFireRealData, useDemoRealData, water.governance, rain24ByCode3, river.byCode3, fire.countyAggregates, demoAggByCode3]);

  // Phase 0b+ A-2: 點位圖層 toggle state（目前只 reservoir 有資料，其他 placeholder）
  const [pointLayersOn, setPointLayersOn] = useState<Record<string, boolean>>({
    reservoir: true,
    rainGauge: false,
    waterQC: false,
    riverLevel: false,
    polluter: false,
    wwtp: false,
  });
  const togglePointLayer = (id: string) =>
    setPointLayersOn((prev) => ({ ...prev, [id]: !prev[id] }));

  // B045：fire 主題點位圖層 toggle state（hotspots / stations 預設 on，其他待 Sprint 2-4 ETL）
  const [pointLayersOnFire, setPointLayersOnFire] = useState<Record<string, boolean>>({
    hotspots: true,
    stations: false,
    hydrants: false,
    forestRisk: false,
    emsHospital: false,
  });
  const togglePointLayerFire = (id: string) =>
    setPointLayersOnFire((prev) => ({ ...prev, [id]: !prev[id] }));

  const [pointLayersOnMaritime, setPointLayersOnMaritime] = useState<Record<string, boolean>>({ ports: true });
  const togglePointLayerMaritime = (id: string) =>
    setPointLayersOnMaritime((prev) => ({ ...prev, [id]: !prev[id] }));

  const [pointLayersOnRail, setPointLayersOnRail] = useState<Record<string, boolean>>({ stations: true });
  const togglePointLayerRail = (id: string) =>
    setPointLayersOnRail((prev) => ({ ...prev, [id]: !prev[id] }));

  // 40 水庫真實點位（給 MapView）
  // View A: 全部 37 座；View B/C: 只顯示該縣市 + 鄰縣（聚焦上下文）
  const reservoirPointsForMap = useMemo(() => {
    if (!useRealData || !water.reservoirs.length) return [];
    const all = water.reservoirs.map((r) => ({
      id: r.reservoir_id,
      name: r.name,
      rate: r.storage_ratio_pct,
      capacity: Number(r.effective_capacity_wan) || 0,
      lat: r.lat,
      lng: r.lng,
    }));
    // 縣市 view 過濾：只該縣市
    if ((view === "B" || view === "C") && county) {
      return all.filter((p) => p.lat != null && p.lng != null && getNearestCounty(p.lng, p.lat) === county);
    }
    return all;
  }, [useRealData, water.reservoirs, view, county]);

  // B045：fire heatmap 點位（113 年單年 ~12k 件，已 filter lat/lng != null）
  // View A 顯示全國，View B 才篩該縣市（fire ViewB 未實作，預留）
  const fireIncidentPointsForMap = useMemo(() => {
    if (!useFireRealData || !fire.incidentPoints.length) return [];
    const all = fire.incidentPoints
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
    if (view === "B" && county) {
      const idMoi = byCode3[county]?.id_moi;
      if (!idMoi) return all;
      // listIncidents 已附 county_id，但 fireIncidentPointsForMap 已脫光 → 重抓
      return fire.incidentPoints
        .filter((p) => p.county_id === idMoi && p.lat != null && p.lng != null)
        .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
    }
    return all;
  }, [useFireRealData, fire.incidentPoints, view, county]);

  // B045：消防分隊真實點位（fire.stations 全 22 縣市，716 個）
  const fireStationsForMap = useMemo(() => {
    if (!useFireRealData || !fire.stations.length) return [];
    // 過濾掉沒 lat/lng 的；轉成 MapView 期望的 shape
    const all = fire.stations
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: s.station_id,
        name: s.name,
        county_name: byIdMoi[s.county_id as keyof typeof byIdMoi]?.name_zh ?? s.county_id,
        lat: s.lat as number,
        lng: s.lng as number,
      }));
    if (view === "B" && county) {
      const idMoi = codeConvert.code3ToIdMoi(county);
      return all.filter((s) => fire.stations.find((st) => st.station_id === s.id)?.county_id === idMoi);
    }
    return all;
  }, [useFireRealData, fire.stations, view, county]);

  // Cycle E：河川水位站給 MapView
  // View A: 全國；View B: 只該縣市
  const riverStationsForMap = useMemo(() => {
    if (!useRealData || !river.stations.length) return [];
    const all = river.stations.map((s) => ({
      id: s.station_id,
      name: s.station_name,
      river: s.river_name,
      county: s.county_id_moi,
      level_m: s.water_level_m,
      alert_level: s.alert_level,
      observed_at: s.observed_at,
      lat: s.lat,
      lng: s.lng,
    }));
    if ((view === "B" || view === "C") && county) {
      return all.filter((p) => p.county != null && codeConvert.idMoiToCode3(p.county) === county);
    }
    return all;
  }, [useRealData, river.stations, view, county]);

  // 航運：港口點位給 MapView
  const portPointsForMap = useMemo((): PortPointFeature[] => {
    if (theme !== "maritime" || !maritime.ports.length) return [];
    return maritime.ports
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        port_class_group: p.port_class_group,
        lat: p.lat,
        lng: p.lng,
      }));
  }, [theme, maritime.ports]);

  // 軌道：車站點位給 MapView
  const railStationPointsForMap = useMemo((): RailStationPointFeature[] => {
    if (theme !== "rail" || !rail.stations.length) return [];
    // View B/C：只顯示該縣市車站（聚焦上下文，比照水庫/港口）；View A 全國
    const idMoi = county ? codeConvert.code3ToIdMoi(county) : null;
    return rail.stations
      .filter((s) => s.lat != null && s.lng != null)
      .filter((s) => {
        if ((view === "B" || view === "C") && idMoi) return s.county_id === idMoi;
        return true;
      })
      .map((s) => ({
        id: s.station_id,
        name: s.name,
        system_id: s.system_id,
        color: s.color ?? "#4F46E5",
        lat: s.lat,
        lng: s.lng,
      }));
  }, [theme, rail.stations, view, county]);

  // Breadcrumb
  const breadcrumb: CrumbItem[] = useMemo(() => {
    const items: CrumbItem[] = [
      { label: "首頁", action: () => goHome() },
      { label: `${manifest?.theme.name ?? theme}` },
    ];
    if (comparing) items.push({ label: "比較模式" });
    if (county && (view === "B" || view === "C")) {
      items.push({ label: byCode3[county]?.name_zh ?? county });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, county, theme, comparing, manifest?.theme.name, manifest?.theme.emoji]);

  // ─── navigation handlers ───
  const goHome = () => {
    setView("A");
    setCounty(null);
    setComparing(false);
  };
  const goCity = (code: CountyCode3) => {
    // B046: fire ViewB 已上線（migration 105 + ViewBFire 5 tabs + 雷達），點縣市進 ViewB
    setCounty(code);
    setView("B");
    setComparing(false);
  };
  const onCompare = () => setComparing((c) => !c);

  if (!manifest) {
    return (
      <div style={{ padding: 40 }}>
        <h2>找不到主題 manifest：{theme}</h2>
        <p>請確認 themes/{theme}.yaml 存在且 theme.id 對齊。</p>
        <ul>
          {Object.keys(manifests).map((id) => (
            <li key={id}>
              <button onClick={() => setTheme(id)}>{id}</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        themeName={manifest.theme.name}
        themeId={theme}
        year="2024"
        comparing={comparing}
        onCompare={onCompare}
        breadcrumb={breadcrumb}
      />

      <div className="main">
        <div className="map-cell">
          <ErrorBoundary
            label="地圖"
            fallback={(err, reset) => (
              <div className="map-pane" style={{ display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>地圖載入失敗</div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 12, maxWidth: 320 }}>
                    {err.message.includes("WebGL")
                      ? "瀏覽器 WebGL 不可用。請確認 GPU 加速已開啟，或換 Chrome / Firefox 試試。"
                      : err.message}
                  </div>
                  <button className="btn" onClick={reset}>重試</button>
                </div>
              </div>
            )}
          >
            <MapView
              metric={metric}
              rampName={manifest.theme.color_ramp}
              rampDirection={colorMetric?.ramp_direction ?? "default"}
              domain={colorMetric?.domain ?? [0, 100]}
              metricLabel={colorMetric?.label ?? metric}
              metricUnit={colorMetric?.unit ?? ""}
              metricValues={metricValues}
              selectedCounty={county}
              drillCounty={(view === "B" || view === "C") ? county : null}
              onCountyClick={goCity}
              reservoirPoints={reservoirPointsForMap}
              showReservoirs={useRealData && (view === "A" ? pointLayersOn.reservoir : view !== "D")}
              riverStations={riverStationsForMap}
              showRiverStations={useRealData && (view === "A" ? pointLayersOn.riverLevel : view === "B" || view === "C")}
              showWaterBaseLayers={theme === "water"}
              showFireHeatmap={theme === "fire" && pointLayersOnFire.hotspots}
              showFireStations={theme === "fire" && pointLayersOnFire.stations}
              fireIncidentPoints={fireIncidentPointsForMap}
              fireStations={fireStationsForMap}
              neutralChoropleth={neutralChoropleth}
              portPoints={portPointsForMap}
              showPorts={theme === "maritime" && view === "A" && pointLayersOnMaritime.ports}
              railStationPoints={railStationPointsForMap}
              showRailStations={theme === "rail" && (view === "A" ? pointLayersOnRail.stations : view === "B" || view === "C")}
            />
          </ErrorBoundary>

          {/* Phase 0b+ A-2: 著色指標 + 點位圖層控制 */}
          {view === "A" && manifest.overview.color_metrics && (
            <TwoSectionLayers
              metric={metric}
              metricOptions={manifest.overview.color_metrics}
              onMetricChange={setMetric}
              pointLayers={
                theme === "water"
                  ? buildPointLayers(pointLayersOn, water.reservoirs.length, river.stations.length)
                  : theme === "fire"
                    ? buildFirePointLayers(
                        pointLayersOnFire,
                        fireStationsForMap.length,
                        fireIncidentPointsForMap.length,
                        fire.hydrantNationalCount,
                        fire.forestRisk?.total ?? 0,
                        fire.shelterNationalCount
                      )
                  : theme === "maritime"
                    ? [{
                        id: "ports", label: "港口", count: portPointsForMap.length,
                        color: "#0D9488", shape: "dot" as const, enabled: true,
                        on: pointLayersOnMaritime.ports,
                      }]
                  : theme === "rail"
                    ? [{
                        id: "stations", label: "車站", count: railStationPointsForMap.length,
                        color: "#4F46E5", shape: "dot" as const, enabled: true,
                        on: pointLayersOnRail.stations,
                      }]
                  : []
              }
              onTogglePoint={
                theme === "fire" ? togglePointLayerFire
                : theme === "maritime" ? togglePointLayerMaritime
                : theme === "rail" ? togglePointLayerRail
                : togglePointLayer
              }
            />
          )}

          {view === "A" && colorMetric && (
            <MapLegend
              label={colorMetric.label}
              unit={colorMetric.unit}
              rampName={manifest.theme.color_ramp}
              rampDirection={colorMetric.ramp_direction}
              domain={colorMetric.domain}
            />
          )}

          {view === "A" && (
            <div className="map-meta map-overlay">資料時間：2026-05-14</div>
          )}
        </div>

        <div className="dashboard-pane">
          <ErrorBoundary label="儀錶板">
            {view === "A" ? (
              theme === "fire" ? (
                <ViewAFire
                  data={fire}
                  selectedCounty={county}
                  onCountyClick={goCity}
                />
              ) : theme === "water" ? (
                <ViewAWater
                  water={water}
                  river={river}
                  selectedCounty={county}
                  onCountyClick={goCity}
                  onDrillReservoir={(id) => {
                    setReservoirId(id);
                    setView("C");
                  }}
                />
              ) : theme === "home-basics" ? (
                <ViewAHome
                  selectedCounty={county}
                  onCountyClick={goCity}
                  demographics={demographics}
                />
              ) : theme === "demographics" ? (
                <ViewADemographics
                  data={demographics}
                  selectedCounty={county}
                  onCountyClick={goCity}
                />
              ) : theme === "rail" ? (
                <ViewARail
                  data={rail}
                  selectedCounty={county}
                  onCountyClick={goCity}
                />
              ) : theme === "maritime" ? (
                <ViewAMaritime
                  data={maritime}
                  selectedCounty={county}
                  onCountyClick={goCity}
                />
              ) : (
                <ViewA
                  manifest={manifest}
                  metric={metric}
                  onMetricChange={setMetric}
                  onCountyClick={goCity}
                  onDrillReservoir={(id) => {
                    setReservoirId(id);
                    setView("C");
                  }}
                  selectedCounty={county}
                  realSummary={useRealData ? water.summary : null}
                  realGovernance={useRealData ? water.governance : null}
                  realRain24ByCode3={useRealData ? rain24ByCode3 : null}
                  realReservoirs={useRealData ? water.reservoirs : []}
                  realFloodPct={useRealData ? water.flood : null}
                  realLoading={useRealData ? water.loading : false}
                  realError={useRealData ? water.error : null}
                />
              )
            ) : view === "C" && reservoirId ? (
              <ViewC
                reservoirId={reservoirId}
                allReservoirs={useRealData ? water.reservoirs : []}
                nationalAvg={useRealData ? water.summary?.reservoir_rate_avg ?? null : null}
                onBack={() => {
                  setReservoirId(null);
                  setView(county ? "B" : "A");
                }}
              />
            ) : view === "B" && county ? (
              theme === "fire" ? (
                <ViewBFire
                  data={fire}
                  county={county}
                  onBack={goHome}
                  onAddCompare={() => { setComparing(true); }}
                />
              ) : theme === "demographics" ? (
                <ViewBDemographics
                  data={demographics}
                  county={county}
                  onBack={goHome}
                  onAddCompare={() => { setComparing(true); }}
                />
              ) : theme === "rail" ? (
                <ViewBRail
                  data={rail}
                  county={county}
                  onBack={goHome}
                  onAddCompare={() => { setComparing(true); }}
                />
              ) : theme === "maritime" ? (
                <ViewBMaritime
                  data={maritime}
                  county={county}
                  onBack={goHome}
                  onAddCompare={() => { setComparing(true); }}
                />
              ) : theme === "home-basics" ? (
                <ViewBHomeBasics
                  county={county}
                  onBack={goHome}
                  onAddCompare={() => { setComparing(true); }}
                  onCityClick={goCity}
                />
              ) : (
                <ViewB
                  manifest={manifest}
                  county={county}
                  allReservoirs={useRealData ? water.reservoirs : []}
                  nationalLpcd={useRealData ? water.governance?.lpcd_national_avg ?? null : null}
                  nationalSewage={useRealData ? water.governance?.sewage_national_avg ?? null : null}
                  lpcdByCountyId={useRealData ? water.governance?.lpcd_by_county ?? {} : {}}
                  sewageByCountyId={useRealData ? water.governance?.sewage_by_county ?? {} : {}}
                  onBack={goHome}
                  onAddCompare={() => { setComparing(true); }}
                  onDrillReservoir={(id) => {
                    setReservoirId(id);
                    setView("C");
                  }}
                />
              )
            ) : (
              <div className="hero">
                <h1>View {view}</h1>
                <p className="hook">Phase 0b 尚未實作（待 Phase 0c+）。</p>
                <button className="btn" onClick={goHome}>← 返回</button>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>

      <ThemeSwitcher
        themes={themeList}
        activeTheme={theme}
        onThemeChange={(t) => {
          setTheme(t);
          setView("A");
          setCounty(null);
          setComparing(false);
        }}
      />
    </div>
  );
}

