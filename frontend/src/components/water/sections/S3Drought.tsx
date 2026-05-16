/**
 * Section 3 · 水情燈號 — 現在缺水嗎
 *
 *  - 4 級燈號 tile（綠提醒 / 黃減壓 / 橙減量 / 紅分區供水）
 *  - 過去 5 年 timeline（collector 才上線歷史薄，顯示「資料累積中」）
 *
 * 接真實：當前燈號 4 級分布（drought_alert_current）
 * 累積中：5 年 timeline（提示需要更多時間累積）
 */

import { WaterCatHeader } from "../WaterCatHeader";
import type { DroughtAlertRow, DroughtAlertHistoryRow } from "@/lib/queries/water-overview";

interface Props {
  current: DroughtAlertRow[];
  history: DroughtAlertHistoryRow[];
}

// 對齊 design bundle 的 4 級命名
const LEVELS: Array<{ id: "red" | "orange" | "yellow" | "green"; label: string; desc: string; match: RegExp }> = [
  { id: "red",    label: "紅燈", desc: "分區供水", match: /紅/ },
  { id: "orange", label: "橙燈", desc: "減量供水", match: /橙|橘/ },
  { id: "yellow", label: "黃燈", desc: "減壓供水", match: /黃/ },
  { id: "green",  label: "綠燈", desc: "提醒",     match: /綠/ },
];

function classifyLevel(alertLevel: string): typeof LEVELS[number]["id"] | null {
  for (const lv of LEVELS) {
    if (lv.match.test(alertLevel)) return lv.id;
  }
  return null;
}

export function S3Drought({ current, history }: Props) {
  // 把 current rows group by level
  const byLevel = new Map<string, string[]>();
  for (const row of current) {
    const id = classifyLevel(row.alert_level);
    if (!id) continue;
    const list = byLevel.get(id) ?? [];
    list.push(row.region_name);
    byLevel.set(id, list);
  }

  // 找最近一次紅/橙公告（從 history）
  const recentSerious = [...history]
    .filter((h) => /紅|橙|橘/.test(h.alert_level))
    .sort((a, b) => (b.published_date > a.published_date ? 1 : -1))[0];

  // 5 年 timeline 從 history 算（不夠就顯示 placeholder）
  const hasEnoughHistory = history.length >= 30;

  // 取得「最新公告日」（current 內的 max published_date）
  const latestPublished = current
    .map((r) => r.published_date)
    .filter((d): d is string => !!d)
    .sort()
    .pop();

  return (
    <div className="cat-block">
      <WaterCatHeader
        num={3}
        title={<><span className="accent">水情燈號</span> ─ 現在缺水嗎</>}
        tagline="官方分區水情判定（綠提醒 / 黃減壓 / 橙減量 / 紅分區供水）"
        badge={latestPublished ? `公告 ${latestPublished}` : "資料累積中"}
        badgeTone="sampled"
      />

      <div className="alert-grid">
        {LEVELS.map((lv) => {
          const regions = byLevel.get(lv.id) ?? [];
          const zero = regions.length === 0;
          return (
            <div key={lv.id} className={`alert-tile lv-${lv.id} ${zero ? "is-zero" : ""}`}>
              <div className="lvl"><span className="swatch" />{lv.label}</div>
              <div className="cnt">{regions.length}<span className="unit">區</span></div>
              <div className="desc">{lv.desc}</div>
              <div className="rgns">{regions.join("、")}</div>
            </div>
          );
        })}
      </div>

      <div className="drought-timeline">
        <div className="dt-head">
          <div className="t">過去 5 年燈號歷程</div>
          <div className="last-red">
            {recentSerious ? (
              <>最近橙/紅燈：<b>{recentSerious.published_date}</b>（{recentSerious.region_name} {recentSerious.alert_level}）</>
            ) : (
              <span className="muted">歷史變動暫無紀錄</span>
            )}
          </div>
        </div>
        {hasEnoughHistory ? (
          <div className="dt-axis">
            {/* 真正畫 timeline 等 collector 累積 30+ 筆 history 後實作；目前空 axis */}
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 11.5, color: "var(--text-tertiary)" }}>
              ({history.length} 筆歷史變動)
            </div>
          </div>
        ) : (
          <div className="dt-axis" style={{ display: "grid", placeItems: "center" }}>
            <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
              ⏳ collector 於 2026-05 上線，已累積 {history.length} 筆 — 需 6 個月後可繪出 timeline
            </span>
          </div>
        )}
        <div className="dt-ticks">
          <span>2021</span><span>2022</span><span>2023</span><span>2024</span><span>2025</span><span>2026</span>
        </div>
      </div>
    </div>
  );
}
