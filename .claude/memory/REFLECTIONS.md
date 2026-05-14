# REFLECTIONS — Session 反省（append-only）

> 每次 `/wrap-up` 追加。**絕對不刪舊條目**。
> 格式：What worked / What didn't / Next-time rules / Memory 產出

---

## 2026-05-14 · Session 2 · 全程從設計階段到 6/6 KPI LIVE

### 本 session 做了什麼

從 user「進 mini-taiwan-info/ 跑 Phase 0」開始，**單一 session 跑完 Phase 0a+0b+0c+0d+0b+ A-1/A-2/A-3/A-4**，21+ atomic commits 跨 3 repos，5/6 → 6/6 KPI LIVE，View A + B + C 全可用。最後 user 要求 /init + 移植 wrap-up framework，於是建立 `.claude/` 結構。

### What worked

1. **三個 audit Agent 並行**（design docs / Supabase 水資源 / 資料取用模式）一次性釐清架構問題，避免邊做邊發現
2. **AskUserQuestion 在關鍵架構決策（Vite vs Next.js / Supabase 直連 vs FastAPI）** 用 user 拍板取代我自作主張
3. **Phase 拆分（0a foundation → 0b scaffold → 0c real-data → 0c-C extend → 0b+ A1-A4 補完）** 每個都有明確驗收
4. **真實資料一接通就發現 mock 數字超不準**（蓄水率 56.7% vs 72.3%、阿公店 8.6% vs 28.3%）— 強化「真實資料優先」原則
5. **agent-browser 系統性截圖檢核** 抓到多個 UI overlap 問題（Donut、section-subtitle、between layout）
6. **atomic commit 跨 3 repos**：用具體檔名 `git add` 避免誤觸 user 其他 untracked 工作
7. **Background Task Agents 寫 ETL pipeline** 與主線並行（C + B1 並行）— 省 1-2 天

### What didn't / 失誤

1. **首次 typecheck 漏發現 `byCode3` unused import** — pnpm dev 跑起來才警報。下次：每個 file 寫完先 pnpm typecheck
2. **首次 setup vite.config.ts 沒設 server.fs.allow** — 跨資料夾讀 yaml 被擋。應該預設知道（已記 INCIDENTS）
3. **LPCD pipeline 的 table_exists 邏輯 bug** 是 Background Agent 寫的，我沒 review 到。下次：Agent 產出後過一遍關鍵邏輯
4. **Donut label 重疊** + **section-subtitle 緊貼** + **`.between` 重疊** — 三個 CSS 移植問題到 user feedback 才修。下次：移植 prototype CSS 時，跑 agent-browser systematic audit 主動找重疊
5. **「人均日用水量· TOP 5」少空格** — 中文 + `·` 之間應該有空格，我寫死沒注意
6. **Phase 0d apply 時 SQL bug**（reference.counties.id_moi vs USING(county_id)）— 第一次 apply fail。下次：寫 migration 時，column name 寫完 reference 一遍

### Next-time rules

- **每次 prototype CSS 移植**，跑一遍 agent-browser screenshot 系統性 audit（View A / B (各 tab) / C），不只看單頁
- **改任何 layout / spacing / overlap 相關 CSS**，必跑 agent-browser 截圖驗證
- **Background Task Agent 產出**，過一遍關鍵邏輯（特別是 DB 互動的 helper）
- **改 manifest / data SSOT / docs/04**，必跑 pnpm typecheck（已寫進 wrap-up SKILL.md Stage 3）
- **中文 + 標點符號**，前後加空格（「人均日用水量 · TOP 5」非「人均日用水量· TOP 5」）
- **寫 migration 時**，先在 psql REPL 跑一次完整 schema 確認 column names 對齊

### Memory 產出（本 session）

新增 `.claude/` 結構：
- `CLAUDE.md` (root, /init 主產出)
- `.claude/FRAMEWORK.md` (從 taipei-gis-analytics 移植)
- `.claude/skills/wrap-up/SKILL.md` (mini-taiwan-info 客製版)
- `.claude/memory/` 9 個檔（首次填充含本 session 累積知識）

INCIDENTS append 6 條：LPCD 表空誤判 / gitignore SSOT / Vite fs.allow / Donut CSS / section-subtitle / .between layout

BACKLOG 新增 20+ 項（View D / 月雨量 MV / home-basics v1.1 升級 / TGOS wrapper / ...）

CROSS_REPO: 4 gis-platform + 2 taipei-gis-analytics commits，未 push

PRINCIPLES: 6 個拍板決策

PLAYBOOKS: 6 個 SOP（新主題 / RPC 接入 / agent-browser / migration apply / atomic commit / counties SSOT cascade）

GLOSSARY: 縣市三軌 + RPC + 表 + Mapbox + datagov 完整索引

### 對 wrap-up skill 本身的反省（本次）

第一次跑 wrap-up 是「初始化 memory」而非「session 結束總結」，9 個檔的 initial content 從本 session 全部知識中提煉。看起來流程順暢。下次正式 wrap-up（不是初始化）時，應該：

- Stage 1 加：「對比 上次 STATUS 跟現況差異」（now: STATUS 是空白第一次寫；之後是 diff）
- Stage 2 加：「若 BACKLOG > 30 項，提醒清理 P3」（現在 20 項還好）
- Stage 3 加：「列出本 session 影響的 file count」給 user 一眼看規模

這些待第一次 production wrap-up（不是 init）時驗證再進 PLAYBOOKS。

---

## 2026-05-14 · Session 2 後綴 · 試跑 /wrap-up

### 觸發

User 喊「試跑一次 /wrap-up」— 在剛建立 framework 後立即測試 SKILL.md 5 階段流程。

### 跑的結果

- Stage 1 (Gather)：成功讀 9 memory 檔 + git log 跨 3 repos + git status
- Stage 2 (Analyze)：辨識本 session 變動已**幾乎全部反映**在剛寫的 9 個 memory（因為是同 session 內初始化 + /wrap-up）。新東西只剩 STATUS 加 wrap-up 完成 + REFLECTIONS append 本條
- Stage 3 (Draft)：列 diff，2 個檔（STATUS rewrite / REFLECTIONS append）
- Stage 4 (Confirm)：問 user
- Stage 5 (Atomic Commit)：等 user OK

### 發現的 Skill 改進點（內生）

1. **初次跑 wrap-up 跟之後的 wrap-up 流程不一樣**。初次是「把整 session 知識倒進 9 檔」，之後是「diff 自上次 STATUS 起的變動」。SKILL.md 應該明確區分這兩個 mode。**TODO**: 在 SKILL.md 加「Mode A: init / Mode B: incremental」說明。

2. **跨 repo `git log --since="..."` 不精準**。User 在其他 session 改的 commits 也會被抓進來（如 `2872595 fix(waste)` 不是本 session 改的但 since filter 包進去）。應該改用「hash whitelist」— 本 session 寫過哪些 hashes 直接指定。**TODO**: SKILL.md Stage 1 Gather 改用 git reflog + 對應 hashes。

3. **跑 wrap-up 不會自動驗證 typecheck**（SKILL.md 寫了「manifest 變動才驗」），但這次也沒改 manifest 所以沒跑。下次有改 manifest 的 session 結束時驗證一下實際是否會跑。

4. **STATUS 跟 _STATUS.md (root) 雙寫**很容易脫鉤。看到 root `_STATUS.md` 寫得比 `.claude/memory/STATUS.md` 詳細，後者更精簡。下次 wrap-up 應該確認兩者「分工」而不是「同步」（root 是 user-facing 完整版，memory 版是 next-session handoff）。

### What worked（本次試跑）

- SKILL.md 流程清晰，能照著跑
- self-audit 數字（commit 數 / 行數 / DB 列數）有 hard verification
- 9 檔分類清晰，每個事件能對到唯一一個檔

### Next-time rules（加進 SKILL.md）

待這次 commit 後，馬上回頭修 `.claude/skills/wrap-up/SKILL.md` 加：
- Stage 0: 判斷 init mode vs incremental mode
- Stage 1: 加 git reflog hash whitelist 寫法

→ 這就是 SKILL **自我演進**機制驗證成功（從本次體驗回頭改 skill 自己）。

---

## 2026-05-14 · Session 3 · Cycle 1（3 P0 fix）+ /water-loop skill 固化

### 本 session 做了什麼

User 問「確認進度 + 規劃水資源循環 + 是否可自循環不介入」。流程：

1. Discovery 三 agent 並行（截圖 / 資料候選 / gap 分析）
2. 拍板「先修 P0 bug」+「半自動 3 checkpoint」
3. 改 3 個 P0（explode 22 / PointProfile drill / theme-aware headline）
4. 拆 3 atomic commit
5. Push 被 GitHub secret scanning 擋 → `git filter-repo --replace-text` rewrite 27 commits → force push 成功
6. 處理 gis-platform 落後（pull --rebase 8 commits 在 origin/main 3 auto-sync 之上）+ push
7. 寫 `.claude/skills/water-loop/SKILL.md`（半自動 5 階段 + 3 checkpoint）+ 加入 CLAUDE.md skills table

最終 5 commit on mini-taiwan-info（3 fix + 1 secrets + 1 skill）+ 三 repo 全 push。

### What worked

1. **三個 Discovery agent 並行**省時間。截圖 / 資料候選 / gap 分析平行進行，~ 4 min 拿到全貌
2. **AskUserQuestion 在關鍵分歧拍板**（路線 A / 自動化程度 / commit 顆粒度 / push 目的地 / token 處理 / revoke 與否）— 6 次 ask，每次都減少猜測成本
3. **半自動 3 checkpoint 結構穩**：cycle 1 純前端沒用到 Checkpoint A（apply migration），但 B + C 都派上用場
4. **filter-repo 一次性解 secret scanning**：backup → working tree placeholder → commit → replace-text → force push，整套 5 min 內跑完
5. **拆 atomic commit 用「git restore + redo Edit」**：3 個 hunk on ViewA.tsx 拆 3 commit 順利，比 `git add -p` 在 Bash 工具下穩
6. **/water-loop skill 寫成後立刻被系統 auto-load 進 skills list**（看 system-reminder skills 區）— 不用手動註冊，CLAUDE.md skills table 只是 user-facing 文件

### What didn't / 失誤

1. **P0-2 誤判 30min**：Discovery 截圖 agent 報「桃園 ViewB = 0 座水庫」，列為 P0；實際走過去看是 fetch 時序假象。**自循環設計必須包含 sanity-check 環節**（手動 click 驗證一次）— 已寫進 /water-loop SKILL Stage 1
2. **mini-taiwan-info 沒設 remote 才發現**：第一次 push 才 error。下次新 repo 第一個 commit 後就 `git remote -v` 確認
3. **Mapbox token 進 history 不是本 session 造成**（是 Phase 0a designs 階段留的），但本 session 第一次 push 才爆出來。教訓：每次新 push remote 之前 grep 一次 token pattern
4. **Bash cwd 持久跨命令**踩了一次：跑完 `cd ../gis-platform` 後下一條 git commit 還在那邊 → no changes added。要回 `cd /full/path/to/mini-taiwan-info` 重做。INCIDENTS-worthy 但不收錄（一次性 confusion，不是 rework）
5. **/wrap-up 觸發後沒先 read 完整 9 個 memory 就動手**：第一次只 read 6 個（前 cycle 1 已讀），補讀 3 個（INCIDENTS / PLAYBOOKS / GLOSSARY）。下次 wrap-up 進 Stage 1 一律並行 read 全 9 個檔

### Next-time rules

- **每次 cycle Discovery 截圖 agent 回報「N=0 / ━ / 全 None」結論**：自動觸發 sanity-check（手動 click 驗證一次，或更長 wait + re-screenshot）
- **新 push 到 remote 前**：grep 一次 secret pattern + `git remote -v` 確認 remote 設了
- **Bash 工具跨命令注意 cwd 持久**：跑 cd 跨 repo 後，每個 commit 操作前用絕對路徑 cd 回來
- **/wrap-up Stage 1**：強制並行 read 全 9 個檔（含 INCIDENTS / PLAYBOOKS / GLOSSARY），不要因為「上次讀過」就略過 — REFLECTIONS / INCIDENTS 是 append-only，上次讀的可能已過期

### Memory 產出（本 session）

新增：
- `.claude/skills/water-loop/SKILL.md`（半自動 5 階段 + 3 checkpoint SOP）

更新 8 個 memory 檔：
- STATUS rewrite（Session 3 結束狀態）
- BACKLOG 加 B021-028（cycle 2 候選 + ViewB 視覺缺口）+ 移完成項
- PRINCIPLES append（Cycle 流程 / Secret 永遠走 .env）
- PLAYBOOKS append PB-07/08/09（filter-repo / atomic commit 拆 hunk / 三 repo push）
- INCIDENTS append（Mapbox secret scanning / agent fetch 時序假象）
- REFLECTIONS append（本條）
- CROSS_REPO update（三 repo 全 push 完成）
- GLOSSARY append（Cycle / Mode / placeholder / 時序假象）

### 對 /water-loop skill 本身的反省（首次定義）

Skill 寫完只是 v1.0，**未跑過第 2 cycle 驗證**。預期下次 cycle 2（接 BOD/DO 或 45136）會發現：
- Stage 3 Mode D（資料整合）的細節是否真夠用
- Checkpoint A 給 user 看 sample rows 的 UX 怎麼設計最直觀
- 視覺化拍板（Checkpoint B）若有 2-3 個視覺化選項要怎麼 preview

第 2 cycle 跑完一定回頭修 SKILL.md。**Skill 自演進機制** 第二次驗證。

### 對 Mode B Incremental /wrap-up 的反省

第一次正式跑 Mode B（非 init）/wrap-up：
- 本 session commit 範圍用「上次最後 commit hash + ..HEAD」精準鎖定 ✅
- 每檔事件分類清晰，沒重複 / 沒漏 ✅
- User 信任「直接下 commit 不細 review」— Mode B 在 user trust 建立後可省 confirm 步驟，比 Mode A 快 50%
- 但仍需 Stage 3 給用戶看「總表」（檔/動作/摘要）讓 user 一眼決定 batch confirm vs 逐個 review

下次 /wrap-up 若 Mode B：直接列總表 + 一個 yes/no question（「直接下 commit 還是逐個 review」），不要再列 8 個 option。

