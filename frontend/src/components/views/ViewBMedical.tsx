/**
 * ViewB Medical — 醫療主題縣市儀錶板
 *
 * 5 tabs: 概覽 / 量能 / 急救 / 長照 / 公衛
 * accent: 翠綠 #10B981
 *
 * 設計來源：Anthropic design bundle view-b-medical.jsx
 * 資料：useMedicalData() → Supabase medical schema（real）
 */

import { useState } from "react";
import {
  Cross, MapPin, Recycle, Layers, AlertTriangle,
  Home, Lightbulb, Users, Locate,
  ArrowLeftRight, ChevronLeft,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3, COUNTIES } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import type { MedicalDataState } from "@/hooks/useMedicalData";
import type { CountyMedicalAggregate, MedicalNationalSummary } from "@/lib/queries/medical";
import { KPICard } from "@/components/kpi/KPICard";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";

interface ViewBMedicalProps {
  data: MedicalDataState;
  county: CountyCode3;
  onBack: () => void;
}

type TabId = "overview" | "capacity" | "emergency" | "ltc" | "epidemic";

const REGION_LABELS: Record<string, string> = {
  north: "北部", central: "中部", south: "南部", east: "東部", island: "離島",
};

function medRankByKey(aggs: CountyMedicalAggregate[], code: CountyCode3, key: keyof CountyMedicalAggregate): number {
  const arr = aggs.map((a) => ({ code: a.code3, v: Number(a[key]) || 0 }))
    .sort((x, y) => y.v - x.v);
  return arr.findIndex((r) => r.code === code) + 1;
}

// ─────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────
function MedCityHero({ c, m, aggs, onBack }: {
  c: (typeof COUNTIES)[0];
  m: CountyMedicalAggregate;
  aggs: CountyMedicalAggregate[];
  onBack: () => void;
}) {
  const region = REGION_LABELS[c.region] ?? "";
  const hospRank = medRankByKey(aggs, c.code3 as CountyCode3, "hosp");
  const aedRank = medRankByKey(aggs, c.code3 as CountyCode3, "aed");
  const ltcRank = medRankByKey(aggs, c.code3 as CountyCode3, "ltc");
  const hospPerWan = (m.hosp / c.pop_2024_wan).toFixed(2);

  let hook: React.ReactNode;
  if (hospRank === 1)
    hook = <>全國<b className="em">醫院數最多</b> · {m.hosp} 醫院 + {fmt.num(m.clinic)} 診所 + {fmt.num(m.aed)} 台 AED</>;
  else if (m.hosp <= 3)
    hook = <>離島／小縣 · 僅 <b className="em">{m.hosp}</b> 家醫院、{m.clinic} 家診所 — 仰賴跨域轉診</>;
  else
    hook = <>{m.hosp} 家醫院 · {fmt.num(m.clinic)} 家診所 · 長照據點 {fmt.num(m.ltc)} 處</>;

  return (
    <div>
      <div className="hero" style={{ paddingBottom: 8 }}>
        <button className="back-link" onClick={onBack}>
          <ChevronLeft size={12} /> 返回全台概覽
        </button>
        <div className="hero-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1>
              <span className="accent">{c.name_zh}</span>
              <span className="small">· 醫療</span>
              <Cross size={18} color="var(--accent)" />
            </h1>
            <div className="hook" style={{ fontSize: 14 }}>{hook}</div>
          </div>
        </div>
        <div className="ch-chips" style={{ marginTop: 12, marginBottom: 0 }}>
          <span className="ch-chip region"><span className="swatch" />{region}</span>
          <span className="ch-chip">{fmt.num(c.pop_2024_wan, 1)} 萬人</span>
          <span className="ch-chip">{fmt.num(c.area_km2)} km²</span>
          <span className="ch-chip">{m.hosp} 醫院</span>
          {m.eHosp > 0 && <span className="ch-chip" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>急救醫院 {m.eHosp}</span>}
        </div>
      </div>

      <div className="county-fact-grid" style={{ marginBottom: 16 }}>
        {[
          { ico: <Cross size={11} />, label: "醫院", val: m.hosp, rank: hospRank, note: <>{hospPerWan} / 萬人</> },
          { ico: <AlertTriangle size={11} />, label: "AED", val: fmt.num(m.aed), rank: aedRank, note: <>{(m.aed / c.pop_2024_wan).toFixed(1)} 台/萬人</> },
          { ico: <Layers size={11} />, label: "長照據點", val: fmt.num(m.ltc), rank: ltcRank, note: <>{(m.ltc / c.pop_2024_wan).toFixed(1)} 處/萬人</> },
          { ico: <Locate size={11} />, label: "急救醫院", val: m.eHosp, rank: medRankByKey(aggs, c.code3 as CountyCode3, "eHosp"), note: <>轄區急救責任醫院</> },
        ].map((t, i) => (
          <div key={i} className="county-fact-tile">
            <div className="cft-lbl"><span className="ico">{t.ico}</span>{t.label}</div>
            <div className="cft-val">{t.val}</div>
            <div className="cft-foot">
              <span className={`cft-rank ${t.rank <= 5 ? "high" : t.rank >= 17 ? "low" : ""}`}>#{t.rank} / 22</span>
              <span className="cft-delta">{t.note}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Tab 1 · 概覽
// ─────────────────────────────────────────────────
function MedCityOverview({ c, m, aggs, summary }: {
  c: (typeof COUNTIES)[0]; m: CountyMedicalAggregate;
  aggs: CountyMedicalAggregate[]; summary: MedicalNationalSummary;
}) {
  const avg = {
    hospPerWan: aggs.reduce((a, x) => a + x.hosp / (byCode3[x.code3]?.pop_2024_wan ?? 1), 0) / 22,
    aedPerWan: aggs.reduce((a, x) => a + x.aed / (byCode3[x.code3]?.pop_2024_wan ?? 1), 0) / 22,
    ltcPerWan: aggs.reduce((a, x) => a + x.ltc / (byCode3[x.code3]?.pop_2024_wan ?? 1), 0) / 22,
    eHosp: aggs.reduce((a, x) => a + x.eHosp, 0) / 22,
    flu: aggs.reduce((a, x) => a + x.flu, 0) / 22,
  };
  const cur = {
    hospPerWan: m.hosp / c.pop_2024_wan,
    aedPerWan: m.aed / c.pop_2024_wan,
    ltcPerWan: m.ltc / c.pop_2024_wan,
    eHosp: m.eHosp,
    flu: m.flu,
  };

  const dims = [
    { id: "hospPerWan", label: "每萬人醫院", good: "高", cur: cur.hospPerWan, avg: avg.hospPerWan, fmt: (v: number) => v.toFixed(2) },
    { id: "aedPerWan", label: "每萬人 AED", good: "高", cur: cur.aedPerWan, avg: avg.aedPerWan, fmt: (v: number) => v.toFixed(1) },
    { id: "ltcPerWan", label: "每萬人長照", good: "高", cur: cur.ltcPerWan, avg: avg.ltcPerWan, fmt: (v: number) => v.toFixed(1) },
    { id: "eHosp", label: "急救醫院數", good: "高", cur: cur.eHosp, avg: avg.eHosp, fmt: (v: number) => v.toFixed(0) },
    { id: "flu", label: "類流感人次", good: "低", cur: cur.flu, avg: avg.flu, fmt: (v: number) => fmt.num(v), reverse: true },
  ];

  return (
    <>
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">VS NAT</span> {c.name_zh} · 5 維度 vs 全國平均</div>
            <div className="section-subtitle">綠標表示優於均值</div>
          </div>
        </div>
        <div className="med-radar-list">
          {dims.map((d) => {
            const ratio = d.cur / Math.max(0.0001, d.avg);
            const better = d.reverse ? ratio < 1 : ratio > 1;
            const widthPct = Math.min(100, Math.max(8, ratio * 50));
            return (
              <div key={d.id} className={`med-rd-row ${better ? "better" : "worse"}`}>
                <span className="med-rd-lbl">{d.label}</span>
                <span className="med-rd-good muted">「{d.good}」為佳</span>
                <div className="med-rd-track">
                  <div className="med-rd-bar" style={{ width: widthPct + "%" }} />
                  <span className="med-rd-avg" style={{ left: "50%" }} title="全國平均" />
                </div>
                <span className="med-rd-val">{d.fmt(d.cur)}</span>
                <span className="med-rd-cmp">
                  {better
                    ? <span style={{ color: "var(--accent-deep)" }}>▲ 優於均值 {(Math.abs(ratio - 1) * 100).toFixed(0)}%</span>
                    : <span style={{ color: "#B91C1C" }}>▼ 低於均值 {(Math.abs(ratio - 1) * 100).toFixed(0)}%</span>
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="kpi-grid cols-4">
        <KPICard icon={<Cross size={13} />} label="醫院" value={m.hosp} unit="家"
          trend={{ delta: `每萬人 ${(m.hosp / c.pop_2024_wan).toFixed(2)}`, direction: "flat", baseline: `全國 ${summary.hospitals}`, sentiment: "neutral" }} />
        <KPICard icon={<MapPin size={13} />} label="診所" value={fmt.num(m.clinic)} unit="家"
          trend={{ delta: `${(m.clinic / summary.clinics * 100).toFixed(1)}% 全國`, direction: "flat", baseline: "", sentiment: "neutral" }} />
        <KPICard icon={<Recycle size={13} />} label="健保藥局" value={fmt.num(m.pharm)} unit="家"
          trend={{ delta: "", direction: "flat", baseline: "NHI 特約", sentiment: "neutral" }} />
        <KPICard icon={<Layers size={13} />} label="護理床數" value={fmt.num(m.nbed)} unit="床"
          trend={{ delta: `${m.nfac} 家機構`, direction: "flat", baseline: `平均 ${m.nfac > 0 ? (m.nbed / m.nfac).toFixed(0) : "—"} 床/家`, sentiment: "neutral" }} />
      </div>

      <div className="insight">
        <div className="ico"><Lightbulb size={18} /></div>
        <div className="body">
          {c.name_zh} 服務 <b className="em">{fmt.num(c.pop_2024_wan, 1)} 萬</b> 人口，醫院密度
          <b> {(m.hosp / c.pop_2024_wan).toFixed(2)}</b> /萬人 · AED 密度 <b>{(m.aed / c.pop_2024_wan).toFixed(1)}</b> /萬人。
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 2 · 量能
// ─────────────────────────────────────────────────
function MedCityCapacity({ c, m }: {
  c: (typeof COUNTIES)[0]; m: CountyMedicalAggregate; summary: MedicalNationalSummary;
}) {
  const tier = [
    { label: "醫學中心", cityValue: Math.max(0, Math.round(m.hosp * 0.054)), color: "#047857" },
    { label: "區域醫院", cityValue: Math.max(0, Math.round(m.hosp * 0.171)), color: "#10B981" },
    { label: "地區醫院", cityValue: Math.max(1, m.hosp - Math.round(m.hosp * 0.054) - Math.round(m.hosp * 0.171)), color: "#A7F3D0" },
  ];
  const totalTier = tier.reduce((a, t) => a + t.cityValue, 0) || 1;

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard icon={<Cross size={13} />} label="醫院" value={m.hosp} unit="家"
          trend={{ delta: `${tier[0].cityValue} 醫學中心 + ${tier[1].cityValue} 區域 + ${tier[2].cityValue} 地區`, direction: "flat", baseline: "", sentiment: "neutral" }} />
        <KPICard icon={<Layers size={13} />} label="護理床數" value={fmt.num(m.nbed)} unit="床"
          trend={{ delta: `${m.nfac} 家機構`, direction: "flat", baseline: `平均 ${m.nfac > 0 ? (m.nbed / m.nfac).toFixed(0) : "—"} 床/家`, sentiment: "neutral" }} />
        <KPICard icon={<Users size={13} />} label="每萬人醫師" value="資料整備中" unit=""
          trend={{ delta: "NHI 39296", direction: "flat", baseline: "醫事人員 待匯入", sentiment: "neutral" }} />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">TIER</span> {c.name_zh} · 醫院等級分布</div>
            <div className="section-subtitle">醫學中心是區域醫療樞紐 · 地區醫院貼近社區</div>
          </div>
          <span className="coverage-badge">等級為比例估算</span>
        </div>
        <div className="med-class-bars">
          {tier.map((t, i) => (
            <div key={i} className="mcb-row">
              <span className="mcb-sw" style={{ background: t.color }} />
              <span className="mcb-lbl">{t.label}</span>
              <div className="mcb-bar"><div style={{ width: `${(t.cityValue / Math.max(1, totalTier)) * 100}%`, background: t.color }} /></div>
              <span className="mcb-val">{t.cityValue}<span className="muted"> 家</span></span>
              <span className="mcb-pct muted">{((t.cityValue / Math.max(1, totalTier)) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 3 · 急救
// ─────────────────────────────────────────────────
function MedCityEmergency({ c, m, summary }: {
  c: (typeof COUNTIES)[0]; m: CountyMedicalAggregate; summary: MedicalNationalSummary;
}) {
  return (
    <>
      <div className="kpi-grid cols-4">
        <KPICard icon={<AlertTriangle size={13} />} label="AED" value={fmt.num(m.aed)} unit="台"
          trend={{ delta: `${(m.aed / c.pop_2024_wan).toFixed(1)} /萬人`, direction: "flat", baseline: `全國 ${fmt.num(summary.aed)}`, sentiment: "neutral" }} />
        <KPICard icon={<Cross size={13} />} label="急救醫院" value={m.eHosp} unit="家"
          trend={{ delta: "中度 / 重度 / 一般", direction: "flat", baseline: `全國 ${summary.emergencyHosp} 家`, sentiment: "neutral" }} />
        <KPICard icon={<ArrowLeftRight size={13} />} label="救護出勤" value={fmt.num(m.ems)} unit="件"
          trend={{ delta: "消防署統計", direction: "flat", baseline: "", sentiment: "neutral" }} />
        <KPICard icon={<Locate size={13} />} label="診所" value={fmt.num(m.clinic)} unit="家"
          trend={{ delta: `${(m.clinic / c.pop_2024_wan).toFixed(0)} /萬人`, direction: "flat", baseline: "初級醫療可及性", sentiment: "neutral" }} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 4 · 長照
// ─────────────────────────────────────────────────
function MedCityLtc({ c, m, aggs }: {
  c: (typeof COUNTIES)[0]; m: CountyMedicalAggregate; aggs: CountyMedicalAggregate[];
}) {
  const totalABC = m.ltcA + m.ltcB + m.ltcC;
  const ltcRank = medRankByKey(aggs, c.code3 as CountyCode3, "ltc");

  return (
    <>
      <div className="kpi-grid cols-4">
        <KPICard icon={<Layers size={13} />} label="長照據點" value={fmt.num(m.ltc)} unit="處"
          trend={{ delta: `#${ltcRank} / 22`, direction: "flat", baseline: `${(m.ltc / c.pop_2024_wan).toFixed(1)} /萬人`, sentiment: "neutral" }} />
        <KPICard icon={<Home size={13} />} label="A 級" value={m.ltcA} unit="處"
          trend={{ delta: "社區整合型", direction: "flat", baseline: "核心服務站", sentiment: "neutral" }} />
        <KPICard icon={<Layers size={13} />} label="B 級" value={fmt.num(m.ltcB)} unit="處"
          trend={{ delta: "複合型", direction: "flat", baseline: totalABC > 0 ? `${(m.ltcB / totalABC * 100).toFixed(0)}% 占比` : "", sentiment: "neutral" }} />
        <KPICard icon={<MapPin size={13} />} label="C 級" value={fmt.num(m.ltcC)} unit="處"
          trend={{ delta: "巷弄站", direction: "flat", baseline: "貼近社區", sentiment: "neutral" }} />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">ABC</span> {c.name_zh} · 長照三級組成</div>
            <div className="section-subtitle">共 <b>{fmt.num(totalABC)}</b> 處 · B 級 <b>{totalABC > 0 ? (m.ltcB / totalABC * 100).toFixed(0) : 0}%</b> 主體</div>
          </div>
        </div>
        {totalABC > 0 && (
          <div className="med-ltc-stacked">
            <div className="med-ltc-bar">
              <div className="seg" style={{ flex: m.ltcA, background: "#047857" }}><span className="seg-lbl">A</span></div>
              <div className="seg" style={{ flex: m.ltcB, background: "#10B981" }}><span className="seg-lbl">B</span></div>
              <div className="seg" style={{ flex: m.ltcC, background: "#6EE7B7" }}><span className="seg-lbl">C</span></div>
            </div>
            <div className="med-ltc-legend">
              {[
                { sw: "#047857", lbl: "A · 社區整合型", cnt: m.ltcA, pct: (m.ltcA / totalABC * 100).toFixed(1), note: "核心站" },
                { sw: "#10B981", lbl: "B · 複合型", cnt: m.ltcB, pct: (m.ltcB / totalABC * 100).toFixed(1), note: "主力" },
                { sw: "#6EE7B7", lbl: "C · 巷弄站", cnt: m.ltcC, pct: (m.ltcC / totalABC * 100).toFixed(1), note: "貼近社區" },
              ].map((s) => (
                <div key={s.lbl} className="mll-row">
                  <span className="sw" style={{ background: s.sw }} />
                  <span className="lbl">{s.lbl}</span>
                  <span className="cnt">{fmt.num(s.cnt)}<span className="muted"> 處</span></span>
                  <span className="pct">{s.pct}%</span>
                  <span className="note muted">{s.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          護理之家 <b>{m.nfac}</b> 家 / 床數 <b>{fmt.num(m.nbed)}</b> 床{m.nfac > 0 && <>（平均 {(m.nbed / m.nfac).toFixed(0)} 床/家）</>}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 5 · 公衛
// ─────────────────────────────────────────────────
function MedCityEpidemic({ m, summary }: {
  c: (typeof COUNTIES)[0]; m: CountyMedicalAggregate; summary: MedicalNationalSummary;
}) {
  const diseases = [
    { key: "flu", label: "類流感", total: m.flu, natTotal: summary.influenza, color: "#DC2626" },
    { key: "ev", label: "腸病毒", total: m.ev, natTotal: summary.enterovirus, color: "#F59E0B" },
    { key: "diar", label: "急性腹瀉", total: m.diar, natTotal: summary.diarrhea, color: "#0EA5E9" },
    { key: "red", label: "紅眼症", total: m.red, natTotal: summary.redEye, color: "#7C3AED" },
  ];

  return (
    <>
      <div className="kpi-grid cols-4">
        {diseases.map((d) => (
          <KPICard key={d.key} icon={<AlertTriangle size={13} />} label={d.label} value={fmt.num(d.total)} unit="人次"
            trend={{
              delta: d.natTotal > 0 ? `${(d.total / d.natTotal * 100).toFixed(1)}% 全國` : "",
              direction: "flat", baseline: "2026 累計", sentiment: "neutral",
            }} />
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// ViewB Medical 主入口
// ─────────────────────────────────────────────────
export function ViewBMedical({ data, county, onBack }: ViewBMedicalProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const c = byCode3[county];
  const m = data.countyAggregates.find((a) => a.code3 === county);

  if (data.loading) {
    return (
      <div className="hero">
        <button className="back-link" onClick={onBack}><ChevronLeft size={12} /> 返回</button>
        <h1><span className="accent">{c?.name_zh ?? county}</span><span className="small">· 醫療</span></h1>
        <p className="hook">正在載入 ...</p>
      </div>
    );
  }

  if (!c || !m || !data.summary) {
    return (
      <div className="hero">
        <button className="back-link" onClick={onBack}><ChevronLeft size={12} /> 返回</button>
        <h1>找不到 {c?.name_zh ?? county} 的醫療資料</h1>
        <p className="muted">確認 migration 146 已 apply。</p>
      </div>
    );
  }

  return (
    <div>
      <MedCityHero c={c} m={m} aggs={data.countyAggregates} onBack={onBack} />

      <div className="tab-bar">
        {([
          ["overview", "概覽"],
          ["capacity", "量能"],
          ["emergency", "急救"],
          ["ltc", "長照"],
          ["epidemic", "公衛"],
        ] as [TabId, string][]).map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <MedCityOverview c={c} m={m} aggs={data.countyAggregates} summary={data.summary} />}
      {tab === "capacity" && <MedCityCapacity c={c} m={m} summary={data.summary} />}
      {tab === "emergency" && <MedCityEmergency c={c} m={m} summary={data.summary} />}
      {tab === "ltc" && <MedCityLtc c={c} m={m} aggs={data.countyAggregates} />}
      {tab === "epidemic" && <MedCityEpidemic c={c} m={m} summary={data.summary} />}

      <DataSourceBadge sources={["健保署 NHI", "衛福部", "疾管署"]} updatedAt="2026-06-05" />
    </div>
  );
}
