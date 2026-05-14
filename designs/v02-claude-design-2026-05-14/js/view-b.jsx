/* View B — 縣市儀錶板 */

const { useState: vbState, useMemo: vbMemo } = React;

function ViewB_City({ county, theme, onAddCompare, onDrillReservoir, onBack }) {
  const [tab, setTab] = vbState("overview");
  const c = window.byCode[county];
  const wd = window.WATER_BY_COUNTY[county];
  const hd = window.HOME_BY_COUNTY[county];

  // National avg comparison
  const allLpcd = window.COUNTIES.map((cc) => window.WATER_BY_COUNTY[cc.code].lpcd);
  const lpcdAvg = allLpcd.reduce((a, b) => a + b, 0) / allLpcd.length;
  const lpcdRank = [...allLpcd].sort((a, b) => b - a).indexOf(wd.lpcd) + 1;

  if (theme === "home") return <ViewB_Home county={county} onBack={onBack} />;

  // Water — Kaohsiung-style dashboard
  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <button className="back-link" onClick={onBack} aria-label="返回全台概覽">
          <Icons.chev size={12} dir="left" /> 返回全台概覽
        </button>
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">{c.name}</span>
              <span className="small">· 水資源</span>
              <Icons.drop size={18} color="var(--accent)" />
            </h1>
            <div className="hook">
              <span className="em">{fmt.num(c.pop, 1)} 萬人</span>
              <span className="muted"> · </span>
              <span>{fmt.num(c.area)} km²</span>
              <span className="muted"> · </span>
              <span>3 座水庫</span>
              <span className="muted"> · </span>
              <span>12 座汙水廠</span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Icons.download size={14} /> 下載 CSV</button>
            <button className="btn ghost"><Icons.share size={14} /> 分享</button>
            <button className="btn primary" onClick={onAddCompare}><Icons.plus size={14} /> 加入比較</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          ["overview", "概覽"],
          ["reservoir", "水庫"],
          ["quality", "河川水質"],
          ["flood", "防洪"],
          ["infra", "基礎設施"],
          ["usage", "用水 & 衛生"],
          ["ranking", "排名"],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <KhhOverview county={c} wd={wd} lpcdRank={lpcdRank} lpcdAvg={lpcdAvg} onDrillReservoir={onDrillReservoir} />}
      {tab === "reservoir" && <KhhReservoirs onDrillReservoir={onDrillReservoir} />}
      {tab === "quality" && <PlaceholderTab title="河川水質" desc="水質測站 BOD/DO + 列管事業點" county={c.name} />}
      {tab === "flood" && <PlaceholderTab title="防洪" desc="淹水潛勢 + 滯洪池 + 即時雨量" county={c.name} />}
      {tab === "infra" && <PlaceholderTab title="基礎設施" desc="給水普及率 / 漏水率（部分縣市資料未開放）" county={c.name} warning />}
      {tab === "usage" && <KhhUsage wd={wd} lpcdRank={lpcdRank} />}
      {tab === "ranking" && <KhhRanking county={c} wd={wd} />}
    </div>
  );
}

function KhhOverview({ county, wd, lpcdRank, lpcdAvg, onDrillReservoir }) {
  return (
    <>
      {/* KPI 卡 */}
      <div className="kpi-grid cols-4" style={{ marginBottom: "var(--section-gap)" }}>
        <KPICard
          icon={<Icons.waves size={13} />}
          label="水庫"
          value="3"
          unit="座"
          trend={{ delta: "有效蓄水 6.18 億噸", direction: "flat", baseline: "", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Icons.recycle size={13} />}
          label="汙水廠"
          value="12"
          unit="座"
          trend={{ delta: "日處理 86.7 萬噸", direction: "flat", baseline: "", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Icons.drop size={13} />}
          label="LPCD"
          value={wd.lpcd}
          unit="L/人/日"
          trend={{ delta: "-2.1%", direction: "down", baseline: "較去年", sentiment: "positive" }}
        />
        <KPICard
          icon={<Icons.recycle size={13} />}
          label="接管率"
          value={fmt.pct(wd.sewage)}
          trend={{ delta: "+1.8 pp", direction: "up", baseline: "較去年", sentiment: "positive" }}
        />
      </div>

      {/* 近 30 天蓄水率 + 排名 (兩欄) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "var(--kpi-row-gap)", marginBottom: "var(--section-gap)" }}>
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <span className="pre">TIME</span>
              近 30 天總蓄水率
            </div>
            <div className="toggle-group">
              <button className="active">30 天</button>
              <button>90 天</button>
              <button>1 年</button>
            </div>
          </div>
          <TrendChart
            series={[{ name: "高雄市", color: "var(--accent)", data: window.KHH_30D }]}
            xLabels={window.KHH_30D.map((d, i) => i % 7 === 0 ? `5/${(13 - 30 + i + 30) % 31 || 30}` : "")}
            height={170}
            yMin={55}
            yMax={85}
            annotations={[{ atIndex: 22, label: "連續無雨", severity: "warn" }]}
            showLegend={false}
          />
          <div className="muted mt-8" style={{ fontSize: 12 }}>📍 5/13 蓄水率 72.4% · 連續 8 日下降 0.6 pp</div>
        </div>

        <div className="section" style={{ marginBottom: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: 16 }}>
          <div className="section-title" style={{ alignSelf: "flex-start", marginBottom: 12 }}>
            <span className="pre">RANK</span>
            全台排名
          </div>
          <Donut value={lpcdRank} total={22} size={110} tier="中段" />
          <div className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            人均用水量排名<br />
            <a href="#" style={{ color: "var(--accent-deep)", textDecoration: "none", fontWeight: 500 }}>
              查看完整排名 →
            </a>
          </div>
        </div>
      </div>

      {/* 高雄 3 座水庫 sparkline */}
      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">RESERVOIRS</span>
            高雄市 3 座主要水庫
          </div>
          <button className="btn ghost" style={{ fontSize: 12 }}>檢視全部 ↗</button>
        </div>
        <div className="kpi-grid">
          {window.KHH_RESERVOIRS.map((r) => (
            <div
              key={r.id}
              className="kpi-card"
              style={{ cursor: "pointer" }}
              onClick={() => onDrillReservoir(r.id)}
            >
              <div className="kpi-head">
                <div className="kpi-label">
                  <span className="ico"><Icons.waves size={13} /></span>
                  {r.name}
                </div>
                {r.rate < 30 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--danger)", padding: "2px 6px", background: "var(--danger-soft)", borderRadius: 4 }}>🔴 警戒</span>
                )}
              </div>
              <div className="kpi-value">{r.rate.toFixed(1)}<span className="unit">%</span></div>
              <div className="kpi-trend">
                <span className="muted">蓄水量 {r.capacity * r.rate / 100 | 0} 萬 m³</span>
              </div>
              <div className="kpi-sparkline">
                <Sparkline
                  data={r.id === "agp" ? window.AGP_30D.map((d) => d.rate) : window.KHH_30D.map((d) => d.rate * (r.rate / 72))}
                  color={r.rate < 30 ? "var(--danger)" : "var(--accent)"}
                  width={80} height={24}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <DataSourceBadge sources={["經濟部水利署", "環境部", "內政部營建署"]} updatedAt="2024-05-13 08:00" />
    </>
  );
}

function KhhReservoirs({ onDrillReservoir }) {
  return (
    <>
      <div className="insight">
        <div className="ico"><Icons.bulb size={18} /></div>
        <div className="body">
          高雄市 3 座水庫總蓄水率 <b>50.5%</b>，全國平均 <b>72.3%</b>。
          <b className="em"> 阿公店水庫已連續 8 日下降</b>，跌破 30% 紅線，建議啟動第一階段限水。
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">3 座水庫 · 近 30 天蓄水率</div>
          <div className="toggle-group">
            <button className="active">30 天</button>
            <button>1 年</button>
          </div>
        </div>
        <TrendChart
          series={[
            { name: "鳳山", color: "var(--accent-ramp-5)", data: window.KHH_30D.map((d) => ({ x: d.x, y: d.rate * 0.8 })) },
            { name: "澄清湖", color: "var(--accent-2)", data: window.KHH_30D.map((d) => ({ x: d.x, y: d.rate * 0.9 })) },
            { name: "阿公店", color: "var(--danger)", data: window.AGP_30D },
          ]}
          xLabels={window.AGP_30D.map((d) => d.date)}
          height={220}
          yMin={20}
          yMax={75}
          annotations={[{ atIndex: 25, label: "阿公店跌破 30%", severity: "danger" }]}
        />
      </div>

      <div className="kpi-grid">
        {window.KHH_RESERVOIRS.map((r) => (
          <div
            key={r.id}
            className="kpi-card"
            style={{ cursor: "pointer" }}
            onClick={() => onDrillReservoir(r.id)}
          >
            <div className="kpi-head">
              <div className="kpi-label">
                <span className="ico"><Icons.waves size={13} /></span>
                {r.name}
              </div>
              <button className="kpi-expand" style={{ opacity: 1 }}><Icons.expand size={12} /></button>
            </div>
            <div className="kpi-value">{r.rate.toFixed(1)}<span className="unit">%</span></div>
            <div className="muted mt-8" style={{ fontSize: 11.5 }}>
              啟用 {r.established} · 滿水位 {r.fullLevel}m · {r.supply}
            </div>
          </div>
        ))}
      </div>

      <DataSourceBadge sources={["水利署即時水庫"]} updatedAt="2024-05-13 10:30" csvLabel="水庫 CSV" />
    </>
  );
}

function KhhUsage({ wd, lpcdRank }) {
  return (
    <>
      <div className="kpi-grid cols-2">
        <KPICard
          icon={<Icons.drop size={13} />}
          label="人均日用水量 (LPCD)"
          value={wd.lpcd}
          unit="L"
          trend={{ delta: "-6L", direction: "down", baseline: "較去年", sentiment: "positive" }}
        />
        <KPICard
          icon={<Icons.recycle size={13} />}
          label="污水接管率"
          value={fmt.pct(wd.sewage)}
          trend={{ delta: "+1.8 pp", direction: "up", baseline: "較去年", sentiment: "positive" }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">
            <span className="pre">TREND</span>
            高雄 LPCD 歷年 (2008–2024)
          </div>
        </div>
        <TrendChart
          series={[
            { name: "高雄", color: "var(--accent)", data: window.LPCD_HISTORY.map((d) => ({ x: d.year, y: d.value - 5 })) },
            { name: "全國平均", color: "var(--text-tertiary)", dashed: true, data: window.LPCD_HISTORY.map((d) => ({ x: d.year, y: d.value })) },
          ]}
          xLabels={window.LPCD_HISTORY.map((d) => d.year.toString())}
          height={200}
          yMin={250}
          yMax={325}
        />
      </div>

      <DataSourceBadge sources={["datagov:8316", "datagov:26815"]} updatedAt="2024-12-31" />
    </>
  );
}

function KhhRanking({ county, wd }) {
  // build ranking across 22 counties for several metrics, highlight current
  const metrics = [
    { key: "lpcd",       label: "人均日用水量",   unit: "L",   better: "lower" },
    { key: "sewage",     label: "污水接管率",     unit: "%",   better: "higher" },
    { key: "reservoir",  label: "即時蓄水率",     unit: "%",   better: "higher" },
    { key: "floodPct",   label: "淹水高潛勢面積", unit: "%",   better: "lower" },
  ];
  return (
    <div>
      <div className="muted mb-12" style={{ marginBottom: 14 }}>
        高雄市在 22 縣市的位次（依各指標排序）
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {metrics.map((m) => {
          const all = window.COUNTIES.map((c) => ({ code: c.code, name: c.name, value: window.WATER_BY_COUNTY[c.code][m.key] }));
          all.sort((a, b) => m.better === "higher" ? b.value - a.value : a.value - b.value);
          const rank = all.findIndex((r) => r.code === county.code) + 1;
          const myVal = wd[m.key];

          return (
            <div key={m.key} className="section" style={{ marginBottom: 0 }}>
              <div className="between mb-12">
                <div>
                  <div className="section-title" style={{ fontSize: 14 }}>{m.label}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    高雄第 <b style={{ color: "var(--accent-deep)" }}>{rank}</b> / 22
                    · 值 <b style={{ color: "var(--text)" }}>{fmt.num(myVal, 1)} {m.unit}</b>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: "3px 8px", borderRadius: 5,
                  background: m.better === "higher" ? "var(--positive-soft)" : "var(--accent-soft)",
                  color: m.better === "higher" ? "#047857" : "var(--accent-deep)",
                }}>
                  {m.better === "higher" ? "越高越好" : "越低越好"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 2, height: 26, position: "relative" }}>
                {all.map((r, i) => (
                  <div
                    key={r.code}
                    title={`${r.name}: ${fmt.num(r.value, 1)} ${m.unit}`}
                    style={{
                      flex: 1,
                      background: r.code === county.code
                        ? "var(--accent)"
                        : `color-mix(in srgb, var(--accent) ${Math.max(8, 80 - i * 4)}%, transparent)`,
                      borderRadius: 3,
                      position: "relative",
                    }}
                  >
                    {r.code === county.code && (
                      <span style={{
                        position: "absolute",
                        top: -18, left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--accent-deep)",
                        whiteSpace: "nowrap",
                      }}>第 {rank} 名</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlaceholderTab({ title, desc, county, warning }) {
  return (
    <div className="section" style={{ textAlign: "center", padding: 36 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>
        {warning ? "⚠️" : "🚧"}
      </div>
      <div className="section-title" style={{ justifyContent: "center", marginBottom: 8 }}>{title}</div>
      <div className="muted" style={{ fontSize: 12.5, maxWidth: 360, margin: "0 auto" }}>
        {desc}<br />
        {warning && <>該指標部分縣市資料未開放，已標示 ⚠️</>}
      </div>
    </div>
  );
}

function ViewB_Home({ county, onBack }) {
  const c = window.byCode[county];
  const hd = window.HOME_BY_COUNTY[county];
  return (
    <div>
      <div className="hero">
        <button className="back-link" onClick={onBack} aria-label="返回全台概覽">
          <Icons.chev size={12} dir="left" /> 返回全台概覽
        </button>
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">{c.name}</span>
              <span className="small">· 基礎</span>
              <Icons.home size={18} color="var(--accent)" />
            </h1>
            <div className="hook">
              {fmt.num(c.pop, 1)} 萬人 · {hd.townCount} 鄉鎮市區 ·
              老化指數 <b>{hd.agingIndex}</b>（全國 161.3）
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-grid cols-3">
        <KPICard
          icon={<Icons.users size={13} />}
          label="人口"
          value={fmt.num(Math.round(c.pop * 10000))}
          unit="人"
          trend={{ delta: fmt.pct(hd.growth), direction: hd.growth > 0 ? "up" : "down", baseline: "年增率", sentiment: hd.growth > 0 ? "positive" : "negative" }}
        />
        <KPICard
          icon={<Icons.users size={13} />}
          label="老化指數"
          value={hd.agingIndex}
          trend={{ delta: hd.agingIndex > 161.3 ? "高於全國" : "低於全國", direction: hd.agingIndex > 161.3 ? "up" : "down", baseline: "全國 161.3", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Icons.users size={13} />}
          label="出生率"
          value={hd.birthRate.toFixed(2)}
          unit="‰"
          trend={{ delta: `死亡 ${hd.deathRate.toFixed(2)}‰`, direction: "flat", baseline: "自然增加 " + hd.natural.toFixed(2) + "‰", sentiment: "neutral" }}
        />
      </div>

      <div className="section">
        <div className="section-title"><span className="pre">PYRAMID</span>{c.name} 人口金字塔</div>
        <div className="muted mt-8" style={{ fontSize: 12 }}>（簡化示意，實作將依年齡 × 性別繪製水平鏡像條柱）</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, marginTop: 16 }}>
          {[
            ["85+",  7,  11],
            ["75-84", 18, 22],
            ["65-74", 32, 36],
            ["55-64", 48, 50],
            ["45-54", 58, 56],
            ["35-44", 62, 60],
            ["25-34", 50, 48],
            ["15-24", 42, 40],
            ["0-14",  35, 33],
          ].map(([age, male, female], i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                <div style={{ height: 16, width: `${male * 1.2}%`, background: "var(--accent)", borderRadius: "2px 0 0 2px", opacity: 0.75 }}></div>
                <span className="muted tnum" style={{ fontSize: 11, minWidth: 28, textAlign: "right" }}>{male}k</span>
              </div>
              <div className="muted tnum" style={{ fontSize: 11, padding: "0 8px" }}>{age}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="muted tnum" style={{ fontSize: 11, minWidth: 28 }}>{female}k</span>
                <div style={{ height: 16, width: `${female * 1.2}%`, background: "#A78BFA", borderRadius: "0 2px 2px 0", opacity: 0.75 }}></div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <DataSourceBadge sources={["內政部戶政司", "主計總處"]} updatedAt="2024-12-31" />
    </div>
  );
}

window.ViewB_City = ViewB_City;
