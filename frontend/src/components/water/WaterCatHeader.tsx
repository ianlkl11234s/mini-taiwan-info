/**
 * WaterCatHeader — 水主題章節 header
 *
 * 與 FireCatHeader 用同一個 .cat-block / .cat-head CSS（從 globals.css 共用）。
 * 沒有 fire 特定邏輯，命名分開純為跨主題清晰。
 *
 * 設計來源：design bundle handoff 2026-05-16 view-a.jsx::CatHeader
 */

import { type ReactNode } from "react";

interface Props {
  num: number;
  title: ReactNode;
  tagline: ReactNode;
  badge?: string;
  badgeTone?: "static" | "live" | "sampled" | "historical" | "placeholder";
}

export function WaterCatHeader({ num, title, tagline, badge, badgeTone = "static" }: Props) {
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
