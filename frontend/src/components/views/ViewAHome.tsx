/**
 * ViewA Home — 基礎統計 5 章節
 *
 * 設計來源：design bundle handoff 2026-05-21 chat6（首頁設計確認）
 * 設計師選定版型：5 章節（行政區 / 國土地理 / 人口總量 / 年齡結構 / 人口動態），對齊水資源頁 CatHeader
 *
 * 資料來源：
 *   - 動態（人口、年齡、出生死亡）→ useNationalBasics → Supabase reference.national_basics_latest
 *   - 靜態（行政區、地理）→ national-basics.ts hardcode
 *   - mock（22 縣市 ranking、歷年趨勢、全球密度比較）→ mock-home.ts，待 ETL 補
 */

import { Share2, Download, Layers, Waves, Droplet, Move } from "lucide-react";
import { fmt } from "@/lib/format";
import { COUNTIES } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { useNationalBasics } from "@/hooks/useNationalBasics";
import { WaterCatHeader as CatHeader } from "@/components/water/WaterCatHeader";
import { TrendChart } from "@/components/charts/TrendChart";
import {
  HOME_BY_COUNTY,
  AGING_HISTORY,
  BIRTH_DEATH_HISTORY,
  DENSITY_COMPARE,
} from "@/lib/mock-home";

type ViewModel = ReturnType<typeof useNationalBasics>["data"];

interface Props {
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

export function ViewAHome({ selectedCounty }: Props) {
  const { data, loading, error } = useNationalBasics();

  // 全 hook hardcode INITIAL 就有資料，loading/error 都不阻擋畫面，只是 badge 提示
  return (
    <div>
      <Hero N={data} />
      <H1Admin N={data} />
      <H2Geography N={data} />
      <H3Population N={data} />
      <H4Age N={data} selectedCounty={selectedCounty ?? null} />
      <H5Dynamics N={data} />

      <DataSourceBadge
        sources={["內政部戶政司", "內政部統計處", "國土測繪中心", "SEGIS"]}
        updatedAt={data.as_of_month}
        isFallback={data.is_fallback}
        loading={loading}
        error={error}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Hero
─────────────────────────────────────────────── */
function Hero({ N }: { N: ViewModel }) {
  return (
    <div className="hero">
      <div className="hero-row">
        <div>
          <h1>
            <span className="accent">全台概覽</span>
            <span className="small">· 基礎</span>
          </h1>
          <p className="hook">
            <span className="em">島嶼的人口帳，分五章看完。</span>{" "}
            全國 <b>{fmt.num(N.pop_total)}</b> 人擠在 <b>{fmt.num(N.total_area_km2, 0)}</b> km²，
            密度 <b className="em">{N.pop_density.toFixed(0)}</b> 人/km²。
            老化指數 <b className="em">{N.aging_index.toFixed(1)}</b>、
            65+ 佔 <b>{N.pct_65_plus.toFixed(2)}%</b> 已逾超高齡門檻。
            出生 <b>{N.birth_rate}</b>‰ ＜ 死亡 <b>{N.death_rate}</b>‰，
            自然增加 <b className="em">{fmt.signed(N.natural_increase_rate, 2)}‰</b>。
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn ghost"><Share2 size={14} /> 分享</button>
          <button className="btn"><Download size={14} /> 匯出</button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H1 · 行政區（4 層級樹）
─────────────────────────────────────────────── */
function H1Admin({ N }: { N: ViewModel }) {
  const max = Math.log(N.neighborhoods_total + 1);
  const widthOf = (v: number) => Math.max(5, Math.min(68, (Math.log(v + 1) / max) * 100));

  const levels = [
    { ix: "L1", name: "縣市",     value: N.cities_total,      unit: "個", sub: "直轄市 6 / 縣市 16" },
    { ix: "L2", name: "鄉鎮市區", value: N.townships_total,   unit: "個", sub: "由縣市轄管" },
    { ix: "L3", name: "村里",     value: N.villages_total,    unit: "個", sub: "基層自治單位" },
    { ix: "L4", name: "鄰",       value: N.neighborhoods_total, unit: "個", sub: "戶政最小單元" },
  ];

  const labels = ["縣市", "÷ 鄉鎮市區", "÷ 村里", "÷ 鄰"];

  return (
    <div className="cat-block">
      <CatHeader
        num={1}
        title={<><span className="accent">行政區</span> ─ 島嶼如何被劃分</>}
        tagline="從 22 縣市一路展開到 14 萬鄰：行政層級的對數縮放"
        badge="靜態"
        badgeTone="static"
      />
      <div className="admin-tree">
        {levels.map((L, i) => (
          <div key={i} className="admin-tree-row">
            <div className="lvl">
              <span className="ix">{L.ix}</span>
              <span>{L.name}</span>
            </div>
            <div className="admin-tree-bar" style={{ width: `${widthOf(L.value)}%` }}>
              {labels[i]}
            </div>
            <div className="num">
              {fmt.num(L.value)}<span className="unit">{L.unit}</span>
              <span className="sub" style={{ display: "block", width: "100%", marginTop: 1 }}>{L.sub}</span>
            </div>
          </div>
        ))}
        <div className="admin-tree-foot">
          <span>平均每縣市 <b>{(N.townships_total / N.cities_total).toFixed(1)}</b> 個鄉鎮市區</span>
          <span>·</span>
          <span>平均每鄉鎮 <b>{(N.villages_total / N.townships_total).toFixed(1)}</b> 個村里</span>
          <span>·</span>
          <span>平均每村里 <b>{(N.neighborhoods_total / N.villages_total).toFixed(1)}</b> 個鄰</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H2 · 國土地理（本島 vs 離島 + 5 fact）
─────────────────────────────────────────────── */
function H2Geography({ N }: { N: ViewModel }) {
  const mainPct = (N.main_island_km2 / N.total_area_km2) * 100;
  const outPct  = (N.offshore_islands_km2 / N.total_area_km2) * 100;
  // 玉山高度（hardcoded from national-basics.ts TERRITORY）
  const highestPeak = 3952.43;
  const largestLake = 8.0;

  return (
    <div className="cat-block">
      <CatHeader
        num={2}
        title={<><span className="accent">國土地理</span> ─ 島嶼的輪廓</>}
        tagline="本島 + 離島共 36,197 km²，海岸線 1,988 km，玉山 3,952 m"
        badge="靜態"
        badgeTone="static"
      />
      <div className="territory-card">
        <div className="territory-visual">
          <div
            className="territory-block main"
            style={{ minHeight: 100, padding: "14px 16px" }}
          >
            <div className="tb-label">本島</div>
            <div className="tb-val">{fmt.num(N.main_island_km2)}<span className="unit">km²</span></div>
            <div className="tb-pct">{mainPct.toFixed(1)}% 國土</div>
          </div>
          <div
            className="territory-block out"
            style={{ minHeight: 60, padding: "12px 16px" }}
          >
            <div className="tb-label">離島</div>
            <div className="tb-val">{fmt.num(N.offshore_islands_km2, 1)}<span className="unit">km²</span></div>
            <div className="tb-pct">{outPct.toFixed(1)}%</div>
          </div>
        </div>
        <div className="territory-meta">
          <div className="territory-fact">
            <div className="ico"><Layers size={13} /></div>
            <div className="lbl"><b>國土總面積</b>本島 + 離島</div>
            <div className="v">{fmt.num(N.total_area_km2, 0)}<span className="unit">km²</span></div>
          </div>
          <div className="territory-fact">
            <div className="ico"><Waves size={13} /></div>
            <div className="lbl"><b>海岸線總長</b>含主要離島</div>
            <div className="v">{fmt.num(N.coastline_km)}<span className="unit">km</span></div>
          </div>
          <div className="territory-fact">
            <div className="ico"><Droplet size={13} /></div>
            <div className="lbl"><b>內陸水域</b>國土利用調查</div>
            <div className="v">{N.inland_water_km2.toFixed(1)}<span className="unit">km²</span></div>
          </div>
          <div className="territory-fact">
            <div className="ico"><Move size={13} /></div>
            <div className="lbl"><b>最高峰</b>玉山</div>
            <div className="v">{fmt.num(highestPeak, 2)}<span className="unit">m</span></div>
          </div>
          <div className="territory-fact">
            <div className="ico"><Waves size={13} /></div>
            <div className="lbl"><b>最大天然湖</b>日月潭</div>
            <div className="v">{largestLake.toFixed(1)}<span className="unit">km²</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H3 · 人口總量（Hero + 男女條 + 密度比較）
─────────────────────────────────────────────── */
function H3Population({ N }: { N: ViewModel }) {
  const malePct = (N.pop_male / N.pop_total) * 100;
  const femalePct = (N.pop_female / N.pop_total) * 100;
  const maxD = Math.max(...DENSITY_COMPARE.map((d) => d.v));

  return (
    <div className="cat-block">
      <CatHeader
        num={3}
        title={<><span className="accent">人口總量</span> ─ 擁擠的小島</>}
        tagline="2,326 萬人擠在 36,197 km²，密度 643 人/km² — 全球前段班"
        badge={`月度 · ${N.as_of_month}`}
        badgeTone="sampled"
      />
      <div className="pop-hero">
        <div>
          <div className="ph-big-label">全國總人口</div>
          <div className="ph-big">
            {fmt.num(N.pop_total)}
            <span className="unit">人</span>
          </div>
          <div className="ph-foot">
            <span className="muted">資料時間 {N.as_of_month} 月底 · 內政部戶政司</span>
          </div>
        </div>
        <div>
          <div className="ph-sex">
            <div className="ph-sex-bar">
              <div className="seg male" style={{ width: `${malePct}%` }}>♂ 男性</div>
              <div className="seg female" style={{ width: `${femalePct}%` }}>女性 ♀</div>
            </div>
            <div className="ph-sex-meta">
              <span>男 <b>{fmt.num(N.pop_male)}</b> · {malePct.toFixed(2)}%</span>
              <span>{femalePct.toFixed(2)}% · <b>{fmt.num(N.pop_female)}</b> 女</span>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              性比例 <b style={{ color: "var(--text)" }}>{N.sex_ratio.toFixed(2)}</b>（每 100 女對 {N.sex_ratio.toFixed(1)} 男 · 女多於男）
            </div>
          </div>
        </div>
      </div>

      <div className="density-chip">
        <div>
          <div className="muted" style={{ fontSize: 11, letterSpacing: "0.04em", marginBottom: 3 }}>人口密度</div>
          <div className="dc-num">
            {N.pop_density.toFixed(2)}<span className="unit">人/km²</span>
          </div>
          <div className="muted" style={{ fontSize: 10.5, marginTop: 3 }}>≈ 排全球第 17 名</div>
        </div>
        <div className="dc-bars">
          {DENSITY_COMPARE.map((d, i) => (
            <div key={i} className={`dc-row ${d.self ? "self" : ""}`}>
              <span className="nm">{d.name}</span>
              <div className="b"><div style={{ width: `${(d.v / maxD) * 100}%` }}></div></div>
              <span className="v">{fmt.num(Math.round(d.v))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H4 · 年齡結構（金字塔 + 老化指數 trend + 22 縣市 ranking）
─────────────────────────────────────────────── */
function H4Age({ N, selectedCounty }: { N: ViewModel; selectedCounty: CountyCode3 | null }) {
  const max = Math.max(N.pct_0_14, N.pct_15_64, N.pct_65_plus);

  // 22 縣市老化指數 ranking（mock）
  const agingAll = COUNTIES.map((c) => ({
    code: c.code3,
    name: c.name_zh,
    value: HOME_BY_COUNTY[c.code3]?.agingIndex ?? 0,
  })).sort((a, b) => b.value - a.value);

  const ah = AGING_HISTORY;
  // crossIdx reserved for future use
  // const crossIdx = ah.findIndex((d) => d.year === 2017);
  const topVal = agingAll[0]?.value ?? 1;
  const bottomVal = agingAll[agingAll.length - 1]?.value ?? 1;
  const ratio = (topVal / bottomVal).toFixed(1);

  return (
    <div className="cat-block">
      <CatHeader
        num={4}
        title={<><span className="accent">年齡結構</span> ─ 超高齡社會的臨界</>}
        tagline={`65+ 已達 ${N.pct_65_plus.toFixed(2)}%（超高齡門檻 20%）；老化指數 ${N.aging_index.toFixed(2)}，連年攀升`}
        badge={`月度 · ${N.as_of_month}`}
        badgeTone="live"
      />

      <div className="pyramid-card">
        <div className="pyramid-head">
          <div className="t">人口金字塔（三段年齡組）</div>
          <div className="threshold">超高齡門檻：<b>65+ ≥ 20%</b> · 高齡 14% · 高齡化 7%</div>
        </div>
        <div className="pyramid-rows">
          <div className="pyr-row">
            <div className="age-label">
              <div className="grp">0 – 14 歲</div>
              <div className="tag">幼年人口</div>
            </div>
            <div className="pyr-bar-wrap">
              <div className="pyr-bar young" style={{ width: `${(N.pct_0_14 / max) * 100}%` }}>
                {N.pct_0_14.toFixed(2)}%
              </div>
            </div>
            <div className="val-side">
              <div className="v">{fmt.num(N.pop_0_14)}<span className="unit">人</span></div>
              <div className="sub">{N.pct_0_14.toFixed(2)}% 佔比</div>
            </div>
          </div>

          <div className="pyr-row">
            <div className="age-label">
              <div className="grp">15 – 64 歲</div>
              <div className="tag">壯年人口</div>
            </div>
            <div className="pyr-bar-wrap">
              <div className="pyr-bar adult" style={{ width: `${(N.pct_15_64 / max) * 100}%` }}>
                {N.pct_15_64.toFixed(2)}%
              </div>
            </div>
            <div className="val-side">
              <div className="v">{fmt.num(N.pop_15_64)}<span className="unit">人</span></div>
              <div className="sub">{N.pct_15_64.toFixed(2)}% 佔比</div>
            </div>
          </div>

          <div className="pyr-row crit">
            <div className="age-label">
              <div className="grp">
                65 歲以上
                <span className="crit-badge">超高齡</span>
              </div>
              <div className="tag">高齡人口</div>
            </div>
            <div className="pyr-bar-wrap">
              <div className="pyr-bar old" style={{ width: `${(N.pct_65_plus / max) * 100}%` }}>
                {N.pct_65_plus.toFixed(2)}%
              </div>
            </div>
            <div className="val-side">
              <div className="v">{fmt.num(N.pop_65_plus)}<span className="unit">人</span></div>
              <div className="sub" style={{ color: "#B91C1C", fontWeight: 600 }}>
                ↗ 已逾 20% 門檻
              </div>
            </div>
          </div>
        </div>

        <div className="pyramid-foot">
          <div className="pf-cell">
            <div className="pf-lbl">老化指數（65+ ÷ 0-14 × 100）</div>
            <div className="pf-val">
              {N.aging_index.toFixed(2)}
              <span className="unit">%</span>
            </div>
            <div className="pf-meta">每 100 名幼年人口對應 {N.aging_index.toFixed(1)} 名高齡人口</div>
          </div>
          <div className="pf-cell">
            <div className="pf-lbl">扶養比（依賴人口 ÷ 壯年 × 100）</div>
            <div className="pf-val">
              {N.dependency_ratio.toFixed(2)}
              <span className="unit">%</span>
            </div>
            <div className="pf-meta">每 100 壯年負擔 {N.dependency_ratio.toFixed(1)} 名幼年+高齡</div>
          </div>
        </div>
      </div>

      {/* 老化指數歷年趨勢 */}
      <div className="section" style={{ marginTop: 14 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">TREND</span>
              老化指數歷年（1994–2024）
            </div>
            <div className="section-subtitle">1994–2024 老化指數持續攀升</div>
          </div>
        </div>
        <TrendChart
          series={[{ name: "老化指數", color: "var(--accent)", data: ah.map((d) => ({ x: d.year, y: d.value })) }]}
          xLabels={ah.map((d) => d.year.toString())}
          yMin={50}
          yMax={185}
          height={180}
          showLegend={false}
          annotations={[]}
        />
      </div>

      {/* 22 縣市老化指數 ranking */}
      <div className="section" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANKING</span>
              老化指數 · 22 縣市
            </div>
            <div className="section-subtitle">
              最高 {agingAll[0]?.name} <b>{topVal.toFixed(1)}</b> ↔
              最低 {agingAll[agingAll.length - 1]?.name} <b>{bottomVal.toFixed(1)}</b>　差距 <b style={{ color: "var(--accent-deep)" }}>{ratio} 倍</b>
            </div>
          </div>
        </div>
        <div className="ranking">
          <div className="ranking-col">
            <h4>最高 5 名</h4>
            <RankBars rows={agingAll.slice(0, 5)} max={topVal} highlight={selectedCounty} />
          </div>
          <div className="ranking-col">
            <h4>最低 5 名</h4>
            <RankBars rows={agingAll.slice(-5).reverse()} max={topVal} highlight={selectedCounty} tone="low" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RankBars({
  rows,
  max,
  highlight,
  tone,
}: {
  rows: Array<{ code: string; name: string; value: number }>;
  max: number;
  highlight: CountyCode3 | null;
  tone?: "low";
}) {
  return (
    <>
      {rows.map((r) => (
        <div key={r.code} className={`ranking-row ${tone === "low" ? "low" : ""} ${highlight === r.code ? "highlight" : ""}`}>
          <span className="name">{r.name}</span>
          <div className="bar-wrap">
            <div className="bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="val">{r.value.toFixed(1)}</span>
        </div>
      ))}
    </>
  );
}

/* ──────────────────────────────────────────────
   H5 · 人口動態（出生死亡對立 + 自然增加 + trend）
─────────────────────────────────────────────── */
function H5Dynamics({ N }: { N: ViewModel }) {
  const bd = BIRTH_DEATH_HISTORY;
  const maxRate = 10;
  const crossIdx = bd.findIndex((d) => d.year === 2020);

  return (
    <div className="cat-block">
      <CatHeader
        num={5}
        title={<><span className="accent">人口動態</span> ─ 人口的拐點</>}
        tagline={`出生率 ${N.birth_rate.toFixed(2)}‰ < 死亡率 ${N.death_rate.toFixed(2)}‰ — 自然減少 ${fmt.signed(N.natural_increase_rate, 2)}‰`}
        badge="月度 + 年度"
        badgeTone="live"
      />

      <div className="dyn-card">
        <div className="dyn-head">
          <div className="t">出生率 vs 死亡率（粗率 · 每千人）</div>
          <div className="yr">{N.as_of_month} 月度</div>
        </div>
        <div className="dyn-rows">
          <div className="dyn-row birth">
            <div className="lbl">
              <div className="nm">粗出生率</div>
              <div className="yr">↓ 持續下滑</div>
            </div>
            <div className="bar-wrap">
              <div className="bar" style={{ width: `${(N.birth_rate / maxRate) * 100}%` }}>生</div>
            </div>
            <div className="val">{N.birth_rate.toFixed(2)}<span className="unit">‰</span></div>
          </div>
          <div className="dyn-row death">
            <div className="lbl">
              <div className="nm">粗死亡率</div>
              <div className="yr">↑ 高齡化推升</div>
            </div>
            <div className="bar-wrap">
              <div className="bar" style={{ width: `${(N.death_rate / maxRate) * 100}%` }}>亡</div>
            </div>
            <div className="val">{N.death_rate.toFixed(2)}<span className="unit">‰</span></div>
          </div>
        </div>

        <div className="dyn-result">
          <div className="rs-label">
            <b>自然增加率</b>
            出生率 − 死亡率　＝　{N.birth_rate.toFixed(2)} − {N.death_rate.toFixed(2)}
          </div>
          <div className="rs-num">
            {fmt.signed(N.natural_increase_rate, 2)}<span className="unit">‰</span>
          </div>
        </div>

        <div className="bd-trend">
          <div className="bd-trend-head">
            <div className="t">2000–2026 · 出生 vs 死亡雙線</div>
            <div className="legend">
              <span><i style={{ background: "#059669" }}></i>出生率</span>
              <span><i style={{ background: "#DC2626" }}></i>死亡率</span>
            </div>
          </div>
          <TrendChart
            series={[
              { name: "出生率", color: "#059669", data: bd.map((d) => ({ x: d.year, y: d.birth })) },
              { name: "死亡率", color: "#DC2626", data: bd.map((d) => ({ x: d.year, y: d.death })) },
            ]}
            xLabels={bd.map((d) => d.year.toString())}
            yMin={3}
            yMax={14}
            height={170}
            showLegend={false}
            annotations={crossIdx >= 0 ? [{ atIndex: crossIdx, label: "2020 死亡 > 出生", severity: "danger" }] : []}
          />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Footer · 資料來源 badge
─────────────────────────────────────────────── */
function DataSourceBadge({
  sources,
  updatedAt,
  isFallback,
  loading,
  error,
}: {
  sources: string[];
  updatedAt: string;
  isFallback: boolean;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="data-source-badge" style={{ marginTop: 16, padding: "12px 16px", borderTop: "1px dashed var(--border)", fontSize: 11.5, color: "var(--text-tertiary)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span>資料來源：{sources.join(" · ")}</span>
      <span>·</span>
      <span>最新月度：{updatedAt}</span>
      {loading && <span style={{ color: "var(--accent-deep)" }}>· 載入中</span>}
      {error && <span style={{ color: "#B91C1C" }}>· Supabase 失敗，使用 fallback</span>}
      {!loading && !error && isFallback && <span style={{ color: "#9A6E00" }}>· hardcode fallback</span>}
      {!loading && !error && !isFallback && <span style={{ color: "#059669", fontWeight: 600 }}>· LIVE Supabase</span>}
    </div>
  );
}
