# Batch 1 — 純前端稽核修復（2026-05-30）

> 來源：`.claude/AUDIT_MASTER_PLAN.md` Batch 1（純前端 (a)）+ 三份 `audit_*.md`。
> 原則：每項先 grep/讀 code 驗現況再改；遵循 CLAUDE.md 4 鐵則。
> 驗證：`pnpm typecheck` 通過 + agent-browser 抽驗（headless WebGL 著色測不到，已標註）。

---

## 逐項結果

### X-1 🔴 rail+maritime 22 縣市著色失效 — ✅ 修復（著色需正常 WebGL 環境複驗）
- **改檔**：`frontend/src/App.tsx`
- **做了什麼**：`metricValues` useMemo 原只實作 water/fire/demo 三分支，rail/maritime 全 null→灰底。
  - 新增 `railAggByCode3` / `maritimeAggByCode3` Map + `useRailRealData` / `useMaritimeRealData` flag（gate on countyAggregates.length）。
  - loop 內加 rail 分支：`station_count`→stations、`rail_length_km`→km、`daily_trips_per_station`→round(dailyTrips/stations)（stations=0→null）、`ridership_per_capita`→null（Sprint 0 待補）。
  - maritime 分支：`port_count`→ports、`fishing_port_count`→fishing、`fishery_value_billion`→fisheryValue>0?:null、`port_calls_yearly`→shipTraffic>0?:null。
  - 0 站/0 港為**真實值**保留（內陸縣市），coverage 不全的漁業產值/進出港 0→null。
  - fallback getMockMetricValue 條件加 `!useRailRealData && !useMaritimeRealData`；useMemo deps 補齊。
- **驗證**：typecheck 通過；ViewA ranking（同 countyAggregates 來源）正常渲染真實值（澎湖 73 港 / 新北 103 站…），證資料路徑通。**地圖 4 色 choropleth fill 因 headless WebGL ErrorBoundary 無法目視 → 需正常瀏覽器複驗**。

### M-1 🔴 maritime 燈塔/漁權前端接線 — ✅ 修復（DOM 驗證通過）
- **改檔**：`lib/queries/maritime.ts`、`hooks/useMaritimeData.ts`、`components/views/ViewAMaritime.tsx`、`components/views/ViewBMaritime.tsx`
- **做了什麼**：
  - REST 預檢確認 `public.lighthouse`(36, id/name/lng/lat) + `public.fishery_rights`(19, id/name/county/county_id/status/area_km2) 200。
  - maritime.ts 加 `fetchLighthouses` / `fetchFisheryRights`（public client，免 Accept-Profile）+ `deriveMaritimeFacilities`（全國 lighthouseCount/fisheryRightsCount/areaKm2 + 漁業權 per-county by county_id；燈塔無 county 欄→只全國）。
  - useMaritimeData 並行多拉這兩表（Promise.allSettled 5 表）+ expose `lighthouses/fisheryRights/facilities`。
  - ViewA：DATA GAP 移除「燈塔/漁業權水域面積」，新增「FACILITY 海洋設施」區塊顯燈塔 36 座 + 漁業權 19 筆/2,823 km²。
  - ViewB OverviewTab：漁業權水域 KPI 改 per-county（KHH=4 筆 135 km²，baseline 全國 19）、燈塔 KPI 全國 36（標「無縣市拆分」）；地圖圖層卡「🔴 表不存在」→ 真實值 +「圖層待接」。
- **驗證**：ViewA「燈塔 36 座 / 漁業權水域 19 筆 2,823 km²」；ViewB KHH「漁業權 4 筆 135 km² / 燈塔 36 全國」、圖層卡無「表不存在」。✅

### M-2(a) 🔴 (CMA) 航商名污染前端防衛 — ✅ 修復
- **改檔**：`lib/queries/maritime.ts` `deriveTopCommPorts`
- **做了什麼**：byPort loop 加 `if (!r.port_name || r.port_name.startsWith("(")) continue;`（須有 port_name 且非括弧航商名）。後端清理另列 Batch3。
- **驗證**：ViewA TOP5 第 5 名為「05 花蓮港」，無「(CMA)」。✅

### M-4 ⚠️ maritime 內陸 copy 自我指涉 — ✅ 修復
- **改檔**：`components/views/ViewBMaritime.tsx` Hero
- **做了什麼**：硬寫「與南投、嘉義市」→ 動態 `aggs.filter(ports===0 && code3!==self)` 列出「另一個」無港縣市。
- **驗證**：南投(NAN)顯「南投縣 屬…僅 2 個無港者之一（另一個是 嘉義市）」。✅

### M-5 ⚠️ coverage badge — ✅ 修復（DOM 驗證通過）
- **改檔**：`lib/types.ts`（ColorMetric 加 `coverage_note?`）、`components/map/MapLegend.tsx`（加 `coverageNote` prop + ⚠ badge）、`App.tsx`（傳 `colorMetric.coverage_note`）
- **做了什麼**：切到含 coverage_note 的 color-metric（漁業產值/年進出港）時，圖例下顯 warning note。themes.ts js-yaml 直載已保留 coverage_note。
- **驗證**：maritime 切「漁業產值」→ 圖例下顯「待 Sprint 0 漁業署縣市統計 ETL…」。✅

### R-1 🔴 rail 排名 0.00 非「—」 — ✅ 修復（DOM 驗證通過）
- **改檔**：`lib/queries/rail.ts`（`rid` 去 `?? 0`、`ridership24` 改 `number|null`、interface 改 nullable）、`components/views/ViewBRail.tsx`（RidershipTab null guard + RankTab 排除 null 不偽裝 0、rank 顯「—」、分母改 rows.length）、`components/views/ViewARail.tsx`（ridRank type-guard filter）
- **驗證**：rail ViewB 臺中(TCH) 排名「2024 年運量 — / 3 — 億」，僅列 3 個有資料縣市（北/新北/高），無 0.00。✅

### F-3 🔴 fire service buffer 魔術係數 — ✅ 修復
- **改檔**：`components/views/ViewBFire.tsx`（實際行 ~1100/1107，audit 標 1107/1114 微偏）
- **做了什麼**：移除 3km `(100-outOf5MinPct)*0.7` / 6km `100-outOf5MinPct*0.4` 兩行偽涵蓋率文字，改純 buffer 標籤「約 5/10 分鐘可達範圍」；圈外 % 用真實 MV 值保留。
- **驗證**：typecheck 通過。

### F-5 ⚠️ fire 救護全國 KPI=台南單縣 — ✅ 修復
- **改檔**：`components/fire/sections/S4Others.tsx`
- **做了什麼**：算 `emsCovered`（emsTrips>0）+ `emsCoveredLabel`（1 縣→「僅台南」/ N→「僅 N/22 縣市」）；tagline、KPI delta、baseline「非全國」標清涵蓋範圍。
- **驗證**：typecheck 通過。

### F-6 ⚠️ fire 跨 tab badge 矛盾 — ✅ 修復
- **改檔**：`components/views/ViewBFire.tsx` 概覽 tab
- **做了什麼**：消防分隊 baseline「待 Sprint 2 ETL」→「fire.stations 實測」；5min 圈外「待 Sprint 3 ETL」→「service_coverage MV」（兩者其他 tab 已標已接通）。
- **驗證**：typecheck 通過。

### W-1 🔴 water LPCD 排名兩 tab 方向相反 — ✅ 修復
- **改檔**：`components/views/ViewB.tsx` 概覽 tab LPCD Donut
- **做了什麼**：標題「全台 LPCD 排名」→「人均用水量排名（高→低）」；tier「前段/後段」→「用量高/中/低」；補口徑說明「※ 用水量高 ≠ 用水效率好；節水成效見『排名』分頁（越低越好）」。排名邏輯不變（兩 tab 皆正確，差在語意標示）。
- **驗證**：typecheck 通過。

### W-2 🔴 water LIVE 誤標 6 處 — ✅ 修復
- **改檔**：`components/views/ViewB.tsx`（新增中性 `periodBadgeStyle`）
- **做了什麼**：LPCD(280)/接管率(296)→「年度」；淹水高潛勢(1003)/滯洪池(1071)/雨水下水道(1120)→「靜態」；排名 LPCD/接管率(1447)→「年度」。**未動** 河川水位(502)/地下水(774)/即時雨量(1165)（合法 LIVE，有 cron）+ 水庫蓄水率(261/310，realtime hourly 合法 LIVE，audit 未列）。
- **驗證**：typecheck 通過。

### H-2 🔴 home-basics 自然增加假等式 — ✅ 修復
- **改檔**：`components/views/ViewAHome.tsx`（3 處：hero 76 / H5 tagline 494 / 等式 530）
- **做了什麼**：原顯「4.26 − 8.36 = −2.87」（月度 birth/death 配 2024 年度 natural）數學不成立。改用同口徑月度相減 `birth_rate - death_rate` = −4.10 並標「月度」（`N.as_of_month`）。2024 年度 −2.87 仍留 NARRATIVE。
- **驗證**：typecheck 通過；ViewB H5 per-county 等式同理本就自洽（6.21−7.32=−1.11 已正確）。

### H-1(a) 🔴 home-basics mock 套 LIVE 綠 tone — ✅ 修復（DOM 驗證通過）
- **改檔**：`components/views/ViewBHomeBasics.tsx`
- **做了什麼**：H3 人口總量 badge「月度·2026-04」→「2024 推估」+ badgeTone placeholder；H4 年齡結構 badgeTone live→placeholder「推估·待 per-county ETL」；**延伸**：H5 人口動態 per-county mock vital 也掛綠 live → 一併改 placeholder（同類偽裝，符合本輪「去除偽裝」意圖 + LIVE 嚴守）。
- **驗證**：home-basics ViewB tone-live 由 1 → **0**，tone-placeholder=3。✅

### D-2 ⚠️ demographics mojibake 開發術語 — ✅ 修復
- **改檔**：`components/views/ViewBDemographics.tsx` 城鄉分布 tab
- **做了什麼**：KPI baseline「statistical_areas county 欄 mojibake」+ delta「🔴 待修」→ user-facing「縣市別資料整備中」/「全國值可用」；missing-data-card 移除 `<code>spatial.statistical_areas</code> county 欄 mojibake` → 「縣市別日夜人口正進行 22 縣市分區整備」。
- **驗證**：typecheck 通過。

### D-3 ⚠️ demographics 自然增加 Top5 排序 — ✅ 修復
- **改檔**：`components/views/ViewADemographics.tsx`
- **做了什麼**：原 `naturalRank.slice(0,5).map(Math.abs)` 把負值放大成大 bar、破壞遞減又把負誤現為正、與 footer 矛盾。改 `positiveNatural.slice(0,5)`（只列正值、已降序）+ 標題「（正值）」+ 空集合 fallback 文案。
- **驗證**：typecheck 通過。

---

## 收尾
- `pnpm typecheck` ✅ 通過（含過程中修一個 `vital_as_of_monthly` 型別 miss → 改用既有 `N.as_of_month`，hook 淨零變更）。
- agent-browser 抽驗（http://localhost:5173，session batch1）：
  - **M-1**：ViewA 燈塔 36/漁權 19 筆 2,823 km²；ViewB KHH per-county 4 筆 135 km²。✅
  - **M-2(a)**：TOP5 無「(CMA)」。✅
  - **M-4**：南投顯「另一個是 嘉義市」。✅
  - **M-5**：切漁業產值顯 coverage note。✅
  - **R-1**：臺中「2024 年運量 — / 3」。✅
  - **H-1(a)**：home-basics ViewB tone-live=0。✅
  - **X-1（著色）**：headless WebGL ErrorBoundary 無法目視 4 色 fill → **需正常瀏覽器環境複驗**；資料路徑已確認（ranking 同源正常）。
  - console 僅 WebGL ErrorBoundary（headless 限制，非 bug）+ 既有 GoTrueClient warning，無新 runtime error。

## commit
- 一個 atomic commit，僅 `git add` 18 個 frontend 檔 + 本 board（未 `-A`，未含 AUDIT_MASTER_PLAN.md / WAVE_REPORT.md / untracked）。
- message：`fix(audit-batch1): 純前端修15項(著色/燈塔漁權接線/LIVE誤標/魔術係數/排名…)`
- hash：**2650d3e**（18 files changed, +487 −82）。
- **未 push**。

## 未能於 headless 驗證（需正常 WebGL 環境複驗）
- X-1：rail/maritime 切 color-metric 後地圖 22 縣市 4 色 choropleth 是否實際變色。

=== DONE batch1 ===
