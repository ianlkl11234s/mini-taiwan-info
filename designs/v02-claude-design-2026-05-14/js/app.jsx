/* ============================================================
   Mini Taiwan Info — App shell + state machine
   ============================================================ */

const { useState: appState, useEffect: appEffect, useMemo: appMemo } = React;

// Tweak defaults  (must be a SINGLE EDITMODE block in this file)
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mapStyle": "light",
  "density": "normal",
  "radius": "medium",
  "dark": false,
  "waterAccent": "blue"
}/*EDITMODE-END*/;

const WATER_ACCENT_PRESETS = {
  blue:    { accent: "#0EA5E9", deep: "#0369A1", soft: "#E0F2FE" },
  teal:    { accent: "#0D9488", deep: "#0F766E", soft: "#CCFBF1" },
  cobalt:  { accent: "#2563EB", deep: "#1D4ED8", soft: "#DBEAFE" },
  ocean:   { accent: "#0284C7", deep: "#075985", soft: "#E0F2FE" },
};

function App() {
  // ----- Tweaks state via host protocol -----
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  appEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-density", tweaks.density);
    root.setAttribute("data-radius", tweaks.radius);
    root.setAttribute("data-theme", tweaks.dark ? "dark" : "light");

    // Apply water accent preset
    const p = WATER_ACCENT_PRESETS[tweaks.waterAccent] || WATER_ACCENT_PRESETS.blue;
    root.style.setProperty("--accent-water", p.accent);
    root.style.setProperty("--accent-water-deep", p.deep);
    root.style.setProperty("--accent-water-soft", p.soft);
  }, [tweaks]);

  // ----- App state -----
  // Routes: { theme, view, county, reservoirId, comparing, selectedForCompare }
  const [theme, setTheme] = appState("water");
  const [view, setView] = appState("A");                // A | B | C | D
  const [county, setCounty] = appState(null);           // for B / C
  const [reservoirId, setReservoirId] = appState(null);
  const [comparing, setComparing] = appState(false);
  const [selectedForCompare, setSelectedForCompare] = appState(["NTP", "TCH", "KHH"]);

  // metric for choropleth (depends on theme + view)
  const [waterMetric, setWaterMetric] = appState("lpcd");
  const homeMetric = "agingIndex";

  const metric = theme === "water" ? waterMetric : homeMetric;

  // Apply theme accent
  appEffect(() => {
    const root = document.documentElement;
    const map = {
      water:       ["--accent-water",       "--accent-water-deep",       "--accent-water-soft"],
      home:        ["--accent-home",        "--accent-home-deep",        "--accent-home-soft"],
      fire:        ["--accent-fire",        "--accent-fire",             "--danger-soft"],
      population:  ["--accent-population",  "--accent-population",       "var(--accent-soft)"],
      medical:     ["--accent-medical",     "--accent-medical",          "var(--positive-soft)"],
      transport:   ["--accent-transport",   "--accent-transport",        "var(--warning-soft)"],
      environment: ["--accent-environment", "--accent-environment",      "var(--positive-soft)"],
      realestate:  ["--accent-real-estate", "--accent-real-estate",      "var(--warning-soft)"],
    };
    const [a, d, s] = map[theme] || map.water;
    root.style.setProperty("--accent",      `var(${a})`);
    root.style.setProperty("--accent-deep", `var(${d})`);
    root.style.setProperty("--accent-soft", `var(${s})`);

    // ramps
    const ramps = window.RAMPS?.[theme === "home" ? "home" : "water"] || window.RAMPS.water;
    ramps.forEach((c, i) => root.style.setProperty(`--accent-ramp-${i}`, c));
  }, [theme]);

  // ----- Navigation handlers -----
  const goCity = (code) => {
    if (comparing) {
      // In compare mode, clicking a county adds/removes it
      if (selectedForCompare.includes(code)) {
        setSelectedForCompare(selectedForCompare.filter((x) => x !== code));
      } else if (selectedForCompare.length < 5) {
        setSelectedForCompare([...selectedForCompare, code]);
      }
      return;
    }
    setCounty(code);
    setView("B");
  };

  const goCompareMode = () => {
    setComparing(true);
    setView("D");
    if (selectedForCompare.length === 0) setSelectedForCompare(["KHH"]);
  };
  const closeCompare = () => {
    setComparing(false);
    setView(county ? "B" : "A");
  };
  const goReservoir = (id) => {
    setReservoirId(id);
    setView("C");
  };

  const goHomeA = () => {
    setView("A");
    setCounty(null);
    setReservoirId(null);
    setComparing(false);
  };

  // Expose navigation globals for testing / external links
  appEffect(() => {
    window.__nav = {
      home: goHomeA,
      city: (code) => { setCounty(code); setView("B"); setComparing(false); },
      reservoir: (id) => { setCounty("KHH"); setReservoirId(id); setView("C"); setComparing(false); },
      compare: () => goCompareMode(),
      theme: setTheme,
    };
  });

  // ----- Build breadcrumb -----
  const breadcrumb = (() => {
    const items = [
      { label: "首頁", action: () => goHomeA() },
      { label: theme === "water" ? "💧 水資源" : "🏠 基礎", action: () => goHomeA() },
    ];
    if (view === "D") items.push({ label: "比較模式" });
    if (county && (view === "B" || view === "C")) items.push({ label: window.byCode[county].name, action: () => setView("B") });
    if (view === "C" && reservoirId) {
      const r = window.KHH_RESERVOIRS.find((rr) => rr.id === reservoirId);
      items.push({ label: r?.name || "資料集" });
    }
    return items;
  })();

  // ----- Map state -----
  // View A 水資源：兩段式圖層狀態（需在 showReservoirs 之前宣告）
  const [pointOn, setPointOn] = appState(
    Object.fromEntries((window.POINT_LAYERS_WATER || []).map((L) => [L.id, !!L.defaultOn]))
  );
  const togglePoint = (id) => setPointOn({ ...pointOn, [id]: !pointOn[id] });

  // For View B: show that county and zoom; show reservoir/wwtp points if KHH water
  const mapDrillCounty = (view === "B" || view === "C") ? county : null;

  // 全國 40 座水庫 — View A 點位圖層
  const allReservoirPoints = appMemo(() => (window.ALL_RESERVOIRS || []).map((r) => ({
    id: `${r.county}-${r.name}`,
    name: r.name,
    rate: r.rate,
    capacity: r.capacity,
    countyName: r.countyName,
    countyCode: r.county,
    lng: r.lng,
    lat: r.lat,
  })), []);

  const isViewAWater = view === "A" && theme === "water";

  const showReservoirs = (theme === "water" && (view === "B" || view === "C") && county === "KHH")
    || (isViewAWater && pointOn.reservoir);
  const showWWTP = (theme === "water" && (view === "B" || view === "C") && county === "KHH")
    || (isViewAWater && pointOn.wwtp);

  const reservoirPointsForMap = isViewAWater
    ? allReservoirPoints
    : window.KHH_RESERVOIRS.map((r, i) => ({
        ...r,
        lng: [120.310, 120.355, 120.367][i] || 120.32,
        lat: [22.880, 22.681, 22.617][i] || 22.65,
      }));

  const mapHighlight = comparing ? selectedForCompare : (county ? [county] : []);
  const mapHighlightColors = comparing
    ? Object.fromEntries(selectedForCompare.map((c, i) => [c, CMP_COLORS[i]]))
    : {};

  // ----- Dashboard render -----
  const renderDashboard = () => {
    if (view === "D") {
      return (
        <ViewD_Compare
          selectedCounties={selectedForCompare}
          onAddCounty={(c) => setSelectedForCompare([...selectedForCompare, c])}
          onRemoveCounty={(c) => setSelectedForCompare(selectedForCompare.filter((x) => x !== c))}
          onClose={closeCompare}
        />
      );
    }
    if (view === "C" && reservoirId) {
      return <ViewC_Reservoir reservoirId={reservoirId} onBack={() => setView("B")} />;
    }
    if (view === "B" && county) {
      return (
        <ViewB_City
          county={county}
          theme={theme}
          onBack={goHomeA}
          onAddCompare={() => {
            if (!selectedForCompare.includes(county)) {
              setSelectedForCompare([...selectedForCompare.slice(0, 4), county]);
            }
            goCompareMode();
          }}
          onDrillReservoir={goReservoir}
        />
      );
    }
    return theme === "water"
      ? <ViewA_Water onCountyClick={goCity} selectedCounty={county} metric={waterMetric} onMetricChange={setWaterMetric} />
      : <ViewA_Home  onCountyClick={goCity} selectedCounty={county} />;
  };

  // Bottom-right map fullscreen toggle (currently a noop)
  const [mapLayers, setMapLayers] = appState({
    reservoirs: true,
    wwtp: true,
    riverBasin: false,
    floodPotential: false,
    sewerage: false,
  });
  const toggleLayer = (id) => setMapLayers({ ...mapLayers, [id]: !mapLayers[id] });

  return (
    <div className="app">
      {/* TOP */}
      <TopBar
        theme={theme}
        year="2024"
        comparing={comparing}
        onCompare={() => comparing ? closeCompare() : goCompareMode()}
        breadcrumb={
          <Breadcrumb
            items={breadcrumb}
            onClick={(it) => it.action && it.action()}
          />
        }
      />

      {/* MAIN */}
      <div className="main">
        {/* MAP */}
        <div className="map-cell">
          <MapView
            metric={metric}
            theme={theme}
            mapStyle={tweaks.mapStyle}
            selectedCounty={county}
            highlightCounties={mapHighlight}
            highlightColors={mapHighlightColors}
            drillCounty={mapDrillCounty}
            onCountyClick={goCity}
            showReservoirs={showReservoirs}
            showWWTP={showWWTP}
            reservoirPoints={reservoirPointsForMap}
            reservoirMode={isViewAWater ? "rate" : "default"}
            wwtpPoints={window.KHH_WWTP}
            onReservoirClick={(p) => p?.countyCode && goCity(p.countyCode)}
          />

          {/* overlays */}
          {(view === "B" || view === "C") && county === "KHH" && (
            <MapLayers
              layers={[
                { id: "reservoirs", on: mapLayers.reservoirs, label: "水庫", color: "var(--accent)", icon: <Icons.waves size={12} /> },
                { id: "wwtp",       on: mapLayers.wwtp,       label: "汙水廠", color: "var(--accent-2)", icon: <Icons.recycle size={12} /> },
                { id: "riverBasin", on: mapLayers.riverBasin, label: "流域", color: "#94A3B8", icon: <Icons.waves size={12} /> },
                { id: "floodPotential", on: mapLayers.floodPotential, label: "淹水潛勢", color: "var(--danger)", icon: <Icons.waves size={12} /> },
                { id: "sewerage",   on: mapLayers.sewerage,   label: "下水道", color: "#64748B", icon: <Icons.recycle size={12} /> },
              ]}
              onToggle={toggleLayer}
            />
          )}

          {view === "A" && (
            <>
              {theme === "water" ? (
                <TwoSectionLayers
                  metric={waterMetric}
                  metricOptions={window.WATER_COLOR_METRICS}
                  onMetricChange={setWaterMetric}
                  pointLayers={window.POINT_LAYERS_WATER}
                  pointOn={pointOn}
                  onTogglePoint={togglePoint}
                />
              ) : (
                <MapLayers
                  title="圖層"
                  layers={[
                    { id: "L1", on: true,  label: "老化指數",     color: "var(--accent)",   icon: <Icons.users size={12} /> },
                    { id: "L2", on: false, label: "出生率",       color: "var(--accent-2)", icon: <Icons.users size={12} /> },
                    { id: "L3", on: false, label: "人口密度",     color: "#9CA3AF",         icon: <Icons.users size={12} /> },
                  ]}
                  onToggle={() => {}}
                />
              )}
              <MapLegend metric={metric} theme={theme} />
            </>
          )}

          {comparing && (
            <div className="map-overlay" style={{ left: 14, bottom: 14, padding: "12px 14px" }}>
              <div className="map-legend" style={{ position: "static", padding: 0, border: "none", background: "transparent", boxShadow: "none", backdropFilter: "none" }}>
                <div className="head">已選擇縣市</div>
                {selectedForCompare.map((code, i) => (
                  <div key={code} className="row gap-8" style={{ fontSize: 12.5, padding: "3px 0" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: CMP_COLORS[i] }}></span>
                    <span>{window.byCode[code].name}</span>
                  </div>
                ))}
                <div className="muted mt-8" style={{ fontSize: 11 }}>
                  {selectedForCompare.length < 5 ? `點地圖縣市加入（${selectedForCompare.length}/5）` : "已達上限 5 個"}
                </div>
              </div>
            </div>
          )}

          {view === "A" && (
            <div className="map-meta map-overlay">
              資料時間：2024-05-13
            </div>
          )}

          <button className="map-fullscreen map-overlay" title="全屏地圖">
            <Icons.expand size={14} />
          </button>
        </div>

        {/* DASHBOARD */}
        <div className="dashboard-pane">
          {renderDashboard()}
        </div>
      </div>

      {/* THEME SWITCHER */}
      <ThemeSwitcher theme={theme} onThemeChange={(t) => {
        setTheme(t);
        setView("A");
        setCounty(null);
        setReservoirId(null);
        setComparing(false);
      }} />

      {/* TWEAKS */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="顯示">
          <TweakToggle label="深色模式" value={tweaks.dark} onChange={(v) => setTweak({ dark: v })} />
          <TweakRadio
            label="密度"
            value={tweaks.density}
            options={[
              { value: "loose",  label: "寬鬆" },
              { value: "normal", label: "中等" },
              { value: "tight",  label: "緊湊" },
            ]}
            onChange={(v) => setTweak({ density: v })}
          />
          <TweakRadio
            label="圓角"
            value={tweaks.radius}
            options={[
              { value: "sharp",  label: "方正" },
              { value: "medium", label: "中等" },
              { value: "round",  label: "圓潤" },
            ]}
            onChange={(v) => setTweak({ radius: v })}
          />
        </TweakSection>
        <TweakSection label="地圖">
          <TweakSelect
            label="底圖樣式"
            value={tweaks.mapStyle}
            options={[
              { value: "light",     label: "淡色（預設）" },
              { value: "blank",     label: "灰階紙本" },
              { value: "satellite", label: "衛星影像" },
            ]}
            onChange={(v) => setTweak({ mapStyle: v })}
          />
        </TweakSection>
        <TweakSection label="主題色">
          <TweakColor
            label="水資源 accent"
            value={tweaks.waterAccent}
            options={[
              { value: "blue",   color: "#0EA5E9" },
              { value: "ocean",  color: "#0284C7" },
              { value: "cobalt", color: "#2563EB" },
              { value: "teal",   color: "#0D9488" },
            ]}
            onChange={(v) => setTweak({ waterAccent: v })}
          />
        </TweakSection>
        <TweakSection label="快速導航">
          <TweakButton label="← View A · 全台概覽" onClick={() => { setView("A"); setCounty(null); setComparing(false); }} />
          <TweakButton label="View B · 高雄市" onClick={() => { setCounty("KHH"); setView("B"); setComparing(false); }} />
          <TweakButton label="View C · 阿公店水庫" onClick={() => { setCounty("KHH"); setReservoirId("agp"); setView("C"); setComparing(false); }} />
          <TweakButton label="View D · 比較模式" onClick={goCompareMode} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Note: TweakSelect, TweakColor — built into tweaks-panel.jsx
// If certain controls aren't available, swap for TweakRadio.

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
