/**
 * FireCatHeader — 區塊（cat-block）標題列
 *
 * 設計來源：v03 design bundle view-a-fire.jsx::FireCatHeader
 * - 編號 01-04 + 標題 + tagline + 右上 badge
 */

import { type ReactNode } from "react";

interface FireCatHeaderProps {
  num: number;
  title: ReactNode;
  tagline: ReactNode;
  badge?: string;
  badgeTone?: "static" | "live" | "sampled" | "historical" | "placeholder";
}

export function FireCatHeader({
  num,
  title,
  tagline,
  badge,
  badgeTone = "static",
}: FireCatHeaderProps) {
  return (
    <div className="cat-head">
      <div className="cat-num">{String(num).padStart(2, "0")}</div>
      <div className="cat-meta">
        <h3 className="cat-title">{title}</h3>
        <div className="cat-tagline">{tagline}</div>
      </div>
      {badge && (
        <div className={`cat-badge tone-${badgeTone}`}>
          {badgeTone === "live" && <span className="pulse-dot" />}
          {badge}
        </div>
      )}
    </div>
  );
}
