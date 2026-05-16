/**
 * Section 6 · 災防 — 會不會傷人
 *
 *  - 淹水高潛勢面積（200/350/500mm 切換）→ 取 useWaterKpis.flood（350mm 已接通，其餘 placeholder）
 *  - 河川警戒站（lv1/2/3 split）→ 從 useRiverWaterLevel state（已 classify）
 *  - 雨量站警報（≥ 50 mm/hr）→ 從 rainStations.precipitation_1hr 算
 *  - 滯洪池 → detention summary
 *  - 地層下陷 footer → subsidence top 5
 */

import { useState } from "react";
import { Waves, AlertTriangle, CloudRain, Locate } from "lucide-react";
import { fmt } from "@/lib/format";
import { WaterCatHeader } from "../WaterCatHeader";
import type { FloodSummary, RainGaugeRow } from "@/lib/queries/water";
import type { RiverWaterLevelState } from "@/hooks/useRiverWaterLevel";
import type { DetentionSummary, SubsidenceCountyRow } from "@/lib/queries/water-overview";

interface Props {
  flood: FloodSummary | null;
  rainStations: RainGaugeRow[];
  river: RiverWaterLevelState;
  detention: DetentionSummary | null;
  subsidenceTop: SubsidenceCountyRow[];
}

const SCENARIOS = [200, 350, 500] as const;
type Scenario = typeof SCENARIOS[number];

export function S6Disaster({ flood, rainStations, river, detention, subsidenceTop }: Props) {
  const [scenario, setScenario] = useState<Scenario>(350);

  // 河川警戒分布（useRiverWaterLevel 已 classify，直接 count）
  const split = { lv1: 0, lv2: 0, lv3: 0 };
  for (const s of river.stations) {
    if (s.alert_level === 1) split.lv1 += 1;
    else if (s.alert_level === 2) split.lv2 += 1;
    else if (s.alert_level === 3) split.lv3 += 1;
  }
  const rrSum = Math.max(1, split.lv1 + split.lv2 + split.lv3);
  const totalAlertStations = split.lv1 + split.lv2 + split.lv3;

  // 雨量站警報（≥ 50 mm/hr 1hr 累積）
  const RAIN_THRESHOLD = 50;
  const rainAlertCount = rainStations.filter((s) => (s.precipitation_1hr ?? 0) >= RAIN_THRESHOLD).length;

  // 淹水面積佔比
  const floodPct = flood?.national_avg_pct ?? null;

  return (
    <div className="cat-block">
      <WaterCatHeader
        num={6}
        title={<><span className="accent">災防</span> ─ 會不會傷人</>}
        tagline="淹水潛勢、河川／雨量警戒站與滯洪、地層下陷監測"
        badge="LIVE + 靜態"
        badgeTone="live"
      />

      <div className="disaster-grid">
        <div className="disaster-tile tone-warn">
          <div className="lbl">
            <span className="ico"><Waves size={11} /></span>
            淹水高潛勢面積
          </div>
          <div className="num">
            {scenario === 350 && floodPct != null ? floodPct.toFixed(1) : "—"}
            <span className="unit">%</span>
          </div>
          <div className="sub">情境降雨 {scenario} mm / 24hr</div>
          <div className="scen">
            {SCENARIOS.map((s) => (
              <button
                key={s}
                className={scenario === s ? "active" : ""}
                onClick={() => setScenario(s)}
              >
                {s}mm
              </button>
            ))}
          </div>
          {scenario !== 350 && (
            <div className="sub" style={{ marginTop: 4, color: "#B45309" }}>
              ⚠ 僅 350mm 已接通，其餘情境待 RPC 擴充
            </div>
          )}
        </div>

        <div className="disaster-tile tone-crit">
          <div className="lbl">
            <span className="ico"><AlertTriangle size={11} /></span>
            河川警戒站
          </div>
          <div className="num">{totalAlertStations}<span className="unit">站</span></div>
          <div className="split">
            <div className="seg lv1" style={{ width: `${(split.lv1 / rrSum) * 100}%` }} />
            <div className="seg lv2" style={{ width: `${(split.lv2 / rrSum) * 100}%` }} />
            <div className="seg lv3" style={{ width: `${(split.lv3 / rrSum) * 100}%` }} />
          </div>
          <div className="pills">
            <span style={{ color: "#B91C1C" }}>1 級 {split.lv1}</span>
            <span style={{ color: "#C2410C" }}>2 級 {split.lv2}</span>
            <span style={{ color: "#A16207" }}>3 級 {split.lv3}</span>
          </div>
        </div>

        <div className="disaster-tile tone-warn">
          <div className="lbl">
            <span className="ico"><CloudRain size={11} /></span>
            雨量站警報
          </div>
          <div className="num">{rainAlertCount}<span className="unit">站</span></div>
          <div className="sub">門檻 ≥ {RAIN_THRESHOLD} mm/hr · 1hr 累積</div>
          <div className="pills">
            <span>全國 {rainStations.length} 站</span>
          </div>
        </div>

        <div className="disaster-tile">
          <div className="lbl">
            <span className="ico"><Locate size={11} /></span>
            滯洪池
          </div>
          <div className="num">
            {detention ? detention.total_basins : 0}
            <span className="unit">座</span>
          </div>
          <div className="sub">
            {detention
              ? `${detention.admin_counties.length} 縣市 + ${detention.parks.length} 科學園區`
              : "—"}
          </div>
          <div className="pills">
            {detention && detention.admin_counties.length < 10 && (
              <span style={{ color: "#B45309" }}>⚠ 涵蓋不全</span>
            )}
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11.5, marginTop: 10, paddingLeft: 4 }}>
        {subsidenceTop.length > 0 ? (
          <>
            地層下陷監測：{subsidenceTop.reduce((s, r) => s + r.stations, 0)} 站 ·
            {" "}{subsidenceTop.slice(0, 3).map((r) => r.county).join("、")}
            {" "}近 2 年平均下沉
            {" "}{subsidenceTop.slice(0, 3).map((r) => (r.avg_mm ?? 0).toFixed(0) + " mm").join(" / ")}
          </>
        ) : (
          <>地層下陷監測資料載入中…</>
        )}
        {detention && detention.total_volume_m3 > 0 && (
          <>{" "}· 滯洪總容量 {fmt.num(detention.total_volume_m3 / 1e6, 1)} 百萬 m³</>
        )}
      </div>
    </div>
  );
}
