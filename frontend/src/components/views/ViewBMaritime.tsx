/**
 * ViewBMaritime — 航運主題縣市儀錶板
 *
 * 5 tabs:  概覽 / 港口 / 漁業 / 航線 🔴 / 排名
 * accent: 青 #0D9488
 *
 * 設計來源：designs Mini Taiwan Info.html · view-b-maritime.jsx
 * 資料：useMaritimeData → maritime.ports / fishery_stats_by_county / port_traffic_yearly
 *
 * 真實接通：
 *   - 縣市 KPI（ports / fishing / commercial / ferry / fisheryValue / shipTraffic / containers）from countyAggregates（real）
 *   - 縣市港口分類 mar-class-bars：由 ports filter by county_id 重算 5 大類（real）
 *   - 縣市港口點位 group：ports filter by county_id（real，lng/lat 可給地圖）
 *   - 縣市漁業 10 年 trend：fishery filter by county_id 10 年（real）
 * 仍 mock：
 *   - 漁業類別組成（全國比例 mock）
 *   - 離島客船航線（passenger_routes 表不存在）
 *   - 漁業權水域 / 燈塔（表不存在）
 *   - 現有漁船數（欄位 fishing_vessels_count 全 NULL）
 */

import { useMemo, useState } from "react";
import {
  Anchor, Ship, Fish, Waves, Locate, Plus, Share2, Download,
  ChevronLeft, Lightbulb, ArrowLeftRight, AlertTriangle, Route,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3 } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { KPICard } from "@/components/kpi/KPICard";
import { TrendChart } from "@/components/charts/TrendChart";
import { HRankBar, type HRankRow } from "@/components/common/HRankBar";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { PendingDataCard } from "@/components/common/PendingDataCard";
import type { MaritimeDataState } from "@/hooks/useMaritimeData";
import type {
  CountyMaritimeAggregate,
  PortRow,
  FisheryStatsRow,
} from "@/lib/queries/maritime";

interface ViewBMaritimeProps {
  data: MaritimeDataState;
  county: CountyCode3;
  onBack: () => void;
  onAddCompare?: () => void;
}

type TabId = "overview" | "ports" | "fishery" | "routes" | "rank";

const REGION_LABELS: Record<string, string> = {
  north: "北部", central: "中部", south: "南部", east: "東部", island: "離島",
};

// ─────────────────────────────────────────────────
export function ViewBMaritime({ data, county, onBack, onAddCompare }: ViewBMaritimeProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const c = byCode3[county];
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
  if (data.loading || !cAgg || !data.summary) {
    return (
      <div className="hero">
        <button className="back-link" onClick={onBack}><ChevronLeft size={12} /> 返回</button>
        <h1><span className="accent">{c.name_zh}</span><span className="small">· 航運</span></h1>
        <p className="hook">{data.loading ? "正在載入航運資料 ..." : "縣市資料尚未就緒"}</p>
      </div>
    );
  }
  const zero = cAgg.ports === 0;

  return (
    <div>
      <Hero c={c} cAgg={cAgg} aggs={data.countyAggregates} N={data.summary} onBack={onBack} onAddCompare={onAddCompare} />

      {zero ? (
        <ZeroPortFallback cname={c.name_zh} cAgg={cAgg} N={data.summary} />
      ) : (
        <>
          <div className="tab-bar">
            {(
              [
                ["overview", "概覽"],
                ["ports",    "港口"],
                ["fishery",  "漁業"],
                ["routes",   "航線 🔴"],
                ["rank",     "排名"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab cname={c.name_zh} cAgg={cAgg} />}
          {tab === "ports"    && <PortsTab county={county} cname={c.name_zh} cAgg={cAgg} ports={data.ports} />}
          {tab === "fishery"  && <FisheryTab county={county} cname={c.name_zh} cAgg={cAgg} N={data.summary} fishery={data.fishery} />}
          {tab === "routes"   && <RoutesTab county={county} cname={c.name_zh} />}
          {tab === "rank"     && <RankTab county={county} aggs={data.countyAggregates} />}
        </>
      )}

      <DataSourceBadge
        sources={["交通部航港局", "農業部漁業署", "海洋委員會", "maritime.ports / fishery_stats_by_county / port_traffic_yearly"]}
        updatedAt="2026-05-29"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────
function Hero({ c, cAgg, aggs, N, onBack, onAddCompare }: {
  c: { name_zh: string; region: string; area_km2: number };
  cAgg: CountyMaritimeAggregate;
  aggs: CountyMaritimeAggregate[];
  N: NonNullable<MaritimeDataState["summary"]>;
  onBack: () => void;
  onAddCompare?: () => void;
}) {
  const region = REGION_LABELS[c.region] ?? c.region;
  const rankOf = (key: keyof CountyMaritimeAggregate) => {
    const sorted = [...aggs].sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0));
    return sorted.findIndex((a) => a.code3 === cAgg.code3) + 1;
  };

  const portRank  = rankOf("ports");
  const fishRank  = rankOf("fishing");
  const valueRank = rankOf("fisheryValue");
  const shipsRank = rankOf("shipTraffic");

  let hook: React.ReactNode;
  if (cAgg.ports === 0) {
    hook = <><b className="em">內陸縣市無港口</b> ─ {c.name_zh} 屬 22 縣市中僅 2 個無港者之一（與南投、嘉義市）</>;
  } else if (cAgg.code3 === "KHH") {
    hook = <>南臺灣航運核心 ─ 高雄港 2024 貨櫃 <b className="em">{fmt.num(cAgg.containers)} TEU</b></>;
  } else if (portRank === 1) {
    hook = <>全國<b className="em">港口最多縣市</b> · {cAgg.ports} 處（其中漁港 {cAgg.fishing}）</>;
  } else if (cAgg.commercial > 0) {
    hook = <>{cAgg.ports} 處港口 · 含 <b>{cAgg.commercial}</b> 商港 · 2024 進出港 <b>{fmt.num(cAgg.shipTraffic)}</b> 艘次</>;
  } else {
    hook = <>{cAgg.ports} 處港口 · 漁港 {cAgg.fishing} · 漁業產值 <b>{cAgg.fisheryValue.toFixed(1)} 億元</b></>;
  }

  const rankCls = (r: number) => r <= 5 ? "high" : r >= 17 ? "low" : "";

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
              <span className="small">· 航運</span>
              <Anchor size={18} color="var(--accent)" />
            </h1>
            <div className="hook" style={{ fontSize: 14 }}>{hook}</div>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Download size={14} /> 下載 CSV</button>
            <button className="btn ghost"><Share2 size={14} /> 分享</button>
            {onAddCompare && <button className="btn primary" onClick={onAddCompare}><Plus size={14} /> 加入比較</button>}
          </div>
        </div>

        <div className="ch-chips" style={{ marginTop: 12, marginBottom: 0 }}>
          <span className="ch-chip region"><span className="swatch"></span>{region}</span>
          <span className="ch-chip">{fmt.num(c.area_km2)} km²</span>
          {cAgg.ports === 0
            ? <span className="ch-chip" style={{ color: "#B45309", background: "var(--warning-soft)" }}>內陸 · 無港</span>
            : <>
                <span className="ch-chip">{cAgg.ports} 港口</span>
                {cAgg.commercial > 0 && (
                  <span className="ch-chip" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
                    含 {cAgg.commercial} 商港
                  </span>
                )}
              </>
          }
        </div>
      </div>

      {cAgg.ports > 0 && (
        <div className="county-fact-grid" style={{ marginBottom: 16 }}>
          <FactTile
            icon={<Anchor size={11} />}
            label="港口數"
            val={cAgg.ports.toString()}
            rank={portRank}
            rankCls={rankCls(portRank)}
            note={<>{(cAgg.ports / Math.max(1, N.ports) * 100).toFixed(1)}% 全國</>}
          />
          <FactTile
            icon={<Fish size={11} />}
            label="漁港數"
            val={cAgg.fishing.toString()}
            rank={fishRank}
            rankCls={rankCls(fishRank)}
            note={<>{(cAgg.fishing / Math.max(1, N.fishingPorts) * 100).toFixed(1)}% 全國</>}
          />
          <FactTile
            icon={<Ship size={11} />}
            label="漁業產值"
            val={cAgg.fisheryValue.toFixed(1)}
            unit="億"
            rank={valueRank}
            rankCls={rankCls(valueRank)}
            note={<>2024 年度</>}
          />
          <FactTile
            icon={<ArrowLeftRight size={11} />}
            label="進出港"
            val={cAgg.shipTraffic > 0 ? fmt.num(cAgg.shipTraffic) : "—"}
            unit={cAgg.shipTraffic > 0 ? "艘次" : ""}
            rank={cAgg.shipTraffic > 0 ? shipsRank : null}
            rankCls={cAgg.shipTraffic > 0 ? rankCls(shipsRank) : ""}
            note={cAgg.shipTraffic > 0 ? <>含商港吞吐</> : <>無商港</>}
          />
        </div>
      )}
    </div>
  );
}

function FactTile({ icon, label, val, unit, rank, rankCls, note }: {
  icon: React.ReactNode;
  label: string;
  val: string;
  unit?: string;
  rank: number | null;
  rankCls?: string;
  note: React.ReactNode;
}) {
  return (
    <div className="county-fact-tile">
      <div className="cft-lbl"><span className="ico">{icon}</span>{label}</div>
      <div className="cft-val">{val}{unit && <span className="unit">{unit}</span>}</div>
      <div className="cft-foot">
        {rank
          ? <span className={`cft-rank ${rankCls ?? ""}`}>#{rank} / 22</span>
          : <span className="cft-rank" style={{ background: "transparent", color: "var(--text-tertiary)" }}>—</span>}
        <span className="cft-delta">{note}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
function ZeroPortFallback({ cname, cAgg, N }: {
  cname: string;
  cAgg: CountyMaritimeAggregate;
  N: NonNullable<MaritimeDataState["summary"]>;
}) {
  return (
    <div className="cat-block">
      <div className="empty-storage-card" style={{ marginBottom: 14, background: "var(--warning-soft)", borderColor: "#FDE68A" }}>
        <div className="es-ico" style={{ background: "var(--warning)" }}><Anchor size={20} /></div>
        <div className="es-body">
          <div className="es-title">{cname} 為「內陸縣市」 · 無港口</div>
          <div className="es-desc">
            全國 22 縣市中，<b>南投、嘉義市</b>是僅有的兩個完全內陸縣市，
            轄內無漁港、無商港、無漁業權水域；本主題其他指標 / 圖層自動隱藏。
            {cAgg.fisheryValue > 0 && <> 漁業產值 <b>{cAgg.fisheryValue.toFixed(2)} 億元</b>為內陸水產加工統計，非海洋漁獲。</>}
          </div>
        </div>
      </div>

      <div className="kpi-grid cols-3" style={{ marginBottom: 0 }}>
        <KPICard icon={<Anchor size={13} />} label="港口" value="0"
          trend={{ delta: "內陸縣市", direction: "flat", baseline: `全國 ${N.ports} 處`, sentiment: "neutral" }} />
        <KPICard icon={<Fish size={13} />} label="漁港" value="0"
          trend={{ delta: "—", direction: "flat", baseline: "無海岸線", sentiment: "neutral" }} />
        <KPICard icon={<Ship size={13} />} label="商港 / 燈塔" value="不適用"
          trend={{ delta: "—", direction: "flat", baseline: "建議切換到道路 / 軌道主題", sentiment: "neutral" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Tab 1 · 概覽
// ─────────────────────────────────────────────────
function OverviewTab({ cname, cAgg }: { cname: string; cAgg: CountyMaritimeAggregate; }) {
  return (
    <>
      <div className="kpi-grid cols-4">
        <KPICard
          icon={<Anchor size={13} />}
          label="港口"
          value={cAgg.ports}
          unit="處"
          trend={{
            delta: `漁港 ${cAgg.fishing} + 商港 ${cAgg.commercial} + 渡輪 ${cAgg.ferry}`,
            direction: "flat", baseline: "本縣市", sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Fish size={13} />}
          label="漁港"
          value={cAgg.fishing}
          unit="處"
          trend={{
            delta: cAgg.ports > 0 ? `${(cAgg.fishing / cAgg.ports * 100).toFixed(0)}% 港口為漁港` : "—",
            direction: "flat", baseline: "", sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Waves size={13} />}
          label="漁業權水域"
          value="資料整備中"
          trend={{ delta: "🔴 表不存在", direction: "flat", baseline: "public.fishery_rights 未建", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Locate size={13} />}
          label="燈塔"
          value="資料整備中"
          trend={{ delta: "🔴 表不存在", direction: "flat", baseline: "public.lighthouse 未建", sentiment: "neutral" }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">MAP</span>
              {cname} · 海洋圖層說明
            </div>
            <div className="section-subtitle">左側地圖將自動 zoom 至本縣市，可疊以下圖層</div>
          </div>
        </div>
        <div className="mar-layer-grid">
          <div className="mar-layer">
            <div className="ml-dot" style={{ background: "#0D9488" }}></div>
            <div className="ml-body">
              <div className="ml-t">漁港</div>
              <div className="ml-d">{cAgg.fishing} 處 · 自動點亮</div>
            </div>
            <div className="ml-state on">ON</div>
          </div>
          <div className="mar-layer">
            <div className="ml-dot" style={{ background: "#0369A1" }}></div>
            <div className="ml-body">
              <div className="ml-t">商港</div>
              <div className="ml-d">{cAgg.commercial} 處（國際 + 國內）</div>
            </div>
            <div className={`ml-state ${cAgg.commercial > 0 ? "on" : "off"}`}>{cAgg.commercial > 0 ? "ON" : "—"}</div>
          </div>
          <div className="mar-layer disabled">
            <div className="ml-dot" style={{ background: "#9CA3AF" }}></div>
            <div className="ml-body">
              <div className="ml-t">漁業權水域</div>
              <div className="ml-d">🔴 表不存在</div>
            </div>
            <div className="ml-state miss">缺</div>
          </div>
          <div className="mar-layer disabled">
            <div className="ml-dot" style={{ background: "#9CA3AF" }}></div>
            <div className="ml-body">
              <div className="ml-t">燈塔</div>
              <div className="ml-d">🔴 表不存在</div>
            </div>
            <div className="ml-state miss">缺</div>
          </div>
        </div>
      </div>

      <div className="insight">
        <div className="ico"><Lightbulb size={18} /></div>
        <div className="body">
          {cname} 海岸線匯集 <b className="em">{cAgg.ports}</b> 處港口
          {cAgg.fishing > cAgg.commercial * 5 && cAgg.ports > 0 && (
            <>，其中漁港 <b>{cAgg.fishing}</b>（占 {(cAgg.fishing / cAgg.ports * 100).toFixed(0)}%）— 屬漁業導向縣市。</>
          )}
          {cAgg.commercial > 0 && <> 含 <b>{cAgg.commercial}</b> 處商港，2024 進出港 <b>{fmt.num(cAgg.shipTraffic)}</b> 艘次。</>}
          {cAgg.commercial === 0 && cAgg.fishing > 0 && <> 無商港，運能集中於漁業作業。</>}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 2 · 港口
// ─────────────────────────────────────────────────
function PortsTab({ county, cname, cAgg, ports }: {
  county: CountyCode3;
  cname: string;
  cAgg: CountyMaritimeAggregate;
  ports: PortRow[];
}) {
  // 該縣市港口
  const countyPorts = useMemo(() => {
    const cc = byCode3[county];
    if (!cc) return [];
    return ports.filter((p) => p.county_id === cc.id_moi);
  }, [ports, county]);

  // 分類 5 大類
  const classes = useMemo(() => {
    const counts = { fishing: 0, ferry: 0, intl_comm: 0, dom_comm: 0, other: 0 };
    for (const p of countyPorts) {
      const cls = (p.port_class ?? "").toLowerCase();
      if (cls.includes("漁")) counts.fishing += 1;
      else if (cls.includes("國際") || cls.includes("intl")) counts.intl_comm += 1;
      else if (cls.includes("國內") || cls.includes("商")) counts.dom_comm += 1;
      else if (cls.includes("渡") || cls.includes("觀光") || cls.includes("ferry")) counts.ferry += 1;
      else counts.other += 1;
    }
    const meta = [
      { id: "fishing",   label: "漁港",       value: counts.fishing,   color: "#0D9488" },
      { id: "ferry",     label: "渡輪/觀光",  value: counts.ferry,     color: "#06B6D4" },
      { id: "intl_comm", label: "國際商港",   value: counts.intl_comm, color: "#0369A1" },
      { id: "dom_comm",  label: "國內商港",   value: counts.dom_comm,  color: "#1E40AF" },
      { id: "other",     label: "其他",       value: counts.other,     color: "#94A3B8" },
    ];
    return meta.filter((cl) => cl.value > 0);
  }, [countyPorts]);
  const classMax = Math.max(...classes.map((cl) => cl.value), 1);

  // 點位 group by class
  const portPoints = countyPorts; // already filtered
  const groupedPoints = {
    intl_comm: portPoints.filter((p) => {
      const cls = (p.port_class ?? "").toLowerCase();
      return cls.includes("國際") || cls.includes("intl");
    }),
    fishing: portPoints.filter((p) => (p.port_class ?? "").toLowerCase().includes("漁")),
    ferry: portPoints.filter((p) => {
      const cls = (p.port_class ?? "").toLowerCase();
      return cls.includes("渡") || cls.includes("觀光") || cls.includes("ferry");
    }),
  };

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Anchor size={13} />}
          label="總港口"
          value={cAgg.ports}
          unit="處"
          trend={{ delta: `${classes.length} 類別`, direction: "flat", baseline: "本縣市", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Ship size={13} />}
          label="商港"
          value={cAgg.commercial}
          unit="處"
          trend={{
            delta: cAgg.commercial > 0 ? "國際 / 國內" : "無",
            direction: "flat",
            baseline: cAgg.commercial > 0 ? "高運能" : "—",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Fish size={13} />}
          label="漁港"
          value={cAgg.fishing}
          unit="處"
          trend={{
            delta: cAgg.ports > 0 ? `${(cAgg.fishing / cAgg.ports * 100).toFixed(0)}% 占比` : "—",
            direction: "flat", baseline: "本縣市港口", sentiment: "neutral",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">CLASS</span>
              港口分類分解
            </div>
            <div className="section-subtitle">本縣市 {cAgg.ports} 處港口的類別組成</div>
          </div>
        </div>
        <div className="mar-class-bars">
          {classes.map((cl) => (
            <div key={cl.id} className="mcb-row">
              <span className="mcb-sw" style={{ background: cl.color }}></span>
              <span className="mcb-lbl">{cl.label}</span>
              <div className="mcb-bar"><div style={{ width: `${(cl.value / classMax) * 100}%`, background: cl.color }}></div></div>
              <span className="mcb-val">{cl.value}<span className="muted"> 處</span></span>
              <span className="mcb-pct muted">{cAgg.ports > 0 ? (cl.value / cAgg.ports * 100).toFixed(0) : 0}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">POINTS</span>
              {cname} 港口點位 · 地圖對應
            </div>
            <div className="section-subtitle">左側地圖以分類色點繪 ─ {portPoints.length} 個點位</div>
          </div>
        </div>
        <div className="mar-port-groups">
          {groupedPoints.intl_comm.length > 0 && (
            <div className="mpg">
              <div className="mpg-h"><span className="mpg-sw" style={{ background: "#0369A1" }}></span>國際商港 · {groupedPoints.intl_comm.length}</div>
              <div className="mpg-dots">
                {groupedPoints.intl_comm.slice(0, 12).map((p) => (
                  <span key={p.id} className="mpg-dot" title={p.name} style={{ background: "#0369A1" }}></span>
                ))}
              </div>
            </div>
          )}
          {groupedPoints.fishing.length > 0 && (
            <div className="mpg">
              <div className="mpg-h"><span className="mpg-sw" style={{ background: "#0D9488" }}></span>漁港 · {groupedPoints.fishing.length}</div>
              <div className="mpg-dots">
                {groupedPoints.fishing.slice(0, 40).map((p) => (
                  <span key={p.id} className="mpg-dot" title={p.name} style={{ background: "#0D9488" }}></span>
                ))}
                {groupedPoints.fishing.length > 40 && <span className="mpg-more">+ {groupedPoints.fishing.length - 40}</span>}
              </div>
            </div>
          )}
          {groupedPoints.ferry.length > 0 && (
            <div className="mpg">
              <div className="mpg-h"><span className="mpg-sw" style={{ background: "#06B6D4" }}></span>渡輪 / 觀光 · {groupedPoints.ferry.length}</div>
              <div className="mpg-dots">
                {groupedPoints.ferry.slice(0, 12).map((p) => (
                  <span key={p.id} className="mpg-dot" title={p.name} style={{ background: "#06B6D4" }}></span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 3 · 漁業
// ─────────────────────────────────────────────────
function FisheryTab({ county, cname, cAgg, N, fishery }: {
  county: CountyCode3;
  cname: string;
  cAgg: CountyMaritimeAggregate;
  N: NonNullable<MaritimeDataState["summary"]>;
  fishery: FisheryStatsRow[];
}) {
  const trend = useMemo(() => {
    const cc = byCode3[county];
    if (!cc) return [] as Array<{ year: number; qty: number; value: number }>;
    const rows = fishery.filter((f) => f.county_id === cc.id_moi && f.stat_year >= 2015 && f.stat_year <= 2024)
      .sort((a, b) => a.stat_year - b.stat_year);
    return rows.map((r) => ({
      year: r.stat_year,
      qty: Math.round(r.fishery_production_tonnes ?? 0),
      value: Number(((r.fishery_value_thousand ?? 0) / 1e5).toFixed(2)),  // 千元 → 億元
    }));
  }, [fishery, county]);

  const first = trend[0];
  const last = trend.at(-1);

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Fish size={13} />}
          label="2024 產量"
          value={cAgg.fisheryQty > 0 ? fmt.num(cAgg.fisheryQty) : "—"}
          unit="公噸"
          trend={{
            delta: `${(cAgg.fisheryQty / Math.max(1, N.fisheryQty) * 100).toFixed(1)}% 全國`,
            direction: "flat",
            baseline: "fishery_stats_by_county",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Ship size={13} />}
          label="2024 產值"
          value={cAgg.fisheryValue.toFixed(1)}
          unit="億元"
          trend={{
            delta: `${(cAgg.fisheryValue / Math.max(0.01, N.fisheryValueY) * 100).toFixed(1)}% 全國`,
            direction: "flat",
            baseline: "億元",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="現有漁船數"
          value="資料整備中"
          trend={{ delta: "🔴 全 NULL", direction: "flat", baseline: "fishing_vessels_count 待補", sentiment: "neutral" }}
        />
      </div>

      {trend.length > 0 ? (
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">TREND</span>
                {cname} · 漁業產值 10 年趨勢
              </div>
              <div className="section-subtitle">
                {first?.value.toFixed(1)} 億（{first?.year}）→
                <b style={{ color: "var(--accent-deep)" }}> {last?.value.toFixed(1)} 億</b>（{last?.year}）
              </div>
            </div>
          </div>
          <TrendChart
            series={[{ name: cname, color: "var(--accent)", data: trend.map((t) => ({ x: t.year, y: t.value })) }]}
            xLabels={trend.map((t) => t.year.toString())}
            height={190}
            showLegend={false}
          />
        </div>
      ) : (
        <div className="muted" style={{ padding: 16, fontSize: 12.5 }}>
          {cname} 漁業 10 年 trend 無資料
        </div>
      )}

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">CATEGORY</span>
              漁業類別組成
            </div>
            <div className="section-subtitle">沿近海 / 養殖 / 遠洋分項，縣市別待農業部漁業署資料下放</div>
          </div>
        </div>
        <PendingDataCard
          compact
          label="縣市別漁業類別組成"
          note="目前無縣市別沿近海／養殖／遠洋拆分；待漁業署資料下放後補上。"
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 4 · 航線 🔴（純缺口頁）
// ─────────────────────────────────────────────────
function RoutesTab({ county, cname }: { county: CountyCode3; cname: string; }) {
  const isIslandTown = (["PEH", "KMN", "LCC"] as CountyCode3[]).includes(county);
  // 已知有對外離島／對岸客船需求的縣市（用於決定顯示 placeholder 或「無航線」空狀態）；
  // 實際航線時刻無真實來源，不再列假班次。
  const ISLAND_ROUTE_COUNTIES: CountyCode3[] =
    ["KHH", "TNN", "PEH", "KMN", "LCC", "CYH", "KLC", "TTT"] as CountyCode3[];
  const hasIslandRoutes = ISLAND_ROUTE_COUNTIES.includes(county);

  return (
    <>
      <div className="missing-data-card" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="icon-box"><Route size={16} /></div>
        <div>
          <div className="title">離島定期客船航線 · 表不存在 🔴</div>
          <div className="reason">
            原始資料庫尚未建立跨縣市離島客船航線表（<code>maritime.passenger_routes</code>）。
            本頁列出設計參考用 mock — 待交通部航港局資料下放後接通。
          </div>
        </div>
      </div>

      {hasIslandRoutes ? (
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">ROUTES</span>
                {cname} 出發 · 離島定期客船
              </div>
              <div className="section-subtitle">
                {isIslandTown ? "離島縣市對本島為主要航線" : "本島港口對離島航線"}
              </div>
            </div>
          </div>
          <PendingDataCard
            compact
            label="離島定期客船航線時刻"
            note="此縣市有對外離島／對岸客船需求，但航線時刻表（起訖／頻次／季節）尚無真實資料來源；待交通部航港局資料下放後補上。"
          />
        </div>
      ) : (
        <div className="section" style={{ textAlign: "center", padding: 36 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🚢</div>
          <div className="section-title" style={{ justifyContent: "center", marginBottom: 8 }}>
            {cname} · 無已知離島定期客船航線
          </div>
          <div className="muted" style={{ fontSize: 12.5, maxWidth: 380, margin: "0 auto" }}>
            該縣市港口主要供漁業作業使用，無對離島／對岸的定期載客航線。
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 5 · 排名
// ─────────────────────────────────────────────────
function RankTab({ county, aggs }: { county: CountyCode3; aggs: CountyMaritimeAggregate[]; }) {
  const items: Array<{ key: keyof CountyMaritimeAggregate; label: string; unit: string; dp?: number; }> = [
    { key: "ports",        label: "港口數",     unit: "處" },
    { key: "fishing",      label: "漁港數",     unit: "處" },
    { key: "fisheryValue", label: "漁業產值",   unit: "億",   dp: 1 },
    { key: "shipTraffic",  label: "進出港艘次", unit: "艘次" },
  ];

  return (
    <div className="rank-multi-grid">
      {items.map((it) => {
        const rows: HRankRow[] = aggs
          .map((a) => ({ code: a.code3, name: a.name, value: Number(a[it.key] ?? 0) }))
          .sort((a, b) => b.value - a.value);
        const rank = rows.findIndex((r) => r.code === county) + 1;
        const self = rows[rank - 1];
        return (
          <div key={it.key as string} className="rmg-card">
            <div className="rmg-head">
              <div className="rmg-title">{it.label}</div>
              <div className="rmg-rank">
                <span className="rmg-rank-num">#{rank}</span>
                <span className="rmg-rank-tot">/ 22</span>
              </div>
            </div>
            <div className="rmg-val">
              <span className="num">{self?.value != null ? (it.dp != null ? self.value.toFixed(it.dp) : fmt.num(self.value)) : "—"}</span>
              <span className="unit">{it.unit}</span>
            </div>
            <HRankBar
              rows={rows.slice(0, 5)}
              max={rows[0]?.value || 1}
              color="var(--accent)"
              highlightCode={county}
              decimals={it.dp ?? 0}
            />
            <div className="rmg-foot muted">
              Top: {rows[0]?.name} · {it.dp != null ? rows[0]?.value.toFixed(it.dp) : fmt.num(rows[0]?.value ?? 0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
