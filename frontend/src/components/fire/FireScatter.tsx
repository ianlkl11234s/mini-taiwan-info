/**
 * FireScatter — 散布圖（量能 vs 火災密度）
 *
 * 設計來源：v03 view-a-fire.jsx::FireScatter
 *
 * 22 個點 = 22 縣市
 * 點顏色 = 區域（北/中/南/東/離島）
 * 點大小 = 人口
 * 右下象限 = 量能落差警示區
 */

import { useEffect, useRef, useState } from "react";
import { FIRE_REGION_COLORS } from "@/lib/mock-fire";

export interface FireScatterPoint {
  code: string;          // CountyCode3
  label: string;
  x: number;             // 火災密度 /萬人
  y: number;             // 分隊密度 /萬人
  pop: number;           // 人口 (萬)
  color: string;         // region color
  region: string;
}

interface FireScatterProps {
  points: FireScatterPoint[];
  highlightCode?: string | null;
  onPointClick?: (p: FireScatterPoint) => void;
}

export function FireScatter({ points, highlightCode, onPointClick }: FireScatterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(560);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(360, e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const height = 340;
  const pad = { t: 16, r: 18, b: 42, l: 52 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const xMx = 15;
  const yMx = 14;
  const sx = (v: number) => pad.l + Math.max(0, v) / xMx * innerW;
  const sy = (v: number) => pad.t + innerH - Math.max(0, v) / yMx * innerH;
  const sr = (pop: number) => 5 + Math.sqrt(Math.max(0, pop)) * 1.3;

  // 警示象限：右下 x>5 + y<3
  const warnX1 = sx(5),
    warnX2 = sx(xMx),
    warnY1 = sy(3),
    warnY2 = sy(0);

  const xTicks = [0, 3, 5, 8, 10, 13, 15];
  const yTicks = [0, 3, 5, 8, 11, 14];

  return (
    <div ref={ref} className="fire-scatter-wrap" style={{ position: "relative" }}>
      <svg width={w} height={height}>
        {/* 警示象限 */}
        <rect
          x={warnX1}
          y={warnY2}
          width={warnX2 - warnX1}
          height={warnY1 - warnY2}
          fill="var(--accent-fire, #DC2626)"
          opacity={0.07}
        />
        <rect
          x={warnX1}
          y={warnY2}
          width={warnX2 - warnX1}
          height={warnY1 - warnY2}
          fill="none"
          stroke="var(--accent-fire, #DC2626)"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.5}
        />
        <text
          x={warnX2 - 10}
          y={warnY1 - 10}
          textAnchor="end"
          fontSize="10.5"
          fontWeight={700}
          fill="var(--accent-fire, #DC2626)"
          opacity={0.85}
        >
          ★ 量能落差警示區
        </text>

        {/* grid */}
        {yTicks.map((v) => (
          <line
            key={`y${v}`}
            x1={pad.l}
            x2={pad.l + innerW}
            y1={sy(v)}
            y2={sy(v)}
            stroke="var(--border)"
            strokeDasharray={v === 0 ? undefined : "2 4"}
          />
        ))}
        {yTicks.map((v) => (
          <text
            key={`yl${v}`}
            x={pad.l - 8}
            y={sy(v) + 3}
            textAnchor="end"
            fontSize="10.5"
            fill="var(--text-tertiary)"
          >
            {v}
          </text>
        ))}
        {xTicks.map((v) => (
          <line
            key={`x${v}`}
            x1={sx(v)}
            x2={sx(v)}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke="var(--border)"
            strokeDasharray="2 4"
            opacity={0.4}
          />
        ))}
        {xTicks.map((v) => (
          <text
            key={`xl${v}`}
            x={sx(v)}
            y={pad.t + innerH + 16}
            textAnchor="middle"
            fontSize="10.5"
            fill="var(--text-tertiary)"
          >
            {v}
          </text>
        ))}
        {/* axis labels */}
        <text
          x={pad.l + innerW / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight={600}
          fill="var(--text-secondary)"
        >
          火災密度 (件/萬人) →
        </text>
        <text
          x={14}
          y={pad.t + innerH / 2}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight={600}
          fill="var(--text-secondary)"
          transform={`rotate(-90 14 ${pad.t + innerH / 2})`}
        >
          ← 分隊密度 (隊/萬人)
        </text>

        {/* points */}
        {points.map((p, i) => {
          const cx = sx(p.x);
          const cy = sy(p.y);
          const radius = sr(p.pop);
          const isHover = hover === i;
          const isSelected = highlightCode === p.code;
          return (
            <g
              key={p.code}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPointClick?.(p)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHover ? radius + 2 : radius}
                fill={p.color}
                fillOpacity={isHover || isSelected ? 0.92 : 0.65}
                stroke={isSelected ? "var(--text)" : "white"}
                strokeWidth={isSelected ? 2.2 : 1.4}
              />
              {(p.pop > 100 || isHover || isSelected) && (
                <text
                  x={cx + radius + 4}
                  y={cy + 3}
                  fontSize="10.5"
                  fontWeight={isSelected ? 700 : 500}
                  fill={isSelected ? "var(--text)" : "var(--text-secondary)"}
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover != null && points[hover] && (
        <div
          className="fire-scatter-tt"
          style={{ left: sx(points[hover].x), top: sy(points[hover].y) - 12 }}
        >
          <strong>{points[hover].label}</strong>
          <span className="muted">人口 {points[hover].pop.toFixed(1)} 萬</span>
          <span>
            火災密度 <b>{points[hover].x.toFixed(1)}</b> /萬人
          </span>
          <span>
            分隊密度 <b>{points[hover].y.toFixed(1)}</b> /萬人
          </span>
        </div>
      )}

      <div className="fire-scatter-foot">
        <span>● 點大小 = 人口</span>
        <span>● 點顏色 = 區域</span>
        <span style={{ marginLeft: "auto" }}>22 縣市</span>
      </div>
    </div>
  );
}

export function FireScatterLegend() {
  return (
    <div className="fire-scatter-legend">
      {Object.entries(FIRE_REGION_COLORS).map(([k, c]) => (
        <span key={k}>
          <i style={{ background: c }} />
          {k === "north" ? "北" : k === "central" ? "中" : k === "south" ? "南" : k === "east" ? "東" : "離島"}
        </span>
      ))}
    </div>
  );
}
