/**
 * Section 4 · 處理 — 怎麼變成自來水
 *
 *  - A→B→C→D flow card（淨水場 / 配水管線 / 用戶 / 公共汙水廠）
 *  - 最新月全國總供水量 KPI（取代 12 月 trend，因 twc_supply_system_monthly 僅 2026-03 單月）
 *  - 接管率 KPI + 10 年 trend
 *
 * 接真實：4-step flow 全部、月供水量、接管率
 * mock+footnote：—
 */

import { Droplet, Recycle } from "lucide-react";
import { fmt } from "@/lib/format";
import { KPICard } from "@/components/kpi/KPICard";
import { Sparkline } from "@/components/charts/Sparkline";
import { WaterCatHeader } from "../WaterCatHeader";
import type {
  PipelineYearRow,
  CustomerYearRow,
  TreatmentPlantsLargeRow,
  LatestMonthSupply,
} from "@/lib/queries/water-overview";

interface Props {
  treatmentPlantsLarge: TreatmentPlantsLargeRow[];
  pipelineHistory: PipelineYearRow[];
  customerHistory: CustomerYearRow[];
  sewagePlantsCount: number;
  monthlySupply: LatestMonthSupply | null;
  sewageNationalAvg: number | null;
  sewageNationalHistory: Array<{ year: number; coverage_avg: number }>;
}

export function S4Treatment({
  treatmentPlantsLarge,
  pipelineHistory,
  customerHistory,
  sewagePlantsCount,
  monthlySupply,
  sewageNationalAvg,
  sewageNationalHistory,
}: Props) {
  const latestPipe = pipelineHistory.length > 0 ? pipelineHistory[pipelineHistory.length - 1] : null;
  const earliestPipe = pipelineHistory.length > 5 ? pipelineHistory[pipelineHistory.length - 6] : null;
  const pipeDelta = latestPipe?.pipe_length_km && earliestPipe?.pipe_length_km
    ? (((latestPipe.pipe_length_km / earliestPipe.pipe_length_km) - 1) * 100).toFixed(1)
    : null;

  const latestCust = customerHistory.length > 0 ? customerHistory[customerHistory.length - 1] : null;
  const earliestCust = customerHistory.length > 5 ? customerHistory[customerHistory.length - 6] : null;
  const custWan = latestCust?.total_customers ? latestCust.total_customers / 10000 : null;
  const custDelta = latestCust?.total_customers && earliestCust?.total_customers
    ? (((latestCust.total_customers / earliestCust.total_customers) - 1) * 100).toFixed(1)
    : null;

  return (
    <div className="cat-block">
      <WaterCatHeader
        num={4}
        title={<><span className="accent">處理</span> ─ 怎麼變成自來水</>}
        tagline="從原水到用戶端：淨水場 → 配水管線 → 用戶 + 公共汙水廠"
        badge="歷年累積"
        badgeTone="historical"
      />

      <div className="flow-card">
        <div className="flow-row">
          <div className="flow-step">
            <div className="stage">A · 處理</div>
            <div className="num">{treatmentPlantsLarge.length || 17}<span className="unit">座</span></div>
            <div className="lbl">大型淨水場</div>
            <div className="trend">≥ 20 萬 CMD（台水）</div>
          </div>
          <div className="flow-step">
            <div className="stage">B · 輸送</div>
            <div className="num">
              {latestPipe?.pipe_length_km != null ? fmt.num(latestPipe.pipe_length_km) : "—"}
              <span className="unit">km</span>
            </div>
            <div className="lbl">配水管線</div>
            {pipelineHistory.length > 1 && (
              <div className="spark">
                <Sparkline
                  data={pipelineHistory.map((r) => r.pipe_length_km ?? 0)}
                  width={120}
                  height={18}
                />
              </div>
            )}
            {pipeDelta != null && <div className="trend">近 5 年 +{pipeDelta}%</div>}
          </div>
          <div className="flow-step">
            <div className="stage">C · 用戶</div>
            <div className="num">
              {custWan != null ? custWan.toFixed(1) : "—"}
              <span className="unit">萬戶</span>
            </div>
            <div className="lbl">自來水用戶</div>
            {customerHistory.length > 1 && (
              <div className="spark">
                <Sparkline
                  data={customerHistory.map((r) => r.total_customers ?? 0)}
                  width={120}
                  height={18}
                />
              </div>
            )}
            {custDelta != null && <div className="trend">近 5 年 +{custDelta}%</div>}
          </div>
          <div className="flow-step is-sewage">
            <div className="stage">D · 排放</div>
            <div className="num">{sewagePlantsCount}<span className="unit">座</span></div>
            <div className="lbl">公共汙水廠</div>
            <div className="trend">
              {sewageNationalAvg != null
                ? `接管率 ${sewageNationalAvg.toFixed(1)}%`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-grid cols-2">
        <KPICard
          icon={<Droplet size={13} />}
          label="全國最新月供水量"
          value={monthlySupply ? monthlySupply.total_billion_m3.toFixed(2) : "—"}
          unit="億 m³"
          trend={{
            delta: monthlySupply ? `${monthlySupply.system_count} 個供水系統` : "—",
            direction: "flat",
            baseline: monthlySupply ? `${monthlySupply.year}-${String(monthlySupply.month).padStart(2, "0")}` : "—",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Recycle size={13} />}
          label="污水接管率"
          value={sewageNationalAvg != null ? sewageNationalAvg.toFixed(1) : "—"}
          unit="%"
          trend={{
            delta: sewageNationalHistory.length > 1
              ? `近 ${sewageNationalHistory.length} 年趨勢`
              : "—",
            direction: "up",
            baseline: "歷年加權",
            sentiment: "positive",
          }}
          spark={sewageNationalHistory.map((r) => r.coverage_avg)}
        />
      </div>
    </div>
  );
}
