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
import { MapView } from "@/components/map/MapView";
import { MapLegend } from "@/components/map/MapLegend";
import { TwoSectionLayers, type PointLayerToggle } from "@/components/map/TwoSectionLayers";
import { ViewA } from "@/components/views/ViewA";
import { ViewAFire } from "@/components/views/ViewAFire";
import { ViewB } from "@/components/views/ViewB";
import { ViewC } from "@/components/views/ViewC";
import { getMockMetricValue } from "@/lib/mock-data";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useWaterKpis } from "@/hooks/useWaterKpis";
import { useRiverWaterLevel } from "@/hooks/useRiverWaterLevel";
import { useFireData } from "@/hooks/useFireData";
import { codeConvert, normalizeCountyName, COUNTIES, byCode3 } from "@/lib/counties";
import { getNearestCounty } from "@/lib/reverseGeocode";
import { FIRE_MOCK_BY_COUNTY } from "@/lib/mock-fire";

// 主題色映射（與 manifest theme.color_accent 對齊）
const THEME_ACCENT_VARS: Record<string, { accent: string; deep: string; soft: string }> = {
  water: { accent: "#0EA5E9", deep: "#0369A1", soft: "#E0F2FE" },
  fire:  { accent: "#DC2626", deep: "#991B1B", soft: "#FEF2F2" },
  home:  { accent: "#475569", deep: "#1E293B", soft: "#F1F5F9" },
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

export default function App() {
  // 載入所有 manifest（startup-time，static glob import）
  const manifests = useMemo(() => loadAllManifests(), []);
  const themeList = useMemo(() => getThemeList(manifests), [manifests]);

  // App state
  const [theme, setTheme] = useState<string>(import.meta.env.VITE_DEFAULT_THEME ?? "water");
  const [view, setView] = useState<AppView>("A");
  const [county, setCounty] = useState<CountyCode3 | null>(null);
  const [reservoirId, setReservoirId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  const manifest: ThemeManifest | null = manifests[theme] ?? null;

  // 預設 choropleth 指標：用 manifest 的設定
  const defaultMetric = manifest?.overview.default_choropleth_metric ?? "lpcd";
  const [metric, setMetric] = useState<string>(defaultMetric);
  useEffect(() => {
    setMetric(manifest?.overview.default_choropleth_metric ?? "lpcd");
  }, [theme, manifest?.overview.default_choropleth_metric]);

  // 主題色 apply 到 :root CSS var
  useEffect(() => {
    const root = document.documentElement;
    const preset = THEME_ACCENT_VARS[theme] ?? THEME_ACCENT_VARS.water;
    root.style.setProperty("--accent", preset.accent);
    root.style.setProperty("--accent-deep", preset.deep);
    root.style.setProperty("--accent-soft", preset.soft);
  }, [theme]);

  // 從 manifest 找當前 metric 的設定
  const colorMetric = manifest?.overview.color_metrics.find((m) => m.id === metric) ?? null;

  // 真實 Supabase KPI（只在 water 主題啟用）
  const water = useWaterKpis();
  const river = useRiverWaterLevel();
  const useRealData = theme === "water";

  // 消防主題 Supabase 資料（只在 fire 主題啟用，省 RPC quota）
  const fire = useFireData({ enabled: theme === "fire" });
  const useFireRealData = theme === "fire";

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

  // 計算 22 縣市 metric values — 真實資料優先，缺則 mock
  const metricValues = useMemo(() => {
    const out: Record<CountyCode3, number | null> = {} as never;

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

    // Fire choropleth：火災密度 真實，其他 mock
    const fireDensityByCode3 = new Map<CountyCode3, number>();
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
          value = mock?.stationsPerWan ?? null;
        } else if (metric === "out_of_5min_pct") {
          value = mock?.outOf5MinPct ?? null;
        } else if (metric === "hydrant_density_per_km2") {
          // 4 都 only — 用 area_km2 算密度
          const c = byCode3[code];
          if (mock && mock.hydrants > 0 && c?.area_km2 > 0) {
            value = mock.hydrants / c.area_km2;
          } else {
            value = null;
          }
        }
      }
      // fallback to mock (water mock; fire 主題若 metric 無資料則保持 null)
      if (value == null && !useFireRealData) value = getMockMetricValue(metric, code);
      out[code] = value;
    }
    return out;
  }, [metric, useRealData, useFireRealData, water.governance, rain24ByCode3, river.byCode3, fire.countyAggregates]);

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

  // Breadcrumb
  const breadcrumb: CrumbItem[] = useMemo(() => {
    const items: CrumbItem[] = [
      { label: "首頁", action: () => goHome() },
      { label: `${manifest?.theme.emoji ?? ""} ${manifest?.theme.name ?? theme}` },
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
    // Fire 主題目前只有 ViewA — 點縣市改為 highlight only（不進 View B，因 fire View B 未實作）
    if (theme === "fire") {
      setCounty(county === code ? null : code);
      return;
    }
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
            />
          </ErrorBoundary>

          {/* Phase 0b+ A-2: 著色指標 + 點位圖層控制
              - water：完整 6 個點位 layer
              - fire：只顯著色指標選單（Sprint 2 完成後加分隊/熱點/消防栓 layer） */}
          {view === "A" && manifest.overview.color_metrics && (
            <TwoSectionLayers
              metric={metric}
              metricOptions={manifest.overview.color_metrics}
              onMetricChange={setMetric}
              pointLayers={
                theme === "water"
                  ? buildPointLayers(pointLayersOn, water.reservoirs.length, river.stations.length)
                  : []
              }
              onTogglePoint={togglePointLayer}
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

