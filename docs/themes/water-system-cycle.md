# 水資源體系 Status — 循環系統觀 + 實作 Roadmap

> 拍板於 Cycle 1 收尾（2026-05-14）。
> 取代 `_STATUS.md` 過時的「Phase 0 下一步」section。
> 下個 `/water-loop` 跑哪個 cycle，看這份文件 + BACKLOG.md。

---

## TL;DR

- **前端**：6/6 KPI LIVE（蓄水率 / 雨量 / 警戒 / 淹水 / LPCD / 接管率）+ Cycle 1 已修 3 個 P0 視覺 bug
- **後端資料**：**~78% 已就緒**（比想像好很多）
  - 14 個水資源相關表已 ingest 進 Supabase（含 8 個前端沒接的 polygon/point layer）
  - 缺 4 個 datagov pipeline（水污染稽查/罰鍰 3 個 + 灌溉 1 個 + RPI 1 個）
- **真正瓶頸**：**前端串接 + 治理層 datagov ETL**，不是缺核心資料

→ 下一輪可從「**前端串接已有資料**」最快出貨，再陸續補治理層。

---

## 系統觀（六層循環）

```
                       ┌──────────┐
                       │ ☁️ 大氣  │
                       └────┬─────┘
                            │ 降雨
        ┌───────────────────┼────────────────────────┐
        ↓                   ↓                        ↓
  ① 雨量站 1306       ② 集水區流量             地下水補注
     ✅ LIVE            ⚠️ 188 站表已建未接      ⚠️ 21 區 polygon 已建未接
        │                   │                        │
        ↓                   ↓                        ↓
  ② 河川 2015 線 ←━━ ③ 116 集水區 polygon    地下水位 207 萬筆
     ⚠️ Map 已建未接       ⚠️ 已建未接              ⚠️ realtime 已就緒未接
        │
        ↓
  ④ 水庫 40 + polygon 80
     ✅ 蓄水率 / 警戒 LIVE
     ⚠️ 流量觀 inflow/outflow 已有欄位未呈現
     ⚠️ reservoir_polygons 80 個未掛 map
        │
        ↓
  ⑤ 配送：水利會 / 給水設施 609 處
     ⚠️ water_facilities 表已建未接
     ❌ 漏水率 datagov 155665 未做（22 縣市對不齊）
     ❌ 灌溉用水 datagov 35644 未做
        │
        ↓
  ⑥ 使用：
     ✅ 民生 LPCD (8316) LIVE
     ❌ 工業用水（4 區，22 縣市對不齊）
     ❌ 農業用水（要 datagov 35644）
        │
        ↓ 用後
  ⑦ 汙水管網
     ✅ 接管率 (26815) LIVE
        │
        ↓
  ⑧ 汙水廠 82 座
     ⚠️ 表已建未接（座標待 TGOS 反查）
        │
        ↓ 處理 / 排放
  ⑨ 河川下游 ←━━ ⑩ 列管事業
                    ❌ water_pollution_entities 表未建
  ⑪ 水質測站 2449 站 / 8775 筆 reading
     ⚠️ 表已建未接（jsonb parameters 含 DO/pH/NH3_N 等）
        │
        ↓
  ⑫ 治理：稽查 / 罰鍰
     ❌ datagov 45134/45135/45136 未做（3 個 pipeline）
     ❌ RPI datagov 89034 未做
        │
        ↓
  ⑬ 海 / 環境

附加 · 防洪系統
  ✅ 淹水高潛勢 % LIVE
  ⚠️ 滯洪池 140 個表已建未接
  ⚠️ 雨水下水道 26652 條 pipe + 28609 manhole 表已建未接
```

**圖示**：
- ✅ 已 LIVE（前端 + 資料都 OK）
- ⚠️ 資料就緒但前端未接（**多數情況**）
- ❌ 資料端缺（pipeline 未寫 / 表未建）

---

## 體系現況一覽

### Layer 1 · Input（輸入）

| 指標 | 表 / 來源 | 列數 | 前端 | 對應 Cycle |
|---|---|---|---|---|
| 24hr 雨量 | rain_gauge_readings | 1306 站 | ✅ | — |
| 月雨量 22 縣市 | rain_gauge_monthly_by_county MV | — | ⚠️ MV 未建 | Cycle K |
| 河川流量 | `river_flow_stations` | **188** | ⚠️ 未接 | Cycle E |
| 地下水位 realtime | `realtime.groundwater_level_readings` | **2,075,470** | ⚠️ 未接 | Cycle F |
| 地下水分區 | `groundwater_zones` | **21** | ⚠️ 未接 | Cycle F |

### Layer 2 · Storage（蓄積）

| 指標 | 表 / 來源 | 列數 | 前端 | 對應 Cycle |
|---|---|---|---|---|
| 全國蓄水率 | reservoir_situation_v | 37 | ✅ | — |
| 高警戒水庫 | 派生 | — | ✅（爆炸 placeholder）| B023 / Cycle L |
| 40 水庫點位 | water_reservoirs | 37 | ✅ | — |
| 1 年 trend | get_reservoir_timeseries | — | ✅ ViewC | — |
| 30 天 sparkline | 同 RPC | — | ⚠️ ViewB 假資料 | Cycle H |
| inflow/outflow 流量 | reservoir_status 欄位 | 已有 | ⚠️ 未呈現 | Cycle G |
| reservoir_polygons | `reservoir_polygons` | **80** | ⚠️ Map 未掛 | Cycle G |
| 河川 lines / 集水區 | `river_lines` / `river_basins` | **2015 / 116** | ⚠️ Map 未掛 | Cycle E |

### Layer 3 · Distribution（配送）

| 指標 | 表 / 來源 | 列數 | 前端 | 對應 Cycle |
|---|---|---|---|---|
| 給水設施 | `water_facilities` | **609** | ⚠️ 未接 | Cycle D |
| 自來水普及率 | （無對應表）| — | ❌ | — |
| 漏水率 | datagov 155665 | — | ❌ pipeline 未做 | Cycle K（cov 不全）|
| 水利會 18 處 | datagov 35644 | — | ❌ pipeline 未做 | Cycle E2 |

### Layer 4 · Consumption（使用）

| 指標 | 表 / 來源 | 列數 | 前端 | 對應 Cycle |
|---|---|---|---|---|
| 民生 LPCD | water_usage_yearly | 374 (22×17 年) | ✅ | — |
| LPCD 22 縣市排名 | governance | — | ✅ | — |
| 工業用水 4 區 | datagov 58691 | — | ❌ 4 區 only | Cycle K |
| 農業用水 18 處 | datagov 35644 | — | ❌ 18 處 proxy 22 縣市 | Cycle E2 |

### Layer 5 · Discharge（排放）

| 指標 | 表 / 來源 | 列數 | 前端 | 對應 Cycle |
|---|---|---|---|---|
| 接管率 | sewage_coverage_yearly | 22 | ✅ | — |
| 汙水廠 count by 縣市 | `sewage_treatment_plants` | **82** | ⚠️ ViewB 寫死「—」 | Cycle D |
| 汙水廠座標 | 同表 lat/lng | — | ⚠️ NULL | Cycle D2（TGOS 反查）|
| 列管事業點位 | water_pollution_entities | — | ❌ 表未建 | Cycle C2 |

### Layer 6 · Quality & Governance（環境與治理）

| 指標 | 表 / 來源 | 列數 | 前端 | 對應 Cycle |
|---|---|---|---|---|
| 水質 DO/BOD/pH | `water_quality_readings` (jsonb) | **8,775** | ⚠️ 未接 | **🏆 Cycle A** |
| 水質測站 | `water_quality_stations` | **2,449** | ⚠️ Map 未掛 | Cycle A |
| RPI 河川污染指標 | datagov 89034 | — | ❌ pipeline 未做 | Cycle C |
| 水污染稽查次數 | datagov 45134 | — | ❌ pipeline 未做 | Cycle C |
| 水污染罰鍰次數 | datagov 45135 | — | ❌ pipeline 未做 | Cycle C |
| 水污染罰鍰實收 | datagov 45136 | — | ❌ pipeline 未做 | Cycle B |
| 列管事業 8420 點 | water_pollution_entities | — | ❌ 表未建 | Cycle C2 |

### 附加 · Disaster（防洪）

| 指標 | 表 / 來源 | 列數 | 前端 | 對應 Cycle |
|---|---|---|---|---|
| 淹水高潛勢 % | flood_hazard_pct_by_county MV | 22 | ✅ | — |
| 淹水情境 switcher | MV 含參數 | — | ⚠️ UI 未開 | Cycle K |
| 滯洪池 polygon | `detention_basins` | **140** | ⚠️ Map 未掛 | Cycle I |
| 雨水下水道 | `storm_drainage_pipes` / `manholes` | **26,652 / 28,609** | ⚠️ Map 未掛 | Cycle I |

---

## Roadmap — 5 Tier × 11 Cycle

按「補強最弱環節 + ROI（前端串接最快）」排序。

### 🏆 Tier 1 — 補完治理層（Layer 6）

**整層空著，補了能講「政府做了什麼」故事。Cycle A 因 pipeline 已存在最快出貨**。

| Cycle | 範圍 | 工時 | 前置 |
|---|---|---|---|
| **A** | 水質測站 BOD/DO/pH + ViewB 河川水質 tab + Map layer | 1-2 天 | 表已建有資料 ✅ |
| **B** | 水污染罰鍰實收 45136 → 新 KPI + ranking | 30-60min | 仿 8316 寫 pipeline + migration |
| **C** | RPI 89034 + 稽查/罰鍰次數 45134/45135 | 1-2 天 | 3 個 pipeline，串成「治理績效」KPI cluster |
| **C2** | 列管事業 water_pollution_entities 點位 | 0.5 天 | 表要新建（migration + pipeline）|

### 🥈 Tier 2 — 補完配送/排放（Layer 3 + 5）

| Cycle | 範圍 | 工時 | 前置 |
|---|---|---|---|
| **D** | 汙水廠 count by 縣市 + Map layer | 0.5 天 | 表已建 82 座 ✅，座標待 TGOS |
| **D2** | 汙水廠 lat/lng TGOS 反查 | 0.5 天 | 等 FastAPI wrapper |
| **E** | 河川流量站 188 + river_lines / river_basins 三合一 Map layer | 0.5 天 | 表已建 ✅ |
| **E2** | 灌溉用水 35644（水利會 18 處）| 1 天 | 寫新 pipeline + 18→22 縣市 proxy |

### 🥉 Tier 3 — 流量觀 + 視覺串接

| Cycle | 範圍 | 工時 | 前置 |
|---|---|---|---|
| **F** | 地下水位 realtime 200 萬筆 + 21 區 polygon | 1 天 | 表已建 ✅，要選 down-sampling 策略 |
| **G** | ViewC 加水庫 inflow/outflow 雙線 + reservoir_polygons map | 0.5 天 | 欄位都已就緒 |
| **H** | ViewB 30 天 sparkline 接 RPC 取代假資料 | 0.5 天 | RPC 已有 |

### 🪙 Tier 4 — 視覺循環觀（一張總圖）

| Cycle | 範圍 | 工時 |
|---|---|---|
| **I** | 防洪 tab 完整化（淹水場景 switcher + 滯洪池 + 雨水下水道）| 1 天 |
| **J** | View A 加「水循環 Sankey 圖」（一張圖看流入→用→排）| 1-2 天 |

### 🔵 Tier 5 — coverage 不全處理 + 視覺收尾

| Cycle | 範圍 | 工時 |
|---|---|---|
| **K** | warning badge 系統 + 工業用水 / 漏水率 / 雨量 MV / 淹水 switcher | 1 天 |
| **L** | ViewA「高警戒水庫」KPI 爆炸補真 explode（B023）| 30min |

**完成全部估計**：**12-15 個工作天**。

---

## Cycle 起手手冊

### 🏆 Cycle A — 水質測站 BOD/DO（First Move 推薦）

**為什麼是 First Move**：
- 資料端 100% 就緒（2,449 站 + 8,775 筆 reading）
- pipeline 已存在 (`pipelines/water_resources/extensions/03_load_water_quality.py`)
- migration 087 已 apply
- ViewB 河川水質 tab 是 placeholder，最有解鎖感
- 1-2 天可完整跑完，是 `/water-loop` 第 2 次正式跑的最佳測試案例

**Scope**：
1. ✅ 確認 water_quality_stations 有 county 欄位（若無，要 spatial join reference.counties）
2. 寫 Supabase RPC `get_water_quality_latest_by_county(p_param='DO', p_days=30)`，從 jsonb 提 BOD/DO/pH 等
3. 寫 `frontend/src/lib/queries/water.ts` 加 `fetchWaterQualityLatest(param)` + `fetchWaterQualityByStation(station_id, from, to)`
4. 寫 `frontend/src/hooks/useWaterQuality.ts`
5. ViewB `water_quality` tab 從 PlaceholderTab 改成真實 component
   - 22 縣市 DO 平均 ranking
   - 該縣市 N 個測站清單
   - 該縣市 BOD/DO/pH 雙軸 trend
6. ViewA 加 1 個新 KPI 卡「全國河川水質 DO」（可選，先放 ViewB 完成度足夠）
7. Map layer 加 water_quality_stations 點位（依 DO 著色）

**起手指令**（user 給 `/water-loop` 跑時參考）：
```
/water-loop 跑 Cycle A 水質測站 BOD/DO
前置已驗：water_quality_stations (2449) + water_quality_readings (8775, jsonb 含 DO/pH/NH3_N) 已 ingest
要做：寫 RPC + query + hook + 改 ViewB water_quality tab + 加 station map layer
```

**驗收**：
- [ ] ViewB 點任一縣市，「河川水質」tab 顯示真實 DO/BOD 數字 + 該縣市測站清單
- [ ] ViewA 地圖開啟 water_quality_stations 圖層後可見 2449 點
- [ ] hover 點位 tooltip 顯示 station_name + 最新 DO/BOD/pH

**已知挑戰**：
- water_quality_readings 用 jsonb 存所有參數，需要 PostgreSQL `parameters->>'DO'::numeric` 提取
- 2449 站 zoom out 時要 cluster（之前 PointProfile 不需要，這個量級需要）
- station 表是否有 county 欄位需驗證（若無走 reverseGeocode.ts）

---

### Cycle B — 水污染罰鍰實收 45136

**Scope**：
1. 寫 `pipelines/socioeconomic/datagov_45136_pollution_fines.py`（仿 8316 範本）
2. 寫 migration `0XX_water_pollution_fines_yearly.sql`
3. apply + run pipeline
4. 寫 query `fetchPollutionFines()`
5. 加 ViewA 「治理排」新 KPI「水污染裁罰實收」

**驗收**：
- [ ] ViewA 7 個 KPI（從 6 變 7）
- [ ] 點開展開 22 縣市排序

---

### Cycle C — 治理三件套 RPI/45134/45135

**Scope**：寫 3 個 pipelines（RPI 89034 + 稽查 45134 + 罰鍰次數 45135），3 個 migration，串成 ViewB 河川水質 tab 的「治理績效」cluster。

**驗收**：ViewB 河川水質 tab 除了水質數字（Cycle A）還顯示「該縣市本年度稽查 N 次 / 罰鍰 N 件 / 實收 X 元」。

---

### Cycle C2 — 列管事業點位

**Scope**：新建 water_pollution_entities 表 + pipeline + Map layer。Map 開啟可見 ~8420 點，依排放類別著色。

---

### Cycle D — 汙水廠 count + Map layer

**Scope**：
1. 寫 `fetchWWTPCountByCounty()` 直接 `SELECT county, count(*) FROM sewage_treatment_plants GROUP BY county`
2. ViewB OverviewTab 汙水廠 KPI 從「—」改成真數字（B022）
3. Map layer 加 sewage_treatment_plants（有 lat/lng 才顯示）

**驗收**：
- [ ] ViewB 概覽 tab 「汙水廠 N 座」LIVE
- [ ] Map 開啟可見 82 座之中有座標的點位

---

### Cycle D2 — 汙水廠座標 TGOS 反查

**前置**：FastAPI TGOS wrapper（B008）建好。**先 skip 等 wrapper**。

---

### Cycle E — 河川流量站 + 河川 / 集水區 三合一 Map layer

**Scope**：
1. Map layer 加 `river_flow_stations` 188 站（依即時流量著色）
2. Map layer 加 `river_lines` 2015 條 polyline（藍色細線，zoom > 9 顯示）
3. Map layer 加 `river_basins` 116 個 polygon（淡色 fill，zoom > 7 顯示）

**驗收**：ViewA TwoSectionLayers 三個新 toggle 可開關，地圖 layered 出來像 NLSC 的水文圖。

---

### Cycle E2 — 灌溉用水 datagov 35644

**Scope**：18 水利會處別 → 22 縣市 mapping，新 KPI「農業灌溉用水量」。

---

### Cycle F — 地下水位 realtime + 分區 polygon

**Scope**：
- realtime.groundwater_level_readings 200 萬筆 → 取每站最新一筆（用 RPC `get_groundwater_level_latest()`）
- groundwater_zones 21 區 polygon → Map layer
- ViewB 基礎設施 tab 加「地下水資源」section

**挑戰**：200 萬筆要 server-side aggregate，frontend 不能直接 select *。

---

### Cycle G — 水庫 inflow/outflow 流量觀 + polygon

**Scope**：
1. ViewC 加 1 年 inflow/outflow 雙線（用 get_reservoir_timeseries 已存在欄位）
2. Map layer 加 reservoir_polygons 80 個（zoom > 8 顯示水庫範圍）

**驗收**：ViewC 集集攔河堰可看「每天進來多少 / 出去多少 cms」。

---

### Cycle H — ViewB 30 天 sparkline 接 RPC（B021）

**Scope**：ViewB 水庫卡 sparkline 從假資料 `[rate*0.9, rate*0.95...]` 改接 `get_reservoir_timeseries(id, 30d)`。

---

### Cycle I — 防洪 tab 完整化

**Scope**：
1. 淹水場景 switcher（200/350/500mm，MV 參數已支援）
2. detention_basins 140 個 polygon Map layer
3. storm_drainage_pipes 26652 條 + manholes 28609 個 Map layer（zoom > 12 才顯示，否則太擠）
4. ViewB flood tab 從 placeholder 完整化

---

### Cycle J — View A 水循環 Sankey 圖

**Scope**：一張 Sankey 圖在 View A 底部，視覺化「降雨 → 蓄積 → 用 → 排 → 質」流量。

**設計**：
```
[今日總雨量 X mm]━━┓
                    ┣━━[40 水庫總蓄水 Y 億 m³ / 平均 56.8%]
[地下水位 Z m]━━━━┛           │
                                ↓
                          [全國 LPCD 273L]━━[接管率 53%]━━[DO 平均 ?]
                                                                │
                                                                ↓
                                                          [淹水高潛勢 0.4%]
```

**技術**：可用 D3 sankey 或 plotly。

---

### Cycle K — coverage / warning badge / 工業 / 漏水 / 月雨量

**Scope**：
1. UI 統一 warning badge 系統（manifest meta.coverage_notes 驅動）
2. 工業用水 4 區 / 漏水率 / 月雨量 MV 都接，但配 warning「資料不全」
3. 淹水情境 switcher UI

---

### Cycle L — 高警戒水庫 KPI 爆炸補（B023）

**Scope**：SimpleExplode 加 metricKey `high_alert_reservoirs` case，顯示 11 座水庫各自蓄水率 + 連續低水位天數。

---

## First Move — 推薦從 Cycle A 開始

```
> /water-loop 跑 Cycle A 水質測站 BOD/DO
```

理由：
1. 資料完全就緒（2449 站 + 8775 reading）
2. 解鎖 ViewB 一整個 tab（最有解鎖感）
3. 1-2 天可完成（適合 `/water-loop` 第 2 次正式驗證）
4. 過程會碰到 jsonb 提取 / cluster 大量點位 / 沒 county 欄位等新題型，**對 SKILL 演進有貢獻**

---

## 體系完整度量化

| 維度 | 完成度 |
|---|---|
| 規格 manifest 完整度 | 100%（13 個 data_sources 全列）|
| 資料 ingest 完整度 | ~78%（14 表已建，4 個 datagov pipeline 未寫）|
| 前端 KPI 接通率 | ~43%（6/14 主要指標）|
| Map layer 接通率 | ~15%（1 個 choropleth + 1 個點位 / 8 個未接）|
| View tab 完整度 | ~57%（ViewB 7 tabs 中 4 LIVE）|

完成全 Roadmap 後：
- 資料 ingest → ~95%（剩工業 / 漏水 coverage 不全項）
- 前端 KPI 接通 → 100%
- Map layer → 100%（10+ layers）
- View tab → 100%（含 ViewD 比較模式還沒做但屬另題）

---

## 關聯文件

- `docs/themes/water.md` — 水資源主題完整規格（mockup + 視覺 SSOT）
- `themes/water.yaml` — manifest v1.1
- `.claude/memory/BACKLOG.md` — B021-B028 對應本 doc cycle
- `.claude/skills/water-loop/SKILL.md` — cycle 執行 SOP
- `.claude/memory/STATUS.md` — session handoff（簡短版）
