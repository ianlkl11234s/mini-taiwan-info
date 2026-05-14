/* PointProfile — 點位概況面板（補強 View A 點位敘事）
   三種模式：bucket（蓄水率桶） / region（地理區聚合） / scatter（容量 vs 蓄水率）
*/

const { useState: ppState } = React;

const REGION_LABEL = { north: "北部", central: "中部", south: "南部", east: "東部", island: "離島" };
const REGION_ORDER = ["north", "central", "south", "east", "island"];

function PointProfile({ reservoirs, onReservoirClick }) {
  const [mode, setMode] = ppState("bucket");
  const [activeBucket, setActiveBucket] = ppState(null);

  // 桶分配
  const buckets = [
    { id: "ok",   label: "充足",   sub: "≥ 60%",    color: "#10B981", min: 60,  max: 200 },
    { id: "warn", label: "警示",   sub: "30 – 60%", color: "#F59E0B", min: 30,  max: 60  },
    { id: "crit", label: "紅線",   sub: "< 30%",    color: "#EF4444", min: 0,   max: 30  },
  ];
  const counted = buckets.map((b) => ({
    ...b,
    list: reservoirs.filter((r) => r.rate >= b.min && r.rate < b.max),
  }));
  const total = reservoirs.length;
  const max = Math.max(...counted.map((b) => b.list.length));

  // 地區聚合
  const byRegion = REGION_ORDER.map((rg) => {
    const list = reservoirs.filter((r) => r.region === rg);
    if (!list.length) return null;
    const avg = list.reduce((s, r) => s + r.rate, 0) / list.length;
    return { id: rg, label: REGION_LABEL[rg], count: list.length, avg, list };
  }).filter(Boolean);

  // Scatter 資料
  const scatterPts = reservoirs.map((r) => ({
    x: r.capacity,
    y: r.rate,
    label: r.name + "水庫",
    countyName: r.countyName,
    color: r.rate < 30 ? "#EF4444" : r.rate < 60 ? "#F59E0B" : "#10B981",
    xLabel: "容量",
    yLabel: "蓄水率",
    code: r.county,
  }));

  return (
    <div className="section point-profile">
      <div className="section-head">
        <div>
          <div className="section-title">
            <span className="pre">POINTS</span>
            點位概況 · {total} 座主要水庫
          </div>
          <div className="section-subtitle">把縣市彙整數字看不到的「個別狀態」攤開</div>
        </div>
        <div className="toggle-group">
          <button className={mode === "bucket"  ? "active" : ""} onClick={() => setMode("bucket")}>蓄水率分布</button>
          <button className={mode === "region"  ? "active" : ""} onClick={() => setMode("region")}>按地理區</button>
          <button className={mode === "scatter" ? "active" : ""} onClick={() => setMode("scatter")}>容量 × 蓄水率</button>
        </div>
      </div>

      {mode === "bucket" && (
        <div className="pp-bucket">
          <div className="pp-bucket-rows">
            {counted.map((b) => {
              const pct = (b.list.length / max) * 100;
              const isActive = activeBucket === b.id;
              return (
                <button
                  key={b.id}
                  className={`pp-bucket-row ${isActive ? "active" : ""}`}
                  onClick={() => setActiveBucket(isActive ? null : b.id)}
                  aria-expanded={isActive}
                >
                  <span className="dot" style={{ background: b.color }}></span>
                  <span className="lbl">
                    {b.label} <span className="sub">{b.sub}</span>
                  </span>
                  <span className="bar-wrap">
                    <span className="bar" style={{ width: `${pct}%`, background: b.color }}></span>
                  </span>
                  <span className="cnt"><b>{b.list.length}</b> 座</span>
                  <span className="chev"><Icons.chev size={11} dir={isActive ? "up" : "down"} /></span>
                </button>
              );
            })}
          </div>
          {activeBucket && (
            <div className="pp-list-grid">
              {counted.find((b) => b.id === activeBucket).list.map((r) => (
                <button
                  key={r.name + r.county}
                  className="pp-chip"
                  style={{ borderColor: r.rate < 30 ? "#EF4444" : r.rate < 60 ? "#F59E0B" : "#10B981" }}
                  onClick={() => onReservoirClick?.(r)}
                >
                  <span className="nm">{r.name}</span>
                  <span className="meta">{r.countyName} · {r.rate.toFixed(1)}%</span>
                </button>
              ))}
            </div>
          )}
          {!activeBucket && (
            <div className="muted pp-hint">
              ⤴ 點任一桶 → 列出哪幾座水庫
            </div>
          )}
        </div>
      )}

      {mode === "region" && (
        <div className="pp-region">
          {byRegion.map((g) => {
            const tone = g.avg < 40 ? "crit" : g.avg < 60 ? "warn" : "ok";
            return (
              <div key={g.id} className={`pp-region-row tone-${tone}`}>
                <div className="rg-lbl">{g.label}</div>
                <div className="rg-cnt">{g.count} 座</div>
                <div className="rg-bar-wrap">
                  <div className="rg-bar" style={{ width: `${(g.avg / 100) * 100}%` }}></div>
                </div>
                <div className="rg-avg">平均 <b>{g.avg.toFixed(1)}%</b></div>
              </div>
            );
          })}
          <div className="muted pp-hint">
            南部 15 座、平均蓄水率不足 50% → 與北部 88% 形成明顯南北落差
          </div>
        </div>
      )}

      {mode === "scatter" && (
        <div className="pp-scatter">
          <Scatter
            points={scatterPts}
            width={620}
            height={240}
            xLog={true}
            xMin={10}
            xMax={60000}
            yMin={0}
            yMax={100}
            xLabel="容量（萬 m³，對數軸）"
            yLabel="蓄水率 %"
            bands={[
              { y1: 0,  y2: 30,  color: "#EF4444", label: "紅線" },
              { y1: 30, y2: 60,  color: "#F59E0B", label: "警示" },
              { y1: 60, y2: 100, color: "#10B981", label: "充足" },
            ]}
            onPointClick={(p) => onReservoirClick?.(reservoirs.find((r) => r.name === p.label.replace("水庫", "")))}
          />
          <div className="pp-scatter-legend">
            <span><i style={{ background: "#10B981" }}></i> 充足 ≥ 60%</span>
            <span><i style={{ background: "#F59E0B" }}></i> 警示 30–60%</span>
            <span><i style={{ background: "#EF4444" }}></i> 紅線 &lt; 30%</span>
            <span className="spacer"></span>
            <span className="muted">⤴ 點任一點 → 進該縣市儀錶板</span>
          </div>
        </div>
      )}
    </div>
  );
}

window.PointProfile = PointProfile;
