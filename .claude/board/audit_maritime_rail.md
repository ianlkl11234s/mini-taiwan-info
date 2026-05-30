# 稽核報告 · Maritime（航運）+ Rail（軌道運輸）

> 稽核日期：2026-05-30 · 方法：agent-browser（read-only，未改任何 code、未 commit）
> dev server：http://localhost:5173 · 導航：`?theme=<t>` / `?theme=<t>&view=B&county=<code3>`
> 稽核員：2 平行 sonnet agent（各一主題）+ 主 agent code-level 複驗

## ⚠️ 稽核環境限制（影響可信度，先讀）

- **agent-browser 環境 WebGL 不可用** → Mapbox choropleth **著色無法用截圖視覺驗證**。涉及「地圖染色」的結論改以 **(a) 圖例 domain 文字** + **(b) 主 agent 直接讀 code 邏輯** 佐證，已標註可信度。
- Maritime agent 遇 **session 狀態污染**（deeplink 跨頁點擊偶誤觸底部主題 nav），其**響應式截圖**部分不可靠，已標「需複驗」。KPI/卡片**文字數字**（DOM `get text`）不受 WebGL 影響，可信。
- 所有 🔴 嚴重項皆經主 agent **直接讀 code 二次確認**。

---

## 🔴🔴 跨兩主題共通嚴重 bug（最高優先）

### X-1 · choropleth color-metric 切換對 rail + maritime **完全無效**（地圖永遠灰底）

**🔴 嚴重 · 已 code 驗證 · 影響 rail + maritime 兩主題核心功能**

- 現象：ViewA 切換 color-metric 切換鈕（港口數/漁港數… 或 車站數/里程…），左下圖例 domain 文字會變（如 maritime 港口數→漁港數：`0 19 38 56 75` → `0 18 35 53 70`），但 **22 縣市 choropleth 著色不會變**——全部灰底。
- 根因（已讀 code 確認）：
  - `frontend/src/App.tsx:197-291` `metricValues` useMemo **只實作 water（`useRealData`）/ fire（`useFireRealData`）/ demographics（`useDemoRealData`）三主題**的 metric→縣市值計算分支。
  - rail / maritime 主題時這三個 flag **全為 false**，迴圈內沒有任何分支會給 value。
  - `App.tsx:287` fallback：`if (value == null && !useFireRealData && !useDemoRealData) value = getMockMetricValue(metric, code);`
  - `frontend/src/lib/mock-data.ts:161-171` `getMockMetricValue` **只認得 water 指標**（lpcd/sewage/rain…），對 `station_count`/`port_count`/`rail_length_km`/`fishing_port_count`… 一律走 `default: return null`。
  - → 22 縣市全拿 `null` → choropleth 無 fill → 灰底。「選主題→22 縣市依該主題著色」這個產品核心對這兩個新主題壞掉。
- **修復計畫：(a) 純前端修** — 在 `App.tsx` `metricValues` 增加 rail / maritime 分支：
  - rail：從 `rail.countyAggregates` 取 `station_count` / `daily_trips_per_station`（daily_trips÷stations）/ `rail_length_km`；`ridership_per_capita` 標 null（待 Sprint 0）。
  - maritime：從 `maritime.countyAggregates` 取 `port_count` / `fishing_port_count` / `fishery_value_billion` / `port_calls_yearly`。
  - 同步把 useMemo deps 補上 `rail.countyAggregates` / `maritime.countyAggregates`。
- **鐵則對照**：違反產品定位（「22 縣市依主題著色」），非 mock 偽裝，但功能殘缺。

---

## ⚓ Maritime（航運）

### ViewA @1440 — 港口數（預設 choropleth）
**✅ 正常**
- 切到航運主題正確。S1 港埠骨架：**277 處總港口**、239 漁港（86.3%）、商港 14、2 縣 0 港。
- S2 海洋經濟：漁業生產量 **723,886 公噸（2024）**、產值 **823 億**（10 年新高）；2015–2024 趨勢圖有真實資料。
- S3 吞吐：95,162 艘次、14.61M TEU、2.17 億噸。
- 標期別「年度·2024」「口徑 collector 2025」、DataSourceBadge 更新 2026-05-13 → 符合鐵則 3。
- DATA GAP 卡列 5 缺口（漁業權面積/燈塔/漁船數/養殖面積/客船航線）明確標 🔴 → 符合鐵則 1。
- 註：manifest 把漁業生產量/產值/進出港/貨櫃量標為「placeholder/Sprint0 缺口」，但**實際已接通真實資料**（fishery_stats_by_county / port_traffic_yearly 表存在）→ manifest placeholder 狀態過時（見 M-5）。

### ViewA — color-metric 切換
**⚠️ 問題**（疊加 X-1：著色本身就壞）
- 圖例 domain 會隨切換更新（機制正常訊號），但見 **X-1**：地圖實際不著色。
- 另：`漁業產值`/`年進出港船舶` 在 manifest 有 `coverage_note`（`maritime.yaml:40-51`，部分縣市無資料），切到這些 metric 時 **UI 無 coverage 警示 badge**。
- **修復：(a) 純前端修** — 切到含 `coverage_note` 的 metric 時於圖例下顯示該 note（warning badge，如「⚠ 僅商港縣市有著色」）。

### ViewA @900 / <720 響應式
**⚠️ 問題（需複驗）**
- KPI grid 用 `repeat(n, minmax(0,1fr))` fluid 欄寬 + `@container dash (max-width:560px)` 容器查詢 4→2 欄 → 設計符合鐵則 4。
- 但 maritime agent 截圖（`/tmp/audit_maritime/viewA_600w.png`）顯示 <720px 右 pane 內容右側被裁切（overflow）。**因 session 污染此截圖可信度低，需在正常 WebGL 環境複驗**。
- **修復：(d) 響應式修（待複驗）** — 若屬實，補 `.dashboard-pane { min-width:0; overflow-x:hidden }` + `.hero h1` word-break。

### ViewA — 商港數 SSOT 不一致
**⚠️ 問題 · DOM 文字可信**
- UI：**「14 處商港（國際 7 + 國內 7）」**；manifest `maritime.yaml:97`：**「國際 7 + 國內 4 = 11」**。差 3 處國內商港。
- **修復：(c) SSOT 對齊** — psql 查 `maritime.ports` 國內商港實數，更新 `maritime.yaml:97` coverage_note 與 UI 對齊。

### ViewA — Top5 商港表第 5 名「(CMA)」資料污染
**🔴 嚴重 · DOM 文字可信**
- S3 吞吐 → TOP5 商港表第 5 列：`05 (CMA) 0 73 0.0%`。「(CMA)」是航商 CMA CGM 縮寫，**非港口名**。
- 推斷 `maritime.port_traffic_yearly.port_name` 欄混入航商名；前端 `deriveTopCommPorts()` 直接以 `port_name` 彙整無過濾。
- **修復：(b) spawn ETL session 清理** — `port_traffic_yearly` ETL 濾除非港口列（含括弧航商名）；**並** (a) 前端 `deriveTopCommPorts` 加防衛 `port_name && !port_name.startsWith("(")`。
- **鐵則對照**：違反鐵則 1（污染值偽裝成真實港口排名）。

### ViewA / ViewB — 燈塔(36 座) / 漁業權水域(19 筆) **未接通**
**🔴 嚴重 · 已 code 驗證 · 直接回答用戶「剛上線確認有沒有接上」→ 沒有**
- 用戶以為「燈塔/漁權剛上線」，**實際根本沒接**：
  - `ViewBMaritime.tsx:15-19` 註：「仍 mock：…漁業權水域 / 燈塔（表不存在）」。
  - `lib/queries/maritime.ts:11` 註：「缺口：fishery_rights / lighthouse **表不存在**」。
  - `useMaritimeData` 只並行拉 3 表（ports / fishery_stats_by_county / port_traffic_yearly），**完全沒拉** lighthouse / fishery_rights。
  - ViewA DATA GAP + ViewB 概覽 KPI 卡均顯示「資料整備中 🔴 表不存在 public.fishery_rights / public.lighthouse 未建」。
- ⚠️ **manifest 自打臉**：`maritime.yaml:391-401` data_sources 寫 fishery_rights「19 筆 polygon，已上線」、lighthouse「36 座，已上線」——與實際（表不存在）矛盾，manifest 過度樂觀。
- 正面：UI 有正確標 🔴 待補、未偽裝成真數字 → **未違反鐵則 1**（誠實揭露缺口）。
- **修復：(b) spawn ETL session** — 走 `/gis-data-onboard` SOP 到 taipei-gis-analytics 搜集：農業部漁業署漁業權水域（19 筆 polygon）+ 航港局全國燈塔（36 座），在 gis-platform 建 `public.fishery_rights` / `public.lighthouse` 表 + 接通 query。**並** (c) 修正 manifest 的「已上線」假宣稱。

### ViewA — manifest 73 筆舊注過時
**⚠️ 問題（低）· (c) SSOT**
- `maritime.yaml:383`：「線上 ports 表僅 73 筆 TDX 子集，Sprint 0 全量同步 277 筆」——但 UI 已顯示 277。註過時。
- **修復：(c)** — 更新 `maritime.yaml:383` 標「ports 已完成 277 筆全量同步」。

### ViewB 高雄 KHH — 概覽 / 港口 / 漁業 / 航線 / 排名
**✅ 大致正常**
- 概覽：港口 27（#3/22）、漁港 19（#4）、漁業產值 326.4 億（#1, 2024）、進出港 29,414 艘次（#1）— 真實 DB。漁業權/燈塔正確標「🔴 表不存在」。
- 港口 tab：總 27 = 漁港 19(70%)+渡輪觀光 7(26%)+國際商港 1(4%)，數字自洽（鐵則 2）。
- 漁業 tab：2024 產量 305,648 公噸、產值 326.4 億（真實 10 年趨勢）；漁船數「🔴 全 NULL 待補」、漁業類別組成 PendingDataCard — 正確標示（鐵則 1）✅。
- 航線 tab 🔴：missing-data-card「離島定期客船航線·表不存在」，PendingDataCard 不展假班次（鐵則 1）✅。
- 排名 tab：4 維度（港口/漁港/產值/進出港）來自真實 `deriveCountyAggregates()` ✅。

### ViewB 南投 NAN（內陸無港對照）
**✅ 優雅降級 +  ⚠️ copy bug**
- 橙色警示「南投縣 為內陸縣市·無港口」，隱藏 5 tabs，KPI 港口/漁港=0 — 清晰 ✅。
- ⚠️ `ViewBMaritime.tsx:145` hero hook 硬寫「…僅 2 個無港者之一（**與南投、嘉義市**）」——當前在 NAN 縣卻說「與南投」自我指涉。
- **修復：(a) 純前端修** — 依當前 county 動態：NAN→「（與嘉義市）」、CYC→「（與南投縣）」。

### ViewB @900 響應式
**⚠️ 需複驗** — session 污染無法取有效截圖；CSS 分析（kpi-grid.cols-4 在 `@media(max-width:1500px)` 折 2x2、<900 折單欄）設計合理。**(d) 待複驗**。

### Maritime 小結
- 🔴 嚴重 3：①(CMA) 航商名污染 top5（鐵則1）②燈塔/漁權未接通+manifest 假宣稱 ③（共通）X-1 choropleth 無效
- ⚠️ 問題 5：商港數 SSOT(14 vs 11)、color-metric 無 coverage badge、NAN/CYC copy bug、manifest 73 筆舊注、響應式截斷（需複驗）

---

## 🚆 Rail（軌道運輸）

### ViewA @1440 — 全台概覽
**✅ 資料正常 + ⚠️ choropleth（見 X-1）**
- 全台 535 站、29 條、1,506 km、3 縣 0 站；每日總停靠 115,619 班（尖峰 33,123 + 離峰 82,496）。資料時間 2026-05-14 標期別 ✅。
- S1 SYSTEMS 表：臺鐵 244站/14條/863.6km、高鐵 12/1/348.5、臺北捷運 139/7/143.9、高雄捷運 39/2/43.2，其餘標「缺資料」非假數字 ✅。
- ⚠️ choropleth 無效見 **X-1**（同 maritime 共通根因）。

### 上輪修復驗證（24hr / 車種 / TOP10 / 貓纜）— **4/4 全修好 ✅**
1. **✅ 24hr 逐時班次**：切系統有重算。全部 115,619 班 / 台鐵 20,684 / 高鐵 1,521 / 捷運+輕軌 93,414，圖說同步更新。`ViewARail.tsx:266` deps `[group.id, data.trips]` 確認。
2. **✅ 車種組成 donut**：台鐵顯車種細分（區間 77.7%/莒光 8.0%/自強 6.4%…）；高鐵顯「單一車組 100%」；捷運顯「各系統自有車組」。`ViewARail.tsx:415` `hasTra` 邏輯正確。
3. **✅ TOP10 停靠車次**：切系統有重算。全部→北投748/七張623…；台鐵→臺北344/板橋344…；高鐵→台中187/台北185…。`ViewARail.tsx:271` deps 確認。
4. **✅ 貓纜污染根治**：TOP10 標題標「已排除貓纜 4 站（962 回填占位，非真實停靠班次）」；`lib/queries/rail.ts:449` `isCableBackfill` 用 `system_id==="trtc" && line_id==="MK"` 精準識別並於 `deriveTopStations`(:471) 過濾。全狀態 TOP1=北投 748（正常值），無 962 或其倍數異常。

### ViewA @900 響應式
**✅ 正常** — 系統表/RANK 顯示正常，KPI grid 維持 2x2 無爆版。

### ViewB 台北 TPE — 概覽 / 車站 / 路線時刻 / 運量 / 排名
**✅ 大致正常 + 2 處 ⚠️**
- 概覽：98 站/8 條/529.2km/42,382 次/日（#1/22, 36.7%）。系統分解臺北捷運 40,616(96%)/臺鐵 1,123(3%)/高鐵 365(1%)/桃捷 278(1%)。2026-05-29 ✅。
- 車站：98 站、平均 432 次/日、最大 748（北投）✅。
- 路線時刻：24hr 圖（尖峰 13,065+離峰 29,317）、TRA 車種 donut（區間 60.6%/自強 14.0%/莒光 9.4%…，台北市內 TRA，與全台不同合理）✅。
- 運量：年度 10.80 億（#1）、人均 434 次/年、日均 296 萬人次。月度資料缺用 missing-data-card 標示，未偽裝 ✅（⚠️ 卡片偏技術感，可讀性可提升，非緊急）。
- **排名 tab ⚠️→（資料正確性）問題**：`lib/queries/rail.ts:554` `const rid = ridCounty.get(c.id_moi) ?? 0;` → :563 算出 `0.00`。桃園/臺中等**無運量資料縣市顯示「0.00 億」排底部，把「無資料」誤當「真實零值」**（鐵則 1 邊界）。
  - **修復：(a) 純前端修** — `:554` 去掉 `?? 0`；`:563` 改 `ridership24: rid != null ? Number((rid/1e8).toFixed(2)) : null`；ViewBRail 排名卡對 `null` 顯示「—」。

### ViewB 澎湖 PEH（無軌道對照）
**✅ 正常** — 「離島無軌道」標題，系統欄「無」，提供海運/道路/民航替代卡片，無 0 值/mock。

### ViewB @900 響應式
**⚠️ 問題** — 頂部「⭐ 跨縣市：臺北捷運 7 條跨臺北+新北」文字在 header KPI 行被截斷（`overflow:hidden` 未換行）；KPI grid 900px 下維持 4 欄偏窄，「日均車次」數字被截出右邊界。
- **修復：(d) 響應式修** — 跨縣市 badge 行 <1100px 改自動換行；KPI grid <1000px 改 2x2。

### 程式碼稽核（grep 佐證）
- `ViewARail.tsx` / `ViewBRail.tsx` / `lib/queries/rail.ts`：無 mock / Math.random / 寫死數字。貓纜僅出現在註釋+UI 說明文字，排除邏輯用 `line_id='MK'` 精準。✅

### Rail 小結
- 🔴 嚴重 2：①（共通）X-1 choropleth 無效 ②排名 tab 無資料縣市顯 0.00 非「—」（鐵則 1 邊界）
- ⚠️ 問題 1：ViewB 900px 響應式截斷（跨縣市 badge + KPI grid）
- 上輪 4 bug 修復：**4/4 全數驗證修好** 🎉

---

## 🎯 優先級總表（先修哪些）

| # | 嚴重 | 主題 | 問題 | 修復分類 | 工作量 | 鐵則 |
|---|---|---|---|---|---|---|
| 1 | 🔴 | **rail+maritime** | X-1 choropleth color-metric 切換地圖永遠灰底（核心功能殘缺）`App.tsx:197-291`+`mock-data.ts:161` | **(a) 純前端** | 中（加兩主題 metric 分支） | 產品定位 |
| 2 | 🔴 | maritime | 燈塔(36)/漁權(19) 未接通（表不存在）+ manifest 假宣稱「已上線」 | **(b) ETL** + (c) | 大（建 2 表+ETL） | 1(誠實揭露 OK)/3 |
| 3 | 🔴 | maritime | port_traffic top5 第 5 名「(CMA)」航商名污染 | **(b) ETL 清理** + (a) 前端防衛 | 中 | 1 |
| 4 | 🔴 | rail | 排名 tab 無資料縣市顯 0.00 非「—」`rail.ts:554-563` `?? 0` | **(a) 純前端** | 小 | 1(邊界) |
| 5 | ⚠️ | maritime | 商港數 SSOT 不一致 UI 14 vs manifest 11 | **(c) SSOT** | 小 | 2 |
| 6 | ⚠️ | maritime | color-metric 含 coverage_note 切換無警示 badge | **(a) 純前端** | 小 | 1 |
| 7 | ⚠️ | maritime | ViewB NAN/CYC 內陸 copy 自我指涉 `ViewBMaritime.tsx:145` | **(a) 純前端** | 小 | — |
| 8 | ⚠️ | rail | ViewB 900px 跨縣市 badge + KPI grid 截斷 | **(d) 響應式** | 小 | 4 |
| 9 | ⚠️ | maritime | manifest:383 「73 筆」舊注（已 277） | **(c) SSOT** | 極小 | 2 |
| 10 | ⚠️ | maritime | ViewA <720px / ViewB 900px 響應式截斷（**需正常環境複驗**） | **(d) 響應式（待複驗）** | 小 | 4 |

**建議批次**：
- **第一批（純前端，1 個 commit 可清）**：#1 + #4 + #6 + #7 — 都是 (a)，影響大/工作小，無 ETL 依賴。
- **第二批（SSOT 文件對齊）**：#5 + #9 + #2 的 manifest 假宣稱修正 — 純改 yaml。
- **第三批（spawn ETL session）**：#2 燈塔/漁權建表接通 + #3 port_traffic 清理 — 走 `/gis-data-onboard` SOP 到 taipei-gis-analytics。
- **第四批（響應式，需正常 WebGL 環境複驗後修）**：#8 + #10。

=== DONE audit_maritime_rail ===
