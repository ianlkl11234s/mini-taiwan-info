/**
 * MissingDataCard — 缺口資料提示卡（🔴）
 *
 * 設計來源：Mini Taiwan Info.html view-a-*.jsx
 * 用既有 globals.css 的 .missing-data-card / .icon-box / .title / .reason class。
 */

import { type ReactNode } from "react";

interface MissingDataCardProps {
  label: string;
  reason: string;
  icon?: ReactNode;
}

export function MissingDataCard({ label, reason, icon }: MissingDataCardProps) {
  return (
    <div className="missing-data-card">
      <div className="icon-box">{icon}</div>
      <div>
        <div className="title">{label}</div>
        <div className="reason">{reason}</div>
      </div>
    </div>
  );
}
