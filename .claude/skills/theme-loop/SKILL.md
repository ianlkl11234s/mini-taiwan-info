---
name: theme-loop
description: mini-taiwan-info 通用主題（水/消防/未來新主題）資料-視覺迭代循環 SOP。當使用者說 /theme-loop、/water-loop（舊名 alias）、「跑下一輪」「迭代 {主題}」「接下個資料」「下個 cycle」「修一輪 P0」「補一個 KPI / tab」「補 mock 換真實」時觸發。半自動 5 階段 + 4 checkpoint：Discovery（並行 4 agent：截圖+多寬度響應式+資料候選+gap 分析+schema 預檢）→ Plan（user 拍板路線 + 資料缺口判斷該寫 BACKLOG 或去 taipei-gis-analytics 抓）→ Execute（純前端 fix / ETL+wrapper migration+frontend）→ Verify（typecheck + multi-viewport agent-browser + codex review 三閘）→ Commit/Push（atomic + secret-scanning fallback + 跨 3 repo 同步）。專為 manifest-driven SPA + Supabase wrapper pattern + 跨 3 repo 設計。主動更新時機：撞到新陷阱（PostgREST / 響應式 / 跨 repo）時更新 references/；新主題上線（fire 之後是 demographics / safety）跑完一輪後檢視 Stage 流程是否需強化。
user_invocable: true
---

# /theme-loop — 通用主題資料/視覺迭代循環

## 核心原則

每跑一次 `/theme-loop` 完成 **一個 cycle**（一個 P0 bug / 一個資料整合 / 一個視覺重做 / 一個 mock → 真實替換）。

| 原則 | 為什麼 | 對比 |
|---|---|---|
| **半自動** | 自動跑 discovery / typecheck / 截圖 / codex review；user 拍板 4 個 checkpoint | ❌ 全自動 → user 失控 ✅ 自動低風險 + 拍板高風險 |
| **不破壞既有** | 不自動 apply migration、不自動 push、不自動 commit | ❌ Claude 覺得對就動 ✅ migration/push/commit 必 user 同意 |
| **可重入** | 跑到一半中斷後 `/theme-loop continue` 接得上（TaskList 狀態） | ❌ 跑到一半得重來 ✅ 跨 session 接續 |
| **主題無關** | water / fire / 未來 demographics / safety 通用，主題差異走 Stage 1 偵測 + Stage 2 user 拍板 | ❌ 每主題寫一個 skill ✅ 一個 skill 撐多主題 |
| **真實資料優先** | 任何 placeholder 都明標待 ETL + Sprint；缺資料寫 BACKLOG 或去 taipei-gis 抓 | ❌ silently mock ✅ 標清楚不誤導 |

## 觸發詞 / 主題判斷

### 觸發詞

- `/theme-loop`
- `/water-loop`（舊名，向下相容）
- 「跑下一輪」「迭代」「接下個資料」「下個 cycle」
- 「修一輪 P0」「補一個 KPI / tab」「補 mock 換真實」

### 主題判斷（Stage 1 開頭做）

1. 看 user 訊息有沒有明確主題詞（「跑下一輪 fire」「迭代 water」）
2. 看當前 session 哪個主題剛動過（git log -10 / 開啟的檔案）
3. 都不確定就 `AskUserQuestion` 問：water / fire / 其他

主題 = `themes/{theme}.yaml` 的 `theme.id`。Stage 1 起所有指令都會帶這個變數。

## Mode 判斷

| Mode | 條件 | 流程差異 |
|---|---|---|
| **P. Pure-frontend fix** | discovery 發現 P0 bug 且純 .tsx/.ts/.css 改 | 跳過 Checkpoint A0+A（無 DB 變動） |
| **D. Data-integration** | discovery 鎖定要接新資料/新表/新 RPC | 完整 5 階段 + 4 checkpoint，含 schema 預檢 |
| **V. Visual rework** | 視覺化方式重做（chart type 換、layout 重排）| 強化 Checkpoint B（前後對比 + 多寬度截圖必看）|
| **S. Mock-swap**（fire 後新增）| 把標 placeholder 的 KPI / table 換真實資料 | Mode D 子流程，但跳過 manifest 修改，focus query+hook+component swap |

mode 由 Stage 2 Plan 拍板時決定。

## 5 階段流程

詳細展開見 `references/stages.md`。本檔只列骨架。

### Stage 1: Discovery（自動，並行 4 agent）

**並行 4 個 Task agent**：

| Agent | 任務 |
|---|---|
| A. **Screenshot multi-viewport** | agent-browser 截 View A（focus 主題）4 寬度（1920 / 1280 / 1100 / 800），檢視響應式破版 + fetch 時序假象風險 + 可改進點 top 3 |
| B. **Data candidates** | 對齊 `themes/{theme}.yaml` + Supabase 現有表（含 public wrapper）+ `../taipei-gis-analytics/pipelines/` 找下個 Tier S/A 候選 |
| C. **Gap analysis** | 三類 gap：(1) manifest 列但 UI mock (2) Supabase 有但 UI 沒接 (3) UI 視覺化方式不適合資料形狀 |
| D. **Schema pre-check** | 列當前 `lib/queries/*.ts` 用到的 RPC + table，比對 migrations 有沒對應 wrapper；若主題用非 public schema → 呼叫 `/check-schema-exposed` |

**並行同一訊息發**，等四 agent 都回再彙整。

**詳細 SOP + 防 fetch 時序假象 + 多寬度截圖技巧**：見 `references/stages.md#stage-1`

### Stage 2: Plan（Checkpoint 0：拍板路線 + 資料缺口處置）

彙整 discovery → 用 `AskUserQuestion` 問 user 三件事：

1. **這輪做什麼**？列 2-4 個候選（含 mode P/D/V/S、工時、預期效果）
2. **資料缺口處置**：discovery 列出的 missing data，每項分類（決策樹見 `references/data-gap-triage.md`）
   - 純前端能解 → 走本 cycle
   - 要去 taipei-gis-analytics 抓 → 寫進 `.claude/memory/BACKLOG.md` 並提示「要不要本 cycle 兼跑」
   - 純缺資料無 pipeline → 寫 BACKLOG + 標等 ETL（不阻塞本 cycle）
3. **自動化程度**：半自動 4 checkpoint（預設）/ 監督模式每階段停 / zero-touch 純前端

User 拍板後建立 TaskList + 進 Stage 3。

### Stage 3: Execute（自動，依 Mode 分支）

| Mode | 步驟 |
|---|---|
| **P. Pure-frontend** | Read 涉及檔 → Edit/Write → typecheck（PostToolUse hook 已自動跑）→ Stage 4 |
| **D. Data-integration** | Checkpoint A0 freshness 判定 → Checkpoint A schema 預檢 + wrapper migration + apply → pipeline → frontend queries+hook+component → typecheck |
| **V. Visual rework** | 同 P + 先在 BACKLOG 留底「重做前」+ Checkpoint B 強化 |
| **S. Mock-swap** | 找 mock-{theme}.ts 對應項 → 寫 query + hook + 改 component import → 留 mock fallback → typecheck |

**Mode D 完整流程（含 Checkpoint A0 / A）+ 各 mode 細節**：見 `references/stages.md#stage-3`

**Schema 預檢必跑**（新 2026-05-15）：寫第一個 query 後立即 dev server fetch，不只 typecheck。撞 `Invalid schema` → 呼叫 `/check-schema-exposed` + `/scaffold-rpc-wrapper`。

### Stage 4: Verify（Checkpoint B：三閘）

三件事**並行**跑：

1. **typecheck**：`cd frontend && pnpm typecheck` — PostToolUse hook 已自動跑，這裡 final check
2. **multi-viewport screenshot**（強化版）：reload + 截 changed view **4 寬度**
   - 1920px（桌面）/ 1280px（典型）/ 1100px（KPI cols-4 → 2x2 斷點測）/ 800px（mobile）
   - 截完比對 before/after，重點看：KPI 是否爆版 / 文字截斷 / 響應式破洞
   - 細節 SOP：`references/multi-viewport-screenshot.md`
3. **`/codex:rescue` review**（強化版，2026-05-15 必跑）
   - 大 cycle（≥ 3 既存改 + 1 新檔，或 > 200 lines）→ 必派
   - 純 .md / docs 改動 → 可 skip
   - background 模式跑，Stage 5 commit 前回收結果
   - **critical issue → 退回 Stage 3 修**

**Checkpoint B**：給 user 看四件
- 4 寬度 before/after 截圖
- typecheck 結果（hook 已先跑，這裡 confirm）
- codex review 摘要 + critical 列表
- 視覺化選項（若 Mode V）

User 拍板才進 Stage 5。

### Stage 5: Commit / Push（Checkpoint C+D）

**Checkpoint C：commit 顆粒度**

自動草擬：
- 列影響檔案 + atomic 切分建議（一邏輯一 commit）
- 草擬 commit message（`fix:` / `feat:` / `chore:` prefix + Co-Authored-By）

`AskUserQuestion` 問：
- N 個 atomic commit（推薦）/ 1 個包裝 commit / 不 commit 留 worktree

執行：用 `git restore + redo Edit per commit` 拆 hunk（Cycle 1 學到比 git add -p 穩）。

**Checkpoint D：跨 3 repo push 策略**

先呼叫 `/cross-repo-status` 看三 repo divergence。然後 `AskUserQuestion`：
- 不 push（保守）/ push 本 repo / 3 repo 全 push
- 若有 behind → 自動 rebase（衝突停下來給 user 處理）
- 若有 secret scanning 擋 → 走 fallback PB-07（細節 `references/push-fallbacks.md`）

`/wrap-up` 推薦在 push 後跑（更新 memory + CROSS_REPO）。

## 客製規則（mini-taiwan-info 專屬）

1. **Manifest / SSOT 變動 → typecheck 強制**：改 `themes/*.yaml` / `data/counties.yaml` / `docs/04-*` / `frontend/src/lib/types.ts` → Stage 4 必跑 typecheck（PostToolUse hook 已自動，但 final confirm）
2. **跨 3 repo 變動 → 更新 CROSS_REPO.md**：改 `../gis-platform/` 或 `../taipei-gis-analytics/` → 同 session 內更新 `.claude/memory/CROSS_REPO.md` pending
3. **新 pipeline 入庫 → 觸發 data-catalog-audit**：新增 `../taipei-gis-analytics/pipelines/` 內 pipeline → 提示跑 taipei-gis 的 `/data-catalog-audit` skill
4. **agent-browser 視覺驗證硬性要求**：任何 layout / spacing 改動 → Stage 4 必跑多寬度截圖（PRINCIPLES）
5. **中文標點空格**：「人均日用水量 · TOP 5」前後空格（REFLECTIONS Cycle 1）
6. **LIVE 用詞嚴守**：只有 collector cron + 上游 realtime 才標 LIVE（PRINCIPLES 2026-05-14）

## 注意事項

- **Read first**：每個 Edit 前 Read，避免 old_string 不精確
- **不自動 apply migration / push / amend**：永遠停在 Checkpoint 等 user
- **不污染專案外**：所有 skill / hook / 規則寫在 `mini-taiwan-info/.claude/`，不寫到 `~/.claude/`
- **用 TaskList**：每 cycle 一個任務群
- **跨 session 不臆測**：只信本 session 對話 + git log + 截圖證據

## Skill 自身演進

每次 `/theme-loop` 跑完，回到 REFLECTIONS 記：
- 哪個 stage 卡住？
- 哪個 checkpoint user 改主意？
- discovery agent 漏抓了什麼？
- push 遇到新 fallback 場景？
- 新主題揭示了 stages.md 沒覆蓋的情境？

回頭修 SKILL.md 或 references/。

## 參考資源

- **5 階段完整 SOP + Mode 細節**：`references/stages.md`
- **線性 11 步檢核表**（開新 view / theme / KPI，2026-07 自專案 CLAUDE.md 遷入）：`references/stages.md` 檔首
- **多寬度截圖 SOP**：`references/multi-viewport-screenshot.md`
- **資料缺口處置決策樹**：`references/data-gap-triage.md`
- **Push 失敗 fallback**：`references/push-fallbacks.md`
- **配套 skills**：`/check-schema-exposed` / `/scaffold-rpc-wrapper` / `/cross-repo-status`
- **配套 agent**：`schema-drift-auditor`
