/**
 * 區塊 2 · 火災救災
 *
 * 全部都是 mock placeholder — 等 Sprint 2 ETL
 *   - 7 都分隊 ETL (TODO-5)
 *   - 15 縣市 user 蒐集名冊 + Google geocoding (TODO-6)
 *   - 4 都消防栓 ETL (TODO-8)
 */

import { Lightbulb, MapPin, Droplet } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { fmt } from "@/lib/format";
import { FireCatHeader } from "../FireCatHeader";
import { FIRE_HYDRANT_STATS, FIRE_NATIONAL_MOCK } from "@/lib/mock-fire";

export function S2Response() {
  return (
    <div className="cat-block">
      <FireCatHeader
        num={2}
        title={
          <>
            <span className="accent">火災救災</span> ─ 我們有什麼能用
          </>
        }
        tagline="消防分隊布建 + 4 都消防栓統計 — 等 Sprint 2 ETL（TODO-5/6/7/8）"
        badge="待 Sprint 2 ETL"
        badgeTone="placeholder"
      />

      <div className="kpi-grid cols-2">
        <KPICard
          icon={<MapPin size={13} />}
          label={<>消防分隊 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={fmt.num(FIRE_NATIONAL_MOCK.stationsTotal)}
          unit="個"
          trend={{
            delta: `+${FIRE_NATIONAL_MOCK.stationsDelta} 較去年`,
            direction: "up",
            baseline: "全 22 縣市",
            sentiment: "positive",
          }}
        />
        <KPICard
          icon={<Droplet size={13} />}
          label={<>消防栓 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={fmt.num(FIRE_NATIONAL_MOCK.hydrantsTotal)}
          unit="個"
          trend={{
            delta: "限 4 都資料",
            direction: "flat",
            baseline: "北/中/南/高",
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">HYDRANTS</span>
              4 都消防栓統計
            </div>
            <div className="section-subtitle">其他 18 縣市無消防栓開放資料</div>
          </div>
          <span className="fire-warn-pill">⚠ 資料限 4 都</span>
        </div>

        <div className="fire-table-wrap">
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
            ⏳ 暫顯 mock — 等 Sprint 2 TODO-8（4 都消防栓 ETL）
          </div>
          <table className="fire-table fire-table-strong">
            <thead>
              <tr>
                <th>縣市</th>
                <th style={{ textAlign: "right" }}>消防栓總數</th>
                <th style={{ textAlign: "right" }}>地上式</th>
                <th style={{ textAlign: "right" }}>地下式</th>
                <th style={{ textAlign: "right" }}>密度 個/km²</th>
              </tr>
            </thead>
            <tbody>
              {FIRE_HYDRANT_STATS.map((r) => (
                <tr key={r.code}>
                  <td>
                    <b>{r.county}</b>
                  </td>
                  <td className="tnum">{fmt.num(r.total)}</td>
                  <td className="tnum">{fmt.num(r.ground)}</td>
                  <td className="tnum">{fmt.num(r.underground)}</td>
                  <td className="tnum">{r.densityPerKm2.toFixed(1)}</td>
                </tr>
              ))}
              <tr className="fire-table-spacer-row">
                <td colSpan={5} className="muted" style={{ fontSize: 11.5, padding: "10px 12px" }}>
                  ⚠ 其他 18 縣市消防栓資料未開放，主視覺地圖切到該縣市時消防栓 layer 自動標示「無資料」
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="insight" style={{ marginBottom: 4 }}>
        <div className="ico">
          <Lightbulb size={18} />
        </div>
        <div className="body">
          全國 <b>{fmt.num(FIRE_NATIONAL_MOCK.stationsTotal)} 個</b>消防分隊（左側地圖始終顯示），
          臺北市消防栓密度最高 <b className="em">119.9 個/km²</b>，是高雄的 12 倍 —
          但這只反映 4 都的開放資料，其他縣市需 Sprint 2 ETL 完成後才能比較。
        </div>
      </div>
    </div>
  );
}
