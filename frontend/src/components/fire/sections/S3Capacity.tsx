/**
 * 區塊 3 · 火災交叉量能
 *
 * - 3-1 KPI ×3（分隊密度/萬人 / 分隊密度/100km² / 5min 圈外） — mock
 * - 3-2 散布圖：x = 火災密度（真實），y = 分隊密度（mock）
 * - 3-3 22 縣市量能對照表 — mock
 */

import { useMemo, useState } from "react";
import { Users, MapPin, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";
import { COUNTIES, byIdMoi } from "@/lib/counties";
import type { FireCountyAggregate } from "@/lib/queries/fire";
import { FireCatHeader } from "../FireCatHeader";
import { FireScatter, FireScatterLegend, type FireScatterPoint } from "../FireScatter";
import { FIRE_MOCK_BY_COUNTY, FIRE_NATIONAL_MOCK, FIRE_REGION_COLORS } from "@/lib/mock-fire";

interface S3Props {
  countyAggregates: FireCountyAggregate[];
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

type SortKey = "stations" | "stationsPerWan" | "stationsPer100km2" | "outOf5MinPct";

export function S3Capacity({ countyAggregates, selectedCounty, onCountyClick }: S3Props) {
  const [sortKey, setSortKey] = useState<SortKey>("outOf5MinPct");

  // Real 火災密度 from countyAggregates + mock 分隊密度
  const scatterPoints: FireScatterPoint[] = useMemo(() => {
    return COUNTIES.map((c) => {
      const a = countyAggregates.find((r) => r.county_id === c.id_moi);
      const mock = FIRE_MOCK_BY_COUNTY[c.code3];
      const fireDensity =
        a && c.pop_2024_wan > 0 ? a.incidents / c.pop_2024_wan : 0;
      return {
        code: c.code3,
        label: c.name_zh,
        x: fireDensity,
        y: mock?.stationsPerWan ?? 0,
        pop: c.pop_2024_wan,
        color: FIRE_REGION_COLORS[c.region],
        region: c.region,
      };
    });
  }, [countyAggregates]);

  // 量能對照表
  const tableRows = useMemo(() => {
    return COUNTIES.map((c) => {
      const mock = FIRE_MOCK_BY_COUNTY[c.code3];
      return {
        code3: c.code3,
        name: c.name_zh,
        pop: c.pop_2024_wan,
        area: c.area_km2,
        stations: mock?.stations ?? 0,
        stationsPerWan: mock?.stationsPerWan ?? 0,
        stationsPer100km2: mock?.stationsPer100km2 ?? 0,
        outOf5MinPct: mock?.outOf5MinPct ?? 0,
      };
    }).sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [sortKey]);

  const HCell = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => setSortKey(k)}
      className={sortKey === k ? "is-sorted" : ""}
      style={{ textAlign: "right", cursor: "pointer" }}
    >
      {label}
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
        tagline="分隊密度 vs 火災頻率：哪些縣市量能落差最大（散布圖 x 軸為真實火災密度，y 軸為 mock 分隊密度）"
        badge="部分真實 · 部分 mock"
        badgeTone="sampled"
      />

      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Users size={13} />}
          label={<>分隊密度 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={FIRE_NATIONAL_MOCK.stationsPerWan}
          unit="隊/萬人"
          trend={{
            delta: "全國平均",
            direction: "flat",
            baseline: "離島最高 38.5",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<MapPin size={13} />}
          label={<>分隊面積密度 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={FIRE_NATIONAL_MOCK.stationsPer100Km2}
          unit="隊/100km²"
          trend={{
            delta: "面積密度",
            direction: "flat",
            baseline: "都會區較高",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label={<>5min 圈外人口 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={FIRE_NATIONAL_MOCK.outOf5MinPct}
          unit="%"
          trend={{
            delta: "山林偏鄉占多",
            direction: "flat",
            baseline: "花蓮、臺東最高",
            sentiment: "negative",
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
              <span className="muted"> x 軸真實 / y 軸 mock</span>
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
              圈外比例越高代表偏鄉服務缺口越大 ·
              <span className="muted"> 等 Sprint 3 PostGIS 衍生表</span>
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
                <HCell k="outOf5MinPct" label="圈外 %" />
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
                    <td className="tnum">{r.stationsPerWan.toFixed(1)}</td>
                    <td className="tnum">{r.stationsPer100km2.toFixed(1)}</td>
                    <td className="tnum">
                      {isCrit && <span className="fire-crit-dot">●</span>}
                      <b
                        style={{
                          color: isCrit ? "var(--accent-fire, #DC2626)" : "var(--text)",
                        }}
                      >
                        {r.outOf5MinPct.toFixed(1)}%
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
