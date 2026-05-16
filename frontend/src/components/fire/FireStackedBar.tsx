/**
 * FireStackedBar — SVG 堆疊長條圖
 *
 * 給 KPI 爆炸視圖用（time bucket × stack dim）。
 * 上方傳入 buckets（X 軸）+ stacks（每 bucket 內各 segment 值 + 顏色）。
 */

import { fmt } from "@/lib/format";

export interface StackedSegment {
  key: string;
  label: string;
  color: string;
}

export interface StackedBarBucket {
  x: number;
  label: string;
  /** segment.key → value（缺值視為 0）*/
  values: Record<string, number>;
}

interface FireStackedBarProps {
  buckets: StackedBarBucket[];
  segments: StackedSegment[];
  height?: number;
}

export function FireStackedBar({ buckets, segments, height = 220 }: FireStackedBarProps) {
  if (!buckets.length || !segments.length) {
    return (
      <div className="fire-bar-row" style={{ height, alignItems: "center", justifyContent: "center" }}>
        <span className="muted">無資料</span>
      </div>
    );
  }

  const totals = buckets.map((b) => segments.reduce((s, seg) => s + (b.values[seg.key] ?? 0), 0));
  const max = Math.max(...totals, 1);

  return (
    <div className="fire-stacked-wrap" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="fire-bar-row" style={{ height }}>
        {buckets.map((b, i) => {
          const total = totals[i];
          const heightPct = (total / max) * 100;
          return (
            <div key={b.x} className="fbr-col" title={`${b.label}: ${fmt.num(total)} 件`}>
              <div className="fbr-num">{fmt.num(total)}</div>
              <div
                className="fire-stacked-col"
                style={{
                  height: `${heightPct}%`,
                  width: "100%",
                  maxWidth: 48,
                  display: "flex",
                  flexDirection: "column-reverse",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                {segments.map((seg) => {
                  const v = b.values[seg.key] ?? 0;
                  if (v <= 0) return null;
                  const segPct = (v / total) * 100;
                  return (
                    <div
                      key={seg.key}
                      style={{
                        height: `${segPct}%`,
                        background: seg.color,
                      }}
                      title={`${seg.label}: ${fmt.num(v)}`}
                    />
                  );
                })}
              </div>
              <div className="fbr-lbl">{b.label}</div>
            </div>
          );
        })}
      </div>
      <FireStackedLegend segments={segments} buckets={buckets} />
    </div>
  );
}

function FireStackedLegend({
  segments,
  buckets,
}: {
  segments: StackedSegment[];
  buckets: StackedBarBucket[];
}) {
  const totals = segments.map((seg) => ({
    seg,
    total: buckets.reduce((s, b) => s + (b.values[seg.key] ?? 0), 0),
  }));
  const grand = totals.reduce((s, t) => s + t.total, 0) || 1;

  return (
    <div className="fire-stacked-legend">
      {totals.map(({ seg, total }) => (
        <span key={seg.key} className="fire-stacked-legend-item">
          <span className="dot" style={{ background: seg.color }} />
          <span className="lbl">{seg.label}</span>
          <span className="val">{fmt.num(total)}</span>
          <span className="pct">{((total / grand) * 100).toFixed(1)}%</span>
        </span>
      ))}
    </div>
  );
}
