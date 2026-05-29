/**
 * ViewA Rail — 軌道主題全國概覽
 *
 * 3 章節：S1 軌道家底（9 系統表）/ S2 班次與車種（24hr+ donut + Top10）/ S3 運量
 * accent: 靛藍 #4F46E5
 *
 * 設計來源：designs Mini Taiwan Info.html · view-a-rail.jsx
 */

import {
  MapPin, Route, Train, AlertTriangle, ArrowLeftRight, BarChart3,
  Share2, Download, Lightbulb,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byIdMoi } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import type { RailDataState } from "@/hooks/useRailData";
import { CatHeader } from "@/components/common/CatHeader";
import { HRankBar, type HRankRow } from "@/components/common/HRankBar";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { KPICard } from "@/components/kpi/KPICard";
import { RAIL_SYSTEMS_META } from "@/lib/queries/rail";

interface Props {
  data: RailDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

// ─────────────────────────────────────────────────
// S1 · 軌道家底
// ─────────────────────────────────────────────────
function S1Base({ data, selectedCounty }: Props) {
  const S = data.summary;
  if (!S) return null;

  const SYS = data.systems;
  const maxStations = Math.max(1, ...SYS.map((s) => s.stations));

  // 縣市車站數 ranking
  const cntyRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.stations }))
    .sort((a, b) => b.value - a.value);

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
          <div className="stat-tile-ds">臺鐵獨佔 {Math.round(((SYS.find((s) => s.id === "tra")?.km ?? 0) / Math.max(1, S.kmTotal)) * 100)}%</div>
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

      {/* 縣市車站數 ranking */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANK</span>
              縣市車站數 · 都會 vs 離島
            </div>
            <div className="section-subtitle">
              {cntyRank[0]?.name} {cntyRank[0]?.value} 站、{cntyRank[1]?.name} {cntyRank[1]?.value} 站 — 雙北獨佔 {Math.round(((cntyRank[0]?.value ?? 0) + (cntyRank[1]?.value ?? 0)) / Math.max(1, S.stations) * 100)}%
            </div>
          </div>
          {S.zeroStationCounties.length > 0 && (
            <span className="coverage-badge">⚠ 離島 {S.zeroStationCounties.length} 縣 0 站</span>
          )}
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">最多 5 縣市</h4>
            <HRankBar rows={cntyRank.slice(0, 5)} max={cntyRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty} decimals={0} />
          </div>
          <div className="col">
            <h4 className="bot">最少 5 縣市</h4>
            <HRankBar rows={cntyRank.slice(-5).reverse()} max={cntyRank[0]?.value ?? 1} color="var(--accent-ramp-3)" highlightCode={selectedCounty} decimals={0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S2 · 班次與車種
// ─────────────────────────────────────────────────
function S2Service({ data }: Props) {
  const S = data.summary;
  if (!S) return null;

  const H = data.hourly;
  const TRA = data.traBreakdown;
  const TOP = data.topStations;

  const maxHour = Math.max(1, ...H.map((h) => h.value));
  const peakHours = new Set([7, 8, 17, 18]);

  return (
    <div className="cat-block">
      <CatHeader
        num={2}
        title={<><span className="accent">班次與車種</span> ─ 每天 {fmt.num(Math.round(S.dailyTrips / 1000))}K 車次</>}
        tagline="尖峰 / 離峰、24 hr 雙峰分布、臺鐵車種佔比"
        badge="日均"
        badgeTone="sampled"
      />

      <div className="kpi-grid cols-3" style={{ marginBottom: 14 }}>
        <KPICard
          icon={<Train size={13} />}
          label="每日總停靠車次"
          value={fmt.num(S.dailyTrips)}
          unit="次/日"
          trend={{
            delta: `尖峰 ${fmt.num(S.peakTrips)} + 離峰 ${fmt.num(S.offpeakTrips)}`,
            direction: "flat",
            baseline: "9 系統合計",
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
        <KPICard
          icon={<BarChart3 size={13} />}
          label="台北捷運佔比"
          value={S.trtcShare}
          unit="%"
          trend={{
            delta: `${fmt.num(Math.round(((data.countyAggregates.find((c) => c.id_moi === "A")?.dailyTrips ?? 0))))} 班/日`,
            direction: "flat",
            baseline: "占已有運量資料系統",
            sentiment: "neutral",
          }}
        />
      </div>

      {/* 24hr 逐時 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">HOURLY</span>
              24 小時班次分布
            </div>
            <div className="section-subtitle">雙峰：早 7-9 上學上班 + 晚 17-19 下班</div>
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
          <span>單日總計 <b style={{ color: "var(--text)" }}>{fmt.num(S.dailyTrips)}</b> 班次</span>
          <span className="pill">
            尖峰時段最大值約 {fmt.num(Math.max(...Array.from(peakHours).map((h) => H[h]?.value ?? 0)))} 班/時
          </span>
        </div>
      </div>

      {/* 車種 donut + Top 10 大站（改上下排列，避免 Top 10 表格被擠太窄） */}
      <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">TRA</span>
                臺鐵車種佔比
              </div>
              <div className="section-subtitle">
                {TRA[0] ? `${TRA[0].label} 獨佔 ${TRA[0].pct.toFixed(1)}% — 通勤本位` : "—"}
              </div>
            </div>
          </div>
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
        </div>

        <div className="section" style={{ marginBottom: 0, padding: 0 }}>
          <div className="section-head" style={{ padding: "14px 16px 6px", marginBottom: 0 }}>
            <div>
              <div className="section-title">
                <span className="pre">TOP 10</span>
                大車站 · 每日總車次
              </div>
              <div className="section-subtitle">含貓纜 4 站回填，注意視覺去重</div>
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

  // 縣市運量 ranking
  const ridRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.ridership24 }))
    .filter((r) => r.value > 0)
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

      {/* 臺鐵月度（如有資料） */}
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

      {/* 縣市運量 ranking */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANK</span>
              縣市運量 · 2024
            </div>
            <div className="section-subtitle">軌道運量高度集中於雙北、雙北 + 高雄占多數</div>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>單位：億人次</div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">最高 5 縣市</h4>
            <HRankBar rows={ridRank.slice(0, 5)} max={ridRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty} decimals={2} />
          </div>
          <div className="col">
            <h4 className="bot">最低 5 縣市（有軌道者）</h4>
            <HRankBar rows={ridRank.slice(-5).reverse()} max={ridRank[0]?.value ?? 1} color="var(--accent-ramp-3)" highlightCode={selectedCounty} decimals={2} />
          </div>
        </div>
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

  // 防禦：summary 為 null 但無 error 時當 loading（hook race condition fallback）
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
        <h1>
          <span className="accent">軌道資料載入失敗</span>
        </h1>
        <p className="hook" style={{ color: "#B91C1C", lineHeight: 1.7 }}>
          {data.error.message}
        </p>
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
              台北捷運獨佔 <b>{S.trtcShare}%</b>（占已有運量資料系統），
              離島 <b>{S.zeroStationCounties.length}</b> 縣 0 站。
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Share2 size={14} /> 分享</button>
            <button className="btn"><Download size={14} /> 匯出</button>
          </div>
        </div>
      </div>

      <S1Base data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />
      <S2Service data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />
      <S3Ridership data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />

      <DataSourceBadge
        sources={["交通部 / 臺鐵局 / 高鐵公司", "TRTC / KRTC / TYMC / TMRT", "輕軌營運單位"]}
        updatedAt="2026-05-13"
      />
    </div>
  );
}
