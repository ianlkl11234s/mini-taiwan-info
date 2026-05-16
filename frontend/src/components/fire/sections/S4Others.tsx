/**
 * 區塊 4 · 其他救災救護山林火山
 *
 * 真實資料：
 *   - 年救護出勤（fire.ems_stats_by_county_year 最新年 SUM）
 *   - 山林高風險點（fire.forest_fire_risk_snapshot WHERE risk_level >= 3）
 *   - 22 縣市救護表（fire.ems_stats_by_county_year，最新年 by county_id）
 *   - 重大災變 timeline（fire.disaster_incidents 最新 6 筆 DESC）
 *
 * 仍 placeholder：
 *   - 急救責任醫院（衛福部全國名冊缺，需手爬）
 *   - 火山潛勢（Backlog 不做）
 */

import { useMemo } from "react";
import { Heart, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { fmt } from "@/lib/format";
import type { CountyCode3 } from "@/lib/types";
import { COUNTIES } from "@/lib/counties";
import type { FireDataState } from "@/hooks/useFireData";
import { FireCatHeader } from "../FireCatHeader";

interface S4Props {
  data: FireDataState;
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

// 災害名稱 → tag/colour
function classifyDisaster(name: string, type: string | null): {
  tag: string;
  cls: "typhoon" | "quake" | "accident";
} {
  const lower = (type ?? "").toLowerCase();
  if (name.includes("颱風") || lower.includes("typhoon")) return { tag: "颱風", cls: "typhoon" };
  if (name.includes("地震") || lower.includes("earthquake")) return { tag: "地震", cls: "quake" };
  if (name.includes("豪雨") || name.includes("暴雨") || name.includes("水災")) return { tag: "豪雨", cls: "typhoon" };
  return { tag: type ?? "事故", cls: "accident" };
}

export function S4Others({ data, selectedCounty, onCountyClick }: S4Props) {
  // 22 縣市救護表（fire.ems_stats_by_county_year 最新年）
  const emsRows = useMemo(() => {
    const latestYear =
      data.emsYearlyRows.length > 0
        ? Math.max(...data.emsYearlyRows.map((r) => r.year))
        : null;
    return COUNTIES.map((c) => {
      const row = data.emsYearlyRows.find(
        (r) => r.county_id === c.id_moi && r.year === latestYear
      );
      return {
        code3: c.code3,
        name: c.name_zh,
        emsTrips: row?.dispatch_count ?? 0,
        ohca: row?.ohca_count ?? 0,
        transport: row?.transport_count ?? 0,
        trauma: row?.trauma_count ?? 0,
      };
    }).sort((a, b) => b.emsTrips - a.emsTrips);
  }, [data.emsYearlyRows]);

  // 中央災變 timeline（資料 county-level granularity，dedup by disaster_name 後取最新 6）
  // 每個 disaster_name 取最新 occurred_date 一筆 + SUM 所有縣市的 deaths/injuries
  const disasterTimeline = useMemo(() => {
    const acc = new Map<string, {
      name: string; date: string; type: string | null;
      deaths: number; injuries: number;
    }>();
    for (const d of data.disasterEvents) {
      const prev = acc.get(d.disaster_name);
      if (!prev) {
        acc.set(d.disaster_name, {
          name: d.disaster_name,
          date: d.occurred_date,
          type: d.incident_type,
          deaths: d.deaths ?? 0,
          injuries: d.injuries ?? 0,
        });
      } else {
        prev.deaths += d.deaths ?? 0;
        prev.injuries += d.injuries ?? 0;
        // 保留較新的 date
        if (d.occurred_date > prev.date) prev.date = d.occurred_date;
      }
    }
    return [...acc.values()]
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, 6)
      .map((d) => {
        const { tag, cls } = classifyDisaster(d.name, d.type);
        return {
          id: d.name,
          name: d.name,
          date: d.date,
          year: d.date.slice(0, 4),
          tag,
          cls,
          deaths: d.deaths,
          injuries: d.injuries,
        };
      });
  }, [data.disasterEvents]);

  const emsYear = data.emsSummary?.year ?? null;
  const totalDispatch = data.emsSummary?.total_dispatch ?? 0;
  const totalOhca = data.emsSummary?.total_ohca ?? 0;
  const forestHigh = data.forestRisk?.high_risk_count ?? 0;
  const forestTotal = data.forestRisk?.total ?? 0;

  return (
    <div className="cat-block">
      <FireCatHeader
        num={4}
        title={
          <>
            <span className="accent">其他救災救護</span> ─ 山林、急救、災變
          </>
        }
        tagline={`救護出勤 ${fmt.bigNum(totalDispatch)} 次 · 山林高風險 ${forestHigh} 處 · 災變紀錄 ${data.disasterEvents.length} 筆`}
        badge="接通真實資料"
        badgeTone="historical"
      />

      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Heart size={13} />}
          label="年救護出勤"
          value={fmt.bigNum(totalDispatch)}
          unit="次"
          trend={{
            delta: emsYear ? `${emsYear} 年資料` : "—",
            direction: "flat",
            baseline: `OHCA ${fmt.num(totalOhca)} 件`,
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<Heart size={13} />}
          label={
            <>
              急救責任醫院 <span className="muted" style={{ fontSize: 9 }}>待ETL</span>
            </>
          }
          value="—"
          unit="家"
          trend={{
            delta: "衛福部名冊缺",
            direction: "flat",
            baseline: "需手爬",
            sentiment: "neutral",
          }}
        />
        <KPICard
          icon={<AlertTriangle size={13} />}
          label="山林高風險點"
          value={fmt.num(forestHigh)}
          unit="處"
          trend={{
            delta: `${fmt.num(forestTotal)} 中`,
            direction: "flat",
            baseline: "警告+危險+最危險",
            sentiment: "negative",
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
              {emsYear ? (
                <>
                  {emsYear} 年 · 目前公開資料僅 <b>{new Set(data.emsYearlyRows.map((r) => r.county_id)).size}</b> 縣市完整，
                  其他標 「—」等 ETL
                </>
              ) : "資料載入中"}
              {data.emsYearlyRows.length === 0 && " · 等 ETL"}
            </div>
          </div>
          <div className="fire-table-wrap" style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="fire-table compact">
              <thead>
                <tr>
                  <th>縣市</th>
                  <th style={{ textAlign: "right" }}>救護出勤</th>
                  <th style={{ textAlign: "right" }}>送醫</th>
                  <th style={{ textAlign: "right" }}>OHCA</th>
                  <th style={{ textAlign: "right" }}>創傷</th>
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
                    <td className="tnum">{r.emsTrips > 0 ? fmt.num(r.emsTrips) : "—"}</td>
                    <td className="tnum">{r.transport > 0 ? fmt.num(r.transport) : "—"}</td>
                    <td className="tnum">{r.ohca > 0 ? r.ohca : "—"}</td>
                    <td className="tnum">{r.trauma > 0 ? fmt.num(r.trauma) : "—"}</td>
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
              {data.disasterEvents.length > 0
                ? `最新 ${disasterTimeline.length} 筆 · 來源 fire.disaster_incidents`
                : "資料載入中"}
            </div>
          </div>
          <div className="fire-timeline">
            {disasterTimeline.length === 0 ? (
              <div className="muted" style={{ padding: "20px 12px", fontSize: 12 }}>
                尚無災變紀錄
              </div>
            ) : (
              disasterTimeline.map((d) => (
                <div key={d.id} className={`ftl-row tag-${d.cls}`}>
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
