/**
 * KPICard — 通用 KPI 卡片，支援爆炸圖展開
 * 對應 prototype kpi.jsx
 */

import { type ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus, Plus } from "lucide-react";
import type { Sentiment } from "@/lib/types";

export interface KpiTrend {
  delta: string;
  direction: "up" | "down" | "flat";
  baseline: string;
  sentiment: Sentiment;
}

interface KPICardProps {
  icon: ReactNode;
  label: ReactNode;
  value: string | number;
  unit?: string;
  trend?: KpiTrend;
  spark?: number[];
  expanded?: boolean;
  onExpand?: () => void;
  explodeContent?: ReactNode;
  hasBg?: boolean;
}

export function KPICard({
  icon,
  label,
  value,
  unit,
  trend,
  expanded,
  onExpand,
  explodeContent,
  hasBg,
}: KPICardProps) {
  return (
    <div
      className={`kpi-card ${expanded ? "expanded" : ""} ${hasBg ? "has-bg" : ""}`}
      onClick={onExpand}
    >
      <div className="kpi-head">
        <div className="kpi-label">
          <span className="ico">{icon}</span>
          {label}
        </div>
        <button className="kpi-expand">
          <Plus size={12} />
        </button>
      </div>

      <div className="kpi-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>

      {trend && (
        <div className="kpi-trend">
          <DeltaBadge trend={trend} />
          <span className="muted">{trend.baseline}</span>
        </div>
      )}

      {expanded && explodeContent && (
        <div className="exploded" style={{ marginTop: 16 }}>
          {explodeContent}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ trend }: { trend: KpiTrend }) {
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  return (
    <span className={`delta ${trend.direction} sentiment-${trend.sentiment}`}>
      <Icon size={11} />
      {trend.delta}
    </span>
  );
}
