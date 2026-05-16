# Cycle · water 主題 ViewA 6 章敘事重寫

> Cycle 觸發於 2026-05-16 · 走 `/theme-loop` 5 階段 + 4 checkpoint
> Mode = **V（Visual rework）** + **S（Mock-swap 子流程）**
> Skill SOP：`.claude/skills/theme-loop/SKILL.md`

---

## 一句話現況

把 design bundle handoff（`/tmp/water-design/extracted/`）的新版 ViewA「6 章敘事結構」（現況/儲存/水情燈號/處理/使用/災防）實作上線，沿用 fire 主題 `ViewAFire.tsx` 的 per-theme pattern 建 `ViewAWater.tsx`；缺資料的章節由 Stage 1 Discovery 盤點後決定接真實 or mock + badge。

## 5 階段進度

| 階段 | 狀態 | 產出 / Checkpoint |
|---|---|---|
| **Stage 1: Discovery** | ✅ 完成 | 4 agent 並行回報：見下 |
| **Stage 2: Plan**（Checkpoint 0）| ✅ 完成 | mini-audit 後 user 拍板 3 件事（spec 1+2 改 + hook 擴充） |
| **Stage 3: Execute** | ✅ 完成 | 8 新檔 + 2 改檔（query/hook/CSS+568/6 sections/CatHeader/ViewAWater/App.tsx），typecheck 0 error |
| **Stage 4: Verify**（Checkpoint B）| ⏳ 等 user 拍板 | typecheck ✅ / 截圖 ✅ / codex ✅，修 4 issue（1 blocker / 1 high / 2 P0），P1 留 backlog |
| **Stage 3: Execute** | ⏸ 待 | 新建 `ViewAWater.tsx`（6 個 section 子元件）+ 接新 CSS class + 接 query；App.tsx 加 theme 分派 |
| **Stage 4: Verify**（Checkpoint B）| ⏸ 待 | typecheck + 4 寬度截圖 + codex review 三閘 |
| **Stage 5: Commit/Push**（Checkpoint C+D）| ⏸ 待 | atomic commit + push 策略 |

## Discovery 4 Agent 分派

| Agent | 任務 | 目標輸出 |
|---|---|---|
| **A. Baseline 截圖** | dev server + agent-browser 截現有 ViewA（water）4 寬度 | baseline png × 4 + 「現有跑得起來嗎」一句話判定 |
| **B. 後端資料 audit** | 掃 3 repo：gis-platform migrations 編號清單 + taipei-gis water_resources pipelines 跑過哪些 + data-collectors 有沒 drought_alert | 6 章每章對應後端狀態 matrix |
| **C. 設計→資料 mapping** | 對齊新設計 6 章每個資料點（40 水庫 / 4 區蓄水率 / 4 燈號 / A→B→C→D / LPCD / 淹水...）vs 後端能否提供 | 每元素「能接真實/要 mock/缺 pipeline」三分類 |
| **D. Frontend 現況掃描** | 列 `frontend/src/lib/queries/water.ts` + `hooks/useWaterKpis.ts` 用到的 RPC / table + 6 章還缺什麼 query / hook | 「新 ViewAWater 要新增 X 個 query / Y 個 hook」清單 |

## 設計 bundle 位置

- 解壓地：`/tmp/water-design/extracted/mini-taiwan-info/`
- 主檔：`project/Mini Taiwan Info.html`
- 6 章 component 範本：`project/js/view-a.jsx`（S1_Status / S2_Storage / S3_Drought / S4_Treatment / S5_Usage / S6_Disaster）
- 新 CSS：`project/styles.css`
- Mock data：`project/js/data.js`（`WATER_OVERVIEW` 含 6 章資料 shape）

## 設計骨架 6 章

1. **現況**（章 1）— 6 stat tile（40 水庫 / 26 河川 / 2041 km / 116 水系 / 2449 水質測站 / 1306 雨量站）
2. **儲存**（章 2）— 4 區蓄水率 bar + 5 大水庫排行榜 + PointProfile + 24hr 雨量 KPI
3. **水情燈號**（章 3）— 4 級當前 + 過去 5 年 timeline
4. **處理**（章 4）— A→B→C→D flow + 月供水量 + 接管率
5. **使用**（章 5）— LPCD 大數字 + 17 年趨勢 + 用水結構 + 漏水率 + TOP/BOTTOM 5
6. **災防**（章 6）— 淹水（200/350/500mm 切換）+ 河川警戒 + 雨量警報 + 滯洪池 + 地層下陷

## Discovery 結果摘要

### Agent A · Baseline 截圖 ✅
- 4 寬度 png 存 `/tmp/water-design/baseline/baseline-{1920,1280,1100,800}.png`
- 現有 ViewA 跑得起來，6 KPI 全 LIVE 有值（蓄水率 54.9% / 雨量 8.8mm / 警戒 12 / 淹水 0.4% / LPCD 273L / 接管率 52.8%）
- 0 console error，可直接接 Stage 4 verify 對比

### Agent B · 後端資料 audit ✅ — **重大發現：後端 90% 完成**
- 5/15 commit `d06ae9f` 一次推 4 migration（098/100/101/102）+ 14 RPC，pipeline 跑完、collector 上線
- ✅ migration 098（9/10 RPC：加權蓄水率 / 5 區 / 累積雨量 / 淨流入 / 跌破 50% / 河川警戒 / 雨量警報）
- ✅ migration 100（twc 7 表：淨水場 17 / 月供水 141 / 用戶數 / 接管率 / 漏水率 21 / 配水管線 / 消耗量）
- ✅ migration 101（water_facts_official 7 列 metadata：26 河川 / 2041 km / 2449 水質測站 / 1306 雨量站）
- ✅ migration 102（drought_alert_current 2 / history 2，collector 已上線但歷史薄）
- ⚠️ 命名校正：實際表名跟規劃 doc 不同（`water_supply_penetration` 無 `_yearly` suffix、`twc_supply_system_monthly`、`water_treatment_plants_large`、`twc_customer_yearly`）

### Agent C · 設計→資料 mapping ✅（要用 B 校正）
- 原報告 36 元素：14 ✅ + 9 🟡 + 13 ❌
- **用 B 校正後 → 14 ✅ + 18 🟡（多半其實後端已有，需寫 query）+ 4 真缺**
- 真缺：(1) 章 2 「vs 歷年同期 / vs 去年」(reservoir 歷史快照) (2) 章 3 「過去 5 年燈號 timeline」 (3) 章 5 「用水結構細拆 %」(待確認) (4) 章 6 「地層下陷描述行的詳細數字」(已有表但 schema 待對齊)

### Agent D · Frontend 現況掃描 ✅
- **可重用**：`KPICard / PointProfile / Sparkline / TrendChart / Donut`、CSS `.cat-block / .cat-head` 等（fire 已搬）
- **現有 query 可重用**：`fetchReservoirStatusLatest / fetchRainGaugeLatest / fetchFloodPctByCounty / fetchLpcdLatest / fetchSewageCoverageLatest / fetchRiverWaterLevelLatest / fetchRiverFlowStations`（含 alert_level_1/2/3 欄位 → S6 直接算分布）
- **現有 hook 可重用**：`useWaterKpis()` 已並行 4 fetch，擴充即可（仿 fire pattern 單一 hook）
- **要新增 query**：`fetchWaterFacts / fetchReservoirByRegion / fetchTopReservoirs / fetchDroughtAlertLatest / fetchTreatmentStats / fetchMonthlySupply / fetchUsageStructure / fetchRiverAlertSplit / fetchSubsidenceStats`
- **要新增 section component**：`sections/S1Status / S2Storage / S3Drought / S4Treatment / S5Usage / S6Disaster` + 子元件
- **要新增 CSS**：搬 `/tmp/water-design/extracted/.../styles.css` line 1353-1900+ verbatim
- **App.tsx 分派**：line 432-460，加 `theme === "water" ? <ViewAWater /> : ...`

## Stage 2 Plan 候選（待 user 拍板）

**Mode = V（Visual rework）+ S（Mock-swap）混合**

**章節接通策略**（基於 B audit 校正後）：
| 章節 | 元素數 | 接真實 | mock fallback + badge |
|---|---|---|---|
| 1 現況 | 6 | 6（COUNT(*) + water_facts_official）| 0 |
| 2 儲存 | 6 | 5（含 RPC1/2/4/5 + 24hr 雨量）| 1（vs 歷年同期 → 「對比歷年資料尚未累積」）|
| 3 水情燈號 | 3 | 1（當前燈號 drought_alert_current）| 2（5 年 timeline 顯「採樣中累積」+ 最近紅燈用 history 有限值）|
| 4 處理 | 6 | 5（淨水場 17 / 月供水 141 / 配水管線 / 用戶 / 接管率）| 1（A→D flow trend 數列要看年度資料密度）|
| 5 使用 | 7 | 6（LPCD / sewage / 漏水率 / ranking 全有）| 1（用水結構待 sub-audit）|
| 6 災防 | 5 | 4（雨量警報 / 河川警戒分級 / 滯洪池 / flood %）| 1（地層下陷描述 — 看表內欄位齊全度）|
| **總計** | **33** | **27** | **6** |

**Checkpoint 0 (Stage 2 拍板)**：✅ 完成（用戶拍板 spec 改 + hook 擴充策略）

## Stage 4 三閘結果

### typecheck ✅
0 error（含 Promise.allSettled refactor 後）

### codex:rescue review ✅ → 已修
- **BLOCKER**: useWaterKpis 用 Promise.all，`fetchReservoirStatusLatest` / `fetchRainGaugeLatest` throw 會整個掛 → 改 `Promise.allSettled` + helper extraction，向下相容 ViewA/ViewB
- **HIGH**: `fetchLpcdNationalHistory` 全表拉 → 加 `.gte("year", currentYear - 20)` 限近 20 年

### multi-viewport screenshot ✅ → 已修
9 張截圖存 `/tmp/water-design/after/`
- 6 章全顯示 + WaterCatHeader 編號 01-06 正常
- 章 1：37 / 26 / 2,041km / 116 / 2,449 / 1,309 全真實
- 章 2：4 區加權 + 5 大水庫全真實（北 86.7% / 南 17.8% / 翡翠 94.4% / 烏山頭 38.2%）
- 章 5：LPCD 273 + ranking 雙欄全真實
- 章 6：4 tile 全真實

修 2 個 P0 query 欄名錯：
- **water_treatment_plants_large**: PK 是 `plant_name` 不是 `id` → 改 select(plant_name, capacity_cmd, county)
- **water_loss_rate_yearly**: 是全國單表，PK=year，無 area 欄位、欄位是 `loss_pct` 不是 `loss_rate_pct` → 改 query

留 BACKLOG：
- **B054** P2 ViewAWater @800 響應式破洞（章 2/3/5 水平 overflow）
- **B055** P2 reservoir vs 上月同期 wrapper RPC
- **B056** P3 drought timeline 等 collector 累積
- **B057** P2 淹水 200/500mm 情境接通
- **B058** P3 用水結構 sector 拆解資料

**Checkpoint B (Stage 4 verify)**：⏳ 等 user 拍板

## Mini-audit 結果（補查 6 缺口）

| # | 元素 | 結果 | 建議 |
|---|---|---|---|
| 1 | 章 2 vs 歷年同期 | ❌ snapshot 只有 30 天 | **改 spec**：vs 上月同期 OR 移除欄 |
| 2 | 章 4 月供水 12m trend | ❌ 只有 2026-03 單月 141 列 | **改 spec**：顯示單月總和 KPI（2.67 億 m³）|
| 3 | 章 4 A→B→C→D sparkline | ✅ 15 年 yearly | 直接接 `water_pipe_length_yearly` / `twc_customer_yearly` |
| 4 | 章 5 用水結構 % | ❌ DB 無 sector 拆解 | **保 mock + badge**「結構估算」（用戶數比例會誤導不能代理）|
| 5 | 章 6 滯洪池涵蓋 | ✅ 8 個 county slug | 「140 座 · 5 縣市 + 3 科學園區」|
| 6 | 章 6 地層下陷描述 | ✅ 30 年 readings | 「彰化/雲林/嘉義近 2 年平均下沉 48-58 mm」|

注意：缺口 5 county 用 slug、缺口 6 county 是中文（schema 慣例不同），query 時要分別處理。
- **Checkpoint A0 (Mode D freshness)**：N/A（Mode V/S）
- **Checkpoint A (Mode D schema)**：N/A
- **Checkpoint B (Stage 4 verify)**：⏸
- **Checkpoint C (Stage 5 commit)**：⏸
- **Checkpoint D (Stage 5 push)**：⏸

## 預估 / 注意

- 預估 6-10 hr 純前端工作（不含後端資料補齊）
- 後端缺口處置看 Discovery B/C 結果再決定
- 不動 ViewAFire.tsx / ViewB.tsx / ViewC.tsx
- 不破壞 manifest-driven 架構（保留原 ViewA.tsx 給其他主題 fallback）

## 跨 session 接續

中斷後 `/theme-loop continue` 從 TaskList 接，本檔提供 cycle 完整脈絡。
