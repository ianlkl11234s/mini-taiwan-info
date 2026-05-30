/**
 * ViewA — 全台概覽（manifest-driven）
 *
 * 讀 themes/{theme}.yaml 的 overview section，渲染：
 *   - Hero（題目 + hook_rules 結果）
 *   - KPI grid（依 overview.kpis[]）
 *   - PointProfile（依 overview.point_profile）
 *   - Ranking（依 overview.ranking）
 *
 * Phase 0b：mock data；Phase 0c：接 Supabase。
 */

import { useState } from "react";
import { Droplet, Waves, CloudRain, Recycle, AlertTriangle } from "lucide-react";
import type { ThemeManifest, CountyCode3 } from "@/lib/types";
import { COUNTIES, codeConvert } from "@/lib/counties";
import { fmt } from "@/lib/format";
import {
  WATER_NATIONAL_MOCK,
  WATER_BY_COUNTY_MOCK,
  getMockMetricValue,
} from "@/lib/mock-data";
import { KPICard } from "@/components/kpi/KPICard";
import { PointProfile } from "@/components/point-profile/PointProfile";
import type { ReservoirStatusRow } from "@/lib/queries/water";

interface ViewAProps {
  manifest: ThemeManifest;
  metric: string;
  onMetricChange?: (id: string) => void;
  onCountyClick?: (code: CountyCode3) => void;
  onDrillReservoir?: (reservoirId: string) => void;
  selectedCounty?: CountyCode3 | null;
  /** Phase 0c-1：真實 Supabase summary（覆蓋 mock） */
  realSummary?: {
    reservoir_rate_avg: number | null;
    alert_reservoir_count: number;
    rain_24hr_avg: number | null;
    updated_at: string | null;
  } | null;
  /** Phase 0c-2/0c-3：LPCD + 接管率（表存在才有資料） */
  realGovernance?: {
    lpcd_national_avg: number | null;
    sewage_national_avg: number | null;
    lpcd_by_county: Record<string, number>;     // key: id_moi
    sewage_by_county: Record<string, number>;
  } | null;
  /** Phase 0c-C：縣市 24hr 雨量（key=code3） */
  realRain24ByCode3?: Record<CountyCode3, number> | null;
  /** Phase 0b+ A-1：水庫清單給 PointProfile */
  realReservoirs?: ReservoirStatusRow[];
  /** Phase 0d：淹水高潛勢 %（350mm/24hr 預設） */
  realFloodPct?: {
    national_avg_pct: number | null;
    by_county_idmoi: Record<string, number>;
  } | null;
  realLoading?: boolean;
  realError?: Error | null;
}

const ICON_FOR_KPI: Record<string, JSX.Element> = {
  total_reservoir_rate: <Waves size={13} />,
  rain_24hr_avg: <CloudRain size={13} />,
  high_alert_reservoirs: <AlertTriangle size={13} />,
  flood_high_risk_pct: <Recycle size={13} />,
  lpcd: <Droplet size={13} />,
  sewage_coverage: <Recycle size={13} />,
};

/**
 * 取 KPI 全國值 — 優先用真實 Supabase summary，缺值才 fallback 到 mock。
 */
function getKpiValue(
  kpiId: string,
  realSummary?: ViewAProps["realSummary"],
  realGovernance?: ViewAProps["realGovernance"],
  realFloodPct?: ViewAProps["realFloodPct"]
): { value: number; delta?: number; isReal: boolean } {
  // 真實 realtime 資料能服務的 3 個 KPI（Phase 0c-1）
  if (realSummary) {
    if (kpiId === "total_reservoir_rate" && realSummary.reservoir_rate_avg != null) {
      return { value: realSummary.reservoir_rate_avg, isReal: true };
    }
    if (kpiId === "rain_24hr_avg" && realSummary.rain_24hr_avg != null) {
      return { value: realSummary.rain_24hr_avg, isReal: true };
    }
    if (kpiId === "high_alert_reservoirs") {
      return { value: realSummary.alert_reservoir_count, isReal: true };
    }
  }
  // Phase 0c-2/0c-3：LPCD + 接管率（ETL 完成後）
  if (realGovernance) {
    if (kpiId === "lpcd" && realGovernance.lpcd_national_avg != null) {
      return { value: realGovernance.lpcd_national_avg, isReal: true };
    }
    if (kpiId === "sewage_coverage" && realGovernance.sewage_national_avg != null) {
      return { value: realGovernance.sewage_national_avg, isReal: true };
    }
  }
  // Phase 0d：淹水高潛勢面積佔比
  if (realFloodPct && kpiId === "flood_high_risk_pct" && realFloodPct.national_avg_pct != null) {
    return { value: realFloodPct.national_avg_pct, isReal: true };
  }
  // 其餘 fallback mock
  const N = WATER_NATIONAL_MOCK;
  switch (kpiId) {
    case "total_reservoir_rate": return { value: N.reservoirRate, delta: N.reservoirRateDelta, isReal: false };
    case "rain_24hr_avg":        return { value: N.rain24,        delta: N.rain24Delta, isReal: false };
    case "high_alert_reservoirs":return { value: N.alertReservoirs, delta: N.alertReservoirsDelta, isReal: false };
    case "flood_high_risk_pct":  return { value: N.floodArea,     delta: N.floodAreaDelta, isReal: false };
    case "lpcd":                 return { value: N.lpcd,          delta: N.lpcdDelta, isReal: false };
    case "sewage_coverage":      return { value: N.sewage,        delta: N.sewageDelta, isReal: false };
    default: return { value: 0, isReal: false };
  }
}

function deltaToString(delta: number | undefined, unit: string): string {
  if (delta == null) return "";
  const sign = delta > 0 ? "+" : "";
  if (unit === "%") return `${sign}${delta.toFixed(1)} pp`;
  if (unit === "座") return delta === 0 ? "持平" : `${sign}${delta}`;
  return `${sign}${delta} ${unit}`;
}

function deltaDir(delta: number | undefined): "up" | "down" | "flat" {
  if (delta == null || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
}

function compareToLabel(c: string): string {
  return (
    { previous_day: "相較昨日", previous_week: "相較上週", previous_year: "相較去年", none: "" } as Record<string, string>
  )[c] ?? "";
}

export function ViewA({
  manifest,
  selectedCounty,
  onCountyClick: _onCountyClick,
  onDrillReservoir,
  realSummary,
  realGovernance,
  realRain24ByCode3,
  realReservoirs,
  realFloodPct,
  realLoading,
  realError,
}: ViewAProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { theme, overview } = manifest;

  // 把 governance 縣市值（key=id_moi）轉成 code3 lookup
  const lpcdRealByCode3: Record<string, number> = {};
  const sewageRealByCode3: Record<string, number> = {};
  if (realGovernance) {
    for (const [idMoi, v] of Object.entries(realGovernance.lpcd_by_county)) {
      const c = codeConvert.idMoiToCode3(idMoi);
      if (c) lpcdRealByCode3[c] = v;
    }
    for (const [idMoi, v] of Object.entries(realGovernance.sewage_by_county)) {
      const c = codeConvert.idMoiToCode3(idMoi);
      if (c) sewageRealByCode3[c] = v;
    }
  }
  const hasRealLpcd = Object.keys(lpcdRealByCode3).length > 0;

  // Hero hook：水主題用 LPCD 比率敘事；其他主題 fallback 到 manifest.theme.tagline
  // hook_rules engine 留 Phase 1
  const isWaterTheme = theme.id === "water";
  const ranking = hasRealLpcd
    ? COUNTIES.map((c) => ({
        code: c.code3,
        name: c.name_zh,
        value: lpcdRealByCode3[c.code3] ?? 0,
      })).sort((a, b) => b.value - a.value)
    : computeLpcdRanking();
  const lpcdNationalForHook = realGovernance?.lpcd_national_avg ?? WATER_NATIONAL_MOCK.lpcd;
  const hookText: JSX.Element = isWaterTheme
    ? computeHookText(ranking, lpcdNationalForHook, hasRealLpcd)
    : <span className="em">{theme.tagline ?? theme.description}</span>;

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· {theme.name}</span>
            </h1>
            <p className="hook">{hookText}</p>
          </div>
        </div>
      </div>

      {/* 資料載入狀態 badge */}
      {(realLoading || realError) && (
        <div
          style={{
            margin: "0 0 12px 0",
            padding: "8px 12px",
            borderRadius: 8,
            background: realError ? "var(--danger-soft)" : "var(--surface-2)",
            fontSize: 12,
            color: realError ? "#B91C1C" : "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {realLoading && "⏳ 載入即時 Supabase 資料中…"}
          {realError && `⚠️ Supabase 連線失敗：${realError.message} — 回退到 mock 資料`}
        </div>
      )}

      {/* KPI grid — driven by manifest.overview.kpis */}
      <div className="kpi-grid">
        {overview.kpis.map((kpi) => {
          const { value, delta, isReal } = getKpiValue(kpi.id, realSummary, realGovernance, realFloodPct);
          const trend = {
            delta: deltaToString(delta, kpi.unit) || "—",
            direction: deltaDir(delta),
            baseline: compareToLabel(kpi.format.compare_to),
            sentiment: kpi.format.sentiment_when_up,
          };
          const valueDisplay =
            kpi.unit === "%"
              ? `${value.toFixed(kpi.format.precision)}`
              : kpi.unit === ""
                ? value.toFixed(kpi.format.precision)
                : kpi.unit === "座"
                  ? Math.round(value).toString()
                  : value.toFixed(kpi.format.precision);
          return (
            <KPICard
              key={kpi.id}
              icon={ICON_FOR_KPI[kpi.id] ?? <Droplet size={13} />}
              label={
                <>
                  {kpi.label}
                  {isReal && (
                    <span
                      title="Supabase 即時資料"
                      style={{
                        marginLeft: 6,
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--positive)",
                        background: "var(--positive-soft)",
                        padding: "1px 4px",
                        borderRadius: 3,
                        verticalAlign: "middle",
                      }}
                    >
                      LIVE
                    </span>
                  )}
                </>
              }
              value={valueDisplay}
              unit={kpi.unit}
              trend={trend}
              expanded={expanded === kpi.id}
              onExpand={() =>
                setExpanded(expanded === kpi.id ? null : kpi.id)
              }
              explodeContent={
                <SimpleExplode
                  kpi={kpi}
                  onCounty={_onCountyClick}
                  realLpcdByCode3={hasRealLpcd ? lpcdRealByCode3 : null}
                  realSewageByCode3={Object.keys(sewageRealByCode3).length > 0 ? sewageRealByCode3 : null}
                  realRain24ByCode3={realRain24ByCode3 ?? null}
                />
              }
            />
          );
        })}
      </div>

      {/* PointProfile — 40 水庫點位概況（manifest.overview.point_profile.enabled） */}
      {overview.point_profile?.enabled && realReservoirs && realReservoirs.length > 0 && (
        <PointProfile
          reservoirs={realReservoirs}
          onReservoirClick={(r) => onDrillReservoir?.(r.reservoir_id)}
        />
      )}

      {/* Ranking — manifest.overview.ranking */}
      {overview.ranking && (
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">RANKING</span>
                {overview.ranking.primary_metric === "lpcd" ? "人均日用水量" : overview.ranking.primary_metric}
                {" · TOP "}{overview.ranking.top_n} / BOTTOM {overview.ranking.bottom_n}
              </div>
              <div className="section-subtitle">點任一縣市進入該縣市儀錶板</div>
            </div>
          </div>

          <div className="ranking">
            <div className="ranking-col">
              <h4>最高 {overview.ranking.top_n} 名</h4>
              <RankBars rows={ranking.slice(0, overview.ranking.top_n)} max={ranking[0]?.value ?? 1} highlight={selectedCounty} onClick={_onCountyClick} />
            </div>
            <div className="ranking-col">
              <h4>最低 {overview.ranking.bottom_n} 名</h4>
              <RankBars rows={ranking.slice(-overview.ranking.bottom_n).reverse()} max={ranking[0]?.value ?? 1} highlight={selectedCounty} low onClick={_onCountyClick} />
            </div>
          </div>
        </div>
      )}

      {/* 資料來源 */}
      <div className="source-badge">
        <span className="field">
          資料來源 <b>{manifest.data_sources.length} 個資料集</b>
        </span>
        <span className="field">
          更新 <b>2026-05-14（mock）</b>
        </span>
        <span className="spacer" />
        <a href="#">資料說明</a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// 內部 helpers
// ─────────────────────────────────────────────────

function computeLpcdRanking() {
  return COUNTIES.map((c) => ({
    code: c.code3,
    name: c.name_zh,
    value: WATER_BY_COUNTY_MOCK[c.code3]?.lpcd ?? 0,
  })).sort((a, b) => b.value - a.value);
}

function computeHookText(
  ranking: Array<{ name: string; value: number }>,
  nationalAvg: number,
  isReal: boolean
): JSX.Element {
  const max = ranking[0];
  const min = ranking[ranking.length - 1];
  const ratio = (max.value / Math.max(min.value, 1)).toFixed(1);
  return (
    <>
      <span className="em">南北分裂的島嶼水帳。</span>{" "}
      全國平均 LPCD <b>{Math.round(nationalAvg)} L</b>
      {isReal && (
        <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: "var(--positive)", background: "var(--positive-soft)", padding: "1px 4px", borderRadius: 3, verticalAlign: "1px" }}>LIVE</span>
      )}
      ，22 縣市差距達 <b className="em">{ratio} 倍</b> — 最高 {max.name} {Math.round(max.value)}L、最低 {min.name} {Math.round(min.value)}L。
    </>
  );
}

function SimpleExplode({
  kpi,
  onCounty,
  realLpcdByCode3,
  realSewageByCode3,
  realRain24ByCode3,
}: {
  kpi: ThemeManifest["overview"]["kpis"][0];
  onCounty?: (c: CountyCode3) => void;
  realLpcdByCode3?: Record<string, number> | null;
  realSewageByCode3?: Record<string, number> | null;
  realRain24ByCode3?: Record<CountyCode3, number> | null;
}) {
  // 真實資料優先
  const realLookup: Record<string, number> | null =
    kpi.id === "lpcd" ? realLpcdByCode3 ?? null :
    kpi.id === "sewage_coverage" ? realSewageByCode3 ?? null :
    kpi.id === "rain_24hr_avg" ? (realRain24ByCode3 as Record<string, number> | null) ?? null :
    null;

  const metricKey =
    kpi.id === "lpcd" ? "lpcd" :
    kpi.id === "sewage_coverage" ? "sewage_coverage" :
    kpi.id === "flood_high_risk_pct" ? "flood_high_risk_pct" :
    kpi.id === "rain_24hr_avg" ? "rain_24hr" :
    kpi.id === "total_reservoir_rate" ? "reservoir_rate" : null;

  if (!metricKey) {
    return <div className="muted" style={{ fontSize: 12 }}>該指標爆炸圖 Phase 0c 接入</div>;
  }

  const isReal = !!realLookup;

  const rows = COUNTIES.map((c) => ({
    code: c.code3,
    name: c.name_zh,
    value:
      (isReal && realLookup![c.code3] != null
        ? realLookup![c.code3]
        : (getMockMetricValue(metricKey, c.code3) ?? 0)),
  })).sort((a, b) => b.value - a.value);

  const max = rows[0].value || 1;

  return (
    <div>
      <div className="exploded-head">
        <div className="title">
          {kpi.label} · <span className="sub">22 縣市排序</span>
          {isReal && (
            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "var(--positive)", background: "var(--positive-soft)", padding: "1px 4px", borderRadius: 3 }}>
              LIVE
            </span>
          )}
        </div>
      </div>
      <div className="exploded-bars">
        {rows.map((r, i) => (
          <div
            key={r.code}
            className="exp-row"
            style={{ cursor: "pointer" }}
            onClick={() => onCounty?.(r.code as CountyCode3)}
          >
            <span className="rank">{i + 1}</span>
            <span className="nm">{r.name}</span>
            <span className="b"><div style={{ width: `${(r.value / max) * 100}%` }} /></span>
            <span className="v">{fmt.num(r.value, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RankRow { code: string; name: string; value: number }

function RankBars({ rows, max, highlight, low, onClick }: { rows: RankRow[]; max: number; highlight?: CountyCode3 | null; low?: boolean; onClick?: (c: CountyCode3) => void }) {
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.code}
          className={`ranking-row ${low ? "low" : ""}`}
          style={{ cursor: "pointer", background: highlight === r.code ? "var(--accent-soft)" : undefined }}
          onClick={() => onClick?.(r.code as CountyCode3)}
        >
          <span className="name">{r.name}</span>
          <span className="bar-wrap">
            <span className="bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="val">{fmt.num(r.value, 0)} L</span>
        </div>
      ))}
    </div>
  );
}
