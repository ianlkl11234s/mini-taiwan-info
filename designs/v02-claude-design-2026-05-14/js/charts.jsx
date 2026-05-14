/* Chart primitives — sparkline, trend, rank bars, donut, rain bars */

const { useMemo: cuMemo, useState: cuState, useRef: cuRef, useEffect: cuEffect } = React;

function Sparkline({ data, color = "var(--accent)", height = 28, width = 80, fill = true }) {
  if (!data?.length) return null;
  const vals = data.map((d) => (typeof d === "number" ? d : d.value ?? d.rate ?? d.y));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(0.1, max - min);
  const stepX = width / Math.max(1, vals.length - 1);
  const pts = vals.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const linePath = "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const areaPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {fill && <path d={areaPath} fill={color} className="chart-area" />}
      <path d={linePath} stroke={color} className="chart-line" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

function HRankBar({ rows, max, color = "var(--accent)", highlightCode }) {
  const mx = max ?? Math.max(...rows.map((r) => r.value));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {rows.map((r, i) => {
        const hi = highlightCode && r.code === highlightCode;
        return (
          <div key={i} className="ranking-row" style={hi ? { padding: "5px 6px", background: "var(--accent-soft)", borderRadius: 6 } : {}}>
            <div className="muted tnum" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 18, height: 18, borderRadius: 5,
                background: i < 3 ? "var(--accent)" : "var(--surface-3)",
                color: i < 3 ? "white" : "var(--text-secondary)",
                fontSize: 10, fontWeight: 700,
                display: "grid", placeItems: "center"
              }}>{i + 1}</span>
              <span className="name" style={hi ? { color: "var(--accent-deep)", fontWeight: 600 } : {}}>{r.name}</span>
            </div>
            <div className="bar-wrap"><div className="bar" style={{ width: `${(r.value / mx) * 100}%`, background: color }} /></div>
            <div className="val">{fmt.num(r.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ value, total = 22, size = 110, stroke = 11, tier }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / total);
  const dash = c * pct;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#donut-grad)"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="donut-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-deep)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="donut-label">
        <div>
          <div className="big tnum">{value}<span className="muted" style={{ fontSize: 16, fontWeight: 500 }}> / {total}</span></div>
          {tier && <div className="tier">{tier}</div>}
        </div>
      </div>
    </div>
  );
}

function RainBars({ data, height = 60, color = "var(--accent-2)" }) {
  const ref = cuRef(null);
  const [w, setW] = cuState(560);
  cuEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(200, e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const max = Math.max(...data.map((d) => d.rain), 5);
  const bw = w / data.length;
  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg width={w} height={height}>
        {data.map((d, i) => {
          const h = (d.rain / max) * (height - 4);
          return (
            <rect
              key={i}
              x={i * bw + bw * 0.15}
              y={height - h}
              width={bw * 0.7}
              height={h}
              rx={1.5}
              fill={color}
              opacity={0.45 + (d.rain / max) * 0.55}
            />
          );
        })}
      </svg>
    </div>
  );
}

window.Sparkline = Sparkline;
window.HRankBar = HRankBar;
window.Donut = Donut;
window.RainBars = RainBars;

/* ============================================================
   Scatter — 兩指標 × N 點
   points: [{ x, y, label, color, code? }]
   ============================================================ */
function Scatter({
  points,
  width = 480,
  height = 220,
  xLabel = "",
  yLabel = "",
  xLog = false,
  yMin, yMax,
  xMin, xMax,
  bands,            // [{ y1, y2, color, label }] horizontal bands
  onPointClick,
}) {
  const [hover, setHover] = cuState(null);
  const pad = { t: 12, r: 16, b: 36, l: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const xs = points.map((p) => xLog ? Math.log10(Math.max(0.1, p.x)) : p.x);
  const ys = points.map((p) => p.y);
  const xMn = xMin != null ? (xLog ? Math.log10(xMin) : xMin) : Math.min(...xs);
  const xMx = xMax != null ? (xLog ? Math.log10(xMax) : xMax) : Math.max(...xs);
  const yMn = yMin != null ? yMin : Math.min(...ys);
  const yMx = yMax != null ? yMax : Math.max(...ys);
  const xRange = Math.max(0.0001, xMx - xMn);
  const yRange = Math.max(0.0001, yMx - yMn);

  const sx = (v) => pad.l + ((xLog ? Math.log10(Math.max(0.1, v)) : v) - xMn) / xRange * innerW;
  const sy = (v) => pad.t + innerH - (v - yMn) / yRange * innerH;

  // grid ticks
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMn + (i / yTicks) * yRange);
  const xTickVals = xLog
    ? [1, 10, 100, 1000, 10000, 100000].filter((v) => Math.log10(v) >= xMn - 0.2 && Math.log10(v) <= xMx + 0.2)
    : Array.from({ length: 5 }, (_, i) => xMn + (i / 4) * xRange);

  return (
    <div className="scatter-wrap" style={{ position: "relative" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* horizontal bands */}
        {bands?.map((b, i) => (
          <rect
            key={i}
            x={pad.l} width={innerW}
            y={sy(b.y2)} height={Math.max(0, sy(b.y1) - sy(b.y2))}
            fill={b.color} opacity={0.18}
          />
        ))}
        {/* grid lines */}
        {yTickVals.map((v, i) => (
          <line key={i} x1={pad.l} x2={pad.l + innerW} y1={sy(v)} y2={sy(v)}
            stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 0 ? "" : "2 4"} />
        ))}
        {/* y-axis */}
        {yTickVals.map((v, i) => (
          <text key={i} x={pad.l - 6} y={sy(v) + 3} textAnchor="end"
            fontSize="10.5" fill="var(--text-tertiary)">{Math.round(v)}</text>
        ))}
        {/* x-axis */}
        {xTickVals.map((v, i) => {
          const realV = xLog ? Math.pow(10, v) : v;
          const x = xLog ? sx(realV) : sx(v);
          if (x < pad.l - 2 || x > pad.l + innerW + 2) return null;
          return (
            <text key={i} x={x} y={pad.t + innerH + 14} textAnchor="middle"
              fontSize="10.5" fill="var(--text-tertiary)">
              {xLog ? (realV >= 1000 ? `${realV / 1000}k` : realV) : Math.round(realV)}
            </text>
          );
        })}
        {/* axis labels */}
        <text x={pad.l + innerW / 2} y={height - 4} textAnchor="middle"
          fontSize="11" fill="var(--text-secondary)" fontWeight="500">{xLabel}</text>
        <text x={10} y={pad.t + innerH / 2} textAnchor="middle"
          fontSize="11" fill="var(--text-secondary)" fontWeight="500"
          transform={`rotate(-90 10 ${pad.t + innerH / 2})`}>{yLabel}</text>

        {/* points */}
        {points.map((p, i) => {
          const cx = sx(p.x);
          const cy = sy(p.y);
          const c = p.color || "var(--accent)";
          const isHover = hover === i;
          return (
            <g key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPointClick?.(p)}
              style={{ cursor: onPointClick ? "pointer" : "default" }}
            >
              <circle cx={cx} cy={cy} r={isHover ? 6.5 : 4.5}
                fill={c} fillOpacity={isHover ? 0.95 : 0.78}
                stroke={isHover ? "white" : "rgba(255,255,255,0.7)"} strokeWidth={isHover ? 2 : 1.4} />
            </g>
          );
        })}
      </svg>
      {hover != null && points[hover] && (
        <div className="scatter-tt" style={{
          left: sx(points[hover].x), top: sy(points[hover].y),
          background: "var(--text)", color: "white",
        }}>
          <strong>{points[hover].label}</strong>
          <span>{points[hover].countyName || ""}</span>
          <span className="muted" style={{ color: "rgba(255,255,255,0.7)" }}>
            {points[hover].xLabel || xLabel}: <b style={{ color: "white" }}>{fmt.num(points[hover].x)}</b>
            {" · "}
            {points[hover].yLabel || yLabel}: <b style={{ color: "white" }}>{fmt.num(points[hover].y, 1)}%</b>
          </span>
        </div>
      )}
    </div>
  );
}

window.Scatter = Scatter;
