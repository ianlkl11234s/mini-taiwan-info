# 稽核 Board — demographics(人口) × home-basics(基礎統計)

> 稽核日期：2026-05-30 · 方法：agent-browser（Playwright，read-only）系統性逐分頁 + 程式碼對照 + 多寬度響應式
> dev server：`http://localhost:5174`（5173 被占）· 全程未改任何 code、未 commit
> 截圖：`.claude/board/shots/demo/`（24 張）、`.claude/board/shots/home/`（20 張）

## 環境註記（非 app bug）
- agent-browser **headless 模式 WebGL 初始化失敗** → 地圖一律掉「地圖載入失敗」ErrorBoundary（`MapView.tsx:66`）。
- home-basics agent 改用 `--headed` 後地圖/choropleth/圖層控制全部正常，其結論以 headed 為準。
- demographics agent 未跑 headed，但 MapLegend / ranking / dashboard 皆純 DOM/SVG，資料層全可驗證；choropleth 著色未能目視（已用 MapLegend 漸層重算間接確認 color-metric 切換有效）。

---

# 主題 A：demographics（人口）

## A-1 · ViewA 全國概覽 — 🔴 嚴重

### 🔴【鐵則1 違反】出生/死亡絕對值錯一個數量級，且偽裝成真實年度數
- 畫面（2024）：全國出生 **12,496 人**、死亡 **17,445 人**、自然增加 **−4,949**。
- agent 直查 `spatial.national_population_trend`（Accept-Profile: spatial）確認 **DB 原值即如此**（113 年 births=12496 / deaths=17445）。
- 台灣 2024 實際出生約 **13.5 萬**、死亡約 **20 萬** → 畫面值約只有 **1/10**。
- **強烈疑似 ETL 存了「單月」當「年度」**：134,856/12 ≈ 11,238、202,000/12 ≈ 16,833，與畫面 12,496 / 17,445 量級吻合。
- 來源 `demographics.ts:496-498` → 渲染 `ViewADemographics.tsx:404-419`，**無任何口徑/異常標示**，使用者會誤信為真。
- `total_population 23,400,220`（trend 表）本身正確；趨勢方向（2021 死亡交叉、近年轉負）正確 — **只有出生/死亡絕對值錯量級**。
- **修復計畫**：
  - (b) **spawn ETL session** 去 `taipei-gis-analytics` 重抓戶政司全國年度出生/死亡，修 `spatial.national_population_trend.total_births / total_deaths`（確認是否誤存單月）。
  - (a) 短期前端：在 KPI 加「口徑存疑/待核」標示，先別讓假小數字裸奔。

### ⚠️【互動/資料】自然增加 Top5 排序與數值不一致
- 「自然增加 Top5」顯示：桃園 239 / 連江 7 / 澎湖 4 / 新竹市 6 / 金門 14 — **非遞減**（按 value 應為 239/14/7/6/4）。
- 根因：`ViewADemographics.tsx:507-508` 對 `naturalRank.slice(0,5)` 取 `Math.abs` 後渲染；footer（:519）卻說正值僅 3 個（桃園/連江/澎湖），與 bar 列出 5 縣矛盾。底層 `c.natural` 來自 village 12 月當月值（`demographics.ts:618` 自承），與全國 KPI 口徑不同。
- **修復**：(a) 前端 — Top5 只列正值或正確遞減排序；根因同上 (b)。

### ⚠️【鐵則4 響應式】dashboard pane 固定 500px，<900 寬右側被裁
- eval 實測：@900 / @820 時 `.dashboard-pane` clientWidth **恆 500px**（未隨 viewport 縮放，也非 viewport×40%＝328px）。
- @820 可見：標題「分布劇烈遷移」被切、性別比 bar「1183.7 萬♀」被切、stat-tile 第二欄（戶量 2.47）裁半、GROWTH ranking 數值被切。pane 內無 hOverflow（scrollWidth=clientWidth=500），是 pane 整體被 viewport 邊緣 clip。@1600 正常。
- **修復**：(d) 響應式 — pane 改 viewport 比例（如 `40vw`）而非固定 500px，或設整頁最小寬度斷點。

### ✅ 正常（且誠實）
- 總人口 23,299,132（現住人口·2025），口徑註記完整：「※口徑：現住人口·2025…與首頁戶籍登記口徑不同」（鐵則2 達標）。
- 金字塔 **21 組·2025**（0-4/5-9/10-14 確實細分；2024 為 19 組），男女最大 45-49（男 978,049/女 1,020,299），**無重複組/全 0/負值**，80+ 女多於男合理 → **混粒度處理正常**。
- 性別比 96.84、密度 644、戶量 2.47、扶養比 46.1%、10 年成長 −0.8% 皆合理；老化指數 174.2；ranking（最老嘉義 291.7 ↔ 最年輕新竹 101.9）合理。
- 期別 badge「年度·2025」各章節都有（鐵則3 達標，僅出生死亡章節例外）。
- **color-metric 切換器有效**：5 選項（無染色/老化/總人口/密度/10年成長）radio 切換正常，MapLegend 漸層+刻度每次正確重算（老化105–287→總人口→密度1075–2035→成長率 −15~+15 雙極），無 fetch error。
- 註：右側 ranking 不隨 metric 變（固定成長/密度/老化三組）是**設計**，非「切了不動」bug。

## A-2 · ViewB 新北市（NTP）— 🔴

- **✅ 概覽 tab**：人口 404.5 萬(#1/22)、老化 185.5、扶養 44.3%、10 年 +1.9%；TREND 標「端點 real，中間線性內插」口徑誠實；頂部 chip-KPI 與詳情卡數值一致（SSOT OK）。
- **✅ 年齡結構 tab**：金字塔 21 組·2025；中位數 45.3、性別比 94.2；RADAR 三段（幼 10.8%/壯 69.3%/高齡 19.9%）清楚。
- **🔴 人口動態 tab**：2024 出生 **1,573**、死亡 **2,611**、自然增加 −1,038，全標「**村里加總(實)**」「**戶政司年度**」。新北 404 萬人一年出生實際約 2 萬+ → 畫面約 1/13。**「(實)」「戶政司年度」標籤強化「真實年度數」的誤導（鐵則1）**。社會增加 +74,187、淨 +73,149 量級合理。下方 PendingDataCard「縣市別出生/死亡逐年趨勢…待戶政司月報 ETL」**明顯標示** ✅。修復 (b)+(a)（同 A-1）。
- **⚠️ 城鄉分布 tab**：日夜人口比顯示「資料整備中 🔴 待修 **statistical_areas county 欄 mojibake**」、紅卡「county 欄 **mojibake**，22 縣市拆分待修」。待補本身有標示（合鐵則1），但 **schema 名 / "mojibake" / bug 術語直接出現在對外畫面 = 不專業**。戶量 2.26、TOWNS 鄉鎮排名（板橋 553,538… 遞減正確）正常，「town 面積待補·改密度」明顯標示。修復：(a) 把術語改 user-facing 文案 + (b) 修 `statistical_areas` county mojibake/日夜人口比。
- **⚠️ @900 響應式**：同 A-1，pane 固定 500px，第 4 個 chip-KPI「+1.9% #8/22」「vs 全國 +11.3」、詳情卡右側被裁。修復 (d)。

## A-3 · ViewB 連江縣（LCC，離島最小）— 🔴（同根因）
離島小縣資料品質意外完整，無破圖/空組。
- **✅ 概覽**：1.4 萬人(#22/22)、老化 180.2、TREND 內插標註。
- **✅ 年齡結構**：金字塔 21 組無空組；性別比 **138.6**（男最大 30-34、女最大 60-64）= **馬祖駐軍多的真實現象，非資料錯誤**。
- **🔴 人口動態**：2024 出生 **10 人**、死亡 **3 人**、自然增加 +7，標「村里加總(實)」「戶政司年度」。連江 1.4 萬人一年出生實際約 100+ →「10 人」明顯殘缺口徑（同 A-1 根因）。社會增加 +1,074、淨 +1,081 合理。PendingDataCard 明顯標示 ✅。
- **✅ 城鄉分布**：密度 473、戶量 3.35、TOWNS 4 鄉全列（南竿 7815/北竿 3062/東引 1555/莒光 1518 遞減正確）；日夜人口比同樣「待修」術語洩漏問題。

## A-4 · ViewC — ✅
實測 `view=C`：掉到「View C / Phase 0b 尚未實作（待 Phase 0c+）」+ 返回鈕。**明顯標示未實作，非偽裝**，符合預期（demographics 未接線 ViewC，僅 water 有）。

### demographics 小結
| 嚴重度 | 問題 | 範圍 | 修復 |
|---|---|---|---|
| 🔴 | 出生/死亡絕對值錯一個數量級（全國 12,496/17,445；新北 1,573/2,611；連江 10/3），且標「(實)/戶政司年度」偽裝成真 | ViewA S3 + ViewB 人口動態（全縣市） | (b) ETL 重抓年度出生死亡 + (a) 短期標口徑存疑 |
| ⚠️ | 自然增加 Top5 排序/數值與 footer 矛盾 | ViewA S3 | (a)前端 +(b)根因 |
| ⚠️ | 「statistical_areas county 欄 mojibake」開發術語顯示給使用者 | ViewB 城鄉分布（全縣市） | (a)文案 +(b)修日夜人口比 |
| ⚠️ | pane 固定 500px，<900 寬右側被裁 | ViewA + ViewB 全頁 | (d)響應式 |
- **正向**：金字塔混粒度、人口/老化/密度/扶養/性別比/戶量/ranking、TREND 內插標註、現住 vs 戶籍口徑註記、PendingDataCard、ViewC placeholder、color-metric 切換器 — 全部正常且誠實。離島小縣資料完整。

---

# 主題 B：home-basics（基礎統計）

## B-1 · ViewA 全國概覽（ViewAHome，混合 demographics+home）— 🔴

### ✅ 全國 KPI 主體數字內部自洽
- 人口 23,262,544 = 男 11,439,382 + 女 11,823,162 ✓；三段年齡 11.40%/68.24%/20.36%（2,652,508+15,873,366+4,736,670=23,262,544）✓；性比例 96.75、老化 178.57、扶養 46.55%。對齊 hardcode SSOT `national-basics.ts:75-96`。
- 期別清楚：「月度·2026-04」「資料時間 2026-04 月底·內政部戶政司」；行政區/國土標「靜態」。鐵則3 ✓。
- （註：此頁全國總人口 hardcode 自 `data/national-basics.yaml`，是有意 SSOT，非偷渡 mock。）

### 🔴【鐵則2 + 對外算術錯】H5 人口動態「自然增加率」假等式
- 畫面寫「出生率 − 死亡率 ＝ **4.26 − 8.36 = −2.87‰**」，但 4.26 − 8.36 = **−4.10**，等式不成立。
- 根因：`national-basics.ts:101-107` `birth_rate`/`death_rate` 是 **2026-04 月度**，`natural_increase_rate: −2.87` 註解標明是 **2024 年度** → `ViewAHome.tsx:530-533` 把不同年份/口徑硬湊成等式 → 數學不成立的假恆等式（鐵則2 口徑混用未標）。
- **修復**：(a) 純前端 + (c) SSOT 對齊 — 二選一：① 改用月度算出 −4.10 並標月度；② 出生/死亡也換 2024 年度值與 −2.87 同口徑並標年份。

### ⚠️【鐵則4 響應式】@820 右緣輕微裁切
- 1600/1440/900 正常；@820 section 01 右對齊數值（「個」「個·直轄市」meta）與 footer 連結輕微裁切擠壓。非崩版，屬窄 pane squeeze。修復 (d)。

### ✅ color-metric 切換器（headed 實測）全部正確重算
- 4 指標 choropleth + 圖例皆重算：老化（101–291，嘉義最深）→ 面積（up to ~4,700，花蓮/南投/臺東最深）→ 總人口（up to ~3.9M，新北/臺中/高雄最深）→ 密度（up to ~25,000+，臺北/新北/新竹市最深）。即時生效、無延遲、無殘留。
- ranking（section 04）固定為老化指數 ranking（嘉義 291.7 ↔ 新竹縣 101.9），不隨地圖 metric 變 → 屬敘事段設計，非 bug。

### ⚠️ KPI explode 不適用（非缺陷）
- ViewAHome 是 5 段圖文敘事 layout，**無 explode 式 kpi-card**（那是 water ViewA 設計）。task 描述的「點 KPI inline 展開」此主題不存在。

## B-2 · ViewB 新北市（NTP）— 🔴
footer 有橘字「縣市指標 MOCK·待 per-county ETL」（`ViewBHomeBasics.tsx:140`），但 H3/H4 主數字 badge 仍偽裝成真。
- **✅ H1 行政區結構**：鄉鎮市區 29（真實）、村里 1,049（真實·內政部）、鄰 19,606**（估）**「無真實源·由村里數推估」標示清楚；DRILL 鄉鎮排名（2025-12 真實 `township_rank`）：板橋 549,762/新莊 421,239/中和 403,791… 合理。
- **✅ H2 地理位置**：北部·直轄市 2010 升格、面積 2,052 km²(5.67%)、海岸線 122 km、中心座標、同區域 5 縣市可點 chip（來源 counties.yaml + mock-home MUNI_INFO/COASTAL_COUNTIES）。
- **🔴 H3 人口總量**：總人口 4,032,000、男 1,953,649(48.5%)/女 2,078,351(51.5%)、性比例 94.0、戶數 1,666,116、密度 1,965。**全是 mock 推導**（`county-stats.ts:58-95`：popTotal = `pop_2024_wan×10000`＝2024 萬位四捨五入；男女由 hardcode `SEX_RATIO_MAP` 拆；戶數由 region 戶量回推），卻被 `ViewBHomeBasics.tsx:386` 標成「**月度·2026-04**」（= 全國月度期別）→ **2024 mock 冠 2026-04 期別偽裝成真**（鐵則2/3）。戶數另標「待戶政司月報 ETL·目前由戶量推算」(:239) 算有救，人口/性別主數字沒有。
- **🔴 H4 年齡結構**：0-14 13.03%/15-64 **68.00%**/65+ 18.97%；老化 145.60、扶養 47.06%。**問題1**：badge `badgeTone="live"`（`ViewBHomeBasics.tsx:480-481`）把 mock 套**綠色 LIVE 視覺** → 違反「LIVE 用詞嚴守」+鐵則1。**問題2**：壯年比**固定寫死 68.00%**（`county-stats.ts:67`）→ **22 縣市扶養比恆為 47.06%**（(32/68)×100），NTP 與 LCC 扶養比一模一樣即此 mock artifact。
- **✅ H5 人口動態**：出生 6.21 − 死亡 7.32 = −1.11‰ ✓（per-county mock 三值自洽，不像 ViewA 全國混年份）；vs 全國對比、TREND「老化指數歷年/出生死亡歷年」皆 `PendingDataCard` 明確 placeholder ✅。
- **⚠️ @900 響應式**：H3「月度·2026-04」badge、51.5%/2,078,351、密度 1,965 在右緣輕微裁切。修復 (d)。

## B-3 · ViewB 連江縣（LCC，離島）— 🔴
- **🔴【鐵則2 SSOT】縣市總人口 mock 13,000 vs 真實鄉鎮加總 13,621 矛盾**：Hero/H3 標「總人口 **13,000**」（月度·2026-04，來自 `pop_2024_wan` 取整）；H1 DRILL **真實** township（2025-12）：南竿 7,629+北竿 2,930+莒光 1,537+東引 1,525 = **13,621**。同指標兩處差 **621 人(4.6%)**，mock 整數又冠 2026-04 月度、真實值卻是 2025-12 → 典型 SSOT 破口。離島小縣最易暴露四捨五入失真。修復 (c) SSOT 對齊 + (b) ETL。
- **⚠️ 扶養比露餡**：年齡三段 17.54%/68.00%/14.46%（加總對齊 mock 13,000、與真實 13,621 不符）；老化 82.40、出生 9.10>死亡 5.20=+3.90 ✓；但**扶養比 47.06% 與 NTP 完全相同** — 年輕離島（老化 82.4）扶養比理應不同 → 即「68% 寫死」artifact。村里 156（真實）、鄰 2,916（估）、戶數 4,561（待 ETL）標示清楚。

## B-4 · ViewC — ✅
`view=C`：「View C — Phase 0b 尚未實作」+返回鈕，無 crash/console error/假資料。home-basics 無 point-profile，placeholder 合理（文案略通用，可選擇性改主題專屬）。

### home-basics 小結
| # | 嚴重度 | 位置 | 問題 | 修復 |
|---|---|---|---|---|
| 1 | 🔴 | ViewA H5 `ViewAHome.tsx:530-533`+`national-basics.ts:104` | 自然增加率假等式 4.26−8.36=−2.87(實 −4.10)，月度/2024 年度混用 | (a)前端 +(c)SSOT |
| 2 | 🔴 | ViewB H3 `ViewBHomeBasics.tsx:386`+`county-stats.ts:59-64` | mock 縣市人口/性別掛「月度·2026-04」偽裝成真 | (a)標示 +(b)ETL |
| 3 | 🔴 | ViewB H4 `ViewBHomeBasics.tsx:480-481` | mock 三段年齡掛 `badgeTone="live"` 綠 LIVE tone | (a)前端改 tone |
| 4 | 🔴 | ViewB LCC | 總人口 mock 13,000 vs 真實鄉鎮加總 13,621 矛盾 | (c)SSOT +(b)ETL |
| 5 | ⚠️ | 全縣市 `county-stats.ts:67` | 壯年比固定 68% → 22 縣市扶養比恆等 47.06% | (b)ETL per-county |
| 6 | ⚠️ | ViewA@820 / ViewB@900 | 窄 pane 右緣數值/badge 輕微裁切 | (d)響應式 |
- **正向**：color-metric ×4、township_rank 2025-12 真實排名、村里數真實、全國 SSOT、neighbor chip、PendingDataCard trend、ViewC placeholder — 健康。**核心破口是 mock 偽裝**：per-county 人口/年齡是 2024 萬位回推 mock，卻冠「月度·2026-04」+綠 LIVE tone，且與真實鄉鎮加總對不上（LCC 最明顯）。

---

# 主題 C：socioeconomic（社經）
**仍空殼待建** — 目前完全沒有前端（已知空殼），本次未用 agent-browser 稽核。待後續主題排程接入。

---

# 🎯 優先級總表（🔴 先修）

| 優先 | 嚴重度 | 問題 | 主題/位置 | 鐵則 | 修復分類 |
|---|---|---|---|---|---|
| **P0-1** | 🔴 | **出生/死亡絕對值錯一個數量級**（疑 ETL 存單月當年度），且標「(實)/戶政司年度」偽裝成真 | demographics ViewA S3 + ViewB 人口動態（全 22 縣市） | 1 | **(b) spawn ETL** 修 `spatial.national_population_trend` + `village_demographics_yearly` 出生死亡口徑 + (a) 短期標口徑存疑 |
| **P0-2** | 🔴 | mock 縣市人口/性別/年齡掛「月度·2026-04」+ `badgeTone=live` 綠 LIVE，偽裝成真 | home-basics ViewB H3/H4（全縣市） | 1,3 | (a) 即刻把 badge 改 mock/估算 tone + 標 2024 推估；(b) ETL 補真實 per-county |
| **P0-3** | 🔴 | 全國自然增加率假等式 4.26−8.36=−2.87（實 −4.10），月度/年度混用 | home-basics ViewA H5 | 2 | (a) 前端統一口徑 + (c) SSOT 對齊（純前端，最快可修） |
| **P0-4** | 🔴 | 縣市總人口 mock(13,000) vs 真實鄉鎮加總(13,621) 矛盾 | home-basics ViewB（離島最明顯） | 2 | (c) SSOT 對齊（縣市總量改用真實 township 加總或標口徑）+ (b) ETL |
| P1-1 | ⚠️ | 壯年比固定寫死 68% → 22 縣市扶養比恆等 47.06% | home-basics 全縣市 `county-stats.ts:67` | 1,2 | (b) ETL 補真實 per-county 年齡結構 |
| P1-2 | ⚠️ | 「statistical_areas county 欄 mojibake」開發術語洩漏給使用者 | demographics ViewB 城鄉分布 | — | (a) 文案 user-facing 化 +(b) 修日夜人口比 |
| P1-3 | ⚠️ | 自然增加 Top5 排序/數值與 footer 矛盾 | demographics ViewA S3 | — | (a) 前端排序 +(b) 根因同 P0-1 |
| P2-1 | ⚠️ | dashboard pane 固定 500px，<900 寬右側被裁（demographics 較嚴重，home 僅 820 輕微） | 兩主題 ViewA/ViewB | 4 | (d) pane 改 viewport 比例(40vw)或設最小寬度斷點 |

## 建議行動順序
1. **最快見效（純前端，今天可改）**：P0-3（自然增加率等式）、P0-2 的 (a)（拔掉 mock 上的 LIVE 綠 tone + 補「2024 推估」標示）、P1-2（開發術語文案）。
2. **根治資料（spawn ETL session 去 taipei-gis-analytics）**：P0-1（出生死亡年度口徑，影響最廣，兩主題全縣市）、P0-4 + P1-1（per-county 真實人口/年齡）。走 `/gis-data-onboard` + `cross-repo-data-onboard-spawn.md` SOP。
3. **響應式**：P2-1 統一 pane 寬度策略（建議併入下一輪響應式 sweep）。

> 註：本次最該優先的是 **P0-1 出生/死亡口徑** — 唯一「錯誤資料 + 假真實標籤」雙重違反鐵則1，且橫跨兩主題每個縣市。其次 P0-2/P0-3 是 home-basics 把 mock 套 LIVE 視覺/算錯等式，傷對外信任最直接。

=== DONE audit_demo_home ===
