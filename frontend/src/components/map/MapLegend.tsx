/**
 * MapLegend — choropleth 圖例
 */

import { COLOR_RAMPS } from "@/lib/mapbox";

interface MapLegendProps {
  label: string;
  unit: string;
  rampName: string;
  rampDirection: "default" | "reverse";
  domain: [number, number];
  ticks?: number;
  /** M-5：部分縣市無資料時的口徑提示，顯示於圖例下方 warning badge */
  coverageNote?: string;
}

export function MapLegend({
  label,
  unit,
  rampName,
  rampDirection,
  domain,
  ticks = 5,
  coverageNote,
}: MapLegendProps) {
  const ramp = COLOR_RAMPS[rampName] ?? COLOR_RAMPS.blues;
  const colors = rampDirection === "reverse" ? [...ramp].reverse() : ramp;
  const [min, max] = domain;

  return (
    <div className="map-overlay map-legend">
      <div className="head">
        {label} ({unit})
      </div>
      <div className="ramp">
        {colors.map((c, i) => (
          <div key={i} style={{ background: c }} />
        ))}
      </div>
      <div className="ticks">
        {Array.from({ length: ticks }, (_, i) => {
          const v = min + ((max - min) * i) / (ticks - 1);
          return <span key={i}>{Math.round(v)}</span>;
        })}
      </div>
      {coverageNote && (
        <div
          className="legend-coverage-note"
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: "1px solid var(--border)",
            fontSize: 10.5,
            lineHeight: 1.4,
            color: "#B45309",
            display: "flex",
            gap: 4,
            alignItems: "flex-start",
            maxWidth: 200,
          }}
        >
          <span aria-hidden>⚠</span>
          <span>{coverageNote}</span>
        </div>
      )}
    </div>
  );
}
