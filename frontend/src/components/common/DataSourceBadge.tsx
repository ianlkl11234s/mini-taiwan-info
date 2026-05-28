/**
 * DataSourceBadge — 底部資料來源卡（跟 fire ViewA 同款）
 *
 * 設計來源：Mini Taiwan Info.html view-a-*.jsx DataSourceBadge
 * 用既有 globals.css 的 .source-badge class（line 731-）。
 */

import { Database } from "lucide-react";

interface DataSourceBadgeProps {
  sources: string[];
  updatedAt?: string;          // ISO 日期 / 中文敘述
  note?: string;
}

export function DataSourceBadge({ sources, updatedAt, note }: DataSourceBadgeProps) {
  return (
    <div className="source-badge" style={{ marginTop: 18 }}>
      <Database size={14} style={{ flexShrink: 0, color: "var(--text-tertiary)" }} />
      <span style={{ fontWeight: 600, color: "var(--text-secondary)", marginRight: 4 }}>資料來源</span>
      <span style={{ flex: 1, lineHeight: 1.6 }}>
        {sources.join(" · ")}
        {note && <span className="muted" style={{ marginLeft: 8 }}>· {note}</span>}
      </span>
      {updatedAt && (
        <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>
          更新：{updatedAt}
        </span>
      )}
    </div>
  );
}
