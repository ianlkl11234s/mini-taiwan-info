/**
 * CatHeader — 通用區塊（cat-block）標題列
 *
 * 設計來源：Mini Taiwan Info.html / view-a-*.jsx CatHeader
 * 與 FireCatHeader 相同結構，但 generic 給 demographics / rail / maritime 三主題用，
 * accent 顏色透過 :root --accent / --accent-deep 切主題自動套色。
 */

import { type ReactNode } from "react";

interface CatHeaderProps {
  num: number;
  title: ReactNode;
  tagline: ReactNode;
  badge?: string;
  badgeTone?: "static" | "live" | "sampled" | "historical" | "placeholder";
}

export function CatHeader({
  num,
  title,
  tagline,
  badge,
  badgeTone = "static",
}: CatHeaderProps) {
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
