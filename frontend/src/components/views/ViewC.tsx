/**
 * ViewC — 水庫詳情頁
 *
 * 對應 prototype view-c.jsx；mockup 預設展示阿公店水庫。
 * 接 get_reservoir_timeseries RPC 取 1 年蓄水率時序。
 */

import { useMemo } from "react";
import { Waves, ChevronLeft, AlertCircle } from "lucide-react";
import type { ReservoirStatusRow } from "@/lib/queries/water";
import { fmt } from "@/lib/format";
import { TrendChart, type TrendPoint, type TrendAnnotation } from "@/components/charts/TrendChart";
import { useReservoirDetail, downsampleTimeseries } from "@/hooks/useReservoirDetail";

interface ViewCProps {
  reservoirId: string;
  allReservoirs: ReservoirStatusRow[];
  nationalAvg: number | null;
  onBack: () => void;
}

export function ViewC({ reservoirId, allReservoirs, nationalAvg, onBack }: ViewCProps) {
  const detail = useReservoirDetail(reservoirId, allReservoirs);
  const r = detail.current;

  // downsample 8760 點 → 365 點
  const seriesData: TrendPoint[] = useMemo(() => {
    const sampled = downsampleTimeseries(detail.timeseries, 365);
    return sampled
      .filter((d) => d.storage_ratio_pct != null)
      .map((d) => ({
        x: d.snapshot_at,
        y: d.storage_ratio_pct as number,
      }));
  }, [detail.timeseries]);

  // 從時序找跌破 30% 的關鍵事件
  const annotations: TrendAnnotation[] = useMemo(() => {
    const out: TrendAnnotation[] = [];
    let belowSince: number | null = null;
    for (let i = 0; i < seriesData.length; i++) {
      const y = seriesData[i].y as number;
      if (y < 30 && belowSince === null) {
        belowSince = i;
        out.push({ atIndex: i, label: "跌破 30% 紅線", severity: "danger" });
        if (out.length >= 2) break;
      }
      if (y >= 30) belowSince = null;
    }
    return out;
  }, [seriesData]);

  if (!r) {
    return (
      <div className="hero">
        <button className="back-link" onClick={onBack}><ChevronLeft size={12} /> 返回</button>
        <h1>水庫資料載入中…</h1>
        <p className="muted">id: {reservoirId}</p>
      </div>
    );
  }

  const rate = r.storage_ratio_pct ?? 0;
  const isDanger = rate < 30;
  const capacity = Number(r.effective_capacity_wan ?? 0);
  const storage = Number(r.effective_storage_wan_m3 ?? 0);
  const waterLevel = Number(r.water_level_m ?? 0);

  // 圖表 x-axis labels（每 30 點放一個月份標）
  const xLabels = seriesData.map((p, i) =>
    i === 0 || i === seriesData.length - 1 || i % 30 === 0
      ? typeof p.x === "string" ? p.x.slice(5, 10) : ""
      : ""
  );

  // 30 警戒線 series
  const warningLine: TrendPoint[] = seriesData.map((p) => ({ x: p.x, y: 30 }));

  return (
    <div>
      <div className="detail-hero">
        <div className="row gap-8" style={{ marginBottom: 8 }}>
          <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={onBack}>
            <ChevronLeft size={12} /> 返回縣市儀錶板
          </button>
        </div>
        <h2 className="name">
          <Waves size={22} color="var(--accent)" />
          <span style={{ marginLeft: 8 }}>{r.name.endsWith("水庫") ? r.name : `${r.name}水庫`}</span>
          {isDanger && (
            <span className="badge" style={{ background: "var(--danger)" }}>
              🔴 警戒
            </span>
          )}
          <span style={liveBadgeStyle}>LIVE</span>
        </h2>
        <div className="meta">
          <b>{r.region ?? "—"}</b>
          <span className="muted"> · </span>
          資料時間 <b>{fmt.datetime(r.snapshot_at)}</b>
          {r.alert_level && (
            <>
              <span className="muted"> · </span>
              警示等級 <b>{r.alert_level}</b>
            </>
          )}
        </div>

        <div className="detail-stats">
          <div>
            <div className="ds-val tnum">
              {rate.toFixed(1)}
              <span className="unit">%</span>
            </div>
            <div className="ds-label">
              目前蓄水率
              {nationalAvg != null && (
                <span style={{ color: "var(--accent-deep)" }}> (全國均 {nationalAvg.toFixed(1)}%)</span>
              )}
            </div>
          </div>
          <div>
            <div className="ds-val tnum">
              {waterLevel.toFixed(1)}
              <span className="unit">m</span>
            </div>
            <div className="ds-label">目前水位</div>
          </div>
          <div>
            <div className="ds-val tnum">
              {fmt.num(capacity)}
              <span className="unit">萬 m³</span>
            </div>
            <div className="ds-label">有效容量</div>
          </div>
          <div>
            <div className="ds-val tnum">
              {fmt.num(storage, 1)}
              <span className="unit">萬 m³</span>
            </div>
            <div className="ds-label">目前蓄水量</div>
          </div>
        </div>
      </div>

      {/* 1 年蓄水率 trend */}
      {seriesData.length > 0 ? (
        <div className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TREND</span>
              蓄水率 · 1 年
              <span style={liveBadgeStyle}>LIVE</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {seriesData.length} 筆樣本（downsampled from {detail.timeseries.length}）
            </div>
          </div>
          <TrendChart
            series={[
              { name: r.name, color: "var(--accent)", data: seriesData },
              { name: "30% 警戒", color: "var(--danger)", dashed: true, data: warningLine },
            ]}
            xLabels={xLabels}
            height={240}
            yMin={0}
            yMax={100}
            annotations={annotations}
            showDots={false}
          />
        </div>
      ) : detail.loading ? (
        <div className="section" style={{ textAlign: "center", padding: 36 }}>
          <div className="muted">時序資料載入中…</div>
        </div>
      ) : (
        <div className="section" style={{ textAlign: "center", padding: 36 }}>
          <div style={{ fontSize: 24 }}>📊</div>
          <div className="muted mt-8" style={{ fontSize: 12.5 }}>
            該水庫過去 1 年沒有 realtime.reservoir_status 紀錄
          </div>
        </div>
      )}

      {/* 基本資料 */}
      <div className="section">
        <div className="section-title">
          <span className="pre">META</span>基本資料
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto 1fr",
            gap: "10px 24px",
            fontSize: 13,
            marginTop: 12,
          }}
        >
          <div className="muted">水庫名稱</div>
          <div>{r.name.endsWith("水庫") ? r.name : `${r.name}水庫`}</div>
          <div className="muted">水庫 ID</div>
          <div className="tnum">{r.reservoir_id}</div>

          <div className="muted">所在區域</div>
          <div>{r.region ?? "—"}</div>
          <div className="muted">座標</div>
          <div className="tnum">{r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}</div>

          <div className="muted">有效容量</div>
          <div>{fmt.num(capacity)} 萬 m³</div>
          <div className="muted">水位（即時）</div>
          <div>{waterLevel.toFixed(2)} m</div>

          <div className="muted">入流量</div>
          <div>{r.inflow_cms != null ? `${Number(r.inflow_cms).toFixed(2)} cms` : "—"}</div>
          <div className="muted">總出流量</div>
          <div>{r.total_outflow_cms != null ? `${Number(r.total_outflow_cms).toFixed(2)} cms` : "—"}</div>

          <div className="muted">集水區雨量</div>
          <div>{r.basin_rainfall_mm != null ? `${Number(r.basin_rainfall_mm).toFixed(1)} mm` : "—"}</div>
          <div className="muted">資料頻率</div>
          <div>每小時</div>
        </div>
      </div>

      {/* Insight */}
      {isDanger && (
        <div className="insight">
          <div className="ico">
            <AlertCircle size={18} />
          </div>
          <div className="body">
            <strong>蓄水率跌破 30% 警戒紅線</strong>
            <br />
            {r.name}水庫當前蓄水率 <b className="em">{rate.toFixed(1)}%</b>
            {nationalAvg != null && <>，遠低於全國平均 <b>{nationalAvg.toFixed(1)}%</b></>}。建議關注後續供水計畫。
          </div>
        </div>
      )}

      <div className="source-badge">
        <span className="field">資料來源 <b>水利署 realtime.reservoir_status</b></span>
        <span className="field">更新 <b>{fmt.datetime(r.snapshot_at)}</b></span>
        <span className="spacer" />
        <a href="#">原始 CSV</a>
      </div>
    </div>
  );
}

const liveBadgeStyle: React.CSSProperties = {
  marginLeft: 6,
  fontSize: 9,
  fontWeight: 700,
  color: "var(--positive)",
  background: "var(--positive-soft)",
  padding: "1px 4px",
  borderRadius: 3,
  verticalAlign: "middle",
};
