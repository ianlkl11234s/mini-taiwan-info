/**
 * Section 5 · 使用 — 怎麼被用掉
 *
 *  - LPCD 大數字 + delta vs 去年 + 17 年趨勢圖（TrendChart）
 *  - 用水結構（mock + badge：DB 無 sector 拆解）
 *  - 漏水率 + delta vs 去年
 *  - TOP 5 / BOTTOM 5 LPCD ranking
 */

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { fmt } from "@/lib/format";
import { TrendChart } from "@/components/charts/TrendChart";
import { WaterCatHeader } from "../WaterCatHeader";
import type { CountyCode3 } from "@/lib/types";
import { COUNTIES, codeConvert } from "@/lib/counties";
import type { GovernanceSummary } from "@/lib/queries/water";
import { fetchLpcdNationalHistory } from "@/lib/queries/water";
import type { WaterLossSummary } from "@/lib/queries/water-overview";

interface Props {
  governance: GovernanceSummary | null;
  waterLoss: WaterLossSummary;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

// 用水結構 mock — DB 無 sector 細拆，標 badge「結構估算」
const USAGE_STRUCTURE_MOCK = [
  { label: "農業", pct: 67.3, color: "#84CC16" },
  { label: "民生", pct: 21.5, color: "var(--accent)" },
  { label: "工業", pct: 9.4,  color: "#0EA5E9" },
  { label: "其他", pct: 1.8,  color: "#94A3B8" },
];

export function S5Usage({ governance, waterLoss, selectedCounty, onCountyClick }: Props) {
  // LPCD 全國歷年（lazy load）
  const [history, setHistory] = useState<Array<{ year: number; lpcd_avg: number }>>([]);
  useEffect(() => {
    fetchLpcdNationalHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const lpcdNational = governance?.lpcd_national_avg ?? null;
  const lpcdYear = governance?.lpcd_year ?? null;

  // 22 縣市 LPCD ranking（用 code3）
  const ranked = COUNTIES.map((c) => {
    const idMoi = c.id_moi;
    const v = governance?.lpcd_by_county[idMoi] ?? null;
    return { code: c.code3, name: c.name_zh, value: v };
  })
    .filter((r) => r.value != null)
    .sort((a, b) => (b.value as number) - (a.value as number));
  const top5 = ranked.slice(0, 5);
  const bot5 = ranked.slice(-5).reverse();
  const maxV = ranked[0]?.value ?? 1;
  const ratio = ranked.length >= 2 && bot5[0].value
    ? ((ranked[0].value as number) / (bot5[0].value as number)).toFixed(2)
    : "—";

  // 跟去年差 — 從 history 算
  const histSorted = [...history].sort((a, b) => a.year - b.year);
  const latestHist = histSorted[histSorted.length - 1];
  const prevHist = histSorted[histSorted.length - 2];
  const lpcdDelta = latestHist && prevHist
    ? latestHist.lpcd_avg - prevHist.lpcd_avg
    : null;

  // 17 年總降幅
  const firstYear = histSorted[0];
  const totalDrop = firstYear && latestHist
    ? Math.round(latestHist.lpcd_avg - firstYear.lpcd_avg)
    : null;

  return (
    <div className="cat-block">
      <WaterCatHeader
        num={5}
        title={<><span className="accent">使用</span> ─ 怎麼被用掉</>}
        tagline="每人用水量、用水結構與普及／漏水率"
        badge={lpcdYear ? `年度資料 · ${lpcdYear}` : "年度資料"}
        badgeTone="historical"
      />

      <div className="usage-split">
        <div className="lpcd-card">
          <div className="lpcd-head">
            <div>
              <div className="muted" style={{ fontSize: 11.5, letterSpacing: "0.04em" }}>全國平均 LPCD</div>
              <div className="lpcd-big">
                <span className="num">{lpcdNational != null ? Math.round(lpcdNational) : "—"}</span>
                <span className="unit">L / 人 / 日</span>
                {lpcdDelta != null && (
                  <span className="delta">{lpcdDelta < 0 ? "↓" : "↑"} {Math.abs(lpcdDelta).toFixed(1)} L vs 去年</span>
                )}
              </div>
            </div>
            <div className="lpcd-meta" style={{ textAlign: "right" }}>
              {firstYear && latestHist && (
                <div>{firstYear.year} → {latestHist.year}｜
                  <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {totalDrop != null ? (totalDrop > 0 ? `+${totalDrop}` : totalDrop) : "—"} L
                  </b>
                </div>
              )}
              <div className="gap">跨縣市差距 <b>{ratio} 倍</b></div>
            </div>
          </div>
          {history.length > 0 && (
            <TrendChart
              series={[
                {
                  name: "全國 LPCD",
                  color: "var(--accent)",
                  data: history.map((d) => ({ x: d.year, y: d.lpcd_avg })),
                },
              ]}
              xLabels={history.map((d) => d.year.toString())}
              height={180}
              yMin={Math.min(...history.map((d) => d.lpcd_avg)) - 10}
              yMax={Math.max(...history.map((d) => d.lpcd_avg)) + 10}
              showLegend={false}
            />
          )}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div className="side-stat">
            <div className="lbl">
              用水結構
              <span className="cat-badge tone-static" style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px" }}>結構估算</span>
            </div>
            <div className="usage-stack">
              {USAGE_STRUCTURE_MOCK.map((s, i) => (
                <div key={i} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} ${s.pct}%`} />
              ))}
            </div>
            <div className="usage-stack-legend">
              {USAGE_STRUCTURE_MOCK.map((s, i) => (
                <span key={i}>
                  <i style={{ background: s.color }} />
                  {s.label} <b>{s.pct}%</b>
                </span>
              ))}
            </div>
          </div>
          <div className="side-stat">
            <div className="lbl">漏水率（全國）</div>
            <div className="num">
              {waterLoss.national_latest != null
                ? waterLoss.national_latest.toFixed(1)
                : "—"}
              <span className="unit">%</span>
            </div>
            <div className="meta">
              {waterLoss.national_delta_pp != null ? (
                <>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    color: waterLoss.national_delta_pp < 0 ? "#047857" : "#B91C1C",
                    background: waterLoss.national_delta_pp < 0 ? "var(--positive-soft)" : "var(--danger-soft)",
                    fontWeight: 600, padding: "2px 5px", borderRadius: 4, fontSize: 11,
                  }}>
                    {waterLoss.national_delta_pp < 0 ? "↓" : "↑"} {Math.abs(waterLoss.national_delta_pp).toFixed(1)} pp
                  </span>
                  <span style={{ marginLeft: 6 }}>相較去年</span>
                </>
              ) : (
                <span className="muted">—</span>
              )}
              {waterLoss.national_year && (
                <span className="muted" style={{ marginLeft: 8 }}>· {waterLoss.national_year}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOP / BOTTOM 5 LPCD ranking */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANKING</span>
              人均日用水量 · TOP 5 / BOTTOM 5
            </div>
            <div className="section-subtitle">點任一縣市進入該縣市儀錶板</div>
          </div>
        </div>
        <div className="ranking">
          <div className="ranking-col">
            <h4>最高 5 名</h4>
            <RankBars rows={top5} max={maxV as number} highlight={selectedCounty} onClick={onCountyClick} />
          </div>
          <div className="ranking-col">
            <h4>最低 5 名</h4>
            <RankBars rows={bot5} max={maxV as number} highlight={selectedCounty} onClick={onCountyClick} low />
          </div>
        </div>
        {ranked.length > 0 && (
          <div className="rank-footer" style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-tertiary)" }}>
            <TrendingUp size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            <span>差距 <b>{ratio} 倍</b></span>
            <span> · </span>
            <span>最高 <b>{top5[0]?.name} {Math.round(top5[0]?.value as number)} L</b></span>
            <span> · </span>
            <span>最低 <b>{bot5[0]?.name} {Math.round(bot5[0]?.value as number)} L</b></span>
          </div>
        )}
      </div>
    </div>
  );
}

interface RankRow { code: string; name: string; value: number | null }

function RankBars({
  rows,
  max,
  highlight,
  low,
  onClick,
}: {
  rows: RankRow[];
  max: number;
  highlight?: CountyCode3 | null;
  low?: boolean;
  onClick?: (c: CountyCode3) => void;
}) {
  void codeConvert;
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.code}
          className={`ranking-row ${low ? "low" : ""}`}
          style={{
            cursor: onClick ? "pointer" : "default",
            background: highlight === r.code ? "var(--accent-soft)" : undefined,
          }}
          onClick={() => onClick?.(r.code as CountyCode3)}
        >
          <span className="name">{r.name}</span>
          <span className="bar-wrap">
            <span className="bar" style={{ width: `${((r.value ?? 0) / max) * 100}%` }} />
          </span>
          <span className="val">{r.value != null ? fmt.num(r.value, 0) : "—"} L</span>
        </div>
      ))}
    </div>
  );
}
