/**
 * PendingDataCard — 「待後續階段補上」placeholder
 *
 * 用於：某欄位 UI 格子保留，但目前無真實資料來源（不顯示假數字 / 估算值）。
 * 與 MissingDataCard（🔴 永久缺口）區隔：Pending 是「資料源規劃中、後續階段補」。
 */

import { type ReactNode } from "react";
import { Clock } from "lucide-react";

interface PendingDataCardProps {
  /** 此格代表的資料名稱（如「各系統縣市別車次」） */
  label?: string;
  /** 補充說明：為何待補、預計來源 */
  note?: string;
  icon?: ReactNode;
  /** 緊湊模式：嵌在既有 section 內時用，無外框 */
  compact?: boolean;
}

export function PendingDataCard({ label, note, icon, compact }: PendingDataCardProps) {
  const inner = (
    <>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 9px",
          borderRadius: 20,
          background: "var(--surface-2, #f1f5f9)",
          border: "1px dashed var(--border)",
          color: "var(--text-secondary)",
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {icon ?? <Clock size={12} />}
        待後續階段補上
      </div>
      {label && (
        <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, marginTop: 6 }}>
          {label}
        </div>
      )}
      {note && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 3, lineHeight: 1.5 }}>
          {note}
        </div>
      )}
    </>
  );

  if (compact) {
    return <div style={{ padding: "10px 2px" }}>{inner}</div>;
  }

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        border: "1px dashed var(--border)",
      }}
    >
      {inner}
    </div>
  );
}
