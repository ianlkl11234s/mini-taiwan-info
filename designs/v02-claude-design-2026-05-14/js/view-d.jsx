/* View D — 跨縣市比較 */

const { useState: vdState } = React;

const CMP_COLORS = ["#0EA5E9", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"];

const CMP_METRICS = [
  { id: "lpcd",       label: "LPCD 人均日用水量", unit: "L",   icon: "drop",    better: "lower",  source: "WATER_BY_COUNTY", key: "lpcd" },
  { id: "sewage",     label: "接管率",            unit: "%",   icon: "recycle", better: "higher", source: "WATER_BY_COUNTY", key: "sewage" },
  { id: "fines",      label: "水污染罰鍰",        unit: "千元", icon: "alert",   better: "higher", source: "WATER_BY_COUNTY", key: "pollutionFines" },
  { id: "flood",      label: "淹水高潛勢面積",    unit: "%",   icon: "waves",   better: "lower",  source: "WATER_BY_COUNTY", key: "floodPct" },
  { id: "reservoir",  label: "即時蓄水率",        unit: "%",   icon: "waves",   better: "higher", source: "WATER_BY_COUNTY", key: "reservoir" },
];

function ViewD_Compare({ selectedCounties, onAddCounty, onRemoveCounty, onClose }) {
  const [metricId, setMetricId] = vdState("lpcd");
  const [showPicker, setShowPicker] = vdState(false);

  const M = CMP_METRICS.find((m) => m.id === metricId);
  const rows = selectedCounties.map((code, i) => {
    const c = window.byCode[code];
    const val = window[M.source][code][M.key];
    return { code, name: c.name, value: val, color: CMP_COLORS[i] };
  });

  // National avg & rank
  const allVals = window.COUNTIES.map((c) => window[M.source][c.code][M.key]);
  const navg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
  const sorted = [...allVals].sort((a, b) => M.better === "higher" ? b - a : a - b);

  // Trend lines (use LPCD_COMPARE for lpcd, otherwise generate simple)
  let seriesData;
  if (metricId === "lpcd") {
    seriesData = rows.map((r, i) => ({
      name: r.name, color: r.color,
      data: window.LPCD_COMPARE[r.code] || window.LPCD_HISTORY.map((d) => ({ year: d.year, value: d.value })),
    }));
    seriesData.push({ name: "全國平均", color: "#94A3B8", dashed: true, data: window.LPCD_COMPARE._national });
  } else {
    // Generic: build a synthetic 10-year trend
    seriesData = rows.map((r, i) => {
      const rnd = (() => { let s = r.code.charCodeAt(0) * 99; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
      const arr = [];
      let v = r.value * 1.1;
      for (let y = 2014; y <= 2023; y++) {
        v += (rnd() - 0.5) * (r.value * 0.06);
        arr.push({ year: y, value: +v.toFixed(1) });
      }
      arr[arr.length - 1].value = r.value;
      return { name: r.name, color: r.color, data: arr };
    });
  }

  // Insight: difference between max & min
  const sorted2 = [...rows].sort((a, b) => b.value - a.value);
  const diff = sorted2[0].value - sorted2[sorted2.length - 1].value;
  const midName = sorted2.find((r) => Math.abs(r.value - navg) < 30)?.name || sorted2[1]?.name;

  return (
    <div>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">跨縣市比較</span>
              <span className="small">· {M.label}</span>
            </h1>
            <p className="hook">
              <span className="em">挑選 2–5 個縣市，疊圖比較。</span>{" "}
              點地圖縣市或下方下拉加入比較；側邊欄切換指標即時重整。
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn ghost" onClick={onClose}>
              <Icons.x size={14} /> 結束比較
            </button>
            <button className="btn"><Icons.download size={14} /> 匯出圖表</button>
          </div>
        </div>
      </div>

      {/* chips */}
      <div className="compare-chips">
        {rows.map((r, i) => (
          <span key={r.code} className="compare-chip" style={{ "--chip-color": r.color }}>
            <span className="dot"></span>
            {r.name}
            <button className="x" onClick={() => onRemoveCounty(r.code)}>
              <Icons.x size={10} />
            </button>
          </span>
        ))}
        {selectedCounties.length < 5 && (
          <span className="compare-chip add" onClick={() => setShowPicker(!showPicker)}>
            <Icons.plus size={12} /> 新增縣市
          </span>
        )}
      </div>

      {showPicker && (
        <div className="section" style={{ marginBottom: 14, padding: 10 }}>
          <div className="muted mb-12" style={{ fontSize: 11.5, marginBottom: 8 }}>選擇縣市加入</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {window.COUNTIES.filter((c) => !selectedCounties.includes(c.code)).map((c) => (
              <button
                key={c.code}
                className="btn ghost"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => { onAddCounty(c.code); setShowPicker(false); }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Big metric cards */}
      <div className="kpi-grid" style={{
        gridTemplateColumns: `repeat(${rows.length}, 1fr)`,
        marginBottom: "var(--section-gap)"
      }}>
        {rows.map((r, i) => (
          <div key={r.code} className="kpi-card" style={{ borderColor: r.color, borderTopWidth: 3, borderTopColor: r.color }}>
            <div className="kpi-head">
              <div className="kpi-label">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, display: "inline-block" }}></span>
                {r.name}
              </div>
            </div>
            <div className="kpi-value">
              {fmt.num(r.value, r.value < 100 ? 1 : 0)}
              <span className="unit">{M.unit}</span>
            </div>
            <div className="kpi-trend">
              <span className="muted">vs 全國均 {fmt.num(navg, 1)}</span>
              <span className={`delta ${r.value > navg ? "up" : "down"}`}>
                {r.value > navg ? "+" : ""}{(r.value - navg).toFixed(1)}
              </span>
            </div>
            <div className="kpi-sparkline">
              <Sparkline
                data={(seriesData[i]?.data || []).map((d) => d.value)}
                color={r.color}
                width={80} height={24}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">TABLE</span>
            指標對照表
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{M.better === "higher" ? "越高越好" : "越低越好"}</span>
        </div>
        <table className="cmp-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>縣市</th>
              <th>2023 ({M.unit})</th>
              <th>2022 ({M.unit})</th>
              <th>年變化</th>
              <th>與全國均差距</th>
            </tr>
          </thead>
          <tbody>
            {sorted2.map((r, i) => {
              const prev = r.value + (Math.random() - 0.5) * r.value * 0.08;
              const change = ((r.value - prev) / prev) * 100;
              const goodChange = (M.better === "higher" && change > 0) || (M.better === "lower" && change < 0);
              return (
                <tr key={r.code}>
                  <td className="muted tnum">{i + 1}</td>
                  <td className="name"><span className="dot" style={{ background: r.color }}></span>{r.name}</td>
                  <td className="tnum">{fmt.num(r.value, 1)}</td>
                  <td className="tnum muted">{fmt.num(prev, 1)}</td>
                  <td className={`tnum delta ${goodChange ? "pos" : "neg"}`}>
                    {change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
                  </td>
                  <td className="tnum">{r.value > navg ? "+" : ""}{fmt.num(r.value - navg, 1)}</td>
                </tr>
              );
            })}
            <tr className="summary">
              <td className="muted tnum">—</td>
              <td className="name muted">全國平均</td>
              <td className="tnum">{fmt.num(navg, 1)}</td>
              <td className="tnum muted">{fmt.num(navg * 1.01, 1)}</td>
              <td className="tnum delta pos">↓ 0.8%</td>
              <td className="tnum">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Trend lines */}
      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">TREND</span>
            {M.label}（{M.unit}）· 趨勢比較
          </div>
          <div className="toggle-group">
            <button>5 年</button>
            <button className="active">10 年</button>
            <button>全部</button>
          </div>
        </div>
        <TrendChart
          series={seriesData}
          xLabels={["2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"]}
          height={220}
          showAreaFirst={false}
        />
      </div>

      {/* Insight */}
      <div className="insight">
        <div className="ico"><Icons.bulb size={18} /></div>
        <div className="body">
          <strong>比較洞察</strong><br />
          {sorted2[0].name} 與 {sorted2[sorted2.length - 1].name} 差距 <b className="em">{fmt.num(diff, 1)} {M.unit}</b>，
          {midName && <>{midName} 最接近全國平均。</>}{" "}
          {metricId === "lpcd" && <>南北縣市 LPCD 結構性差異反映產業結構（工業 vs 商業）與供水機制不同。</>}
        </div>
      </div>
    </div>
  );
}

window.ViewD_Compare = ViewD_Compare;
window.CMP_COLORS = CMP_COLORS;
window.CMP_METRICS = CMP_METRICS;
