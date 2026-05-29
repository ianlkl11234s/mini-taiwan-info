# BACKLOG — 待辦清單

> P0 阻塞 / P1 規劃期 / P2 穩定後 / P3 nice-to-have
> 完成項目搬到下方「已完成」區並標日期，最多保留 10 筆。

---

## 待辦

| ID | 優先級 | 項目 | 狀態 | Blocker / 備註 |
|---|---|---|---|---|
| B001 | P1 | View D 比較模式（跨縣市疊圖比較） | 待開工 | mockup must-have 第 4 view；user Phase 0 階段先 skip |
| B002 | P2 | 月雨量 MV (`rain_gauge_monthly_by_county`) | 待開工 | 目前無 view 使用；ViewB 用 LPCD/接管率歷年；待 Phase 1 月雨量 trend UI 上線時做 |
| B003 | P2 | `home-basics.yaml` 升級到 v1.1 spec | 待開工 | 加 `color_metrics` + `point_profile` + `response_shape`，目前 fallback 撐著 |
| B004 | P2 | `socioeconomic.yaml` / `fire.yaml` 升級 v1.1 | 待開工 | 同 B003 |
| B005 | P2 | `themes/_template.yaml` 升級 v1.1 | 待開工 | 給未來新主題作範本 |
| B006 | P2 | `themes/_schema.json` JSON Schema validator | 待開工 | 給 CI / pre-commit hook 用，docs/09 §C 列為 Phase 0 |
| B007 | P2 | `scripts/regen-counties.ts` | 待開工 | 從 `data/counties.yaml` 自動生成 `frontend/src/lib/counties.ts`（目前手寫對齊） |
| B008 | P1 | TGOS MOI 後端 wrapper（FastAPI） | 待開工 | docs/09 §E；apikey 不能裸前端，要先上線後端 |
| B009 | P2 | `admin.counties` polygon migration | 待開工 | 改進 nearest-centroid 為 ST_Contains；現在用 centroid 推算 reservoir → county 有邊界誤差風險 |
| ~~B010~~ | ~~P2~~ | ~~Mapbox URL-restricted token~~ | ✅ 2026-05-29 (S10) | user 上線後自行換新 token + URL restrict 到 mini-tw-info.zeabur.app |
| B011 | P2 | View B 雨量站圖層 enable | 待開工 | TwoSectionLayers 內目前 disabled；要先處理 1306 站如何在地圖顯示（cluster 否） |
| B012 | P3 | View C 水庫附近河川 / 集水區 polygon overlay | 待開工 | 加用 `get_reservoir_watershed_rivers` RPC（已存在 migration 053） |
| B013 | P3 | KHH WWTP 12 座座標 TGOS 反查 | 待開工 | 目前 lat/lng 是 prototype mock；要走 TGOS Zip33 反查 |
| B014 | P3 | 暗色模式驗證 | 待開工 | CSS 變數已有，沒實際驗證 |
| B015 | P3 | 手機版（< 1280px） | 待開工 | user 確認 Phase 1 才做 |
| B016 | P3 | TweaksPanel（density / radius / accent 切換） | 待開工 | prototype 有，目前未移植 |
| B017 | P2 | ~~Vercel~~ Zeabur deployment + CI/CD | 部分完成 | ✅ 2026-05-29 已上線 Zeabur（dist 靜態 PREBUILT_V2，https://mini-tw-info.zeabur.app）。CI/CD auto-redeploy 待 B074 |
| B018 | P3 | Sentry / GA / uptime monitor | 待開工 | docs/09 §T |
| B019 | P2 | `hook_rules` template engine | 待開工 | manifest 內 hook_rules 目前是 hardcoded，要寫 evaluator |
| B020 | P3 | `crosslink` InsightCard 元件 | 待開工 | water.yaml crosslink 規格已有，沒對應 UI |
| B021 | P1 | ViewB OverviewTab 水庫卡 sparkline 用假資料 | 待開工 | ViewB.tsx:308-315 用 `[rate*0.9, rate*0.95, rate*1.02, rate]` 模擬 — 視覺欺騙。要嘛接 30 天 timeseries RPC，要嘛改 gauge chart + 「尚無時序」灰色 badge |
| B022 | P1 | ViewB OverviewTab 汙水廠 KPI 寫死「—」 | 待開工 | ViewB.tsx:234-240 缺真實資料。可走 `sewage_treatment_plants` 表 count by county（即使 82 筆 lat/lng 不全也能 count） |
| B023 | P1 | ViewA「高警戒水庫數」KPI 爆炸是 placeholder | 待開工 | SimpleExplode 路徑 metricKey 找不到 → 顯示「該指標爆炸圖 Phase 0c 接入」。要加 metricKey case `high_alert_reservoirs` |
| B024 | P1 | **Cycle 2 候選**: 水質測站 BOD/DO（Tier S）| 待開工 | taipei-gis-analytics 已有 pipeline + migrations/087 已建表。整合：寫 query + hook + ViewB 河川水質 tab。1-2 天 |
| B025 | P1 | **Cycle 2 候選**: 河川流量測站（Tier S）| 待開工 | datagov 22223 188 站，pipeline 04 已實裝。Map layer overlay。< 30min ETL，剩前端串 |
| B026 | P1 | **Cycle 2 候選**: 水污染罰鍰 datagov_45136（Tier S）| 待開工 | 22 縣市 × 14 年。仿 datagov_8316_lpcd.py 範本寫 pipeline + migration + KPI。30-60min |
| B027 | P2 | RPI 89034 + 稽查罰鍰次數 45134/45135（Tier A）| 待開工 | 要寫新 pipeline + migration |
| B028 | P2 | .env.example 補充所有 token convention 註解 | 待開工 | 寫清楚 `__MAPBOX_TOKEN_PLACEHOLDER__` 等 placeholder 用法 + 哪些 token 必填 / 選填 |
| B029 | P1 | 全站 LIVE badge audit | 部分完成 | ViewB 水質已改 (DataAgeBadge)。剩 ViewA 6 KPI + ViewB OverviewTab/Usage 等 |
| B030 | P1 | A2 run epa_river pipeline | 未跑 | commit 88353ae 已存在，run 1-2hr 約 30k reading 進 DB，跑完河川 tab 接通真實資料 |
| B031 | P1 | Cycle E 河川流量 188 站 + river_lines/basins map | 待開工 | 表都已建（river_flow_stations / river_lines 2015 / river_basins 116）|
| B032 | P1 | Cycle F 地下水位 realtime + 21 區 polygon | 待開工 | 200 萬筆 realtime + groundwater_zones 已建。要 server-side aggregate RPC |
| B033 | P2 | Cycle G ViewC 加水庫 inflow/outflow 雙線 + reservoir_polygons map | 待開工 | RPC 欄位都有，只差 frontend |
| B034 | P2 | Cycle H ViewB 30 天 sparkline 接 RPC（取代假資料） | 待開工 | get_reservoir_timeseries 已有 |
| B035 | P2 | Cycle D 汙水廠 count + map layer | 待開工 | sewage_treatment_plants 82 座已建 |
| B036 | P2 | Cycle D2 TGOS 反查汙水廠座標 | 等 FastAPI wrapper | 前置 B008 |
| B037 | P2 | Cycle E2 灌溉用水 datagov_35644 | 未做 pipeline | 18 處水利會 proxy 22 縣市 |
| B038 | P2 | Cycle I 防洪 4 section 完整化 | 待開工 | 淹水場景 switcher / 滯洪池 polygon / 雨水下水道 layer / 即時雨量站 |
| B039 | P2 | Cycle J View A 水循環 Sankey 圖 | 待開工 | 一張總圖視覺化水循環流量 |
| B040 | P2 | Cycle B / C datagov 45136 / 45134 / 45135 / 89034 (4 pipeline) | 未做 | 治理層補強 |
| ~~B041~~ | ~~P1~~ | ~~fire-S1 placeholder swap~~ | ✅ 2026-05-16 (S9) | 財損 / 處所 / 縣市排名表已接通 fire.casualty_property + incidents_by_location_type（含 footnote 揭露 2020/2022 only） |
| B042 | P1 | **fire-S2 部分完成** — 消防栓其他 3 都欄位 mapping bug | 待開工 | 分隊 716 已接通；消防栓只高雄完整（B2 dataset 北/中/南/南源欄位 mapping bug → taipei-gis pipeline 修 0.5 day） |
| ~~B043~~ | ~~P2~~ | ~~fire-S3 placeholder swap~~ | ✅ 部分 2026-05-16 (S9) | 分隊密度 / 面積密度 / scatter 接真實 fire.stations；5min 圈外仍 placeholder，但 gis-platform migration 111 已建 service_coverage_by_county MV，剩前端接（→ B067） |
| ~~B044~~ | ~~P2~~ | ~~fire-S4 placeholder swap~~ | ✅ 部分 2026-05-16 (S9) | 救護 / 山林 / 災變 timeline 接通 fire.ems / forest_risk / disaster_incidents；急救醫院仍標 placeholder，但 safety.emergency_hospitals 已建（→ B066） |
| ~~B045~~ | ~~P1~~ | ~~fire 地圖層：消防分隊 dot + 火災 heatmap~~ | ✅ 2026-05-16 完成 | 見已完成區 |
| ~~B046~~ | ~~P1~~ | ~~fire ViewB 縣市儀錶板~~ | ✅ 2026-05-16 完成 | 見已完成區 |
| ~~B047~~ | ~~P2~~ | ~~fire KPI 爆炸視圖~~ | ✅ 2026-05-16 完成 | 見已完成區 |
| B048 | **P1** | **儀錶板 800×600 stack-to-vertical 缺失（公開後升 P1）** | 待開工 | Agent A 2026-05-16 截圖：< 900 viewport split-view 仍硬切左右 50/50，右 pane ≈ 400 px 內容嚴重溢出右側，無 horizontal scroll 暗示。要加 `@media (max-width: 900px) { .main { grid-template-rows: auto auto; grid-template-columns: 1fr; } }` |
| B049 | P3 | **Donut 圖例溢位（chart-annot 標籤貼邊）** | 待開工 | Agent A 2026-05-16 觀察：fire S1「組成佔比」donut 在所有寬度數值 label 貼卡片邊（如 `10.4% 5,033`）。可能要縮 donut 半徑 / 加 label 推開 / margin 增加。約 30min |
| B050 | P3 | **fire KPI 卡單位緊貼 sparkline icon** | 待開工 | Agent A 2026-05-16 觀察：1280×800 fire KPI 4 卡的單位（件/人/億/%）緊貼數字，與 sparkline icon 間呼吸不足。加 `gap` 或 sparkline `margin-left` 約 8-12px |
| B051 | P3 | **24-column stacked totals overlap** | 待開工 | Session 7 B047 hour×county 截圖：24 個柱寬 ~32px 但 totals number ~40px 寬橫向 overlap。修法：rotate 90deg / 隔列 show / hover-only / 移到柱內。約 30min。Reference: FireStackedBar.tsx :32-44 fbr-num |
| B052 | P2 | **B047 擴展：其他 fire KPI 也支援爆炸** | 待開工 | 目前只「年度火災件數」可爆炸。死傷 / 財損 / 主因 3 KPI 也應套同模式（需各自的 metric 聚合邏輯）。1-2 天 |
| B053 | P3 | **B047 擴展：drill-down 二級爆炸** | 待開工 | 點柱 → 該年該縣市 by 原因 / 該原因 by 縣市。03-exploded-view-pattern 規格 Phase 3，user 拍板暫不做。0.5-1 天 |
| B054 | **P1** | **ViewAWater @800 響應式破洞（公開後升 P1）** | 待開工 | Stage 4 截圖 2026-05-16：800px 寬章 2 two-up / 章 3 alert-grid 4 燈號 / 章 5 usage-split 雙欄都水平 overflow。修法：加 `@media (max-width: 900px)` 規則把 grid 改成 1 欄。約 30min |
| B055 | P2 | **reservoir vs 上月同期 wrapper RPC** | 待開工 | S2Storage `vs 上月對比資料累積中` footnote。realtime.reservoir_status 30 天 snapshot 已有資料但 schema 未 expose；需寫 `public.get_reservoir_storage_by_region_at_time(p_at TIMESTAMP)` wrapper migration。約 1 hr |
| B056 | P3 | **drought_alert 過去 5 年 timeline** | 待開工 | S3Drought 顯示「資料累積中」占位，等 collector 累積 30+ 筆 history（預計 6 個月）後實作真正 timeline 繪製 |
| B057 | P2 | **淹水 200/500mm 情境接通** | 待開工 | S6Disaster 切換 200/350/500mm，目前只 350 接 useWaterKpis.flood。要嘛改 hook 並行 fetch 3 個情境，要嘛動態 refetch |
| B058 | P3 | **用水結構 sector 拆解資料** | 待開工 | S5Usage「用水結構」目前 mock + badge「結構估算」。datagov 可能有民生/工業/農業細分，未確認；現用 DB 無 sector 欄位 |
| B059 | **P0** | **ViewB 阻塞: 縣市→供水區/水情區/台水分區 3 mapping table** | 待開工 | gis-platform migration ~1.5 day 手抄。`reference.county_supply_region` / `county_drought_region` / `county_twc_region`。不建 ViewB 章 2/3/4 都做不出來。詳 designs/v04/coverage-audit.md Part 2 P0 |
| B060 | **P0** | **drought_alert collector 補 4 區（北水/桃竹/南水/高屏）** | 待開工 | data-collectors 0.5 day。目前只跑台中/新竹 2/6 區。drought_alert_current 全表 2 列 → 章 3 燈號全國視覺空 |
| B061 | **P0** | **water_quality_stations county 欄位 normalize** | 待開工 | gis-platform migration 0.5 day。雙寫（南投/南投縣 / 台北/臺北市）+ 加 county_id 欄位用 county_aliases LEFT JOIN。章 1 水質站數 normalize 前不能信 |
| B062 | P1 | **ViewB 統合 RPC: get_county_water_summary(county_id)** | 待開工 | gis-platform 1 day。章 1+2+5 一次包，減 round trip。詳 audit Part 2 P1 |
| B063 | P1 | **ViewB get_river_stations_by_county / get_river_lines_by_county RPC** | 待開工 | gis-platform 1.5 day。章 1 流量站 + 河川條數，要 ST_Contains spatial join |
| B064 | P1 | **flood_hazard_townships RPC** | 待開工 | gis-platform 0.5 day。flood_hazard_zones 已有 town 欄位，純 GROUP BY town RPC 包裝即可。章 6 淹水展開鄉鎮里直接可做 |
| B065 | P3 | **iot_wra_stations.county_name strip 省份前綴** | 待開工 | gis-platform 0.5 day。「臺灣省 / 福建省」前綴 normalize，章 1 替代河川站用 |
| B066 | **P1** | **接通 safety.emergency_hospitals 到 ViewA S4 + ViewBFire OthersTab** | 待開工 | 252 家 22 縣齊全已 in DB（migration 112 + taipei-gis Sprint G）。寫 public wrapper + query function + 取代 ViewAFire S4 「急救責任醫院」KPI 的 placeholder。約 2 hr 純前端 + 0.5 hr wrapper migration |
| B067 | **P1** | **接通 fire.service_coverage_by_county MV 到 ViewA S3 + ViewBFire ServiceTab** | 待開工 | migration 111 已建 fire density/coverage 4 MV（其他 session 跑完）。寫 wrapper + 接通「5min 圈外人口比」KPI（取代 mock）。約 2 hr |
| B068 | **P1** | **接通 admin.villages 7975 polygon 到 ViewBFire ServiceTab 圈外村里 Top 10** | 待開工 | migration 110 已建。要 PostGIS RPC `public.fire_outof_villages_by_county(p_county)`：村里 polygon × stations 6km buffer 反算最遠 10 個村里。約 4 hr 跨 gis-platform + frontend |
| B069 | P2 | **fire.hydrants B2 dataset 4 都欄位 mapping bug 修** | 待開工 | taipei-gis Sprint B2 4 都 dataset 全 dropped_no_coord。修 pipeline `pipelines/environment/fire/04_load_hydrants.py` 欄位 mapping，rerun ETL 補完 21 縣市消防栓。約 0.5 day |
| B070 | P2 | **fire.ems_stats_by_county_year 補完 22 縣市** | 待開工 | 目前只 2 縣市。要找替代 dataset 或內政部統計處年度 ETL。約 1 day |
| B071 | P2 | **fire.disaster_unique_recent RPC（server-side dedup-by-name）** | 待開工 | 取代前端 fetch 2000 + dedup。寫 RPC GROUP BY disaster_name 直接返 N 個 unique event。約 1 hr，sm payload 省 bandwidth |
| B072 | P3 | **fire.forest_fire_risk_snapshot 補 county_id 欄位** | 待開工 | gis-platform migration 加 county_id（從 region/lat/lng 推算 ST_Contains）。讓 ViewBFire OthersTab 顯示「該縣市山林高風險點 X 處」（目前完全空）。約 2 hr |
| B073 | **P1** | **套用 gis-platform migration 124（RPC 硬上限）** | 待開工 | `124_rpc_hard_limits.sql` 只產未套未 commit。fire.list_incidents + get_road_events_current 的 `LIMIT p_limit`→`LEAST(...,10000)`。套用前 psql `pg_get_functiondef` 確認簽名。CROSS_REPO pending |
| B074 | P2 | **debug Zeabur Dockerfile build FAILED → 改 Git deploy** | 待開工 | 目前是 dist 靜態（PREBUILT_V2，cache 用 Zeabur 預設）。修好 Dockerfile build 改 Git deploy + Root Directory=frontend/ → push 自動重部署 + nginx immutable 長快取。詳 INCIDENTS 2026-05-29 + DEPLOYMENT.md |
| B075 | P2 | **資料分級實際切換 C 級 query → snapshot** | 待開工 | 腳本已建 `frontend/scripts/snapshot-static-data.ts`，但 table 名稱是推定的，首次跑前需對照實際 query 校正；再改 hook 雙層（先讀 snapshot 逾期才 fetch）。見 docs/DATA_TIERING.md |

---

## 已完成（近期 10 筆）

| 日期 | ID | 摘要 |
|---|---|---|
| 2026-05-29 | B010/B017 (S10) | **首次部署上線 Zeabur** https://mini-tw-info.zeabur.app — egress 收斂（5 query 精選欄位+硬上界）+ 前端 cache 層（lib/cache.ts + 11 hooks）+ 部署 infra（Dockerfile/nginx/.dockerignore/DEPLOYMENT.md）+ 資料分級腳本 + rail ridership 降冪修。Mapbox token 已 URL restrict。21 commits 全 push。採 dist 靜態（PREBUILT_V2）|
| 2026-05-16 | B041/B043/B044 (S9) | **Fire 主題 ViewA + ViewB 去 mock 化** — gis-platform migration 109 14 wrapper view + frontend 10 commits（queries +683 / useFireData rewrite Promise.allSettled / 新 useFireCountyData hook / S1-S4 sections rewrite / ViewBFire merged{} + Response/Others tabs / App.tsx 3 fixes / radar national avg 接真實）。火災財損 / 起火處所 / EMS / 災變 timeline / 避難所 / 分隊密度 / 山林高風險全接通，含 footnote 揭露稀疏資料。仍 placeholder：急救醫院、5min 圈外、圈外村里（其他 session 已建 ETL/MV → B066-B068）|
| 2026-05-16 | B047 (S7) | **Fire KPI 爆炸視圖** — FireKpiExplode.tsx ~260 行 + FireStackedBar.tsx ~100 行 + S1Incidents wire + globals.css 130 行。fire S1「年度火災件數」KPI 點擊就地展開（grid-column 1/-1），4 scale × 4 dim = 16 組合切換 + 圖型自動 + 6 個缺資料組合 inline reason。Codex 抓 1 blocker + 2 nice-to-have 全修；agent-browser 互動發現 KPICard bubble bug（codex 盲區）。User 拍板收斂：只 1 KPI / 不 drill-down / inline 展開 |
| 2026-05-16 | B046 (S6) | **Fire ViewB 縣市儀錶板** — gis-platform migration 105 incidents_by_county_cause_year MV + frontend ViewBFire.tsx 1170 行（Hero + Radar 5 軸 + 5 sub-tabs）+ query/hook/mock/App route + 設計稿 fire-* CSS 184 行補齊。Codex 抓 2 critical 全修（norm 方向 / hydrants null）。跨 2 repo 2 commits push |
| 2026-05-16 | B045 (S6) | **Fire 地圖層 heatmap + 分隊 dot** — MapView 加 fire-incidents-heatmap + fire-stations-pt + label，補水主題 gate 漏網之魚（reservoirs/river-stations），加 METRIC_NONE「無染色」radio + buildFirePointLayers 5 toggle panel，兼修 1100×700 邊界裁切，z-order fix (beforeId='counties-border')，heatmap paint 漸層調 7-stop。4 commits mini-taiwan-info push |
| 2026-05-15 | Fire Phase 1 (S5) | ViewA Fire 4 區塊 + queries/hook/mock-fire + 11 components + 響應式 CSS + App routing + 修 4 個 CSS bug；S1 真實接（48,626 件 / 5+22 cause / 22 縣市 / 4 時間切片），S2/S3/S4 mock 標待ETL |
| 2026-05-15 | fire-etl TODO-1 (S5) | 12_upload_to_supabase.py 跑完 48,626 筆 fire.incidents + 4 MV refresh |
| 2026-05-15 | gis-platform 104 (S5) | public.fire_* wrapper views + RPCs（PostgREST exposed schema 限制 workaround） |
| 2026-05-14 | Cycle B (S4) | ViewB IA v2 重組 7 tabs 依水循環層 + WaterQualitySection 共用 helper（25min） |
| 2026-05-14 | Cycle A (S4) | 水質測站 BOD/DO 接通真實資料 + DataAgeBadge component + LIVE 用詞嚴守 + Roadmap doc + epa_river pipeline diff（A2 未 run） |
| 2026-05-14 | LIVE 嚴格定義 (S4) | data collector cron 才叫 LIVE；PRINCIPLES + CLAUDE.md 雙保險；DataAgeBadge 取代誤標 |
| 2026-05-14 | Cycle 1 (session 3) | 3 P0 fix + secret scrub + /water-loop skill 固化 + 三 repo 全 push |
| 2026-05-14 | P0-4 | ViewA explode 改顯示全 22 縣市（之前截前 12）|
| 2026-05-14 | P0-3 | ViewA hero hook 切主題 fallback 到 theme.tagline（之前寫死 LPCD）|
| 2026-05-14 | P0-1 | PointProfile chip 點擊 drill 到 View C |
| 2026-05-14 | A-4 | View C 阿公店水庫詳情頁（4 stat + 1 年 trend + 自動跌破 annotation） |
| 2026-05-14 | A-3 | View B 縣市儀錶板 7 tabs |
| 2026-05-14 | A-2 | TwoSectionLayers 收合控制 |
| 2026-05-14 | A-1 | PointProfile 三模式（bucket / region / scatter） |
| 2026-05-14 | 0d | flood_hazard_pct_by_county MV + 6/6 KPI 接通真實資料 |
| 2026-05-14 | 0c-C | 22 縣市 ranking + choropleth + hero + explode 全接通真實資料 |
