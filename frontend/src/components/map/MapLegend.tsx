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
}

export function MapLegend({
  label,
  unit,
  rampName,
  rampDirection,
  domain,
  ticks = 5,
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
    </div>
  );
}
