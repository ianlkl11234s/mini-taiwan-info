/**
 * ViewA Maritime — 航運主題全國概覽
 *
 * 3 章節：S1 港埠骨架（277 港 + 分類 Donut）/ S2 海洋經濟（漁業 10 年）/ S3 吞吐規模（Top 5 商港）
 * accent: 青 #0D9488
 *
 * 設計來源：designs Mini Taiwan Info.html · view-a-maritime.jsx
 */

import {
  Anchor, Fish, Ship, AlertTriangle, Layers, Container, BarChart3,
  TrendingUp, Waves, MapPin, Route, 
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3 } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import type { MaritimeDataState } from "@/hooks/useMaritimeData";
import { CatHeader } from "@/components/common/CatHeader";
import { HRankBar, type HRankRow } from "@/components/common/HRankBar";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { MissingDataCard } from "@/components/common/MissingDataCard";
import { KPICard } from "@/components/kpi/KPICard";
import { TrendChart } from "@/components/charts/TrendChart";

interface Props {
  data: MaritimeDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

// ─────────────────────────────────────────────────
// S1 · 港埠骨架（Donut + 排名）
// ─────────────────────────────────────────────────
function S1Ports({ data, selectedCounty }: Props) {
  const S = data.summary;
  if (!S) return null;

  const C = data.portClass;
  const totalClass = C.reduce((a, c) => a + c.value, 0);
  const maxClass = Math.max(1, ...C.map((x) => x.value));

  // 縣市港口數 / 漁港數 ranking
  const portRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.ports }))
    .sort((a, b) => b.value - a.value);
  const fishingRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.fishing }))
    .sort((a, b) => b.value - a.value);

  // 0 港縣市
  const zeroPortCounties = data.countyAggregates.filter((c) => c.ports === 0);

  // Donut SVG 計算
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const cInner = 2 * Math.PI * radius;

  return (
    <div className="cat-block">
      <CatHeader
        num={1}
        title={<><span className="accent">港埠骨架</span> ─ 漁業之島</>}
        tagline={`${S.ports} 港中 ${S.fishingPorts} 座（${C.find((x) => x.id === "fishing")?.pct.toFixed(1)}%）是漁港 — 漁業遠勝商業的島嶼特徵`}
        badge="靜態"
        badgeTone="static"
      />

      <div className="stat-grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Anchor size={13} /></div>
          <div className="stat-tile-num">{S.ports}<span className="unit">處</span></div>
          <div className="stat-tile-label">總港口</div>
          <div className="stat-tile-ds">交通部</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Fish size={13} /></div>
          <div className="stat-tile-num">{S.fishingPorts}<span className="unit">處</span></div>
          <div className="stat-tile-label">漁港</div>
          <div className="stat-tile-ds">{fishingRank[0]?.name} 獨佔 {fishingRank[0]?.value}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Ship size={13} /></div>
          <div className="stat-tile-num">{S.commercialIntl + S.commercialDomestic}<span className="unit">處</span></div>
          <div className="stat-tile-label">商港</div>
          <div className="stat-tile-ds">國際 {S.commercialIntl} + 國內 {S.commercialDomestic}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><AlertTriangle size={13} /></div>
          <div className="stat-tile-num">{zeroPortCounties.length}<span className="unit">縣 0 港</span></div>
          <div className="stat-tile-label">內陸無港</div>
          <div className="stat-tile-ds">{zeroPortCounties.map((c) => c.name).join("、") || "—"}</div>
        </div>
      </div>

      {/* 分類 donut */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">CLASS</span>
              港口分類組成
            </div>
            <div className="section-subtitle">
              漁港 <b>{C.find((x) => x.id === "fishing")?.pct.toFixed(1)}%</b> 是壓倒性主體 —
              商業活動集中在 {S.commercialIntl} 個國際商港
            </div>
          </div>
        </div>
        <div className="port-class-card">
          {/* Donut */}
          <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto" }}>
            <svg width={200} height={200}>
              {(() => {
                let acc = 0;
                return C.map((seg, i) => {
                  const frac = totalClass > 0 ? seg.value / totalClass : 0;
                  const len = frac * cInner;
                  const dash = `${len} ${cInner - len}`;
                  const offset = cInner - acc * cInner;
                  acc += frac;
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={22}
                      strokeDasharray={dash}
                      strokeDashoffset={offset}
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  );
                });
              })()}
              <text x={100} y={94} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">總計</text>
              <text x={100} y={114} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--font-mono)">{S.ports}</text>
              <text x={100} y={132} textAnchor="middle" fontSize="10.5" fill="var(--text-tertiary)">處</text>
            </svg>
          </div>

          <div className="pcc-list">
            {C.map((seg) => (
              <div key={seg.id} className="pcc-row">
                <span className="sw" style={{ background: seg.color }}></span>
                <span className="lbl">{seg.label}</span>
                <div className="bar-wrap">
                  <div className="bar" style={{ width: `${(seg.value / maxClass) * 100}%`, background: seg.color }}></div>
                </div>
                <span className="pct">{seg.pct.toFixed(1)}%</span>
                <span className="cnt">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 縣市港口數 ranking */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANK</span>
              縣市港口數 · {portRank[0]?.name} 獨冠
            </div>
            <div className="section-subtitle">
              {portRank[0]?.name} <b>{portRank[0]?.value}</b> 處（漁港 {fishingRank.find((r) => r.code === portRank[0]?.code)?.value ?? 0}）—
              是 {portRank[1]?.name} {portRank[1]?.value} 的{" "}
              <b style={{ color: "var(--accent-deep)" }}>
                {((portRank[0]?.value ?? 0) / Math.max(1, portRank[1]?.value ?? 1)).toFixed(1)} 倍
              </b>
            </div>
          </div>
          {zeroPortCounties.length > 0 && (
            <span className="coverage-badge">⚠ 內陸 {zeroPortCounties.length} 縣 0 港</span>
          )}
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">港口最多 5 縣市</h4>
            <HRankBar rows={portRank.slice(0, 5)} max={portRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty} decimals={0} />
          </div>
          <div className="col">
            <h4 className="top">漁港最多 5 縣市</h4>
            <HRankBar rows={fishingRank.slice(0, 5)} max={fishingRank[0]?.value ?? 1} color="var(--accent-ramp-4)" highlightCode={selectedCounty} decimals={0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S2 · 海洋經濟（漁業 10 年）
// ─────────────────────────────────────────────────
function S2Fishery({ data, selectedCounty }: Props) {
  const S = data.summary;
  if (!S) return null;

  const F = data.fisheryTrend;

  // 縣市漁業產值 ranking
  const valueRank: HRankRow[] = data.countyAggregates
    .map((c) => ({ code: c.code3, name: c.name, value: c.fisheryValue }))
    .sort((a, b) => b.value - a.value);

  // 趨勢計算
  const qty2024 = S.fisheryQty;
  const qty2022Min = Math.min(...F.map((d) => d.qty));
  const qty2022Year = F.find((d) => d.qty === qty2022Min)?.year ?? 2022;

  return (
    <div className="cat-block">
      <CatHeader
        num={2}
        title={<><span className="accent">海洋經濟</span> ─ 漁業 10 年新高</>}
        tagline={`2024 產值 ${S.fisheryValueY.toFixed(0)} 億元 · 10 年 ${fmt.signed(((S.fisheryValueY - S.value2015) / Math.max(1, S.value2015)) * 100, 0)}%`}
        badge="年度 · 2024"
        badgeTone="historical"
      />

      <div className="kpi-grid cols-2" style={{ marginBottom: 14 }}>
        <KPICard
          icon={<Fish size={13} />}
          label="2024 漁業生產量"
          value={fmt.num(qty2024)}
          unit="公噸"
          trend={{
            delta: `vs ${qty2022Year} 低點 ${fmt.signed(qty2024 - qty2022Min, 0)}`,
            direction: "up",
            baseline: "10 年新高",
            sentiment: "positive",
          }}
        />
        <KPICard
          icon={<TrendingUp size={13} />}
          label="2024 漁業產值"
          value={S.fisheryValueY.toFixed(0)}
          unit="億元"
          trend={{
            delta: `vs 2015 ${fmt.signed(((S.fisheryValueY - S.value2015) / Math.max(1, S.value2015)) * 100, 0)}%`,
            direction: "up",
            baseline: "10 年新高",
            sentiment: "positive",
          }}
        />
      </div>

      {/* 雙軸線圖 — 量 vs 值 */}
      <div className="fishery-trend">
        <div className="fishery-trend-head">
          <div className="t">漁業生產量 vs 產值（{F[0]?.year}–{F.at(-1)?.year}）</div>
          <div className="fishery-trend-legend">
            <span><i style={{ background: "var(--accent)" }}></i>生產量 (千噸)</span>
            <span><i style={{ background: "#F59E0B" }}></i>產值 (億元)</span>
          </div>
        </div>
        <TrendChart
          series={[
            { name: "生產量", color: "var(--accent)", data: F.map((d) => ({ x: d.year, y: d.qty / 1000 })) },
            { name: "產值", color: "#F59E0B", data: F.map((d) => ({ x: d.year, y: d.value })) },
          ]}
          xLabels={F.map((d) => d.year.toString())}
          height={180}
          showLegend={false}
        />
        <div className="muted" style={{ fontSize: 11.5, marginTop: 8, textAlign: "center", lineHeight: 1.55 }}>
          產量從 {fmt.num(F[0]?.qty ?? 0)} 噸（{F[0]?.year}）→ {fmt.num(F.at(-1)?.qty ?? 0)}（{F.at(-1)?.year}）·
          產值從 {F[0]?.value} 億 → <b style={{ color: "var(--accent-deep)" }}>{F.at(-1)?.value} 億</b>
        </div>
      </div>

      {/* 縣市產值 ranking */}
      <div className="section" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">VALUE</span>
              縣市漁業產值 · {valueRank[0]?.name} 獨佔
            </div>
            <div className="section-subtitle">
              {valueRank[0]?.name} <b>{valueRank[0]?.value.toFixed(1)} 億</b> = 第二名{" "}
              {valueRank[1]?.name} <b style={{ color: "var(--accent-deep)" }}>
                {((valueRank[0]?.value ?? 0) / Math.max(0.1, valueRank[1]?.value ?? 0.1)).toFixed(1)} 倍
              </b>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>單位：億元</div>
        </div>
        <div className="rank-pair">
          <div className="col">
            <h4 className="top">產值 Top 5</h4>
            <HRankBar rows={valueRank.slice(0, 5)} max={valueRank[0]?.value ?? 1} color="var(--accent)" highlightCode={selectedCounty} decimals={1} />
          </div>
          <div className="col">
            <h4 className="bot">產值最低 5（沿海最少）</h4>
            <HRankBar
              rows={valueRank.filter((r) => r.value > 0).slice(-5).reverse()}
              max={valueRank[0]?.value ?? 1}
              color="var(--accent-ramp-3)"
              highlightCode={selectedCounty}
              decimals={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// S3 · 吞吐規模
// ─────────────────────────────────────────────────
function S3Throughput({ data }: Props) {
  const S = data.summary;
  if (!S) return null;

  const TOP = data.topCommPorts;
  // KHH / TCH 比 (貨櫃)
  const khhContainer = TOP.find((p) => p.countyCode === "KHH")?.containers ?? 0;
  const tchContainer = TOP.find((p) => p.countyCode === "TCH")?.containers ?? 0;
  const tchRatio = tchContainer > 0 ? khhContainer / tchContainer : 0;

  const maxShare = Math.max(0.1, ...TOP.map((p) => p.share));

  // M-1：燈塔 / 漁業權水域已接通 public 表（從缺口移除，改顯真實值）
  const FAC = data.facilities;
  // 缺口（剩餘）
  const REDS: Array<{ label: string; reason: string; icon: React.ReactNode }> = [
    { label: "現有漁船數", reason: "全 NULL", icon: <Ship size={16} /> },
    { label: "養殖面積", reason: "全 NULL", icon: <Fish size={16} /> },
    { label: "跨縣市離島客船航線", reason: "表不存在", icon: <Route size={16} /> },
  ];

  return (
    <div className="cat-block">
      <CatHeader
        num={3}
        title={<><span className="accent">吞吐規模</span> ─ {TOP[0]?.name ?? "高雄港"} 獨吞</>}
        tagline="進出港艘次、貨櫃 TEU、貨物量 — 商港集中度極高"
        badge="2024 全年（口徑 collector 2025）"
        badgeTone="historical"
      />

      <div className="stat-grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Ship size={13} /></div>
          <div className="stat-tile-num">{fmt.num(S.shipTraffic)}<span className="unit">艘次</span></div>
          <div className="stat-tile-label">年進出港船舶</div>
          <div className="stat-tile-ds">交通部航港局</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Container size={13} /></div>
          <div className="stat-tile-num">{(S.containers / 1e6).toFixed(2)}<span className="unit">M TEU</span></div>
          <div className="stat-tile-label">年貨櫃量</div>
          <div className="stat-tile-ds">{TOP[0]?.name} 獨佔 {TOP[0]?.share.toFixed(1)}%</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><Layers size={13} /></div>
          <div className="stat-tile-num">{S.cargoTon.toFixed(2)}<span className="unit">億噸</span></div>
          <div className="stat-tile-label">年貨物量</div>
          <div className="stat-tile-ds">含散裝液體</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-ico"><BarChart3 size={13} /></div>
          <div className="stat-tile-num">{tchRatio > 0 ? tchRatio.toFixed(1) : "—"}<span className="unit">×</span></div>
          <div className="stat-tile-label">高雄 vs 臺中</div>
          <div className="stat-tile-ds">貨櫃量比</div>
        </div>
      </div>

      {/* Top 5 商港列表 */}
      <div className="section" style={{ padding: 0 }}>
        <div className="section-head" style={{ padding: "14px 16px 6px", marginBottom: 0 }}>
          <div>
            <div className="section-title">
              <span className="pre">TOP 5</span>
              商港吞吐量 · 2024
            </div>
            <div className="section-subtitle">
              {TOP[0]?.name} <b>{fmt.num(TOP[0]?.containers ?? 0)} TEU</b> 獨佔全國 {TOP[0]?.share.toFixed(0)}%
            </div>
          </div>
        </div>
        <div className="comm-ports-list" style={{ border: "none", borderTop: "1px solid var(--border)", borderRadius: 0 }}>
          <div className="comm-port-row head">
            <span>#</span>
            <span>港名</span>
            <span style={{ textAlign: "right" }}>艘次</span>
            <span style={{ textAlign: "right" }}>貨櫃 TEU</span>
            <span style={{ textAlign: "right" }}>佔比</span>
          </div>
          {TOP.map((p, i) => {
            const cnty = p.countyCode ? byCode3[p.countyCode] : null;
            return (
              <div key={`${p.name}-${i}`} className="comm-port-row">
                <span className="rnk">{String(i + 1).padStart(2, "0")}</span>
                <span className="nm">
                  {p.name}
                  {cnty && <span className="county">{cnty.name_zh}</span>}
                </span>
                <span className="tnum">{fmt.num(p.ships)}</span>
                <span className="tnum">{p.containers > 0 ? fmt.num(p.containers) : <span className="muted">—</span>}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    flex: 1, height: 6, background: "var(--surface-3)", borderRadius: 3,
                    overflow: "hidden", maxWidth: 70,
                  }}>
                    <div style={{
                      width: `${(p.share / maxShare) * 100}%`, height: "100%",
                      background: "var(--accent)", borderRadius: 3,
                    }}></div>
                  </div>
                  <span className="tnum" style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>
                    {p.share.toFixed(1)}%
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 海洋設施（M-1：燈塔 + 漁業權水域，已接通 public 真實表）*/}
      {FAC && (
        <div className="section" style={{ marginBottom: 14 }}>
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">FACILITY</span>
                海洋設施
              </div>
              <div className="section-subtitle">
                航港局全國燈塔 + 漁業署漁業權水域 — 已接通真實資料
              </div>
            </div>
            <span className="coverage-badge">年度 / 靜態</span>
          </div>
          <div className="kpi-grid cols-2">
            <KPICard
              icon={<MapPin size={13} />}
              label="燈塔"
              value={FAC.lighthouseCount}
              unit="座"
              trend={{ delta: "全國", direction: "flat", baseline: "交通部航港局", sentiment: "neutral" }}
            />
            <KPICard
              icon={<Waves size={13} />}
              label="漁業權水域"
              value={FAC.fisheryRightsCount}
              unit="筆"
              trend={{ delta: `${fmt.num(FAC.fisheryRightsAreaKm2)} km²`, direction: "flat", baseline: "農業部漁業署", sentiment: "neutral" }}
            />
          </div>
        </div>
      )}

      {/* 缺口卡 */}
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">DATA GAP</span>
              資料整備中（{REDS.length} 項）
            </div>
            <div className="section-subtitle">本批 Sprint 0 後仍有 {REDS.length} 項缺口，設計已預留空狀態</div>
          </div>
        </div>
        <div className="missing-data-grid">
          {REDS.map((it) => (
            <MissingDataCard key={it.label} label={it.label} reason={it.reason} icon={it.icon} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ViewA Maritime 主入口
// ─────────────────────────────────────────────────
export function ViewAMaritime({ data, selectedCounty, onCountyClick }: Props) {
  const S = data.summary;

  // 防禦：summary 為 null 但無 error 時當 loading（hook race condition fallback）
  if (data.loading || (!S && !data.error)) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">全台概覽</span>
          <span className="small">· 航運</span>
          <Anchor size={18} color="var(--accent)" />
        </h1>
        <p className="hook" style={{ lineHeight: 1.7 }}>正在載入航運資料 ...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">航運資料載入失敗</span>
        </h1>
        <p className="hook" style={{ color: "#B91C1C", lineHeight: 1.7 }}>
          {data.error.message}
        </p>
      </div>
    );
  }

  if (!S) return null;

  const fishingShare = data.portClass.find((c) => c.id === "fishing")?.pct ?? 0;
  const topPort = data.countyAggregates.slice().sort((a, b) => b.ports - a.ports)[0];
  const khhPort = data.topCommPorts[0];

  return (
    <div>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· 航運</span>
              <Anchor size={18} color="var(--accent)" />
            </h1>
            <p className="hook" style={{ lineHeight: 1.7 }}>
              <span className="em">島嶼的港帳，三章看完。</span>{" "}
              全國 <b>{S.ports}</b> 港中 <b className="em">{fishingShare.toFixed(1)}%</b> 是漁港。
              {topPort && <>{topPort.name} 獨佔 <b>{topPort.ports}</b> 處居冠 · </>}
              漁業產值 <b className="em">{S.fisheryValueY.toFixed(0)} 億</b>（10 年新高）·
              {khhPort && (
                <>{khhPort.name}年貨櫃 <b className="em">{(khhPort.containers / 1e4).toFixed(0)} 萬 TEU</b>，
                獨吞全國 <b>{khhPort.share.toFixed(0)}%</b>。</>
              )}
            </p>
          </div>
        </div>
      </div>

      <S1Ports data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />
      <S2Fishery data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />
      <S3Throughput data={data} selectedCounty={selectedCounty} onCountyClick={onCountyClick} />

      <DataSourceBadge
        sources={["交通部航港局（iMarine）", "農業部漁業署", "臺灣國際商港統計"]}
        updatedAt="2026-05-13"
      />
    </div>
  );
}
