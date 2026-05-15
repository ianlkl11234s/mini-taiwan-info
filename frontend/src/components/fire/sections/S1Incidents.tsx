/**
 * 區塊 1 · 火災發生
 *
 * - 1-1 KPI ×4（年度件數 / 死傷 / 財損(mock) / 主因%）
 * - 1-2 時間長條圖（年/月/日/時段 切換）
 * - 1-3 佔比 donut / bar 5 維度切換
 * - 1-4 3 個 tab 表格（縣市排名 / 起火原因 5+22 / 起火處所）
 *
 * 資料源：useFireData → 真實 Supabase MV
 * 缺漏：財損 KPI / 起火處所 (mock，待 Sprint 1 TODO-3 MOI ETL)
 */

import { useMemo, useState } from "react";
import { Flame, AlertTriangle, TrendingUp, Layers, Download } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";
import type { FireDataState } from "@/hooks/useFireData";
import { FireCatHeader } from "../FireCatHeader";
import { FireBarRow } from "../FireBarRow";
import { FireDonut, FireDonutLegend, type DonutSlice } from "../FireDonut";
import {
  FireCountyTable,
  FireCauseTable,
  FireLocationTable,
  FireCountyBars,
} from "../FireTables";
import { FIRE_NATIONAL_MOCK, FIRE_SEVERITY_COLORS } from "@/lib/mock-fire";

type Scale = "year" | "month" | "day" | "hour";
type Dim = "daypart" | "cause" | "county" | "injury" | "place";

interface S1Props {
  data: FireDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

export function S1Incidents({ data, selectedCounty, onCountyClick }: S1Props) {
  const [scale, setScale] = useState<Scale>("year");
  const [dim, setDim] = useState<Dim>("daypart");
  const [tableTab, setTableTab] = useState<"county" | "cause" | "location">("county");

  // 時間長條 — 資料來自 Supabase MV
  const seriesData = useMemo(() => {
    if (scale === "year") {
      return {
        data: data.yearlyTotals.map((y) => ({
          x: y.year_minguo,
          label: `民${y.year_minguo}`,
          value: y.incidents,
        })),
        type: "bar" as const,
        peakIndex: -1,
      };
    }
    if (scale === "month") {
      return {
        data: data.monthlyTotals.map((m) => ({
          x: m.month,
          label: `${m.month}月`,
          value: m.incidents,
        })),
        type: "bar" as const,
        peakIndex: (() => {
          const max = Math.max(...data.monthlyTotals.map((m) => m.incidents), 0);
          return data.monthlyTotals.findIndex((m) => m.incidents === max);
        })(),
      };
    }
    if (scale === "day") {
      return {
        data: data.dayOfYearSeries.map((d) => ({
          x: d.day_index,
          label: `${d.month}/${d.day}`,
          value: d.incidents,
        })),
        type: "line" as const,
        peakIndex: -1,
      };
    }
    return {
      data: data.hourlyTotals.map((h) => ({
        x: h.hour,
        label: `${h.hour}`,
        value: h.incidents,
      })),
      type: "bar" as const,
      peakIndex: (() => {
        const max = Math.max(...data.hourlyTotals.map((h) => h.incidents), 0);
        return data.hourlyTotals.findIndex((h) => h.incidents === max);
      })(),
    };
  }, [scale, data]);

  const peakLabel = useMemo(() => {
    if (scale === "year") {
      const top = [...data.yearlyTotals].sort((a, b) => b.incidents - a.incidents)[0];
      return top ? `民國 ${top.year_minguo}` : "—";
    }
    if (scale === "month") {
      const top = [...data.monthlyTotals].sort((a, b) => b.incidents - a.incidents)[0];
      return top ? `${top.month} 月` : "—";
    }
    if (scale === "day") return "全年趨勢";
    const top = [...data.hourlyTotals].sort((a, b) => b.incidents - a.incidents)[0];
    return top ? `${top.hour}-${(top.hour + 1) % 24} 時` : "—";
  }, [scale, data]);

  // 佔比 donut data — 對應 5 維度
  const dimensionData = useMemo<{ slices: DonutSlice[] } | null>(() => {
    if (dim === "county") return null; // 走 bar (FireCountyBars)
    if (dim === "daypart") {
      const colors = ["#1E3A8A", "#F59E0B", "#DC2626", "#7C3AED"];
      const total = data.daypart.reduce((s, x) => s + x.value, 0) || 1;
      return {
        slices: data.daypart.map((d, i) => ({
          label: d.label,
          value: d.value,
          pct: (d.value / total) * 100,
          color: colors[i],
        })),
      };
    }
    if (dim === "cause") {
      const total = data.causeAggregates.reduce((s, c) => s + c.incidents, 0) || 1;
      return {
        slices: data.causeAggregates.map((c) => ({
          label: c.cause_5_name,
          value: c.incidents,
          pct: (c.incidents / total) * 100,
          color: FIRE_SEVERITY_COLORS[c.severity],
        })),
      };
    }
    if (dim === "injury") {
      // 從 countyAggregates 累計 deaths/injuries
      const totalIncidents = data.summary?.yearly_incidents ?? 0;
      const totalDeaths = data.summary?.total_deaths ?? 0;
      const totalInjuries = data.summary?.total_injuries ?? 0;
      const noHurt = Math.max(0, totalIncidents - totalDeaths - totalInjuries);
      const total = Math.max(1, totalIncidents);
      return {
        slices: [
          { label: "無傷亡", value: noHurt, pct: (noHurt / total) * 100, color: "#10B981" },
          { label: "受傷", value: totalInjuries, pct: (totalInjuries / total) * 100, color: "#F59E0B" },
          { label: "死亡", value: totalDeaths, pct: (totalDeaths / total) * 100, color: "#DC2626" },
        ],
      };
    }
    // place — mock
    const total = 15405;
    const colors = ["#DC2626", "#F59E0B", "#7C3AED", "#10B981", "#0EA5E9", "#94A3B8"];
    return {
      slices: [
        { label: "住宅",      value: 4210, pct: (4210 / total) * 100, color: colors[0] },
        { label: "工廠/倉儲", value: 1540, pct: (1540 / total) * 100, color: colors[1] },
        { label: "車輛",      value: 1820, pct: (1820 / total) * 100, color: colors[2] },
        { label: "山林田野",  value: 2310, pct: (2310 / total) * 100, color: colors[3] },
        { label: "商店",      value:  680, pct: ( 680 / total) * 100, color: colors[4] },
        { label: "其他",      value: 4845, pct: (4845 / total) * 100, color: colors[5] },
      ],
    };
  }, [dim, data]);

  const S = data.summary;
  const latestYear = S?.latest_year_minguo ?? 113;
  const western = latestYear + 1911;

  return (
    <div className="cat-block">
      <FireCatHeader
        num={1}
        title={
          <>
            <span className="accent">火災發生</span> ─ 一年起多少火
          </>
        }
        tagline={`件數 / 死傷 / 財損 + 時間長條 + 5 維度佔比 + 表格 — 資料時間 民${latestYear}（${western}）`}
        badge={`年度資料 · 民${latestYear}`}
        badgeTone="historical"
      />

      {/* 1-1 KPI ×4 */}
      <div className="kpi-grid cols-4">
        <KPICard
          icon={<Flame size={13} />}
          label="年度火災件數"
          value={S ? fmt.num(S.yearly_incidents) : "—"}
          unit="件"
          trend={
            S && S.incidents_delta_pct != null
              ? {
                  delta: `${S.incidents_delta_pct >= 0 ? "+" : ""}${S.incidents_delta_pct.toFixed(1)}%`,
                  direction: S.incidents_delta_pct >= 0 ? "up" : "down",
                  baseline: "較去年",
                  sentiment: S.incidents_delta_pct >= 0 ? "negative" : "positive",
                }
              : { delta: "—", direction: "flat", baseline: "較去年", sentiment: "neutral" }
          }
          spark={data.yearlyTotals.map((y) => y.incidents)}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="死亡 / 受傷"
          value={S ? `${S.total_deaths} / ${S.total_injuries}` : "—"}
          unit="人"
          trend={(() => {
            if (!S || (S.deaths_delta == null && S.injuries_delta == null)) {
              return { delta: "—", direction: "flat" as const, baseline: "較去年", sentiment: "neutral" as const };
            }
            const dd = S.deaths_delta ?? 0;
            const di = S.injuries_delta ?? 0;
            const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
            return {
              delta: `${fmt(dd)} 死 / ${fmt(di)} 傷`,
              direction: dd > 0 ? ("up" as const) : dd < 0 ? ("down" as const) : ("flat" as const),
              baseline: "較去年",
              sentiment: "neutral" as const,
            };
          })()}
        />
        <KPICard
          icon={<TrendingUp size={13} />}
          label={<>火災財損 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={(FIRE_NATIONAL_MOCK.damageMillion / 100).toFixed(1)}
          unit="億"
          trend={{
            delta: `+${FIRE_NATIONAL_MOCK.damageDeltaPct}%`,
            direction: "up",
            baseline: "等 MOI 統計處 ETL",
            sentiment: "negative",
          }}
        />
        <KPICard
          icon={<Layers size={13} />}
          label="主因（件數）"
          value={S?.top_cause_5_pct != null ? S.top_cause_5_pct.toFixed(1) : "—"}
          unit="%"
          trend={{
            delta: S?.top_cause_5_name ?? "—",
            direction: "flat",
            baseline: "最大宗",
            sentiment: "neutral",
          }}
        />
      </div>

      {/* 1-2 時間長條 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">TIME</span>
              發生時間分布
            </div>
            <div className="section-subtitle">
              高峰 · <b style={{ color: "var(--accent-deep)" }}>{peakLabel}</b>
              {scale === "year" && (
                <span className="muted" style={{ marginLeft: 8 }}>
                  目前資料涵蓋 民111-113，10 年版待 13764 補抓
                </span>
              )}
            </div>
          </div>
          <div className="toggle-group">
            {(["year", "month", "day", "hour"] as Scale[]).map((id) => (
              <button
                key={id}
                className={scale === id ? "active" : ""}
                onClick={() => setScale(id)}
              >
                {id === "year" ? "年" : id === "month" ? "月" : id === "day" ? "日" : "時段"}
              </button>
            ))}
          </div>
        </div>
        <FireBarRow
          data={seriesData.data}
          chartType={seriesData.type}
          peakIndex={seriesData.peakIndex}
        />
      </div>

      {/* 1-3 佔比 5 維度 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">SPLIT</span>
              組成佔比
            </div>
            <div className="section-subtitle">
              切換維度查看相同 {fmt.num(S?.yearly_incidents ?? 0)} 件火災的不同切片
            </div>
          </div>
          <div className="toggle-group" style={{ flexWrap: "wrap" }}>
            {(
              [
                ["daypart", "早中晚半夜"],
                ["cause", "5 大類"],
                ["county", "縣市"],
                ["injury", "傷亡"],
                ["place", "處所"],
              ] as Array<[Dim, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                className={dim === id ? "active" : ""}
                onClick={() => setDim(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {dim === "place" && (
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
            ⏳ 「處所」維度等 MOI 統計處 ETL（Sprint 1 TODO-3）— 暫顯 mock
          </div>
        )}
        {dim === "county" ? (
          <FireCountyBars
            countyAggregates={data.countyAggregates}
            selectedCounty={selectedCounty}
            onCountyClick={onCountyClick}
          />
        ) : dimensionData ? (
          <div className="fire-donut-row">
            <FireDonut slices={dimensionData.slices} size={200} />
            <FireDonutLegend slices={dimensionData.slices} />
          </div>
        ) : (
          <div className="muted">無資料</div>
        )}
      </div>

      {/* 1-4 表格區 3 tabs */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">TABLE</span>
              明細表
            </div>
            <div className="section-subtitle">點 row 進該縣市；起火原因表展開 22 細項</div>
          </div>
          <button className="btn ghost" style={{ fontSize: 12 }}>
            <Download size={12} /> CSV
          </button>
        </div>
        <div className="fire-tab-row">
          {(
            [
              ["county", "縣市排名"],
              ["cause", "起火原因"],
              ["location", "起火處所"],
            ] as Array<["county" | "cause" | "location", string]>
          ).map(([id, label]) => (
            <button
              key={id}
              className={`fire-mini-tab ${tableTab === id ? "active" : ""}`}
              onClick={() => setTableTab(id)}
            >
              {label}
              {id === "location" && (
                <span className="muted" style={{ fontSize: 9, marginLeft: 4 }}>
                  ·待ETL
                </span>
              )}
            </button>
          ))}
        </div>
        {tableTab === "county" && (
          <FireCountyTable
            countyAggregates={data.countyAggregates}
            selectedCounty={selectedCounty}
            onCountyClick={onCountyClick}
          />
        )}
        {tableTab === "cause" && (
          <FireCauseTable causeAggregates={data.causeAggregates} />
        )}
        {tableTab === "location" && <FireLocationTable />}
      </div>
    </div>
  );
}
