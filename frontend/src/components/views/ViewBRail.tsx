/**
 * ViewBRail — 軌道主題縣市儀錶板
 *
 * 5 tabs:  概覽 / 車站 / 路線時刻 / 運量 / 排名
 * accent: 靛藍 #4F46E5
 * 跨縣市：trtc → 北+新北、tymc → 北+新北+桃
 *
 * 設計來源：designs Mini Taiwan Info.html · view-b-rail.jsx
 * 資料：useRailData → rail.stations / lines / station_daily_trips / ridership_by_station
 *
 * 真實接通：
 *   - 縣市 4 KPI（stations/lines/km/dailyTrips）from countyAggregates（real）
 *   - 縣市車站清單：data.stations filter by county_id（real）
 *   - 縣市車站車次：data.trips 對應 stations join（real）
 *   - 縣市 24hr 分布：trips hourly_distribution 加總（real）
 *   - TRA 車種：trips by_train_type 加總（real）
 *   - 月度運量：ridership filter by county_id + stat_period 2026-XX（real，TRA 2024 月度缺）
 *   - 各系統縣市別車次：stations(county) join station_daily_trips 按 system 聚合（real）
 * 資料缺口（非本檔 mock，待 ETL Wave 2）：
 *   - 臺鐵 2024 月度運量回填 → RidershipTab 以 missing-data-card 標註
 */

import { useMemo, useState } from "react";
import {
  Train, MapPin, Route, ArrowLeftRight, Lightbulb,
  Plus, Share2, Download, ChevronLeft, Ship, Car, Award, Users,
} from "lucide-react";
import { fmt } from "@/lib/format";
import { byCode3 } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { KPICard } from "@/components/kpi/KPICard";
import { TrendChart } from "@/components/charts/TrendChart";
import { HRankBar, type HRankRow } from "@/components/common/HRankBar";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import type { RailDataState } from "@/hooks/useRailData";
import {
  RAIL_SYSTEMS_META,
  deriveCountySystemTrips,
  type RailSystemId,
  type CountyRailAggregate,
  type StationDailyTripsRow,
} from "@/lib/queries/rail";

interface ViewBRailProps {
  data: RailDataState;
  county: CountyCode3;
  onBack: () => void;
}

type TabId = "overview" | "stations" | "service" | "ridership" | "rank";

const REGION_LABELS: Record<string, string> = {
  north: "北部", central: "中部", south: "南部", east: "東部", island: "離島",
};

// ─────────────────────────────────────────────────
export function ViewBRail({ data, county, onBack }: ViewBRailProps) {
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
        <h1><span className="accent">{c.name_zh}</span><span className="small">· 軌道</span></h1>
        <p className="hook">{data.loading ? "正在載入軌道資料 ..." : "縣市資料尚未就緒"}</p>
      </div>
    );
  }
  const zero = cAgg.stations === 0;

  // 跨縣市同網提示
  const crossNote = (() => {
    if (cAgg.systems.includes("trtc") && (county === "TPE" || county === "NTP"))
      return { sys: "TRTC", txt: "臺北捷運 7 條路線跨 臺北 + 新北" };
    if (cAgg.systems.includes("tymc"))
      return { sys: "TYMC", txt: "桃園機場捷運 1 線跨 臺北 + 新北 + 桃園" };
    if (cAgg.systems.includes("klrt") && county === "KHH")
      return { sys: "KLRT", txt: "高雄輕軌環線（單一縣市）" };
    return null;
  })();

  return (
    <div>
      <Hero c={c} cAgg={cAgg} aggs={data.countyAggregates} N={data.summary} crossNote={crossNote} onBack={onBack} />

      {zero ? (
        <ZeroRailFallback cname={c.name_zh} />
      ) : (
        <>
          <div className="tab-bar">
            {(
              [
                ["overview", "概覽"],
                ["stations", "車站"],
                ["service",  "路線時刻"],
                ["ridership","運量"],
                ["rank",     "排名"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "overview"  && <OverviewTab county={county} cname={c.name_zh} cAgg={cAgg} N={data.summary} crossNote={crossNote} data={data} />}
          {tab === "stations"  && <StationsTab county={county} cname={c.name_zh} cAgg={cAgg} data={data} />}
          {tab === "service"   && <ServiceTab county={county} cname={c.name_zh} cAgg={cAgg} data={data} />}
          {tab === "ridership" && <RidershipTab county={county} c={c} cAgg={cAgg} data={data} />}
          {tab === "rank"      && <RankTab county={county} aggs={data.countyAggregates} />}
        </>
      )}

      <DataSourceBadge
        sources={["交通部 TDX", "臺鐵 / 高鐵 / 4 大捷運 / 3 輕軌", "rail.stations / lines / station_daily_trips / ridership_by_station"]}
        updatedAt="2026-05-29"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────
function Hero({ c, cAgg, aggs, N, crossNote, onBack }: {
  c: { name_zh: string; region: string; area_km2: number; pop_2024_wan: number };
  cAgg: CountyRailAggregate;
  aggs: CountyRailAggregate[];
  N: NonNullable<RailDataState["summary"]>;
  crossNote: { sys: string; txt: string } | null;
  onBack: () => void;
}) {
  const region = REGION_LABELS[c.region] ?? c.region;
  const rankOf = (key: keyof CountyRailAggregate) => {
    const sorted = [...aggs].sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0));
    return sorted.findIndex((a) => a.code3 === cAgg.code3) + 1;
  };
  let hook: React.ReactNode;
  if (cAgg.stations === 0) {
    hook = <><b className="em">離島無軌道</b> ─ {c.name_zh} 為金門 / 澎湖 / 連江「軌道空白縣市」之一</>;
  } else if (cAgg.code3 === "TPE") {
    hook = <>全國軌道核心 · 每日 <b className="em">{fmt.num(cAgg.dailyTrips)}</b> 班次 · 佔全國 {Math.round(cAgg.dailyTrips / N.dailyTrips * 100)}%</>;
  } else if (cAgg.systems.length >= 3) {
    hook = <><b className="em">{cAgg.systems.length} 系統共存</b>（{cAgg.systems.map((s) => RAIL_SYSTEMS_META[s].short).join(" / ")}）· {cAgg.stations} 站、{cAgg.km.toFixed(1)} km</>;
  } else {
    hook = <>{cAgg.stations} 站、{cAgg.lines} 條路線、{cAgg.km.toFixed(1)} km · 日均 <b>{fmt.num(cAgg.dailyTrips)}</b> 班次</>;
  }

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
              <span className="small">· 軌道</span>
              <Train size={18} color="var(--accent)" />
            </h1>
            <div className="hook" style={{ fontSize: 14 }}>{hook}</div>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Download size={14} /> 下載 CSV</button>
            <button className="btn ghost"><Share2 size={14} /> 分享</button>
          </div>
        </div>

        {/* 系統徽章 strip */}
        <div className="rail-sys-badges">
          <span className="rsb-lbl">系統</span>
          {cAgg.systems.length === 0 && <span className="rsb-empty">無</span>}
          {cAgg.systems.map((sid) => {
            const s = RAIL_SYSTEMS_META[sid];
            if (!s) return null;
            return (
              <span key={sid} className="rsb" style={{ background: s.color }}>
                {s.short}
                <span className="rsb-name">{s.label}</span>
              </span>
            );
          })}
          {crossNote && (
            <span className="rsb-cross">⭐ 跨縣市：{crossNote.txt}</span>
          )}
        </div>

        <div className="ch-chips" style={{ marginTop: 12, marginBottom: 0 }}>
          <span className="ch-chip region"><span className="swatch"></span>{region}</span>
          <span className="ch-chip">{fmt.num(c.area_km2)} km²</span>
          <span className="ch-chip">人口 {fmt.num(c.pop_2024_wan, 1)} 萬</span>
        </div>
      </div>

      {cAgg.stations > 0 && (
        <div className="county-fact-grid" style={{ marginBottom: 16 }}>
          {(() => {
            const rankCls = (r: number) => r <= 5 ? "high" : r >= 17 ? "low" : "";
            const stationRank = rankOf("stations");
            const kmRank      = rankOf("km");
            const tripsRank   = rankOf("dailyTrips");
            const tiles = [
              { ico: <MapPin size={11} />,        label: "車站",     val: cAgg.stations.toString(), rank: stationRank, note: `${cAgg.systems.length} 系統` },
              { ico: <Route size={11} />,         label: "路線",     val: cAgg.lines.toString(),    rank: 0,            note: `${cAgg.lines} 條` },
              { ico: <Train size={11} />,         label: "里程",     val: cAgg.km.toFixed(1), unit: "km", rank: kmRank,   note: `${(cAgg.km / Math.max(1, N.kmTotal) * 100).toFixed(1)}% 全國` },
              { ico: <ArrowLeftRight size={11} />, label: "日均車次", val: fmt.num(cAgg.dailyTrips), rank: tripsRank,    note: `${(cAgg.dailyTrips / Math.max(1, N.dailyTrips) * 100).toFixed(1)}% 全國` },
            ];
            return tiles.map((t, i) => (
              <div key={i} className="county-fact-tile">
                <div className="cft-lbl"><span className="ico">{t.ico}</span>{t.label}</div>
                <div className="cft-val">{t.val}{t.unit && <span className="unit">{t.unit}</span>}</div>
                <div className="cft-foot">
                  {t.rank > 0
                    ? <span className={`cft-rank ${rankCls(t.rank)}`}>#{t.rank} / 22</span>
                    : <span className="cft-rank" style={{ background: "transparent", color: "var(--text-tertiary)" }}>—</span>}
                  <span className="cft-delta">{t.note}</span>
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
function ZeroRailFallback({ cname }: { cname: string }) {
  return (
    <div className="cat-block">
      <div className="empty-storage-card" style={{ marginBottom: 14 }}>
        <div className="es-ico"><Train size={20} /></div>
        <div className="es-body">
          <div className="es-title">{cname} 屬「軌道空白縣市」</div>
          <div className="es-desc">
            全國 22 縣市中，<b>金門、澎湖、連江</b>三個離島縣市未設任何軌道系統 ─
            島內交通仰賴道路 + 港口（見「⚓ 航運」主題）+ 民航機場。
          </div>
        </div>
      </div>
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <div>
            <div className="section-title"><span className="pre">ALTERNATIVE</span>島內交通模式</div>
            <div className="section-subtitle">{cname} 的對外運輸主軸</div>
          </div>
        </div>
        <div className="alt-mode-grid">
          <div className="alt-mode">
            <div className="am-ico"><Ship size={18} /></div>
            <div className="am-body">
              <div className="am-t">海運</div>
              <div className="am-d">本島往來客貨船 · 詳見 航運 ⚓</div>
            </div>
          </div>
          <div className="alt-mode">
            <div className="am-ico"><Car size={18} /></div>
            <div className="am-body">
              <div className="am-t">道路</div>
              <div className="am-d">島內公路 + 客運</div>
            </div>
          </div>
          <div className="alt-mode">
            <div className="am-ico"><Plus size={18} /></div>
            <div className="am-body">
              <div className="am-t">民航</div>
              <div className="am-d">本島機場聯外</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Tab 1 · 概覽
// ─────────────────────────────────────────────────
function OverviewTab({ county, cname, cAgg, N, crossNote, data }: {
  county: CountyCode3;
  cname: string;
  cAgg: CountyRailAggregate;
  N: NonNullable<RailDataState["summary"]>;
  crossNote: { sys: string; txt: string } | null;
  data: RailDataState;
}) {
  // 各系統縣市別車次（真實）：stations(county) join station_daily_trips 按 system 聚合。
  const sysTrips = useMemo(() => {
    const cc = byCode3[county];
    if (!cc) return [];
    return deriveCountySystemTrips(cc.id_moi, data.stations, data.trips);
  }, [county, data.stations, data.trips]);
  const maxSysTrips = Math.max(1, ...sysTrips.map((s) => s.trips));

  return (
    <>
      <div className="kpi-grid cols-4">
        <KPICard
          icon={<MapPin size={13} />}
          label="車站數"
          value={cAgg.stations}
          unit="站"
          trend={{ delta: `${cAgg.systems.length} 系統`, direction: "flat", baseline: "9 系統 9 色", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Route size={13} />}
          label="路線數"
          value={cAgg.lines}
          unit="條"
          trend={{ delta: "含跨縣市", direction: "flat", baseline: "全國 " + N.lines + " 條", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Train size={13} />}
          label="營運里程"
          value={cAgg.km.toFixed(1)}
          unit="km"
          trend={{ delta: `${(cAgg.km / Math.max(1, N.kmTotal) * 100).toFixed(1)}% 全國`, direction: "flat", baseline: "含跨界路段", sentiment: "neutral" }}
        />
        <KPICard
          icon={<ArrowLeftRight size={13} />}
          label="日均車次"
          value={fmt.num(cAgg.dailyTrips)}
          unit="次/日"
          trend={{ delta: `${(cAgg.dailyTrips / Math.max(1, N.dailyTrips) * 100).toFixed(1)}% 全國`, direction: "flat", baseline: "尖峰+離峰合計", sentiment: "neutral" }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">SYSTEMS</span>
              {cname} · 各系統車次
            </div>
            <div className="section-subtitle">
              {sysTrips.length} 系統運行於此縣市
              {sysTrips.length > 0 && (
                <> ─ 主力系統為 <b style={{ color: sysTrips[0].color }}>{sysTrips[0].label}</b>
                  （{cAgg.dailyTrips > 0 ? Math.round((sysTrips[0].trips / cAgg.dailyTrips) * 100) : 0}% 車次）</>
              )}
            </div>
          </div>
          <span className="coverage-badge" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            日均停靠車次
          </span>
        </div>
        {/* 各系統縣市別車次（真實：stations join station_daily_trips 按系統聚合） */}
        {sysTrips.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sysTrips.map((s) => {
              const pct = (s.trips / maxSysTrips) * 100;
              const share = cAgg.dailyTrips > 0 ? (s.trips / cAgg.dailyTrips) * 100 : 0;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, width: 92, flexShrink: 0, minWidth: 0 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.label}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 36, height: 16, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: 92, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt.num(s.trips)}</span>
                    <span className="muted" style={{ fontSize: 11 }}> 次/日</span>
                    <div className="muted" style={{ fontSize: 10.5 }}>{s.stations} 站 · {share.toFixed(0)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 12 }}>此縣市無車次資料</div>
        )}
      </div>

      {crossNote && (
        <div className="insight">
          <div className="ico"><Lightbulb size={18} /></div>
          <div className="body">
            <b style={{ color: "var(--accent-deep)" }}>{crossNote.sys}</b> {crossNote.txt} ─
            左側地圖選擇此縣市時，將同時高亮所有跨界路網與車站。
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 2 · 車站
// ─────────────────────────────────────────────────
function StationsTab({ county, cname, cAgg, data }: {
  county: CountyCode3;
  cname: string;
  cAgg: CountyRailAggregate;
  data: RailDataState;
}) {
  // 該縣市 stations join trips
  const rows = useMemo(() => {
    const cStations = data.stations.filter((s) => s.county_id != null
      && (() => {
        const c = byCode3[county];
        return c && c.id_moi === s.county_id;
      })());
    const tripMap = new Map<string, StationDailyTripsRow>();
    for (const t of data.trips) tripMap.set(`${t.system_id}|${t.station_id}`, t);
    const list = cStations.map((s) => {
      const t = tripMap.get(`${s.system_id}|${s.station_id}`);
      return {
        name: s.name,
        system: s.system_id as RailSystemId,
        trips: t?.daily_stop_count ?? 0,
        peak: t?.peak_count ?? 0,
        offpeak: t?.offpeak_count ?? 0,
      };
    });
    return list.sort((a, b) => b.trips - a.trips);
  }, [data.stations, data.trips, county]);

  const topStations = rows.slice(0, 20);
  const peakAvg = rows[0]?.trips ?? 0;

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<MapPin size={13} />}
          label="總車站"
          value={cAgg.stations}
          unit="站"
          trend={{ delta: `${cAgg.systems.length} 系統`, direction: "flat", baseline: "本縣市", sentiment: "neutral" }}
        />
        <KPICard
          icon={<ArrowLeftRight size={13} />}
          label="平均車次/站"
          value={cAgg.stations > 0 ? fmt.num(Math.round(cAgg.dailyTrips / cAgg.stations)) : "—"}
          unit="次/日"
          trend={{
            delta: peakAvg > 500 ? "有大站" : "中小站為主",
            direction: "flat",
            baseline: topStations[0] ? `Top: ${topStations[0].name}` : "—",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Award size={13} />}
          label="最大站車次"
          value={fmt.num(topStations[0]?.trips ?? 0)}
          unit="次/日"
          trend={{ delta: topStations[0]?.name ?? "—", direction: "flat", baseline: "該縣市車次冠軍", sentiment: "neutral" }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">STATIONS</span>
              {cname} 車站清單 · 停靠車次排名
            </div>
            <div className="section-subtitle">
              共 {cAgg.stations} 站，列出前 {Math.min(rows.length, 20)} 名
            </div>
          </div>
          <span className="coverage-badge" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            ⓘ 系統色與地圖對應
          </span>
        </div>
        <div className="rail-top-stations" style={{ borderRadius: 8 }}>
          <div className="rail-top-row head">
            <span>#</span>
            <span>站名</span>
            <span>系統</span>
            <span>尖峰 / 離峰</span>
            <span style={{ textAlign: "right" }}>車次</span>
          </div>
          {topStations.map((s, i) => {
            const sys = RAIL_SYSTEMS_META[s.system];
            const ratio = s.trips > 0 ? s.peak / s.trips : 0;
            return (
              <div key={`${s.system}-${s.name}-${i}`} className="rail-top-row">
                <span className="rnk">{String(i + 1).padStart(2, "0")}</span>
                <span className="nm">{s.name}</span>
                <span className="sys-pill" style={{ background: sys?.color || "var(--accent)" }}>{sys?.short || s.system}</span>
                <div className="stack">
                  <div className="peak" style={{ width: `${ratio * 100}%` }}></div>
                  <div className="off" style={{ width: `${(1 - ratio) * 100}%` }}></div>
                </div>
                <span className="trips">
                  <span style={{ fontWeight: 700 }}>{fmt.num(s.trips)}</span>
                  <span className="unit"> 次</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 3 · 路線時刻
// ─────────────────────────────────────────────────
function ServiceTab({ county, cname, cAgg, data }: {
  county: CountyCode3;
  cname: string;
  cAgg: CountyRailAggregate;
  data: RailDataState;
}) {
  // 24hr：sum hourly_distribution for that county's stations' trips
  const Hc = useMemo(() => {
    const c = byCode3[county];
    if (!c) return Array.from({ length: 24 }, (_, h) => ({ x: h, label: h % 4 === 0 ? `${h}:00` : "", value: 0 }));
    const stationKeys = new Set<string>();
    for (const s of data.stations) {
      if (s.county_id === c.id_moi) stationKeys.add(`${s.system_id}|${s.station_id}`);
    }
    const buckets = new Array(24).fill(0);
    for (const t of data.trips) {
      if (!stationKeys.has(`${t.system_id}|${t.station_id}`)) continue;
      if (!t.hourly_distribution || t.hourly_distribution.length !== 24) continue;
      for (let h = 0; h < 24; h++) buckets[h] += t.hourly_distribution[h];
    }
    return buckets.map((v, h) => ({ x: h, label: h % 4 === 0 ? `${h}:00` : "", value: v }));
  }, [data.stations, data.trips, county]);
  const maxHour = Math.max(...Hc.map((h) => h.value), 1);
  const peakHours = new Set([7, 8, 17, 18]);
  const peakSum = Hc.filter((h) => peakHours.has(h.x)).reduce((a, h) => a + h.value, 0);
  const offSum = Hc.filter((h) => !peakHours.has(h.x)).reduce((a, h) => a + h.value, 0);
  const ratio = offSum > 0 ? peakSum / offSum : 0;

  const hasTra = cAgg.systems.includes("tra");

  // TRA 車種：filter trips by system=tra + county stations
  const traBreakdown = useMemo(() => {
    if (!hasTra) return [] as Array<{ id: string; label: string; pct: number; trips: number; color: string }>;
    const c = byCode3[county];
    if (!c) return [];
    const stationKeys = new Set<string>();
    for (const s of data.stations) {
      if (s.system_id === "tra" && s.county_id === c.id_moi) stationKeys.add(s.station_id);
    }
    const sum: Record<string, number> = {};
    for (const t of data.trips) {
      if (t.system_id !== "tra") continue;
      if (!stationKeys.has(t.station_id)) continue;
      if (!t.by_train_type) continue;
      for (const [code, n] of Object.entries(t.by_train_type)) sum[code] = (sum[code] ?? 0) + Number(n);
    }
    const total = Object.values(sum).reduce((s, v) => s + v, 0);
    const meta: Record<string, { label: string; color: string }> = {
      LC:      { label: "區間車",    color: "#1E3A8A" },
      CK:      { label: "莒光",      color: "#3B82F6" },
      TC:      { label: "自強",      color: "#60A5FA" },
      "TC-PP": { label: "自強 (PP)", color: "#93C5FD" },
      PP:      { label: "其他 PP",   color: "#BFDBFE" },
      TZ:      { label: "推拉",      color: "#DBEAFE" },
      CG:      { label: "復興",      color: "#94A3B8" },
    };
    return Object.entries(sum)
      .map(([id, trips]) => ({
        id,
        label: meta[id]?.label ?? id,
        pct: total > 0 ? (trips / total) * 100 : 0,
        trips,
        color: meta[id]?.color ?? "#94A3B8",
      }))
      .sort((a, b) => b.trips - a.trips);
  }, [data.stations, data.trips, county, hasTra]);

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Route size={13} />}
          label="路線數"
          value={cAgg.lines}
          unit="條"
          trend={{ delta: `${cAgg.systems.length} 系統`, direction: "flat", baseline: "含跨縣市路線", sentiment: "neutral" }}
        />
        <KPICard
          icon={<ArrowLeftRight size={13} />}
          label="尖峰/離峰比"
          value={ratio.toFixed(2)}
          unit="×"
          trend={{
            delta: ratio > 0.5 ? "尖峰顯著" : "全日平緩",
            direction: "flat",
            baseline: "尖峰 7-9 + 17-19",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Train size={13} />}
          label="主力車種"
          value={hasTra && traBreakdown.length > 0 ? traBreakdown[0].label : (RAIL_SYSTEMS_META[cAgg.systems[0]]?.label ?? "—")}
          trend={{
            delta: hasTra && traBreakdown.length > 0 ? `${traBreakdown[0].pct.toFixed(1)}% TRA` : "捷運／輕軌",
            direction: "flat",
            baseline: hasTra ? "通勤本位" : "等距離通勤運能",
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">HOURLY</span>
              {cname} · 24 小時班次分布
            </div>
            <div className="section-subtitle">
              真實 hourly_distribution 加總 ─ 尖峰 {fmt.num(peakSum)} 班、離峰 {fmt.num(offSum)} 班
            </div>
          </div>
          <div className="row gap-8" style={{ fontSize: 11 }}>
            <span className="row gap-4"><i style={{ display: "inline-block", width: 10, height: 10, background: "var(--accent)", borderRadius: 2 }}></i>尖峰</span>
            <span className="row gap-4"><i style={{ display: "inline-block", width: 10, height: 10, background: "var(--accent-ramp-3)", borderRadius: 2 }}></i>離峰</span>
          </div>
        </div>
        <div className="rail-hour-bars">
          {Hc.map((h) => (
            <div key={h.x}
              className={`rhb ${peakHours.has(h.x) ? "peak" : ""}`}
              style={{ height: `${(h.value / maxHour) * 100}%` }}
              title={`${h.x}:00 — ${fmt.num(h.value)} 班`} />
          ))}
          <div className="rhb-labels">
            {Hc.map((h) => <span key={h.x}>{h.label}</span>)}
          </div>
        </div>
      </div>

      {hasTra && traBreakdown.length > 0 && (
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">TRA</span>
                {cname} TRA 車種佔比
              </div>
              <div className="section-subtitle">
                依該縣市 TRA 車站 by_train_type 加總（real）
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden" }}>
              {traBreakdown.map((t) => (
                <div key={t.id} style={{ flex: Math.max(0.01, t.trips), background: t.color }} title={`${t.label} ${t.pct.toFixed(1)}%`}></div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
              {traBreakdown.map((t) => (
                <div key={t.id} className="row gap-8" style={{ fontSize: 11.5 }}>
                  <i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: t.color }}></i>
                  <span style={{ color: "var(--text)" }}>{t.label}</span>
                  <span className="muted" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                    {t.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!hasTra && (
        <div className="muted" style={{ fontSize: 12, padding: "0 4px" }}>
          ※ {cname} 無臺鐵路段，車種主要為 {cAgg.systems.map((s) => RAIL_SYSTEMS_META[s].short).join(" / ")} 自有車組
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 4 · 運量
// ─────────────────────────────────────────────────
function RidershipTab({ county, c, cAgg, data }: {
  county: CountyCode3;
  c: { name_zh: string; pop_2024_wan: number };
  cAgg: CountyRailAggregate;
  data: RailDataState;
}) {
  const N = data.summary!;
  const has2024 = cAgg.ridership24 > 0;
  // 月度：filter ridership county_id matching idMoi + stat_period '2026-XX'
  const monthly = useMemo(() => {
    const cc = byCode3[county];
    if (!cc) return [] as Array<{ ym: string; value: number }>;
    const m = new Map<string, number>();
    for (const r of data.ridership) {
      if (r.county_id !== cc.id_moi) continue;
      if (!/^2026-\d{2}$/.test(r.stat_period)) continue;
      m.set(r.stat_period, (m.get(r.stat_period) ?? 0) + r.ridership_total);
    }
    return Array.from(m.entries()).sort()
      .map(([ym, total]) => ({ ym: ym.replace(/^20/, ""), value: Number((total / 1e6).toFixed(1)) }));
  }, [data.ridership, county]);

  return (
    <>
      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Award size={13} />}
          label="2024 年度運量"
          value={has2024 ? cAgg.ridership24.toFixed(2) : "—"}
          unit="億人次"
          trend={{
            delta: has2024 ? `${(cAgg.ridership24 / Math.max(0.01, N.ridership24) * 100).toFixed(1)}% 全國` : "資料缺",
            direction: "flat",
            baseline: has2024 ? `${(cAgg.ridership24 / Math.max(0.01, N.ridership24) * 100).toFixed(1)}% 全國` : "TRA 2024 月度缺",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Users size={13} />}
          label="人均年運量"
          value={has2024 && c.pop_2024_wan > 0 ? fmt.num(Math.round(cAgg.ridership24 * 1e8 / (c.pop_2024_wan * 1e4))) : "—"}
          unit="人次/年"
          trend={{
            delta: has2024 ? "通勤強度指標" : "—",
            direction: "flat",
            baseline: `÷ ${fmt.num(c.pop_2024_wan, 1)} 萬人口`,
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Train size={13} />}
          label="日均運量"
          value={has2024 ? fmt.num(Math.round(cAgg.ridership24 * 1e8 / 365 / 1e4)) : "—"}
          unit="萬人次/日"
          trend={{ delta: `${cAgg.systems.length} 系統合計`, direction: "flat", baseline: "÷ 365 天", sentiment: "neutral" }}
        />
      </div>

      {monthly.length > 0 ? (
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">
                <span className="pre">MONTHLY</span>
                {c.name_zh} · 2026 月度運量
              </div>
              <div className="section-subtitle">
                rail.ridership_by_station 月度 sum（real）
              </div>
            </div>
            <span className="coverage-badge">ℹ {monthly.length} 個月</span>
          </div>
          <TrendChart
            series={[{ name: c.name_zh, color: "var(--accent)", data: monthly.map((m, i) => ({ x: i, y: m.value })) }]}
            xLabels={monthly.map((m) => m.ym)}
            height={190}
            showLegend={false}
          />
          <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
            ※ 縣市月度級：trtc / krtc / tmrt 自 2026-Q2 起穩定；tra 2024 月度缺
          </div>
        </div>
      ) : (
        <div className="missing-data-card" style={{ marginBottom: "var(--section-gap)" }}>
          <div className="icon-box"><Train size={16} /></div>
          <div>
            <div className="title">{c.name_zh} 月度運量資料缺</div>
            <div className="reason">
              該縣市 ridership_by_station 沒有 2026-XX 月度錄；
              tra 2024 月度尚未回填，collector 須等到 2026-Q2 後始可穩定。
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────
// Tab 5 · 排名
// ─────────────────────────────────────────────────
function RankTab({ county, aggs }: { county: CountyCode3; aggs: CountyRailAggregate[]; }) {
  const items: Array<{ key: keyof CountyRailAggregate; label: string; unit: string; dp?: number; }> = [
    { key: "stations",    label: "車站數",      unit: "站" },
    { key: "dailyTrips",  label: "日均車次",    unit: "次/日" },
    { key: "km",          label: "營運里程",    unit: "km",  dp: 1 },
    { key: "ridership24", label: "2024 年運量", unit: "億",  dp: 2 },
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

// noop — 預留位置
