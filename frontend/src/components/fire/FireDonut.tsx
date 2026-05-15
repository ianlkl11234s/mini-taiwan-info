/**
 * FireDonut — 佔比 donut chart
 *
 * 設計來源：v03 view-a-fire.jsx::FireDonut
 */

import { fmt } from "@/lib/format";

export interface DonutSlice {
  label: string;
  value: number;
  pct: number;     // 0-100
  color: string;
}

interface FireDonutProps {
  slices: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerUnit?: string;
}

export function FireDonut({
  slices,
  size = 200,
  centerLabel = "總計",
  centerUnit = "件",
}: FireDonutProps) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="fire-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={18} />
        {slices.map((s, i) => {
          const frac = total > 0 ? s.value / total : 0;
          const len = frac * c;
          const dash = `${len} ${c - len}`;
          const offset = c - acc * c;
          acc += frac;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={18}
              strokeDasharray={dash}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">
          {centerLabel}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          fontSize="22"
          fontWeight={700}
          fill="var(--text)"
          fontFamily="var(--font-mono)"
        >
          {fmt.num(total)}
        </text>
        <text x={size / 2} y={size / 2 + 32} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">
          {centerUnit}
        </text>
      </svg>
    </div>
  );
}

interface FireDonutLegendProps {
  slices: DonutSlice[];
}

export function FireDonutLegend({ slices }: FireDonutLegendProps) {
  return (
    <div className="fire-legend">
      {slices.map((s, i) => (
        <div key={i} className="fl-row">
          <span className="fl-sw" style={{ background: s.color }} />
          <span className="fl-lbl">{s.label}</span>
          <span className="fl-pct">{s.pct.toFixed(1)}%</span>
          <span className="fl-val">{fmt.num(s.value)} 件</span>
        </div>
      ))}
    </div>
  );
}
