# front_demog114 — 人口分頁接通民國114(2025)真實資料 + 標期別

日期：2026-05-30 · 主題：demographics · commit `1785bfa`（未 push）

## 任務
把人口分頁接上後端剛更新的 2025 資料，每處標清資料期別。

## 後端實測驗證（REST · Accept-Profile: demographics）
- **population_by_age_sex_county**：long format（`sex`男/女 + `population`，非 male/female 寬表）。
  stat_year = [2024, 2025] 兩年並存。2024=19 band（幼齡合計 `0-14`）、2025=21 band（`0-4`/`5-9`/`10-14` 細分）。🔴 混粒度確認。
- **township_rank**（VIEW）：有 `year_month` 欄，唯一值 `2025-12`，368 rows。
  板橋549762 / 桃園478487 / 中壢439213 吻合。
- **county_indicators_yearly**（新表）：只有 stat_year=2025，22 縣市，county_id=單字母 id_moi。
  台北(A)：aging 202.06 / dep 56.60 / child_dep 18.74 / old_dep 37.86 / density 8975.39 / sex_ratio 89.01 / hh 2.26。

## 驗證發現的現有 bug（2025 進來後才浮現）
`fetchPopulationByAgeSex` 抓全部（不篩 year），三個 derive 全跨年加總：
→ **全國人口翻倍** + **金字塔混粒度**（2024 的 `0-14` 與 2025 的 `0-4/5-9/10-14` 同時 bucket）。
此為本次必修核心。

## 改了哪些檔（6 檔，commit 1785bfa）
1. `frontend/src/lib/queries/demographics.ts`
   - 加 `latestStatYear()`；三個 derive（`deriveNationalPyramid`/`deriveNationalSummary`/`deriveCountyAggregates`）+ `buildCountyPyramid`(ViewB) 全加 `statYear` 參數依年篩選 → 修翻倍+混粒度。
   - 金字塔**移除 95+ 強制合併**，依該年實際 age_band 原樣呈現（動態組數）。
   - 全國 totalPopDelta 改用同表 prevYearTotal（2024）vs 2025 → apples-to-apples YoY。
   - 新增 `CountyIndicatorRow` 型別 + `fetchCountyIndicatorsYearly()` + `buildCountyIndicatorMap()`。
   - `deriveCountyAggregates` 收 `indicators` map：aging/depRatio/depYoung/depOld/density/hhSize 官方優先，缺則計算值（graceful）。
   - `TownshipRankRow` 加 `year_month` 欄並 select。
2. `frontend/src/hooks/useDemographicsData.ts`
   - Promise.allSettled 加第 4 個 fetch（county_indicators_yearly，非關鍵：失敗不算 error，沿用計算值）。
   - 算 statYear + indicatorMap，傳入三 derive；state 加 `statYear`。
3. `frontend/src/hooks/useTownshipData.ts`
   - state 加 `rankPeriod`（從 row.year_month 動態讀）。
4. `frontend/src/components/views/ViewADemographics.tsx`
   - S1 badge/標題/口徑/delta → `data.statYear`（2025）；delta 標「較 2024」。
   - S2 金字塔「(P.length 組)」動態、card head「2025 年度」、badge 由 `live` 改 `historical`（年度資料非 LIVE，遵守 LIVE 嚴守規則）。
   - growth ds「104→113」→「104→114」。DataSourceBadge 加 county_indicators_yearly。
5. `frontend/src/components/views/ViewBDemographics.tsx`
   - `buildCountyPyramid` 收 statYear；金字塔標題「(py.length 組 · 2025 年度)」動態。
   - growth 標籤 104→113 → 104→114（3 處）；OverviewTab trend 由 10 點(止 2024) 改 11 點(止 2025)。
   - DataSourceBadge 加 county_indicators_yearly。
6. `frontend/src/components/views/ViewBHomeBasics.tsx`
   - 鄉鎮排名期別「2024-12」改 `rankPeriod`（動態，2025-12），含 ※來源行。

## 混粒度處理方式
不寫死任何 band/組數。每個消費端先 `r.stat_year !== statYear` 篩選，再依該年實際 age_band 動態 bucket。
2025(21組) / 2024(19組) 皆可畫。三段(0-14/15-64/65+)用 `parseAgeLow` 動態分群（0-4/5-9/10-14 自動歸幼年），不依固定 0-14 band。

## 期別標在哪
- 金字塔（ViewA/ViewB）：「2025 年度」（card head + badge「年度 · 2025」）+ 組數動態
- 鄉鎮排名（ViewBHomeBasics）：「2025-12」（標題括號 + ※來源行，動態讀 year_month）
- 縣市指標（county_indicators_yearly）：DataSourceBadge 標「2025」；老化/扶養/密度/戶量官方值
- 首頁全國 vital signs：**未動**（維持 useNationalBasics 的 2026-04 月度口徑）

## 驗證
- **typecheck**：`pnpm typecheck` ✅ 0 error
- **agent-browser**（dev :5174，headless WebGL 不可用故地圖區「載入失敗」屬環境限制，儀錶板正常；縣市頁用 deeplink 進入）：
  - 全國總人口 = **23,299,132 人**（≈2,330萬，非 ~4,600萬翻倍）✅ 翻倍 bug 確認修復
  - 全國金字塔「2025 年度」+ **21 組**（100+→0-4，無 0-14 寬段）✅
  - 「人口家底」badge「年度 · 2025」✅
  - 臺北市儀錶板 老化指數 = **202.1**（= county_indicators 202.06）✅ 官方表接通確認
  - 臺北市金字塔「(21 組 · 2025 年度)」✅
  - 1000px 窄寬無爆版/擠垮 ✅
  - 基礎統計主題臺北市 鄉鎮排名「(2025-12)」+ ※來源「2025-12 月底人口」✅
  - 全 9 項 ✅，截圖：/tmp/demog_national.png、demog_national_pyramid.png、demog_taipei.png、demog_taipei_age.png、demog_taipei_narrow.png、home_taipei.png

## commit
`1785bfa feat(demographics): 人口分頁接通2025資料+標期別`（6 檔，+176/-65，**未 push**）

## 備註（非本次範圍，留待）
- 基礎統計(首頁)主題臺北市頁的人口/年齡章節仍是月度 MOCK 口徑（總人口2,488,000、老化188.4，頁尾標「縣市指標 MOCK · 待 per-county ETL」），與人口主題 2025 年度真實口徑（244.0萬/202.1）不同。兩主題口徑本就不同（戶籍月度 vs 現住年度），刻意未動；日後 per-county ETL 上線可考慮對齊。
- county_indicators_yearly 僅 2025 單年，無法做縣市別跨年趨勢。
- national_population_trend / village_demographics_yearly 後端未更新（仍 民104-113），故出生/死亡/老化歷年 trend 維持 2024 端點，標註正確。

=== DONE front_demog114 ===
