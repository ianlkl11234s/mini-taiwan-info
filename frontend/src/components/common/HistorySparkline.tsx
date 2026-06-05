/**
 * HistorySparkline — 極簡 SVG sparkline（單線 / 雙線）
 *
 * 用法：
 *   <HistorySparkline data={agingHistory} dataKey="value" color="#B91C1C" highlightYear={2025} />
 *   <HistorySparkline data={birthDeathHistory} dataKey={["birth", "death"]} color={["#047857", "#B91C1C"]} />
 *
 * 設計：
 *   - 純 SVG，無外部 chart lib
 *   - 顯示 first/last/peak/trough year label + 最後一點 emphasised
 *   - 可選 county 參考線（在某年度標記）
 */
import { useMemo } from "react";

interface CommonProps {
  /** SVG viewport 高度（寬度自適應父容器） */
  height?: number;
  /** 圖表內邊距 */
  padding?: { top: number; right: number; bottom: number; left: number };
  /** 標題 / 描述 */
  title?: string;
  caption?: string;
}

// ── 單線 ─────────────────────────────────────────
export interface SingleSparklineProps extends CommonProps {
  data: Array<{ year: number; value: number }>;
  color?: string;
  /** 縣市 reference line：標記在指定 year（垂直虛線 + 圓點） */
  highlightYear?: number;
  highlightLabel?: string;
  /** 縣市 reference value：標記水平虛線 */
  refValue?: number;
  refLabel?: string;
  unit?: string;
}

export function HistorySparkline({
  data,
  color = "#B91C1C",
  height = 120,
  padding = { top: 14, right: 36, bottom: 22, left: 36 },
  title,
  caption,
  highlightYear,
  highlightLabel,
  refValue,
  refLabel,
  unit = "",
}: SingleSparklineProps) {
  const { pathD, points, minY, maxY, viewW, viewH } = useMemo(() => {
    const W = 720;  // viewBox 寬（SVG 自動 scale 到父寬）
    const H = height;
    const innerW = W - padding.left - padding.right;
    const innerH = H - padding.top - padding.bottom;
    if (data.length === 0) {
      return { pathD: "", points: [], minY: 0, maxY: 0, viewW: W, viewH: H };
    }
    const xs = data.map((d) => d.year);
    const ys = data.map((d) => d.value);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const padY = (maxY - minY) * 0.08 || 1;
    const yLo = minY - padY, yHi = maxY + padY;
    const xScale = (x: number) => padding.left + ((x - minX) / Math.max(1, maxX - minX)) * innerW;
    const yScale = (y: number) => padding.top + (1 - (y - yLo) / Math.max(1, yHi - yLo)) * innerH;
    const pts = data.map((d) => ({ x: xScale(d.year), y: yScale(d.value), year: d.year, value: d.value }));
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    return { pathD, points: pts, minY, maxY, viewW: W, viewH: H };
  }, [data, height, padding]);

  if (data.length === 0) return null;

  const last = points[points.length - 1];
  const first = points[0];
  const peakIdx = data.reduce((m, d, i, a) => d.value > a[m].value ? i : m, 0);
  const peak = points[peakIdx];

  // refLine y position
  const refY = refValue != null ? (() => {
    const padY = (maxY - minY) * 0.08 || 1;
    const yLo = minY - padY, yHi = maxY + padY;
    return padding.top + (1 - (refValue - yLo) / Math.max(1, yHi - yLo)) * (viewH - padding.top - padding.bottom);
  })() : null;

  // highlightYear 對應點
  const hi = highlightYear != null ? points.find((p) => p.year === highlightYear) : null;

  return (
    <div className="hsp-wrap" style={{ width: "100%" }}>
      {title && <div className="hsp-title" style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{title}</div>}
      <svg viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {/* baseline grid */}
        <line x1={padding.left} x2={viewW - padding.right} y1={viewH - padding.bottom} y2={viewH - padding.bottom}
              stroke="var(--border)" strokeWidth={1} />
        {/* refLine */}
        {refY != null && (
          <>
            <line x1={padding.left} x2={viewW - padding.right} y1={refY} y2={refY}
                  stroke="#9CA3AF" strokeDasharray="3 3" strokeWidth={1} />
            {refLabel && (
              <text x={viewW - padding.right + 2} y={refY + 3} fontSize={9.5} fill="#6B7280">{refLabel}</text>
            )}
          </>
        )}
        {/* main line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        {/* last point dot */}
        <circle cx={last.x} cy={last.y} r={3} fill={color} />
        {/* highlight year dot + label */}
        {hi && (
          <>
            <line x1={hi.x} x2={hi.x} y1={padding.top} y2={viewH - padding.bottom} stroke={color} strokeDasharray="2 3" strokeWidth={0.8} opacity={0.45} />
            <circle cx={hi.x} cy={hi.y} r={2.5} fill="#fff" stroke={color} strokeWidth={1.4} />
            {highlightLabel && (
              <text x={hi.x} y={hi.y - 6} fontSize={9.5} fill={color} textAnchor="middle">{highlightLabel}</text>
            )}
          </>
        )}
        {/* x-axis: first/last year */}
        <text x={first.x} y={viewH - 6} fontSize={9.5} fill="var(--text-tertiary)" textAnchor="middle">{first.year}</text>
        <text x={last.x}  y={viewH - 6} fontSize={9.5} fill="var(--text-tertiary)" textAnchor="middle">{last.year}</text>
        {peakIdx > 0 && peakIdx < points.length - 1 && (
          <text x={peak.x} y={peak.y - 5} fontSize={9.5} fill={color} textAnchor="middle">{peak.year}</text>
        )}
        {/* y-axis: min/max */}
        <text x={padding.left - 4} y={padding.top + 4}              fontSize={9.5} fill="var(--text-tertiary)" textAnchor="end">{maxY.toFixed(maxY >= 100 ? 0 : 1)}{unit}</text>
        <text x={padding.left - 4} y={viewH - padding.bottom - 1}   fontSize={9.5} fill="var(--text-tertiary)" textAnchor="end">{minY.toFixed(minY >= 100 ? 0 : 1)}{unit}</text>
        {/* last value */}
        <text x={last.x + 4} y={last.y + 3} fontSize={10} fill={color} fontWeight={600}>
          {last.value.toFixed(last.value >= 100 ? 1 : 2)}{unit}
        </text>
      </svg>
      {caption && <div className="hsp-caption" style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 4 }}>{caption}</div>}
    </div>
  );
}

// ── 雙線 ─────────────────────────────────────────
export interface DualSparklineProps extends CommonProps {
  data: Array<{ year: number; birth: number; death: number }>;
  /** [birth color, death color] */
  colors?: [string, string];
  unit?: string;
}

export function DualHistorySparkline({
  data,
  colors = ["#047857", "#B91C1C"],
  height = 140,
  padding = { top: 16, right: 36, bottom: 24, left: 38 },
  title,
  caption,
  unit = "‰",
}: DualSparklineProps) {
  const computed = useMemo(() => {
    const W = 720, H = height;
    const innerW = W - padding.left - padding.right;
    const innerH = H - padding.top - padding.bottom;
    if (data.length === 0) return null;
    const xs = data.map((d) => d.year);
    const ys = data.flatMap((d) => [d.birth, d.death]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const padY = (maxY - minY) * 0.08 || 1;
    const yLo = minY - padY, yHi = maxY + padY;
    const xScale = (x: number) => padding.left + ((x - minX) / Math.max(1, maxX - minX)) * innerW;
    const yScale = (y: number) => padding.top + (1 - (y - yLo) / Math.max(1, yHi - yLo)) * innerH;
    const birthPts = data.map((d) => ({ x: xScale(d.year), y: yScale(d.birth), year: d.year, value: d.birth }));
    const deathPts = data.map((d) => ({ x: xScale(d.year), y: yScale(d.death), year: d.year, value: d.death }));
    const birthD = birthPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const deathD = deathPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    // crossover detection (出生率第一次低於死亡率的年份)
    let crossYear: number | null = null;
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1], cur = data[i];
      if (prev.birth >= prev.death && cur.birth < cur.death) {
        crossYear = cur.year;
        break;
      }
    }
    const cross = crossYear != null
      ? { x: xScale(crossYear), y: yScale((data.find((d) => d.year === crossYear)!.birth + data.find((d) => d.year === crossYear)!.death) / 2), year: crossYear }
      : null;
    return { birthPts, deathPts, birthD, deathD, minY, maxY, minX, maxX, viewW: W, viewH: H, cross };
  }, [data, height, padding]);

  if (!computed) return null;

  const { birthPts, deathPts, birthD, deathD, minY, maxY, viewW, viewH, cross } = computed;
  const lastBirth = birthPts[birthPts.length - 1];
  const lastDeath = deathPts[deathPts.length - 1];
  const firstBirth = birthPts[0];

  return (
    <div className="hsp-wrap" style={{ width: "100%" }}>
      {title && <div className="hsp-title" style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{title}</div>}
      <svg viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {/* baseline */}
        <line x1={padding.left} x2={viewW - padding.right} y1={viewH - padding.bottom} y2={viewH - padding.bottom}
              stroke="var(--border)" strokeWidth={1} />
        {/* crossover marker */}
        {cross && (
          <>
            <line x1={cross.x} x2={cross.x} y1={padding.top} y2={viewH - padding.bottom}
                  stroke="#7C3AED" strokeDasharray="3 3" strokeWidth={0.9} opacity={0.65} />
            <text x={cross.x} y={padding.top - 2} fontSize={9.5} fill="#7C3AED" textAnchor="middle">死亡交叉 {cross.year}</text>
          </>
        )}
        {/* birth line */}
        <path d={birthD} fill="none" stroke={colors[0]} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastBirth.x} cy={lastBirth.y} r={3} fill={colors[0]} />
        {/* death line */}
        <path d={deathD} fill="none" stroke={colors[1]} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastDeath.x} cy={lastDeath.y} r={3} fill={colors[1]} />
        {/* x-axis years */}
        <text x={firstBirth.x} y={viewH - 6} fontSize={9.5} fill="var(--text-tertiary)" textAnchor="middle">{firstBirth.year}</text>
        <text x={lastBirth.x}  y={viewH - 6} fontSize={9.5} fill="var(--text-tertiary)" textAnchor="middle">{lastBirth.year}</text>
        {/* y-axis min/max */}
        <text x={padding.left - 4} y={padding.top + 4}            fontSize={9.5} fill="var(--text-tertiary)" textAnchor="end">{maxY.toFixed(1)}{unit}</text>
        <text x={padding.left - 4} y={viewH - padding.bottom - 1} fontSize={9.5} fill="var(--text-tertiary)" textAnchor="end">{minY.toFixed(1)}{unit}</text>
        {/* last-point labels */}
        <text x={lastBirth.x + 4} y={lastBirth.y + 3} fontSize={10} fill={colors[0]} fontWeight={600}>生 {lastBirth.value.toFixed(2)}</text>
        <text x={lastDeath.x + 4} y={lastDeath.y + 3} fontSize={10} fill={colors[1]} fontWeight={600}>亡 {lastDeath.value.toFixed(2)}</text>
        {/* legend top-left */}
        <g transform={`translate(${padding.left + 4}, ${padding.top - 4})`}>
          <circle cx={3} cy={0} r={3} fill={colors[0]} />
          <text x={10} y={3} fontSize={9.5} fill={colors[0]}>出生</text>
          <circle cx={42} cy={0} r={3} fill={colors[1]} />
          <text x={49} y={3} fontSize={9.5} fill={colors[1]}>死亡</text>
        </g>
      </svg>
      {caption && <div className="hsp-caption" style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 4 }}>{caption}</div>}
    </div>
  );
}
