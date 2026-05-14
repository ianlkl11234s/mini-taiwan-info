/**
 * TwoSectionLayers — 地圖左上控制（可收合）
 *
 * Section 1：著色指標 radio
 * Section 2：點位圖層 checkbox
 *
 * 預設收合（只顯示當前 metric label + chevron）；點 header 展開。
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const activeMetric = metricOptions.find((m) => m.id === metric);
  const activeLayerCount = pointLayers.filter((l) => l.on && l.enabled).length;

  return (
    <div
      className="map-overlay map-layers two-section"
      style={{
        minWidth: expanded ? 220 : 180,
        padding: 0,
        transition: "min-width 0.2s ease",
      }}
    >
      {/* 收合 header — 永遠顯示 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: "var(--text)",
          textAlign: "left",
        }}
        aria-expanded={expanded}
        title={expanded ? "收合" : "展開圖層"}
      >
        <Layers size={13} style={{ color: "var(--accent)" }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {expanded ? "圖層控制" : (
            <>
              <b>{activeMetric?.label ?? metric}</b>
              {activeLayerCount > 0 && (
                <span className="muted" style={{ marginLeft: 4, fontSize: 10.5 }}>
                  · {activeLayerCount} 點位層
                </span>
              )}
            </>
          )}
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <>
          <div className="ml-divider" />
          <div className="ml-section" style={{ padding: "10px 12px 8px" }}>
            <h4 style={{ fontSize: 10.5, margin: "0 0 6px 0" }}>著色指標</h4>
            <div className="ml-rows" style={{ gap: 1 }}>
              {metricOptions.map((m) => (
                <label key={m.id} className="layer-row radio" style={layerRowStyle}>
                  <input
                    type="radio"
                    name="color-metric"
                    checked={metric === m.id}
                    onChange={() => onMetricChange(m.id)}
                    style={{ marginRight: 6 }}
                  />
                  <span className="lbl" style={{ fontSize: 11.5 }}>{m.label}</span>
                  <span className="unit" style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{m.unit}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="ml-divider" />
          <div className="ml-section" style={{ padding: "10px 12px 10px" }}>
            <h4 style={{ fontSize: 10.5, margin: "0 0 6px 0" }}>點位圖層</h4>
            <div className="ml-rows" style={{ gap: 1 }}>
              {pointLayers.map((L) => (
                <label
                  key={L.id}
                  className="layer-row"
                  style={{
                    ...layerRowStyle,
                    opacity: L.enabled ? 1 : 0.45,
                    cursor: L.enabled ? "pointer" : "not-allowed",
                  }}
                  title={L.enabled ? undefined : "Phase 1+ 規劃中"}
                >
                  <input
                    type="checkbox"
                    checked={!!L.on}
                    disabled={!L.enabled}
                    onChange={() => L.enabled && onTogglePoint(L.id)}
                    style={{ marginRight: 6 }}
                  />
                  <span
                    className={`pt-glyph shape-${L.shape}`}
                    style={{ background: L.color, borderColor: L.color, marginRight: 4 }}
                  />
                  <span className="lbl" style={{ fontSize: 11.5 }}>{L.label}</span>
                  {L.count != null && (
                    <span className="count" style={{ fontSize: 10, padding: "1px 5px" }}>
                      {L.count.toLocaleString()}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const layerRowStyle: React.CSSProperties = {
  padding: "3px 0",
  display: "flex",
  alignItems: "center",
  gap: 6,
};
