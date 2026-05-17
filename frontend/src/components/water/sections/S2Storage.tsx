/**
 * Section 2 · 儲存 — 現在水多少
 *
 *  - 4 區蓄水率 bar（容量加權，前端聚合 reservoirs by region）
 *  - 5 大供水水庫 list（依 effective_capacity_wan desc 取 top 5）
 *  - 24hr 全國均雨量 KPI（從 useWaterKpis.summary.rain_24hr_avg）
 *  - 高警戒水庫數 KPI（< 30%）
 *  - PointProfile 40 水庫圖
 *
 * 接真實：4 區蓄水率 / 5 大水庫 / 24hr 雨量 / 警戒水庫 / PointProfile
 * mock + footnote：vs 上月同期（snapshot 30 天保留期不足跨月對比）
 */

import { Waves, Droplet, CloudRain, AlertTriangle, ArrowDownToLine } from "lucide-react";
import { fmt } from "@/lib/format";
import { KPICard } from "@/components/kpi/KPICard";
import { PointProfile } from "@/components/point-profile/PointProfile";
import { WaterCatHeader } from "../WaterCatHeader";
import type {
  ReservoirStatusRow,
  WaterKpiSummary,
  GroundwaterSummary,
} from "@/lib/queries/water";
import { normalizeReservoirRegion } from "@/lib/queries/water";
import type { CountyCode3 } from "@/lib/types";

interface Props {
  reservoirs: ReservoirStatusRow[];
  summary: WaterKpiSummary | null;
  groundwaterSummary: GroundwaterSummary | null;
  onCountyClick?: (code: CountyCode3) => void;
  onDrillReservoir?: (id: string) => void;
}

interface RegionRow {
  id: "north" | "central" | "south" | "east" | "island";
  label: string;
  rate: number;
  n: number;
}

const REGION_ORDER: Array<RegionRow["id"]> = ["north", "central", "south", "east", "island"];
const REGION_LABEL: Record<RegionRow["id"], string> = {
  north: "北部", central: "中部", south: "南部", east: "東部", island: "離島",
};

function rateTone(r: number): "" | "crit" | "warn" {
  if (r < 35) return "crit";
  if (r < 60) return "warn";
  return "";
}

export function S2Storage({ reservoirs, summary, groundwaterSummary, onCountyClick, onDrillReservoir }: Props) {
  // 4 區容量加權 + 全國加權
  const byRegion: RegionRow[] = REGION_ORDER.map((id) => {
    const inRegion = reservoirs.filter(
      (r) => normalizeReservoirRegion(r.region) === id && r.storage_ratio_pct != null
    );
    const totalCap = inRegion.reduce((s, r) => s + Number(r.effective_capacity_wan ?? 0), 0);
    const weightedRate = totalCap > 0
      ? inRegion.reduce((s, r) => s + (r.storage_ratio_pct ?? 0) * Number(r.effective_capacity_wan ?? 0), 0) / totalCap
      : 0;
    return { id, label: REGION_LABEL[id], rate: weightedRate, n: inRegion.length };
  }).filter((r) => r.n > 0);

  // 全國加權（取代簡單平均）
  const validReservoirs = reservoirs.filter((r) => r.storage_ratio_pct != null && r.effective_capacity_wan != null);
  const totalCap = validReservoirs.reduce((s, r) => s + Number(r.effective_capacity_wan ?? 0), 0);
  const nationalWeighted = totalCap > 0
    ? validReservoirs.reduce((s, r) => s + (r.storage_ratio_pct ?? 0) * Number(r.effective_capacity_wan ?? 0), 0) / totalCap
    : (summary?.reservoir_rate_avg ?? 0);

  // 5 大供水水庫（按 effective_capacity_wan desc）
  const top5 = [...reservoirs]
    .filter((r) => r.storage_ratio_pct != null)
    .sort((a, b) => Number(b.effective_capacity_wan ?? 0) - Number(a.effective_capacity_wan ?? 0))
    .slice(0, 5);

  return (
    <div className="cat-block">
      <WaterCatHeader
        num={2}
        title={<><span className="accent">儲存</span> ─ 現在水多少</>}
        tagline="水庫蓄水率（即時）+ 降雨進帳"
        badge="LIVE"
        badgeTone="live"
      />

      {/* 4 區 + 5 大水庫 並列 */}
      <div className="two-up">
        <div className="reg-gauge-card">
          <div className="reg-gauge-head">
            <div className="row gap-8">
              <Waves size={14} />
              <b style={{ fontSize: 13.5 }}>全國蓄水率（容量加權）</b>
            </div>
            <div className="nat">
              全國平均
              <b>{nationalWeighted.toFixed(1)}%</b>
              <span className="muted">（依即時加權）</span>
            </div>
          </div>
          <div className="reg-rows">
            {byRegion.map((r) => (
              <div key={r.id} className="reg-row">
                <span className="lbl">{r.label}</span>
                <div className="bar-wrap">
                  <div className={`bar ${rateTone(r.rate)}`} style={{ width: `${Math.min(100, r.rate)}%` }}></div>
                </div>
                <span className="val">{r.rate.toFixed(1)}%</span>
                <span className="delta">
                  <span className="muted">{r.n} 座</span>
                </span>
              </div>
            ))}
          </div>
          <div className="reg-gauge-footnote">
            <span>容量加權平均（取代簡單平均，B027）</span>
            <span>·</span>
            <span className="muted">vs 上月對比資料累積中</span>
          </div>
        </div>

        <div className="big5-list">
          <div className="reg-gauge-head">
            <div className="row gap-8">
              <Droplet size={14} />
              <b style={{ fontSize: 13.5 }}>5 大供水水庫</b>
            </div>
            <div className="muted" style={{ fontSize: 11 }}>蓄水率 · 容量</div>
          </div>
          {top5.map((r) => (
            <div
              key={r.reservoir_id}
              className="big5-row"
              style={{ cursor: onDrillReservoir ? "pointer" : "default" }}
              onClick={() => onDrillReservoir?.(r.reservoir_id)}
            >
              <div className="nm">
                {r.name}
                <span className="region">{r.region ?? ""}</span>
              </div>
              <div className="bar-wrap">
                <div
                  className={`bar ${rateTone(r.storage_ratio_pct ?? 0)}`}
                  style={{ width: `${Math.min(100, r.storage_ratio_pct ?? 0)}%` }}
                />
              </div>
              <div className="rate">{(r.storage_ratio_pct ?? 0).toFixed(1)}%</div>
              <div className="cap">{(Number(r.effective_capacity_wan ?? 0) / 10000).toFixed(2)} 億 m³</div>
              <div className="vsly">—</div>
            </div>
          ))}
        </div>
      </div>

      {/* 24hr 雨量 + 警戒水庫 + 地下水位 KPI（3 軸即時） */}
      <div className="kpi-grid cols-3" style={{ marginBottom: 14 }}>
        <KPICard
          icon={<CloudRain size={13} />}
          label="24hr 全國均雨量"
          value={fmt.num(summary?.rain_24hr_avg ?? 0, 1)}
          unit="mm"
          trend={{
            delta: `${summary?.rain_station_count ?? 0} 站平均`,
            direction: "flat",
            baseline: "即時",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="高警戒水庫（<30%）"
          value={summary?.alert_reservoir_count ?? 0}
          unit="座"
          trend={{
            delta: `全國 ${reservoirs.length} 座中`,
            direction: "flat",
            baseline: "即時",
            sentiment: summary && summary.alert_reservoir_count > 3 ? "negative" : "neutral",
          }}
        />
        <KPICard
          icon={<ArrowDownToLine size={13} />}
          label="地下水監測井"
          value={groundwaterSummary ? fmt.num(groundwaterSummary.total_stations) : "—"}
          unit="井"
          trend={{
            delta: groundwaterSummary
              ? `24h 平均 ${groundwaterSummary.avg_delta_24h_cm >= 0 ? "+" : ""}${groundwaterSummary.avg_delta_24h_cm.toFixed(1)} cm`
              : "資料載入中",
            direction:
              !groundwaterSummary
                ? "flat"
                : groundwaterSummary.avg_delta_24h_cm > 0.5
                  ? "up"
                  : groundwaterSummary.avg_delta_24h_cm < -0.5
                    ? "down"
                    : "flat",
            baseline: groundwaterSummary
              ? `↑${groundwaterSummary.rising_count} · ↓${groundwaterSummary.falling_count}`
              : "WRA IoT 每小時",
            sentiment:
              !groundwaterSummary
                ? "neutral"
                : groundwaterSummary.avg_delta_24h_cm < -1
                  ? "negative"
                  : groundwaterSummary.avg_delta_24h_cm > 1
                    ? "positive"
                    : "neutral",
          }}
        />
      </div>

      <PointProfile
        reservoirs={reservoirs}
        onReservoirClick={(r) => {
          onDrillReservoir?.(r.reservoir_id);
          // 同時觸發 county click 以聚焦
          if (onCountyClick) {
            // PointProfile 沒給 county_code3，不轉
          }
        }}
      />
    </div>
  );
}
