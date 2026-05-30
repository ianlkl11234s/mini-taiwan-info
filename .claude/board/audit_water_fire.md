# 稽核報告：water（水資源）+ fire（消防）兩主題全分頁

> 稽核日期 2026-05-30 · 方法 agent-browser read-only（**未改任何 code、未 commit**）· dev server `localhost:5175`
> 稽核員：2 個平行 auditor agent（water / fire）各跑 agent-browser + grep 佐證，主 agent 彙整並 spot-check 關鍵程式碼指控

## ⚠️ 方法限制（影響判讀，務必先讀）

1. **地圖 choropleth 著色無法目視驗證**：agent-browser headless 無 GPU，Mapbox 拋 `Failed to initialize WebGL`（`MapView.tsx:66`），左側地圖全程顯示 ErrorBoundary「地圖載入失敗」——**這是稽核環境限制，非 app bug**。因此 color-metric 切換改以「legend 標題/級距 + radio checked state + 右側面板資料」**間接驗證**（結論：metric 連動邏輯正常）。**地圖 4 色 choropleth 變化 + fire 4 個地圖圖層開關內容，需在有 GPU 的真實瀏覽器補測。**
2. **本機並行 session 串擾**：稽核當下本機同時有多個 agent-browser session（home/water/demo/fire），fire session 一度被切到他主題；已用 deeplink + 標題 guard + 重試 loop 確保採信資料都在正確主題狀態下擷取。
3. 標 ✅✔ 的程式碼行號為主 agent **已 spot-check 驗證**；其餘為 auditor 回報之截圖觀察。

---

# 一、WATER（水資源）

## ViewA 全國概覽 — ✅ 正常（dashboard pane 零 mock）
- **color-metric 切換（7 radio）全部連動正常**：lpcd→legend「人均日用水量(L) 180–340」、reservoir_rate→「蓄水率(%) 25–100」、sewage_coverage→「汙水接管率(%) 0–100」、rain_24hr→「24hr均雨量(mm) 0–45」、flood_high_risk_pct→「淹水高潛勢(%) 0–35」、river_alert_pct→「河川警戒站佔比(%) 0–50」、無染色→legend 隱藏。每個 radio 正確 `[checked]`，級距 reactively 重算。
- **signature 三模式正常**：bucket（紅線<30% 點開列 9 座真實水庫：霧社21.7%/集集6.0%/曾文9.2%…）、region bar、scatter（log x 軸 容量×率）全渲染。
- **flood 情境鈕**：350mm→0.4%（真實），200/500mm→「—%」+「⚠ 僅 350mm 已接通，其餘待 RPC 擴充」（誠實標示，鐵則1 OK）。
- dashboard pane（`ViewAWater.tsx`）**零 mock/hardcode**，6 段 S1–S6 全接 `useWaterKpis()` 真實 Supabase。`ViewA.tsx` 內的 `WATER_*_MOCK` 是 dead code（`App.tsx:604` 確認 water 走 `ViewAWater`，不經過）。
- **⚠️ 唯一異常**：水庫總數三套數字不一 → 見問題 W4。

## ViewB — 臺北市（資料多）
| tab | 狀態 | 現象 |
|---|---|---|
| 概覽 | ✅ | 248.8萬人/271km²/0座水庫/LPCD 337L(+64)/接管率100%。汙水廠「—座 待 Phase 1+」誠實 placeholder |
| 水庫 | ✅ | 「該縣市無主要水庫」誠實；水質 DO ranking 8/22，標「⚠ 非 LIVE·月度採樣」 |
| 河川 | ✅ | 7 水位站（萬福橋12.86m=overview「最高12.9m」一致），合法 LIVE（每10分）；水質9站「無資料」+「🚧 reading pipeline 待補」誠實 |
| 地下水 | ✅ | 21 井，合法 LIVE（每小時 cron）；井位 1↑19↓1—=21 一致；水質17站無資料 |
| 防洪 | ⚠️ | (1) **滯洪池17座 設計總容量 0.0萬m³**（有座數卻容量 0，疑 NULL 偽裝成真實 0，`ViewB.tsx:1079` 區塊）；(2) **LIVE 誤標**（見 W2） |
| 用水與配送 | ✅ | 標「⚠ 全部年度/靜態（非 LIVE）」誠實；LPCD trend 2008–2024；漏水率「COVERAGE 不全」誠實警告 |
| 排名 | ⚠️ | LPCD「越低越好→22/22」、接管率「越高越好→1/22」本 tab 內部正確，但與概覽 tab 名次矛盾（見 W1）+ LPCD 標 LIVE 誤標 |

## ViewB — 連江縣（資料少 / 離島）— ✅ 資料缺口處理典範
- 全部誠實標示：水庫「無主要水庫」/河川「無水位站 reading」/地下水「⚠ 不在水利署西部9分區涵蓋」（具體原因）/防洪滯洪池「資料未開放·不在 dataset 涵蓋」/即時雨量站 4 站（合法 LIVE）/用水配送年度 trend 正常。
- **但複現 W1**：概覽 LPCD「21/22 後段」vs 排名「2/22 越低越好」→ 證實排名方向矛盾為**系統性**（非單縣偶發）。

## ViewC — 翡翠水庫詳情 — ✅ 正常
- 蓄水率 88.0%（與 ViewA bucket 88.0% **SSOT 一致**）、水位161.3m、有效容量34,409萬m³、蓄水量29,349.1萬m³；1年 trend + 30%警戒紅線渲染正常；META 完整（座標/入流24.71cms/出流0.00）；合法 LIVE（每小時 realtime.reservoir_status）。
- ℹ️ 輕微：蓄水量/容量=85.3% 與顯示蓄水率 88.0% 略落差（疑不同基準容量）；trend 標「1年」但 x 軸僅 04-17~05-30 標籤（label 壓縮，非資料缺）。

---

# 二、FIRE（消防）

## ViewA 全台概覽 — ⚠️ 問題（口徑混用 + SSOT）
- **color-metric 切換（4 radio）全部連動正常**：火災密度→legend「件/萬人 0–15」、分隊密度→「隊/萬人 0–14」、5min圈外→「% 0–30」、消防栓密度→「個/km² 0–120」。
- **正常項**：縣市排名件數加總=15,384=KPI ✅；分隊量能表加總=716=KPI=副標 ✅；起火原因件數一致；財損「2020 only」badge、消防栓「限高雄/待ETL補欄位」、救護「僅2縣市完整其他待ETL」皆有來源標示。
- 🔴 **SPLIT 組成佔比口徑矛盾**：副標寫「相同 **15,384** 件的不同切片」，但時段四段加總=**48,626**（民111–113 三年總和）。標題單年、數據三年（見 F1）。
- 🔴 **救護出勤 KPI 誤導**：KPI「全國 1.8 萬次」，但 EMS 表 22 縣市僅台南 17,708 有值、其餘全「—」→把**台南一個縣市**當全國 KPI（見 F5）。
- ⚠️ 消防栓數字 SSOT 不一（見 F2）。
- ⚠️ **缺年份篩選**：有 年/月/日/時段、早中晚、5大類等切片鈕（運作正常），但**沒有「年份」篩選** → 三年資料無法選年，使口徑混用無法由用戶自校。

## ViewA 900 寬 — ⚠️ 響應式
- 頁面級無橫向溢出，但 **dashboard pane 內 2 欄 KPI 卡右緣被裁**（「死亡/受傷」卡「較去」被切、主因卡右緣切）。鐵則4（見 F8）。

## ViewB — 臺北市（資料多）
| tab | 狀態 | 現象 |
|---|---|---|
| 概覽 | ⚠️ | KPI/雷達圖/起火原因（5類=100%、件數1,137）正常；但**消防分隊「46個」標「待 Sprint2 ETL」、5min圈外「0.0%」標「待 Sprint3 ETL」**，同指標在救災量能/服務圈 tab 卻標「已接通」→ 跨 tab 矛盾（見 F6） |
| 火災發生 | 🔴 | **月度分布口徑錯**：標題「民113」，12月加總=**3,957件** vs 台北全年實際**1,137件**（差3.48×，月均應≈95卻顯示267~392）。根因 F1。另財損「每件0.6千」vs 連江「每件34.5千」差約10倍（見 F7） |
| 救災量能 | ⚠️ | 46 個真實分隊名（中崙/信義/內湖…）✅；但**消防栓 43,724 個**——ViewA 台北標「—（待ETL）」「僅高雄完整」卻 fetch 到值（`ViewBFire.tsx:153 hydrantCount`），資料污染/SSOT（見 F2） |
| 服務圈 | 🔴 | **硬編碼魔術係數**（見 F3）；概覽標圈外「待Sprint3」、此 tab 標「已接通MV」矛盾 |
| 其他救護 | ✅ | 做得最好：救護「無縣市資料 —」、OHCA「—」、避難收容272處（safety.emergency_shelters）、災變真實（康芮颱風 士林區）、收容所真實。無資料明確標、來源齊全 |

## ViewB — 連江縣（離島 / 資料少）
| tab | 狀態 | 現象 |
|---|---|---|
| 概覽 | ✅ | 16件/0死、排名22/22、起火原因=16一致、雷達圖正常、空狀態處理得當（同台北的分隊/圈外「待ETL」badge 矛盾） |
| 火災發生 | 🔴 | 月度加總=**49件** vs 全年**16件**（差3×，同 F1 三年累計 bug） |
| 救災量能 | ⚠️ | 7 個真實分隊名 ✅、消防栓「無資料·限高雄已接通」✅，但警示文寫高雄「39,395 個」（與 F2 三值之一） |
| 服務圈 | 🔴 | KPI「5min圈外 712人/5.5%」、buffer圖例「圈外5.5%」，但圈外村里表寫「**該縣市無3km圈外村里—全村里在3km內**」→ **5.5%圈外 vs 無圈外直接矛盾**（outOf5MinPct 與 uncovered_villages MV 未對齊）+ magic factor 同 F3（見 F4） |
| 其他救護 | ✅ | 全部誠實標示，避難所26處真實、災變3筆真實 |

## ViewB 900 寬（台北救災量能）— ⚠️ 響應式
- 頁面無橫向溢出，但 dashboard pane 內：**KPI卡右緣裁切**（面積密度卡）、**5個tab列擠不下**（「其他救護」被切成「其他救」）、「+加入比較」「+」被切、雷達圖右半軸標籤被切。鐵則4（見 F8）。

---

# 三、問題明細 + 修復計畫

> 修復分類：**(a) 純前端修** / **(b) spawn ETL session 去 taipei-gis-analytics 搜集·清理資料** / **(c) SSOT 對齊** / **(d) 響應式修**

## WATER

### 🔴 W1 — LPCD 排名兩 tab 方向相反（系統性 SSOT 矛盾）
- **現象**：同縣同指標 LPCD，概覽 tab=「1/22 前段」（高用水量=第1），排名 tab=「22/22 越低越好」（高用水量=最差）。台北 1 vs 22、連江 21 vs 2，兩 tab 用相反排序方向，使用者會混淆台北到底排第幾。
- **位置**：`ViewB.tsx` 概覽 tab vs 排名 tab 的排名計算邏輯。
- **鐵則**：鐵則2（SSOT）。
- **修復 (a) 純前端**：統一兩 tab 的排序語意——概覽 tab 明確標「按用水量高→低」、排名 tab 已標「越低越好」，並讓兩處名次一致（或補一行口徑說明，闡明「用水量高 ≠ 用水效率好」）。

### 🔴 W2 — LIVE 誤標（違反 CLAUDE.md「LIVE 用詞嚴守」）
- **現象（已驗證行號）**：年度/靜態指標掛 LIVE badge：`ViewB.tsx:288`(LPCD 年度) `:304`(接管率 年度) `:1011`(淹水高潛勢 MV靜態) `:1079`(滯洪池 靜態infra) `:1128`(雨水下水道 靜態) `:1455`(排名LPCD 年度)。
- **註**：`:510`(河川水位每10分) `:782`(地下水每小時) `:1173`(即時雨量站) 是**合法 LIVE**（`:499` 有 cron 註解佐證），**不要動**。
- **鐵則**：鐵則3 + LIVE 規範。
- **修復 (a) 純前端**：把 288/304/1011/1079/1128/1455 的 `liveBadgeStyle` LIVE 移除，改用 `<DataAgeBadge>` 自動分類，或標「年度2024」「靜態」。

### ⚠️ W3 — 滯洪池 17 座但設計總容量 0.0萬m³
- **現象**：臺北防洪 tab 滯洪池有 17 座座數，但「設計總容量 0.0萬m³」，疑 NULL 偽裝成真實 0。
- **位置**：`ViewB.tsx:1079` DETENTION 區塊（`detention_basins` 表）。
- **鐵則**：鐵則1（缺值偽裝成真實 0）。
- **修復 (b) ETL**：查 `detention_basins` 容量欄是否為 NULL → 若缺值，前端改標「容量待補/—」，**不顯示 0.0**；若上游真的就是 0 則加註說明。

### ⚠️ W4 — 水庫總數 37/34/32 三套不一
- **現象**：KPI 卡「主要水庫 37 座」/「高警戒 全國 37 座中」、POINTS「點位概況 34 座」、地理區 mode 北9+中6+南13+離島4=**32**。同一「全國水庫宇宙」三個值。
- **位置**：`ViewAWater` S1 KPI / PointProfile / region 聚合。
- **鐵則**：鐵則2（無單一權威水庫 count）。
- **修復 (c) SSOT**：統一「主要水庫」universe 定義（是否含攔河堰/離島），三處同 count，或明確標口徑差異。

### ⚠️ W5 — 900px ViewB 橫向爆版
- **現象**：viewport<1080px 時 dashboard pane 右側內容被裁（加入比較鈕剩「+」、KPI卡/station列超出）。根因 `globals.css:169` split `minmax(520px,52fr) minmax(560px,48fr)` = 最小 1080px，**無 pane stacking 斷點**。
- **位置**：`globals.css:169-194`（缺 <1080 stacking media query）；內部 section 固定欄寬 `:684,696,1131,1865`。
- **鐵則**：鐵則4。
- **修復 (d) 響應式**：加 `@media(max-width:~1080px){ .split → grid-template-columns:1fr }` 讓 pane 垂直堆疊；固定 px 欄寬改 fluid（`1fr`）。

### ℹ️ W6 — 寶山第二水庫 106.1%（蓄水率>100% 無說明）
- **修復 (b)**：確認上游（>100%=溢流仍可能），保留則加註，避免誤判為錯誤。

### ℹ️ W7 — ViewC 蓄水量/容量比(85.3%)與顯示蓄水率(88.0%)落差；trend「1年」x 軸僅近期標籤
- **修復 (a)**：輕微，確認基準容量定義 / trend 軸標籤間距。

## FIRE

### 🔴 F1 — 月度/時段分布「三年累計」卻標「單年」（root bug）
- **現象**：台北火災發生 tab 月度12個月加總=3,957 ≠ 全年1,137（3.48×）；連江=49 ≠ 16（3×）；ViewA SPLIT 時段加總=48,626 ≠ 標題15,384。
- **根因（已驗證）**：`lib/queries/fire.ts:135-140` `IncidentsByHourMonthRow` **無 year 欄位**（只有 county_id/month/hour/incident_count）→ MV `fire_incidents_by_hour_month` 是民111–113 三年合併聚合，月度 sum 把三年加起來；而 KPI `merged.incidents` 用單年。`ViewBFire.tsx:790-800` filter county 正確，但拿到的本來就是三年資料。
- **鐵則**：鐵則2 + 鐵則3。
- **修復 (b)+(c)**：MV `fire.incidents_by_hour_month` 加 `year` 維度（根治），`fire.ts` row 加 year 欄位 + query 帶 year filter；前端 SPLIT/月度圖改 filter 單年或文案改標「民111–113累計」。

### 🔴 F2 — 消防栓數字三值打架（SSOT）
- **現象**：高雄 ViewA=91,691 / S2 註解 & 連江警示文=39,395 / 台北莫名=43,724（ViewA 台北本標「—（待ETL）」「僅高雄完整」）。
- **位置**：`S2Response.tsx:39`、`ViewBFire.tsx:153 hydrantCount`、截圖。
- **鐵則**：鐵則2。
- **修復 (b) 清資料 +(c) SSOT**：釐清消防栓資料真實涵蓋哪些縣市（若僅高雄完整，台北 43,724 是資料污染要查來源），三處統一同一權威值/口徑。

### 🔴 F3 — service buffer 硬編碼魔術係數（已驗證）
- **現象（已驗證行號）**：`ViewBFire.tsx:1107` `約 {((100 - merged.outOf5MinPct) * 0.7).toFixed(0)}% 人口涵蓋`、`:1114` `約 {(100 - merged.outOf5MinPct * 0.4).toFixed(0)}%`。台北 outOf5MinPct=0 → 3km顯示「約70%」、6km「約100%」。**台北「全村里在3km內」卻顯示「3km僅約70%」自相矛盾**，0.7/0.4 係數無依據、無「估」badge。
- **鐵則**：鐵則1（偽估算偽裝成真）。
- **修復 (a) 純前端**：移除 magic factor 0.7/0.4，改用真實 buffer 涵蓋率（若無真實資料）標「粗估」badge 或直接拿掉這兩行涵蓋率文字。

### 🔴 F4 — 連江「圈外5.5%(712人)」vs 圈外村里表「無圈外」矛盾
- **現象**：服務圈 tab KPI「5min圈外 712人/5.5%」+ buffer圖例「圈外5.5%」，但圈外村里表寫「該縣市無3km圈外村里—全村里在3km內」。
- **位置**：服務圈 tab，`outOf5MinPct` MV 與 `uncovered_villages` MV 未對齊。
- **鐵則**：鐵則2。
- **修復 (c) SSOT**：對齊兩個 MV 的「圈外」定義（5min 圈外人口 vs 3km 圈外村里口徑不同 → 至少標清兩者口徑差異，避免顯示成互相矛盾）。

### ⚠️ F5 — 救護出勤全國 KPI=1.8萬 實為台南單縣
- **現象**：ViewA Section04 EMS 表 22 縣市僅台南 17,708 有值、其餘「—」，KPI 卻顯示「全國 1.8 萬次」。
- **鐵則**：鐵則2 +（鐵則1 誤導）。
- **修復 (a)**：KPI 標「僅台南有資料」或不顯示全國值（改顯示「資料涵蓋 1/22 縣市」）。

### ⚠️ F6 — 同指標跨 tab 標示矛盾（分隊/圈外）
- **現象**：ViewB 概覽 tab 標分隊「待 Sprint2 ETL」、圈外「待 Sprint3 ETL」，但救災量能 tab 標分隊「已接通」、服務圈 tab 標圈外「已接通MV」。
- **鐵則**：鐵則2。
- **修復 (a)**：移除概覽 tab 已接通指標的「待 ETL」badge。

### ⚠️ F7 — 財損「每件X千」差約10倍（單位疑誤）
- **現象**：台北「每件0.6千」(7百萬/1137=6.16千)、連江「每件34.5千」(6百萬/16=375千)，差約10倍。財損本身是 mock「待MOI ETL」，影響次要。
- **修復 (a)**：確認「每件財損」單位換算邏輯（財損總額單位 vs 件數）；財損真資料接通前此格保持 mock badge。

### ⚠️ F8 — 900寬 dashboard pane 內 KPI卡/tab列右緣裁切（ViewA+ViewB 皆有）
- **現象**：900px 時 KPI 卡右緣被切、5 個 tab 列擠不下（「其他救護」→「其他救」）、「+加入比較」被切、雷達圖右半軸標籤被切。
- **鐵則**：鐵則4。
- **修復 (d)**：tab 列窄 pane 改可橫滾或縮字、KPI grid 窄 pane 降單欄（與 W5 同源，建議一起修 split 斷點）。

### ℹ️ F9 — console `<rect> negative height` SVG 警告
- 疑與地圖 WebGL crash 連帶，非 fire 專屬，真實環境複驗。

---

# 四、優先級總表（🔴 先修）

| 序 | 主題 | 問題 | 嚴重度 | 分類 | 為何優先 |
|---|---|---|---|---|---|
| 1 | fire | **F1 月度/時段三年累計標單年**（月度3,957≠全年1,137） | 🔴 | (b)+(c) | 真實數字彼此矛盾、加總≠KPI，最傷對外信任；且是 root bug（ViewA+ViewB 多處同源） |
| 2 | fire | **F2 消防栓三值打架**（高雄91,691/39,395、台北43,724） | 🔴 | (b)+(c) | 同指標三個值 + 台北疑資料污染 |
| 3 | fire | **F3 service buffer 硬編碼 0.7/0.4 魔術係數** | 🔴 | (a) | 違鐵則1（偽估算偽裝成真），純前端即可修，CP 值高 |
| 4 | fire | **F4 連江圈外5.5% vs「無圈外」矛盾** | 🔴 | (c) | 同畫面自相矛盾 |
| 5 | water | **W1 LPCD 排名兩 tab 方向相反** | 🔴 | (a) | 系統性 SSOT 矛盾，純前端可修 |
| 6 | water | **W2 LIVE 誤標**（288/304/1011/1079/1128/1455） | 🔴 | (a) | 違反 LIVE 嚴守規範，對外承諾即時性名實不符 |
| 7 | water | W3 滯洪池 0.0萬m³ 容量 | ⚠️ | (b) | 缺值偽裝成 0 |
| 8 | water | W4 水庫總數 37/34/32 不一 | ⚠️ | (c) | SSOT |
| 9 | fire | F5 救護全國KPI=台南單縣 | ⚠️ | (a) | 誤導 |
| 10 | fire | F6 同指標跨tab待ETL/已接通矛盾 | ⚠️ | (a) | 標示一致性 |
| 11 | water/fire | W5+F8 **900px dashboard pane 爆版**（同源 split 斷點） | ⚠️ | (d) | 違鐵則4，建議一起修 `globals.css:169` split <1080 stacking |
| 12 | fire | F7 財損每件單位疑誤 | ⚠️ | (a) | 次要（財損仍 mock） |
| — | fire | F9 SVG console 警告 / W6 寶二106% / W7 ViewC基準 | ℹ️ | — | 低優先，真實環境複驗 |

## 純前端 vs 需 ETL session 分流建議
- **純前端 (a) 可立刻修**：F3、F5、F6、W1、W2、W7（6 項，含 2 個 🔴）
- **響應式 (d)**：W5+F8（同源，一起修 split 斷點 + fluid 欄寬）
- **SSOT 對齊 (c)**：W4、F4（口徑統一）
- **需 spawn ETL session 去 taipei-gis-analytics (b)**：**F1（MV 加 year 維度，root bug）**、F2（消防栓資料清理/釐清涵蓋）、W3（滯洪池容量欄查 NULL）、W6（>100% 上游確認）

## 必須補測（本次 headless 限制未驗）
- 地圖 choropleth 4 色變化（water 6 metric / fire 4 metric）
- fire 4 個地圖圖層開關（heatmap/stations/hydrants/service buffer）開了有沒有東西
- → 在有 GPU 的真實瀏覽器（非 headless）複驗。

---

截圖：`/tmp/audit_water_*.png`（23 張）、`/tmp/audit_fire_*.png`（14 張）

=== DONE audit_water_fire ===
