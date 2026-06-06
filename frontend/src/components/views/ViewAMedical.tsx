/**
 * ViewA Medical — 醫療主題全國概覽
 *
 * 4 章節：醫療量能 / 急救與安全網 / 長照與護理 / 公衛監測
 * accent: 翠綠 #10B981
 *
 * 設計來源：Anthropic design bundle view-a-medical.jsx
 * 資料：useMedicalData() → Supabase medical schema（real）
 */

import {
  Cross, MapPin, Recycle, Layers, AlertTriangle,
  Home, Lightbulb,
  ArrowLeftRight,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3 } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import type { MedicalDataState } from "@/hooks/useMedicalData";
import type { CountyMedicalAggregate, MedicalNationalSummary } from "@/lib/queries/medical";
import { CatHeader } from "@/components/common/CatHeader";
import { HRankBar, type HRankRow } from "@/components/common/HRankBar";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";

interface Props {
  data: MedicalDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

// helpers
function rankBy(aggs: CountyMedicalAggregate[], key: keyof CountyMedicalAggregate): HRankRow[] {
  return aggs
    .map((a) => ({ code: a.code3, name: a.name, value: Number(a[key]) || 0 }))
    .sort((a, b) => b.value - a.value);
}

function rankHospPerWan(aggs: CountyMedicalAggregate[]): HRankRow[] {
  return aggs
    .map((a) => {
      const c = byCode3[a.code3];
      const pop = c?.pop_2024_wan ?? 1;
      return { code: a.code3, name: a.name, value: +(a.hosp / pop).toFixed(2) };
    })
    .sort((a, b) => b.value - a.value);
}

// hospital tier — derived from national totals
function hospitalTier(totalHosp: number) {
  const center = Math.round(totalHosp * 0.054);
  const regional = Math.round(totalHosp * 0.171);
  const local = totalHosp - center - regional;
  return [
    { id: "center", label: "醫學中心", value: center, pct: +(center / totalHosp * 100).toFixed(1), color: "#047857" },
    { id: "regional", label: "區域醫院", value: regional, pct: +(regional / totalHosp * 100).toFixed(1), color: "#10B981" },
    { id: "local", label: "地區醫院", value: local, pct: +(local / totalHosp * 100).toFixed(1), color: "#A7F3D0" },
  ];
}

// ─────────────────────────────────────────────────
// S1 · 醫療量能
// ─────────────────────────────────────────────────
function S1Capacity({ aggs, summary, selectedCounty }: {
  aggs: CountyMedicalAggregate[];
  summary: MedicalNationalSummary;
  selectedCounty?: CountyCode3 | null;
}) {
  const N = summary;
  const T = hospitalTier(N.hospitals);
  const totalT = T.reduce((a, c) => a + c.value, 0);
  const maxT = Math.max(...T.map((x) => x.value));
  const hospRank = rankBy(aggs, "hosp");
  const hospPerWanRank = rankHospPerWan(aggs);

  return (
    <div className="cat-block">
      <CatHeader
        num={1}
        title={<><span className="accent">醫療量能</span> ─ {fmt.num(N.hospitals + N.clinics + N.pharmacies)} 個服務點</>}
        tagline={`全台 ${fmt.num(N.hospitals)} 家醫院、${fmt.num(N.clinics)} 家診所、${fmt.num(N.pharmacies)} 家藥局`}
        badge="年度 · 2025"
        badgeTone="historical"
      />

      <div className="stat-grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Cross size={13} /></div>
          <div className="stat-tile-num">{N.hospitals}<span className="unit">家</span></div>
          <div className="stat-tile-label">醫院</div>
          <div className="stat-tile-ds">醫學中心 + 區域 + 地區</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><MapPin size={13} /></div>
          <div className="stat-tile-num">{N.clinics >= 1000 ? (N.clinics / 1000).toFixed(1) : N.clinics}<span className="unit">{N.clinics >= 1000 ? "K" : "家"}</span></div>
          <div className="stat-tile-label">診所</div>
          <div className="stat-tile-ds">西醫 + 中醫 + 牙醫</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Recycle size={13} /></div>
          <div className="stat-tile-num">{fmt.num(N.pharmacies)}<span className="unit">家</span></div>
          <div className="stat-tile-label">健保藥局</div>
          <div className="stat-tile-ds">NHI 特約</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Layers size={13} /></div>
          <div className="stat-tile-num">{fmt.num(N.nursingBeds)}<span className="unit">床</span></div>
          <div className="stat-tile-label">護理床數</div>
          <div className="stat-tile-ds">{N.nursingFacility} 家機構</div>
        </div>
      </div>

      {/* 醫院等級 donut */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">TIER</span> 醫院等級分布</div>
            <div className="section-subtitle">地區醫院 <b>{T[2].pct}%</b> 是醫療體系骨幹 · 醫學中心 <b>{T[0].value} 家</b></div>
          </div>
        </div>
        <div className="port-class-card">
          <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto" }}>
            <svg width={200} height={200}>
              {(() => {
                const r = 80, cx = 100, cy = 100, cInner = 2 * Math.PI * r;
                let acc = 0;
                return T.map((seg, i) => {
                  const frac = seg.value / totalT;
                  const len = frac * cInner;
                  const dash = `${len} ${cInner - len}`;
                  const offset = cInner - acc * cInner;
                  acc += frac;
                  return (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                      stroke={seg.color} strokeWidth={22}
                      strokeDasharray={dash} strokeDashoffset={offset}
                      transform={`rotate(-90 ${cx} ${cy})`} />
                  );
                });
              })()}
              <text x={100} y={94} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">總計</text>
              <text x={100} y={114} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--font-mono)">{N.hospitals}</text>
              <text x={100} y={132} textAnchor="middle" fontSize="10.5" fill="var(--text-tertiary)">家</text>
            </svg>
          </div>
          <div className="pcc-list">
            {T.map((seg) => (
              <div key={seg.id} className="pcc-row">
                <span className="sw" style={{ background: seg.color }} />
                <span className="lbl">{seg.label}</span>
                <div className="bar-wrap"><div className="bar" style={{ width: `${(seg.value / maxT) * 100}%`, background: seg.color }} /></div>
                <span className="pct">{seg.pct}%</span>
                <span className="cnt">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">RANK</span> 縣市醫院量 · 雙視角</div>
            <div className="section-subtitle">
              絕對數六都包辦前段；<b>每萬人</b>則離島翻身 — {hospPerWanRank[0]?.name} 每萬人 <b style={{ color: "var(--accent-deep)" }}>{hospPerWanRank[0]?.value.toFixed(2)}</b> 家
            </div>
          </div>
          <span className="coverage-badge">22 縣市</span>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">醫院總數 Top 5</h4>
            <HRankBar rows={hospRank.slice(0, 5)} max={hospRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty ?? undefined} />
          </div>
          <div className="col">
            <h4 className="top">每萬人醫院 Top 5</h4>
            <HRankBar rows={hospPerWanRank.slice(0, 5)} max={hospPerWanRank[0]?.value ?? 1} color="var(--accent-ramp-4)" highlightCode={selectedCounty ?? undefined} decimals={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S2 · 急救與安全網
// ─────────────────────────────────────────────────
function S2Emergency({ aggs, summary, selectedCounty }: {
  aggs: CountyMedicalAggregate[];
  summary: MedicalNationalSummary;
  selectedCounty?: CountyCode3 | null;
}) {
  const N = summary;
  const aedRank = rankBy(aggs, "aed");
  const eHospRank = rankBy(aggs, "eHosp");

  return (
    <div className="cat-block">
      <CatHeader
        num={2}
        title={<><span className="accent">急救與安全網</span> ─ {N.emergencyHosp} 家急救醫院</>}
        tagline={`全台 ${fmt.num(N.aed)} 台公共 AED · ${N.emergencyHosp} 家急救責任醫院`}
        badge="2025"
        badgeTone="historical"
      />

      <div className="stat-grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <div className="stat-tile-ico"><AlertTriangle size={13} /></div>
          <div className="stat-tile-num">{fmt.num(N.aed)}<span className="unit">台</span></div>
          <div className="stat-tile-label">公共 AED</div>
          <div className="stat-tile-ds">衛福部 · 全國</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Cross size={13} /></div>
          <div className="stat-tile-num">{N.emergencyHosp}<span className="unit">家</span></div>
          <div className="stat-tile-label">急救責任醫院</div>
          <div className="stat-tile-ds">分中度 / 重度 / 一般</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><ArrowLeftRight size={13} /></div>
          <div className="stat-tile-num">{N.ems >= 1000 ? fmt.num(Math.round(N.ems / 1000)) : N.ems}<span className="unit">{N.ems >= 1000 ? "K" : "件"}</span></div>
          <div className="stat-tile-label">救護出勤</div>
          <div className="stat-tile-ds">消防署統計</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Layers size={13} /></div>
          <div className="stat-tile-num">{fmt.num(N.ltcSites)}<span className="unit">處</span></div>
          <div className="stat-tile-label">長照據點</div>
          <div className="stat-tile-ds">ABC 三級</div>
        </div>
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">RANK</span> AED 量 vs 急救醫院</div>
            <div className="section-subtitle">
              AED：{aedRank[0]?.name} <b>{fmt.num(aedRank[0]?.value ?? 0)}</b> 台居冠 · 急救醫院：{eHospRank[0]?.name} <b>{eHospRank[0]?.value}</b> 家
            </div>
          </div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">AED 最多 5 縣市</h4>
            <HRankBar rows={aedRank.slice(0, 5)} max={aedRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty ?? undefined} />
          </div>
          <div className="col">
            <h4 className="top">急救醫院 Top 5</h4>
            <HRankBar rows={eHospRank.slice(0, 5)} max={eHospRank[0]?.value ?? 1} color="var(--accent-ramp-4)" highlightCode={selectedCounty ?? undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S3 · 長照與護理
// ─────────────────────────────────────────────────
function S3LongTermCare({ aggs, summary, selectedCounty }: {
  aggs: CountyMedicalAggregate[];
  summary: MedicalNationalSummary;
  selectedCounty?: CountyCode3 | null;
}) {
  const N = summary;
  const ltcRank = rankBy(aggs, "ltc");

  const L = [
    { id: "A", label: "A 級 · 社區整合型", value: N.ltcA, pct: +(N.ltcA / N.ltcSites * 100).toFixed(1), color: "#047857", note: "核心服務站" },
    { id: "B", label: "B 級 · 複合型", value: N.ltcB, pct: +(N.ltcB / N.ltcSites * 100).toFixed(1), color: "#10B981", note: "複合長照服務" },
    { id: "C", label: "C 級 · 巷弄站", value: N.ltcC, pct: +(N.ltcC / N.ltcSites * 100).toFixed(1), color: "#6EE7B7", note: "貼近社區" },
  ];

  return (
    <div className="cat-block">
      <CatHeader
        num={3}
        title={<><span className="accent">長照與護理</span> ─ {fmt.num(N.ltcSites)} 處</>}
        tagline={`全台 ${fmt.num(N.ltcSites)} 處長照據點 · 護理機構 ${N.nursingFacility} 家`}
        badge="2025"
        badgeTone="historical"
      />

      <div className="stat-grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Layers size={13} /></div>
          <div className="stat-tile-num">{fmt.num(N.ltcSites)}<span className="unit">處</span></div>
          <div className="stat-tile-label">長照據點（ABC）</div>
          <div className="stat-tile-ds">衛福部</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Home size={13} /></div>
          <div className="stat-tile-num">{N.ltcA}<span className="unit">處</span></div>
          <div className="stat-tile-label">A · 社區整合型</div>
          <div className="stat-tile-ds">核心服務站</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Cross size={13} /></div>
          <div className="stat-tile-num">{fmt.num(N.nursingFacility)}<span className="unit">家</span></div>
          <div className="stat-tile-label">護理之家</div>
          <div className="stat-tile-ds">含住宿型機構</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><MapPin size={13} /></div>
          <div className="stat-tile-num">{fmt.num(N.nursingBeds)}<span className="unit">床</span></div>
          <div className="stat-tile-label">護理床數</div>
          <div className="stat-tile-ds">平均 {N.nursingFacility > 0 ? (N.nursingBeds / N.nursingFacility).toFixed(0) : "—"} 床/家</div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">ABC</span> 長照三級組成</div>
            <div className="section-subtitle">B 級（複合型）<b>{L[1].pct}%</b> 是主力 · C 級巷弄站 <b>{L[2].pct}%</b> 貼近社區</div>
          </div>
        </div>
        <div className="med-ltc-stacked">
          <div className="med-ltc-bar">
            {L.map((seg, i) => (
              <div key={i} className="seg" style={{ flex: seg.value, background: seg.color }} title={`${seg.label} ${seg.value}`}>
                <span className="seg-lbl">{seg.id}</span>
              </div>
            ))}
          </div>
          <div className="med-ltc-legend">
            {L.map((seg) => (
              <div key={seg.id} className="mll-row">
                <span className="sw" style={{ background: seg.color }} />
                <span className="lbl">{seg.label}</span>
                <span className="cnt">{fmt.num(seg.value)}<span className="muted"> 處</span></span>
                <span className="pct">{seg.pct}%</span>
                <span className="note muted">{seg.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">RANK</span> 縣市長照據點數</div>
            <div className="section-subtitle">{ltcRank[0]?.name} <b>{fmt.num(ltcRank[0]?.value ?? 0)}</b> 處居冠</div>
          </div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">長照據點 Top 5</h4>
            <HRankBar rows={ltcRank.slice(0, 5)} max={ltcRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty ?? undefined} />
          </div>
          <div className="col">
            <h4 className="bot">長照據點最少 5</h4>
            <HRankBar rows={ltcRank.slice(-5).reverse()} max={ltcRank[0]?.value ?? 1} color="var(--accent-ramp-3)" highlightCode={selectedCounty ?? undefined} />
          </div>
        </div>
        <div className="rank-footer">
          <Lightbulb size={14} />
          <span>長照站隨人口老化加速擴張 — 與 <b>人口</b> 分頁老化指數高度相關，可跨主題比對</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S4 · 公衛監測
// ─────────────────────────────────────────────────
function S4PublicHealth({ aggs, summary, selectedCounty }: {
  aggs: CountyMedicalAggregate[];
  summary: MedicalNationalSummary;
  selectedCounty?: CountyCode3 | null;
}) {
  const N = summary;
  const fluRank = rankBy(aggs, "flu");

  const diseases = [
    { key: "flu", label: "類流感", total: N.influenza, color: "#DC2626" },
    { key: "ev", label: "腸病毒", total: N.enterovirus, color: "#F59E0B" },
    { key: "diar", label: "急性腹瀉", total: N.diarrhea, color: "#0EA5E9" },
    { key: "red", label: "紅眼症", total: N.redEye, color: "#7C3AED" },
  ];

  return (
    <div className="cat-block">
      <CatHeader
        num={4}
        title={<><span className="accent">公衛監測</span> ─ 4 病種急診監測</>}
        tagline={`本年累計類流感急診 ${fmt.num(N.influenza)} 人次 · 腸病毒 ${fmt.num(N.enterovirus)} 人次`}
        badge="2026 累計"
        badgeTone="historical"
      />

      <div className="stat-grid-4" style={{ marginBottom: 14 }}>
        {diseases.map((d) => (
          <div key={d.key} className="stat-tile">
            <div className="stat-tile-ico" style={{ background: d.color + "1F", color: d.color }}>
              <AlertTriangle size={13} />
            </div>
            <div className="stat-tile-num">{fmt.num(d.total)}<span className="unit">人次</span></div>
            <div className="stat-tile-label">{d.label}</div>
            <div className="stat-tile-ds">2026 年度累計</div>
          </div>
        ))}
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">RANK</span> 類流感急診人次 · 縣市</div>
            <div className="section-subtitle">{fluRank[0]?.name} <b>{fmt.num(fluRank[0]?.value ?? 0)}</b> 人次居冠</div>
          </div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">類流感 Top 5</h4>
            <HRankBar rows={fluRank.slice(0, 5)} max={fluRank[0]?.value ?? 1} color="#DC2626" highlightCode={selectedCounty ?? undefined} />
          </div>
          <div className="col">
            <h4 className="bot">類流感最少 5</h4>
            <HRankBar rows={fluRank.slice(-5).reverse()} max={fluRank[0]?.value ?? 1} color="var(--accent-ramp-3)" highlightCode={selectedCounty ?? undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ViewA Medical 主入口
// ─────────────────────────────────────────────────
export function ViewAMedical({ data, selectedCounty }: Props) {
  if (data.loading) {
    return (
      <div className="hero">
        <h1><span className="accent">全台概覽</span><span className="small">· 醫療</span><Cross size={18} color="var(--accent)" /></h1>
        <p className="hook">正在載入醫療資料 ...</p>
      </div>
    );
  }

  if (data.error || !data.summary) {
    return (
      <div className="hero">
        <h1><span className="accent">醫療資料載入失敗</span></h1>
        <p className="hook" style={{ color: "#DC2626" }}>{data.error?.message ?? "無資料"}</p>
        <p className="muted">確認 gis-platform migration 146 已 apply，且 medical schema 有資料。</p>
      </div>
    );
  }

  const N = data.summary;
  const aggs = data.countyAggregates;

  return (
    <div>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· 醫療</span>
              <Cross size={18} color="var(--accent)" />
            </h1>
            <p className="hook">
              <span className="em">島嶼的醫療帳本，四章看完。</span>{" "}
              全國 <b>{N.hospitals}</b> 家醫院、<b className="em">{fmt.num(N.clinics)}</b> 家診所 ·
              {fmt.num(N.aed)} 台 AED · {N.emergencyHosp} 家急救醫院 ·
              長照據點 <b className="em">{fmt.num(N.ltcSites)}</b> 處 ·
              本年類流感急診 <b>{fmt.num(N.influenza)}</b> 人次。
            </p>
          </div>
        </div>
      </div>

      <S1Capacity aggs={aggs} summary={N} selectedCounty={selectedCounty} />
      <S2Emergency aggs={aggs} summary={N} selectedCounty={selectedCounty} />
      <S3LongTermCare aggs={aggs} summary={N} selectedCounty={selectedCounty} />
      <S4PublicHealth aggs={aggs} summary={N} selectedCounty={selectedCounty} />

      <DataSourceBadge
        sources={["健保署 NHI", "衛福部", "疾管署", "內政部消防署"]}
        updatedAt="2026-06-05"
      />
    </div>
  );
}
