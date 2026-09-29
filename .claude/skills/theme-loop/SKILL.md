---
name: theme-loop
description: 處理 mini-taiwan-info 既有主題的資料接線、KPI、視覺或真實資料替換；依變更範圍選擇必要的資料、前端與驗證工作。
user_invocable: true
---

# /theme-loop — 通用主題資料/視覺迭代循環

## 核心原則

每跑一次 `/theme-loop` 完成 **一個 cycle**（一個 P0 bug / 一個資料整合 / 一個視覺重做 / 一個 mock → 真實替換）。

| 原則 | 為什麼 | 對比 |
|---|---|---|
| **半自動** | 自動跑 discovery / typecheck / 截圖 / codex review；user 拍板 4 個 checkpoint | ❌ 全自動 → user 失控 ✅ 自動低風險 + 拍板高風險 |
| **不破壞既有** | 不自動 apply migration、不自動 push、不自動 commit | ❌ Claude 覺得對就動 ✅ migration/push/commit 必 user 同意 |
| **可重入** | 跑到一半中斷後以 task 摘要接續 | ❌ 跑到一半得重來 ✅ 跨 session 接續 |
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
3. 都不確定才以當前可用的使用者輸入工具問：water / fire / 其他

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

### Stage 1: Discovery（按需）

先依變更範圍選擇下列查核；可獨立的工作才分派給目前平台可用的子 agent。主 agent 保留一個 slot，最多同時 3 個 worker；沒有足夠 slots 或工作彼此相依時，直接依序完成，不以固定人數取代判斷。

| Agent | 任務 |
|---|---|
| A. **Screenshot multi-viewport** | 可用瀏覽器工具截 View A 的受影響桌機與窄版斷點，檢視響應式破版、fetch 時序假象與可改進點 |
| B. **Data candidates** | 對齊 `themes/{theme}.yaml` + Supabase 現有表（含 public wrapper）+ `../taipei-gis-analytics/pipelines/` 找下個 Tier S/A 候選 |
| C. **Gap analysis** | 三類 gap：(1) manifest 列但 UI mock (2) Supabase 有但 UI 沒接 (3) UI 視覺化方式不適合資料形狀 |
| D. **Schema pre-check** | 列當前 `lib/queries/*.ts` 用到的 RPC + table，比對 migrations 有沒對應 wrapper；若主題用非 public schema → 呼叫 `/check-schema-exposed` |

彙整實際執行的查核即可；純文件或小型前端修正不必預設做完整資料盤點、截圖與 schema 預檢。

**詳細 SOP + 防 fetch 時序假象 + 多寬度截圖技巧**：見 `references/stages.md#stage-1`

### Stage 2: Plan（Checkpoint 0：拍板路線 + 資料缺口處置）

彙整 discovery。只有尚未授權的路線選擇、資料處置或外部寫入會實質改變結果時，才用當前可用的使用者輸入工具詢問；本 task 已有的授權沿用，不重問。

1. **這輪做什麼**？列 2-4 個候選（含 mode P/D/V/S、工時、預期效果）
2. **資料缺口處置**：discovery 列出的 missing data，每項分類（決策樹見 `references/data-gap-triage.md`）
   - 純前端能解 → 走本 cycle
   - 要去 taipei-gis-analytics 抓 → 寫進 `.claude/memory/BACKLOG.md` 並提示「要不要本 cycle 兼跑」
   - 純缺資料無 pipeline → 寫 BACKLOG + 標等 ETL（不阻塞本 cycle）
3. **自動化程度**：半自動 4 checkpoint（預設）/ 監督模式每階段停 / zero-touch 純前端

決定範圍後以當前平台可用的任務追蹤方式記錄，進 Stage 3。

### Stage 3: Execute（自動，依 Mode 分支）

| Mode | 步驟 |
|---|---|
| **P. Pure-frontend** | Read 涉及檔 → Edit/Write → 依實際 hook 結果或改動範圍決定 typecheck → Stage 4 |
| **D. Data-integration** | Checkpoint A0 freshness 判定 → Checkpoint A schema 預檢 + wrapper migration 草稿 → 已授權後才 apply → pipeline → frontend queries+hook+component → typecheck |
| **V. Visual rework** | 同 P + 先在 BACKLOG 留底「重做前」+ Checkpoint B 強化 |
| **S. Mock-swap** | 找 mock-{theme}.ts 對應項 → 寫 query + hook + 改 component import → 留 mock fallback → typecheck |

**Mode D 完整流程（含 Checkpoint A0 / A）+ 各 mode 細節**：見 `references/stages.md#stage-3`

**Schema 預檢必跑**（新 2026-05-15）：寫第一個 query 後立即 dev server fetch，不只 typecheck。撞 `Invalid schema` → 呼叫 `/check-schema-exposed` + `/scaffold-rpc-wrapper`。

### Stage 4: Verify（Checkpoint B：三閘）

三件事**並行**跑：

1. **typecheck**：程式或契約變更需要時跑 `cd frontend && pnpm typecheck`。若有可核對的同版本 hook 結果，可記錄並避免重跑；設定檔存在不算結果。
2. **視覺驗證**：layout 或互動變更時，使用當前可用瀏覽器工具，在受影響的桌機／窄版斷點截圖；檢查溢位、文字與資料載入狀態，不把缺資料或尚未載入顯示成 0。
3. **review**：較大或高風險的變更可用目前可用的 review 工具或有界 reviewer；收到 critical issue 才退回 Stage 3。沒有可用工具時，主 agent 做聚焦檢查並如實記錄缺口。

**Checkpoint B**：給 user 看四件
- 實際驗證的視圖與結果
- typecheck 結果或可核對的 hook 證據
- review 摘要與 critical 列表（如有）
- 視覺化選項（若 Mode V）

User 拍板才進 Stage 5。

### Stage 5: Commit / Push（Checkpoint C+D）

**Checkpoint C：commit 顆粒度**

自動草擬：
- 列影響檔案 + atomic 切分建議（一邏輯一 commit）
- 草擬 commit message（`fix:` / `feat:` / `chore:` prefix + Co-Authored-By）

以當前可用的使用者輸入工具詢問（僅在尚未授權時）：
- N 個 atomic commit（推薦）/ 1 個包裝 commit / 不 commit 留 worktree

已授權 commit 時，使用可回復的 staged hunk 切分；不還原、覆寫或處理其他 session 的 dirty 變更。

**Checkpoint D：跨 3 repo push 策略**

跨 repo 有關時才先呼叫 `/cross-repo-status` 看 divergence，再以當前可用的使用者輸入工具確認尚未授權的 push：
- 不 push（保守）/ push 本 repo / 3 repo 全 push
- 若有 behind → 自動 rebase（衝突停下來給 user 處理）
- 若有 secret scanning 擋 → 走 fallback PB-07（細節 `references/push-fallbacks.md`）

`/wrap-up` 推薦在 push 後跑（更新 memory + CROSS_REPO）。

## 客製規則（mini-taiwan-info 專屬）

1. **Manifest / SSOT 變動 → typecheck 強制**：改 `themes/*.yaml` / `data/counties.yaml` / `docs/04-*` / `frontend/src/lib/types.ts` → Stage 4 必跑 typecheck；只有可核對的同版本 hook 結果才可免重跑。
2. **跨 3 repo 變動 → 更新 CROSS_REPO.md**：改 `../gis-platform/` 或 `../taipei-gis-analytics/` → 同 session 內更新 `.claude/memory/CROSS_REPO.md` pending
3. **新 pipeline 入庫 → 觸發 data-catalog-audit**：新增 `../taipei-gis-analytics/pipelines/` 內 pipeline → 提示跑 taipei-gis 的 `/data-catalog-audit` skill
4. **視覺驗證**：任何 layout / spacing 改動 → 使用當前可用瀏覽器工具，在受影響斷點截圖（PRINCIPLES）
5. **中文標點空格**：「人均日用水量 · TOP 5」前後空格（REFLECTIONS Cycle 1）
6. **LIVE 用詞嚴守**：只有 collector cron + 上游 realtime 才標 LIVE（PRINCIPLES 2026-05-14）

## 注意事項

- **Read first**：每個 Edit 前 Read，避免 old_string 不精確
- **不自動 apply migration / push / amend**：永遠停在 Checkpoint 等 user
- **不污染專案外**：所有 skill / hook / 規則寫在 `mini-taiwan-info/.claude/`，不寫到 `~/.claude/`
- **任務追蹤**：使用當前平台可用的方式；不要假設特定 Task 或 slash-command 介面存在
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
