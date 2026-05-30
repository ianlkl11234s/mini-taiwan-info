/**
 * 區塊 2 · 火災救災
 *
 * 真實資料：
 *   - 全國消防分隊 716 個（fire.stations，22 縣市齊）
 *   - 消防栓 per-county（Batch3 F-2 去重後）：台北 21,848 / 高雄 39,392 完整、
 *     新北 8,572 部分、屏東 3 零星；一律 per-county 顯示，不 SUM 全台
 *   - 縣市分隊密度（stations / pop）為前端推算
 *
 * 等 ETL：
 *   - 其他 18 縣市消防栓資料未開放
 */

import { useMemo } from "react";
import { Lightbulb, MapPin, Droplet } from "lucide-react";
import { KPICard } from "@/components/kpi/KPICard";
import { fmt } from "@/lib/format";
import { COUNTIES, byIdMoi } from "@/lib/counties";
import type { FireDataState } from "@/hooks/useFireData";
import { FireCatHeader } from "../FireCatHeader";

interface S2Props {
  data: FireDataState;
}

export function S2Response({ data }: S2Props) {
  // 各縣市分隊數（從 fire.stations groupBy county_id）
  const stationsByCounty = useMemo(() => {
    const acc = new Map<string, number>();
    for (const s of data.stations) {
      acc.set(s.county_id, (acc.get(s.county_id) ?? 0) + 1);
    }
    return acc;
  }, [data.stations]);

  // 消防栓表（Batch3 F-2）：fire.hydrants 已去台北重複；一律 per-county，絕不 SUM 全台。
  // 涵蓋：台北 21,848 完整 / 高雄 39,392 完整 / 新北 8,572 部分 / 屏東 3 零星（視為無資料）。
  const hydrantRows = useMemo(
    () =>
      data.hydrantCounts
        .map((h) => {
          const c = byIdMoi[h.county_id];
          const area = c?.area_km2 ?? 0;
          return {
            id_moi: h.county_id,
            county: c?.name_zh ?? h.county_id,
            total: h.hydrant_count,
            densityPerKm2: area > 0 ? h.hydrant_count / area : 0,
            coverage: h.coverage,
          };
        })
        .sort((a, b) => b.total - a.total),
    [data.hydrantCounts]
  );

  const totalStations = data.stations.length;
  // 已接通縣市數（排除屏東零星樣本）— 標題不顯全台 SUM，per-county 數在下表
  const coveredCounties = data.hydrantCounts.filter((h) => h.coverage !== "sparse").length;

  return (
    <div className="cat-block">
      <FireCatHeader
        num={2}
        title={
          <>
            <span className="accent">火災救災</span> ─ 我們有什麼能用
          </>
        }
        tagline={`全國 ${fmt.num(totalStations)} 個消防分隊（22 縣市齊）+ 消防栓 ${coveredCounties} 縣市已接通（台北 / 高雄完整 · 新北部分）`}
        badge="接通真實資料"
        badgeTone="historical"
      />

      <div className="kpi-grid cols-2">
        <KPICard
          icon={<MapPin size={13} />}
          label="消防分隊"
          value={fmt.num(totalStations)}
          unit="個"
          trend={{
            delta: `${stationsByCounty.size} 縣市齊全`,
            direction: "flat",
            baseline: "fire.stations",
            sentiment: "positive",
          }}
        />
        <KPICard
          icon={<Droplet size={13} />}
          label={
            <>
              消防栓 <span className="muted" style={{ fontSize: 9 }}>per-county</span>
            </>
          }
          value={fmt.num(coveredCounties)}
          unit="縣市"
          trend={{
            delta: "台北 / 高雄完整 · 新北部分",
            direction: "flat",
            baseline: "fire.hydrants",
            sentiment: "neutral",
          }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">HYDRANTS</span>
              消防栓涵蓋（per-county）
            </div>
            <div className="section-subtitle">
              台北 / 高雄完整、新北部分；屏東零星樣本視為無資料；其他 18 縣市無開放資料
            </div>
          </div>
          <span className="fire-warn-pill">⚠ 僅 4 縣市有資料</span>
        </div>

        <div className="fire-table-wrap">
          <table className="fire-table fire-table-strong">
            <thead>
              <tr>
                <th>縣市</th>
                <th style={{ textAlign: "right" }}>消防栓總數</th>
                <th style={{ textAlign: "right" }}>密度 個/km²</th>
                <th style={{ textAlign: "right" }}>分隊數</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {hydrantRows.map((r) => {
                const stationCount = stationsByCounty.get(r.id_moi) ?? 0;
                return (
                  <tr key={r.id_moi}>
                    <td>
                      <b>{r.county}</b>
                    </td>
                    <td className="tnum">{r.total > 0 ? fmt.num(r.total) : "—"}</td>
                    <td className="tnum">{r.total > 0 ? r.densityPerKm2.toFixed(1) : "—"}</td>
                    <td className="tnum">{stationCount}</td>
                    <td>
                      {r.coverage === "full" ? (
                        <span style={{ color: "var(--positive)", fontSize: 11 }}>✓ 完整</span>
                      ) : r.coverage === "partial" ? (
                        <span style={{ color: "var(--warning)", fontSize: 11 }}>△ 部分涵蓋</span>
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>零星·視為無資料</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="fire-table-spacer-row">
                <td colSpan={5} className="muted" style={{ fontSize: 11.5, padding: "10px 12px" }}>
                  ⚠ 其他 18 縣市消防栓資料未開放，地圖切到該縣市時消防栓 layer 自動標示「無資料」
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
          全國 <b>{fmt.num(totalStations)} 個</b>消防分隊已全 22 縣市覆蓋（左側地圖始終顯示）。
          消防栓 <b className="em">台北 / 高雄完整</b>（各 {fmt.num(hydrantRows.find((r) => r.id_moi === "A")?.total ?? 0)} / {fmt.num(hydrantRows.find((r) => r.id_moi === "E")?.total ?? 0)} 個）、
          新北部分涵蓋、屏東僅零星樣本；其他 18 縣市資料未開放。各縣市數值一律 per-county，不加總當全台。
        </div>
      </div>
    </div>
  );
}

// 避免 unused warning
void COUNTIES;
