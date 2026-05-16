/**
 * 區塊 2 · 火災救災
 *
 * 真實資料：
 *   - 全國消防分隊 716 個（fire.stations，22 縣市齊）
 *   - 全國消防栓 39,395 個（fire.hydrants，目前僅高雄 county_id='E'）
 *   - 縣市分隊密度（stations / pop）為前端推算
 *
 * 等 ETL：
 *   - 其他 3 都消防栓（B2 bug fix，user 標 TODO）
 *   - 18 縣市消防栓資料未開放
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

  // 4 都消防栓表：目前只有高雄 (E)。從 hydrantNationalCount 推 row。
  // 之後 ETL 補完，再從 hydrants groupBy county_id（同 stationsByCounty pattern）
  const hydrantRows = useMemo(() => {
    const KHH_COUNT = data.hydrantNationalCount; // 全國 = 高雄
    const khhArea = byIdMoi["E"]?.area_km2 ?? 2952;
    return [
      {
        id_moi: "E",
        county: "高雄市",
        total: KHH_COUNT,
        densityPerKm2: KHH_COUNT / khhArea,
        coverage: "real" as const,
      },
      { id_moi: "A", county: "臺北市", total: 0, densityPerKm2: 0, coverage: "pending" as const },
      { id_moi: "F", county: "新北市", total: 0, densityPerKm2: 0, coverage: "pending" as const },
      { id_moi: "H", county: "桃園市", total: 0, densityPerKm2: 0, coverage: "pending" as const },
      { id_moi: "B", county: "臺中市", total: 0, densityPerKm2: 0, coverage: "pending" as const },
      { id_moi: "D", county: "臺南市", total: 0, densityPerKm2: 0, coverage: "pending" as const },
    ];
  }, [data.hydrantNationalCount]);

  const totalStations = data.stations.length;
  const totalHydrants = data.hydrantNationalCount;

  return (
    <div className="cat-block">
      <FireCatHeader
        num={2}
        title={
          <>
            <span className="accent">火災救災</span> ─ 我們有什麼能用
          </>
        }
        tagline={`全國 ${fmt.num(totalStations)} 個消防分隊（22 縣市齊）+ ${fmt.num(totalHydrants)} 個消防栓（目前僅高雄完整）`}
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
              消防栓 <span className="muted" style={{ fontSize: 9 }}>限高雄</span>
            </>
          }
          value={fmt.num(totalHydrants)}
          unit="個"
          trend={{
            delta: "其他 3 都待補資料",
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
              4 都消防栓統計
            </div>
            <div className="section-subtitle">
              目前僅高雄完整接通；北/中/南欄位 mapping 待修；其他 18 縣市無開放資料
            </div>
          </div>
          <span className="fire-warn-pill">⚠ 限高雄 + 4 都待補</span>
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
                      {r.coverage === "real" ? (
                        <span style={{ color: "var(--positive)", fontSize: 11 }}>✓ 已接通</span>
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>待 ETL 補欄位</span>
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
          全國 <b>{fmt.num(totalStations)} 個</b>消防分隊已全 22 縣市覆蓋（左側地圖始終顯示），
          消防栓資料目前僅高雄 <b className="em">{fmt.num(totalHydrants)} 個</b>完整 —
          其他 3 都欄位 mapping 待修、18 縣市資料未開放（B2 dataset bug，待後續 ETL 補完）。
        </div>
      </div>
    </div>
  );
}

// 避免 unused warning
void COUNTIES;
