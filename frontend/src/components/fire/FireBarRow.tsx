/**
 * FireBarRow — 時間長條圖 + 自動 bar / line 切換
 *
 * 設計來源：v03 view-a-fire.jsx::FireTimeBars
 * - bar mode: 年 / 月 / 時段
 * - line mode: 365 點日折線
 */

import { fmt } from "@/lib/format";

interface BarDatum {
  x: number;
  label: string;
  value: number;
}

interface FireBarRowProps {
  data: BarDatum[];
  chartType: "bar" | "line";
  peakIndex?: number;
  height?: number;
}

export function FireBarRow({ data, chartType, peakIndex = -1, height = 180 }: FireBarRowProps) {
  if (!data.length) {
    return (
      <div className="fire-bar-row" style={{ height, alignItems: "center", justifyContent: "center" }}>
        <span className="muted">無資料</span>
      </div>
    );
  }

  if (chartType === "line") {
    return <FireLineChart data={data} height={height} />;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="fire-bar-row" style={{ height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        const peak = peakIndex === i;
        return (
          <div key={d.x} className="fbr-col" title={`${d.label}: ${fmt.num(d.value)} 件`}>
            <div className="fbr-num">{fmt.num(d.value)}</div>
            <div className={`fbr-bar ${peak ? "is-peak" : ""}`} style={{ height: `${h}%` }} />
            <div className="fbr-lbl">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** SVG 折線圖（365 點 day-of-year）— 輕量自建 */
function FireLineChart({ data, height }: { data: BarDatum[]; height: number }) {
  const w = 900;
  const pad = { t: 20, r: 16, b: 28, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;

  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * innerW;
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;

  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${x(0)},${pad.t + innerH} ${pts} ${x(n - 1)},${pad.t + innerH}`;

  // Month label anchors at ~middle of each month
  const monthLabels = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

  return (
    <div className="fire-bar-row" style={{ height, position: "relative" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
        {/* baseline */}
        <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH} y2={pad.t + innerH} stroke="var(--border)" />
        {/* area fill */}
        <polygon points={area} fill="var(--accent)" fillOpacity={0.12} />
        {/* line */}
        <polyline
          points={pts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* x ticks: months */}
        {monthStarts.map((dayIdx, mi) => {
          const i = Math.min(n - 1, dayIdx - 1);
          return (
            <text
              key={mi}
              x={x(i)}
              y={pad.t + innerH + 18}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-tertiary)"
            >
              {monthLabels[mi]}
            </text>
          );
        })}
        {/* y axis range */}
        <text x={pad.l - 6} y={pad.t + 4} textAnchor="end" fontSize="10" fill="var(--text-tertiary)">
          {fmt.num(max)}
        </text>
        <text x={pad.l - 6} y={pad.t + innerH} textAnchor="end" fontSize="10" fill="var(--text-tertiary)">
          0
        </text>
      </svg>
    </div>
  );
}
