/**
 * FireKpiExplode — KPI 爆炸視圖（B047）
 *
 * 點 fire 「年度火災件數」KPI 卡後就地展開（grid-column: 1 / -1）。
 * 上方 2 排 radio：時間 scale（年/月/日/時段）× 維度（全國/縣市/原因/早中晚）
 * 圖型自動切換：
 *   - day → SVG line（單線，全國總和）
 *   - dim=none → 單色 bar
 *   - dim≠none → stacked bar
 * 缺乏的組合 cell 顯示「資料不足以爆炸展開」（03-exploded-view-pattern §6）。
 *
 * 一級爆炸 only — 二級 drill-down 暫不做（user 拍板 B047 收斂）。
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { fmt } from "@/lib/format";
import { COUNTIES } from "@/lib/counties";
import type { FireDataState } from "@/hooks/useFireData";
import type { Cause5Id } from "@/lib/queries/fire";
import { FireBarRow } from "./FireBarRow";
import { FireStackedBar, type StackedBarBucket, type StackedSegment } from "./FireStackedBar";

type Scale = "year" | "month" | "day" | "hour";
type Dim = "none" | "county" | "cause" | "daypart";

interface FireKpiExplodeProps {
  data: FireDataState;
  /** 點 ESC 或 ← 觸發；外層負責關閉 */
  onClose: () => void;
}

const SCALES: Array<{ id: Scale; label: string }> = [
  { id: "year", label: "年" },
  { id: "month", label: "月" },
  { id: "day", label: "日" },
  { id: "hour", label: "時段" },
];

const DIMS: Array<{ id: Dim; label: string }> = [
  { id: "none", label: "全國總和" },
  { id: "county", label: "縣市（Top 6 + 其他）" },
  { id: "cause", label: "5 大類原因" },
  { id: "daypart", label: "早中晚半夜" },
];

const CAUSE_5_ORDER: Cause5Id[] = ["electrical", "intentional", "chemical", "careless", "other"];
const CAUSE_5_COLORS: Record<Cause5Id, string> = {
  electrical: "#DC2626", // red-600
  intentional: "#B91C1C", // red-700
  chemical: "#EA580C", // orange-600
  careless: "#F59E0B", // amber-500
  other: "#6B7280", // gray-500
};

const DAYPART_SEGS: StackedSegment[] = [
  { key: "midnight", label: "0-6 半夜", color: "#1E3A8A" },
  { key: "morning", label: "6-12 早", color: "#F59E0B" },
  { key: "afternoon", label: "12-18 中", color: "#DC2626" },
  { key: "evening", label: "18-24 晚", color: "#7C3AED" },
];

const COUNTY_TOP_COLORS = [
  "#DC2626", // 1
  "#EA580C", // 2
  "#F59E0B", // 3
  "#2563EB", // 4
  "#0EA5E9", // 5
  "#7C3AED", // 6
  "#9CA3AF", // others
];

/** 是否該 scale × dim 組合有資料 */
function comboSupport(scale: Scale, dim: Dim): { ok: boolean; reason?: string } {
  if (dim === "none") return { ok: true };
  if (scale === "day") return { ok: false, reason: "日尺度暫只支援全國總和（365 點折線）— 改用 年/月/時段。" };
  if (scale === "year" && dim === "daypart") return { ok: false, reason: "年×早中晚 需要 hour×year 聚合資料，目前 MV 僅有 hour×month。" };
  if ((scale === "month" || scale === "hour") && dim === "cause") return { ok: false, reason: "月/時段 × 5 大類原因 缺對應 MV（causeYear 僅含 year + cause）。" };
  return { ok: true };
}

export function FireKpiExplode({ data, onClose }: FireKpiExplodeProps) {
  const [scale, setScale] = useState<Scale>("year");
  const [dim, setDim] = useState<Dim>("none");

  // ESC 收起
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const support = comboSupport(scale, dim);

  // ─── 單線 / 單色 bar series（dim=none）─────────────────────
  const singleSeries = useMemo(() => {
    if (scale === "year") {
      return data.yearlyTotals.map((y) => ({
        x: y.year_minguo,
        label: `民${y.year_minguo}`,
        value: y.incidents,
      }));
    }
    if (scale === "month") {
      return data.monthlyTotals.map((m) => ({
        x: m.month,
        label: `${m.month}月`,
        value: m.incidents,
      }));
    }
    if (scale === "day") {
      return data.dayOfYearSeries.map((d) => ({
        x: d.day_index,
        label: `${d.month}/${d.day}`,
        value: d.incidents,
      }));
    }
    return data.hourlyTotals.map((h) => ({
      x: h.hour,
      label: `${h.hour}`,
      value: h.incidents,
    }));
  }, [scale, data]);

  // ─── stacked series（dim ≠ none）──────────────────────────
  const stacked = useMemo<{ buckets: StackedBarBucket[]; segments: StackedSegment[] } | null>(() => {
    if (!support.ok || dim === "none") return null;

    // 取得 X 軸 buckets 骨架（day × dim 已被 comboSupport 提前 block，這裡不需處理）
    const xBuckets =
      scale === "year"
        ? data.yearlyTotals.map((y) => ({ x: y.year_minguo, label: `民${y.year_minguo}` }))
        : scale === "month"
          ? Array.from({ length: 12 }, (_, i) => ({ x: i + 1, label: `${i + 1}月` }))
          : Array.from({ length: 24 }, (_, i) => ({ x: i, label: `${i}` }));

    if (dim === "cause") {
      // 只支援 year × cause（用 causeYear MV）
      // causeYear MV 每 row 為 cause_22 granularity，sum by cause_5_id 取得 5 大類聚合
      // 任何不在 CAUSE_5_ORDER 內的 cause_5_id（DB 異常 / 未來新類）併入 "other"，避免靜默掉資料。
      const knownCause5 = new Set<string>(CAUSE_5_ORDER);
      const taxByCause5: Record<Cause5Id, string> = {} as Record<Cause5Id, string>;
      const acc = new Map<number, Record<string, number>>();
      for (const r of data.causeYear) {
        const key: Cause5Id = knownCause5.has(r.cause_5_id) ? r.cause_5_id : "other";
        const yearAcc = acc.get(r.data_year_minguo) ?? {};
        yearAcc[key] = (yearAcc[key] ?? 0) + r.incident_count;
        acc.set(r.data_year_minguo, yearAcc);
        if (knownCause5.has(r.cause_5_id)) {
          taxByCause5[r.cause_5_id] = r.cause_5_name ?? r.cause_5_id;
        }
      }
      const segments: StackedSegment[] = CAUSE_5_ORDER.map((id) => ({
        key: id,
        label: taxByCause5[id] ?? id,
        color: CAUSE_5_COLORS[id],
      }));
      const buckets: StackedBarBucket[] = xBuckets.map((b) => ({
        x: b.x,
        label: b.label,
        values: acc.get(b.x) ?? {},
      }));
      return { buckets, segments };
    }

    if (dim === "daypart") {
      // 月/時段 × daypart：用 hourMonth aggregate
      const bucketize = (h: number) =>
        h < 6 ? "midnight" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";

      const acc = new Map<number, Record<string, number>>();
      for (const r of data.hourMonth) {
        const bk = bucketize(r.hour);
        const xKey = scale === "month" ? r.month : r.hour;
        const map = acc.get(xKey) ?? {};
        map[bk] = (map[bk] ?? 0) + r.incident_count;
        acc.set(xKey, map);
      }
      const buckets: StackedBarBucket[] = xBuckets.map((b) => ({
        x: b.x,
        label: b.label,
        values: acc.get(b.x) ?? {},
      }));
      return { buckets, segments: DAYPART_SEGS };
    }

    if (dim === "county") {
      // 找 Top 6 縣市（依當前 scale 的全期總和）
      // year: 用 countyYear；month / hour: 用 hourMonth
      const countyTotals = new Map<string, number>();
      const accByX = new Map<number, Record<string, number>>(); // xKey -> county_id -> sum
      if (scale === "year") {
        for (const r of data.countyYear) {
          countyTotals.set(r.county_id, (countyTotals.get(r.county_id) ?? 0) + r.incident_count);
          const map = accByX.get(r.data_year_minguo) ?? {};
          map[r.county_id] = (map[r.county_id] ?? 0) + r.incident_count;
          accByX.set(r.data_year_minguo, map);
        }
      } else {
        for (const r of data.hourMonth) {
          const xKey = scale === "month" ? r.month : r.hour;
          countyTotals.set(r.county_id, (countyTotals.get(r.county_id) ?? 0) + r.incident_count);
          const map = accByX.get(xKey) ?? {};
          map[r.county_id] = (map[r.county_id] ?? 0) + r.incident_count;
          accByX.set(xKey, map);
        }
      }
      const ranked = [...countyTotals.entries()].sort((a, b) => b[1] - a[1]);
      const top6 = ranked.slice(0, 6).map(([id]) => id);
      const top6Set = new Set(top6);
      const otherCount = Math.max(0, ranked.length - top6.length);

      // 6 segments + others
      const nameOf = (id: string) => COUNTIES.find((c) => c.id_moi === id)?.name_zh ?? id;
      const segments: StackedSegment[] = [
        ...top6.map((id, i) => ({ key: id, label: nameOf(id), color: COUNTY_TOP_COLORS[i] })),
        ...(otherCount > 0
          ? [{ key: "__others", label: `其他 ${otherCount} 縣市`, color: COUNTY_TOP_COLORS[6] }]
          : []),
      ];
      const buckets: StackedBarBucket[] = xBuckets.map((b) => {
        const raw = accByX.get(b.x) ?? {};
        const values: Record<string, number> = {};
        let others = 0;
        for (const [cid, v] of Object.entries(raw)) {
          if (top6Set.has(cid)) values[cid] = v;
          else others += v;
        }
        if (others > 0) values["__others"] = others;
        return { x: b.x, label: b.label, values };
      });
      return { buckets, segments };
    }

    return null;
  }, [scale, dim, data, support.ok]);

  const total = useMemo(() => {
    if (dim === "none" || !stacked) {
      return singleSeries.reduce((s, p) => s + p.value, 0);
    }
    return stacked.buckets.reduce(
      (s, b) => s + Object.values(b.values).reduce((a, v) => a + v, 0),
      0
    );
  }, [dim, stacked, singleSeries]);

  return (
    // 包一層 stopPropagation：父層 .kpi-card onClick 是 onExpand toggle，
    // 內部所有 toggle / 收起按鈕的點擊都會 bubble 上去誤觸發。
    <div className="fire-explode" onClick={(e) => e.stopPropagation()}>
      <div className="fire-explode-head">
        <button
          className="fire-explode-back"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="收起爆炸視圖"
        >
          <ChevronLeft size={14} /> 收起
        </button>
        <div className="fire-explode-title">
          年度火災件數 · 爆炸視圖
          <span className="sub">
            {SCALES.find((s) => s.id === scale)?.label} × {DIMS.find((d) => d.id === dim)?.label}
            {" · 共 "}
            <b>{fmt.num(total)}</b> 件
          </span>
        </div>
      </div>

      <div className="fire-explode-toggles">
        <div className="fire-explode-row">
          <span className="fire-explode-row-label">時間</span>
          <div className="toggle-group">
            {SCALES.map(({ id, label }) => (
              <button
                key={id}
                className={scale === id ? "active" : ""}
                onClick={() => setScale(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="fire-explode-row">
          <span className="fire-explode-row-label">維度</span>
          <div className="toggle-group">
            {DIMS.map(({ id, label }) => (
              <button
                key={id}
                className={dim === id ? "active" : ""}
                onClick={() => setDim(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fire-explode-chart">
        {!support.ok ? (
          <div className="fire-explode-empty">
            <div className="emoji">⏳</div>
            <div className="msg">資料不足以爆炸展開</div>
            <div className="reason">{support.reason}</div>
          </div>
        ) : dim === "none" ? (
          <FireBarRow
            data={singleSeries}
            chartType={scale === "day" ? "line" : "bar"}
            height={240}
          />
        ) : stacked ? (
          <FireStackedBar buckets={stacked.buckets} segments={stacked.segments} height={240} />
        ) : (
          <div className="muted">無資料</div>
        )}
      </div>

      <div className="fire-explode-footer muted">
        資料來源：消防署 13764（民111-113 ·{" "}
        {fmt.num(data.countyYear.reduce((s, r) => s + r.incident_count, 0))} 件） · 二級爆炸（drill-down）為 Phase 2。
      </div>
    </div>
  );
}
