/**
 * HRankBar — 雙欄 Top/Bottom 縣市排名橫向長條
 *
 * 設計來源：Mini Taiwan Info.html / view-a-*.jsx HRankBar
 * 用既有 globals.css 的 .ranking / .ranking-row / .ranking-col h4 規格
 * 跟 .rank-pair > .col h4 容器配合（rank-pair 由 caller 負責包外層）。
 */

import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";

export interface HRankRow {
  code: CountyCode3;
  name: string;
  value: number;
}

interface HRankBarProps {
  rows: HRankRow[];
  /** 用於計算 bar width 比例（一般傳整 list 的 max） */
  max: number;
  /** bar 顏色，預設 var(--accent) */
  color?: string;
  /** 高亮指定縣市（state.county） */
  highlightCode?: CountyCode3 | null;
  /** 顯示單位（如 "%", "人/km²"），預設無 */
  unit?: string;
  /** 數字顯示小數位（預設 1） */
  decimals?: number;
  /** 點擊縣市 row → 進 ViewB */
  onRowClick?: (code: CountyCode3) => void;
}

export function HRankBar({
  rows,
  max,
  color = "var(--accent)",
  highlightCode,
  unit = "",
  decimals = 1,
  onRowClick,
}: HRankBarProps) {
  return (
    <div className="ranking-rows">
      {rows.map((r) => {
        const denom = max <= 0 ? 1 : max;
        const pct = Math.min(100, Math.max(0, (Math.abs(r.value) / denom) * 100));
        const isSelected = r.code === highlightCode;
        return (
          <div
            key={r.code}
            className={`ranking-row ${isSelected ? "is-selected" : ""}`}
            onClick={onRowClick ? () => onRowClick(r.code) : undefined}
            style={onRowClick ? { cursor: "pointer" } : undefined}
          >
            <span className="name" title={r.name}>{r.name}</span>
            <div className="bar-wrap">
              <div
                className="bar"
                style={{
                  width: `${pct}%`,
                  background: color,
                }}
              />
            </div>
            <span className="val">
              {decimals === 0 ? fmt.num(r.value) : fmt.num(r.value, decimals)}
              {unit && <span style={{ fontSize: "0.85em", marginLeft: 2, color: "var(--text-tertiary)" }}>{unit}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
