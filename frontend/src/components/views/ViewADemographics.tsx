/**
 * ViewA Demographics — 人口主題全國概覽
 *
 * 3 章節：S1 人口家底 / S2 年齡結構（金字塔）/ S3 人口動態（死亡交叉）
 * accent: 紫 #7C3AED
 *
 * 設計來源：designs Mini Taiwan Info.html · view-a-population.jsx
 * 真實資料：useDemographicsData → demographics.population_by_age_sex_county (836)
 *           + spatial.national_population_trend (10) + village_demographics_yearly (限 104/113)
 */

import {
  Users, Home, Scale, TrendingUp, Baby, AlertTriangle,
  ArrowLeftRight, Lightbulb, Share2, Download,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3 } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import type { DemographicsDataState } from "@/hooks/useDemographicsData";
import { CatHeader } from "@/components/common/CatHeader";
import { HRankBar, type HRankRow } from "@/components/common/HRankBar";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
// import { MissingDataCard } from "@/components/common/MissingDataCard"; // hidden pending data quality fix
import { KPICard } from "@/components/kpi/KPICard";
import { TrendChart } from "@/components/charts/TrendChart";

interface Props {
  data: DemographicsDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

// ─────────────────────────────────────────────────
// S1 · 人口家底
// ─────────────────────────────────────────────────
function S1Base({ data, selectedCounty }: Props) {
  const S = data.summary;
  if (!S) return null;

  // 人口密度 ranking（用 county aggregates）
  const denseRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.density }))
    .sort((a, b) => b.value - a.value);

  // 10 年成長率 ranking
  const growthRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.growth10y }))
    .sort((a, b) => b.value - a.value);

  const maxAbsGrowth = Math.max(...growthRank.map((r) => Math.abs(r.value)));

  return (
    <div className="cat-block">
      <CatHeader
        num={1}
        title={<><span className="accent">人口家底</span> ─ 2,340 萬人，分布有多不均</>}
        tagline="總量、性別、密度、戶量、10 年成長分解"
        badge="年度 · 2024"
        badgeTone="historical"
      />

      {/* big-callout：總人口 + 性別比 */}
      <div className="big-callout" style={{ marginBottom: 14 }}>
        <div>
          <div className="bc-label">2024 年底 全國總人口（現住人口）</div>
          <div className="bc-big">
            {fmt.num(S.totalPop)}<span className="unit">人</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.55 }}>
            較民國 112 約 <b style={{ color: "#B91C1C" }}>{fmt.signed(S.totalPopDelta, 0)}</b>
            {" "}· 10 年僅減 {fmt.signed(S.growth10y, 1)}%，但 <b style={{ color: "var(--accent-deep)" }}>分布劇烈遷移</b>
          </div>
          <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>
            ※ 口徑：現住人口 · 2024（年底，性別×年齡加總）。與首頁「戶籍登記」口徑不同，故總數略有差異
          </div>
        </div>
        <div className="bc-meta">
          <div className="row gap-8" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>性別比 ♂/100♀</span>
            <b style={{ fontSize: 18, color: "var(--accent-deep)", fontVariantNumeric: "tabular-nums" }}>
              {S.sexRatio.toFixed(2)}
            </b>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>陰盛陽衰</span>
          </div>
          <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
            <div style={{
              flex: S.popMale,
              background: "linear-gradient(90deg, #6366F1 0%, #818CF8 100%)",
              display: "flex", alignItems: "center", padding: "0 8px",
              color: "white", fontSize: 11, fontWeight: 600,
            }}>♂ {fmt.bigNum(S.popMale)}</div>
            <div style={{
              flex: S.popFemale,
              background: "linear-gradient(90deg, #F472B6 0%, #EC4899 100%)",
              display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 8px",
              color: "white", fontSize: 11, fontWeight: 600,
            }}>{fmt.bigNum(S.popFemale)} ♀</div>
          </div>
          <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
            男 {fmt.num(S.popMale)}（{((S.popMale / S.totalPop) * 100).toFixed(2)}%）·
            女 {fmt.num(S.popFemale)}（{((S.popFemale / S.totalPop) * 100).toFixed(2)}%）
          </div>
        </div>
      </div>

      {/* 4 個 stat-tile */}
      <div className="stat-grid-4" style={{ marginBottom: 16 }}>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Users size={13} /></div>
          <div className="stat-tile-num">{fmt.num(S.density)}<span className="unit">人/km²</span></div>
          <div className="stat-tile-label">人口密度</div>
          <div className="stat-tile-ds">23.4M ÷ 36,189 km²</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Home size={13} /></div>
          <div className="stat-tile-num">{S.household.toFixed(2)}<span className="unit">人/戶</span></div>
          <div className="stat-tile-label">平均戶量</div>
          <div className="stat-tile-ds">村里中位 2.56</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Scale size={13} /></div>
          <div className="stat-tile-num">{S.dependencyRatio.toFixed(1)}<span className="unit">%</span></div>
          <div className="stat-tile-label">扶養比</div>
          <div className="stat-tile-ds">幼 {S.depYoung.toFixed(1)}% + 老 {S.depOld.toFixed(1)}%</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><TrendingUp size={13} /></div>
          <div className="stat-tile-num">{fmt.signed(S.growth10y, 1)}<span className="unit">%</span></div>
          <div className="stat-tile-label">10 年成長</div>
          <div className="stat-tile-ds">民國 104→113</div>
        </div>
      </div>

      {/* 排名：10 年成長率（Top5 流入 / Bottom5 流出） */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">GROWTH</span>
              10 年成長率 · 兩極差距
            </div>
            <div className="section-subtitle">
              {growthRank[0]?.name} {fmt.signed(growthRank[0]?.value ?? 0, 2)}% ↔
              {" "}{growthRank.at(-1)?.name} {fmt.signed(growthRank.at(-1)?.value ?? 0, 2)}%
            </div>
          </div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">最高 5 名（人口流入）</h4>
            <HRankBar
              rows={growthRank.slice(0, 5)}
              max={maxAbsGrowth}
              color="var(--accent)"
              highlightCode={selectedCounty}
              unit="%"
              decimals={2}
            />
          </div>
          <div className="col">
            <h4 className="bot">最低 5 名（人口流出）</h4>
            <HRankBar
              rows={growthRank.slice(-5).reverse().map((r) => ({ ...r, value: Math.abs(r.value) }))}
              max={maxAbsGrowth}
              color="#B91C1C"
              highlightCode={selectedCounty}
              unit="%"
              decimals={2}
            />
          </div>
        </div>
      </div>

      {/* 排名：人口密度（最密 5 / 最疏 5） */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">DENSITY</span>
              人口密度 · 都市 vs 鄉村
            </div>
            <div className="section-subtitle">
              {denseRank[0]?.name} <b>{fmt.num(denseRank[0]?.value ?? 0)}</b> 人/km² 是
              {" "}{denseRank.at(-1)?.name} <b>{fmt.num(denseRank.at(-1)?.value ?? 0)}</b> 的
              {" "}<b style={{ color: "var(--accent-deep)" }}>{Math.round((denseRank[0]?.value ?? 0) / Math.max(1, denseRank.at(-1)?.value ?? 1))} 倍</b>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>單位：人/km²</div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">最密 5 縣市</h4>
            <HRankBar rows={denseRank.slice(0, 5)} max={denseRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty} decimals={0} />
          </div>
          <div className="col">
            <h4 className="bot">最疏 5 縣市</h4>
            <HRankBar rows={denseRank.slice(-5).reverse()} max={denseRank[0]?.value ?? 1} color="var(--accent-ramp-3)" highlightCode={selectedCounty} decimals={0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S2 · 年齡結構（金字塔）
// ─────────────────────────────────────────────────
function S2Pyramid({ data, selectedCounty }: Props) {
  const S = data.summary;
  const P = data.pyramid;
  if (!S || P.length === 0) return null;

  const maxRow = Math.max(...P.map((r) => Math.max(r.male, r.female)));
  // 找峰值男 / 女
  const maxMale = Math.max(...P.map((r) => r.male));
  const maxFemale = Math.max(...P.map((r) => r.female));
  const peakIdxM = P.findIndex((r) => r.male === maxMale);
  const peakIdxF = P.findIndex((r) => r.female === maxFemale);
  const peakAgeM = P[peakIdxM]?.age ?? "";
  const peakAgeF = P[peakIdxF]?.age ?? "";

  // 老化排名
  const agingRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.agingIndex }))
    .sort((a, b) => b.value - a.value);

  // 老化指數歷年
  const ah = data.agingHistory;
  // crossYearIdx reserved for future annotation use
  // const crossYearIdx = ah.findIndex((d) => d.yearMinguo === S.crossYearMinguo);

  return (
    <div className="cat-block">
      <CatHeader
        num={2}
        title={<><span className="accent">年齡結構</span> ─ 全國金字塔（19 組）</>}
        tagline={`老化指數 ${S.agingIndex.toFixed(1)}，65+ 佔 ${S.pct65.toFixed(2)}% 逼近超高齡門檻`}
        badge="主視覺"
        badgeTone="live"
      />

      <div className="kpi-grid cols-3" style={{ marginBottom: 14 }}>
        <KPICard
          icon={<Users size={13} />}
          label="0–14 歲（幼年）"
          value={S.pct014.toFixed(2)}
          unit="%"
          trend={{ delta: `${fmt.bigNum(Math.round(S.totalPop * S.pct014 / 100))} 人`, direction: "down", baseline: "持續萎縮", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Users size={13} />}
          label="15–64 歲（壯年）"
          value={S.pct1564.toFixed(2)}
          unit="%"
          trend={{ delta: `${fmt.bigNum(Math.round(S.totalPop * S.pct1564 / 100))} 人`, direction: "flat", baseline: "勞動主力", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Users size={13} />}
          label="65+（高齡）"
          value={S.pct65.toFixed(2)}
          unit="%"
          trend={{ delta: `${fmt.bigNum(Math.round(S.totalPop * S.pct65 / 100))} 人`, direction: "up", baseline: "迫近 20% 超高齡門檻", sentiment: "negative" }}
        />
      </div>

      {/* 金字塔 */}
      <div className="pop-pyramid-card">
        <div className="pop-pyramid-head">
          <div className="t">全國人口金字塔 · 男 ♂ 左 / 女 ♀ 右</div>
          <div className="meta">
            男最大 {peakAgeM} <b>{fmt.num(maxMale)}</b> · 女最大 {peakAgeF} <b>{fmt.num(maxFemale)}</b>
          </div>
        </div>
        <div className="pop-pyramid">
          {P.slice().reverse().map((r, i) => {
            const idx = P.length - 1 - i;
            const isPeak = idx === peakIdxM || idx === peakIdxF;
            const isOld = Number(r.age.match(/(\d+)/)?.[1] ?? 0) >= 65;     // 65+（依 age_band 下界，不依固定 index）
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
            老化指數 <b style={{ color: "var(--accent-deep)" }}>{S.agingIndex.toFixed(1)}</b> = 65+ ÷ 0-14 × 100
          </div>
        </div>
      </div>

      {/* 老化指數 10 年 trend */}
      {ah.length > 0 && (
        <div className="section" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">TREND</span>
                老化指數 10 年攀升（民國 104–113）
              </div>
              <div className="section-subtitle">
                從 <b>{ah[0].value.toFixed(1)}</b> 增至 <b>{ah.at(-1)?.value.toFixed(1)}</b>，
                10 年增 <b style={{ color: "var(--accent-deep)" }}>
                  {((ah.at(-1)?.value ?? 0) - ah[0].value).toFixed(1)} 點
                </b>
              </div>
            </div>
          </div>
          <TrendChart
            series={[{ name: "老化指數", color: "var(--accent)", data: ah.map((d) => ({ x: d.year, y: d.value })) }]}
            xLabels={ah.map((d) => d.year.toString())}
            yMin={Math.min(...ah.map((d) => d.value)) - 5}
            yMax={Math.max(...ah.map((d) => d.value)) + 5}
            height={160}
            showLegend={false}
            annotations={[]}
          />
        </div>
      )}

      {/* 排名：老化指數 */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANKING</span>
              老化指數 · 22 縣市差距 {(agingRank[0]?.value / Math.max(1, agingRank.at(-1)?.value ?? 1)).toFixed(1)} 倍
            </div>
            <div className="section-subtitle">
              最老 {agingRank[0]?.name} <b>{agingRank[0]?.value.toFixed(1)}</b> ↔
              最年輕 {agingRank.at(-1)?.name} <b>{agingRank.at(-1)?.value.toFixed(1)}</b>
            </div>
          </div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">最老 5 縣市</h4>
            <HRankBar rows={agingRank.slice(0, 5)} max={agingRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty} decimals={1} />
          </div>
          <div className="col">
            <h4 className="bot">最年輕 5 縣市</h4>
            <HRankBar rows={agingRank.slice(-5).reverse()} max={agingRank[0]?.value ?? 1} color="var(--accent-ramp-3)" highlightCode={selectedCounty} decimals={1} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S3 · 人口動態（出生 vs 死亡，死亡交叉）
// ─────────────────────────────────────────────────
function S3Vitals({ data, selectedCounty }: Props) {
  const S = data.summary;
  const V = data.vitalsTrend;
  if (!S || V.length === 0) return null;

  // 自然增加 / 社會增加 排名
  const naturalRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.natural }))
    .sort((a, b) => b.value - a.value);
  const socialRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.social }))
    .sort((a, b) => b.value - a.value);

  // 死亡交叉年 index in V
  const crossIdx = V.findIndex((v) => v.yearMinguo === S.crossYearMinguo);

  const positiveNatural = naturalRank.filter((r) => r.value > 0);

  return (
    <div className="cat-block">
      <CatHeader
        num={3}
        title={
          <>
            <span className="accent">人口動態</span> ─
            {S.crossYearMinguo ? ` 死亡交叉年 ${S.crossYearMinguo + 1911}` : " 出生死亡動態"}
          </>
        }
        tagline={`自然增加從 +${fmt.num(V[0]?.natural ?? 0)}（${V[0]?.year}）翻轉為 ${fmt.signed(V.at(-1)?.natural ?? 0, 0)}（${V.at(-1)?.year}）`}
        badge={`${V[0]?.year}–${V.at(-1)?.year}`}
        badgeTone="historical"
      />

      <div className="kpi-grid cols-3" style={{ marginBottom: 14 }}>
        <KPICard
          icon={<Baby size={13} />}
          label={`${V.at(-1)?.year} 出生`}
          value={fmt.num(S.births)}
          unit="人"
          trend={{ delta: `vs ${V[0]?.year} ↓ ${fmt.num((V[0]?.birth ?? 0) - S.births)}`, direction: "down", baseline: "10 年腰斬", sentiment: "negative" }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label={`${V.at(-1)?.year} 死亡`}
          value={fmt.num(S.deaths)}
          unit="人"
          trend={{ delta: `vs ${V[0]?.year} ↑ ${fmt.num(S.deaths - (V[0]?.death ?? 0))}`, direction: "up", baseline: "高齡化推升", sentiment: "negative" }}
        />
        <KPICard
          icon={<ArrowLeftRight size={13} />}
          label="自然增加"
          value={fmt.signed(S.natural, 0)}
          unit="人"
          trend={{
            delta: S.natural < 0 ? "已連年負值" : "仍維持正值",
            direction: S.natural < 0 ? "down" : "up",
            baseline: S.crossYearMinguo ? `民 ${S.crossYearMinguo} 首次翻負` : "—",
            sentiment: "negative",
          }}
        />
      </div>

      {/* 雙線：出生 vs 死亡 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">CROSS</span>
              出生 vs 死亡 雙線（{V[0]?.year}–{V.at(-1)?.year}）
            </div>
            <div className="section-subtitle">
              {S.crossYearMinguo && crossIdx >= 0 && (
                <>
                  <b style={{ color: "#B91C1C" }}>{V[crossIdx].year} 死亡交叉</b>：
                  出生 {fmt.num(V[crossIdx].birth)} ＜ 死亡 {fmt.num(V[crossIdx].death)}，
                  自然增加首次翻負（{fmt.signed(V[crossIdx].natural, 0)}）
                </>
              )}
            </div>
          </div>
          <div className="dual-trend-legend">
            <span><i style={{ background: "#10B981" }}></i>出生</span>
            <span><i style={{ background: "#B91C1C" }}></i>死亡</span>
          </div>
        </div>
        <TrendChart
          series={[
            { name: "出生", color: "#10B981", data: V.map((d) => ({ x: d.year, y: d.birth })) },
            { name: "死亡", color: "#B91C1C", data: V.map((d) => ({ x: d.year, y: d.death })) },
          ]}
          xLabels={V.map((d) => d.year.toString())}
          height={200}
          showLegend={false}
          annotations={crossIdx >= 0 ? [{ atIndex: crossIdx, label: `${V[crossIdx].year} 死亡 > 出生`, severity: "danger" }] : []}
        />
        {S.crossYearMinguo && (
          <div className="cross-callout">
            <span className="yr">{S.crossYearMinguo + 1911}</span>
            <span>
              <b>死亡交叉年</b> — 全國 22 縣市中
              {" "}
              {positiveNatural.length > 0 ? (
                <>
                  僅 <b style={{ color: "var(--accent-deep)" }}>
                    {positiveNatural.map((p) => `${p.name} ${fmt.signed(p.value, 0)}`).slice(0, 2).join(" / ")}
                  </b>
                  {" "}仍維持自然增加正值
                </>
              ) : (
                <>所有縣市皆自然增加負值</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* 社會增加 Top5 */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">MIGRATION</span>
              社會增加 · Top 5（人口遷入）
            </div>
            <div className="section-subtitle">補不上自然減少 — 但都會區仍持續吸納人口</div>
          </div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">社會增加 Top 5（遷入）</h4>
            <HRankBar
              rows={socialRank.slice(0, 5)}
              max={Math.max(1, socialRank[0]?.value ?? 1)}
              color="var(--accent)"
              highlightCode={selectedCounty}
              decimals={0}
            />
          </div>
          <div className="col">
            <h4 className="bot">自然增加 Top 5</h4>
            <HRankBar
              rows={naturalRank.slice(0, 5).map((r) => ({ ...r, value: Math.abs(r.value) }))}
              max={Math.max(...naturalRank.map((r) => Math.abs(r.value)))}
              color="var(--accent-ramp-3)"
              highlightCode={selectedCounty}
              decimals={0}
            />
          </div>
        </div>
        <div className="rank-footer">
          <Lightbulb size={14} />
          <span>
            {V.at(-1)?.year} 自然增加為正的縣市僅 <strong style={{ color: "var(--accent-deep)" }}>{positiveNatural.length}</strong>
            {" "}個（{positiveNatural.slice(0, 3).map((p) => p.name).join(" / ") || "—"}），
            其餘 {22 - positiveNatural.length} 個皆負
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ViewA Demographics 主入口
// ─────────────────────────────────────────────────
export function ViewADemographics({ data, selectedCounty, onCountyClick }: Props) {
  const S = data.summary;

  // 防禦：summary 為 null 但無 error 時當 loading（hook race condition fallback）
  if (data.loading || (!S && !data.error)) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">全台概覽</span>
          <span className="small">· 人口</span>
          <Users size={18} color="var(--accent)" />
        </h1>
        <p className="hook" style={{ lineHeight: 1.7 }}>正在載入人口資料 ...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">人口資料載入失敗</span>
        </h1>
        <p className="hook" style={{ color: "#B91C1C", lineHeight: 1.7 }}>
          {data.error.message}
        </p>
        <p className="muted">確認 .env.local 含 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY，且 demographics schema 已 exposed。</p>
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
              <span className="small">· 人口</span>
              <Users size={18} color="var(--accent)" />
            </h1>
            <p className="hook" style={{ lineHeight: 1.7 }}>
              <span className="em">島嶼的人口帳，三章看完。</span>{" "}
              全國 <b>{fmt.bigNum(S.totalPop)}</b> 人，10 年僅減 {Math.abs(S.growth10y).toFixed(1)}% 但分布劇烈遷移。
              老化指數 <b className="em">{S.agingIndex.toFixed(1)}</b>
              {S.crossYearMinguo && (
                <> ·{" "}<b className="em">{S.crossYearMinguo + 1911} 死亡交叉</b>，自然增加 {fmt.signed(S.natural, 0)} 人</>
              )}
              。
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Share2 size={14} /> 分享</button>
            <button className="btn"><Download size={14} /> 匯出</button>
          </div>
        </div>
      </div>

      <S1Base data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />
      <S2Pyramid data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />
      <S3Vitals data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />

      <DataSourceBadge
        sources={["內政部戶政司", "村里綜合統計（spatial.village_demographics_yearly）", "demographics.population_by_age_sex_county"]}
        updatedAt="2026-05-13"
      />

      {/* byCode3 import 保留以便日後使用 */}
      <span style={{ display: "none" }}>{Object.keys(byCode3).length}</span>
    </div>
  );
}
