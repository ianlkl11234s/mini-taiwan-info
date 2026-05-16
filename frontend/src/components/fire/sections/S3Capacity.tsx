/**
 * 區塊 3 · 火災交叉量能
 *
 * 真實資料：
 *   - 各縣市分隊密度（fire.stations 真實 GROUP BY county_id ÷ COUNTIES pop/area）
 *   - 散布圖 x = 火災密度（真實，from countyAggregates）
 *   - 散布圖 y = 分隊密度（真實，from stations）
 *
 * 仍 placeholder：
 *   - 5min 圈外人口比 — 需 Sprint 3 PostGIS ST_Buffer × demographics
 */

import { useMemo, useState } from "react";
import { Users, MapPin, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";
import { COUNTIES, byIdMoi } from "@/lib/counties";
import type { FireDataState } from "@/hooks/useFireData";
import type { FireCountyAggregate } from "@/lib/queries/fire";
import { FireCatHeader } from "../FireCatHeader";
import { FireScatter, FireScatterLegend, type FireScatterPoint } from "../FireScatter";
import { FIRE_MOCK_BY_COUNTY, FIRE_REGION_COLORS } from "@/lib/mock-fire";

interface S3Props {
  data: FireDataState;
  countyAggregates: FireCountyAggregate[];
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

type SortKey = "stations" | "stationsPerWan" | "stationsPer100km2" | "outOf5MinPct";

export function S3Capacity({ data, countyAggregates, selectedCounty, onCountyClick }: S3Props) {
  const [sortKey, setSortKey] = useState<SortKey>("stationsPerWan");

  // 各縣市分隊數（真實 from fire.stations）
  const stationsByCounty = useMemo(() => {
    const acc = new Map<string, number>();
    for (const s of data.stations) {
      acc.set(s.county_id, (acc.get(s.county_id) ?? 0) + 1);
    }
    return acc;
  }, [data.stations]);

  // 全國 weighted 平均
  const nationalDensity = useMemo(() => {
    const totalStations = data.stations.length;
    const totalPopWan = COUNTIES.reduce((s, c) => s + (c.pop_2024_wan ?? 0), 0);
    const totalAreaKm2 = COUNTIES.reduce((s, c) => s + (c.area_km2 ?? 0), 0);
    return {
      stationsTotal: totalStations,
      stationsPerWan: totalPopWan > 0 ? totalStations / totalPopWan : 0,
      stationsPer100Km2: totalAreaKm2 > 0 ? (totalStations / totalAreaKm2) * 100 : 0,
    };
  }, [data.stations]);

  // Real 火災密度 × Real 分隊密度
  const scatterPoints: FireScatterPoint[] = useMemo(() => {
    return COUNTIES.map((c) => {
      const a = countyAggregates.find((r) => r.county_id === c.id_moi);
      const stationCount = stationsByCounty.get(c.id_moi) ?? 0;
      const fireDensity = a && c.pop_2024_wan > 0 ? a.incidents / c.pop_2024_wan : 0;
      const stationsPerWan = c.pop_2024_wan > 0 ? stationCount / c.pop_2024_wan : 0;
      return {
        code: c.code3,
        label: c.name_zh,
        x: fireDensity,
        y: stationsPerWan,
        pop: c.pop_2024_wan,
        color: FIRE_REGION_COLORS[c.region],
        region: c.region,
      };
    });
  }, [countyAggregates, stationsByCounty]);

  // 量能對照表
  const tableRows = useMemo(() => {
    return COUNTIES.map((c) => {
      const stationCount = stationsByCounty.get(c.id_moi) ?? 0;
      const stationsPerWan = c.pop_2024_wan > 0 ? stationCount / c.pop_2024_wan : 0;
      const stationsPer100km2 = c.area_km2 > 0 ? (stationCount / c.area_km2) * 100 : 0;
      // 5min 圈外仍 mock — Sprint 3 PostGIS 才能算
      const outOf5MinPct = FIRE_MOCK_BY_COUNTY[c.code3]?.outOf5MinPct ?? 0;
      return {
        code3: c.code3,
        name: c.name_zh,
        pop: c.pop_2024_wan,
        area: c.area_km2,
        stations: stationCount,
        stationsPerWan,
        stationsPer100km2,
        outOf5MinPct,
      };
    }).sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [stationsByCounty, sortKey]);

  const HCell = ({ k, label, isPending }: { k: SortKey; label: string; isPending?: boolean }) => (
    <th
      onClick={() => setSortKey(k)}
      className={sortKey === k ? "is-sorted" : ""}
      style={{ textAlign: "right", cursor: "pointer" }}
    >
      {label}
      {isPending && <span className="muted" style={{ fontSize: 9, marginLeft: 3 }}>·待ETL</span>}
      {sortKey === k && <span className="muted" style={{ fontSize: 9, marginLeft: 3 }}>▼</span>}
    </th>
  );

  return (
    <div className="cat-block">
      <FireCatHeader
        num={3}
        title={
          <>
            <span className="accent">火災交叉量能</span> ─ 跟得上需求嗎
          </>
        }
        tagline="分隊密度 vs 火災頻率：哪些縣市量能落差最大（x = 真實火災密度、y = 真實分隊密度）"
        badge="2 軸接通真實 + 1 軸待 Sprint 3"
        badgeTone="sampled"
      />

      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Users size={13} />}
          label="分隊密度"
          value={nationalDensity.stationsPerWan.toFixed(2)}
          unit="隊/萬人"
          trend={{
            delta: `${fmt.num(nationalDensity.stationsTotal)} 個 / 全國`,
            direction: "flat",
            baseline: "fire.stations + COUNTIES",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<MapPin size={13} />}
          label="分隊面積密度"
          value={nationalDensity.stationsPer100Km2.toFixed(2)}
          unit="隊/100km²"
          trend={{
            delta: "全國平均",
            direction: "flat",
            baseline: "都會區較高",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label={
            <>
              5min 圈外人口 <span className="muted" style={{ fontSize: 9 }}>待Sprint3</span>
            </>
          }
          value="—"
          unit="%"
          trend={{
            delta: "等 PostGIS ST_Buffer",
            direction: "flat",
            baseline: "村里 polygon + demographics",
            sentiment: "neutral",
          }}
        />
      </div>

      {/* 散布圖 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">SCATTER</span>
              量能 vs 火災密度（22 縣市）
            </div>
            <div className="section-subtitle">
              右下象限 = 量能落差警示區（高火災 + 低分隊密度）·
              <span className="muted"> x/y 兩軸皆接通真實</span>
            </div>
          </div>
          <FireScatterLegend />
        </div>
        <FireScatter
          points={scatterPoints}
          highlightCode={selectedCounty}
          onPointClick={(p) => onCountyClick?.(p.code as CountyCode3)}
        />
      </div>

      {/* 22 縣市量能對照表 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">TABLE</span>
              22 縣市量能對照
            </div>
            <div className="section-subtitle">
              分隊數已接真實、5min 圈外比仍待 Sprint 3 PostGIS 衍生
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            點 header 排序 · 點 row 進該縣市
          </div>
        </div>
        <div className="fire-table-wrap">
          <table className="fire-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>縣市</th>
                <th style={{ textAlign: "right" }}>人口(萬)</th>
                <th style={{ textAlign: "right" }}>面積</th>
                <HCell k="stations" label="分隊" />
                <HCell k="stationsPerWan" label="隊/萬人" />
                <HCell k="stationsPer100km2" label="隊/100km²" />
                <HCell k="outOf5MinPct" label="圈外 %" isPending />
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const isCrit = r.outOf5MinPct >= 20;
                return (
                  <tr
                    key={r.code3}
                    className={`${isCrit ? "is-crit" : ""} ${
                      selectedCounty === r.code3 ? "is-selected" : ""
                    }`}
                    onClick={() => onCountyClick?.(r.code3 as CountyCode3)}
                  >
                    <td className="muted">{i + 1}</td>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td className="tnum">{r.pop.toFixed(1)}</td>
                    <td className="tnum">{fmt.num(r.area)}</td>
                    <td className="tnum">{r.stations}</td>
                    <td className="tnum">{r.stationsPerWan.toFixed(2)}</td>
                    <td className="tnum">{r.stationsPer100km2.toFixed(2)}</td>
                    <td className="tnum">
                      {isCrit && <span className="fire-crit-dot">●</span>}
                      <b
                        style={{
                          color: isCrit ? "var(--accent-fire, #DC2626)" : "var(--text)",
                        }}
                      >
                        {r.outOf5MinPct > 0 ? `${r.outOf5MinPct.toFixed(1)}%` : "—"}
                      </b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 避免 unused warning
void byIdMoi;
