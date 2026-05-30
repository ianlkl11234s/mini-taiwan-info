/**
 * ViewA Rail — 軌道主題全國概覽
 *
 * 3 章節：S1 軌道家底（9 系統表）/ S2 班次與車種（24hr + 各系統佔比）/ S3 運量
 * accent: 靛藍 #4F46E5
 *
 * 設計來源：designs Mini Taiwan Info.html · view-a-rail.jsx (chat9 更新版)
 * 主要功能：
 *   - RailGroupTabs：全部 / 台鐵 / 高鐵 / 捷運+輕軌 全域 segmented control
 *   - ExpandableCountyRank：可展開全部縣市排名（預設 Top5/Bottom5）
 *   - S2：各系統停靠車次佔比 bar + group 切換同步縮放
 */

import { useState, useMemo } from "react";
import {
  MapPin, Route, Train, AlertTriangle, ArrowLeftRight,
  ChevronDown, ChevronUp, Lightbulb,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byIdMoi } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import type { RailDataState } from "@/hooks/useRailData";
import { CatHeader } from "@/components/common/CatHeader";
import { HRankBar, type HRankRow } from "@/components/common/HRankBar";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { KPICard } from "@/components/kpi/KPICard";
import {
  RAIL_SYSTEMS_META,
  RAIL_GROUPS,
  railGroupCountyRank,
  railGroupSysTrips,
  deriveHourlyProfile,
  deriveTopStations,
  type RailGroup,
} from "@/lib/queries/rail";

interface Props {
  data: RailDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

interface GroupProps extends Props {
  group: RailGroup;
  setGroup: (g: RailGroup) => void;
}

// ─────────────────────────────────────────────────
// 共用子元件
// ─────────────────────────────────────────────────

/** 系統分類 segmented control */
function RailGroupTabs({ value, onChange }: { value: RailGroup; onChange: (g: RailGroup) => void }) {
  return (
    <div className="rail-group-tabs" role="tablist">
      {RAIL_GROUPS.map((g) => (
        <button
          key={g.id}
          role="tab"
          aria-selected={value.id === g.id}
          className={value.id === g.id ? "active" : ""}
          onClick={() => onChange(g)}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

/** 可展開的縣市排名（預設 Top5/Bottom5，展開後全部） */
function ExpandableCountyRank({
  rows, color, colorLow, highlightCode, decimals = 0,
  topLabel = "最多 5 縣市", botLabel = "最少 5 縣市",
}: {
  rows: HRankRow[];
  color: string;
  colorLow?: string;
  highlightCode?: CountyCode3 | null;
  decimals?: number;
  topLabel?: string;
  botLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!rows.length) {
    return <div className="muted" style={{ fontSize: 12, padding: "6px 2px" }}>此分類無對應縣市資料</div>;
  }
  const mx = rows[0]?.value ?? 1;

  return (
    <div>
      {open ? (
        <div>
          <HRankBar rows={rows} max={mx} color={color} highlightCode={highlightCode} decimals={decimals} />
        </div>
      ) : (
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">{topLabel}</h4>
            <HRankBar rows={rows.slice(0, 5)} max={mx} color={color} highlightCode={highlightCode} decimals={decimals} />
          </div>
          <div className="col">
            <h4 className="bot">{botLabel}</h4>
            <HRankBar rows={rows.slice(-5).reverse()} max={mx} color={colorLow ?? color} highlightCode={highlightCode} decimals={decimals} />
          </div>
        </div>
      )}
      {rows.length > 6 && (
        <button className="rank-expand-btn" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {open ? "收合" : `展開看全部 ${rows.length} 縣市排名`}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// S1 · 軌道家底
// ─────────────────────────────────────────────────
function S1Base({ data, selectedCounty, group, setGroup }: GroupProps) {
  const S = data.summary;
  if (!S) return null;

  const SYS = data.systems;
  const maxStations = Math.max(1, ...SYS.map((s) => s.stations));

  // 依分類的縣市車站數排名
  const cntyRank = useMemo(
    () => railGroupCountyRank(group.systems, data.stations, data.countyAggregates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group.id, data.stations, data.countyAggregates],
  );

  const rankSub = cntyRank.length >= 2
    ? `${cntyRank[0].name} ${cntyRank[0].value} 站、${cntyRank[1].name} ${cntyRank[1].value} 站 ─ 共 ${cntyRank.length} 縣市有站`
    : cntyRank.length === 1 ? `僅 ${cntyRank[0].name} ${cntyRank[0].value} 站` : "此分類無對應縣市";

  const zeroCountyNames = S.zeroStationCounties
    .map((id) => byIdMoi[id]?.name_zh ?? id)
    .join(" / ");

  return (
    <div className="cat-block">
      <CatHeader
        num={1}
        title={<><span className="accent">軌道家底</span> ─ {SYS.length} 系統、{S.stations} 站、{S.lines} 條、{fmt.num(S.kmTotal, 0)} km</>}
        tagline="從臺鐵到輕軌，全台靜態骨架"
        badge="靜態"
        badgeTone="static"
      />

      <div className="stat-grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <div className="stat-tile-ico"><MapPin size={13} /></div>
          <div className="stat-tile-num">{fmt.num(S.stations)}<span className="unit">站</span></div>
          <div className="stat-tile-label">總車站數</div>
          <div className="stat-tile-ds">{SYS.length} 系統合計</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Route size={13} /></div>
          <div className="stat-tile-num">{S.lines}<span className="unit">條</span></div>
          <div className="stat-tile-label">總路線數</div>
          <div className="stat-tile-ds">臺鐵 14 + 捷運 11 + 輕軌 3 + 高鐵 1</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Train size={13} /></div>
          <div className="stat-tile-num">{fmt.num(S.kmTotal, 0)}<span className="unit">km</span></div>
          <div className="stat-tile-label">營運里程</div>
          <div className="stat-tile-ds">
            臺鐵獨佔 {Math.round(((SYS.find((s) => s.id === "tra")?.km ?? 0) / Math.max(1, S.kmTotal)) * 100)}%
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><AlertTriangle size={13} /></div>
          <div className="stat-tile-num">{S.zeroStationCounties.length}<span className="unit">縣 0 站</span></div>
          <div className="stat-tile-label">離島無軌道</div>
          <div className="stat-tile-ds">{zeroCountyNames || "—"}</div>
        </div>
      </div>

      {/* 9 系統表 */}
      <div className="section" style={{ padding: 0 }}>
        <div className="section-head" style={{ padding: "14px 16px 6px", marginBottom: 0 }}>
          <div>
            <div className="section-title">
              <span className="pre">SYSTEMS</span>
              {SYS.length} 大系統 · 站數 / 路線 / 里程
            </div>
            <div className="section-subtitle">每排 strip 為系統代表色 — 與地圖路線著色對應</div>
          </div>
        </div>
        <div className="rail-systems-table" style={{ border: "none", borderTop: "1px solid var(--border)" }}>
          <div className="rail-sys-row head">
            <span></span>
            <span>系統</span>
            <span>站數分布</span>
            <span style={{ textAlign: "right" }}>站數</span>
            <span style={{ textAlign: "right" }}>路線</span>
            <span style={{ textAlign: "right" }}>里程 km</span>
            <span style={{ textAlign: "right" }}>2024 運量</span>
          </div>
          {SYS.map((s) => (
            <div key={s.id} className="rail-sys-row">
              <div className="rsx" style={{ background: s.color }}></div>
              <div className="name">
                <span>{s.label}</span>
                <span className="short">{s.short}</span>
              </div>
              <div className="bar-wrap">
                <div className="bar" style={{ width: `${(s.stations / maxStations) * 100}%`, background: s.color }}></div>
              </div>
              <span className="tnum">{s.stations}</span>
              <span className="tnum muted">{s.lines}</span>
              <span className="tnum">{fmt.num(s.km, 1)}</span>
              <span className="tnum">
                {s.ridership24 != null && s.ridership24 > 0
                  ? `${s.ridership24.toFixed(2)} 億`
                  : <span className="muted" style={{ fontSize: 10 }}>缺資料</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 縣市車站數排名：tabs + 可展開全部 */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANK</span>
              縣市車站數 · 都會 vs 離島
            </div>
            <div className="section-subtitle">{rankSub}</div>
          </div>
          <RailGroupTabs value={group} onChange={setGroup} />
        </div>
        <ExpandableCountyRank
          rows={cntyRank}
          color="var(--accent)"
          colorLow="var(--accent-ramp-3)"
          highlightCode={selectedCounty}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S2 · 班次與車種
// ─────────────────────────────────────────────────
function S2Service({ data, group, setGroup }: GroupProps) {
  const S = data.summary;

  const hasTra = !group.systems || group.systems.includes("tra");
  const TRA = data.traBreakdown;

  // 各系統車次（依分類）
  const sysTrips = useMemo(
    () => railGroupSysTrips(group.systems, data.trips, data.systems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group.id, data.trips, data.systems],
  );
  // Bug 1：24hr 依選定系統「重算」（非全國縮放）→ 選高鐵顯示高鐵自己的時段分布形狀
  const H = useMemo(
    () => deriveHourlyProfile(data.trips, group.systems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group.id, data.trips],
  );
  // Bug 3 / Bug 4：TOP10 依選定系統重算 + 排除貓纜回填占位（切高鐵只出高鐵站）
  const TOP = useMemo(
    () => deriveTopStations(data.trips, data.stations, group.systems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group.id, data.trips, data.stations],
  );

  if (!S) return null;

  const grpTrips = sysTrips.reduce((a, s) => a + s.trips, 0) || 1;
  const scale = S.dailyTrips > 0 ? grpTrips / S.dailyTrips : 1;

  // 24hr bar 用重算後的 H（形狀隨系統變），不再對全國 profile 線性縮放
  const maxHour = Math.max(1, ...H.map((h) => h.value));
  const peakHours = new Set([7, 8, 17, 18]);

  return (
    <div className="cat-block">
      <CatHeader
        num={2}
        title={<><span className="accent">班次與車種</span> ─ 每天 {fmt.num(Math.round(S.dailyTrips / 1000))}K 車次</>}
        tagline="尖峰 / 離峰、24 hr 雙峰分布、各系統與臺鐵車種佔比"
        badge="日均"
        badgeTone="sampled"
      />

      <div className="rail-group-bar">
        <span className="rgb-lbl">系統分類</span>
        <RailGroupTabs value={group} onChange={setGroup} />
      </div>

      {/* 2 KPI（設計移除台北捷運佔比） */}
      <div className="kpi-grid cols-2" style={{ marginBottom: 14 }}>
        <KPICard
          icon={<Train size={13} />}
          label="每日總停靠車次"
          value={fmt.num(grpTrips)}
          unit="次/日"
          trend={{
            delta: `尖峰 ${fmt.num(Math.round(S.peakTrips * scale))} + 離峰 ${fmt.num(Math.round(S.offpeakTrips * scale))}`,
            direction: "flat",
            baseline: group.id === "all" ? `${data.systems.length} 系統合計` : group.label,
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<ArrowLeftRight size={13} />}
          label="尖峰/離峰比"
          value={S.peakRatio.toFixed(2)}
          unit="×"
          trend={{
            delta: "離峰時段較長",
            direction: "flat",
            baseline: `尖峰僅離峰 ${Math.round(S.peakRatio * 100)}%`,
            sentiment: "neutral",
          }}
        />
      </div>

      {/* 各系統停靠車次佔比（在 24hr 上方） */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">SYSTEMS</span>
              各系統停靠車次佔比
            </div>
            <div className="section-subtitle">
              {group.id === "all" && sysTrips[0]
                ? <>主力 <b style={{ color: sysTrips[0].color }}>{sysTrips[0].label}</b> 約 {Math.round(sysTrips[0].trips / grpTrips * 100)}% — 獨佔全國近半</>
                : <>{group.label} · 合計 {fmt.num(grpTrips)} 次/日（佔全國 {(scale * 100).toFixed(1)}%）</>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden", background: "var(--surface-2)" }}>
            {sysTrips.map((s) => (
              <div
                key={s.id}
                style={{ flex: s.trips, background: s.color }}
                title={`${s.label} ${(s.trips / grpTrips * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
            {sysTrips.map((s) => (
              <div key={s.id} className="row gap-8" style={{ fontSize: 11.5 }}>
                <i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }}></i>
                <span style={{ color: "var(--text)" }}>{s.label}</span>
                <span className="muted" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                  {(s.trips / grpTrips * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 24hr 逐時 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">HOURLY</span>
              24 小時班次分布
            </div>
            <div className="section-subtitle">
              {group.id === "all" ? "全系統" : group.label} · 雙峰：早 7-9 上學上班 + 晚 17-19 下班 — 全日合計 {fmt.num(grpTrips)} 班
            </div>
          </div>
          <div className="row gap-8">
            <span className="row gap-4" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              <i style={{ display: "inline-block", width: 10, height: 10, background: "var(--accent)", borderRadius: 2 }}></i> 尖峰
            </span>
            <span className="row gap-4" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              <i style={{ display: "inline-block", width: 10, height: 10, background: "var(--accent-ramp-3)", borderRadius: 2 }}></i> 離峰
            </span>
          </div>
        </div>
        <div className="rail-hour-bars">
          {H.map((h) => (
            <div
              key={h.x}
              className={`rhb ${peakHours.has(h.x) ? "peak" : ""}`}
              style={{ height: `${(h.value / maxHour) * 100}%` }}
              title={`${h.x}:00 — ${fmt.num(h.value)} 班`}
            />
          ))}
          <div className="rhb-labels">
            {H.map((h) => <span key={h.x}>{h.label}</span>)}
          </div>
        </div>
        <div className="rail-hour-foot">
          <span>單日總計 <b style={{ color: "var(--text)" }}>{fmt.num(grpTrips)}</b> 班次</span>
          <span className="pill">尖峰時段最大值約 {fmt.num(Math.max(...Array.from(peakHours).map((h) => H[h]?.value ?? 0)))} 班/時</span>
        </div>
      </div>

      {/* 臺鐵車種佔比（僅 TRA 相關分類顯示）+ Top 10 大站 */}
      <div style={{ display: "grid", gap: 12 }}>
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">{hasTra ? "TRA" : (group.short ?? group.label)}</span>
                {hasTra ? "臺鐵車種佔比" : "車種組成（自有車組）"}
              </div>
              <div className="section-subtitle">
                {hasTra
                  ? (TRA[0] ? `${TRA[0].label} 獨佔 ${TRA[0].pct.toFixed(1)}% — 通勤本位` : "—")
                  : (sysTrips.length === 1
                      ? `${sysTrips[0].label} 為單一車組 — 佔本分類 100%`
                      : `${group.label} 各系統自有車組，無臺鐵式車種細分`)}
              </div>
            </div>
          </div>
          {hasTra ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden" }}>
                {TRA.map((t) => (
                  <div key={t.id} style={{ flex: t.trips, background: t.color }} title={`${t.label} ${t.pct.toFixed(1)}%`}></div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px", marginTop: 4 }}>
                {TRA.map((t) => (
                  <div key={t.id} className="row gap-8" style={{ fontSize: 11.5 }}>
                    <i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: t.color }}></i>
                    <span style={{ color: "var(--text)" }}>{t.label}</span>
                    <span className="muted" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                      {t.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Bug 2：非臺鐵分類 → 顯示該分類各系統 100% 單條（單一系統如高鐵=一條滿格）
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden", background: "var(--surface-2)" }}>
                {sysTrips.map((s) => (
                  <div key={s.id} style={{ flex: s.trips, background: s.color }} title={`${s.label} ${(s.trips / grpTrips * 100).toFixed(1)}%`}></div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px", marginTop: 4 }}>
                {sysTrips.map((s) => (
                  <div key={s.id} className="row gap-8" style={{ fontSize: 11.5 }}>
                    <i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: s.color }}></i>
                    <span style={{ color: "var(--text)" }}>{s.label}</span>
                    <span className="muted" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                      {(s.trips / grpTrips * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="section" style={{ marginBottom: 0, padding: 0 }}>
          <div className="section-head" style={{ padding: "14px 16px 6px", marginBottom: 0 }}>
            <div>
              <div className="section-title">
                <span className="pre">TOP 10</span>
                大車站 · 每日總車次
              </div>
              <div className="section-subtitle">
                {group.id === "all" ? "全系統" : group.label} · 已排除貓纜 4 站（962 回填占位，非真實停靠班次）
              </div>
            </div>
          </div>
          <div className="rail-top-stations" style={{ border: "none", borderTop: "1px solid var(--border)", borderRadius: 0 }}>
            <div className="rail-top-row head">
              <span>#</span>
              <span>站名</span>
              <span>系統</span>
              <span>尖峰 / 離峰</span>
              <span style={{ textAlign: "right" }}>車次</span>
            </div>
            {TOP.map((s, i) => {
              const sysMeta = RAIL_SYSTEMS_META[s.system as keyof typeof RAIL_SYSTEMS_META];
              const ratio = s.trips > 0 ? s.peak / s.trips : 0;
              return (
                <div key={`${s.system}-${s.name}-${i}`} className="rail-top-row">
                  <span className="rnk">{String(i + 1).padStart(2, "0")}</span>
                  <span className="nm">
                    {s.name}
                    {s.note && <span className="note">{s.note}</span>}
                  </span>
                  <span className="sys-pill" style={{ background: sysMeta?.color || "var(--accent)" }}>
                    {sysMeta?.short || s.system}
                  </span>
                  <div className="stack">
                    <div className="peak" style={{ width: `${ratio * 100}%` }}></div>
                    <div className="off" style={{ width: `${(1 - ratio) * 100}%` }}></div>
                  </div>
                  <span className="trips">
                    {fmt.num(s.trips)}<span className="unit">次</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S3 · 運量
// ─────────────────────────────────────────────────
function S3Ridership({ data, selectedCounty }: Props) {
  const S = data.summary;
  if (!S) return null;

  const SYS = data.systems.filter((s) => s.ridership24 != null && s.ridership24 > 0);
  const sysMaxR = Math.max(0.01, ...SYS.map((s) => s.ridership24 ?? 0));
  const M = data.traMonthly;

  // 縣市運量 ranking（可展開）
  const ridRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.ridership24 }))
    .filter((r): r is HRankRow => r.value != null && r.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="cat-block">
      <CatHeader
        num={3}
        title={<><span className="accent">運量</span> ─ 2024 全國 {S.ridership24.toFixed(1)} 億人次</>}
        tagline="台北捷運運量居冠（trtc + krtc 有資料）· 月度趨勢 + 各系統運量比"
        badge="年度 · 2024"
        badgeTone="historical"
      />

      <div className="big-callout" style={{ marginBottom: 14 }}>
        <div>
          <div className="bc-label">2024 全國年度運量</div>
          <div className="bc-big">
            {S.ridership24.toFixed(2)}<span className="unit">億人次</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.55 }}>
            <b style={{ color: "var(--accent-deep)" }}>
              {SYS.find((s) => s.id === "trtc")?.label} {(SYS.find((s) => s.id === "trtc")?.ridership24 ?? 0).toFixed(2)} 億
            </b>
            {" "}· 全國運量冠軍
          </div>
        </div>
        <div className="bc-meta">
          <div style={{ display: "grid", gap: 6 }}>
            {SYS.slice().sort((a, b) => (b.ridership24 ?? 0) - (a.ridership24 ?? 0)).slice(0, 6).map((s) => (
              <div key={s.id} className="row gap-8" style={{ fontSize: 12 }}>
                <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: s.color }}></i>
                <span style={{ minWidth: 60, fontWeight: 500 }}>{s.label}</span>
                <div style={{ flex: 1, height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${((s.ridership24 ?? 0) / sysMaxR) * 100}%`, height: "100%", background: s.color, borderRadius: 3 }}></div>
                </div>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, minWidth: 56, textAlign: "right" }}>
                  {(s.ridership24 ?? 0).toFixed(2)} 億
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 臺鐵月度 */}
      {M.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">TRA · MONTHLY</span>
                臺鐵 {M[0].ym} ~ {M.at(-1)?.ym} 月度運量
              </div>
              <div className="section-subtitle">collector 2026-Q2 後穩定，部分月不完整</div>
            </div>
            <span className="coverage-badge">⚠ 2024 月度級臺鐵缺</span>
          </div>
          <div className="tra-monthly">
            {M.map((m) => (
              <div key={m.ym} className={`tm ${m.partial ? "is-partial" : ""}`}>
                <div className="ym">{m.ym}</div>
                <div className="v">
                  {m.value.toFixed(1)}<span className="unit">M 人次</span>
                </div>
                {m.partial && <div className="tag">不完整</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 縣市運量 ranking（可展開，無 CSV/資料說明） */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANK</span>
              縣市運量 · 2024
            </div>
            <div className="section-subtitle">雙北佔多數 — 軌道運量高度集中</div>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>單位：億人次</div>
        </div>
        <ExpandableCountyRank
          rows={ridRank}
          color="var(--accent)"
          colorLow="var(--accent-ramp-3)"
          highlightCode={selectedCounty}
          decimals={2}
          topLabel="最高 5 縣市"
          botLabel="最低 5 縣市（有軌道者）"
        />
        {S.zeroStationCounties.length > 0 && (
          <div className="rank-footer">
            <Lightbulb size={14} />
            <span>
              離島 <strong>{S.zeroStationCounties.map((id) => byIdMoi[id]?.name_zh ?? id).join(" / ")}</strong> 完全無軌道，
              全國僅 {22 - S.zeroStationCounties.length} 縣市有運量資料
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ViewA Rail 主入口
// ─────────────────────────────────────────────────
export function ViewARail({ data, selectedCounty, onCountyClick }: Props) {
  const S = data.summary;
  const [railGroup, setRailGroup] = useState<RailGroup>(RAIL_GROUPS[0]);

  if (data.loading || (!S && !data.error)) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">全台概覽</span>
          <span className="small">· 軌道運輸</span>
          <Train size={18} color="var(--accent)" />
        </h1>
        <p className="hook" style={{ lineHeight: 1.7 }}>正在載入軌道資料 ...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="hero">
        <h1><span className="accent">軌道資料載入失敗</span></h1>
        <p className="hook" style={{ color: "#B91C1C", lineHeight: 1.7 }}>{data.error.message}</p>
      </div>
    );
  }

  if (!S) return null;

  return (
    <div>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· 軌道運輸</span>
              <Train size={18} color="var(--accent)" />
            </h1>
            <p className="hook" style={{ lineHeight: 1.7 }}>
              <span className="em">島嶼的軌道帳，三章看完。</span>{" "}
              全國 <b>{S.stations}</b> 站、<b>{S.lines}</b> 條、<b>{fmt.num(S.kmTotal, 0)}</b> km。
              每日 <b className="em">{fmt.num(S.dailyTrips)}</b> 班次 —
              2024 年運量 <b className="em">{S.ridership24.toFixed(1)} 億人次</b>，
              離島 <b>{S.zeroStationCounties.length}</b> 縣 0 站。
            </p>
          </div>
        </div>
      </div>

      <S1Base data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick}
        group={railGroup} setGroup={setRailGroup} />
      <S2Service data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick}
        group={railGroup} setGroup={setRailGroup} />
      <S3Ridership data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />

      <DataSourceBadge
        sources={["交通部 / 臺鐵局 / 高鐵公司", "TRTC / KRTC / TYMC / TMRT", "輕軌營運單位"]}
        updatedAt="2026-05-13"
      />
    </div>
  );
}
