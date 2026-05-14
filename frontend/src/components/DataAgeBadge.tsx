/**
 * DataAgeBadge — 資料時間 badge（替代部分 LIVE badge）
 *
 * LIVE badge 嚴格定義（2026-05-14 PRINCIPLES）：
 *   只有 data collector 設 cron 自動持續抓的才能標 🟢 LIVE。
 *   其他資料（月度/年度採樣 / 手動 backfill / 已停採）用本 component 標資料時間。
 *
 * Freshness 級別：
 *   - 即時（≤ 1h）→ 綠，"X 分鐘前"（搭 LIVE 用，但通常 LIVE 已自己標）
 *   - 日（≤ 24h）→ 綠，"X 小時前"
 *   - 週（≤ 7d）→ 藍，"X 天前"
 *   - 月（≤ 90d）→ 橘，"YYYY-MM-DD"
 *   - 年（≤ 365d）→ 灰，"YYYY-MM"
 *   - 已停（> 365d）→ 紅，"YYYY 年（已停採）"
 */

import { useMemo } from "react";

interface Props {
  /** ISO 8601 timestamp 或 null（null = 無資料） */
  sampledAt: string | null | undefined;
  /** 標籤前綴（例如「採樣」「更新」「最新」），預設「資料」 */
  label?: string;
  /** 知道 source 是年度資料，可強制標年度（覆蓋自動級別） */
  forceClass?: "annual" | "static";
  /** 字級 px，預設 10.5 */
  fontSize?: number;
}

type Tone = "live" | "fresh" | "recent" | "month" | "year" | "stale" | "none";

const TONE_COLOR: Record<Tone, { bg: string; fg: string; text: string }> = {
  live:   { bg: "var(--positive-soft)", fg: "var(--positive)", text: "LIVE" },
  fresh:  { bg: "#DCFCE7", fg: "#15803D", text: "" },
  recent: { bg: "#DBEAFE", fg: "#1D4ED8", text: "" },
  month:  { bg: "#FFEDD5", fg: "#9A3412", text: "" },
  year:   { bg: "var(--surface-2)", fg: "var(--text-secondary)", text: "" },
  stale:  { bg: "#FEE2E2", fg: "#B91C1C", text: "" },
  none:   { bg: "var(--surface-2)", fg: "var(--text-tertiary)", text: "—" },
};

function classifyAge(date: Date | null, forceClass?: Props["forceClass"]): { tone: Tone; text: string } {
  if (!date) return { tone: "none", text: "無採樣資料" };
  if (forceClass === "static") return { tone: "year", text: "靜態資料" };

  const ms = Date.now() - date.getTime();
  const hours = ms / (1000 * 60 * 60);
  const days = hours / 24;
  const months = days / 30;
  const ymd = date.toISOString().slice(0, 10);
  const ym = date.toISOString().slice(0, 7);
  const y = date.getFullYear();

  if (forceClass === "annual") {
    if (months > 24) return { tone: "stale", text: `${y} 年度（已停更新）` };
    return { tone: "year", text: `${y} 年度` };
  }

  if (hours < 1) return { tone: "fresh", text: `${Math.max(1, Math.round(hours * 60))} 分鐘前` };
  if (hours < 24) return { tone: "fresh", text: `${Math.round(hours)} 小時前` };
  if (days < 7) return { tone: "recent", text: `${Math.round(days)} 天前` };
  if (days < 90) return { tone: "month", text: ymd };
  if (days < 365) return { tone: "year", text: ym };
  if (days < 730) return { tone: "stale", text: `${y} 年` };
  return { tone: "stale", text: `${y} 年（已停採）` };
}

export function DataAgeBadge({ sampledAt, label = "資料", forceClass, fontSize = 10.5 }: Props) {
  const { tone, text } = useMemo(() => {
    const date = sampledAt ? new Date(sampledAt) : null;
    return classifyAge(date && !isNaN(date.getTime()) ? date : null, forceClass);
  }, [sampledAt, forceClass]);

  const color = TONE_COLOR[tone];
  const fullText = tone === "none" ? `${label}：${text}` : `${label} ${text}`;
  const title = sampledAt ? `精確時間：${sampledAt}` : "尚無資料";

  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        marginLeft: 6,
        fontSize,
        fontWeight: 600,
        color: color.fg,
        background: color.bg,
        padding: "1px 6px",
        borderRadius: 3,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      {fullText}
    </span>
  );
}
