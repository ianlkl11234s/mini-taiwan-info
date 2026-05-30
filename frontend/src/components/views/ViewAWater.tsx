/**
 * ViewA Water — 水資源主題全國概覽
 *
 * 6 章敘事結構：現況 / 儲存 / 水情燈號 / 處理 / 使用 / 災防
 *
 * 資料：useWaterKpis() 並行 15+ Supabase fetch + useRiverWaterLevel() classify 過後
 * 設計來源：design bundle handoff 2026-05-16 `/tmp/water-design/extracted/.../view-a.jsx`
 *
 * 與 ViewA.tsx（manifest-driven）/ ViewAFire.tsx 並列為 per-theme view。
 */

import { Droplet } from "lucide-react";
import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";
import type { WaterKpisState } from "@/hooks/useWaterKpis";
import type { RiverWaterLevelState } from "@/hooks/useRiverWaterLevel";
import { S1Status } from "@/components/water/sections/S1Status";
import { S2Storage } from "@/components/water/sections/S2Storage";
import { S3Drought } from "@/components/water/sections/S3Drought";
import { S4Treatment } from "@/components/water/sections/S4Treatment";
import { S5Usage } from "@/components/water/sections/S5Usage";
import { S6Disaster } from "@/components/water/sections/S6Disaster";

interface Props {
  water: WaterKpisState;
  river: RiverWaterLevelState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
  onDrillReservoir?: (reservoirId: string) => void;
}

export function ViewAWater({ water, river, selectedCounty, onCountyClick, onDrillReservoir }: Props) {
  if (water.loading) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">全台概覽</span>
          <span className="small">· 水資源</span>
          <Droplet size={18} color="var(--accent)" />
        </h1>
        <p className="hook">正在載入水資源資料…</p>
      </div>
    );
  }

  if (water.error) {
    return (
      <div className="hero">
        <h1>
          <span className="accent">水資源資料載入失敗</span>
        </h1>
        <p className="hook" style={{ color: "#B91C1C" }}>
          {water.error.message}
        </p>
        <p className="muted">確認 .env.local 含 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY，且 migration 098-102 已 apply。</p>
      </div>
    );
  }

  // hero 動態文案
  const reservoirCount = water.reservoirs.length;
  const reservoirRate = water.summary?.reservoir_rate_avg ?? null;
  const lpcd = water.governance?.lpcd_national_avg ?? null;
  // 跨縣市 LPCD 倍數差
  const lpcdValues = water.governance ? Object.values(water.governance.lpcd_by_county) : [];
  const lpcdMax = lpcdValues.length > 0 ? Math.max(...lpcdValues) : null;
  const lpcdMin = lpcdValues.length > 0 ? Math.min(...lpcdValues) : null;
  const lpcdRatio = lpcdMax && lpcdMin ? (lpcdMax / lpcdMin).toFixed(1) : null;

  // 容量加權全國蓄水率（取代簡單平均）
  const validReservoirs = water.reservoirs.filter((r) => r.storage_ratio_pct != null && r.effective_capacity_wan != null);
  const totalCap = validReservoirs.reduce((s, r) => s + Number(r.effective_capacity_wan ?? 0), 0);
  const nationalWeighted = totalCap > 0
    ? validReservoirs.reduce((s, r) => s + (r.storage_ratio_pct ?? 0) * Number(r.effective_capacity_wan ?? 0), 0) / totalCap
    : reservoirRate;

  return (
    <div>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· 水資源</span>
              <Droplet size={18} color="var(--accent)" />
            </h1>
            <p className="hook">
              <span className="em">島嶼的水帳，分六章看完。</span>{" "}
              全國水庫 <b>{reservoirCount}</b> 座 · 蓄水率 <b>{nationalWeighted != null ? nationalWeighted.toFixed(1) : "—"}%</b>
              {water.summary?.alert_reservoir_count != null && water.summary.alert_reservoir_count > 0 && (
                <>，<b className="em">{water.summary.alert_reservoir_count} 座</b>低於 30% 警戒</>
              )}
              。
              {lpcd != null && (
                <>
                  {" "}全國平均 LPCD <b>{Math.round(lpcd)} L</b>
                  {lpcdRatio && <>，縣市差距 <b className="em">{lpcdRatio} 倍</b></>}
                  。
                </>
              )}
              <span className="muted" style={{ marginLeft: 4 }}>
                · 資料：水利署 / 環境部 / 內政部 · 接通 {water.facts.length > 0 ? "真實" : "—"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <S1Status scale={water.scale} />
      <S2Storage
        reservoirs={water.reservoirs}
        summary={water.summary}
        groundwaterSummary={water.groundwaterSummary}
        onCountyClick={onCountyClick}
        onDrillReservoir={onDrillReservoir}
      />
      <S3Drought current={water.droughtCurrent} history={water.droughtHistory} />
      <S4Treatment
        treatmentPlantsLarge={water.treatmentPlantsLarge}
        pipelineHistory={water.pipelineHistory}
        customerHistory={water.customerHistory}
        sewagePlantsCount={water.sewagePlantsCount}
        monthlySupply={water.monthlySupply}
        sewageNationalAvg={water.governance?.sewage_national_avg ?? null}
        sewageNationalHistory={water.sewageNationalHistory}
      />
      <S5Usage
        governance={water.governance}
        waterLoss={water.waterLoss}
        selectedCounty={selectedCounty}
        onCountyClick={onCountyClick}
      />
      <S6Disaster
        flood={water.flood}
        rainStations={water.rainStations}
        river={river}
        detention={water.detention}
        subsidenceTop={water.subsidenceTop}
      />

      <div className="source-badge">
        <span className="field">資料來源 <b>水利署 / 環境部 / 內政部 / 中央氣象署 / 台水公司</b></span>
        <span className="field">更新 <b>{water.summary?.updated_at ? fmt.datetime(water.summary.updated_at) : "—"}</b></span>
        <span className="spacer" />
        <a href="#">資料說明</a>
      </div>
    </div>
  );
}
