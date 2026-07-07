/**
 * TwoSectionLayers — 地圖左上控制（可收合）
 *
 * Section 1：著色指標 radio
 * Section 2：點位圖層 checkbox
 *
 * 預設收合（只顯示當前 metric label + chevron）；點 header 展開。
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers, Lock } from "lucide-react";
import type { ColorMetric } from "@/lib/types";

export interface PointLayerToggle {
  id: string;
  label: string;
  count?: number;
  color: string;
  shape: "ring" | "dot" | "small" | "square";
  enabled: boolean;
  on: boolean;
  /** 會員鎖層：true → checkbox 換 🔒、點擊走 onLockedPoint 攔截 */
  locked?: boolean;
  /** locked 時顯示的所需 tier（member/insider/owner） */
  requiredTier?: string;
}

/** sentinel：選此值代表「不染色 / 灰底」，App.tsx 接到時不算 metricValues、MapView 渲染灰 fill */
export const METRIC_NONE = "_none_";

interface Props {
  metric: string;
  metricOptions: ColorMetric[];
  onMetricChange: (id: string) => void;
  pointLayers: PointLayerToggle[];
  onTogglePoint: (id: string) => void;
  /** 點擊 locked 層時的攔截（未登入 → 引導登入；tier 不足 → 提示） */
  onLockedPoint?: (id: string) => void;
  /** 攔截後顯示的提示文字（如「需 member 以上」），null = 不顯示 */
  lockNotice?: string | null;
}

export function TwoSectionLayers({
  metric,
  metricOptions,
  onMetricChange,
  pointLayers,
  onTogglePoint,
  onLockedPoint,
  lockNotice,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isNeutral = metric === METRIC_NONE;
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
              <b>{isNeutral ? "無染色" : activeMetric?.label ?? metric}</b>
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
              {/* 「無染色」灰底 — 想專心看點位 / 熱力圖時用 */}
              <label className="layer-row radio" style={layerRowStyle}>
                <input
                  type="radio"
                  name="color-metric"
                  checked={isNeutral}
                  onChange={() => onMetricChange(METRIC_NONE)}
                  style={{ marginRight: 6 }}
                />
                <span className="lbl" style={{ fontSize: 11.5 }}>無染色</span>
                <span className="unit" style={{ fontSize: 10, color: "var(--text-tertiary)" }}>灰底</span>
              </label>
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
              {pointLayers.map((L) =>
                L.locked ? (
                  // 會員鎖層：checkbox 換 🔒，點擊交給 onLockedPoint（引導登入 / tier 提示）
                  <div
                    key={L.id}
                    className="layer-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => onLockedPoint?.(L.id)}
                    onKeyDown={(e) => e.key === "Enter" && onLockedPoint?.(L.id)}
                    style={{ ...layerRowStyle, opacity: 0.75, cursor: "pointer" }}
                    title={`會員限定圖層（${L.requiredTier ?? "member"} 以上）`}
                  >
                    <Lock size={12} style={{ marginRight: 6, color: "var(--text-tertiary)", flexShrink: 0 }} />
                    <span
                      className={`pt-glyph shape-${L.shape}`}
                      style={{ background: L.color, borderColor: L.color, marginRight: 4 }}
                    />
                    <span className="lbl" style={{ fontSize: 11.5 }}>{L.label}</span>
                    <span
                      className="count"
                      style={{ fontSize: 10, padding: "1px 5px", color: "var(--text-secondary)" }}
                    >
                      🔒 {L.requiredTier ?? "member"}
                    </span>
                  </div>
                ) : (
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
                )
              )}
            </div>
            {lockNotice && (
              <div style={{ fontSize: 10.5, color: "var(--warning)", padding: "6px 2px 0" }}>
                {lockNotice}
              </div>
            )}
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
