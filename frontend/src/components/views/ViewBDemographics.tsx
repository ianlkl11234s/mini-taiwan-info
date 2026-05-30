/**
 * ViewBDemographics — 人口主題縣市儀錶板
 *
 * 4 tabs:  概覽 / 年齡結構 / 人口動態 / 城鄉分布
 * accent: 紫 #7C3AED
 *
 * 設計來源：designs Mini Taiwan Info.html · view-b-population.jsx
 * 資料：useDemographicsData → demographics.population_by_age_sex_county
 *       + spatial.national_population_trend + village_demographics_yearly (民 104 / 113)
 *
 * 真實接通：
 *   - 縣市 KPI（pop / aging / depRatio / growth10y / density / hhSize / median_age / natural / social）
 *     全部 from `countyAggregates`（real，無 mock scale）；aging/dep/density/hhSize 優先用官方
 *     demographics.county_indicators_yearly（2025），缺則 pyramid/village 計算值
 *   - 縣市金字塔：從 pyramidRows filter by county_id + statYear(2025) 依該年實際 band 重建（real，動態組數）
 *   - 三段年齡雷達：從該年 pyramid 算 pct014 / pct1564 / pct65（real）
 *   - 鄉鎮排名：從 villageRows year=113 filter by county 加總到 town（real）
 * 仍 mock：
 *   - 10 年 birth/death 縣市 trend（design 用全國 scale by pop 比例 + 老化係數）
 *   - 性別比、社會增加 = pop delta - natural 近似
 *   - 性別比 ♂/100♀ 用 ageScale 反推
 */

import { useMemo, useState } from "react";
import {
  Users, Home, Scale, TrendingUp, Baby, AlertTriangle,
  ArrowLeftRight, Lightbulb, ChevronLeft,
  Locate, Triangle, type LucideIcon,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3, COUNTIES } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { KPICard } from "@/components/kpi/KPICard";
import { TrendChart } from "@/components/charts/TrendChart";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { PendingDataCard } from "@/components/common/PendingDataCard";
import type { DemographicsDataState } from "@/hooks/useDemographicsData";
import type { CountyDemographics, AgeRow } from "@/lib/queries/demographics";

interface ViewBDemographicsProps {
  data: DemographicsDataState;
  county: CountyCode3;
  onBack: () => void;
}

type TabId = "overview" | "age" | "dynamics" | "urban";

const REGION_LABELS: Record<string, string> = {
  north: "北部", central: "中部", south: "南部", east: "東部", island: "離島",
};

// ─────────────────────────────────────────────────
// 縣市排名工具（從 countyAggregates 對某欄位排序找 index）
// ─────────────────────────────────────────────────
function rankBy(
  aggs: CountyDemographics[],
  code: CountyCode3,
  key: keyof CountyDemographics,
  dir: "desc" | "asc" = "desc",
): number {
  const arr = aggs.map((a) => ({ code: a.code3, v: Number(a[key] ?? 0) }))
    .sort((x, y) => dir === "desc" ? y.v - x.v : x.v - y.v);
  return arr.findIndex((r) => r.code === code) + 1;
}

// ─────────────────────────────────────────────────
// 該縣市的真實 pyramid — 從 pyramidRows 依 county_id + statYear filter，依該年實際 band 呈現
// ─────────────────────────────────────────────────
function buildCountyPyramid(
  rows: DemographicsDataState["pyramidRows"],
  countyId: string,
  statYear: number,
): AgeRow[] {
  const bucket = new Map<string, { male: number; female: number }>();
  for (const r of rows) {
    if (r.county_id !== countyId) continue;
    if (r.stat_year !== statYear) continue;
    const sex = (r.sex === "M" || r.sex === "male" || r.sex === "男") ? "M"
              : (r.sex === "F" || r.sex === "female" || r.sex === "女") ? "F" : null;
    if (!sex) continue;
    const band = r.age_band.trim();
    const slot = bucket.get(band) ?? { male: 0, female: 0 };
    if (sex === "M") slot.male += r.population;
    else slot.female += r.population;
    bucket.set(band, slot);
  }
  const parse = (b: string) => {
    const m = b.match(/(\d+)/);
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
  };
  return Array.from(bucket.entries())
    .map(([age, v]) => ({ age, ...v }))
    .sort((a, b) => parse(a.age) - parse(b.age));
}

// ─────────────────────────────────────────────────
// 該縣市 3 段年齡組成 % — 從 pyramidRows derive
// ─────────────────────────────────────────────────
function derive3Segment(pyr: AgeRow[]): { pct014: number; pct1564: number; pct65: number } {
  let p014 = 0, p1564 = 0, p65 = 0;
  for (const r of pyr) {
    const low = Number(r.age.match(/(\d+)/)?.[1] ?? 999);
    const sum = r.male + r.female;
    if (low < 15) p014 += sum;
    else if (low < 65) p1564 += sum;
    else p65 += sum;
  }
  const total = p014 + p1564 + p65;
  return total > 0 ? {
    pct014: (p014 / total) * 100,
    pct1564: (p1564 / total) * 100,
    pct65: (p65 / total) * 100,
  } : { pct014: 0, pct1564: 0, pct65: 0 };
}

// ─────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────
export function ViewBDemographics({ data, county, onBack }: ViewBDemographicsProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const c = byCode3[county];
  const N = data.summary;
  const cAgg = useMemo(
    () => data.countyAggregates.find((a) => a.code3 === county) ?? null,
    [data.countyAggregates, county],
  );

  if (!c) {
    return (
      <div className="hero">
        <h1>未知縣市：{county}</h1>
        <button className="btn" onClick={onBack}>← 返回</button>
      </div>
    );
  }
  if (data.loading || !cAgg || !N) {
    return (
      <div className="hero">
        <button className="back-link" onClick={onBack}><ChevronLeft size={12} /> 返回</button>
        <h1><span className="accent">{c.name_zh}</span><span className="small">· 人口</span></h1>
        <p className="hook">{data.loading ? "正在載入人口資料 ..." : "縣市資料尚未就緒"}</p>
      </div>
    );
  }

  const popRank     = rankBy(data.countyAggregates, county, "pop");
  const agingRank   = rankBy(data.countyAggregates, county, "agingIndex");
  const densityRank = rankBy(data.countyAggregates, county, "density");
  const depRank     = rankBy(data.countyAggregates, county, "depRatio");
  const growthRank  = rankBy(data.countyAggregates, county, "growth10y");
  const socialRank  = rankBy(data.countyAggregates, county, "social");

  return (
    <div>
      <Hero
        c={c}
        p={cAgg}
        N={N}
        popRank={popRank}
        agingRank={agingRank}
        densityRank={densityRank}
        growthRank={growthRank}
        depRank={depRank}
        onBack={onBack}
      />

      <div className="tab-bar">
        {(
          [
            ["overview", "概覽"],
            ["age",      "年齡結構"],
            ["dynamics", "人口動態"],
            ["urban",    "城鄉分布"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab c={c} p={cAgg} N={N}
          popRank={popRank} agingRank={agingRank} growthRank={growthRank} depRank={depRank}
        />
      )}
      {tab === "age" && (
        <AgeTab data={data} c={c} p={cAgg} N={N} agingRank={agingRank} />
      )}
      {tab === "dynamics" && (
        <DynamicsTab c={c} p={cAgg} socialRank={socialRank} />
      )}
      {tab === "urban" && (
        <UrbanTab data={data} c={c} p={cAgg} N={N} densityRank={densityRank} />
      )}

      <DataSourceBadge
        sources={["內政部戶政司", "demographics.population_by_age_sex_county（2025 年度）", "demographics.county_indicators_yearly（2025）", "spatial.national_population_trend / village_demographics_yearly"]}
        updatedAt="2026-05-30"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Hero · 縣市名片 + 4 fact tile
// ─────────────────────────────────────────────────

interface CountyMeta {
  name_zh: string;
  region: string;
  area_km2: number;
}

interface HeroProps {
  c: CountyMeta;
  p: CountyDemographics;
  N: NonNullable<DemographicsDataState["summary"]>;
  popRank: number;
  agingRank: number;
  densityRank: number;
  growthRank: number;
  depRank: number;
  onBack: () => void;
}

function Hero({ c, p, N, popRank, agingRank, densityRank, growthRank, depRank, onBack }: HeroProps) {
  const region = REGION_LABELS[c.region] ?? c.region;
  let hook;
  if (agingRank === 1) {
    hook = <>全國<b className="em">最老縣市</b> · 老化指數 <b>{p.agingIndex.toFixed(1)}</b>（全國 {N.agingIndex.toFixed(1)} 的 {(p.agingIndex / N.agingIndex).toFixed(2)}×）</>;
  } else if (densityRank === 1) {
    hook = <>全國<b className="em">最密縣市</b> · {fmt.num(p.density)} 人/km²</>;
  } else if (p.natural > 0) {
    hook = <>自然增加 <b className="em">+{fmt.num(p.natural)}</b>（村里 12 月單月）─ 全國少數正值之一</>;
  } else if (p.growth10y > 8) {
    hook = <>10 年人口成長 <b className="em">+{p.growth10y.toFixed(2)}%</b> · 全國第 {growthRank} 名</>;
  } else if (p.growth10y < -7) {
    hook = <>10 年人口萎縮 <b className="em">{p.growth10y.toFixed(2)}%</b> · 第 {growthRank} 名（流失嚴重）</>;
  } else {
    hook = <>人口 <b>{fmt.bigNum(p.pop)}</b> · 老化 <b>{p.agingIndex.toFixed(1)}</b> · 10 年 <b>{fmt.signed(p.growth10y, 1)}%</b></>;
  }

  const rankCls = (r: number) => r <= 5 ? "high" : r >= 17 ? "low" : "";

  return (
    <div>
      <div className="hero" style={{ paddingBottom: 8 }}>
        <button className="back-link" onClick={onBack} aria-label="返回全台概覽">
          <ChevronLeft size={12} /> 返回全台概覽
        </button>
        <div className="hero-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1>
              <span className="accent">{c.name_zh}</span>
              <span className="small">· 人口</span>
              <Users size={18} color="var(--accent)" />
            </h1>
            <div className="hook" style={{ fontSize: 14 }}>{hook}</div>
          </div>
        </div>
        <div className="ch-chips" style={{ marginTop: 12, marginBottom: 0 }}>
          <span className="ch-chip region"><span className="swatch"></span>{region}</span>
          <span className="ch-chip">{fmt.num(c.area_km2)} km²</span>
          <span className="ch-chip">10 年 {fmt.signed(p.growth10y, 1)}%</span>
          <span className="ch-chip">中位數年齡 {p.medianAge.toFixed(1)}</span>
        </div>
      </div>

      <div className="county-fact-grid" style={{ marginBottom: 16 }}>
        <FactTile
          icon={<Users size={11} />}
          label="總人口"
          val={fmt.bigNum(p.pop)}
          rank={popRank}
          note={<>{(p.pop / N.totalPop * 100).toFixed(2)}% 全國</>}
        />
        <FactTile
          icon={<Triangle size={11} />}
          label="老化指數"
          val={p.agingIndex.toFixed(1)}
          rank={agingRank}
          note={<>vs 全國 <b className={p.agingIndex > N.agingIndex ? "neg" : "pos"}>
            {p.agingIndex > N.agingIndex ? "+" : ""}{(p.agingIndex - N.agingIndex).toFixed(1)}
          </b></>}
          alarm={p.agingIndex > 200}
        />
        <FactTile
          icon={<Scale size={11} />}
          label="扶養比"
          val={p.depRatio.toFixed(1)}
          unit="%"
          rank={depRank}
          note={<>vs 全國 {N.dependencyRatio.toFixed(1)}%</>}
        />
        <FactTile
          icon={<TrendingUp size={11} />}
          label="10 年成長"
          val={fmt.signed(p.growth10y, 1)}
          unit="%"
          rank={growthRank}
          note={<>{p.growth10y > 0 ? "流入" : "流失"} · 民 104→114</>}
          alarm={p.growth10y < -5}
        />
      </div>
    </div>
  );

  function FactTile({ icon, label, val, unit, rank, note, alarm }: {
    icon: React.ReactNode;
    label: string;
    val: string;
    unit?: string;
    rank: number;
    note: React.ReactNode;
    alarm?: boolean;
  }) {
    return (
      <div className={`county-fact-tile ${alarm ? "is-alarm" : ""}`}>
        <div className="cft-lbl"><span className="ico">{icon}</span>{label}</div>
        <div className="cft-val">{val}{unit && <span className="unit">{unit}</span>}</div>
        <div className="cft-foot">
          <span className={`cft-rank ${rankCls(rank)}`}>#{rank} / 22</span>
          <span className="cft-delta">{note}</span>
        </div>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────
// Tab 1 · 概覽
// ─────────────────────────────────────────────────

function OverviewTab({ c, p, N, popRank, agingRank, growthRank, depRank }: {
  c: CountyMeta;
  p: CountyDemographics;
  N: NonNullable<DemographicsDataState["summary"]>;
  popRank: number;
  agingRank: number;
  growthRank: number;
  depRank: number;
}) {
  // 該縣市人口趨勢：民 104(2015 村里) → 最新統計年(pyramid) 兩錨點線性插值（無年年資料）
  const series = useMemo(() => {
    const finalPop = p.pop;
    const basePop = p.growth10y !== -100 ? finalPop / (1 + p.growth10y / 100) : finalPop;
    return Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      const year = 2015 + i;
      return { x: year, y: Math.round(basePop + (finalPop - basePop) * t) };
    });
  }, [p.pop, p.growth10y]);

  return (
    <>
      <div className="kpi-grid cols-4">
        <KPICard
          icon={<Users size={13} />}
          label="人口"
          value={fmt.bigNum(p.pop)}
          trend={{ delta: `#${popRank} / 22`, direction: "flat", baseline: `${(p.pop / N.totalPop * 100).toFixed(2)}% 全國`, sentiment: "neutral" }}
        />
        <KPICard
          icon={<Triangle size={13} />}
          label="老化指數"
          value={p.agingIndex.toFixed(1)}
          trend={{
            delta: `#${agingRank} / 22`,
            direction: p.agingIndex > N.agingIndex ? "up" : "down",
            baseline: `vs 全國 ${N.agingIndex.toFixed(1)}`,
            sentiment: p.agingIndex > N.agingIndex ? "negative" : "positive",
          }}
        />
        <KPICard
          icon={<Scale size={13} />}
          label="扶養比"
          value={p.depRatio.toFixed(1)}
          unit="%"
          trend={{ delta: `#${depRank} / 22`, direction: "flat", baseline: `vs 全國 ${N.dependencyRatio.toFixed(1)}%`, sentiment: "neutral" }}
        />
        <KPICard
          icon={<TrendingUp size={13} />}
          label="10 年成長"
          value={fmt.signed(p.growth10y, 1)}
          unit="%"
          trend={{
            delta: `#${growthRank} / 22`,
            direction: p.growth10y > 0 ? "up" : "down",
            baseline: p.growth10y > 0 ? "人口流入" : "人口流失",
            sentiment: p.growth10y > 0 ? "positive" : "negative",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">TREND</span>
              {c.name_zh} · 人口 10 年趨勢
            </div>
            <div className="section-subtitle">
              民 104→114 · {p.growth10y > 0
                ? <>累計流入 <b style={{ color: "var(--accent-deep)" }}>+{p.growth10y.toFixed(2)}%</b></>
                : <>累計流失 <b style={{ color: "#B91C1C" }}>{p.growth10y.toFixed(2)}%</b></>}
              {" · 起 "}{fmt.num(series[0].y)}{" → 終 "}{fmt.num(series[series.length - 1].y)}
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>(端點 real，中間線性內插)</span>
            </div>
          </div>
        </div>
        <TrendChart
          series={[{ name: c.name_zh, color: "var(--accent)", data: series }]}
          xLabels={series.map((d) => d.x.toString())}
          height={190}
          showLegend={false}
        />
      </div>

      <div className="insight">
        <div className="ico"><Lightbulb size={18} /></div>
        <div className="body">
          {c.name_zh} 老化指數 <b className="em">{p.agingIndex.toFixed(1)}</b>
          {p.agingIndex > N.agingIndex
            ? <>（高於全國 {N.agingIndex.toFixed(1)}）— 老化壓力 {p.agingIndex > 200 ? <b style={{ color: "#B91C1C" }}>嚴峻</b> : "顯著"}，</>
            : <>（低於全國 {N.agingIndex.toFixed(1)}）— 結構相對年輕，</>}
          扶養比 <b>{p.depRatio.toFixed(1)}%</b>
          （{p.depRatio > N.dependencyRatio ? "高於" : "低於"}全國 {N.dependencyRatio.toFixed(1)}%）。
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 2 · 年齡結構（縣市金字塔 + 雷達）
// ─────────────────────────────────────────────────

function AgeTab({ data, c, p, N, agingRank }: {
  data: DemographicsDataState;
  c: CountyMeta;
  p: CountyDemographics;
  N: NonNullable<DemographicsDataState["summary"]>;
  agingRank: number;
}) {
  const py = useMemo(() => buildCountyPyramid(data.pyramidRows, p.id_moi, data.statYear), [data.pyramidRows, p.id_moi, data.statYear]);
  const seg = useMemo(() => derive3Segment(py), [py]);
  const maxRow = py.length > 0 ? Math.max(...py.map((r) => Math.max(r.male, r.female))) : 1;
  const maxMale = py.length > 0 ? Math.max(...py.map((r) => r.male)) : 0;
  const maxFemale = py.length > 0 ? Math.max(...py.map((r) => r.female)) : 0;
  const peakIdxM = py.findIndex((r) => r.male === maxMale);
  const peakIdxF = py.findIndex((r) => r.female === maxFemale);

  // 性別比 ♂/100♀ — real from countyAggregates
  const sexRatio = p.popFemale > 0 ? (p.popMale / p.popFemale) * 100 : 0;

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Triangle size={13} />}
          label="老化指數"
          value={p.agingIndex.toFixed(1)}
          trend={{
            delta: `#${agingRank} / 22`,
            direction: p.agingIndex > N.agingIndex ? "up" : "down",
            baseline: p.agingIndex > N.agingIndex ? "高於全國" : "低於全國",
            sentiment: p.agingIndex > N.agingIndex ? "negative" : "positive",
          }}
        />
        <KPICard
          icon={<Users size={13} />}
          label="中位數年齡"
          value={p.medianAge.toFixed(1)}
          unit="歲"
          trend={{
            delta: p.medianAge > 45 ? "偏高齡" : p.medianAge < 43 ? "偏年輕" : "中段",
            direction: "flat",
            baseline: "人口加權",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Scale size={13} />}
          label="性別比 ♂/100♀"
          value={sexRatio.toFixed(1)}
          trend={{
            delta: sexRatio > 100 ? "陽盛" : "陰盛",
            direction: "flat",
            baseline: `vs 全國 ${N.sexRatio.toFixed(1)}`,
            sentiment: "neutral",
          }}
        />
      </div>

      {/* 縣市金字塔 */}
      {py.length > 0 && (
        <div className="pop-pyramid-card">
          <div className="pop-pyramid-head">
            <div className="t">{c.name_zh} · 人口金字塔（{py.length} 組 · {data.statYear} 年度）</div>
            <div className="meta">
              男最大 <b>{py[peakIdxM]?.age ?? "—"}</b> · 女最大 <b>{py[peakIdxF]?.age ?? "—"}</b> · 65+ 占 <b>{seg.pct65.toFixed(1)}%</b>
            </div>
          </div>
          <div className="pop-pyramid">
            {py.slice().reverse().map((r, i) => {
              const idx = py.length - 1 - i;
              const isPeak = idx === peakIdxM || idx === peakIdxF;
              const isOld = Number(r.age.match(/(\d+)/)?.[1] ?? 0) >= 65;
              return (
                <div className={`ppy-row ${isPeak ? "peak" : ""} ${isOld ? "elderly" : ""}`} key={r.age}>
                  <div className="ppy-cell male">
                    <span className="ppy-num">{fmt.bigNum(r.male)}</span>
                    <div className="ppy-bar" style={{ width: `${(r.male / maxRow) * 100}%`, opacity: isOld ? 0.7 : 1 }} />
                  </div>
                  <div className="ppy-age">{r.age}</div>
                  <div className="ppy-cell female">
                    <div className="ppy-bar" style={{ width: `${(r.female / maxRow) * 100}%`, opacity: isOld ? 0.7 : 1 }} />
                    <span className="ppy-num">{fmt.bigNum(r.female)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pop-pyramid-legend">
            <div className="row gap-8">
              <span className="lg m"><i></i>男</span>
              <span className="lg f"><i></i>女</span>
              <span className="muted" style={{ fontSize: 11 }}>· 60-64 後男女拉開 · 80+ 女性顯著多於男性</span>
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              老化指數 <b style={{ color: "var(--accent-deep)" }}>{p.agingIndex.toFixed(1)}</b>
            </div>
          </div>
        </div>
      )}

      {/* 3 段年齡雷達 vs 全國 */}
      <div className="section" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RADAR</span>
              三段年齡 · {c.name_zh} vs 全國
            </div>
            <div className="section-subtitle">幼年 / 壯年 / 高齡 三段組成對比</div>
          </div>
        </div>
        <PopAgeRadar
          cityName={c.name_zh}
          city={{ a: seg.pct014, b: seg.pct1564, c: seg.pct65 }}
          nat={{ a: N.pct014, b: N.pct1564, c: N.pct65 }}
        />
      </div>
    </>
  );
}

function PopAgeRadar({ cityName, city, nat }: {
  cityName: string;
  city: { a: number; b: number; c: number };
  nat: { a: number; b: number; c: number };
}) {
  const labels: Array<{ key: "a" | "b" | "c"; label: string; max: number }> = [
    { key: "a", label: "0-14 幼年", max: 20 },
    { key: "b", label: "15-64 壯年", max: 75 },
    { key: "c", label: "65+ 高齡", max: 30 },
  ];
  const size = 260, cx = size / 2, cy = size / 2 + 4, R = 92;
  const angle = (i: number) => (Math.PI * 2 * i) / 3 - Math.PI / 2;
  const pt = (i: number, r: number): [number, number] => [
    cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r,
  ];
  const ring = (f: number) => labels.map((_, i) => pt(i, R * f).join(",")).join(" ");
  const norm = (i: number, v: number) => Math.max(0, Math.min(1, v / labels[i].max));
  const cityPts = labels.map((l, i) => norm(i, city[l.key]));
  const natPts  = labels.map((l, i) => norm(i, nat[l.key]));
  const valuePts = (vals: number[]) => labels.map((_, i) => pt(i, R * vals[i]).join(",")).join(" ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
      <svg width={size} height={size + 8}>
        {[0.33, 0.66, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="var(--border)" strokeWidth={1} opacity={0.7} />
        ))}
        {labels.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" />;
        })}
        <polygon points={valuePts(natPts)} fill="var(--text-tertiary)" fillOpacity={0.15}
          stroke="var(--text-tertiary)" strokeWidth={1.4} strokeDasharray="4 3" />
        <polygon points={valuePts(cityPts)} fill="var(--accent)" fillOpacity={0.22}
          stroke="var(--accent)" strokeWidth={2} />
        {cityPts.map((v, i) => {
          const [x, y] = pt(i, R * v);
          return <circle key={i} cx={x} cy={y} r={3.5} fill="var(--accent)" stroke="white" strokeWidth={1.5} />;
        })}
        {labels.map((l, i) => {
          const [lx, ly] = pt(i, R + 22);
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="600" fill="var(--text-secondary)">
              {l.label}
            </text>
          );
        })}
      </svg>
      <div>
        <div className="row gap-8" style={{ marginBottom: 12, fontSize: 12.5 }}>
          <span className="row gap-4"><i style={{ display: "inline-block", width: 14, height: 4, background: "var(--accent)", borderRadius: 2 }}></i>{cityName}</span>
          <span className="row gap-4"><i style={{ display: "inline-block", width: 14, height: 4, background: "var(--text-tertiary)", borderRadius: 2 }}></i>全國</span>
        </div>
        <div className="age-cmp-rows">
          {labels.map((l) => {
            const cv = city[l.key], nv = nat[l.key];
            const diff = cv - nv;
            return (
              <div key={l.key} className="age-cmp-row">
                <span className="lbl">{l.label}</span>
                <span className="cv">{cv.toFixed(1)}%</span>
                <span className="nv muted">全 {nv.toFixed(1)}%</span>
                <span className={`diff ${diff > 0.3 ? "pos" : diff < -0.3 ? "neg" : ""}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}pp
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Tab 3 · 人口動態
// ─────────────────────────────────────────────────

function DynamicsTab({ c, p, socialRank }: {
  c: CountyMeta;
  p: CountyDemographics;
  socialRank: number;
}) {
  const naturalPos = p.natural > 0;

  const flowBars = [
    { label: "自然增加", value: p.natural,             color: p.natural > 0 ? "#10B981" : "#B91C1C" },
    { label: "社會增加", value: p.social,              color: p.social > 0 ? "var(--accent)" : "#B45309" },
    { label: "淨增減",   value: p.natural + p.social,  color: (p.natural + p.social) > 0 ? "#10B981" : "#B91C1C" },
  ];
  const flowAbsMax = Math.max(...flowBars.map((b) => Math.abs(b.value)), 1);
  void socialRank; // 已透過 KPI 顯示

  return (
    <>
      <div className="kpi-grid cols-3">
        {/* Batch3 D-1：縣市別年度出生/死亡無現成來源；村里源僅 12 月單月（量級非年度）。
            明確標「12 月單月」避免裸奔偽裝年度（鐵則1）；待戶政司縣市別年度月報 ETL 接通。 */}
        <KPICard
          icon={<Baby size={13} />}
          label="出生（12 月單月）"
          value={p.birth > 0 ? fmt.num(p.birth) : "—"}
          unit="人"
          trend={{ delta: "村里 12 月單月", direction: "flat", baseline: "非年度·量級待補", sentiment: "neutral" }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="死亡（12 月單月）"
          value={p.death > 0 ? fmt.num(p.death) : "—"}
          unit="人"
          trend={{ delta: "村里 12 月單月", direction: "flat", baseline: "非年度·量級待補", sentiment: "neutral" }}
        />
        <KPICard
          icon={<ArrowLeftRight size={13} />}
          label="社會增加（實）"
          value={fmt.signed(p.social, 0)}
          unit="人"
          trend={{
            delta: `#${socialRank} / 22`,
            direction: p.social > 0 ? "up" : "down",
            baseline: p.social > 0 ? "人口遷入" : "人口遷出",
            sentiment: p.social > 0 ? "positive" : "negative",
          }}
        />
      </div>

      {/* 出生/死亡 10 年趨勢：縣市別逐年無真實來源（村里僅 104/113 兩年快照）→ placeholder */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">VITALS</span>
              {c.name_zh} · 出生 vs 死亡 10 年趨勢
            </div>
            <div className="section-subtitle">
              {naturalPos
                ? <>自然增加 <b style={{ color: "#047857" }}>+{fmt.num(p.natural)}</b>（村里 12 月單月，非年度）</>
                : <>自然增加 <b style={{ color: "#B91C1C" }}>{fmt.signed(p.natural, 0)}</b>（村里 12 月單月，非年度）</>}
            </div>
          </div>
        </div>
        <PendingDataCard
          compact
          label="縣市別出生／死亡逐年趨勢"
          note="目前縣市別僅有 2015 / 2024 兩年村里加總；完整逐年序列待戶政司縣市別出生死亡月報 ETL 接通後補上。"
        />
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">FLOW</span>
              人口增減分解（民 104→114 推估）
            </div>
            <div className="section-subtitle">
              自然 {fmt.signed(p.natural, 0)} + 社會 {fmt.signed(p.social, 0)} = 淨 {fmt.signed(p.natural + p.social, 0)}
            </div>
          </div>
        </div>
        <div className="pop-flow-bars">
          {flowBars.map((b, i) => {
            const w = (Math.abs(b.value) / flowAbsMax) * 50;
            const isNeg = b.value < 0;
            return (
              <div key={i} className="pfb-row">
                <span className="pfb-lbl">{b.label}</span>
                <div className="pfb-axis">
                  <div className="pfb-center"></div>
                  <div className={`pfb-bar ${isNeg ? "neg" : "pos"}`}
                    style={{
                      width: `${w}%`,
                      background: b.color,
                      [isNeg ? "right" : "left"]: "50%",
                    }} />
                </div>
                <span className={`pfb-val ${isNeg ? "neg" : "pos"}`}>{fmt.signed(b.value, 0)}</span>
              </div>
            );
          })}
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
          ※ 自然增加 = 出生 − 死亡（村里 <b>12 月單月</b>口徑，非全年）；社會增加 ≈ pop(114) − pop(104)
          （10 年近似）。兩者口徑不同，「淨增減」僅示意，待縣市別年度出生死亡來源接通後校正。
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 4 · 城鄉分布
// ─────────────────────────────────────────────────

function UrbanTab({ data, c, p, N, densityRank }: {
  data: DemographicsDataState;
  c: CountyMeta;
  p: CountyDemographics;
  N: NonNullable<DemographicsDataState["summary"]>;
  densityRank: number;
}) {
  // 從 villageRows year=113 加總到 town，依人口排前 8（真實，但無 town 面積故以人口排）
  const townRanking = useMemo(() => {
    const counted = new Map<string, number>();
    const cname = c.name_zh;
    for (const v of data.villageRows) {
      if (v.year !== 113) continue;
      if (v.county !== cname) continue;
      counted.set(v.town, (counted.get(v.town) ?? 0) + v.population);
    }
    return Array.from(counted.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, pop]) => ({ name, value: pop }));
  }, [data.villageRows, c.name_zh]);
  const townMax = townRanking[0]?.value ?? 1;

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Locate size={13} />}
          label="人口密度"
          value={fmt.num(p.density)}
          unit="人/km²"
          trend={{
            delta: `#${densityRank} / 22`,
            direction: p.density > N.density ? "up" : "down",
            baseline: `vs 全國 ${fmt.num(N.density)}`,
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Users size={13} />}
          label="日夜人口比"
          value="整備中"
          trend={{ delta: "縣市別資料整備中", direction: "flat", baseline: "全國值可用", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Home size={13} />}
          label="戶量"
          value={p.hhSize.toFixed(2)}
          unit="人/戶"
          trend={{
            delta: p.hhSize > 2.8 ? "大戶為主" : p.hhSize < 2.4 ? "小戶為主" : "中等",
            direction: "flat",
            baseline: `vs 全國 ${N.household.toFixed(2)}`,
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="missing-data-card" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="icon-box"><Users size={16} /></div>
        <div>
          <div className="title">日夜人口縣市別 · 資料整備中</div>
          <div className="reason">
            全國總值可用（日 3.50M / 夜 2.78M · 比 1.258）；
            縣市別日夜人口正進行 22 縣市分區整備，
            <b style={{ color: "var(--accent-deep)" }}>{c.name_zh}</b> 完成後將自動補齊。
          </div>
        </div>
      </div>

      {townRanking.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">TOWNS</span>
                {c.name_zh} · 鄉鎮市區人口排名（民 113）
              </div>
              <div className="section-subtitle">
                依村里加總到 town · 列前 {townRanking.length} 名 · 待補 town 面積後可改畫密度
              </div>
            </div>
            <span className="coverage-badge">⓵ town 面積待補 · 改密度</span>
          </div>
          <div className="village-ranking">
            {townRanking.map((v, i) => (
              <div key={v.name} className="vr-row">
                <span className="vr-rank">{i + 1}</span>
                <span className="vr-name">{v.name}</span>
                <div className="vr-bar"><div style={{ width: `${(v.value / townMax) * 100}%` }}></div></div>
                <span className="vr-val">{fmt.num(v.value)}<span className="muted"> 人</span></span>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 10, paddingLeft: 4 }}>
            ※ 來源：spatial.village_demographics_yearly 民 113，依 town 加總
          </div>
        </div>
      )}

      <div className="insight">
        <div className="ico"><Lightbulb size={18} /></div>
        <div className="body">
          {c.name_zh} 平均密度 <b>{fmt.num(p.density)}</b> 人/km²
          {p.density > N.density
            ? <>（高於全國 <b className="em">{(p.density / Math.max(1, N.density)).toFixed(1)}×</b>）</>
            : <>（低於全國 {(N.density / Math.max(1, p.density)).toFixed(1)}× 稀疏）</>}
          {townRanking.length > 0 && (
            <>，主要鄉鎮市區人口熱點：<b>{townRanking[0].name}</b>。</>
          )}
        </div>
      </div>
    </>
  );
}

// 防止某些 icon import 未使用警告（保留型別與未來擴充）
void (TrendingUp as LucideIcon);
void COUNTIES;
