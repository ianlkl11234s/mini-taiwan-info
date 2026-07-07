/**
 * App — 根組件 + 路由 state machine
 *
 * 對應 prototype app.jsx：管理 view (A/B/C) / theme / county / about 狀態。
 * 主題相關的 hook / 著色 / 點位層 / 專屬 view 全部由 theme-registry 宣告驅動 —
 * 加新主題只需在 theme-registry.tsx 加 entry，本檔零修改。
 */

import { useEffect, useMemo, useState } from "react";
import { loadAllManifests, getThemeList } from "@/lib/themes";
import type { AppView, CountyCode3, ThemeManifest } from "@/lib/types";
import { TopBar } from "@/components/chrome/TopBar";
import { ThemeSwitcher } from "@/components/chrome/ThemeSwitcher";
import type { CrumbItem } from "@/components/chrome/Breadcrumb";
import { MapView, type GenericMapPointLayer, type SpecialMapProps } from "@/components/map/MapView";
import { MapLegend } from "@/components/map/MapLegend";
import { COLOR_RAMPS } from "@/lib/mapbox";
import { TwoSectionLayers, type PointLayerToggle, METRIC_NONE } from "@/components/map/TwoSectionLayers";
import { ViewA } from "@/components/views/ViewA";
import { ViewB } from "@/components/views/ViewB";
import { ViewC } from "@/components/views/ViewC";
import { AboutView } from "@/components/views/AboutView";
import { getMockMetricValue } from "@/lib/mock-data";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  getThemeEntry,
  useThemeRegistryData,
  resolveThemeData,
  buildDefaultLayerToggles,
  type ThemeViewContext,
} from "@/lib/theme-registry";
import { byCode3 } from "@/lib/counties";
import { useMemberGate, signInWithGoogle } from "@/lib/auth";
import { loadLayerGates, useLayerGates, isLayerLocked, type GateContext } from "@/lib/layerGates";

export default function App() {
  // 載入所有 manifest（startup-time，static glob import）
  const manifests = useMemo(() => loadAllManifests(), []);
  const themeList = useMemo(() => getThemeList(manifests), [manifests]);

  // App state
  const [theme, setTheme] = useState<string>(import.meta.env.VITE_DEFAULT_THEME ?? "home-basics");
  const [view, setView] = useState<AppView>("A");
  const [county, setCounty] = useState<CountyCode3 | null>(null);
  const [reservoirId, setReservoirId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  // URL search params 解析（?county=TNN&view=B&theme=home-basics）— 給分享連結與 deeplink 用
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("theme");
    const c = sp.get("county");
    const v = sp.get("view");
    if (t) setTheme(t);
    if (c && /^[A-Z]{3}$/.test(c)) setCounty(c as CountyCode3);
    if (v === "A" || v === "B" || v === "C") setView(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manifest: ThemeManifest | null = manifests[theme] ?? null;

  // 主題 registry entry（無 entry 的 draft 主題 → generic fallback，見下方 DEV warn）
  const entry = useMemo(() => getThemeEntry(theme), [theme]);

  // 會員閘門：user/tier（useMemberGate 全 App 只呼叫這一次）+ 動態鎖層清單。
  // migration 281 apply 前 gates 無 info_medical_ltc 列 → 該層照舊公開。
  const { user, tier } = useMemberGate();
  const gates = useLayerGates();
  useEffect(() => {
    void loadLayerGates();
  }, []);
  const gateCtx = useMemo<GateContext>(() => ({ tier, gates }), [tier, gates]);

  // 所有主題 hooks（registry 迴圈呼叫，順序穩定 — 見 useThemeRegistryData 註解）
  const themeDataMap = useThemeRegistryData(theme, gateCtx);
  const data = resolveThemeData(themeDataMap, entry);

  // 預設 choropleth 指標：用 manifest 的設定
  const defaultMetric = manifest?.overview.default_choropleth_metric ?? "lpcd";
  const [metric, setMetric] = useState<string>(defaultMetric);
  useEffect(() => {
    setMetric(manifest?.overview.default_choropleth_metric ?? "lpcd");
  }, [theme, manifest?.overview.default_choropleth_metric]);

  // 主題色 apply 到 :root CSS var
  // 對應 prototype app.jsx：除了 accent/deep/soft，還要 rebind 7 階 --accent-ramp-*，
  // 否則 dashboard 圖表（人口金字塔 / ranking bar / vs-bar）會殘留 :root 預設的水藍 ramp。
  // accent 單一 SSOT = manifest.theme.color_accent（去雙 SSOT）；deep/soft 用 registry
  // 手選品牌色，缺 entry / 缺 override → 從 color_ramp 推導 + DEV 提示，
  // 防舊坑「THEME_ACCENT_VARS miss key → 整片變水藍」（home-basics 曾中獎）。
  useEffect(() => {
    if (!manifest) return;
    const root = document.documentElement;
    const ramp = COLOR_RAMPS[manifest.theme.color_ramp] ?? COLOR_RAMPS.blues;
    const accent = manifest.theme.color_accent;
    const deep = entry?.accentOverride?.deep ?? ramp[ramp.length - 1];
    const soft = entry?.accentOverride?.soft ?? ramp[1];
    if (import.meta.env.DEV && !entry?.accentOverride) {
      // eslint-disable-next-line no-console
      console.warn(`[App] theme "${theme}" 無 accentOverride — deep/soft 從 color_ramp 推導`);
    }
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-deep", deep);
    root.style.setProperty("--accent-soft", soft);
    ramp.forEach((c, i) => root.style.setProperty(`--accent-ramp-${i}`, c));
  }, [theme, manifest, entry]);

  // 從 manifest 找當前 metric 的設定
  const colorMetric = manifest?.overview.color_metrics.find((m) => m.id === metric) ?? null;

  // 無染色模式：metric === METRIC_NONE → 不算 metricValues、MapView 渲染灰底
  const neutralChoropleth = metric === METRIC_NONE;

  // 鐵則 1 地雷顯式化：無 registry entry（或 entry 缺專屬 ViewA）的主題會 fallback 到
  // generic ViewA + 水 mock metric fallback。draft 主題（forestry/fishery）可暫時如此，
  // 但正式主題必須有 entry + 真 view。
  const hasThemeViewA = !!entry?.renderViewA;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!entry) {
      // eslint-disable-next-line no-console
      console.warn(
        `[App] theme "${theme}" 無 theme-registry entry — 落到 generic ViewA（內含水主題 mock 版位）` +
          ` + 水 mock choropleth fallback。鐵則 1：正式上線前必須加 registry entry + 真實 view。`
      );
    } else if (!hasThemeViewA) {
      // eslint-disable-next-line no-console
      console.warn(`[App] theme "${theme}" 的 registry entry 缺 renderViewA — 落到 generic ViewA（水 mock 版位）`);
    }
  }, [theme, entry, hasThemeViewA]);

  // 計算 22 縣市 metric values — registry metricResolver 出真實值，
  // 缺值時僅 mockMetricFallback（water）或無 entry 主題會 fallback 水 mock（沿舊行為）
  const metricValues = useMemo(() => {
    const out: Record<CountyCode3, number | null> = {} as never;
    if (neutralChoropleth) return out; // 無染色模式不需計算
    const resolved =
      entry?.metricResolver && data != null ? entry.metricResolver(data, metric) : {};
    const useMockFallback = entry ? !!entry.mockMetricFallback : true;
    for (const code of Object.keys(byCode3) as CountyCode3[]) {
      let value: number | null = resolved[code] ?? null;
      if (value == null && useMockFallback) value = getMockMetricValue(metric, code);
      out[code] = value;
    }
    return out;
  }, [entry, data, metric, neutralChoropleth]);

  // 點位圖層 toggle state：{ themeId: { layerId: on } }，初始值來自 registry defaultOn。
  // 各主題各自保留 toggle 狀態（切主題再切回不重設 — 沿舊行為）。
  const [layerToggles, setLayerToggles] = useState<Record<string, Record<string, boolean>>>(
    () => buildDefaultLayerToggles()
  );
  const togglePointLayer = (id: string) =>
    setLayerToggles((prev) => ({
      ...prev,
      [theme]: { ...(prev[theme] ?? {}), [id]: !prev[theme]?.[id] },
    }));
  const layerOn = layerToggles[theme] ?? {};

  // TwoSectionLayers 的點位層清單（registry 宣告）；gateKey 層依 tier/gates 判定 locked
  const pointToggles = useMemo((): PointLayerToggle[] => {
    if (!entry?.pointLayers || data == null) return [];
    return entry.pointLayers.map((L) => {
      const locked = L.gateKey ? isLayerLocked(L.gateKey, tier, gates) : false;
      return {
        id: L.id,
        label: L.label,
        color: L.color,
        shape: L.shape,
        enabled: L.enabled,
        on: !!layerOn[L.id],
        count: L.count ? L.count(data) : L.staticCount,
        locked,
        requiredTier: locked ? gates?.get(L.gateKey!)?.required_tier ?? "member" : undefined,
      };
    });
  }, [entry, data, layerOn, tier, gates]);

  // 點擊 locked 層：未登入 → 引導 Google 登入；已登入 tier 不足 → 面板內提示
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!lockNotice) return;
    const t = setTimeout(() => setLockNotice(null), 5000);
    return () => clearTimeout(t);
  }, [lockNotice]);
  const handleLockedPoint = (id: string) => {
    const L = entry?.pointLayers?.find((x) => x.id === id);
    if (!L) return;
    const required = (L.gateKey ? gates?.get(L.gateKey)?.required_tier : undefined) ?? "member";
    if (!user) {
      if (window.confirm(`「${L.label}」為會員限定圖層（${required} 以上），要使用 Google 帳號登入嗎？`)) {
        void signInWithGoogle().catch((err) => console.warn("[auth] signIn failed", err));
      }
    } else {
      setLockNotice(`「${L.label}」需 ${required} 以上會員（目前等級：${tier ?? "free"}）`);
    }
  };

  // MapView 泛用點位層（ports / rail / medical ...）；locked 層不渲染（資料也不 fetch）
  const genericPointLayers = useMemo((): GenericMapPointLayer[] => {
    if (!entry?.pointLayers || data == null) return [];
    return entry.pointLayers
      .filter((L) => L.map)
      .map((L) => {
        const locked = L.gateKey ? isLayerLocked(L.gateKey, tier, gates) : false;
        return {
          spec: L.map!.spec,
          visible:
            !locked && L.enabled && (L.map!.visibleWhen ?? ((on: boolean) => on))(!!layerOn[L.id], view),
          points: locked ? [] : L.map!.getPoints(data, view, county),
        };
      });
  }, [entry, data, layerOn, view, county, tier, gates]);

  // MapView 特殊主題層（water 基底層 / fire heatmap — registry flag 驅動，MapView 內既有實作）
  const specialMapProps = useMemo((): SpecialMapProps => {
    if (!entry?.specialMapProps || data == null) return {};
    return entry.specialMapProps(data, { on: layerOn, view, county });
  }, [entry, data, layerOn, view, county]);

  // Breadcrumb
  const breadcrumb: CrumbItem[] = useMemo(() => {
    const items: CrumbItem[] = [
      { label: "首頁", action: () => goHome() },
      { label: `${manifest?.theme.name ?? theme}` },
    ];
    if (county && (view === "B" || view === "C")) {
      items.push({ label: byCode3[county]?.name_zh ?? county });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, county, theme, manifest?.theme.name, manifest?.theme.emoji]);

  // ─── navigation handlers ───
  const goHome = () => {
    setView("A");
    setCounty(null);
    setAboutOpen(false);
  };
  const goCity = (code: CountyCode3) => {
    setCounty(code);
    setView("B");
  };
  const drillReservoir = (id: string) => {
    setReservoirId(id);
    setView("C");
  };
  const backFromDetail = () => {
    setReservoirId(null);
    setView(county ? "B" : "A");
  };

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

  // 傳給 registry renderViewA/B/C 的 context
  const viewCtx: ThemeViewContext = {
    manifest,
    county,
    metric,
    onMetricChange: setMetric,
    onCountyClick: goCity,
    onBack: goHome,
    onDrillReservoir: drillReservoir,
  };

  return (
    <div className="app">
      <TopBar
        themeName={manifest.theme.name}
        themeId={theme}
        year="2024"
        breadcrumb={breadcrumb}
        tier={tier}
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
              neutralChoropleth={neutralChoropleth}
              pointLayers={genericPointLayers}
              {...specialMapProps}
            />
          </ErrorBoundary>

          {/* Phase 0b+ A-2: 著色指標 + 點位圖層控制 */}
          {view === "A" && manifest.overview.color_metrics && (
            <TwoSectionLayers
              metric={metric}
              metricOptions={manifest.overview.color_metrics}
              onMetricChange={setMetric}
              pointLayers={pointToggles}
              onTogglePoint={togglePointLayer}
              onLockedPoint={handleLockedPoint}
              lockNotice={lockNotice}
            />
          )}

          {view === "A" && colorMetric && (
            <MapLegend
              label={colorMetric.label}
              unit={colorMetric.unit}
              rampName={manifest.theme.color_ramp}
              rampDirection={colorMetric.ramp_direction}
              domain={colorMetric.domain}
              coverageNote={colorMetric.coverage_note}
            />
          )}

          {view === "A" && (
            <div className="map-meta map-overlay">資料時間：2026-05-14</div>
          )}
        </div>

        <div className="dashboard-pane">
          <ErrorBoundary label="儀錶板">
            {view === "A" ? (
              entry?.renderViewA && data != null ? (
                entry.renderViewA(data, viewCtx)
              ) : (
                // generic fallback — 內含水主題 mock KPI 版位（鐵則 1 地雷，僅 draft 主題會走到；
                // DEV console 已 warn，正式主題必須提供 registry entry + renderViewA）
                <ViewA
                  manifest={manifest}
                  metric={metric}
                  onMetricChange={setMetric}
                  onCountyClick={goCity}
                  onDrillReservoir={drillReservoir}
                  selectedCounty={county}
                  realSummary={null}
                  realGovernance={null}
                  realRain24ByCode3={null}
                  realReservoirs={[]}
                  realFloodPct={null}
                  realLoading={false}
                  realError={null}
                />
              )
            ) : view === "C" && reservoirId ? (
              entry?.renderViewC && data != null ? (
                entry.renderViewC(data, { ...viewCtx, reservoirId, onBackFromDetail: backFromDetail })
              ) : (
                <ViewC
                  reservoirId={reservoirId}
                  allReservoirs={[]}
                  nationalAvg={null}
                  onBack={backFromDetail}
                />
              )
            ) : view === "B" && county ? (
              entry?.renderViewB && data != null ? (
                entry.renderViewB(data, viewCtx)
              ) : (
                // generic fallback（無 entry 的 draft 主題）— 水主題版 ViewB 空資料殼
                <ViewB
                  manifest={manifest}
                  county={county}
                  allReservoirs={[]}
                  nationalLpcd={null}
                  nationalSewage={null}
                  lpcdByCountyId={{}}
                  sewageByCountyId={{}}
                  onBack={goHome}
                  onDrillReservoir={drillReservoir}
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

      {aboutOpen && <AboutView onClose={() => setAboutOpen(false)} />}

      <ThemeSwitcher
        themes={themeList}
        activeTheme={theme}
        aboutActive={aboutOpen}
        onAbout={() => setAboutOpen(true)}
        onThemeChange={(t) => {
          setTheme(t);
          setView("A");
          setCounty(null);
          setAboutOpen(false);
        }}
      />
    </div>
  );
}
