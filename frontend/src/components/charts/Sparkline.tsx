/**
 * Sparkline — 小型趨勢線（KPI 卡 / 列表用）
 */

interface Props {
  data: number[] | Array<{ value?: number; rate?: number; y?: number }>;
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
}

export function Sparkline({ data, color = "var(--accent)", height = 28, width = 80, fill = true }: Props) {
  if (!data || data.length === 0) return null;
  const vals = data.map((d) =>
    typeof d === "number" ? d : d.value ?? d.rate ?? d.y ?? 0
  );
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(0.1, max - min);
  const stepX = width / Math.max(1, vals.length - 1);
  const pts = vals.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as [number, number];
  });
  const linePath = "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const areaPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {fill && <path d={areaPath} fill={color} className="chart-area" />}
      <path d={linePath} stroke={color} className="chart-line" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}
