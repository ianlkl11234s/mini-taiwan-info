/* View C — 資料集深入 (e.g. 阿公店水庫) */

function ViewC_Reservoir({ reservoirId, onBack }) {
  const r = window.KHH_RESERVOIRS.find((rr) => rr.id === reservoirId) || window.KHH_RESERVOIRS[0];

  // Mock historical
  const hist = (() => {
    const rnd = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    const rgen = rnd(r.id.charCodeAt(0) * 31);
    const out = [];
    let v = 65;
    for (let i = 0; i < 365; i++) {
      v += (rgen() - 0.5) * 1.6;
      v = Math.max(20, Math.min(95, v));
      out.push({ x: i, y: +v.toFixed(1) });
    }
    return out;
  })();

  return (
    <div>
      <div className="detail-hero">
        <div className="row gap-8" style={{ marginBottom: 8 }}>
          <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={onBack}>
            <Icons.chev size={12} dir="left" /> 返回水庫列表
          </button>
        </div>
        <h2 className="name">
          <Icons.waves size={22} color="var(--accent)" />
          <span style={{ marginLeft: 8 }}>{r.name}</span>
          {r.rate < 30 && <span className="badge" style={{ background: "var(--danger)" }}>🔴 警戒</span>}
        </h2>
        <div className="meta">
          集水區 <b>{r.basin} km²</b> · 供水 <b>{r.supply}</b> · 啟用 <b>{r.established}</b>
        </div>

        <div className="detail-stats">
          <div>
            <div className="ds-val tnum">{r.rate.toFixed(1)}<span className="unit">%</span></div>
            <div className="ds-label">目前蓄水率 <span style={{ color: "var(--accent-deep)" }}>(全國均 72.3%)</span></div>
          </div>
          <div>
            <div className="ds-val tnum">{r.level.toFixed(1)}<span className="unit">m</span></div>
            <div className="ds-label">目前水位 (滿水位 {r.fullLevel}m)</div>
          </div>
          <div>
            <div className="ds-val tnum">{r.capacity}<span className="unit">萬 m³</span></div>
            <div className="ds-label">總容量</div>
          </div>
          <div>
            <div className="ds-val tnum">{Math.round(r.capacity * r.rate / 100)}<span className="unit">萬 m³</span></div>
            <div className="ds-label">目前蓄水量</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">TREND</span>
            蓄水率 · 1 年
          </div>
          <div className="toggle-group">
            <button>30 天</button>
            <button className="active">1 年</button>
            <button>歷年</button>
          </div>
        </div>
        <TrendChart
          series={[
            { name: r.name, color: "var(--accent)", data: hist },
            { name: "30% 警戒", color: "var(--danger)", dashed: true, data: hist.map((d) => ({ x: d.x, y: 30 })) },
          ]}
          xLabels={Array.from({ length: 365 }, (_, i) => i % 30 === 0 ? `M${Math.floor(i / 30) + 1}` : "")}
          height={240}
          yMin={15}
          yMax={100}
          annotations={[
            { atIndex: 105, label: "4/12 跌破紅線", severity: "danger" },
            { atIndex: 280, label: "颱風補水", severity: "info" },
          ]}
          showDots={false}
        />
      </div>

      <div className="section">
        <div className="section-title"><span className="pre">EVENTS</span>近期事件</div>
        <div className="annot-list mt-12">
          <div className="annot danger">
            <span className="date">5/05</span>
            <span className="txt">連續 7 日無有效降雨，蓄水率下降 5.8 pp</span>
          </div>
          <div className="annot warning">
            <span className="date">4/12</span>
            <span className="txt">跌破 30% 警戒紅線，啟動限水分階段準備</span>
          </div>
          <div className="annot">
            <span className="date">3/22</span>
            <span className="txt">完成清淤作業，有效容量回升 2.4 萬 m³</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title"><span className="pre">META</span>基本資料</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "10px 24px", fontSize: 13, marginTop: 12 }}>
          <div className="muted">啟用年</div><div>{r.established}</div>
          <div className="muted">總容量</div><div>{r.capacity} 萬 m³</div>
          <div className="muted">滿水位</div><div>{r.fullLevel} m</div>
          <div className="muted">集水區</div><div>{r.basin} km²</div>
          <div className="muted">主要供水</div><div>{r.supply}</div>
          <div className="muted">資料頻率</div><div>每 4 小時更新</div>
        </div>
      </div>

      <DataSourceBadge
        sources={["水利署 reservoir_levels"]}
        updatedAt="2026-05-13 10:30"
        csvLabel="原始 CSV"
      />
    </div>
  );
}

window.ViewC_Reservoir = ViewC_Reservoir;
