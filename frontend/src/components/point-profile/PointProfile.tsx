/**
 * PointProfile — 點位概況面板（View A 補強）
 * 移植自 prototype point-profile.jsx
 *
 * 三模式：
 *   - bucket: 蓄水率分布桶（充足 ≥60 / 警示 30-60 / 紅線 <30）
 *   - region: 按 4-5 地理區（北/中/南/東/離島）聚合
 *   - scatter: 容量 × 蓄水率（log x-axis + 三色帶）
 *
 * 資料來源：useWaterKpis().reservoirs（real Supabase）
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReservoirStatusRow } from "@/lib/queries/water";
import { normalizeReservoirRegion } from "@/lib/queries/water";

const REGION_ORDER: Array<"north" | "central" | "south" | "east" | "island"> = [
  "north",
  "central",
  "south",
  "east",
  "island",
];
const REGION_LABEL: Record<string, string> = {
  north: "北部",
  central: "中部",
  south: "南部",
  east: "東部",
  island: "離島",
};

const BUCKETS = [
  { id: "ok",   label: "充足", sub: "≥ 60%",    color: "#10B981", min: 60,  max: 9999 },
  { id: "warn", label: "警示", sub: "30 – 60%", color: "#F59E0B", min: 30,  max: 60 },
  { id: "crit", label: "紅線", sub: "< 30%",    color: "#EF4444", min: -1,  max: 30 },
] as const;

interface Props {
  reservoirs: ReservoirStatusRow[];
  onReservoirClick?: (r: ReservoirStatusRow) => void;
}

export function PointProfile({ reservoirs, onReservoirClick }: Props) {
  const [mode, setMode] = useState<"bucket" | "region" | "scatter">("bucket");
  const [activeBucket, setActiveBucket] = useState<string | null>(null);

  const valid = reservoirs.filter((r) => r.storage_ratio_pct != null);
  const total = valid.length;
  // W-4 口徑：reservoirs = 主要水庫總數（KPI「主要水庫」同源，如 37 座）；
  // valid = 目前有即時蓄水率資料者（如 34 座，差額為當期無水情快照的水庫）。
  // 分布/地理區/散布圖僅能呈現有水情者 → 明確標清兩數差異，避免被當成 SSOT 打架。
  const allCount = reservoirs.length;
  const missingData = allCount - total;

  // 桶分配
  const counted = BUCKETS.map((b) => ({
    ...b,
    list: valid.filter((r) => {
      const v = r.storage_ratio_pct!;
      return v >= b.min && v < b.max;
    }),
  }));
  const bucketMax = Math.max(...counted.map((b) => b.list.length), 1);

  // 地區聚合
  const byRegion = REGION_ORDER.map((rg) => {
    const list = valid.filter((r) => normalizeReservoirRegion(r.region) === rg);
    if (!list.length) return null;
    const avg = list.reduce((s, r) => s + (r.storage_ratio_pct ?? 0), 0) / list.length;
    return { id: rg, label: REGION_LABEL[rg], count: list.length, avg, list };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="section point-profile">
      <div
        className="section-head"
        style={{ flexWrap: "wrap", rowGap: 10, alignItems: "flex-start" }}
      >
        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
          <div className="section-title">
            <span className="pre">POINTS</span>
            點位概況 · {total} 座
            <span
              style={{
                marginLeft: 6,
                fontSize: 9,
                fontWeight: 700,
                color: "var(--positive)",
                background: "var(--positive-soft)",
                padding: "1px 4px",
                borderRadius: 3,
                verticalAlign: "middle",
              }}
            >
              LIVE
            </span>
          </div>
          <div className="section-subtitle" style={{ marginTop: 2 }}>
            把縣市彙整看不到的個別狀態攤開
            {missingData > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--text-tertiary)" }}>
                  共 {allCount} 座主要水庫，{total} 座有即時水情（{missingData} 座當期無水情快照）
                </span>
              </>
            )}
          </div>
        </div>
        <div
          className="toggle-group"
          style={{ flexShrink: 0, fontSize: 11 }}
        >
          <button
            className={mode === "bucket" ? "active" : ""}
            onClick={() => setMode("bucket")}
            style={tinyToggleStyle}
          >
            分布
          </button>
          <button
            className={mode === "region" ? "active" : ""}
            onClick={() => setMode("region")}
            style={tinyToggleStyle}
          >
            地理區
          </button>
          <button
            className={mode === "scatter" ? "active" : ""}
            onClick={() => setMode("scatter")}
            style={tinyToggleStyle}
          >
            容量×率
          </button>
        </div>
      </div>

      {mode === "bucket" && (
        <div className="pp-bucket">
          <div className="pp-bucket-rows">
            {counted.map((b) => {
              const pct = (b.list.length / bucketMax) * 100;
              const isActive = activeBucket === b.id;
              const ChevIcon = isActive ? ChevronUp : ChevronDown;
              return (
                <button
                  key={b.id}
                  className={`pp-bucket-row ${isActive ? "active" : ""}`}
                  onClick={() => setActiveBucket(isActive ? null : b.id)}
                  aria-expanded={isActive}
                >
                  <span className="dot" style={{ background: b.color }} />
                  <span className="lbl">
                    {b.label} <span className="sub">{b.sub}</span>
                  </span>
                  <span className="bar-wrap">
                    <span className="bar" style={{ width: `${pct}%`, background: b.color }} />
                  </span>
                  <span className="cnt">
                    <b>{b.list.length}</b> 座
                  </span>
                  <span className="chev">
                    <ChevIcon size={11} />
                  </span>
                </button>
              );
            })}
          </div>
          {activeBucket && (
            <div className="pp-list-grid">
              {counted
                .find((b) => b.id === activeBucket)!
                .list.map((r) => {
                  const v = r.storage_ratio_pct ?? 0;
                  const color = v < 30 ? "#EF4444" : v < 60 ? "#F59E0B" : "#10B981";
                  return (
                    <button
                      key={r.reservoir_id}
                      className="pp-chip"
                      style={{ borderColor: color }}
                      onClick={() => onReservoirClick?.(r)}
                    >
                      <span className="nm">{r.name}</span>
                      <span className="meta">
                        {r.region ?? ""} · {v.toFixed(1)}%
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
          {!activeBucket && (
            <div className="muted pp-hint">⤴ 點任一桶 → 列出哪幾座水庫</div>
          )}
        </div>
      )}

      {mode === "region" && (
        <div className="pp-region">
          {byRegion.map((g) => {
            const tone = g.avg < 40 ? "crit" : g.avg < 60 ? "warn" : "ok";
            return (
              <div key={g.id} className={`pp-region-row tone-${tone}`}>
                <div className="rg-lbl">{g.label}</div>
                <div className="rg-cnt">{g.count} 座</div>
                <div className="rg-bar-wrap">
                  <div className="rg-bar" style={{ width: `${(g.avg / 100) * 100}%` }} />
                </div>
                <div className="rg-avg">
                  平均 <b>{g.avg.toFixed(1)}%</b>
                </div>
              </div>
            );
          })}
          <div className="muted pp-hint">{computeRegionHint(byRegion)}</div>
        </div>
      )}

      {mode === "scatter" && <ScatterMode reservoirs={valid} onClick={onReservoirClick} />}
    </div>
  );
}

const tinyToggleStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 11,
};

function computeRegionHint(byRegion: Array<{ label: string; count: number; avg: number }>): string {
  if (byRegion.length < 2) return "";
  const sorted = [...byRegion].sort((a, b) => a.avg - b.avg);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  return `${lowest.label} ${lowest.count} 座、平均蓄水率 ${lowest.avg.toFixed(0)}% → 與 ${highest.label} ${highest.avg.toFixed(0)}% 對比明顯`;
}

// ─────────────────────────────────────────────────
// Scatter mode — 簡化版 SVG（容量 log + 蓄水率 linear，三色帶背景）
// ─────────────────────────────────────────────────

function ScatterMode({
  reservoirs,
  onClick,
}: {
  reservoirs: ReservoirStatusRow[];
  onClick?: (r: ReservoirStatusRow) => void;
}) {
  const W = 620;
  const H = 240;
  const padL = 40;
  const padR = 16;
  const padT = 12;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const pts = reservoirs.filter(
    (r) =>
      r.effective_capacity_wan != null &&
      Number(r.effective_capacity_wan) > 0 &&
      r.storage_ratio_pct != null
  );

  if (pts.length === 0) {
    return (
      <div className="pp-scatter">
        <div className="muted" style={{ padding: 20, textAlign: "center" }}>
          無有效資料
        </div>
      </div>
    );
  }

  // x-axis: log scale, capacity in 萬 m³
  const xMin = 10;
  const xMax = 60000;
  const logXMin = Math.log10(xMin);
  const logXMax = Math.log10(xMax);
  const xScale = (v: number) => {
    const clamped = Math.max(xMin, Math.min(xMax, v));
    return padL + ((Math.log10(clamped) - logXMin) / (logXMax - logXMin)) * innerW;
  };

  // y-axis: linear 0-100
  const yScale = (v: number) => padT + (1 - v / 100) * innerH;

  // 背景三色帶 (y 軸)
  const bands = [
    { y1: 60, y2: 100, color: "rgba(16,185,129,0.10)" },
    { y1: 30, y2: 60, color: "rgba(245,158,11,0.10)" },
    { y1: 0, y2: 30, color: "rgba(239,68,68,0.10)" },
  ];

  const xTicks = [10, 100, 1000, 10000];
  const yTicks = [0, 30, 60, 100];

  return (
    <div className="pp-scatter">
      <svg width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
        {/* bands */}
        {bands.map((b, i) => (
          <rect
            key={i}
            x={padL}
            y={yScale(b.y2)}
            width={innerW}
            height={yScale(b.y1) - yScale(b.y2)}
            fill={b.color}
          />
        ))}
        {/* y grid */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={padL}
              x2={padL + innerW}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text x={padL - 6} y={yScale(t) + 3} fontSize={10} fill="var(--text-tertiary)" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {/* x ticks */}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <text
              x={xScale(t)}
              y={padT + innerH + 14}
              fontSize={10}
              fill="var(--text-tertiary)"
              textAnchor="middle"
            >
              {t.toLocaleString()}
            </text>
          </g>
        ))}
        {/* axis labels */}
        <text x={padL + innerW / 2} y={H - 4} fontSize={10.5} fill="var(--text-secondary)" textAnchor="middle">
          容量（萬 m³，對數軸）
        </text>
        <text
          x={-padT - innerH / 2}
          y={11}
          fontSize={10.5}
          fill="var(--text-secondary)"
          textAnchor="middle"
          transform="rotate(-90)"
        >
          蓄水率 %
        </text>

        {/* points */}
        {pts.map((r) => {
          const v = r.storage_ratio_pct!;
          const color = v < 30 ? "#EF4444" : v < 60 ? "#F59E0B" : "#10B981";
          const cx = xScale(Number(r.effective_capacity_wan));
          const cy = yScale(v);
          return (
            <g key={r.reservoir_id} style={{ cursor: onClick ? "pointer" : undefined }} onClick={() => onClick?.(r)}>
              <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} opacity={0.92}>
                <title>
                  {r.name} · {v.toFixed(1)}% · {Math.round(Number(r.effective_capacity_wan)).toLocaleString()} 萬m³
                </title>
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="pp-scatter-legend">
        <span>
          <i style={{ background: "#10B981" }} /> 充足 ≥ 60%
        </span>
        <span>
          <i style={{ background: "#F59E0B" }} /> 警示 30–60%
        </span>
        <span>
          <i style={{ background: "#EF4444" }} /> 紅線 &lt; 30%
        </span>
        <span className="spacer" />
        <span className="muted">⤴ hover 點看詳情</span>
      </div>
    </div>
  );
}
