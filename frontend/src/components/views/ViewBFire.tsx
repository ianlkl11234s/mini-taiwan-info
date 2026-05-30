/**
 * ViewBFire — 消防主題縣市儀錶板（B046）
 *
 * 結構對齊 ViewB（水主題）：hero + tabs，加頂端雷達圖 vs 全國平均。
 * 設計來源：v03-fire-design-brief-2026-05-15/SPEC.md + /tmp/fire_design/.../js/view-b-fire.jsx
 *
 * 拍板（2026-05-16）：
 *  - 5 tabs 全做（overview / incidents / response / service / others）
 *  - migration 105 incidents_by_county_cause_year MV 解 5+22 cause 縣市版
 *  - 雷達圖 5 軸（去掉「財損」，schema 無 property_loss 欄位）
 *  - 服務圈 buffer 視覺由左側地圖畫（依 Sprint 3 真實 stations + ST_Buffer 衍生表）
 *    本 cycle ViewB 只呈現 KPI + 圖例 + 高雄 Top 10 mock + 非高雄 placeholder
 */

import { useMemo, useState } from "react";
import {
  Flame,
  AlertTriangle,
  MapPin,
  Users,
  Activity,
  TrendingUp,
  Droplet,
  HeartPulse,
  Share2,
  Download,
  Lightbulb,
  Scale,
  ChevronLeft,
  Globe2,
  ShieldCheck,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { Donut } from "@/components/charts/Donut";
import { fmt } from "@/lib/format";
import { byCode3, COUNTIES } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import type { FireDataState } from "@/hooks/useFireData";
import { useFireCountyData, type FireCountyDataState } from "@/hooks/useFireCountyData";
import { deriveCountyCauseAggregates } from "@/lib/queries/fire";
import type {
  FireStationRow,
  EmergencyShelterRow,
  DisasterIncidentRow,
  UncoveredVillageRow,
  ServiceCoverageRow,
} from "@/lib/queries/fire";
import {
  FIRE_MOCK_BY_COUNTY,
  FIRE_SEVERITY_COLORS,
} from "@/lib/mock-fire";

// ─────────────────────────────────────────────────
// Tab 定義
// ─────────────────────────────────────────────────

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}
type TabId = "overview" | "incidents" | "response" | "service" | "others";

const TAB_DEFS: TabDef[] = [
  { id: "overview",  label: "概覽",     icon: Globe2 },
  { id: "incidents", label: "火災發生", icon: Flame },
  { id: "response",  label: "救災量能", icon: ShieldCheck },
  { id: "service",   label: "服務圈",   icon: Compass },
  { id: "others",    label: "其他救護", icon: HeartPulse },
];

// ─────────────────────────────────────────────────
// 雷達圖 5 軸常數（去掉「財損」）
// ─────────────────────────────────────────────────

interface RadarAxis {
  key:    "fireDensity" | "deathRate" | "stationDensity" | "outOf5Min" | "hydrantDensity";
  label:  string;
  max:    number;
  better: "higher" | "lower";
}

const FIRE_RADAR_AXES: RadarAxis[] = [
  { key: "fireDensity",    label: "火災密度",   max:  14, better: "lower"  },
  { key: "deathRate",      label: "致死率‰",   max:   5, better: "lower"  },
  { key: "stationDensity", label: "分隊/萬人", max:  14, better: "higher" },
  { key: "outOf5Min",      label: "5min 圈外", max:  30, better: "lower"  },
  { key: "hydrantDensity", label: "栓/km²",   max: 120, better: "higher" },
];

// ─────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────

interface ViewBFireProps {
  data: FireDataState;
  county: CountyCode3;
  onBack: () => void;
}

export function ViewBFire({ data, county, onBack }: ViewBFireProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const c = byCode3[county];
  if (!c) {
    return (
      <div className="hero">
        <h1>找不到縣市：{county}</h1>
        <button className="btn" onClick={onBack}>← 返回</button>
      </div>
    );
  }
  const idMoi = c.id_moi;

  // 該縣市 latest year aggregate（從真實 MV derive）
  const cAgg = useMemo(
    () => data.countyAggregates.find((a) => a.county_id === idMoi) ?? null,
    [data.countyAggregates, idMoi]
  );

  // 該縣市 lazy fetch 4 類資料（stations / shelters / hydrant count / disasters）
  const countyData = useFireCountyData(idMoi);

  // 該縣市 mock placeholder（山林風險點未對應到縣市；hospitals 已接 useFireData.hospitals 改算）
  const mock = FIRE_MOCK_BY_COUNTY[county];

  // B067：該縣市 3km 圈外人口% (real，from fire.service_coverage_by_county MV)
  const coverageRow = useMemo(
    () => data.serviceCoverage.find((r) => r.county_id === idMoi) ?? null,
    [data.serviceCoverage, idMoi]
  );

  // B066：該縣市急救醫院總數
  const hospitalsForCounty = useMemo(
    () => data.hospitals.filter((h) => h.county_id === idMoi).length,
    [data.hospitals, idMoi]
  );

  // 合併真實資料（real 優先；ETL 缺的 fallback 到 mock）
  const merged = useMemo(() => {
    const incidents = cAgg?.incidents ?? 0;
    const deaths = cAgg?.deaths ?? 0;
    const injuries = cAgg?.injuries ?? 0;
    const density = c.pop_2024_wan > 0 ? incidents / c.pop_2024_wan : 0;
    const deathRatePerMille = incidents > 0 ? (deaths / incidents) * 1000 : 0;

    // ─── 真實接通 ───
    const stations = countyData.stations.length;
    const stationsPerWan = c.pop_2024_wan > 0 ? stations / c.pop_2024_wan : 0;
    const stationsPer100km2 = c.area_km2 > 0 ? (stations / c.area_km2) * 100 : 0;
    const hydrants = countyData.hydrantCount;

    // EMS by county latest year（從 useFireData 全國 emsYearlyRows filter）
    const emsRowsForCounty = data.emsYearlyRows.filter((r) => r.county_id === idMoi);
    const emsLatest =
      emsRowsForCounty.length > 0
        ? emsRowsForCounty.reduce((a, b) => (a.year > b.year ? a : b))
        : null;
    const emsTrips = emsLatest?.dispatch_count ?? 0;
    const ohca = emsLatest?.ohca_count ?? 0;

    // 該縣市財損（fire.casualty_property_by_county_year，目前只有 2020）
    const casualtyRowsForCounty = data.casualtyRows.filter((r) => r.county_id === idMoi);
    const casualtyLatest =
      casualtyRowsForCounty.length > 0
        ? casualtyRowsForCounty.reduce((a, b) => (a.year > b.year ? a : b))
        : null;
    // 千元 → 百萬：÷ 1000
    const damageMillion =
      casualtyLatest != null
        ? (casualtyLatest.loss_total_thousand ?? 0) / 1000
        : 0;

    // 避難所數量（已 fetch）
    const sheltersCount = countyData.shelters.length;

    return {
      incidents,
      deaths,
      injuries,
      density,
      deathRatePerMille,
      avgResponseMin: cAgg?.avg_response_minutes ?? null,
      // ─── 真實接通 ───
      stations,
      stationsPerWan,
      stationsPer100km2,
      hydrants,
      emsTrips,
      ohca,
      damageMillion,
      sheltersCount,
      // ─── 真實接通（2026-05-18 B066/B067）───
      outOf5MinPct: coverageRow?.uncovered_pop_pct ?? 0,
      hospitals: hospitalsForCounty,
      // ─── 仍 placeholder ───
      riskPoints: mock?.riskPoints ?? 0,       // 山林風險點未對應到縣市
    };
  }, [cAgg, mock, c.pop_2024_wan, c.area_km2, countyData, data.emsYearlyRows, data.casualtyRows, idMoi, coverageRow, hospitalsForCounty]);

  const latestYear = data.summary?.latest_year_minguo ?? 113;

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <button
          className="back-link"
          onClick={onBack}
          aria-label="返回全台概覽"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: 12,
            padding: "4px 0",
            cursor: "pointer",
            marginBottom: 6,
          }}
        >
          <ChevronLeft size={12} /> 返回全台概覽
        </button>
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">{c.name_zh}</span>
              <span className="small">· 消防</span>
              <Flame size={18} color="var(--accent)" />
            </h1>
            <p className="hook">
              <span className="em">{fmt.num(c.pop_2024_wan, 1)} 萬人</span>
              <span className="muted"> · </span>
              <span>{fmt.num(c.area_km2)} km²</span>
              <span className="muted"> · </span>
              <span>分隊 <b>{merged.stations}</b></span>
              <span className="muted"> · </span>
              <span>
                民 {latestYear} 年火災 <b>{fmt.num(merged.incidents)}</b> 件 · 死亡{" "}
                <b>{merged.deaths}</b>
              </span>
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Download size={14} /> 下載 CSV</button>
            <button className="btn ghost"><Share2 size={14} /> 分享</button>
          </div>
        </div>
      </div>

      {/* 雷達圖 5 軸 vs 全國平均 */}
      <FireRadarCard county={c} merged={merged} data={data} />

      {/* Tab bar */}
      <div className="tab-bar">
        {TAB_DEFS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview"  && (
        <OverviewTab data={data} idMoi={idMoi} county={c} merged={merged} latestYear={latestYear} />
      )}
      {tab === "incidents" && (
        <IncidentsTab data={data} idMoi={idMoi} county={c} merged={merged} latestYear={latestYear} />
      )}
      {tab === "response"  && (
        <ResponseTab
          county={county}
          cname={c.name_zh}
          merged={merged}
          countyData={countyData}
        />
      )}
      {tab === "service"   && (
        <ServiceTab
          county={county}
          idMoi={idMoi}
          popWan={c.pop_2024_wan}
          merged={merged}
          coverage={coverageRow}
          uncoveredVillages={data.uncoveredVillages}
        />
      )}
      {tab === "others"    && (
        <OthersTab
          county={county}
          cname={c.name_zh}
          popWan={c.pop_2024_wan}
          merged={merged}
          countyData={countyData}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// 雷達圖 5 軸
// ─────────────────────────────────────────────────

interface MergedCountyData {
  incidents: number;
  deaths: number;
  injuries: number;
  density: number;
  deathRatePerMille: number;
  avgResponseMin: number | null;
  stations: number;
  stationsPerWan: number;
  stationsPer100km2: number;
  outOf5MinPct: number;
  hydrants: number;
  damageMillion: number;
  ohca: number;
  emsTrips: number;
  hospitals: number;
  riskPoints: number;
  sheltersCount: number;
}

function FireRadarCard({
  county,
  merged,
  data,
}: {
  county: (typeof COUNTIES)[number];
  merged: MergedCountyData;
  data: FireDataState;
}) {
  // 全國平均 — 4/5 軸接通真實，僅 5min 圈外仍 mock（待 Sprint 3 PostGIS）
  const avg = useMemo(() => {
    // fireDensity / deathRate：從 countyAggregates 算真實全國平均
    const validAggs = data.countyAggregates.filter((a) => {
      const c = COUNTIES.find((x) => x.id_moi === a.county_id);
      return c && c.pop_2024_wan > 0 && a.incidents > 0;
    });
    const fireDensities = validAggs.map((a) => {
      const c = COUNTIES.find((x) => x.id_moi === a.county_id)!;
      return a.incidents / c.pop_2024_wan; // 件/萬人
    });
    const deathRates = validAggs.map((a) =>
      a.incidents > 0 ? (a.deaths / a.incidents) * 1000 : 0
    ); // 致死率 ‰

    // stationDensity：fire.stations groupBy county_id / county pop
    const stationsByCty = new Map<string, number>();
    for (const s of data.stations) {
      stationsByCty.set(s.county_id, (stationsByCty.get(s.county_id) ?? 0) + 1);
    }
    const stationsPerWanList = COUNTIES
      .filter((c) => c.pop_2024_wan > 0)
      .map((c) => (stationsByCty.get(c.id_moi) ?? 0) / c.pop_2024_wan);

    // hydrantDensity：真實，但目前只高雄有；計平均時只用該 1 縣市
    const khh = COUNTIES.find((x) => x.id_moi === "E");
    const hydrantDensity =
      khh && data.hydrantNationalCount > 0 && khh.area_km2 > 0
        ? data.hydrantNationalCount / khh.area_km2
        : null;

    // outOf5Min — 真實 from fire.service_coverage_by_county MV (B067)
    const coverageByCty = new Map<string, number>();
    for (const r of data.serviceCoverage) {
      coverageByCty.set(r.county_id, r.uncovered_pop_pct);
    }
    const outOf5MinList = COUNTIES.map((cc) => coverageByCty.get(cc.id_moi) ?? 0);

    const mean = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    return {
      fireDensity:    mean(fireDensities),
      deathRate:      mean(deathRates),
      stationDensity: mean(stationsPerWanList),
      outOf5Min:      mean(outOf5MinList),
      hydrantDensity,
    };
  }, [data.countyAggregates, data.stations, data.hydrantNationalCount, data.serviceCoverage]);

  // 該縣市 5 軸值；hydrants=0 (非 4 都) 視為 null，雷達跳過該軸
  const cArea = (county.area_km2 ?? 0) > 0 ? county.area_km2 : 1;
  const cityVal: Record<RadarAxis["key"], number | null> = {
    fireDensity:    merged.density,
    deathRate:      merged.deathRatePerMille,
    stationDensity: merged.stationsPerWan,
    outOf5Min:      merged.outOf5MinPct,
    hydrantDensity: merged.hydrants > 0 ? merged.hydrants / cArea : null,
  };

  // Normalize 0-1，以「外圈 = 表現好」為通則
  //   higher-better 軸:  score = v / max
  //   lower-better 軸:   score = 1 - v / max
  // 這樣 city polygon 整體大 = 體質好；verdict diff > 0 = 該軸比 avg 表現好
  const norm = (key: RadarAxis["key"], v: number | null): number => {
    const ax = FIRE_RADAR_AXES.find((a) => a.key === key);
    if (!ax || v == null) return 0;
    const raw = Math.max(0, Math.min(1, v / ax.max));
    return ax.better === "higher" ? raw : 1 - raw;
  };

  const size = 260;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const radius = 92;
  const N = FIRE_RADAR_AXES.length;
  const angle = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, r: number): [number, number] => [
    cx + Math.cos(angle(i)) * r,
    cy + Math.sin(angle(i)) * r,
  ];

  const ring = (frac: number) =>
    FIRE_RADAR_AXES.map((_, i) => pt(i, radius * frac).join(",")).join(" ");
  const valuePts = (vals: number[]) =>
    FIRE_RADAR_AXES.map((_, i) => pt(i, radius * vals[i]).join(",")).join(" ");

  // city polygon 對 null 軸 fallback 到 avg 位置（不在該軸內塌陷）
  const cityPts = FIRE_RADAR_AXES.map((a) => {
    if (cityVal[a.key] == null) return norm(a.key, avg[a.key]);
    return norm(a.key, cityVal[a.key]);
  });
  const avgPts  = FIRE_RADAR_AXES.map((a) => norm(a.key, avg[a.key]));

  // 判讀（差距 > 5% 才列；null 軸排除）
  // 統一 score 系統：diff > 0 = 比全國表現好（外圈），diff < 0 = 差
  const verdict = FIRE_RADAR_AXES
    .filter((a) => cityVal[a.key] != null && avg[a.key] != null)
    .map((a) => {
      const cityScore = norm(a.key, cityVal[a.key]);
      const avgScore  = norm(a.key, avg[a.key]);
      const diff = cityScore - avgScore;
      return {
        axis: a,
        diff,
        better: diff > 0,
        percent: Math.abs(diff * 100).toFixed(0),
      };
    });
  const worseAxes  = verdict.filter((v) => !v.better && Math.abs(v.diff) > 0.05).slice(0, 2);
  const betterAxes = verdict.filter((v) =>  v.better && Math.abs(v.diff) > 0.05).slice(0, 2);

  return (
    <div className="fire-radar-card">
      <div className="frc-svg">
        <svg width={size} height={size + 12}>
          {/* rings */}
          {[0.25, 0.5, 0.75, 1.0].map((f) => (
            <polygon
              key={f}
              points={ring(f)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
              opacity={0.7}
            />
          ))}
          {/* axis lines */}
          {FIRE_RADAR_AXES.map((_, i) => {
            const [x, y] = pt(i, radius);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
              />
            );
          })}
          {/* national avg polygon (dashed gray) */}
          <polygon
            points={valuePts(avgPts)}
            fill="var(--text-tertiary)"
            fillOpacity={0.15}
            stroke="var(--text-tertiary)"
            strokeWidth={1.4}
            strokeDasharray="4 3"
          />
          {/* city polygon (accent solid) */}
          <polygon
            points={valuePts(cityPts)}
            fill="var(--accent)"
            fillOpacity={0.22}
            stroke="var(--accent)"
            strokeWidth={2}
          />
          {/* city dots */}
          {cityPts.map((v, i) => {
            const [x, y] = pt(i, radius * v);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3.5}
                fill="var(--accent)"
                stroke="white"
                strokeWidth={1.5}
              />
            );
          })}
          {/* axis labels */}
          {FIRE_RADAR_AXES.map((a, i) => {
            const [lx, ly] = pt(i, radius + 22);
            return (
              <text
                key={i}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--text-secondary)"
              >
                {a.label}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="frc-body">
        <div className="frc-title">
          <Scale size={14} />
          <b>{county.name_zh} vs 全國平均</b>
          <span className="muted">5 項指標雷達</span>
        </div>
        <div className="frc-legend">
          <span><i className="lg-city" />{county.name_zh}</span>
          <span><i className="lg-avg" />全國平均</span>
        </div>
        <ul className="frc-verdict">
          {worseAxes.length > 0 && (
            <li className="worse">
              <b>比全國差：</b>
              {worseAxes.map((v, i) => (
                <span key={i}>
                  {v.axis.label} {v.percent}%
                  {i < worseAxes.length - 1 ? "、" : ""}
                </span>
              ))}
            </li>
          )}
          {betterAxes.length > 0 && (
            <li className="better">
              <b>比全國好：</b>
              {betterAxes.map((v, i) => (
                <span key={i}>
                  {v.axis.label} {v.percent}%
                  {i < betterAxes.length - 1 ? "、" : ""}
                </span>
              ))}
            </li>
          )}
          {worseAxes.length === 0 && betterAxes.length === 0 && (
            <li className="muted">5 項指標皆接近全國平均</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Tab: 概覽
// ─────────────────────────────────────────────────

function OverviewTab({
  data,
  idMoi,
  county,
  merged,
  latestYear,
}: {
  data: FireDataState;
  idMoi: string;
  county: (typeof COUNTIES)[number];
  merged: MergedCountyData;
  latestYear: number;
}) {
  // 22 縣市 incidents ranking
  const allInc = data.countyAggregates.map((a) => a.incidents);
  const sorted = [...allInc].sort((a, b) => b - a);
  const rank = sorted.indexOf(merged.incidents) + 1;
  const tier = rank <= 7 ? "前段" : rank <= 14 ? "中段" : "後段";

  // 5 大類起火原因（縣市版 — 用 migration 105 MV）
  const causeAgg = useMemo(
    () => deriveCountyCauseAggregates(data.countyCauseYear, idMoi, latestYear),
    [data.countyCauseYear, idMoi, latestYear]
  );
  const totalCauseInc = causeAgg.reduce((s, c) => s + c.incidents, 0);

  return (
    <>
      <div className="kpi-grid cols-4">
        <KPICard
          icon={<Flame size={13} />}
          label="年度火災"
          value={fmt.num(merged.incidents)}
          unit="件"
          trend={{
            delta: `密度 ${merged.density.toFixed(1)}/萬人`,
            direction: "flat",
            baseline: "",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="死亡/受傷"
          value={`${merged.deaths} / ${merged.injuries}`}
          unit="人"
          trend={{
            delta: `致死率 ${merged.deathRatePerMille.toFixed(2)}‰`,
            direction: "flat",
            baseline: "",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<MapPin size={13} />}
          label="消防分隊"
          value={merged.stations}
          unit="個"
          trend={{
            delta: `${merged.stationsPerWan.toFixed(1)} 隊/萬人`,
            direction: "flat",
            baseline: "fire.stations 實測",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Users size={13} />}
          label="5min 圈外"
          value={merged.outOf5MinPct.toFixed(1)}
          unit="%"
          trend={{
            delta: merged.outOf5MinPct >= 20 ? "偏鄉服務缺口大" : "覆蓋良好",
            direction: "flat",
            baseline: "service_coverage MV",
            sentiment: merged.outOf5MinPct >= 20 ? "negative" : "positive",
          }}
        />
      </div>

      {/* 排名 + 5 大類起火原因 兩欄 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 220px) 1fr",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div
          className="section"
          style={{
            marginBottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 16,
          }}
        >
          <div
            className="section-title"
            style={{ alignSelf: "flex-start", marginBottom: 12 }}
          >
            <span className="pre">RANK</span>
            全台排名
          </div>
          <Donut value={rank} total={22} size={110} tier={tier} />
          <div
            className="muted"
            style={{ fontSize: 12, textAlign: "center", marginTop: 14 }}
          >
            火災件數排名
            <br />
            <span style={{ color: "var(--text)", fontWeight: 500 }}>
              {fmt.num(merged.incidents)} 件 / 全 22 縣市
            </span>
          </div>
        </div>

        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <span className="pre">CAUSE</span>5 大類起火原因（{county.name_zh}）
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              民 {latestYear} 年 · 共 {fmt.num(totalCauseInc)} 件
            </div>
          </div>
          <div className="fire-cause-mini">
            {causeAgg.map((cat) => {
              const color = FIRE_SEVERITY_COLORS[cat.severity] ?? "#94A3B8";
              return (
                <div key={cat.cause_5_id} className="fcm-row">
                  <span
                    className="fcm-dot"
                    style={{ background: color }}
                  />
                  <span className="fcm-lbl">{cat.cause_5_name}</span>
                  <div className="fcm-bar">
                    <div
                      style={{
                        width: `${Math.min(100, cat.pct * 2.5)}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span className="fcm-pct tnum">{cat.pct.toFixed(1)}%</span>
                  <span className="fcm-est muted tnum">
                    {fmt.num(cat.incidents)} 件
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="insight">
        <div className="ico">
          <Lightbulb size={18} />
        </div>
        <div className="body">
          {county.name_zh} 民 {latestYear} 年火災密度{" "}
          <b>{merged.density.toFixed(1)}/萬人</b>
          {merged.density > 7 ? (
            <>
              （高於全國平均，建議追蹤）
            </>
          ) : (
            <>（接近或低於全國平均）</>
          )}
          ，致死率 <b>{merged.deathRatePerMille.toFixed(2)}‰</b>。
          {merged.outOf5MinPct >= 20 && (
            <>
              {" "}5 分鐘圈外人口比 <b className="em">{merged.outOf5MinPct.toFixed(1)}%</b>
              {" "}— 偏鄉/山林服務缺口需特別注意。
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: 火災發生（縣市版 — 月度真實分布 + KPI）
// ─────────────────────────────────────────────────

function IncidentsTab({
  data,
  idMoi,
  county,
  merged,
  latestYear,
}: {
  data: FireDataState;
  idMoi: string;
  county: (typeof COUNTIES)[number];
  merged: MergedCountyData;
  latestYear: number;
}) {
  // 該縣市 12 月份分布（從 hourMonth filter county_id 後 sum hour）
  const monthData = useMemo(() => {
    const acc = new Map<number, number>();
    for (const r of data.hourMonth) {
      if (r.county_id !== idMoi) continue;
      acc.set(r.month, (acc.get(r.month) ?? 0) + r.incident_count);
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      value: acc.get(i + 1) ?? 0,
    }));
  }, [data.hourMonth, idMoi]);
  const max = Math.max(1, ...monthData.map((d) => d.value));
  const peakMonth = monthData.reduce((acc, d) => (d.value > acc.value ? d : acc), monthData[0]);

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Flame size={13} />}
          label="件數"
          value={fmt.num(merged.incidents)}
          unit="件"
          trend={{
            delta: `${merged.density.toFixed(1)}/萬人`,
            direction: "flat",
            baseline: "民 " + latestYear + " 年",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="死亡"
          value={merged.deaths}
          unit="人"
          trend={{
            delta: `${merged.deathRatePerMille.toFixed(1)}‰`,
            direction: "flat",
            baseline: "致死率",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<TrendingUp size={13} />}
          label="財損"
          value={fmt.num(merged.damageMillion)}
          unit="百萬"
          trend={{
            delta: merged.incidents > 0
              ? `每件 ${((merged.damageMillion / merged.incidents) * 100).toFixed(1)} 千`
              : "—",
            direction: "flat",
            baseline: "待 MOI ETL",
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">TIME</span>
            {county.name_zh} 月度分布（民 {latestYear}）
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            高峰：{peakMonth.month} 月（約 {fmt.num(peakMonth.value)} 件）
          </div>
        </div>
        <div className="fire-bar-row" style={{ height: 160 }}>
          {monthData.map((d) => {
            const h = (d.value / max) * 100;
            const peak = d.month === peakMonth.month && peakMonth.value > 0;
            return (
              <div key={d.month} className="fbr-col">
                <div className="fbr-num">{fmt.num(d.value)}</div>
                <div
                  className={`fbr-bar ${peak ? "is-peak" : ""}`}
                  style={{ height: `${h}%` }}
                />
                <div className="fbr-lbl">{d.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="insight">
        <div className="ico">
          <Lightbulb size={18} />
        </div>
        <div className="body">
          {county.name_zh} 民 {latestYear} 年共{" "}
          <b>{fmt.num(merged.incidents)} 件</b>火災，{peakMonth.month} 月達高峰約{" "}
          <b>{fmt.num(peakMonth.value)}</b> 件。受傷人數約是死亡的{" "}
          <b>{merged.deaths > 0 ? (merged.injuries / merged.deaths).toFixed(1) : "—"}</b> 倍。
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: 救災量能（分隊 + 4 都消防栓）
// ─────────────────────────────────────────────────

function ResponseTab({
  cname,
  merged,
  countyData,
}: {
  county: CountyCode3;
  cname: string;
  merged: MergedCountyData;
  countyData: FireCountyDataState;
}) {
  // 真實分隊資料（fire.stations）— sorted by name
  const stations: FireStationRow[] = useMemo(
    () => [...countyData.stations].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [countyData.stations]
  );
  const hasHydrant = merged.hydrants > 0;

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<MapPin size={13} />}
          label="消防分隊"
          value={merged.stations}
          unit="個"
          trend={{
            delta: `${merged.stationsPerWan.toFixed(2)}/萬人`,
            direction: "flat",
            baseline: "fire.stations",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Activity size={13} />}
          label="面積密度"
          value={merged.stationsPer100km2.toFixed(2)}
          unit="隊/100km²"
          trend={{
            delta: merged.stationsPer100km2 < 2 ? "偏低" : "正常",
            direction: "flat",
            baseline: "",
            sentiment: merged.stationsPer100km2 < 2 ? "negative" : "positive",
          }}
        />
        <KPICard
          icon={<Droplet size={13} />}
          label={
            hasHydrant ? (
              <>消防栓</>
            ) : (
              <>消防栓 <span className="muted" style={{ fontSize: 9 }}>無資料</span></>
            )
          }
          value={hasHydrant ? fmt.num(merged.hydrants) : "—"}
          unit="個"
          trend={{
            delta: hasHydrant ? "fire.hydrants" : "資料未開放",
            direction: "flat",
            baseline: hasHydrant ? "" : "限高雄已接通",
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">STATIONS</span>
            {cname} 消防分隊清單
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            {countyData.loading
              ? "載入中 ..."
              : `共 ${stations.length} 個分隊 · 左側地圖顯示位置`}
          </div>
        </div>
        {stations.length === 0 && !countyData.loading ? (
          <div className="muted" style={{ padding: "12px 4px", fontSize: 12.5 }}>
            無分隊資料
          </div>
        ) : (
          <div className="fire-station-grid">
            {stations.slice(0, 30).map((s) => (
              <div key={s.station_id} className="fsg-card" title={s.address ?? undefined}>
                <MapPin size={11} color="var(--accent)" />
                <span>{s.name.replace(cname, "").trim() || s.name}</span>
                {s.type && (
                  <span className="muted" style={{ fontSize: 9.5, marginLeft: 4 }}>
                    {s.type}
                  </span>
                )}
              </div>
            ))}
            {stations.length > 30 && (
              <div className="fsg-card fsg-more">
                + 其他 {stations.length - 30} 個
              </div>
            )}
          </div>
        )}
      </div>

      {!hasHydrant && (
        <div
          className="insight"
          style={{ background: "var(--warning-soft)", borderColor: "#FDE68A" }}
        >
          <div
            className="ico"
            style={{ background: "var(--warning)", color: "white" }}
          >
            ⚠
          </div>
          <div className="body">
            <b>{cname}</b> 消防栓資料目前僅高雄市已完整接通（39,395 個）。
            北/中/南/南源 dataset 欄位 mapping 待修；其他 18 縣市無公開資料。
            地圖切到本縣市時「消防栓」layer 自動標示「無資料」。
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: 服務圈（KPI + buffer 圖例 + Top 10 圈外村里）
// ─────────────────────────────────────────────────

function ServiceTab({
  county,
  idMoi,
  popWan,
  merged,
  coverage,
  uncoveredVillages,
}: {
  county: CountyCode3;
  idMoi: string;
  popWan: number;
  merged: MergedCountyData;
  coverage: ServiceCoverageRow | null;
  uncoveredVillages: UncoveredVillageRow[];
}) {
  // B068：該縣市圈外村里 Top 10（real from fire.uncovered_villages_top MV）
  const villages = useMemo(() => {
    const filtered = uncoveredVillages
      .filter((v) => v.county_id === idMoi)
      .slice(0, 10)
      .map((v) => ({
        name: `${v.town_name}${v.village_name}`,
        distance: (v.nearest_station_m ?? 0) / 1000,
        population: v.pop,
      }));
    return filtered.length > 0 ? filtered : null;
  }, [uncoveredVillages, idMoi]);
  // F-4 口徑統一：圈外人口/村里數皆來自 fire.service_coverage_by_county（同一 3km buffer MV）。
  //   - uncoveredPop / uncoveredPct：距最近分隊 > 3km（≈ 5 分鐘車程）的人口
  //   - uncoveredVillageCount：該縣市 3km 圈外村里「數」（per-county 全量，連江=74）
  //   下方 Top 10 表只取 fire.uncovered_villages_top（全國圈外人口 Top 100 明細）→ 小縣村里人口太小
  //   不會上榜，但**不代表沒有圈外村里**。先前空狀態誤寫「全村里在 3km 內」與 5.5% 圈外自相矛盾（F-4）。
  const uncoveredPop = coverage?.uncovered_pop ?? Math.round(popWan * 10000 * (merged.outOf5MinPct / 100));
  const uncoveredPct = coverage?.uncovered_pop_pct ?? merged.outOf5MinPct;
  const uncoveredVillageCount = coverage?.uncovered_villages ?? 0;
  const totalVillages = coverage?.total_villages ?? 0;
  // Mark county arg as used for future UI hooks (e.g., 5/10min selector)
  void county;

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<MapPin size={13} />}
          label="分隊數"
          value={merged.stations}
          unit="個"
          trend={{
            delta: "服務圈 = 3km",
            direction: "flat",
            baseline: "≈ 5 分鐘車程",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Users size={13} />}
          label="3km 圈外人口"
          value={fmt.bigNum(uncoveredPop)}
          unit="人"
          trend={{
            delta: `${uncoveredPct.toFixed(1)}%`,
            direction: "flat",
            baseline: "佔全縣市 · 距分隊>3km",
            sentiment: uncoveredPct >= 20 ? "negative" : "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="3km 圈外村里"
          value={uncoveredVillageCount}
          unit="里"
          trend={{
            delta: totalVillages > 0 ? `共 ${totalVillages} 村里` : "",
            direction: "flat",
            baseline: villages ? `最遠 ${villages[0].distance.toFixed(1)}km` : "明細見全國 Top 100",
            sentiment: uncoveredVillageCount > 0 ? "negative" : "positive",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">SERVICE BUFFER</span>
            服務圈 buffer
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            左側地圖會疊上 3km/6km 服務圈與村里人口密度（Sprint 3 後上線）
          </div>
        </div>
        <div className="fire-buffer-legend">
          {/* F-3：移除硬編碼魔術係數 0.7/0.4 推算的「約 X% 人口涵蓋」（無依據、與「全村里 3km 內」矛盾）。
              真實 buffer 涵蓋率待 Sprint 3 村里 buffer MV 接通後再顯示。 */}
          <div className="fbl-row">
            <span className="fbl-sw fbl-3km" />
            <b>3 km buffer</b>
            <span className="muted">約 5 分鐘可達範圍</span>
          </div>
          <div className="fbl-row">
            <span className="fbl-sw fbl-6km" />
            <b>6 km buffer</b>
            <span className="muted">約 10 分鐘可達範圍</span>
          </div>
          <div className="fbl-row">
            <span className="fbl-sw fbl-out" />
            <b>圈外</b>
            <span className="muted">
              距最近分隊 {">"} 3 km — <b>{uncoveredPct.toFixed(1)}%</b> 人口（{fmt.bigNum(uncoveredPop)} 人 · {uncoveredVillageCount} 村里）
            </span>
          </div>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
          ※ 圈外人口/村里數均來自 <code>fire.service_coverage_by_county</code>（3km 直線 buffer，≈ 5 分鐘車程）。
          下方明細表另取「全國圈外人口 Top 100」<code>fire.uncovered_villages_top</code>，故小縣即使有圈外村里也可能不在明細內。
        </div>
      </div>

      {villages ? (
        <div className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TOP 10</span>
              圈外村里
            </div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              距最近分隊最遠的 {villages.length} 個村里 · fire.uncovered_villages_top MV
            </div>
          </div>
          <div className="fire-table-wrap">
            <table className="fire-table compact">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>村里</th>
                  <th style={{ textAlign: "right" }}>距分隊 (km)</th>
                  <th style={{ textAlign: "right" }}>人口</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v, i) => (
                  <tr key={v.name}>
                    <td className="muted">{i + 1}</td>
                    <td>
                      <b>{v.name}</b>
                    </td>
                    <td className="tnum">
                      <b style={{ color: "var(--accent)" }}>
                        {v.distance.toFixed(1)}
                      </b>
                    </td>
                    <td className="tnum">{fmt.num(v.population)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : uncoveredVillageCount > 0 ? (
        // F-4：該縣市有圈外村里（service_coverage_by_county），只是人口規模小未進全國 Top 100 明細。
        // 不可再寫「全村里在 3km 內」——那會與上方「{uncoveredPct}% 圈外」自相矛盾。
        <div
          className="section"
          style={{ textAlign: "center", padding: 36 }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>ⓘ</div>
          <div
            className="section-title"
            style={{ justifyContent: "center", marginBottom: 8 }}
          >
            圈外村里明細
          </div>
          <div
            className="muted"
            style={{ fontSize: 12.5, maxWidth: 400, margin: "0 auto" }}
          >
            本縣有 <b>{uncoveredVillageCount}</b> 個「3km 圈外」村里（共 {totalVillages} 村里、圈外人口 {fmt.bigNum(uncoveredPop)} 人），
            但因村里人口規模較小，未進「全國圈外人口 Top 100」明細榜。
            <br />
            <span style={{ fontSize: 11 }}>數據：fire.service_coverage_by_county（圈外總量）／ fire.uncovered_villages_top（全國 Top 100 明細）</span>
          </div>
        </div>
      ) : (
        <div
          className="section"
          style={{ textAlign: "center", padding: 36 }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
          <div
            className="section-title"
            style={{ justifyContent: "center", marginBottom: 8 }}
          >
            圈外村里 Top 10
          </div>
          <div
            className="muted"
            style={{ fontSize: 12.5, maxWidth: 360, margin: "0 auto" }}
          >
            該縣市無「3km 圈外」村里 — 全縣市村里皆在最近消防分隊 3km 範圍內。
            <br />
            <span style={{ fontSize: 11 }}>來源：fire.service_coverage_by_county（圈外村里數 = 0）</span>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab: 其他救護（EMS + 災變 + 山林風險）
// ─────────────────────────────────────────────────

function classifyDisasterTag(name: string, type: string | null): {
  tag: string;
  cls: "typhoon" | "quake" | "accident";
} {
  const lower = (type ?? "").toLowerCase();
  if (name.includes("颱風") || lower.includes("typhoon")) return { tag: "颱風", cls: "typhoon" };
  if (name.includes("地震") || lower.includes("earthquake")) return { tag: "地震", cls: "quake" };
  if (name.includes("豪雨") || name.includes("暴雨") || name.includes("水災")) return { tag: "豪雨", cls: "typhoon" };
  return { tag: type ?? "事故", cls: "accident" };
}

function OthersTab({
  cname,
  popWan,
  merged,
  countyData,
}: {
  county: CountyCode3;
  cname: string;
  popWan: number;
  merged: MergedCountyData;
  countyData: FireCountyDataState;
}) {
  // 該縣市真實災變（fire.disaster_incidents filter by county_id；
  // dedup by disaster_name 避免 timeline spam 同名颱風，SUM deaths/injuries）
  const events: DisasterIncidentRow[] = useMemo(() => {
    const acc = new Map<string, DisasterIncidentRow>();
    for (const d of countyData.disasters) {
      const prev = acc.get(d.disaster_name);
      if (!prev) {
        acc.set(d.disaster_name, { ...d });
      } else {
        const merged = {
          ...prev,
          deaths: (prev.deaths ?? 0) + (d.deaths ?? 0),
          injuries: (prev.injuries ?? 0) + (d.injuries ?? 0),
        };
        if (d.occurred_date > prev.occurred_date) merged.occurred_date = d.occurred_date;
        acc.set(d.disaster_name, merged);
      }
    }
    return [...acc.values()]
      .sort((a, b) => (a.occurred_date > b.occurred_date ? -1 : 1))
      .slice(0, 6);
  }, [countyData.disasters]);

  // 該縣市避難所 sample (前 8 個，作 list preview)
  const sheltersSample: EmergencyShelterRow[] = useMemo(
    () => countyData.shelters.slice(0, 8),
    [countyData.shelters]
  );

  const emsPerThousand = popWan > 0
    ? (merged.emsTrips / (popWan * 10000)) * 1000
    : 0;

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<HeartPulse size={13} />}
          label={
            merged.emsTrips > 0 ? (
              <>救護出勤</>
            ) : (
              <>救護出勤 <span className="muted" style={{ fontSize: 9 }}>無縣市資料</span></>
            )
          }
          value={merged.emsTrips > 0 ? fmt.bigNum(merged.emsTrips) : "—"}
          unit="次/年"
          trend={{
            delta: merged.emsTrips > 0 ? `${emsPerThousand.toFixed(0)} 件/千人` : "—",
            direction: "flat",
            baseline: "ems_stats_by_county_year",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<HeartPulse size={13} />}
          label="OHCA 件數"
          value={merged.ohca > 0 ? merged.ohca : "—"}
          unit="件"
          trend={{
            delta: merged.ohca > 0 ? "已接通真實" : "—",
            direction: "flat",
            baseline: "",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<HeartPulse size={13} />}
          label="避難收容處所"
          value={merged.sheltersCount > 0 ? fmt.num(merged.sheltersCount) : "—"}
          unit="處"
          trend={{
            delta: countyData.loading ? "載入中" : "safety.emergency_shelters",
            direction: "flat",
            baseline: "",
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">EVENTS</span>
            {cname} 中央災變紀錄
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            {countyData.loading
              ? "載入中 ..."
              : `共 ${countyData.disasters.length} 筆 · 顯示最近 ${events.length} 筆 · fire.disaster_incidents`}
          </div>
        </div>
        {events.length > 0 ? (
          <div className="fire-timeline">
            {events.map((d) => {
              const { tag, cls } = classifyDisasterTag(d.disaster_name, d.incident_type);
              const year = d.occurred_date.slice(0, 4);
              return (
                <div key={d.incident_id} className={`ftl-row tag-${cls}`}>
                  <div className="ftl-yr">{year}</div>
                  <div className="ftl-dot" />
                  <div className="ftl-body">
                    <div className="ftl-head">
                      <b>{d.disaster_name}</b>
                      <span className="ftl-tag">{tag}</span>
                    </div>
                    <div className="ftl-date">
                      {d.occurred_date}
                      {d.town && <span className="muted"> · {d.town}</span>}
                    </div>
                    <div className="ftl-stat">
                      {(d.deaths ?? 0) > 0 && (
                        <span className="ftl-stat-death">死 {d.deaths}</span>
                      )}
                      {(d.injuries ?? 0) > 0 && (
                        <span className="ftl-stat-inj">傷 {d.injuries}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="muted" style={{ padding: 14, fontSize: 13 }}>
            該縣市 2022-09 以後尚無中央紀錄之重大災變
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">SHELTERS</span>
            {cname} 避難收容處所
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            {countyData.loading
              ? "載入中"
              : `共 ${merged.sheltersCount} 處 · 顯示前 ${sheltersSample.length} 處 sample`}
          </div>
        </div>
        {sheltersSample.length > 0 ? (
          <div className="fire-station-grid">
            {sheltersSample.map((s) => (
              <div key={s.shelter_id} className="fsg-card" title={s.address ?? undefined}>
                <MapPin size={11} color="var(--accent)" />
                <span>{s.name}</span>
                {s.capacity != null && s.capacity > 0 && (
                  <span className="muted" style={{ fontSize: 9.5, marginLeft: 4 }}>
                    容 {fmt.num(s.capacity)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ padding: "12px 4px", fontSize: 12.5 }}>
            無避難所資料
          </div>
        )}
      </div>
    </>
  );
}

