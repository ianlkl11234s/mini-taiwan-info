/* KPI Card + ExplodedView (signature interaction) */

const { useState: kpState, useMemo: kpMemo } = React;

function KPICard({
  id,
  icon,
  label,
  value,
  unit,
  trend,                 // { delta, direction, baseline, sentiment }
  spark,                 // [{value}, ...] (optional)
  expanded,
  onExpand,
  explodeContent,        // ReactNode shown when expanded
  big = false,
}) {
  const TrendIco = trend?.direction === "up" ? Icons.arrowUp :
                   trend?.direction === "down" ? Icons.arrowDown :
                   Icons.flat;
  return (
    <div
      className={`kpi-card has-bg ${expanded ? "expanded" : ""}`}
      onClick={!expanded ? onExpand : undefined}
    >
      <div className="kpi-head">
        <div className="kpi-label">
          <span className="ico">{icon}</span>
          {label}
        </div>
        <button
          className="kpi-expand"
          onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
          title={expanded ? "收起" : "展開"}
        >
          {expanded ? <Icons.x size={14} /> : <Icons.expand size={12} />}
        </button>
      </div>

      <div className="kpi-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>

      {trend && !expanded && (
        <div className="kpi-trend">
          <span className={`delta ${trend.direction} sentiment-${trend.sentiment || "neutral"}`}>
            <TrendIco size={10} />
            {trend.delta}
          </span>
          <span className="muted">{trend.baseline}</span>
        </div>
      )}

      {spark && !expanded && !big && (
        <div className="kpi-sparkline">
          <Sparkline data={spark} color="var(--accent)" width={80} height={24} />
        </div>
      )}

      {expanded && explodeContent && (
        <div className="exploded" style={{ marginTop: 14 }}>
          {explodeContent}
        </div>
      )}
    </div>
  );
}

/* ----- Dimension Explode: ranked bars ----- */
function DimensionExplode({ items, leftMax = 10, criticalBelow, criticalLabel, unit }) {
  // items: [{ name, value, code? }]
  const max = Math.max(...items.map((i) => i.value));
  const half = Math.ceil(items.length / 2);
  const col1 = items.slice(0, half);
  const col2 = items.slice(half);
  return (
    <div className="exploded-bars">
      {[col1, col2].map((col, ci) => (
        <div key={ci} style={{ display: "grid", gap: 6 }}>
          {col.map((it, i) => {
            const rank = ci * half + i + 1;
            const crit = criticalBelow != null && it.value < criticalBelow;
            return (
              <div key={i} className={`exp-row ${crit ? "crit" : ""}`}>
                <span className="rank">{rank}</span>
                <span className="nm">{it.name}</span>
                <div className="b"><div style={{ width: `${(it.value / max) * 100}%` }} /></div>
                <span className="v">{fmt.num(it.value, it.value < 100 ? 1 : 0)}{unit && <span className="muted" style={{ fontWeight: 400 }}> {unit}</span>}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ----- Time Explode: trend line ----- */
function TimeExplode({ data, xLabels, unit, annotations, yMin, yMax }) {
  return (
    <div>
      <TrendChart
        series={[{ name: "value", color: "var(--accent)", data }]}
        xLabels={xLabels}
        height={170}
        yMin={yMin}
        yMax={yMax}
        annotations={annotations}
        showLegend={false}
      />
    </div>
  );
}

/* ----- Geo Explode: mini bar ranking by region ----- */
function GeoExplode({ items, unit }) {
  return <DimensionExplode items={items} unit={unit} />;
}

window.KPICard = KPICard;
window.DimensionExplode = DimensionExplode;
window.TimeExplode = TimeExplode;
window.GeoExplode = GeoExplode;
