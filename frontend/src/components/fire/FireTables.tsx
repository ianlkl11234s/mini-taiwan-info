/**
 * Fire tables — 縣市排名 / 起火原因（5+22） / 起火處所
 *
 * 設計來源：v03 view-a-fire.jsx (FireCountyTable / FireCauseTable / FireLocationTable)
 */

import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { COUNTIES, byIdMoi } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { FIRE_LOCATIONS_MOCK, FIRE_SEVERITY_COLORS } from "@/lib/mock-fire";
import type { FireCauseAggregate, FireCountyAggregate } from "@/lib/queries/fire";

// ────────────────────────────────────────────────────────
// Tab 1-A 縣市排名表
// ────────────────────────────────────────────────────────

interface FireCountyTableProps {
  countyAggregates: FireCountyAggregate[];      // 真實資料：incidents/deaths/injuries
  /** 真實財損資料（fire.casualty_property_by_county_year，目前 2020 only） */
  casualtyRows?: import("@/lib/queries/fire").CasualtyPropertyRow[];
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

type CountySortKey = "incidents" | "density" | "deaths" | "injuries" | "damageMillion";

export function FireCountyTable({
  countyAggregates,
  casualtyRows,
  selectedCounty,
  onCountyClick,
}: FireCountyTableProps) {
  const [sortKey, setSortKey] = useState<CountySortKey>("incidents");

  // 找 casualtyRows latest year & 建 id_moi → loss_million map
  const casualtyMap = useMemo(() => {
    if (!casualtyRows || casualtyRows.length === 0) return new Map<string, { year: number; loss_million: number }>();
    const latestYear = Math.max(...casualtyRows.map((r) => r.year));
    const m = new Map<string, { year: number; loss_million: number }>();
    for (const r of casualtyRows) {
      if (r.year !== latestYear) continue;
      // loss_total_thousand 千元 → 百萬：÷ 1000
      m.set(r.county_id, {
        year: r.year,
        loss_million: (r.loss_total_thousand ?? 0) / 1000,
      });
    }
    return m;
  }, [casualtyRows]);

  const damageYear = casualtyRows && casualtyRows.length > 0
    ? Math.max(...casualtyRows.map((r) => r.year))
    : null;

  // 把 id_moi → CountyCode3 + 加 density + damage（真實 or 0）
  const rows = countyAggregates.map((a) => {
    const c = byIdMoi[a.county_id];
    const code3 = c?.code3 as CountyCode3 | undefined;
    const density =
      c && c.pop_2024_wan > 0 ? a.incidents / c.pop_2024_wan : 0; // 件/萬人
    const damageMillion = casualtyMap.get(a.county_id)?.loss_million ?? 0;
    return {
      code3: code3 ?? "??",
      name: c?.name_zh ?? a.county_id,
      incidents: a.incidents,
      density,
      deaths: a.deaths,
      injuries: a.injuries,
      damageMillion,
    };
  });
  rows.sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));

  const HCell = ({ k, label }: { k: CountySortKey; label: string }) => (
    <th
      onClick={() => setSortKey(k)}
      className={sortKey === k ? "is-sorted" : ""}
      style={{ textAlign: "right", cursor: "pointer" }}
    >
      {label}
      {sortKey === k && (
        <span className="muted" style={{ fontSize: 9, marginLeft: 3 }}>
          ▼
        </span>
      )}
    </th>
  );

  return (
    <div className="fire-table-wrap">
      <table className="fire-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th>縣市</th>
            <HCell k="incidents" label="件數" />
            <HCell k="density" label="密度/萬人" />
            <HCell k="deaths" label="死亡" />
            <HCell k="injuries" label="受傷" />
            <HCell
              k="damageMillion"
              label={damageYear ? `財損(百萬) · ${damageYear}` : "財損(百萬)"}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.code3}
              className={selectedCounty === r.code3 ? "is-selected" : ""}
              onClick={() => onCountyClick?.(r.code3 as CountyCode3)}
            >
              <td className="muted">{i + 1}</td>
              <td>
                <b>{r.name}</b>
              </td>
              <td className="tnum">{fmt.num(r.incidents)}</td>
              <td className="tnum">{r.density.toFixed(1)}</td>
              <td className="tnum">{r.deaths}</td>
              <td className="tnum">{r.injuries}</td>
              <td
                className="tnum"
                title={damageYear ? `fire.casualty_property_by_county_year ${damageYear}` : "等資料"}
              >
                {r.damageMillion > 0 ? fmt.num(Math.round(r.damageMillion)) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Tab 1-B 起火原因表（5 大類 → 22 細項展開）
// ────────────────────────────────────────────────────────

interface FireCauseTableProps {
  causeAggregates: FireCauseAggregate[];
}

export function FireCauseTable({ causeAggregates }: FireCauseTableProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    intentional: true,
    chemical: true,
  });

  return (
    <div className="fire-cause-tbl">
      <div className="fct-head">
        <div className="fct-col-cat">5 大類 / 細項</div>
        <div className="fct-col-num">件數</div>
        <div className="fct-col-pct">佔比</div>
        <div className="fct-col-num">死亡</div>
        <div className="fct-col-num">受傷</div>
        <div className="fct-col-fr">致死率</div>
      </div>

      {causeAggregates.map((cat) => {
        const sevColor = FIRE_SEVERITY_COLORS[cat.severity];
        const open = openIds[cat.cause_5_id];
        return (
          <div key={cat.cause_5_id}>
            <div
              className={`fct-row fct-cat sev-${cat.severity}`}
              onClick={() =>
                setOpenIds({ ...openIds, [cat.cause_5_id]: !open })
              }
            >
              <div className="fct-col-cat">
                <span className="fct-caret">{open ? "▾" : "▸"}</span>
                <span className="fct-sev-dot" style={{ background: sevColor }} />
                <b>{cat.cause_5_name}</b>
                <span
                  className="fct-sev-tag"
                  style={{ color: sevColor, borderColor: sevColor }}
                >
                  {cat.severity === "high"
                    ? "高"
                    : cat.severity === "med"
                    ? "中"
                    : cat.severity === "low"
                    ? "低"
                    : "—"}
                </span>
              </div>
              <div className="fct-col-num tnum">{fmt.num(cat.incidents)}</div>
              <div className="fct-col-pct">
                <div className="fct-bar">
                  <div
                    style={{
                      width: `${Math.min(100, cat.pct * 2.5)}%`,
                      background: sevColor,
                    }}
                  />
                </div>
                <span className="tnum">{cat.pct.toFixed(1)}%</span>
              </div>
              <div className="fct-col-num tnum">{cat.deaths}</div>
              <div className="fct-col-num tnum">{cat.injuries}</div>
              <div className="fct-col-fr tnum">
                <b style={{ color: sevColor }}>{cat.fatality_rate.toFixed(1)}%</b>
              </div>
            </div>

            {open &&
              cat.children.map((ch) => (
                <div
                  key={ch.cause_22_id}
                  className={`fct-row fct-child sev-${cat.severity}`}
                >
                  <div className="fct-col-cat">
                    <span
                      className="fct-child-rail"
                      style={{ background: sevColor }}
                    />
                    {ch.cause_22_name}
                  </div>
                  <div className="fct-col-num tnum">{fmt.num(ch.incidents)}</div>
                  <div className="fct-col-pct">
                    <div className="fct-bar">
                      <div
                        style={{
                          width: `${
                            (ch.incidents / Math.max(1, cat.incidents)) * 90
                          }%`,
                          background: sevColor,
                          opacity: 0.55,
                        }}
                      />
                    </div>
                  </div>
                  <div className="fct-col-num">—</div>
                  <div className="fct-col-num">—</div>
                  <div className="fct-col-fr tnum">
                    <b style={{ color: sevColor }}>{ch.fatality_rate.toFixed(1)}%</b>
                  </div>
                </div>
              ))}
          </div>
        );
      })}

      <div className="fct-legend">
        <span>
          <i style={{ background: FIRE_SEVERITY_COLORS.high }} />高 致死率
        </span>
        <span>
          <i style={{ background: FIRE_SEVERITY_COLORS.med }} />中
        </span>
        <span>
          <i style={{ background: FIRE_SEVERITY_COLORS.low }} />低
        </span>
        <span>
          <i style={{ background: FIRE_SEVERITY_COLORS.unknown }} />不明
        </span>
        <span className="muted" style={{ marginLeft: "auto" }}>
          用件數最大是「用火不慎」，致死率最高卻是「自殺」— 色碼分辨「危險 vs 常見」
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Tab 1-C 起火處所表（mock — 待 MOI ETL）
// ────────────────────────────────────────────────────────

interface FireLocationTableProps {
  /** 真實 location type aggregation（最新年）— 若 null 用 mock fallback */
  locationTypeAgg?: import("@/lib/queries/fire").LocationTypeAggregate | null;
}

export function FireLocationTable({ locationTypeAgg }: FireLocationTableProps = {}) {
  // 真實接通：用 locationTypeAgg；否則 fall back 到 mock
  const useReal = !!locationTypeAgg && locationTypeAgg.by_type.length > 0;
  const rows = useReal
    ? locationTypeAgg!.by_type.map((b) => ({
        label: b.label,
        incidents: b.count,
        pct: b.pct,
        fatalityRate: null as number | null, // location_type 表無致死率欄位
      }))
    : FIRE_LOCATIONS_MOCK.map((L) => ({
        label: L.label,
        incidents: L.incidents,
        pct: L.pct,
        fatalityRate: L.fatalityRate,
      }));

  const max = Math.max(...rows.map((L) => L.incidents), 1);
  return (
    <div className="fire-table-wrap">
      <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
        {useReal ? (
          <>
            ✓ 接通 fire.incidents_by_location_type（{locationTypeAgg!.year} 年 ·
            樣本 {fmt.num(locationTypeAgg!.total)} 件）
          </>
        ) : (
          <>⏳ 暫顯 mock — 等內政部統計處 ETL 完整</>
        )}
      </div>
      <table className="fire-table">
        <thead>
          <tr>
            <th>場所</th>
            <th style={{ textAlign: "right" }}>件數</th>
            <th style={{ width: 240 }}>佔比</th>
            <th style={{ textAlign: "right" }}>致死率</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((L) => (
            <tr key={L.label}>
              <td>
                <b>{L.label}</b>
              </td>
              <td className="tnum">{fmt.num(L.incidents)}</td>
              <td>
                <div
                  className="fct-bar"
                  style={{
                    display: "inline-block",
                    width: "calc(100% - 56px)",
                    verticalAlign: "middle",
                  }}
                >
                  <div
                    style={{
                      width: `${(L.incidents / max) * 100}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
                <span className="tnum" style={{ marginLeft: 8, fontSize: 11 }}>
                  {L.pct.toFixed(1)}%
                </span>
              </td>
              <td className="tnum">
                {L.fatalityRate == null ? "—" : `${L.fatalityRate.toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 縣市佔比 22 柱排序（區塊 1-3 維度切換 "county"）
// ────────────────────────────────────────────────────────

interface FireCountyBarsProps {
  countyAggregates: FireCountyAggregate[];
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

export function FireCountyBars({
  countyAggregates,
  selectedCounty,
  onCountyClick,
}: FireCountyBarsProps) {
  const rows = COUNTIES.map((c) => {
    const a = countyAggregates.find((r) => r.county_id === c.id_moi);
    return { code3: c.code3, name: c.name_zh, value: a?.incidents ?? 0 };
  }).sort((a, b) => b.value - a.value);

  const max = rows[0]?.value || 1;
  return (
    <div className="fire-county-bars">
      {rows.map((r, i) => (
        <div
          key={r.code3}
          className={`fcb-row ${selectedCounty === r.code3 ? "is-selected" : ""}`}
          onClick={() => onCountyClick?.(r.code3 as CountyCode3)}
        >
          <span className="fcb-rank">{i + 1}</span>
          <span className="fcb-name">{r.name}</span>
          <div className="fcb-bar">
            <div style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="fcb-val">{fmt.num(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
