/**
 * Section 1 · 現況 — 6 個 stat tile（全國水體規模盤點）
 *
 * 資料源：water_facts_official + COUNT(water_reservoirs) + COUNT(rain stations)
 *   - 40 主要水庫 (✅ 真實 COUNT)
 *   - 26 主要河川 / 2041 km / 116 水系 (✅ water_facts_official metadata)
 *   - 2449 水質測站 / 1306 雨量站 (✅ COUNT 或 facts)
 */

import { Waves, TrendingUp, Layers, Locate, CloudRain, Droplet } from "lucide-react";
import { fmt } from "@/lib/format";
import { WaterCatHeader } from "../WaterCatHeader";
import type { OverviewScale } from "@/lib/queries/water-overview";

interface Props {
  scale: OverviewScale | null;
}

interface Tile {
  value: number;
  unit?: string;
  label: string;
  ds: string;
  Icon: typeof Waves;
}

export function S1Status({ scale }: Props) {
  // fallback: 全 null 時用設計 bundle 預設值，避免空白頁
  const s = scale ?? {
    reservoirs_total: 40,
    central_rivers: 26,
    central_rivers_km: 2041,
    river_systems: 116,
    water_quality_stations: 2449,
    rain_gauges: 1306,
  };

  const tiles: Tile[] = [
    { value: s.reservoirs_total, unit: "", label: "主要水庫", ds: "水利署", Icon: Droplet },
    { value: s.central_rivers, unit: "", label: "主要河川", ds: "水利署", Icon: Waves },
    { value: s.central_rivers_km, unit: "km", label: "河川總長", ds: "水利署", Icon: TrendingUp },
    { value: s.river_systems, unit: "", label: "水系", ds: "水利署", Icon: Layers },
    { value: s.water_quality_stations, unit: "", label: "水質測站", ds: "環境部", Icon: Locate },
    { value: s.rain_gauges, unit: "", label: "雨量站", ds: "中央氣象署", Icon: CloudRain },
  ];

  return (
    <div className="cat-block">
      <WaterCatHeader
        num={1}
        title={<><span className="accent">現況</span> ─ 台灣的水體有多少</>}
        tagline="全國水體規模盤點：水庫、河川、水系與監測點"
        badge="靜態"
        badgeTone="static"
      />
      <div className="stat-grid-6">
        {tiles.map((t, i) => (
          <div key={i} className="stat-tile">
            <div className="stat-tile-ico"><t.Icon size={13} /></div>
            <div className="stat-tile-num">
              {fmt.num(t.value)}
              {t.unit && <span className="unit">{t.unit}</span>}
            </div>
            <div className="stat-tile-label">{t.label}</div>
            <div className="stat-tile-ds">{t.ds}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
