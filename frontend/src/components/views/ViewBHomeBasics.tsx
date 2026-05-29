/**
 * ViewB Home — 縣市鑽取（基礎統計）5 章節完整實作
 *
 * 設計來源：design bundle handoff 2026-05-22 view-b.jsx::ViewB_Home
 * 結構對齊 ViewA Home：Hero · H1 行政區 · H2 地理 · H3 人口 · H4 年齡（主視覺）· H5 動態
 * 規劃文件：docs/themes/home-basics-county-indicators.md
 *
 * 資料來源：
 *   - 全國 baseline → useNationalBasics → Supabase reference.national_basics_latest（LIVE）
 *   - 縣市 SSOT → COUNTIES (id_moi/area/pop_2024_wan/region)
 *   - 村里數 + 鄉鎮人口排名 → useTownshipData → demographics.township_village_count / township_rank（真實）
 *   - per-county mock → mock-home.ts（HOME_BY_COUNTY / MUNI_INFO / COASTAL_COUNTIES）
 *   - 派生 → county-stats.ts（deriveHomeStats / rankAmongCounties / vsNationalTag）
 *   - 待 ETL：reference.national_basics_by_county_monthly / _yearly（規劃中）
 */

import {
  Share2, Download, Plus, ChevronLeft,
  Users, Layers, Locate,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3 } from "@/lib/counties";
import type { CountyCode3, County } from "@/lib/types";
import { useNationalBasics } from "@/hooks/useNationalBasics";
import { useTownshipData } from "@/hooks/useTownshipData";
import type { TownshipRankRow } from "@/lib/queries/demographics";
import {
  HOME_BY_COUNTY,
  MUNI_INFO,
  COASTAL_COUNTIES,
  type HomeCountyDemographic,
} from "@/lib/mock-home";
import {
  deriveHomeStats,
  rankAmongCounties,
  vsNationalTag,
  neighborCounties,
  type HomeCountyStats,
} from "@/lib/county-stats";
import { WaterCatHeader as CatHeader } from "@/components/water/WaterCatHeader";
import { PendingDataCard } from "@/components/common/PendingDataCard";

type ViewModel = ReturnType<typeof useNationalBasics>["data"];

interface Props {
  county: CountyCode3;
  onBack: () => void;
  onAddCompare?: () => void;
  onCityClick?: (code: CountyCode3) => void;
}

const REGION_ZH: Record<string, string> = {
  north: "北部", central: "中部", south: "南部", east: "東部", island: "離島",
};

const PROVINCIAL_CITIES = new Set(["HSH", "CYC", "KLC"]);

export function ViewBHomeBasics({ county, onBack, onAddCompare, onCityClick }: Props) {
  const c = byCode3[county];
  const hd = HOME_BY_COUNTY[county];
  const { data: nat } = useNationalBasics();
  const township = useTownshipData();

  if (!c || !hd) {
    return (
      <div className="hero">
        <h1>找不到縣市 {county}</h1>
        <button className="btn" onClick={onBack}>← 返回</button>
      </div>
    );
  }

  const s = deriveHomeStats(c, hd);
  const region = REGION_ZH[c.region] ?? c.region;
  const muni = MUNI_INFO[c.code3];

  // 村里數 / 鄉鎮排名：優先真實（demographics.township_*），無則 fallback 估算
  const realVillages = township.villageCountByCountyId[c.id_moi];
  const villagesIsReal = realVillages != null;
  const villages = villagesIsReal ? realVillages : s.villages;
  // 鄰數無真實源：以村里數推估（×18.69），real villages 在手時估得更準，仍標「估」
  const neighborhoods = villagesIsReal ? Math.round(realVillages * 18.69) : s.neighborhoods;
  const townRanks = township.ranksByCountyId[c.id_moi] ?? [];

  // 4 fact tile ranks
  const popRank     = rankAmongCounties(c.code3, (cc) => cc.pop_2024_wan).rank;
  const areaRank    = rankAmongCounties(c.code3, (cc) => cc.area_km2).rank;
  const densityRank = rankAmongCounties(c.code3, (cc) => (cc.pop_2024_wan * 10000) / cc.area_km2).rank;
  const agingRank   = rankAmongCounties(c.code3, (cc) => HOME_BY_COUNTY[cc.code3]?.agingIndex ?? 0).rank;

  return (
    <div>
      {/* ===== Hero — 返回 ===== */}
      <div className="hero" style={{ paddingBottom: 8 }}>
        <button className="back-link" onClick={onBack} aria-label="返回全台概覽">
          <ChevronLeft size={12} /> 返回全台概覽
        </button>
      </div>

      {/* ===== 縣市名片 + 4 fact tile ===== */}
      <div className="county-hero-card">
        <div className="ch-titlerow">
          <h1>{c.name_zh}</h1>
          <span className="ch-en">{c.name_en}</span>
          <div className="hero-actions" style={{ marginLeft: "auto" }}>
            <button className="btn ghost" onClick={onAddCompare}><Plus size={14} /> 比較</button>
            <button className="btn ghost"><Share2 size={14} /> 分享</button>
            <button className="btn"><Download size={14} /> 匯出</button>
          </div>
        </div>
        <div className="ch-chips">
          <span className="ch-chip region"><span className="swatch"></span>{region}</span>
          {muni && <span className="ch-chip muni">直轄市 · {muni.year} 升格</span>}
          {!muni && PROVINCIAL_CITIES.has(c.code3) && <span className="ch-chip">省轄市</span>}
          <span className="ch-chip">{hd.townCount} 鄉鎮市區</span>
          <span className="ch-chip">{fmt.num(villages)} 村里{villagesIsReal ? "" : "（估）"}</span>
        </div>

        <CountyFactGrid c={c} hd={hd} s={s} nat={nat}
          popRank={popRank} areaRank={areaRank}
          densityRank={densityRank} agingRank={agingRank} />
      </div>

      <H1Admin
        c={c} hd={hd}
        villages={villages} villagesIsReal={villagesIsReal} neighborhoods={neighborhoods}
        townRanks={townRanks} townshipLoading={township.loading}
      />
      <H2Geography c={c} nat={nat} onCityClick={onCityClick} />
      <H3Population c={c} s={s} nat={nat} popRank={popRank} densityRank={densityRank} />
      <H4Age c={c} hd={hd} s={s} nat={nat} agingRank={agingRank} />
      <H5Dynamics c={c} hd={hd} nat={nat} />

      <div style={{ marginTop: 16, padding: "12px 16px", borderTop: "1px dashed var(--border)", fontSize: 11.5, color: "var(--text-tertiary)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span>資料來源：內政部戶政司 · 內政部統計處 · SEGIS</span>
        <span>·</span>
        <span>全國基準月度 {nat.as_of_month}</span>
        {!nat.is_fallback && <span style={{ color: "#059669", fontWeight: 600 }}>· 全國 LIVE Supabase</span>}
        <span style={{ marginLeft: "auto", color: "#9A6E00" }}>· 縣市指標 MOCK · 待 per-county ETL</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Hero 4 fact tile（含 rank + vs 全國）
─────────────────────────────────────────────── */
function CountyFactGrid({
  c, hd, s, nat, popRank, areaRank, densityRank, agingRank,
}: {
  c: County; hd: HomeCountyDemographic; s: HomeCountyStats; nat: ViewModel;
  popRank: number; areaRank: number; densityRank: number; agingRank: number;
}) {
  const popVsNat = (s.popTotal / nat.pop_total) * 100;
  const areaVsNat = (c.area_km2 / nat.total_area_km2) * 100;
  const densityVs = vsNationalTag(s.density, nat.pop_density, false);
  const agingVs = vsNationalTag(hd.agingIndex, nat.aging_index, true);
  const rankClass = (r: number) => r <= 5 ? "high" : r >= 17 ? "low" : "";

  return (
    <div className="county-fact-grid">
      <div className="county-fact-tile">
        <div className="cft-lbl"><span className="ico"><Users size={11} /></span>人口</div>
        <div className="cft-val">{fmt.num(s.popTotal)}<span className="unit">人</span></div>
        <div className="cft-foot">
          <span className={`cft-rank ${rankClass(popRank)}`}>#{popRank} / 22</span>
          <span className="cft-delta">{popVsNat.toFixed(2)}% 全國</span>
        </div>
      </div>

      <div className="county-fact-tile">
        <div className="cft-lbl"><span className="ico"><Layers size={11} /></span>面積</div>
        <div className="cft-val">{fmt.num(c.area_km2)}<span className="unit">km²</span></div>
        <div className="cft-foot">
          <span className={`cft-rank ${rankClass(areaRank)}`}>#{areaRank} / 22</span>
          <span className="cft-delta">{areaVsNat.toFixed(2)}% 全國</span>
        </div>
      </div>

      <div className="county-fact-tile">
        <div className="cft-lbl"><span className="ico"><Locate size={11} /></span>人口密度</div>
        <div className="cft-val">{fmt.num(Math.round(s.density))}<span className="unit">人/km²</span></div>
        <div className="cft-foot">
          <span className={`cft-rank ${rankClass(densityRank)}`}>#{densityRank} / 22</span>
          <span className="cft-delta">vs 全國 <b className={densityVs.cls}>{(s.density / nat.pop_density).toFixed(1)}x</b></span>
        </div>
      </div>

      <div className="county-fact-tile">
        <div className="cft-lbl"><span className="ico"><Users size={11} /></span>老化指數</div>
        <div className="cft-val">{hd.agingIndex.toFixed(1)}</div>
        <div className="cft-foot">
          <span className={`cft-rank ${rankClass(agingRank)}`}>#{agingRank} / 22</span>
          <span className="cft-delta">vs 全國 <b className={agingVs.cls}>{agingVs.arrow}{Math.abs(hd.agingIndex - nat.aging_index).toFixed(1)}</b></span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H1 · 行政區結構
─────────────────────────────────────────────── */
function H1Admin({
  c, hd, villages, villagesIsReal, neighborhoods, townRanks, townshipLoading,
}: {
  c: County;
  hd: HomeCountyDemographic;
  villages: number;
  villagesIsReal: boolean;
  neighborhoods: number;
  townRanks: TownshipRankRow[];
  townshipLoading: boolean;
}) {
  const RANK_CAP = 16;
  const shown = townRanks.slice(0, RANK_CAP);
  const maxPop = townRanks[0]?.population ?? 1;

  return (
    <div className="cat-block">
      <CatHeader
        num={1}
        title={<><span className="accent">行政區結構</span> ─ {c.name_zh}如何被劃分</>}
        tagline={`${hd.townCount} 鄉鎮市區 · ${fmt.num(villages)} 村里${villagesIsReal ? "" : "（估）"} · ${fmt.num(neighborhoods)} 鄰（估）`}
        badge={villagesIsReal ? "靜態 + 真實" : "靜態 + ETL"}
        badgeTone="static"
      />
      <div className="cs-admin-strip">
        <div className="cs-admin-cell">
          <div className="lbl">鄉鎮市區</div>
          <div className="val">{hd.townCount}<span className="unit">個</span></div>
          <div className="meta">官方公告 · 內政部</div>
        </div>
        <div className="cs-admin-cell">
          <div className="lbl">村里</div>
          <div className="val">{fmt.num(villages)}<span className="unit">個{villagesIsReal ? "" : "（估）"}</span></div>
          <div className={`meta${villagesIsReal ? "" : " etl"}`}>
            {villagesIsReal ? "真實 · 內政部村里數" : "待 ETL · per-county yearly"}
          </div>
        </div>
        <div className="cs-admin-cell">
          <div className="lbl">鄰</div>
          <div className="val">{fmt.num(neighborhoods)}<span className="unit">個（估）</span></div>
          <div className="meta etl">無真實源 · 由村里數推估</div>
        </div>
      </div>

      <div className="township-card">
        <div className="township-head">
          <div className="t">
            <span className="pre">DRILL</span>
            鄉鎮市區人口排名（2024-12）
          </div>
          {townRanks.length > 0 && <span className="coverage-badge">真實 · 內政部戶政司</span>}
        </div>

        {townRanks.length > 0 ? (
          <>
            <div className="village-ranking">
              {shown.map((t) => (
                <div key={t.town_name} className="vr-row">
                  <span className="vr-rank">{t.county_rank}</span>
                  <span className="vr-name">{t.town_name}</span>
                  <div className="vr-bar"><div style={{ width: `${(t.population / maxPop) * 100}%` }}></div></div>
                  <span className="vr-val">{fmt.num(t.population)}<span className="muted"> 人</span></span>
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 10, paddingLeft: 4 }}>
              {townRanks.length > RANK_CAP && <>顯示前 {RANK_CAP} / {townRanks.length} 名 · </>}
              ※ 來源：demographics.township_rank（內政部戶政司 2024-12 月底人口）
            </div>
          </>
        ) : townshipLoading ? (
          <div className="muted" style={{ fontSize: 12.5, padding: "8px 4px" }}>正在載入鄉鎮市區排名 …</div>
        ) : (
          <PendingDataCard
            compact
            label="各鄉鎮市區人口排名"
            note="鄉鎮人口排名資料載入失敗；請確認 demographics schema 已 exposed。"
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H2 · 地理位置
─────────────────────────────────────────────── */
function H2Geography({
  c, nat, onCityClick,
}: { c: County; nat: ViewModel; onCityClick?: (code: CountyCode3) => void }) {
  const region = REGION_ZH[c.region] ?? c.region;
  const neighborCodes = neighborCounties(c.code3);
  const coastline = COASTAL_COUNTIES[c.code3] ?? 0;
  const areaPct = (c.area_km2 / nat.total_area_km2) * 100;
  const isInland = coastline === 0;

  return (
    <div className="cat-block">
      <CatHeader
        num={2}
        title={<><span className="accent">地理位置</span> ─ 在台灣的哪裡</>}
        tagline={`位於台灣${region}，面積占全國 ${areaPct.toFixed(2)}%`}
        badge="靜態"
        badgeTone="static"
      />
      <div className="geo-card">
        <div className="geo-grid">
          <div className="geo-stats">
            <div className="geo-stat">
              <div className="lbl"><b>區域歸屬</b>內政部分區</div>
              <div className="v">{region}<span className="sub">{c.region === "island" ? "離島地區" : "本島"}</span></div>
            </div>
            <div className="geo-stat">
              <div className="lbl"><b>面積</b>占全國 {areaPct.toFixed(2)}%</div>
              <div className="v">{fmt.num(c.area_km2)}<span className="unit">km²</span></div>
            </div>
            <div className="geo-stat">
              <div className="lbl"><b>海岸線</b>{isInland ? "本縣市為內陸縣" : "縣市轄區範圍"}</div>
              <div className="v">
                {isInland
                  ? <span style={{ fontSize: 14, color: "var(--text-tertiary)", fontWeight: 500 }}>內陸 · 0</span>
                  : <>{fmt.num(coastline)}<span className="unit">km</span></>}
              </div>
            </div>
            <div className="geo-stat">
              <div className="lbl"><b>中心座標</b>WGS84</div>
              <div className="v" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                {c.centroid_lng.toFixed(3)}, {c.centroid_lat.toFixed(3)}
              </div>
            </div>
          </div>

          <div className="neighbor-block">
            <div className="nb-lbl">同區域縣市（{neighborCodes.length}）</div>
            <div className="neighbor-chips">
              {neighborCodes.length === 0 && <span className="muted" style={{ fontSize: 11 }}>— 無</span>}
              {neighborCodes.map((nc) => (
                <span
                  key={nc}
                  className="neighbor-chip"
                  onClick={() => onCityClick?.(nc)}
                  title={`切到 ${byCode3[nc]?.name_zh ?? nc}`}
                  style={{ cursor: onCityClick ? "pointer" : "default" }}
                >
                  {byCode3[nc]?.name_zh ?? nc}
                  <span className="arr">→</span>
                </span>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 10.5, marginTop: 8 }}>
              點縣市可切換到該縣市的儀錶板
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H3 · 人口總量
─────────────────────────────────────────────── */
function H3Population({
  c, s, nat, popRank, densityRank,
}: {
  c: County; s: HomeCountyStats; nat: ViewModel;
  popRank: number; densityRank: number;
}) {
  const malePct = (s.popMale / s.popTotal) * 100;
  const femalePct = 100 - malePct;
  const ratioVsNat = s.density / nat.pop_density;
  const popPctOfNat = (s.popTotal / nat.pop_total) * 100;
  const barScale = Math.max(s.density, nat.pop_density * 3);

  return (
    <div className="cat-block">
      <CatHeader
        num={3}
        title={<><span className="accent">人口總量</span> ─ {c.name_zh}有多少人</>}
        tagline={`${fmt.num(s.popTotal)} 人 · 性比例 ${s.sexRatio.toFixed(1)} · 密度為全國的 ${ratioVsNat.toFixed(2)} 倍`}
        badge={`月度 · ${nat.as_of_month}`}
        badgeTone="sampled"
      />

      <div className="county-pop-hero">
        <div>
          <div className="cph-big-lbl">{c.name_zh} 總人口</div>
          <div className="cph-big">{fmt.num(s.popTotal)}<span className="unit">人</span></div>
          <div className="cph-rank">
            22 縣市中排 <b>#{popRank}</b> · 占全國 <b>{popPctOfNat.toFixed(2)}%</b>
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, marginBottom: 5, letterSpacing: "0.04em" }}>男女拆分</div>
          <div className="ph-sex-bar">
            <div className="seg male" style={{ width: `${malePct}%` }}>♂ {malePct.toFixed(1)}%</div>
            <div className="seg female" style={{ width: `${femalePct}%` }}>{femalePct.toFixed(1)}% ♀</div>
          </div>
          <div className="ph-sex-meta">
            <span>男 <b>{fmt.num(s.popMale)}</b></span>
            <span><b>{fmt.num(s.popFemale)}</b> 女</span>
          </div>
          <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>
            性比例 <b style={{ color: "var(--text)" }}>{s.sexRatio.toFixed(2)}</b>（全國 {nat.sex_ratio}）
          </div>
        </div>
      </div>

      <div className="household-row">
        <div className="hr-cell">
          <div className="hr-lbl">戶數</div>
          <div className="hr-val">{fmt.num(s.households)}<span className="unit">戶</span></div>
          <div className="hr-sub">待戶政司月報 ETL · 目前由戶量推算</div>
        </div>
        <div className="hr-cell">
          <div className="hr-lbl">平均戶量</div>
          <div className="hr-val">{s.householdSize.toFixed(2)}<span className="unit">人/戶</span></div>
          <div className="hr-sub">{s.householdSize > 2.6 ? "高於全國平均" : "低於全國平均"} · 全國 {nat.household_size.toFixed(2)}</div>
        </div>
      </div>

      <div className="vs-card" style={{ marginTop: 12 }}>
        <div className="vs-card-head">
          <div className="t">人口密度 · vs 全國</div>
          <div className="meta">#{densityRank} / 22</div>
        </div>
        <div className="vs-rows">
          <div className="vs-row">
            <div className="lbl">
              <span className="nm">{c.name_zh}</span>
              <span className="sub">本縣市</span>
            </div>
            <div className="vs-bar-wrap">
              <div className="vs-bar self" style={{ width: `${Math.min(100, (s.density / barScale) * 100)}%` }} />
            </div>
            <div className="val">{fmt.num(Math.round(s.density))}<span className="unit">人/km²</span></div>
          </div>
          <div className="vs-row muted-row">
            <div className="lbl">
              <span className="nm muted-nm">全國平均</span>
              <span className="sub">baseline</span>
            </div>
            <div className="vs-bar-wrap">
              <div className="vs-bar nat" style={{ width: `${Math.min(100, (nat.pop_density / barScale) * 100)}%` }} />
            </div>
            <div className="val">{nat.pop_density.toFixed(0)}<span className="unit">人/km²</span></div>
          </div>
        </div>
        <div className="vs-card-foot">
          {c.name_zh} 為全國 <span className={`delta-tag ${ratioVsNat > 1 ? "neg" : "pos"}`}>{ratioVsNat.toFixed(2)}x</span>
          {ratioVsNat > 2 ? "高度密集" : ratioVsNat > 1 ? "略高於全國" : "低於全國"}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H4 · 年齡結構（主視覺）
─────────────────────────────────────────────── */
function H4Age({
  c, hd, s, nat, agingRank,
}: {
  c: County; hd: HomeCountyDemographic; s: HomeCountyStats; nat: ViewModel; agingRank: number;
}) {
  const max = Math.max(s.pct014, s.pct1564, s.pct65, nat.pct_15_64);
  const aboveThreshold = s.pct65 >= 20;

  return (
    <div className="cat-block">
      <CatHeader
        num={4}
        title={<><span className="accent">年齡結構</span> ─ {c.name_zh}的人口三段</>}
        tagline={`65+ 佔 ${s.pct65.toFixed(2)}% ${aboveThreshold ? "（已逾超高齡 20% 門檻）" : "（未達超高齡門檻）"} · 老化指數 ${hd.agingIndex.toFixed(1)}`}
        badge="月度 · 主視覺"
        badgeTone="live"
      />

      <div className="pyramid-card pyramid-with-overlay">
        <div className="pyramid-head">
          <div className="t">人口金字塔 · 三段年齡組</div>
          <div className="threshold">
            <i style={{ display: "inline-block", width: 2, height: 10, background: "var(--text)", verticalAlign: "middle", marginRight: 6 }} />
            全國基準線
          </div>
        </div>
        <div className="pyramid-rows">
          <AgePyramidRow grp="0 – 14 歲" tag="幼年人口" cls="young" pct={s.pct014} pop={s.pop014} max={max} natPct={nat.pct_0_14} />
          <AgePyramidRow grp="15 – 64 歲" tag="壯年人口" cls="adult" pct={s.pct1564} pop={s.pop1564} max={max} natPct={nat.pct_15_64} />
          <AgePyramidRow grp="65 歲以上" tag="高齡人口" cls="old" pct={s.pct65} pop={s.pop65} max={max} natPct={nat.pct_65_plus}
            critBadge={aboveThreshold ? "超高齡" : undefined} />
        </div>

        <div className="pyramid-foot">
          <div className="pf-cell">
            <div className="pf-lbl">老化指數（{c.name_zh}）</div>
            <div className="pf-val">
              {hd.agingIndex.toFixed(2)}
              <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>
                全國 {nat.aging_index.toFixed(1)}
              </span>
            </div>
            <div className="pf-meta">
              {hd.agingIndex > nat.aging_index
                ? <>高於全國 <b style={{ color: "#B91C1C" }}>+{(hd.agingIndex - nat.aging_index).toFixed(1)}</b></>
                : <>低於全國 <b style={{ color: "#047857" }}>−{(nat.aging_index - hd.agingIndex).toFixed(1)}</b></>}
              {" · "}22 縣市中排 #{agingRank}
            </div>
          </div>
          <div className="pf-cell">
            <div className="pf-lbl">扶養比（{c.name_zh}）</div>
            <div className="pf-val">
              {s.dependencyRatio.toFixed(2)}
              <span className="unit">%</span>
              <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>
                全國 {nat.dependency_ratio.toFixed(1)}
              </span>
            </div>
            <div className="pf-meta">每 100 壯年負擔 {s.dependencyRatio.toFixed(1)} 名依賴人口</div>
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">TREND</span>
              老化指數歷年
            </div>
            <div className="section-subtitle">{c.name_zh} vs 全國比較</div>
          </div>
        </div>
        <PendingDataCard
          compact
          label={`${c.name_zh} 老化指數逐年趨勢`}
          note="縣市別逐年老化指數序列待戶政司 ETL 接通；全國歷年見「人口」主題。"
        />
      </div>
    </div>
  );
}

function AgePyramidRow({
  grp, tag, cls, pct, pop, max, natPct, critBadge,
}: {
  grp: string; tag: string; cls: "young" | "adult" | "old";
  pct: number; pop: number; max: number; natPct: number; critBadge?: string;
}) {
  return (
    <div className={`pyr-row${critBadge ? " crit" : ""}`}>
      <div className="age-label">
        <div className="grp">
          {grp}
          {critBadge && <span className="crit-badge">{critBadge}</span>}
        </div>
        <div className="tag">{tag}</div>
      </div>
      <div className="pyr-bar-wrap">
        <div className={`pyr-bar ${cls}`} style={{ width: `${(pct / max) * 100}%` }}>
          {pct.toFixed(2)}%
        </div>
        <div className="pyr-nat-tick" style={{ left: `${(natPct / max) * 100}%` }} title={`全國 ${natPct}%`} />
      </div>
      <div className="val-side">
        <div className="v">{fmt.num(pop)}<span className="unit">人</span></div>
        <div className="sub">全國 {natPct.toFixed(2)}%</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   H5 · 人口動態
─────────────────────────────────────────────── */
function H5Dynamics({
  c, hd, nat,
}: { c: County; hd: HomeCountyDemographic; nat: ViewModel }) {
  const maxRate = Math.max(hd.birthRate, hd.deathRate, nat.birth_rate, nat.death_rate) * 1.2;
  const birthDelta = hd.birthRate - nat.birth_rate;
  const deathDelta = hd.deathRate - nat.death_rate;
  const naturalVsNat = hd.natural - nat.natural_increase_rate;

  return (
    <div className="cat-block">
      <CatHeader
        num={5}
        title={<><span className="accent">人口動態</span> ─ {c.name_zh}的拐點</>}
        tagline={`出生 ${hd.birthRate.toFixed(2)}‰ ${hd.birthRate < hd.deathRate ? "<" : ">"} 死亡 ${hd.deathRate.toFixed(2)}‰ · 自然增加 ${fmt.signed(hd.natural, 2)}‰`}
        badge="月度 + 年度"
        badgeTone="live"
      />

      <div className="dyn-card">
        <div className="dyn-head">
          <div className="t">出生率 vs 死亡率（粗率 · 每千人）</div>
          <div className="yr">{nat.as_of_month} 月度</div>
        </div>
        <div className="dyn-rows">
          <div className="dyn-row birth">
            <div className="lbl">
              <div className="nm">粗出生率</div>
              <div className="yr">{birthDelta > 0 ? "高於全國" : "低於全國"}</div>
            </div>
            <div className="bar-wrap">
              <div className="bar" style={{ width: `${(hd.birthRate / maxRate) * 100}%` }}>生</div>
            </div>
            <div className="val">{hd.birthRate.toFixed(2)}<span className="unit">‰</span></div>
          </div>
          <div className="dyn-row death">
            <div className="lbl">
              <div className="nm">粗死亡率</div>
              <div className="yr">{deathDelta > 0 ? "高於全國" : "低於全國"}</div>
            </div>
            <div className="bar-wrap">
              <div className="bar" style={{ width: `${(hd.deathRate / maxRate) * 100}%` }}>亡</div>
            </div>
            <div className="val">{hd.deathRate.toFixed(2)}<span className="unit">‰</span></div>
          </div>
        </div>

        <div className="dyn-result">
          <div className="rs-label">
            <b>自然增加率</b>
            出生率 − 死亡率　＝　{hd.birthRate.toFixed(2)} − {hd.deathRate.toFixed(2)}
          </div>
          <div className="rs-num" style={{ color: hd.natural >= 0 ? "#047857" : "#B91C1C" }}>
            {fmt.signed(hd.natural, 2)}
            <span className="unit" style={{ color: hd.natural >= 0 ? "#047857" : "#B91C1C" }}>‰</span>
          </div>
        </div>
      </div>

      {/* vs 全國對照 */}
      <div className="vs-card" style={{ marginTop: 12 }}>
        <div className="vs-card-head">
          <div className="t">出生 / 死亡 / 自然增加 · vs 全國</div>
          <div className="meta">三項對齊比較</div>
        </div>
        <div className="vs-rows">
          <VsNatPair lbl="出生率" self={hd.birthRate} nat={nat.birth_rate} unit="‰" scale={14} countyName={c.name_zh} />
          <VsNatPair lbl="死亡率" self={hd.deathRate} nat={nat.death_rate} unit="‰" scale={14} countyName={c.name_zh} />
        </div>
        <div className="vs-card-foot">
          自然增加率
          <span className={`delta-tag ${hd.natural >= 0 ? "pos" : "neg"}`}>
            {fmt.signed(hd.natural, 2)}‰
          </span>
          vs 全國
          <span className={`delta-tag ${naturalVsNat >= 0 ? "pos" : "neg"}`}>
            {fmt.signed(naturalVsNat, 2)} pp
          </span>
        </div>
      </div>

      {/* 縣市歷年雙線 */}
      <div className="section" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">TREND</span>
              {c.name_zh} · 出生 vs 死亡歷年
            </div>
            <div className="section-subtitle">該縣市出生與死亡率雙線軌跡</div>
          </div>
        </div>
        <PendingDataCard
          compact
          label={`${c.name_zh} 出生／死亡逐年趨勢`}
          note="縣市別逐年出生死亡序列待戶政司 ETL 接通；上方為最新月度粗率。"
        />
      </div>
    </div>
  );
}

function VsNatPair({
  lbl, self, nat, unit, scale, countyName,
}: { lbl: string; self: number; nat: number; unit: string; scale: number; countyName: string }) {
  return (
    <>
      <div className="vs-row">
        <div className="lbl">
          <span className="nm">{lbl}</span>
          <span className="sub">{countyName}</span>
        </div>
        <div className="vs-bar-wrap">
          <div className="vs-bar self" style={{ width: `${(self / scale) * 100}%` }} />
        </div>
        <div className="val">{self.toFixed(2)}<span className="unit">{unit}</span></div>
      </div>
      <div className="vs-row muted-row">
        <div className="lbl">
          <span className="nm muted-nm">全國</span>
          <span className="sub">baseline</span>
        </div>
        <div className="vs-bar-wrap">
          <div className="vs-bar nat" style={{ width: `${(nat / scale) * 100}%` }} />
        </div>
        <div className="val">{nat.toFixed(2)}<span className="unit">{unit}</span></div>
      </div>
    </>
  );
}
