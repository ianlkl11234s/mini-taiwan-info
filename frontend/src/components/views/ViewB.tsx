/**
 * ViewB — 縣市儀錶板（manifest.county_dashboard driven）
 *
 * 對應 prototype view-b.jsx；移植 4 個 real tab：
 *   overview / reservoirs / usage / ranking
 * 3 個 placeholder：water_quality / flood / infrastructure（待 Phase 1+ ETL）
 *
 * 資料：useCountyData 一次拉 LPCD history + sewage history + countyReservoirs
 */

import { useMemo, useState } from "react";
import {
  Droplet,
  Waves,
  Recycle,
  CloudRain,
  Building2,
  Globe,
  TrendingUp,
  Plus,
  Share2,
  Download,
  ChevronLeft,
  AlertTriangle,
  FlaskConical,
} from "lucide-react";
import type { ThemeManifest, CountyCode3, County } from "@/lib/types";
import type { ReservoirStatusRow } from "@/lib/queries/water";
import { byCode3 } from "@/lib/counties";
import { fmt } from "@/lib/format";
import { KPICard } from "@/components/kpi/KPICard";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { Donut } from "@/components/charts/Donut";
import { Sparkline } from "@/components/charts/Sparkline";
import { useCountyData } from "@/hooks/useCountyData";

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
  onAddCompare?: () => void;
  onDrillReservoir?: (reservoirId: string) => void;
}

type TabId = "overview" | "reservoirs" | "water_quality" | "flood" | "infrastructure" | "usage" | "ranking";

const TAB_DEFS: Array<{ id: TabId; label: string; icon: typeof Globe }> = [
  { id: "overview",        label: "概覽",       icon: Globe },
  { id: "reservoirs",      label: "水庫",       icon: Droplet },
  { id: "water_quality",   label: "河川水質",   icon: FlaskConical },
  { id: "flood",           label: "防洪",       icon: CloudRain },
  { id: "infrastructure",  label: "基礎設施",   icon: Building2 },
  { id: "usage",           label: "用水 & 衛生", icon: Droplet },
  { id: "ranking",         label: "排名",       icon: TrendingUp },
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
  onAddCompare,
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
          <div className="hero-actions">
            <button className="btn ghost"><Download size={14} /> 下載 CSV</button>
            <button className="btn ghost"><Share2 size={14} /> 分享</button>
            {onAddCompare && (
              <button className="btn primary" onClick={onAddCompare}>
                <Plus size={14} /> 加入比較
              </button>
            )}
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
        <ReservoirsTab reservoirs={data.countyReservoirs} onDrillReservoir={onDrillReservoir} />
      )}
      {tab === "water_quality" && <PlaceholderTab title="河川水質" desc="水質測站 BOD/DO + 列管事業點" county={c.name_zh} />}
      {tab === "flood" && <PlaceholderTab title="防洪" desc="淹水潛勢 + 滯洪池 + 即時雨量" county={c.name_zh} />}
      {tab === "infrastructure" && (
        <PlaceholderTab
          title="基礎設施"
          desc="給水普及率 / 漏水率（部分縣市資料未開放）"
          county={c.name_zh}
          warning
        />
      )}
      {tab === "usage" && (
        <UsageTab lpcdHistory={data.lpcdHistory} sewageHistory={data.sewageHistory} />
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
  const lpcdRank = useMemo(() => {
    const entries = Object.entries(lpcdByCountyId);
    if (entries.length === 0) return null;
    const sortedByLpcdAsc = [...entries].sort((a, b) => b[1] - a[1]); // 由高到低
    const idMoi = county.id_moi;
    if (!idMoi) return null;
    const idx = sortedByLpcdAsc.findIndex(([id]) => id === idMoi);
    return idx >= 0 ? idx + 1 : null;
  }, [lpcdByCountyId, county]);

  const tier = lpcdRank == null ? "—" : lpcdRank <= 7 ? "前段" : lpcdRank >= 16 ? "後段" : "中段";

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
          label={<>LPCD{latestLpcd != null && <span style={liveBadgeStyle}>LIVE</span>}</>}
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
          label={<>接管率{latestSewage != null && <span style={liveBadgeStyle}>LIVE</span>}</>}
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
            {county.name_zh} 全台 LPCD 排名
          </div>
          <Donut value={lpcdRank} total={22} size={110} tier={tier} />
          <div className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            人均用水量在 22 縣市中排第 <b>{lpcdRank}</b>（{tier}）
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
}: {
  reservoirs: ReservoirStatusRow[];
  onDrillReservoir?: (id: string) => void;
}) {
  if (reservoirs.length === 0) {
    return (
      <div className="section" style={{ textAlign: "center", padding: 36 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>💧</div>
        <div className="muted">該縣市無主要水庫資料（lat/lng nearest-centroid 未匹配）</div>
      </div>
    );
  }
  const avg = reservoirs.reduce((s, r) => s + (r.storage_ratio_pct ?? 0), 0) / reservoirs.length;
  const alert = reservoirs.filter((r) => (r.storage_ratio_pct ?? 100) < 30);
  return (
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
  );
}

// ─────────────────────────────────────────────────
// Tab: Usage（LPCD + 接管率歷年）
// ─────────────────────────────────────────────────

function UsageTab({
  lpcdHistory,
  sewageHistory,
}: {
  lpcdHistory: Array<{ year: number; lpcd: number | null }>;
  sewageHistory: Array<{ year: number; coverage_pct: number | null }>;
}) {
  const lpcdData: TrendPoint[] = lpcdHistory
    .filter((d) => d.lpcd != null)
    .map((d) => ({ x: d.year, y: d.lpcd! }));
  const sewageData: TrendPoint[] = sewageHistory
    .filter((d) => d.coverage_pct != null)
    .map((d) => ({ x: d.year, y: d.coverage_pct! }));

  return (
    <>
      {lpcdData.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TREND</span>
              LPCD 歷年（{lpcdData[0].x} – {lpcdData[lpcdData.length - 1].x}）
              <span style={liveBadgeStyle}>LIVE</span>
            </div>
          </div>
          <TrendChart
            series={[{ name: "LPCD", color: "var(--accent)", data: lpcdData }]}
            xLabels={lpcdData.map((d) => String(d.x))}
            height={200}
            showLegend={false}
          />
        </div>
      )}
      {sewageData.length > 0 ? (
        <div className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TREND</span>
              污水接管率歷年
              <span style={liveBadgeStyle}>LIVE</span>
            </div>
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
      <div className="source-badge">
        <span className="field">datagov:8316 · datagov:26815</span>
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
              <div className="between mb-12">
                <div>
                  <div className="section-title" style={{ fontSize: 14 }}>
                    {m.label}
                    <span style={liveBadgeStyle}>LIVE</span>
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {county.name_zh} 第 <b style={{ color: "var(--accent-deep)" }}>{rank}</b> / {entries.length} ·
                    值 <b style={{ color: "var(--text)" }}>{fmt.num(myVal, 1)} {m.unit}</b>
                  </div>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 5,
                  background: m.better === "higher" ? "var(--positive-soft)" : "var(--accent-soft)",
                  color: m.better === "higher" ? "#047857" : "var(--accent-deep)",
                }}>
                  {m.better === "higher" ? "越高越好" : "越低越好"}
                </span>
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
// Placeholder Tab
// ─────────────────────────────────────────────────

function PlaceholderTab({
  title,
  desc,
  county,
  warning,
}: {
  title: string;
  desc: string;
  county: string;
  warning?: boolean;
}) {
  return (
    <div className="section" style={{ textAlign: "center", padding: 36 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{warning ? "⚠️" : "🚧"}</div>
      <div className="section-title" style={{ justifyContent: "center", marginBottom: 8 }}>
        {title}
      </div>
      <div className="muted" style={{ fontSize: 12.5, maxWidth: 360, margin: "0 auto" }}>
        {county} · {desc}
        <br />
        {warning ? (
          <>
            <AlertTriangle size={11} style={{ verticalAlign: -1 }} /> 該指標部分縣市資料未開放
          </>
        ) : (
          <>Phase 1+ 待接 ETL pipeline</>
        )}
      </div>
    </div>
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
