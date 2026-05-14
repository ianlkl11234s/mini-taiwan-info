/* TopBar, Breadcrumb, ThemeSwitcher, MapOverlays */

const { useState: chState } = React;

function TopBar({ view, theme, year, onYearChange, onThemeChange, onCompare, comparing, onBack, breadcrumb }) {
  const themeName = window.THEMES.find((t) => t.id === theme)?.name || "";

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          {theme === "water" ? <Icons.drop size={18} color="#fff" /> : <Icons.home size={18} color="#fff" />}
        </div>
        <div>
          <div className="brand-name">Mini <span className="light">Taiwan Info</span></div>
        </div>
      </div>

      <div className="tb-divider"></div>

      {breadcrumb || (
        <>
          <button className="tb-select">
            <span className="ico">{theme === "water" ? <Icons.drop size={14} /> : <Icons.home size={14} />}</span>
            <span>{themeName}</span>
            <Icons.chev color="currentColor" size={12} />
          </button>
          <button className="tb-select">
            <span>{year}</span>
            <Icons.chev size={12} />
          </button>
        </>
      )}

      <div className="tb-divider"></div>

      <div className="tb-search">
        <Icons.search size={14} />
        <input placeholder="搜尋縣市、指標或關鍵字…" />
        <span className="muted" style={{ fontSize: 11, padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 4 }}>⌘ K</span>
      </div>

      <div className="tb-spacer"></div>

      <button className={`tb-compare-btn ${comparing ? "active" : ""}`} onClick={onCompare}>
        <Icons.scale size={14} />
        比較模式
      </button>

      <button className="tb-icon-btn" title="說明"><Icons.info size={16} /></button>
      <button className="tb-icon-btn" title="設定"><Icons.settings size={16} /></button>
    </div>
  );
}

function Breadcrumb({ items, onClick }) {
  return (
    <div className="crumb">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">›</span>}
            {last ? (
              <span className="current">{it.label}</span>
            ) : (
              <button onClick={() => onClick?.(it)}>{it.label}</button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ThemeSwitcher({ theme, onThemeChange }) {
  return (
    <div className="theme-switcher">
      {window.THEMES.map((t) => {
        const active = theme === t.id;
        const IconC = Icons[t.icon] || Icons.home;
        return (
          <button
            key={t.id}
            className={`theme-pill ${active ? "active" : ""} ${t.disabled ? "is-disabled" : ""}`}
            onClick={() => !t.disabled && onThemeChange(t.id)}
            disabled={t.disabled}
            style={{ "--theme-color": t.accent, cursor: t.disabled ? "not-allowed" : "pointer" }}
            aria-label={t.disabled ? `${t.name}（Phase 2+ 主題，尚未開放）` : t.name}
          >
            <span className="ico"><IconC size={14} /></span>
            <span>{t.name}</span>
            {t.disabled && <span className="phase-badge">P2+</span>}
          </button>
        );
      })}

      <div className="theme-switcher-spacer"></div>
      <div className="footer-links">
        <a href="#">資料來源</a>
        <a href="#">授權 CC BY 4.0</a>
        <a href="#">About</a>
        <a href="#">GitHub ↗</a>
      </div>
    </div>
  );
}

function MapLayers({ layers, onToggle, title = "圖層" }) {
  return (
    <div className="map-overlay map-layers">
      <h4>{title}</h4>
      {layers.map((L) => (
        <label key={L.id} className="layer-row">
          <input type="checkbox" checked={L.on} onChange={() => onToggle(L.id)} />
          <span className="ico" style={{ color: L.color }}>{L.icon}</span>
          <span>{L.label}</span>
        </label>
      ))}
    </div>
  );
}

/* 兩段式圖層：著色指標 (radio) + 點位圖層 (checkbox + 點數) */
function TwoSectionLayers({ metric, metricOptions, onMetricChange, pointLayers, pointOn, onTogglePoint }) {
  return (
    <div className="map-overlay map-layers two-section">
      <div className="ml-section">
        <h4>著色指標</h4>
        <div className="ml-rows">
          {metricOptions.map((m) => (
            <label key={m.id} className="layer-row radio">
              <input
                type="radio"
                name="color-metric"
                checked={metric === m.id}
                onChange={() => onMetricChange(m.id)}
              />
              <span className="lbl">{m.label}</span>
              <span className="unit">{m.unit}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="ml-divider"></div>
      <div className="ml-section">
        <h4>點位圖層</h4>
        <div className="ml-rows">
          {pointLayers.map((L) => (
            <label key={L.id} className="layer-row">
              <input
                type="checkbox"
                checked={!!pointOn[L.id]}
                onChange={() => onTogglePoint(L.id)}
              />
              <span className={`pt-glyph shape-${L.shape}`} style={{ background: L.color, borderColor: L.color }}></span>
              <span className="lbl">{L.label}</span>
              <span className="count">{fmt.num(L.count)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapLegend({ metric, theme }) {
  const cfg = window.METRIC_CONFIG[metric];
  if (!cfg) return null;
  const ramp = window.RAMPS[cfg.ramp];
  const ticks = 5;
  return (
    <div className="map-overlay map-legend">
      <div className="head">{cfg.label} ({cfg.unit})</div>
      <div className="ramp">
        {ramp.map((c, i) => <div key={i} style={{ background: c }}></div>)}
      </div>
      <div className="ticks">
        {Array.from({ length: ticks }, (_, i) => {
          const v = cfg.min + ((cfg.max - cfg.min) * i) / (ticks - 1);
          return <span key={i}>{Math.round(v)}</span>;
        })}
      </div>
    </div>
  );
}

function MapControls({ onZoomIn, onZoomOut, onHome }) {
  return (
    <div className="map-overlay map-controls">
      <button onClick={onZoomIn}><Icons.plus size={16} /></button>
      <button onClick={onZoomOut}><Icons.minus size={16} /></button>
      <button onClick={onHome}><Icons.locate size={16} /></button>
    </div>
  );
}

function DataSourceBadge({ sources = [], updatedAt = "2026-05-13", csvLabel = "下載 CSV" }) {
  return (
    <div className="source-badge">
      <span className="field">
        <span className="ico"><Icons.database size={13} /></span>
        資料來源 <b>{sources.length ? sources.join("、") : "8 個資料集"}</b>
      </span>
      <span className="field">
        <span className="ico"><Icons.clock size={13} /></span>
        更新 <b>{updatedAt}</b>
      </span>
      <span className="spacer"></span>
      <a href="#"><Icons.download size={13} /> {csvLabel}</a>
      <a href="#"><Icons.info size={13} /> 資料說明</a>
    </div>
  );
}

window.TopBar = TopBar;
window.Breadcrumb = Breadcrumb;
window.ThemeSwitcher = ThemeSwitcher;
window.MapLayers = MapLayers;
window.TwoSectionLayers = TwoSectionLayers;
window.MapLegend = MapLegend;
window.MapControls = MapControls;
window.DataSourceBadge = DataSourceBadge;
