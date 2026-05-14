/* Trend chart — responsive multi-series line chart */

const { useRef: tcRef, useState: tcState, useEffect: tcEffect } = React;

function TrendChart({
  series,
  xLabels,
  height = 200,
  yMin, yMax,
  annotations = [],
  showLegend = true,
  showDots = true,
  showAreaFirst = true,
}) {
  const padding = { l: 40, r: 16, t: 18, b: 28 };
  const ref = tcRef(null);
  const [w, setW] = tcState(560);

  tcEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(280, e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const innerW = w - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;

  const normalized = series.map((s) => ({
    ...s,
    data: s.data.map((d, i) => ({
      x: d.x ?? d.year ?? i,
      y: d.y ?? d.value ?? d.rate ?? d.rain ?? 0,
    })),
  }));
  const allY = normalized.flatMap((s) => s.data.map((d) => d.y));
  const yMn = yMin ?? Math.min(...allY);
  const yMx = yMax ?? Math.max(...allY);
  const yRange = Math.max(0.1, yMx - yMn);
  const len = normalized[0]?.data.length ?? 0;
  const stepX = innerW / Math.max(1, len - 1);

  const ticks = 4;
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const y = padding.t + (innerH * i) / ticks;
    const v = yMx - (yRange * i) / ticks;
    return { y, v };
  });

  const xLabelStep = xLabels?.length ? Math.max(1, Math.ceil(xLabels.length / 8)) : 1;

  return (
    <div ref={ref} className="chart-wrap" style={{ width: "100%", height, position: "relative" }}>
      <svg width={w} height={height} className="chart-svg">
        <g className="chart-grid">
          {gridLines.map((g, i) => (
            <line key={i} x1={padding.l} x2={w - padding.r} y1={g.y} y2={g.y} />
          ))}
        </g>
        <g className="chart-axis">
          {gridLines.map((g, i) => (
            <text key={i} x={padding.l - 8} y={g.y + 3} textAnchor="end">
              {Math.abs(g.v) >= 1000 ? fmt.num(Math.round(g.v)) : g.v.toFixed(g.v >= 100 || g.v <= -100 ? 0 : 1)}
            </text>
          ))}
          {xLabels && (
            <g>
              {xLabels.map((lbl, i) => {
                if (i % xLabelStep !== 0 && i !== xLabels.length - 1) return null;
                const x = padding.l + i * stepX;
                return <text key={i} x={x} y={height - 8} textAnchor="middle">{lbl}</text>;
              })}
            </g>
          )}
        </g>

        {annotations.map((a, i) => {
          const x = padding.l + a.atIndex * stepX;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={padding.t} y2={padding.t + innerH} className="chart-annot" />
              <text x={x + 4} y={padding.t + 12} className="chart-annot-label">
                {a.label}
              </text>
            </g>
          );
        })}

        {normalized.map((s, sI) => {
          const pts = s.data.map((d, i) => {
            const x = padding.l + i * stepX;
            const y = padding.t + (1 - (d.y - yMn) / yRange) * innerH;
            return [x, y];
          });
          const linePath = "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
          const areaPath =
            linePath +
            ` L ${pts[pts.length - 1][0]} ${padding.t + innerH} L ${pts[0][0]} ${padding.t + innerH} Z`;
          return (
            <g key={sI}>
              {sI === 0 && showAreaFirst && s.color && (
                <path d={areaPath} fill={s.color} className="chart-area" />
              )}
              <path
                d={linePath}
                stroke={s.color}
                className="chart-line"
                strokeDasharray={s.dashed ? "4 4" : null}
                style={{ strokeWidth: s.dashed ? 1.5 : 2 }}
                fill="none"
              />
              {showDots &&
                pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={2.5} fill={s.color} className="chart-dot" />
                ))}
            </g>
          );
        })}
      </svg>

      {showLegend && series.length > 1 && (
        <div className="row gap-8" style={{ position: "absolute", top: -2, right: 0, fontSize: 11.5, color: "var(--text-secondary)" }}>
          {series.map((s, i) => (
            <span key={i} className="row gap-4" style={{ opacity: s.dashed ? 0.75 : 1 }}>
              <span style={{ width: 14, height: 2, background: s.color, borderRadius: 1 }}></span>
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

window.TrendChart = TrendChart;
