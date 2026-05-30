/**
 * ViewB — 縣市儀錶板（manifest.county_dashboard driven）
 *
 * IA v2 (Cycle B, 2026-05-14)：依水循環層 7 tabs：
 *   overview / reservoirs(+水質) / rivers(+水質) / groundwater(+水質, 水位)
 *   / flood / supplies(用水與配送) / ranking
 *
 * 取消：原獨立「水質」tab、原「基礎設施」tab
 * 水質：拆解到對應水體（水庫/河川/地下水）內
 * 基礎設施：併入 supplies（自來水普及/漏水率/汙水廠）+ flood（雨水下水道）
 *
 * 資料：useCountyData 一次拉 LPCD + sewage + countyReservoirs
 *       useWaterQuality 共用，stationType 由 prop 鎖定
 */

import { useEffect, useMemo, useState } from "react";
import {
  Droplet,
  Waves,
  Recycle,
  CloudRain,
  Globe,
  TrendingUp,
  ChevronLeft,
  FlaskConical,
  Activity,
  Layers,
} from "lucide-react";
import type { ThemeManifest, CountyCode3, County } from "@/lib/types";
import type {
  ReservoirStatusRow,
  RainGaugeRow,
  GroundwaterStationRow,
  FloodPctRow,
} from "@/lib/queries/water";
import {
  fetchFloodPctByCounty,
  fetchRainGaugeLatest,
  fetchGroundwaterLatest,
} from "@/lib/queries/water";
import {
  fetchDetentionSummary,
  fetchStormDrainByCountyIdMoi,
  isStormDrainCovered,
  isDetentionCovered,
  findDetentionForCounty,
  type DetentionSummary,
  type StormDrainCountySummary,
} from "@/lib/queries/water-overview";
import { byCode3 } from "@/lib/counties";
import { getNearestCounty } from "@/lib/reverseGeocode";
import { fmt } from "@/lib/format";
import { KPICard } from "@/components/kpi/KPICard";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { Donut } from "@/components/charts/Donut";
import { Sparkline } from "@/components/charts/Sparkline";
import { useCountyData } from "@/hooks/useCountyData";
import { useWaterQuality } from "@/hooks/useWaterQuality";
import { useRiverWaterLevel } from "@/hooks/useRiverWaterLevel";
import { DataAgeBadge } from "@/components/DataAgeBadge";
import { ALERT_COLORS, ALERT_LABELS } from "@/lib/queries/river";

interface ViewBProps {
  manifest: ThemeManifest;
  county: CountyCode3;
  /** 全國水庫（從 App 的 useWaterKpis 傳下來） */
  allReservoirs: ReservoirStatusRow[];
  /** 全國平均 LPCD（給 Donut 排名計算） */
  nationalLpcd: number | null;
  /** 全國平均接管率 */
  nationalSewage: number | null;
  /** governance.lpcd_by_county：給 ranking 用 */
  lpcdByCountyId: Record<string, number>;
  /** governance.sewage_by_county */
  sewageByCountyId: Record<string, number>;
  onBack: () => void;
  onDrillReservoir?: (reservoirId: string) => void;
}

type TabId = "overview" | "reservoirs" | "rivers" | "groundwater" | "flood" | "supplies" | "ranking";

const TAB_DEFS: Array<{ id: TabId; label: string; icon: typeof Globe }> = [
  { id: "overview",    label: "概覽",       icon: Globe },
  { id: "reservoirs",  label: "水庫",       icon: Droplet },
  { id: "rivers",      label: "河川",       icon: Activity },
  { id: "groundwater", label: "地下水",     icon: Layers },
  { id: "flood",       label: "防洪",       icon: CloudRain },
  { id: "supplies",    label: "用水與配送", icon: Recycle },
  { id: "ranking",     label: "排名",       icon: TrendingUp },
];

export function ViewB({
  manifest: _manifest,
  county,
  allReservoirs,
  nationalLpcd,
  nationalSewage: _nationalSewage,
  lpcdByCountyId,
  sewageByCountyId,
  onBack,
  onDrillReservoir,
}: ViewBProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const c = byCode3[county];
  const data = useCountyData(county, allReservoirs);

  if (!c) {
    return (
      <div className="hero">
        <h1>未知縣市：{county}</h1>
        <button className="btn" onClick={onBack}>← 返回</button>
      </div>
    );
  }

  // 該縣市最新值
  const latestLpcd = data.lpcdHistory.length > 0 ? data.lpcdHistory[data.lpcdHistory.length - 1].lpcd : null;
  const latestSewage = data.sewageHistory.length > 0 ? data.sewageHistory[data.sewageHistory.length - 1].coverage_pct : null;

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <button className="back-link" onClick={onBack} aria-label="返回全台概覽">
          <ChevronLeft size={12} /> 返回全台概覽
        </button>
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">{c.name_zh}</span>
              <span className="small">· 水資源</span>
              <Droplet size={18} color="var(--accent)" />
            </h1>
            <div className="hook">
              <span className="em">{fmt.num(c.pop_2024_wan, 1)} 萬人</span>
              <span className="muted"> · </span>
              <span>{fmt.num(c.area_km2)} km²</span>
              <span className="muted"> · </span>
              <span>{data.countyReservoirs.length} 座水庫</span>
              <span className="muted"> · </span>
              <span className="muted">{c.region}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TAB_DEFS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <Icon size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          county={c}
          countyCode={county}
          countyReservoirs={data.countyReservoirs}
          latestLpcd={latestLpcd}
          latestSewage={latestSewage}
          nationalLpcd={nationalLpcd}
          lpcdByCountyId={lpcdByCountyId}
          onDrillReservoir={onDrillReservoir}
        />
      )}
      {tab === "reservoirs" && (
        <ReservoirsTab
          reservoirs={data.countyReservoirs}
          onDrillReservoir={onDrillReservoir}
          countyIdMoi={c.id_moi ?? null}
          countyName={c.name_zh}
        />
      )}
      {tab === "rivers" && (
        <RiverTab countyCode={county} countyIdMoi={c.id_moi ?? null} countyName={c.name_zh} />
      )}
      {tab === "groundwater" && (
        <GroundwaterTab
          countyIdMoi={c.id_moi ?? null}
          countyCode3={county}
          countyName={c.name_zh}
        />
      )}
      {tab === "flood" && (
        <FloodTab
          countyIdMoi={c.id_moi ?? null}
          countyCode3={county}
          countyName={c.name_zh}
        />
      )}
      {tab === "supplies" && (
        <SuppliesTab
          lpcdHistory={data.lpcdHistory}
          sewageHistory={data.sewageHistory}
          countyName={c.name_zh}
        />
      )}
      {tab === "ranking" && (
        <RankingTab
          county={c}
          countyCode={county}
          lpcdByCountyId={lpcdByCountyId}
          sewageByCountyId={sewageByCountyId}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Tab: Overview
// ─────────────────────────────────────────────────

function OverviewTab({
  county,
  countyCode,
  countyReservoirs,
  latestLpcd,
  latestSewage,
  nationalLpcd,
  lpcdByCountyId,
  onDrillReservoir,
}: {
  county: County;
  countyCode: CountyCode3;
  countyReservoirs: ReservoirStatusRow[];
  latestLpcd: number | null;
  latestSewage: number | null;
  nationalLpcd: number | null;
  lpcdByCountyId: Record<string, number>;
  onDrillReservoir?: (id: string) => void;
}) {
  // 計算 LPCD 排名（從 governance 縣市 dict）
  // W-1：此處依「用水量高→低」排序（rank 1 = 用水量最高），與「排名」分頁的
  // 「越低越好」方向相反但兩者皆正確 —— 用水量高 ≠ 用水效率好。文案需標清避免混淆。
  const lpcdRank = useMemo(() => {
    const entries = Object.entries(lpcdByCountyId);
    if (entries.length === 0) return null;
    const sortedByLpcdAsc = [...entries].sort((a, b) => b[1] - a[1]); // 由高到低
    const idMoi = county.id_moi;
    if (!idMoi) return null;
    const idx = sortedByLpcdAsc.findIndex(([id]) => id === idMoi);
    return idx >= 0 ? idx + 1 : null;
  }, [lpcdByCountyId, county]);

  // tier 改用「用水量」語意（非籠統前/後段），避免「用水量高=第1=好」誤讀
  const tier = lpcdRank == null ? "—" : lpcdRank <= 7 ? "用量高" : lpcdRank >= 16 ? "用量低" : "用量中";

  return (
    <>
      <div className="kpi-grid cols-4" style={{ marginBottom: "var(--section-gap)" }}>
        <KPICard
          icon={<Waves size={13} />}
          label={<>水庫{countyReservoirs.length > 0 && <span style={liveBadgeStyle}>LIVE</span>}</>}
          value={countyReservoirs.length.toString()}
          unit="座"
          trend={countyReservoirs.length > 0 ? {
            delta: `平均 ${(countyReservoirs.reduce((s, r) => s + (r.storage_ratio_pct ?? 0), 0) / countyReservoirs.length).toFixed(1)}%`,
            direction: "flat",
            baseline: "蓄水率",
            sentiment: "neutral",
          } : undefined}
        />
        <KPICard
          icon={<Recycle size={13} />}
          label="汙水廠"
          value="—"
          unit="座"
          trend={{ delta: "Phase 1+ 待補", direction: "flat", baseline: "", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Droplet size={13} />}
          label={<>LPCD{latestLpcd != null && <span style={periodBadgeStyle}>年度</span>}</>}
          value={latestLpcd != null ? Math.round(latestLpcd).toString() : "—"}
          unit="L"
          trend={
            latestLpcd != null && nationalLpcd != null
              ? {
                  delta: `${latestLpcd > nationalLpcd ? "+" : ""}${(latestLpcd - nationalLpcd).toFixed(0)}L`,
                  direction: latestLpcd > nationalLpcd ? "up" : "down",
                  baseline: `全國 ${Math.round(nationalLpcd)}L`,
                  sentiment: "neutral",
                }
              : undefined
          }
        />
        <KPICard
          icon={<Recycle size={13} />}
          label={<>接管率{latestSewage != null && <span style={periodBadgeStyle}>年度</span>}</>}
          value={latestSewage != null ? latestSewage.toFixed(1) : "—"}
          unit="%"
          trend={{ delta: "—", direction: "flat", baseline: "最新年度", sentiment: "neutral" }}
        />
      </div>

      {/* 縣市水庫卡（sparkline 用當前 rate 模擬） */}
      {countyReservoirs.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="pre">RESERVOIRS</span>
              {county.name_zh} {countyReservoirs.length} 座主要水庫
              <span style={liveBadgeStyle}>LIVE</span>
            </div>
          </div>
          <div className="kpi-grid">
            {countyReservoirs.map((r) => {
              const rate = r.storage_ratio_pct ?? 0;
              const danger = rate < 30;
              return (
                <div
                  key={r.reservoir_id}
                  className="kpi-card"
                  style={{ cursor: onDrillReservoir ? "pointer" : "default" }}
                  onClick={() => onDrillReservoir?.(r.reservoir_id)}
                >
                  <div className="kpi-head">
                    <div className="kpi-label">
                      <span className="ico"><Waves size={13} /></span>
                      {r.name}
                    </div>
                    {danger && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--danger)", padding: "2px 6px", background: "var(--danger-soft)", borderRadius: 4 }}>
                        🔴 警戒
                      </span>
                    )}
                  </div>
                  <div className="kpi-value">
                    {rate.toFixed(1)}
                    <span className="unit">%</span>
                  </div>
                  <div className="kpi-trend">
                    <span className="muted">
                      容量 {fmt.num(Number(r.effective_capacity_wan ?? 0))} 萬 m³
                    </span>
                  </div>
                  <div className="kpi-sparkline">
                    {/* 沒歷史資料，畫個假 sparkline 代表「目前值」 */}
                    <Sparkline
                      data={[rate * 0.9, rate * 0.95, rate * 1.02, rate]}
                      color={danger ? "var(--danger)" : "var(--accent)"}
                      width={80}
                      height={24}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="muted mt-8" style={{ fontSize: 11 }}>
            注：30 天時序圖待 Phase 1+ 接 get_reservoir_timeseries RPC
          </div>
        </div>
      )}

      {/* LPCD 排名 Donut */}
      {lpcdRank != null && (
        <div className="section" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
          <div className="section-title" style={{ alignSelf: "flex-start", marginBottom: 12 }}>
            <span className="pre">RANK</span>
            {county.name_zh} 人均用水量排名（高→低）
          </div>
          <Donut value={lpcdRank} total={22} size={110} tier={tier} />
          <div className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            人均用水量在 22 縣市中第 <b>{lpcdRank}</b> 高（用水量高→低排序）
            <br />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              ※ 用水量高 ≠ 用水效率好；節水成效見「排名」分頁（越低越好）
            </span>
          </div>
        </div>
      )}

      <div className="source-badge">
        <span className="field">資料來源 <b>水利署、環境部、戶政司</b></span>
        <span className="field">縣市代碼 <b>{countyCode} / {county.name_zh}</b></span>
        <span className="spacer" />
        <a href="#">資料說明</a>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: Reservoirs
// ─────────────────────────────────────────────────

function ReservoirsTab({
  reservoirs,
  onDrillReservoir,
  countyIdMoi,
  countyName,
}: {
  reservoirs: ReservoirStatusRow[];
  onDrillReservoir?: (id: string) => void;
  countyIdMoi: string | null;
  countyName: string;
}) {
  const hasReservoirs = reservoirs.length > 0;
  const avg = hasReservoirs ? reservoirs.reduce((s, r) => s + (r.storage_ratio_pct ?? 0), 0) / reservoirs.length : 0;
  const alert = reservoirs.filter((r) => (r.storage_ratio_pct ?? 100) < 30);
  return (
    <>
      {hasReservoirs ? (
        <>
          <div className="insight">
            <div className="ico"><Waves size={18} /></div>
            <div className="body">
              {reservoirs.length} 座水庫平均蓄水率 <b>{avg.toFixed(1)}%</b>。
              {alert.length > 0 && (
                <>{" "}<b className="em">{alert.length} 座跌破 30% 紅線</b>（{alert.map((r) => r.name).join("、")}）。</>
              )}
            </div>
          </div>
          <div className="kpi-grid">
            {reservoirs.map((r) => {
              const rate = r.storage_ratio_pct ?? 0;
              const danger = rate < 30;
              return (
                <div
                  key={r.reservoir_id}
                  className="kpi-card"
                  style={{ cursor: onDrillReservoir ? "pointer" : "default" }}
                  onClick={() => onDrillReservoir?.(r.reservoir_id)}
                >
                  <div className="kpi-head">
                    <div className="kpi-label">
                      <span className="ico"><Waves size={13} /></span>
                      {r.name}
                    </div>
                  </div>
                  <div className="kpi-value">{rate.toFixed(1)}<span className="unit">%</span></div>
                  <div className="muted mt-8" style={{ fontSize: 11.5 }}>
                    水位 {Number(r.water_level_m ?? 0).toFixed(1)}m · 容量 {fmt.num(Number(r.effective_capacity_wan ?? 0))} 萬m³
                    {danger && " · 🔴 警戒"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="section" style={{ textAlign: "center", padding: 36, marginBottom: "var(--section-gap)" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💧</div>
          <div className="muted">該縣市無主要水庫資料（lat/lng nearest-centroid 未匹配）</div>
        </div>
      )}

      {/* 水庫水質 section — Cycle B IA 重組：水質歸到對應水體 tab */}
      <WaterQualitySection
        countyIdMoi={countyIdMoi}
        countyName={countyName}
        stationType="reservoir"
      />
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: Rivers（Cycle B — 河川水位 / 流量 / 水質）
// ─────────────────────────────────────────────────

function RiverTab({
  countyCode,
  countyIdMoi,
  countyName,
}: {
  countyCode: CountyCode3;
  countyIdMoi: string | null;
  countyName: string;
}) {
  const river = useRiverWaterLevel();
  const summary = river.byCode3[countyCode];
  const countyStations = useMemo(
    () => river.stations.filter((s) => s.county_code3 === countyCode),
    [river.stations, countyCode]
  );

  // 該縣市在 22 縣市 alert_pct 排名（高 = alert 多 = 危險）
  const rank = useMemo(() => {
    if (!summary) return null;
    const sorted = river.countySummary;
    const idx = sorted.findIndex((s) => s.code3 === countyCode);
    return idx >= 0 ? { rank: idx + 1, total: sorted.length } : null;
  }, [river.countySummary, summary, countyCode]);

  const hasData = countyStations.length > 0;
  // 注：水利署水位 freshness < 1hr + collector cron + RPC = 雙條件符合 LIVE
  const isLive = !!summary?.latest_observed_at;

  return (
    <>
      <div className="section" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RIVERS</span>
              {countyName} 河川水位
              {isLive && <span style={liveBadgeStyle}>LIVE</span>}
            </div>
            <div className="section-subtitle">
              水利署即時水位 · 每 10 分鐘更新
              {summary?.latest_observed_at && (
                <DataAgeBadge sampledAt={summary.latest_observed_at} label="最近" />
              )}
            </div>
          </div>
        </div>

        {river.loading && (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            ⏳ 載入河川水位資料中…
          </div>
        )}

        {!river.loading && !hasData && (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            該縣市無水位測站 reading（或 normalize 後對不上 county）
          </div>
        )}

        {!river.loading && hasData && (
          <>
            <div className="kpi-grid cols-4">
              <KPICard
                icon={<Activity size={13} />}
                label="水位站"
                value={summary!.n_total.toString()}
                unit="站"
                trend={{
                  delta: `${summary!.n_with_alert} 有警戒值`,
                  direction: "flat",
                  baseline: "",
                  sentiment: "neutral",
                }}
              />
              <KPICard
                icon={<Activity size={13} />}
                label={<>達警戒{summary!.n_any_alert > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: "var(--danger)" }}>●</span>}</>}
                value={summary!.n_any_alert.toString()}
                unit="站"
                trend={{
                  // 一級警戒最嚴重，優先顯示（水利署慣例 1=最高水位門檻）
                  delta:
                    summary!.n_alert_1 > 0
                      ? `${summary!.n_alert_1} 一級`
                      : summary!.n_alert_2 > 0
                        ? `${summary!.n_alert_2} 二級`
                        : summary!.n_alert_3 > 0
                          ? `${summary!.n_alert_3} 三級`
                          : "正常",
                  direction: summary!.n_any_alert > 0 ? "up" : "flat",
                  baseline: "",
                  sentiment: summary!.n_any_alert > 0 ? "negative" : "neutral",
                }}
              />
              <KPICard
                icon={<Activity size={13} />}
                label="警戒佔比"
                value={summary!.alert_pct.toFixed(1)}
                unit="%"
                trend={{
                  delta:
                    rank != null ? `第 ${rank.rank} / ${rank.total}` : "—",
                  direction: "flat",
                  baseline: "22 縣市排名",
                  sentiment: "neutral",
                }}
              />
              <KPICard
                icon={<Activity size={13} />}
                label="最高水位"
                value={
                  summary!.max_water_level_m != null
                    ? summary!.max_water_level_m.toFixed(1)
                    : "—"
                }
                unit="m"
                trend={{
                  delta: "縣市內最高",
                  direction: "flat",
                  baseline: "",
                  sentiment: "neutral",
                }}
              />
            </div>

            {/* 測站清單 */}
            <div className="section" style={{ marginTop: "var(--section-gap)" }}>
              <div className="section-head">
                <div>
                  <div className="section-title">
                    <span className="pre">STATIONS</span>
                    {countyName} {countyStations.length} 座河川水位站
                  </div>
                  <div className="section-subtitle">
                    依當前水位與警戒水位門檻著色
                  </div>
                </div>
              </div>
              <div className="kpi-grid" style={{ gap: 8 }}>
                {countyStations.map((s) => {
                  const lvl = s.alert_level;
                  const color = lvl != null ? ALERT_COLORS[lvl] : "#94A3B8";
                  const label = lvl != null ? ALERT_LABELS[lvl] : "未設警戒值";
                  return (
                    <div
                      key={s.station_id}
                      className="kpi-card"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <div className="kpi-head">
                        <div className="kpi-label">
                          <span className="ico"><Activity size={13} /></span>
                          {s.station_name}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color,
                            padding: "2px 6px",
                            background: `${color}22`,
                            borderRadius: 4,
                          }}
                        >
                          {label}
                        </span>
                      </div>
                      <div className="kpi-value">
                        {s.water_level_m != null ? s.water_level_m.toFixed(2) : "—"}
                        <span className="unit">m</span>
                      </div>
                      <div className="muted mt-8" style={{ fontSize: 11.5 }}>
                        {s.river_name && <>{s.river_name} · </>}
                        {s.alert_level_1_m != null && (
                          <>警戒 {s.alert_level_1_m}m</>
                        )}
                        {s.alert_level_2_m != null && (
                          <> / {s.alert_level_2_m}m</>
                        )}
                        {s.alert_level_3_m != null && (
                          <> / {s.alert_level_3_m}m</>
                        )}
                      </div>
                      <DataAgeBadge sampledAt={s.observed_at} label="觀測" />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <WaterQualitySection
        countyIdMoi={countyIdMoi}
        countyName={countyName}
        stationType="river"
      />
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: Groundwater（Cycle B — 地下水位 / 水質 / 分區）
// ─────────────────────────────────────────────────

// 地下水分區涵蓋（manifest v1.1 affected_counties）：西部 9 區覆蓋的縣市
const GROUNDWATER_COVERED_IDMOI = new Set([
  "A", "F", "H", "O", "J", "K", "B", "N", "M", "P", "Q", "I", "D", "E", "T",
]);

function GroundwaterTab({
  countyIdMoi,
  countyCode3,
  countyName,
}: {
  countyIdMoi: string | null;
  countyCode3: CountyCode3;
  countyName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<GroundwaterStationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await fetchGroundwaterLatest();
        if (cancelled) return;
        setStations(rows);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countyStations = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.lat != null &&
          s.lng != null &&
          getNearestCounty(s.lng, s.lat) === countyCode3
      ),
    [stations, countyCode3]
  );

  const summary = useMemo(() => {
    if (countyStations.length === 0) return null;
    const withReading = countyStations.filter((s) => s.water_level_m != null);
    const avgLevel =
      withReading.length > 0
        ? withReading.reduce((acc, r) => acc + (r.water_level_m ?? 0), 0) /
          withReading.length
        : null;
    let deltaSum = 0;
    let deltaN = 0;
    let rising = 0;
    let falling = 0;
    let steady = 0;
    let latestObservedAt: string | null = null;
    for (const s of countyStations) {
      if (s.delta_24h != null) {
        deltaSum += s.delta_24h;
        deltaN += 1;
        const abs = Math.abs(s.delta_24h);
        if (abs < 0.005) steady += 1;
        else if (s.delta_24h > 0) rising += 1;
        else falling += 1;
      }
      if (s.observed_at && (!latestObservedAt || s.observed_at > latestObservedAt)) {
        latestObservedAt = s.observed_at;
      }
    }
    return {
      stations: countyStations.length,
      stationsWithReading: withReading.length,
      avgLevelM: avgLevel,
      avgDelta24hCm: deltaN > 0 ? (deltaSum / deltaN) * 100 : null,
      rising,
      falling,
      steady,
      latestObservedAt,
    };
  }, [countyStations]);

  const inCoverage = countyIdMoi ? GROUNDWATER_COVERED_IDMOI.has(countyIdMoi) : false;
  const showWarningNoCoverage = !loading && !error && !inCoverage;
  const showWarningCoveredButEmpty =
    !loading && !error && inCoverage && countyStations.length === 0;

  return (
    <>
      <div className="section" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">GW LEVEL</span>
              {countyName} 地下水位
              {summary && <span style={liveBadgeStyle}>LIVE</span>}
            </div>
            <div className="section-subtitle">
              realtime.groundwater_level_readings · 全國 959 監測井（collector cron 每小時）
            </div>
          </div>
          {summary?.latestObservedAt && (
            <DataAgeBadge sampledAt={summary.latestObservedAt} label="最新觀測" />
          )}
        </div>

        {loading && (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            讀取中…
          </div>
        )}

        {error && (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5, color: "#B91C1C" }}>
            ❌ 讀取失敗：{error}
          </div>
        )}

        {showWarningNoCoverage && (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            ⚠️ 資料未開放 — {countyName} 不在地下水分區涵蓋範圍（水利署西部 9 分區 only）
          </div>
        )}

        {showWarningCoveredButEmpty && (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            ⚠️ {countyName} 雖在地下水分區範圍內，但目前無 active 監測井 reading
          </div>
        )}

        {summary && (
          <div className="kpi-grid cols-4" style={{ marginTop: 12 }}>
            <KPICard
              icon={<Layers size={13} />}
              label="監測井"
              value={summary.stations.toString()}
              unit="井"
              trend={{
                delta: `有讀值 ${summary.stationsWithReading}`,
                direction: "flat",
                baseline: "",
                sentiment: "neutral",
              }}
            />
            <KPICard
              icon={<Waves size={13} />}
              label="平均水位"
              value={summary.avgLevelM != null ? summary.avgLevelM.toFixed(1) : "—"}
              unit="m"
              trend={{
                delta: "井口至水面",
                direction: "flat",
                baseline: "",
                sentiment: "neutral",
              }}
            />
            <KPICard
              icon={<TrendingUp size={13} />}
              label="24h 變化"
              value={
                summary.avgDelta24hCm != null
                  ? `${summary.avgDelta24hCm >= 0 ? "+" : ""}${summary.avgDelta24hCm.toFixed(1)}`
                  : "—"
              }
              unit="cm"
              trend={{
                delta: summary.avgDelta24hCm != null
                  ? (summary.avgDelta24hCm > 0 ? "回補" : summary.avgDelta24hCm < 0 ? "下降" : "穩定")
                  : "—",
                direction: summary.avgDelta24hCm != null
                  ? (summary.avgDelta24hCm > 0 ? "up" : summary.avgDelta24hCm < 0 ? "down" : "flat")
                  : "flat",
                baseline: "縣均",
                sentiment: summary.avgDelta24hCm != null && summary.avgDelta24hCm > 0 ? "positive" : "neutral",
              }}
            />
            <KPICard
              icon={<Activity size={13} />}
              label="井位分布"
              value={`${summary.rising}↑ ${summary.falling}↓ ${summary.steady}—`}
              unit=""
              trend={{
                delta: `回補 / 下降 / 穩定`,
                direction: "flat",
                baseline: "",
                sentiment: "neutral",
              }}
            />
          </div>
        )}
      </div>

      <WaterQualitySection
        countyIdMoi={countyIdMoi}
        countyName={countyName}
        stationType="groundwater"
      />
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: Flood（Cycle B — 淹水 / 滯洪池 / 雨水下水道 / 即時雨量）
// ─────────────────────────────────────────────────

type FloodScenario = 200 | 350 | 500;

function FloodTab({
  countyIdMoi,
  countyCode3,
  countyName,
}: {
  countyIdMoi: string | null;
  countyCode3: CountyCode3;
  countyName: string;
}) {
  const [scenario, setScenario] = useState<FloodScenario>(350);
  const [loading, setLoading] = useState(true);
  const [floodByScenario, setFloodByScenario] = useState<
    Record<FloodScenario, FloodPctRow[]>
  >({ 200: [], 350: [], 500: [] });
  const [rainStations, setRainStations] = useState<RainGaugeRow[]>([]);
  const [detention, setDetention] = useState<DetentionSummary | null>(null);
  const [stormDrain, setStormDrain] = useState<StormDrainCountySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const tasks: Array<Promise<unknown>> = [
        fetchFloodPctByCounty(200, 24),
        fetchFloodPctByCounty(350, 24),
        fetchFloodPctByCounty(500, 24),
        fetchRainGaugeLatest(),
        isDetentionCovered(countyIdMoi) ? fetchDetentionSummary() : Promise.resolve(null),
        isStormDrainCovered(countyIdMoi)
          ? fetchStormDrainByCountyIdMoi(countyIdMoi)
          : Promise.resolve(null),
      ];
      const results = await Promise.allSettled(tasks);
      if (cancelled) return;
      const get = <T,>(idx: number, fallback: T): T =>
        results[idx].status === "fulfilled"
          ? ((results[idx] as PromiseFulfilledResult<T>).value ?? fallback)
          : fallback;
      const failed = results
        .map((r, i) => (r.status === "rejected" ? i : -1))
        .filter((i) => i >= 0);
      if (failed.length > 0) {
        // eslint-disable-next-line no-console
        console.warn("[FloodTab] some queries failed:", failed);
      }
      setFloodByScenario({
        200: get(0, [] as FloodPctRow[]),
        350: get(1, [] as FloodPctRow[]),
        500: get(2, [] as FloodPctRow[]),
      });
      setRainStations(get(3, [] as RainGaugeRow[]));
      setDetention(get<DetentionSummary | null>(4, null));
      setStormDrain(get<StormDrainCountySummary | null>(5, null));
      setError(null);
      setLoading(false);
    })().catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [countyIdMoi]);

  const countyFloodPct = useMemo(() => {
    if (!countyIdMoi) return null;
    const row = floodByScenario[scenario].find((r) => r.county_id === countyIdMoi);
    return row ?? null;
  }, [countyIdMoi, scenario, floodByScenario]);

  const countyRain = useMemo(() => {
    const stations = rainStations.filter(
      (s) =>
        s.lat != null &&
        s.lng != null &&
        getNearestCounty(s.lng, s.lat) === countyCode3
    );
    const with24 = stations.filter((s) => s.precipitation_24hr != null);
    const avg24 =
      with24.length > 0
        ? with24.reduce((acc, s) => acc + (s.precipitation_24hr ?? 0), 0) /
          with24.length
        : null;
    const max24Station =
      with24.length > 0
        ? with24.reduce((best, s) =>
            (s.precipitation_24hr ?? 0) > (best.precipitation_24hr ?? 0) ? s : best
          )
        : null;
    let latestObservedAt: string | null = null;
    for (const s of stations) {
      if (s.observed_at && (!latestObservedAt || s.observed_at > latestObservedAt)) {
        latestObservedAt = s.observed_at;
      }
    }
    return { stations: stations.length, avg24, max24Station, latestObservedAt };
  }, [rainStations, countyCode3]);

  const detentionRow = useMemo(
    () => findDetentionForCounty(detention, countyIdMoi),
    [detention, countyIdMoi]
  );

  const hasDetentionCoverage = isDetentionCovered(countyIdMoi);
  const hasStormDrainCoverage = isStormDrainCovered(countyIdMoi);

  return (
    <>
      {/* FLOOD KPI + scenario switch */}
      <div className="section" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">FLOOD</span>
              {countyName} 淹水高潛勢
              {countyFloodPct && <span style={periodBadgeStyle}>靜態</span>}
            </div>
            <div className="section-subtitle">
              flood_hazard_pct_by_county MV · NLDCB 24hr 場景
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {([200, 350, 500] as FloodScenario[]).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={scenario === s ? "btn primary" : "btn ghost"}
                style={{ fontSize: 11, padding: "4px 10px" }}
              >
                {s}mm
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            讀取中…
          </div>
        ) : error ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5, color: "#B91C1C" }}>
            ❌ 讀取失敗：{error}
          </div>
        ) : countyFloodPct ? (
          <div className="kpi-grid cols-2" style={{ marginTop: 12 }}>
            <KPICard
              icon={<CloudRain size={13} />}
              label="淹水高潛勢佔比"
              value={countyFloodPct.pct_of_county.toFixed(1)}
              unit="%"
              trend={{
                delta: `情境 ${scenario}mm/24hr`,
                direction: "flat",
                baseline: "全縣面積",
                sentiment: "neutral",
              }}
            />
            <KPICard
              icon={<Layers size={13} />}
              label="淹水面積"
              value={fmt.num(countyFloodPct.hazard_km2, 1)}
              unit="km²"
              trend={{
                delta: `情境 ${scenario}mm/24hr`,
                direction: "flat",
                baseline: "全縣模擬",
                sentiment: "neutral",
              }}
            />
          </div>
        ) : (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            {countyName} 該情境無資料
          </div>
        )}
      </div>

      {/* DETENTION */}
      <div className="section" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">DETENTION</span>
              {countyName} 滯洪池
              {detentionRow && <span style={periodBadgeStyle}>靜態</span>}
              {!hasDetentionCoverage && <span style={coverageWarningBadgeStyle}>資料未開放</span>}
            </div>
            <div className="section-subtitle">
              detention_basins 表 · 涵蓋臺北 / 新北 / 桃園 / 臺南 / 高雄 + 3 科學園區
            </div>
          </div>
        </div>
        {loading && hasDetentionCoverage ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            讀取中…
          </div>
        ) : !hasDetentionCoverage ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            ⚠️ {countyName} 不在滯洪池 dataset 涵蓋範圍（5 縣市 + 3 科園 only）
          </div>
        ) : detentionRow ? (
          <div className="kpi-grid cols-2" style={{ marginTop: 12 }}>
            <KPICard
              icon={<Layers size={13} />}
              label="滯洪池"
              value={detentionRow.count.toString()}
              unit="座"
            />
            <KPICard
              icon={<Droplet size={13} />}
              label="設計總容量"
              value={
                detentionRow.total_vol_m3 != null
                  ? fmt.num(detentionRow.total_vol_m3 / 10000, 1)
                  : "—"
              }
              unit={detentionRow.total_vol_m3 != null ? "萬 m³" : ""}
              trend={
                detentionRow.total_vol_m3 == null
                  ? {
                      delta: "容量待補",
                      direction: "flat",
                      baseline: "來源缺設計容量欄（缺值非 0）",
                      sentiment: "neutral",
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            {countyName} 在涵蓋範圍內但目前無滯洪池資料
          </div>
        )}
      </div>

      {/* STORM DRAIN */}
      <div className="section" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">STORM DRAIN</span>
              {countyName} 雨水下水道
              {stormDrain && <span style={periodBadgeStyle}>靜態</span>}
              {!hasStormDrainCoverage && <span style={coverageWarningBadgeStyle}>資料未開放</span>}
            </div>
            <div className="section-subtitle">
              storm_drainage_pipes + manholes · 涵蓋臺北 / 臺中 / 桃園 / 嘉義市
            </div>
          </div>
        </div>
        {loading && hasStormDrainCoverage ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            讀取中…
          </div>
        ) : !hasStormDrainCoverage ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            ⚠️ {countyName} 不在雨水下水道 dataset 涵蓋範圍（4 縣市 only）
          </div>
        ) : stormDrain ? (
          <div className="kpi-grid cols-2" style={{ marginTop: 12 }}>
            <KPICard
              icon={<Activity size={13} />}
              label="管線"
              value={fmt.num(stormDrain.pipes)}
              unit="條"
            />
            <KPICard
              icon={<Layers size={13} />}
              label="人孔"
              value={fmt.num(stormDrain.manholes)}
              unit="個"
            />
          </div>
        ) : (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            {countyName} 雨水下水道資料目前為空
          </div>
        )}
      </div>

      {/* RAIN GAUGE */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RAIN</span>
              {countyName} 即時雨量站
              {countyRain.stations > 0 && <span style={liveBadgeStyle}>LIVE</span>}
            </div>
            <div className="section-subtitle">
              realtime.rain_gauge_readings · collector cron 全國 1306 站
            </div>
          </div>
          {countyRain.latestObservedAt && (
            <DataAgeBadge sampledAt={countyRain.latestObservedAt} label="最新觀測" />
          )}
        </div>
        {loading ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            讀取中…
          </div>
        ) : countyRain.stations === 0 ? (
          <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
            ⚠️ {countyName} 目前無 active 雨量站
          </div>
        ) : (
          <div className="kpi-grid cols-3" style={{ marginTop: 12 }}>
            <KPICard
              icon={<CloudRain size={13} />}
              label="觀測站"
              value={countyRain.stations.toString()}
              unit="站"
            />
            <KPICard
              icon={<Droplet size={13} />}
              label="24hr 均雨量"
              value={countyRain.avg24 != null ? countyRain.avg24.toFixed(1) : "—"}
              unit="mm"
              trend={{
                delta: "縣均",
                direction: "flat",
                baseline: "",
                sentiment: "neutral",
              }}
            />
            <KPICard
              icon={<TrendingUp size={13} />}
              label="24hr 最大站"
              value={
                countyRain.max24Station?.precipitation_24hr != null
                  ? countyRain.max24Station.precipitation_24hr.toFixed(1)
                  : "—"
              }
              unit="mm"
              trend={{
                delta: countyRain.max24Station?.station_name ?? "—",
                direction: "flat",
                baseline: "",
                sentiment: "neutral",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

const coverageWarningBadgeStyle: React.CSSProperties = {
  marginLeft: 6,
  fontSize: 9,
  fontWeight: 700,
  color: "#B45309",
  background: "#FEF3C7",
  padding: "1px 4px",
  borderRadius: 3,
};

// ─────────────────────────────────────────────────
// Tab: Usage（LPCD + 接管率歷年）
// ─────────────────────────────────────────────────

function SuppliesTab({
  lpcdHistory,
  sewageHistory,
  countyName,
}: {
  lpcdHistory: Array<{ year: number; lpcd: number | null }>;
  sewageHistory: Array<{ year: number; coverage_pct: number | null }>;
  countyName: string;
}) {
  const lpcdData: TrendPoint[] = lpcdHistory
    .filter((d) => d.lpcd != null)
    .map((d) => ({ x: d.year, y: d.lpcd! }));
  const sewageData: TrendPoint[] = sewageHistory
    .filter((d) => d.coverage_pct != null)
    .map((d) => ({ x: d.year, y: d.coverage_pct! }));
  const latestLpcdYear = lpcdData.length > 0 ? lpcdData[lpcdData.length - 1].x : null;
  const latestSewageYear = sewageData.length > 0 ? sewageData[sewageData.length - 1].x : null;

  return (
    <>
      {/* USAGE — LPCD（年度） */}
      {lpcdData.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TREND</span>
              {countyName} 人均日用水量 LPCD 歷年（{lpcdData[0].x} – {latestLpcdYear}）
              <DataAgeBadge
                sampledAt={latestLpcdYear ? `${latestLpcdYear}-12-31T00:00:00Z` : null}
                label="最新年度"
                forceClass="annual"
              />
            </div>
            <div className="section-subtitle">資料來源：經濟部水利署 datagov:8316（年度，無 collector cron）</div>
          </div>
          <TrendChart
            series={[{ name: "LPCD", color: "var(--accent)", data: lpcdData }]}
            xLabels={lpcdData.map((d) => String(d.x))}
            height={200}
            showLegend={false}
          />
        </div>
      )}

      {/* SEWAGE 接管率（年度） */}
      {sewageData.length > 0 ? (
        <div className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TREND</span>
              污水接管率歷年
              <DataAgeBadge
                sampledAt={latestSewageYear ? `${latestSewageYear}-12-31T00:00:00Z` : null}
                label="最新年度"
                forceClass="annual"
              />
            </div>
            <div className="section-subtitle">資料來源：內政部營建署 datagov:26815（年度）</div>
          </div>
          <TrendChart
            series={[{ name: "接管率", color: "#10B981", data: sewageData }]}
            xLabels={sewageData.map((d) => String(d.x))}
            height={200}
            showLegend={false}
            yMin={0}
            yMax={100}
          />
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, padding: 14 }}>
          ※ 接管率上游 datagov 26815 只提供最新年（無歷年），歷年走勢待 Phase 1+ 補
        </div>
      )}

      {/* INFRASTRUCTURE（合併自原「基礎設施」tab） */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">WWTP</span>
              {countyName} 汙水廠
            </div>
            <div className="section-subtitle">
              sewage_treatment_plants 表 82 座已建（座標 NULL 待 TGOS 反查）
            </div>
          </div>
        </div>
        <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
          🚧 縣市汙水廠 count + map layer 待 Cycle D
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">WATER FACILITIES</span>
              給水設施 / 自來水普及率
            </div>
            <div className="section-subtitle">
              water_facilities 表 609 處已建（Cycle D2 待接 query）
            </div>
          </div>
        </div>
        <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
          🚧 給水普及率 待 Cycle D2
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">LOSS RATE</span>
              漏水率
              <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#B91C1C", background: "#FEE2E2", padding: "1px 4px", borderRadius: 3 }}>
                COVERAGE 不全
              </span>
            </div>
            <div className="section-subtitle">
              datagov 155665 漏水率無 22 縣市對齊版（台水全國 + 北水單市）
            </div>
          </div>
        </div>
        <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12.5 }}>
          ⚠️ coverage 不全，是否要對外呈現待 Cycle K 評估
        </div>
      </div>

      <div className="source-badge">
        <span className="field">datagov:8316 · datagov:26815 · sewage_treatment_plants · water_facilities</span>
        <span className="field">⚠ 全部年度 / 靜態資料（非 LIVE）</span>
        <span className="spacer" />
        <a href="#">資料說明</a>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: Ranking（縣市在 22 縣市的排名）
// ─────────────────────────────────────────────────

function RankingTab({
  county,
  countyCode,
  lpcdByCountyId,
  sewageByCountyId,
}: {
  county: { id_moi?: string; name_zh: string };
  countyCode: CountyCode3;
  lpcdByCountyId: Record<string, number>;
  sewageByCountyId: Record<string, number>;
}) {
  const idMoi = county.id_moi;
  if (!idMoi) return <div className="muted">未知 id_moi</div>;

  const metrics: Array<{
    key: "lpcd" | "sewage";
    label: string;
    unit: string;
    better: "higher" | "lower";
    by: Record<string, number>;
  }> = [
    { key: "lpcd",   label: "人均日用水量",   unit: "L", better: "lower",  by: lpcdByCountyId },
    { key: "sewage", label: "污水接管率",     unit: "%", better: "higher", by: sewageByCountyId },
  ];

  return (
    <div>
      <div className="muted mb-12" style={{ marginBottom: 14 }}>
        {county.name_zh} 在 22 縣市的位次（依各指標排序）
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {metrics.map((m) => {
          const entries = Object.entries(m.by);
          if (entries.length === 0) {
            return (
              <div key={m.key} className="section" style={{ marginBottom: 0 }}>
                <div className="section-title">{m.label}</div>
                <div className="muted" style={{ fontSize: 12 }}>資料未就緒</div>
              </div>
            );
          }
          const sorted = [...entries].sort((a, b) =>
            m.better === "higher" ? b[1] - a[1] : a[1] - b[1]
          );
          const rank = sorted.findIndex(([id]) => id === idMoi) + 1;
          const myVal = m.by[idMoi];
          return (
            <div key={m.key} className="section" style={{ marginBottom: 0 }}>
              <div style={{ marginBottom: 12 }}>
                {/* title row：title + LIVE badge + 越高越好 badge 在同一行 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    className="section-title"
                    style={{ fontSize: 14, minWidth: 0, flex: "1 1 auto" }}
                  >
                    {m.label}
                    <span style={periodBadgeStyle}>年度</span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 5,
                      background: m.better === "higher" ? "var(--positive-soft)" : "var(--accent-soft)",
                      color: m.better === "higher" ? "#047857" : "var(--accent-deep)",
                      flexShrink: 0,
                    }}
                  >
                    {m.better === "higher" ? "越高越好" : "越低越好"}
                  </span>
                </div>
                {/* description row：獨占一行，不再被 badge 擠 */}
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  {county.name_zh} 第 <b style={{ color: "var(--accent-deep)" }}>{rank}</b> / {entries.length}
                  {" · "}值 <b style={{ color: "var(--text)" }}>{fmt.num(myVal, 1)} {m.unit}</b>
                </div>
              </div>
              <div style={{ display: "flex", gap: 2, height: 26, position: "relative" }}>
                {sorted.map(([id, v], i) => (
                  <div
                    key={id}
                    title={`${id}: ${fmt.num(v, 1)} ${m.unit}`}
                    style={{
                      flex: 1,
                      background:
                        id === idMoi
                          ? "var(--accent)"
                          : `color-mix(in srgb, var(--accent) ${Math.max(8, 80 - i * 4)}%, transparent)`,
                      borderRadius: 3,
                      position: "relative",
                    }}
                  >
                    {id === idMoi && (
                      <span style={{
                        position: "absolute",
                        top: -18,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--accent-deep)",
                        whiteSpace: "nowrap",
                      }}>
                        第 {rank} 名
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted mt-12" style={{ fontSize: 11, padding: 12 }}>
        countyCode={countyCode} · 排名以 governance.{`{lpcd|sewage}`}_by_county 計算（最新年度）
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Section: WaterQuality (Cycle A + B — 共用，由 stationType prop 鎖定水體類型)
//   reservoir → ReservoirsTab；river → RiverTab；groundwater → GroundwaterTab
// ─────────────────────────────────────────────────

function WaterQualitySection({
  countyIdMoi,
  countyName,
  stationType,
}: {
  countyIdMoi: string | null;
  countyName: string;
  stationType: "reservoir" | "river" | "groundwater";
}) {
  const [param, setParam] = useState<"DO" | "BOD" | "pH">("DO");

  const { loading, error, countySummary, stations } = useWaterQuality(
    param,
    countyIdMoi,
    stationType
  );

  // 該縣市在 22 縣市中的排名（依 param avg）
  const myRow = countyIdMoi ? countySummary.find((r) => r.county_id === countyIdMoi) : null;
  const sorted = [...countySummary].filter((r) => r.avg_value != null);
  // DO/pH 越高越好；BOD 越低越好
  const higherBetter = param !== "BOD";
  sorted.sort((a, b) =>
    higherBetter ? (b.avg_value ?? 0) - (a.avg_value ?? 0) : (a.avg_value ?? 0) - (b.avg_value ?? 0)
  );
  const myRank = myRow ? sorted.findIndex((r) => r.county_id === countyIdMoi) + 1 : null;

  const paramLabel: Record<typeof param, { name: string; unit: string; hint: string }> = {
    DO: { name: "溶氧量", unit: "mg/L", hint: "越高越好（≥6 健康水質）" },
    BOD: { name: "生化需氧量", unit: "mg/L", hint: "越低越好（<3 為乾淨水）" },
    pH: { name: "酸鹼值", unit: "", hint: "6.5–8.5 為正常" },
  };
  const typeLabel: Record<typeof stationType, string> = {
    reservoir: "水庫",
    river: "河川",
    groundwater: "地下水",
  };

  return (
    <>
      {/* 控制列：只剩參數 toggle（stationType 由 tab 鎖定） */}
      <div
        className="section"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          padding: 14,
          marginBottom: "var(--section-gap)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 8 }}>
          <FlaskConical size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
          {typeLabel[stationType]}水質參數
        </div>
        <div className="toggle-group" style={{ fontSize: 11 }}>
          {(["DO", "BOD", "pH"] as const).map((p) => (
            <button
              key={p}
              className={param === p ? "active" : ""}
              onClick={() => setParam(p)}
              style={{ padding: "4px 10px" }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="muted" style={{ padding: 20, textAlign: "center" }}>
          ⏳ 載入水質資料…
        </div>
      )}
      {error && (
        <div className="muted" style={{ padding: 20, textAlign: "center", color: "#B91C1C" }}>
          ⚠️ {error.message}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 該縣市排名卡 */}
          <div className="section">
            <div className="section-head">
              <div>
                <div className="section-title">
                  <span className="pre">RANK</span>
                  {countyName} · {paramLabel[param].name}（{param}{paramLabel[param].unit ? " " + paramLabel[param].unit : ""}）
                  <DataAgeBadge sampledAt={myRow?.latest_sampled_at} label="採樣" />
                </div>
                <div className="section-subtitle">
                  {paramLabel[param].hint}．資料來源：環境部 EPA（月度採樣，無 collector cron）
                </div>
              </div>
            </div>

            {myRow && myRow.avg_value != null ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 18,
                  alignItems: "center",
                  padding: "12px 4px",
                }}
              >
                <Donut value={myRank ?? 0} total={sorted.length || 22} size={100} tier={
                  myRank == null
                    ? "—"
                    : myRank <= Math.ceil((sorted.length || 22) * 0.33)
                      ? "前段"
                      : myRank >= Math.ceil((sorted.length || 22) * 0.66)
                        ? "後段"
                        : "中段"
                } />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-deep)" }}>
                    {Number(myRow.avg_value).toFixed(2)}
                    {paramLabel[param].unit && (
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 4 }}>
                        {paramLabel[param].unit}
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {myRow.n_stations} 站 · {myRow.n_readings} 筆讀值 · 最新 {myRow.latest_sampled_at?.slice(0, 10) ?? "—"}
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    範圍 {Number(myRow.min_value ?? 0).toFixed(2)} – {Number(myRow.max_value ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted" style={{ padding: 20, textAlign: "center", fontSize: 12.5 }}>
                ⚠️ {countyName} 在「{typeLabel[stationType]}」類別下無 {param} 資料
                {stationType === "river" && (
                  <>
                    <br />（河川水質 446 站表已建，reading pipeline 待補 — Cycle A2 進行中）
                  </>
                )}
              </div>
            )}
          </div>

          {/* 22 縣市排名（橫向 bar） */}
          {sorted.length > 0 && (
            <div className="section">
              <div className="section-head">
                <div className="section-title">
                  <span className="pre">RANKING</span>
                  全國 {paramLabel[param].name} 縣市排名（{higherBetter ? "高 → 低" : "低 → 高"}）
                  <DataAgeBadge
                    sampledAt={sorted.reduce<string | null>((m, r) => {
                      const t = r.latest_sampled_at ?? null;
                      return !m || (t && t > m) ? t : m;
                    }, null)}
                    label="採樣"
                  />
                </div>
                <div className="section-subtitle">
                  {sorted.length} / 22 縣市有 {param} 資料·依「{higherBetter ? "越高越好" : "越低越好"}」排序·環境部月度採樣
                </div>
              </div>
              <div>
                {sorted.map((r, i) => {
                  const isSelf = r.county_id === countyIdMoi;
                  const max = Math.max(...sorted.map((x) => Number(x.avg_value ?? 0)));
                  const pct = Math.max(2, (Number(r.avg_value ?? 0) / Math.max(max, 0.01)) * 100);
                  return (
                    <div
                      key={r.county_id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "26px 84px 1fr 64px",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 0",
                        background: isSelf ? "var(--accent-soft)" : undefined,
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "right" }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: isSelf ? 700 : 400 }}>
                        {r.county_name}
                      </span>
                      <span style={{ position: "relative", height: 14 }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${pct}%`,
                            background: isSelf ? "var(--accent)" : "var(--accent-soft)",
                            borderRadius: 3,
                          }}
                        />
                      </span>
                      <span style={{ fontSize: 11.5, textAlign: "right", color: "var(--text-secondary)" }}>
                        {Number(r.avg_value ?? 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 該縣市測站清單 */}
          {stations.length > 0 && (
            <div className="section">
              <div className="section-head">
                <div className="section-title">
                  <span className="pre">STATIONS</span>
                  {countyName} {typeLabel[stationType]}水質測站 · {stations.length} 站
                  <DataAgeBadge
                    sampledAt={stations.reduce<string | null>((m, s) => {
                      const t = s.latest_sampled_at ?? null;
                      return !m || (t && t > m) ? t : m;
                    }, null)}
                    label="最新採樣"
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {stations.slice(0, 30).map((s) => (
                  <div
                    key={s.station_id}
                    style={{
                      padding: 10,
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                      {s.name}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                      {s.river_name ?? s.township ?? s.source_prefix}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11.5 }}>
                      {s.do_value != null && (
                        <span><b>DO</b> {Number(s.do_value).toFixed(1)}</span>
                      )}
                      {s.bod_value != null && (
                        <span><b>BOD</b> {Number(s.bod_value).toFixed(1)}</span>
                      )}
                      {s.ph_value != null && (
                        <span><b>pH</b> {Number(s.ph_value).toFixed(1)}</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                      {s.latest_sampled_at?.slice(0, 10) ?? "無資料"}
                    </div>
                  </div>
                ))}
              </div>
              {stations.length > 30 && (
                <div className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: "center" }}>
                  顯示前 30 / 共 {stations.length} 站
                </div>
              )}
            </div>
          )}

          {stationType === "river" && countySummary.length === 0 && (
            <div className="section" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>🚧</div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                河川水質 reading 還沒進 DB（站表 446 站已建）
                <br />Cycle A2 補 pipeline 進行中
              </div>
            </div>
          )}
        </>
      )}

      <div className="source-badge">
        <span className="field">資料來源 <b>環境部 EPA · 水利署 WRA · migration 087 + 097</b></span>
        <span className="field" title="水質目前無 collector cron 持續抓，是手動 pipeline backfill。月度更新典型">
          ⚠ <b>非 LIVE</b> · 月度採樣
        </span>
        <span className="spacer" />
        <a href="#">資料說明</a>
      </div>
    </>
  );
}

const liveBadgeStyle: React.CSSProperties = {
  marginLeft: 6,
  fontSize: 9,
  fontWeight: 700,
  color: "var(--positive)",
  background: "var(--positive-soft)",
  padding: "1px 4px",
  borderRadius: 3,
  verticalAlign: "middle",
};

// W-2：年度/靜態資料的期別 badge（中性灰，非綠 LIVE）— LIVE 嚴守：只有 collector cron + 高頻上游才標 LIVE
const periodBadgeStyle: React.CSSProperties = {
  marginLeft: 6,
  fontSize: 9,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  background: "var(--surface-3)",
  padding: "1px 4px",
  borderRadius: 3,
  verticalAlign: "middle",
};
