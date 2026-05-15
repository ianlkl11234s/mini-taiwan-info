/**
 * 區塊 4 · 其他救災救護山林火山
 *
 * 全部 mock — 等 Sprint 4 ETL（救護 / 急救醫院 / 林火 / 災變）
 * 火山潛勢 = Backlog（2026-05-15 拍板，本 Phase 不做）
 */

import { useMemo } from "react";
import { Heart, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";
import { COUNTIES } from "@/lib/counties";
import { FireCatHeader } from "../FireCatHeader";
import { FIRE_DISASTER_TIMELINE, FIRE_MOCK_BY_COUNTY, FIRE_NATIONAL_MOCK } from "@/lib/mock-fire";

interface S4Props {
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

export function S4Others({ selectedCounty, onCountyClick }: S4Props) {
  const emsRows = useMemo(() => {
    return COUNTIES.map((c) => {
      const mock = FIRE_MOCK_BY_COUNTY[c.code3];
      return {
        code3: c.code3,
        name: c.name_zh,
        emsTrips: mock?.emsTrips ?? 0,
        ohca: mock?.ohca ?? 0,
        hospitals: mock?.hospitals ?? 0,
        riskPoints: mock?.riskPoints ?? 0,
      };
    }).sort((a, b) => b.emsTrips - a.emsTrips);
  }, []);

  return (
    <div className="cat-block">
      <FireCatHeader
        num={4}
        title={
          <>
            <span className="accent">其他救災救護</span> ─ 山林、急救、災變
          </>
        }
        tagline="救護出勤、急救醫院、山林火災風險、重大災變紀錄 — 全部 mock，等 Sprint 4 ETL"
        badge="待 Sprint 4 ETL"
        badgeTone="placeholder"
      />

      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Heart size={13} />}
          label={<>年救護出勤 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={fmt.bigNum(FIRE_NATIONAL_MOCK.emsTrips)}
          unit="次"
          trend={{
            delta: `+${FIRE_NATIONAL_MOCK.emsTripsDelta}%`,
            direction: "up",
            baseline: "較去年",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Heart size={13} />}
          label={<>急救責任醫院 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={FIRE_NATIONAL_MOCK.emergencyHospitals}
          unit="家"
          trend={{
            delta: "雲林資料完整",
            direction: "flat",
            baseline: "其他 placeholder",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label={<>山林高風險點 <span className="muted" style={{ fontSize: 9 }}>待ETL</span></>}
          value={fmt.num(FIRE_NATIONAL_MOCK.forestRiskPoints)}
          unit="處"
          trend={{
            delta: "snapshot",
            direction: "flat",
            baseline: "屏東/南投/花蓮居多",
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="fire-s4-grid">
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <span className="pre">EMS</span>
              22 縣市救護統計
            </div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              OHCA 件數僅高雄/雲林完整 · 整表 mock 待 ETL
            </div>
          </div>
          <div className="fire-table-wrap" style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="fire-table compact">
              <thead>
                <tr>
                  <th>縣市</th>
                  <th style={{ textAlign: "right" }}>救護出勤</th>
                  <th style={{ textAlign: "right" }}>OHCA</th>
                  <th style={{ textAlign: "right" }}>醫院</th>
                  <th style={{ textAlign: "right" }}>風險點</th>
                </tr>
              </thead>
              <tbody>
                {emsRows.map((r) => (
                  <tr
                    key={r.code3}
                    className={selectedCounty === r.code3 ? "is-selected" : ""}
                    onClick={() => onCountyClick?.(r.code3 as CountyCode3)}
                  >
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td className="tnum">{fmt.num(r.emsTrips)}</td>
                    <td className="tnum">{r.ohca}</td>
                    <td className="tnum">{r.hospitals}</td>
                    <td className="tnum">{r.riskPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TIMELINE</span>
              重大災變紀錄
            </div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              近 6 年中央災變紀錄 · 等 Sprint 4 ETL
            </div>
          </div>
          <div className="fire-timeline">
            {FIRE_DISASTER_TIMELINE.map((d, i) => (
              <div
                key={i}
                className={`ftl-row tag-${
                  d.tag === "颱風" ? "typhoon" : d.tag === "地震" ? "quake" : "accident"
                }`}
              >
                <div className="ftl-yr">{d.year}</div>
                <div className="ftl-dot" />
                <div className="ftl-body">
                  <div className="ftl-head">
                    <b>{d.name}</b>
                    <span className="ftl-tag">{d.tag}</span>
                  </div>
                  <div className="ftl-date">{d.date}</div>
                  <div className="ftl-stat">
                    {d.deaths > 0 && <span className="ftl-stat-death">死 {d.deaths}</span>}
                    {d.injuries > 0 && <span className="ftl-stat-inj">傷 {d.injuries}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
