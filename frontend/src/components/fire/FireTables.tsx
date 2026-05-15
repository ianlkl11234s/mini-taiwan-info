/**
 * Fire tables — 縣市排名 / 起火原因（5+22） / 起火處所
 *
 * 設計來源：v03 view-a-fire.jsx (FireCountyTable / FireCauseTable / FireLocationTable)
 */

import { useState } from "react";
import { fmt } from "@/lib/format";
import { COUNTIES, byIdMoi } from "@/lib/counties";
import type { CountyCode3 } from "@/lib/types";
import { FIRE_LOCATIONS_MOCK, FIRE_MOCK_BY_COUNTY, FIRE_SEVERITY_COLORS } from "@/lib/mock-fire";
import type { FireCauseAggregate, FireCountyAggregate } from "@/lib/queries/fire";

// ────────────────────────────────────────────────────────
// Tab 1-A 縣市排名表
// ────────────────────────────────────────────────────────

interface FireCountyTableProps {
  countyAggregates: FireCountyAggregate[];      // 真實資料：incidents/deaths/injuries
  selectedCounty?: CountyCode3 | null;
  onCountyClick?: (code: CountyCode3) => void;
}

type CountySortKey = "incidents" | "density" | "deaths" | "injuries" | "damageMillion";

export function FireCountyTable({
  countyAggregates,
  selectedCounty,
  onCountyClick,
}: FireCountyTableProps) {
  const [sortKey, setSortKey] = useState<CountySortKey>("incidents");

  // 把 id_moi → CountyCode3 + 加 density + damage（damage 是 mock）
  const rows = countyAggregates.map((a) => {
    const c = byIdMoi[a.county_id];
    const code3 = c?.code3 as CountyCode3 | undefined;
    const density =
      c && c.pop_2024_wan > 0 ? a.incidents / c.pop_2024_wan : 0; // 件/萬人
    const damageMillion = code3 ? FIRE_MOCK_BY_COUNTY[code3]?.damageMillion ?? 0 : 0;
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
            <HCell k="damageMillion" label="財損(百萬)" />
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
              <td className="tnum" title="待 MOI 死傷財損 ETL（Sprint 1 TODO-3）">
                {r.damageMillion} <span className="muted" style={{ fontSize: 9 }}>·待ETL</span>
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

export function FireLocationTable() {
  const max = Math.max(...FIRE_LOCATIONS_MOCK.map((L) => L.incidents));
  return (
    <div className="fire-table-wrap">
      <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
        ⏳ 待內政部統計處「行政區火災起火處所」ETL（Sprint 1 TODO-3） — 暫顯 mock
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
          {FIRE_LOCATIONS_MOCK.map((L) => (
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
              <td className="tnum">{L.fatalityRate.toFixed(1)}%</td>
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
