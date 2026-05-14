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
| B010 | P2 | Mapbox URL-restricted token | 待開工 | 上線前；目前用 prototype dev token |
| B011 | P2 | View B 雨量站圖層 enable | 待開工 | TwoSectionLayers 內目前 disabled；要先處理 1306 站如何在地圖顯示（cluster 否） |
| B012 | P3 | View C 水庫附近河川 / 集水區 polygon overlay | 待開工 | 加用 `get_reservoir_watershed_rivers` RPC（已存在 migration 053） |
| B013 | P3 | KHH WWTP 12 座座標 TGOS 反查 | 待開工 | 目前 lat/lng 是 prototype mock；要走 TGOS Zip33 反查 |
| B014 | P3 | 暗色模式驗證 | 待開工 | CSS 變數已有，沒實際驗證 |
| B015 | P3 | 手機版（< 1280px） | 待開工 | user 確認 Phase 1 才做 |
| B016 | P3 | TweaksPanel（density / radius / accent 切換） | 待開工 | prototype 有，目前未移植 |
| B017 | P3 | Vercel deployment + CI/CD | 待開工 | docs/09 §R |
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

---

## 已完成（近期 10 筆）

| 日期 | ID | 摘要 |
|---|---|---|
| 2026-05-14 | Cycle 1 (session 3) | 3 P0 fix + secret scrub + /water-loop skill 固化 + 三 repo 全 push |
| 2026-05-14 | P0-4 | ViewA explode 改顯示全 22 縣市（之前截前 12）|
| 2026-05-14 | P0-3 | ViewA hero hook 切主題 fallback 到 theme.tagline（之前寫死 LPCD）|
| 2026-05-14 | P0-1 | PointProfile chip 點擊 drill 到 View C |
| 2026-05-14 | A-4 | View C 阿公店水庫詳情頁（4 stat + 1 年 trend + 自動跌破 annotation） |
| 2026-05-14 | A-3 | View B 縣市儀錶板 7 tabs |
| 2026-05-14 | A-2 | TwoSectionLayers 收合控制 |
| 2026-05-14 | A-1 | PointProfile 三模式（bucket / region / scatter） |
| 2026-05-14 | 0d | flood_hazard_pct_by_county MV + 6/6 KPI LIVE |
| 2026-05-14 | 0c-C | 22 縣市 ranking + choropleth + hero + explode 全 LIVE |
