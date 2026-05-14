/**
 * TwoSectionLayers — 地圖左上控制
 * Section 1：著色指標（radio，從 manifest.overview.color_metrics）
 * Section 2：點位圖層（checkbox）— Phase 0c 只支援 reservoir，其他先停用
 */

import type { ColorMetric } from "@/lib/types";

export interface PointLayerToggle {
  id: string;
  label: string;
  count?: number;
  color: string;
  shape: "ring" | "dot" | "small" | "square";
  enabled: boolean;
  on: boolean;
}

interface Props {
  metric: string;
  metricOptions: ColorMetric[];
  onMetricChange: (id: string) => void;
  pointLayers: PointLayerToggle[];
  onTogglePoint: (id: string) => void;
}

export function TwoSectionLayers({
  metric,
  metricOptions,
  onMetricChange,
  pointLayers,
  onTogglePoint,
}: Props) {
  return (
    <div className="map-overlay map-layers two-section">
      <div className="ml-section">
        <h4>著色指標</h4>
        <div className="ml-rows">
          {metricOptions.map((m) => (
            <label key={m.id} className="layer-row radio">
              <input
                type="radio"
                name="color-metric"
                checked={metric === m.id}
                onChange={() => onMetricChange(m.id)}
              />
              <span className="lbl">{m.label}</span>
              <span className="unit">{m.unit}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="ml-divider" />
      <div className="ml-section">
        <h4>點位圖層</h4>
        <div className="ml-rows">
          {pointLayers.map((L) => (
            <label
              key={L.id}
              className="layer-row"
              style={{ opacity: L.enabled ? 1 : 0.5, cursor: L.enabled ? "pointer" : "not-allowed" }}
              title={L.enabled ? undefined : "Phase 1+ 規劃中"}
            >
              <input
                type="checkbox"
                checked={!!L.on}
                disabled={!L.enabled}
                onChange={() => L.enabled && onTogglePoint(L.id)}
              />
              <span
                className={`pt-glyph shape-${L.shape}`}
                style={{ background: L.color, borderColor: L.color }}
              />
              <span className="lbl">{L.label}</span>
              {L.count != null && <span className="count">{L.count.toLocaleString()}</span>}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
