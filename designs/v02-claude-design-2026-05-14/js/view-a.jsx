/* View A — 全台概覽 (per theme: water / home) */

const { useState: vaState, useMemo: vaMemo } = React;

/* ========== View A · Water ========== */
function ViewA_Water({ onCountyClick, onMetricChange, metric, selectedCounty }) {
  const [expanded, setExpanded] = vaState(null);
  const N = window.WATER_NATIONAL;

  // top/bottom 5 LPCD
  const lpcdAll = window.COUNTIES.map((c) => ({
    code: c.code, name: c.name, value: window.WATER_BY_COUNTY[c.code].lpcd,
  })).sort((a, b) => b.value - a.value);
  const top5 = lpcdAll.slice(0, 5);
  const bot5 = lpcdAll.slice(-5).reverse();

  const ratio = (lpcdAll[0].value / lpcdAll[lpcdAll.length - 1].value).toFixed(1);

  // 蓄水率爆炸內容（40 座水庫）
  const reservoirExplode = (
    <div>
      <div className="exploded-head">
        <div className="title">全國主要水庫 · <span className="sub">即時蓄水率排序</span></div>
        <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
      </div>
      <DimensionExplode
        items={window.ALL_RESERVOIRS.slice(0, 16).map((r) => ({ name: r.name, value: r.rate }))}
        unit="%"
        criticalBelow={30}
      />
      <div className="muted mt-12" style={{ fontSize: 12 }}>
        🔴 4 座水庫跌破 30% 紅線（南部 3 座：阿公店、烏山頭、曾文）
      </div>
    </div>
  );

  // LPCD 時間爆炸（歷年）
  const lpcdExplode = (
    <div>
      <div className="exploded-head">
        <div className="title">全國平均 LPCD · <span className="sub">2008–2024 歷年</span></div>
        <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
      </div>
      <TimeExplode
        data={window.LPCD_HISTORY.map((d) => ({ x: d.year, y: d.value }))}
        xLabels={window.LPCD_HISTORY.map((d) => d.year.toString())}
        yMin={260}
        yMax={325}
        annotations={[
          { atIndex: 7, label: "節水法規上路", severity: "info" },
        ]}
      />
      <div className="muted mt-8" style={{ fontSize: 12 }}>
        📉 16 年降 36L · 節水教育與工業節水生效，但縣市差距仍達 1.7 倍
      </div>
    </div>
  );

  // 24hr 雨量 → 22 縣市熱圖
  const rainExplode = (
    <div>
      <div className="exploded-head">
        <div className="title">24hr 全國均雨 · <span className="sub">22 縣市分布</span></div>
        <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
      </div>
      <DimensionExplode
        items={window.COUNTIES.map((c) => ({
          name: c.name, value: window.WATER_BY_COUNTY[c.code].rain24, code: c.code
        })).sort((a, b) => b.value - a.value).slice(0, 14)}
        unit="mm"
      />
      <div className="muted mt-8" style={{ fontSize: 12 }}>☔️ 宜蘭、花蓮東部明顯降雨；嘉義以南連續 5 日無雨</div>
    </div>
  );

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· 水資源</span>
            </h1>
            <p className="hook">
              <span className="em">南北分裂的島嶼水帳。</span>{" "}
              全國平均 LPCD <b>{N.lpcd} L</b>，22 縣市差距達 <b className="em">{ratio} 倍</b> —— 最高苗栗 312L、最低嘉義市 186L。
              4 座水庫跌破 30% 紅線，集中南部。
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Icons.share size={14} /> 分享</button>
            <button className="btn"><Icons.download size={14} /> 匯出</button>
          </div>
        </div>
      </div>

      {/* KPI 卡片群 */}
      <div className="kpi-grid">
        <KPICard
          icon={<Icons.waves size={13} />}
          label="全國蓄水率"
          value={fmt.pct(N.reservoirRate)}
          trend={{ delta: fmt.pp(N.reservoirRateDelta), direction: "up", baseline: "相較昨日", sentiment: "positive" }}
          spark={window.KHH_30D.map((d) => d.rate)}
          expanded={expanded === "reservoir"}
          onExpand={() => setExpanded(expanded === "reservoir" ? null : "reservoir")}
          explodeContent={reservoirExplode}
        />
        <KPICard
          icon={<Icons.cloudRain size={13} />}
          label="24hr 均雨量"
          value={fmt.num(N.rain24, 1)}
          unit="mm"
          trend={{ delta: `${N.rain24Delta.toFixed(1)} mm`, direction: "down", baseline: "相較昨日", sentiment: "neutral" }}
          spark={window.KHH_RAIN_30D.map((d) => d.rain)}
          expanded={expanded === "rain"}
          onExpand={() => setExpanded(expanded === "rain" ? null : "rain")}
          explodeContent={rainExplode}
        />
        <KPICard
          icon={<Icons.alert size={13} />}
          label="高警戒水庫"
          value={N.alertReservoirs}
          unit="座"
          trend={{ delta: "持平", direction: "flat", baseline: "相較昨日", sentiment: "neutral" }}
          expanded={expanded === "alert"}
          onExpand={() => setExpanded(expanded === "alert" ? null : "alert")}
          explodeContent={
            <div>
              <div className="exploded-head">
                <div className="title">高警戒水庫名單 · <span className="sub">蓄水率低於 30%</span></div>
                <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { n: "阿公店水庫", c: "高雄市", r: 28.3 },
                  { n: "烏山頭水庫", c: "臺南市", r: 25.9 },
                  { n: "曾文水庫",   c: "臺南市", r: 27.4 },
                  { n: "白河水庫",   c: "臺南市", r: 19.6 },
                ].map((r, i) => (
                  <div key={i} className="annot danger">
                    <span className="date">{r.r}%</span>
                    <span className="txt"><b style={{ color: "var(--text)" }}>{r.n}</b>（{r.c}）連續 {Math.floor(Math.random() * 12) + 8} 日下降</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />
        <KPICard
          icon={<Icons.recycle size={13} />}
          label="淹水高潛勢面積"
          value={fmt.pct(N.floodArea)}
          trend={{ delta: fmt.pp(N.floodAreaDelta), direction: "up", baseline: "相較上週", sentiment: "negative" }}
          expanded={expanded === "flood"}
          onExpand={() => setExpanded(expanded === "flood" ? null : "flood")}
          explodeContent={
            <div>
              <div className="exploded-head">
                <div className="title">淹水高潛勢面積佔比 · <span className="sub">200mm/24hr 情境</span></div>
                <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
              </div>
              <DimensionExplode
                items={window.COUNTIES.map((c) => ({
                  name: c.name, value: window.WATER_BY_COUNTY[c.code].floodPct, code: c.code
                })).sort((a, b) => b.value - a.value).slice(0, 12)}
                unit="%"
              />
            </div>
          }
        />
        <KPICard
          icon={<Icons.drop size={13} />}
          label="平均 LPCD"
          value={N.lpcd}
          unit="L"
          trend={{ delta: `${N.lpcdDelta} L`, direction: "down", baseline: "相較去年", sentiment: "positive" }}
          spark={window.LPCD_HISTORY.slice(-12).map((d) => d.value)}
          expanded={expanded === "lpcd"}
          onExpand={() => setExpanded(expanded === "lpcd" ? null : "lpcd")}
          explodeContent={lpcdExplode}
        />
        <KPICard
          icon={<Icons.recycle size={13} />}
          label="污水接管率"
          value={fmt.pct(N.sewage)}
          trend={{ delta: fmt.pp(N.sewageDelta), direction: "up", baseline: "相較去年", sentiment: "positive" }}
          spark={[78, 80, 82, 83, 84, 85, 86, 87].map((v) => ({ value: v }))}
          expanded={expanded === "sewage"}
          onExpand={() => setExpanded(expanded === "sewage" ? null : "sewage")}
          explodeContent={
            <div>
              <div className="exploded-head">
                <div className="title">污水接管率 · <span className="sub">22 縣市</span></div>
                <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
              </div>
              <DimensionExplode
                items={window.COUNTIES.map((c) => ({
                  name: c.name, value: window.WATER_BY_COUNTY[c.code].sewage, code: c.code
                })).sort((a, b) => b.value - a.value).slice(0, 14)}
                unit="%"
              />
              <div className="muted mt-8" style={{ fontSize: 12 }}>📊 城鄉差距：六都平均 78%，非六都平均 23%</div>
            </div>
          }
        />
      </div>

      {/* 點位概況 — 把 KPI 看不到的「個別狀態」攤開 */}
      <PointProfile
        reservoirs={window.ALL_RESERVOIRS}
        onReservoirClick={(r) => r && onCountyClick?.(r.county)}
      />

      {/* TOP / BOTTOM 5 排名 */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANKING</span>
              人均日用水量 · TOP 5 / BOTTOM 5
            </div>
            <div className="section-subtitle">點任一縣市進入該縣市儀錶板</div>
          </div>
          <div className="toggle-group">
            <button className="active">L/人/日</button>
            <button>m³/人/日</button>
          </div>
        </div>

        <div className="ranking">
          <div className="ranking-col">
            <h4>最高 5 名</h4>
            <HRankBar
              rows={top5}
              max={lpcdAll[0].value}
              color="var(--accent)"
              highlightCode={selectedCounty}
            />
          </div>
          <div className="ranking-col">
            <h4>最低 5 名</h4>
            <HRankBar
              rows={bot5}
              max={lpcdAll[0].value}
              color="var(--accent-ramp-3)"
              highlightCode={selectedCounty}
            />
          </div>
        </div>

        <div className="rank-footer">
          <Icons.trend size={14} />
          <span>用水量縣市差異 <b>{ratio} 倍</b></span>
          <span>·</span>
          <span>最高 <b>苗栗 312L</b></span>
          <span>·</span>
          <span>最低 <b>嘉義市 186L</b></span>
        </div>
      </div>

      <DataSourceBadge sources={["水利署", "環境部", "農業部"]} updatedAt="2026-05-13 10:30" />
    </div>
  );
}

/* ========== View A · Home ========== */
function ViewA_Home({ onCountyClick, selectedCounty }) {
  const [expanded, setExpanded] = vaState(null);
  const N = window.HOME_NATIONAL;

  const agingAll = window.COUNTIES.map((c) => ({
    code: c.code, name: c.name, value: window.HOME_BY_COUNTY[c.code].agingIndex,
  })).sort((a, b) => b.value - a.value);

  return (
    <div>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1>
              <span className="accent">全台概覽</span>
              <span className="small">· 基礎</span>
            </h1>
            <p className="hook">
              全國老化指數 <b>{N.agingIndex}</b>，
              縣市差距達 <b className="em">{(agingAll[0].value / agingAll[agingAll.length - 1].value).toFixed(1)} 倍</b> —
              最高嘉義縣 239.3、最低金門 78.4。
              人口連續 14 個月負成長，自然增加率 -1.73‰。
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn ghost"><Icons.share size={14} /> 分享</button>
            <button className="btn"><Icons.download size={14} /> 匯出</button>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard
          icon={<Icons.users size={13} />}
          label="全國人口"
          value={fmt.num(N.totalPop)}
          unit="人"
          trend={{ delta: fmt.pct(N.growth), direction: "down", baseline: "年增率", sentiment: "negative" }}
          spark={window.POP_HISTORY.map((d) => d.value)}
          expanded={expanded === "pop"}
          onExpand={() => setExpanded(expanded === "pop" ? null : "pop")}
          explodeContent={
            <div>
              <div className="exploded-head">
                <div className="title">全國人口 · <span className="sub">22 縣市分布</span></div>
                <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
              </div>
              <DimensionExplode
                items={window.COUNTIES.map((c) => ({ name: c.name, value: Math.round(c.pop * 10000), code: c.code }))
                  .sort((a, b) => b.value - a.value).slice(0, 14)}
                unit="人"
              />
            </div>
          }
        />
        <KPICard
          icon={<Icons.pin size={13} />}
          label="縣市數"
          value={N.counties}
          unit="個"
          trend={{ delta: "直轄市 6 · 縣市 16", direction: "flat", baseline: "", sentiment: "neutral" }}
        />
        <KPICard
          icon={<Icons.house size={13} />}
          label="鄉鎮市區數"
          value={N.townships}
          unit="個"
          expanded={expanded === "town"}
          onExpand={() => setExpanded(expanded === "town" ? null : "town")}
          explodeContent={
            <div>
              <div className="exploded-head">
                <div className="title">鄉鎮市區數 · <span className="sub">縣市分布</span></div>
                <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
              </div>
              <DimensionExplode
                items={window.COUNTIES.map((c) => ({ name: c.name, value: window.HOME_BY_COUNTY[c.code].townCount, code: c.code }))
                  .sort((a, b) => b.value - a.value).slice(0, 14)}
                unit="區"
              />
            </div>
          }
        />
        <KPICard
          icon={<Icons.users size={13} />}
          label="出生率 / 死亡率"
          value={`${N.birthRate} / ${N.deathRate}`}
          unit="‰"
          trend={{ delta: `${N.natural.toFixed(2)}‰`, direction: "down", baseline: "自然增加", sentiment: "negative" }}
        />
        <KPICard
          icon={<Icons.users size={13} />}
          label="老化指數"
          value={N.agingIndex}
          trend={{ delta: `+${N.agingDelta}`, direction: "up", baseline: "較去年", sentiment: "negative" }}
          spark={window.AGING_HISTORY.slice(-12).map((d) => d.value)}
          expanded={expanded === "aging"}
          onExpand={() => setExpanded(expanded === "aging" ? null : "aging")}
          explodeContent={
            <div>
              <div className="exploded-head">
                <div className="title">全國老化指數 · <span className="sub">1994–2024 歷年</span></div>
                <button className="collapse" onClick={() => setExpanded(null)}><Icons.x size={11} /> 收起</button>
              </div>
              <TimeExplode
                data={window.AGING_HISTORY.map((d) => ({ x: d.year, y: d.value }))}
                xLabels={window.AGING_HISTORY.map((d) => d.year.toString())}
                yMin={50}
                yMax={170}
                annotations={[{ atIndex: 23, label: "死亡交叉", severity: "danger" }]}
              />
              <div className="muted mt-8" style={{ fontSize: 12 }}>🔴 2017 死亡交叉 · 2025 預估進入超高齡社會</div>
            </div>
          }
        />
        <KPICard
          icon={<Icons.users size={13} />}
          label="自然增加率"
          value={fmt.signed(N.natural, 2)}
          unit="‰"
          trend={{ delta: "持續為負", direction: "down", baseline: "已連 14 個月", sentiment: "negative" }}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="pre">RANKING</span>
              老化指數 · 縣市排名
            </div>
            <div className="section-subtitle">點縣市看詳細人口結構</div>
          </div>
          <button className="btn ghost" style={{ fontSize: 12 }}>查看完整排名 →</button>
        </div>

        <div className="ranking">
          <div className="ranking-col">
            <h4>最高 5 名</h4>
            <HRankBar
              rows={agingAll.slice(0, 5)}
              max={agingAll[0].value}
              color="var(--accent)"
              highlightCode={selectedCounty}
            />
          </div>
          <div className="ranking-col">
            <h4>最低 5 名</h4>
            <HRankBar
              rows={agingAll.slice(-5).reverse()}
              max={agingAll[0].value}
              color="var(--accent-ramp-3)"
              highlightCode={selectedCounty}
            />
          </div>
        </div>
      </div>

      <DataSourceBadge sources={["內政部戶政司", "主計總處", "TGOS MOI API"]} updatedAt="2025-05-13" />
    </div>
  );
}

window.ViewA_Water = ViewA_Water;
window.ViewA_Home = ViewA_Home;
