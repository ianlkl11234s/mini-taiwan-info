# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-30（Session 12 結束 · spawn 協作工作流固化 + 過夜資料真實化 + SEGIS 民國114 + 全主題稽核修復 Batch1-4 + about 分頁）

---

## 一句話現況

水/消防/人口/基礎統計/海事/軌道 6 主題上線且**大量 mock 已換真實**；本 session 用 **tmux+cmux spawn 真實獨立 claude session** 的協作工作流，完成過夜 7 任務資料接通、SEGIS 民國114(2025) 更新、全主題 agent-browser 稽核 + 4 批修復、多個資料量級 bug 後端根治、比較模式移除、about 分頁。3 repo 全 push 同步。

## ⭐ 本 session 最大產出：spawn 協作工作流已固化（日後標準）

**完整文件在 `.claude/guidelines/`**（已 commit）：
- `cmux_tmux_spawn_primer.md`（L1 原語）/ `spawn_patterns_catalog.md`（L2 七模式）
- `cross-repo-data-onboard-spawn.md`（L3 SOP：fresh session per task + 人工 gate）
- **`spawn-orchestration-lessons.md`**（實驗日誌，所有踩坑）← 復用前先讀這份
- 腳本 `.claude/scripts/`（spawn/send/monitor/cmux_view/named_tab）
- 進度看板 `.claude/SESSION_BOARD.md` / `.claude/WAVE_REPORT.md` / `.claude/AUDIT_MASTER_PLAN.md` / `board/*.md`（每 session 一份）

## 下個 session 候選

（按優先序）

1. **socioeconomic 主題**：第 7 主題，完全空（無前端/後端/資料）= 從零建。多日工程，用 spawn 工作流（盤點→搜集→建表→接前端）。
2. **縣市別年度出生死亡**：ViewB 人口動態目前標「12 月單月」（量級不可信，已誠實標示）。需程式化彙總戶政司村里 12 個月月報成年度，無現成來源。
3. **老化指數歷年口徑統一**：trend 民104-113 是村里未加權平均（≈271）、民114 是全國彙總（174.25），連線有斷崖。需歷年 age-band 資料統一成全國彙總口徑。
4. **fire 11953 起火原因 / severity normalizer**：疑有同款「年度列+月別列雙重計算」bug（同 etl_fire 起火處所），上線前比對。
5. **about 截圖優化**：Flight Arc 3.3MB 待壓 WebP；補 Ship GIS 等真實截圖（現字母 fallback / 已移除 infra 卡）。
6. **water 地方級資料**：漏水率/工業用水/雨水下水道/滯洪池容量 部分縣市缺（無公開源，需 topic-research）。

## ⚠️ 待人工確認（headless 測不到）

- **rail/maritime 22 縣市 choropleth 著色（X-1）**：App.tsx 已加 metric 分支，但 headless WebGL 測不到實際上色 → 需真實瀏覽器（gis-up + 硬刷新）切 rail/maritime 主題目視確認。

## 本 session（S12）做了什麼

見 git log（06e552e..183d8e9，33 commit）+ REFLECTIONS（S12）+ WAVE_REPORT.md + AUDIT_MASTER_PLAN.md。重點：
- 移植 + 固化 spawn 工作流（從 ichef_analys_place）
- 過夜 7 任務：demographics 鄉鎮/村里 + fire 財損/起火處所 + maritime 燈塔/漁權 + water LPCD/接管率
- SEGIS 民國114：age_sex(21組)/township/county_indicators 三表更新到 2025
- 人口分頁接 2025 + 修全國人口翻倍 bug
- rail 4 bug 修 + 貓纜後端根治
- 全主題稽核(3 份)+ 4 批修復(Batch1-4+3b)：含出生死亡量級根治、消防栓重複灌去重、水庫 region bug、火災三年累計、LIVE 誤標、響應式 pane 斷點、金字塔對齊
- 比較模式移除 + about 分頁 + 移除搜尋/分享/匯出(全 13 view)
