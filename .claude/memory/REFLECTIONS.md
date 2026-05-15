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

---

## 2026-05-14 · Session 4 · Cycle A (水質) + Cycle B (IA 重組) + LIVE 用詞嚴守

### 本 session 做了什麼

從 user「請以此來訂定目前的 info 水資源體系的 status，讓我可以開始試著實作」開始：

1. 寫水循環體系 status doc (`docs/themes/water-system-cycle.md`)，盤點 6 層 11 個 cycle
2. 觸發 /water-loop Cycle A：水質測站 BOD/DO
   - Stage 1 Discovery 發現 epa_river 站表存在但 reading 0 筆（pipeline 漏抓）
   - Stage 2 Plan 拍板 A3 (A1 主線 + A2 補河川 pipeline 並行)
   - Stage 3 Execute: migration 097 (2 RPC + jq_extract_numeric helper) + frontend (query/hook/WaterQualityTab) + spawn agent 寫 A2 pipeline
   - Stage 4 Verify: ViewB「河川水質」tab 顯示新北市翡翠水庫 20 測點 DO 8.83
   - Stage 5 Commit: 3 atomic commit 跨 3 repo
3. **user 抓 LIVE 用詞濫用** → 大轉折
   - 拍板 LIVE 嚴格定義（collector cron 才叫 LIVE）+ 用詞嚴守
   - 建 DataAgeBadge component 6 級 freshness 自動分類
   - audit data-collectors/ 確認真 LIVE 只有 water_reservoir / rain_gauge_realtime / 地下水位
   - 改 WaterQualityTab 3 處 LIVE → DataAgeBadge
   - patch _STATUS/STATUS/BACKLOG/water-system-cycle 舊 LIVE 錯字
4. **user 觀察「水質都是水庫的為何不在水庫 tab」** → Cycle B IA 重組
   - 拍板「依水循環層」7 tabs（取消「水質」「基礎設施」獨立 tab）
   - manifest water.yaml v1.2 重編 tabs[]
   - ViewB.tsx 大改：WaterQualityTab → WaterQualitySection 共用 helper / 新建 RiverTab/GroundwaterTab/FloodTab/SuppliesTab
   - typecheck pass + agent-browser 截 7 tabs 全驗證
   - 25 分鐘完成（超快）

最終 8 個 commit on mini-taiwan-info + 1 個 gis-platform + 1 個 taipei-gis = 10 commit 跨 3 repo。

### What worked

1. **/water-loop skill 第 2 次正式跑（Cycle A）流程順暢**：5 階段 + 3 checkpoint 都 fire；agent 並行寫 A2 pipeline + 主線跑 frontend 完全並行
2. **Discovery agent 並行 3 個**（screenshot / 資料候選 / gap 分析）省時，但**要 drill SQL 驗證**才能對抗 agent 報告失準
3. **Cycle B IA 重組 25 分鐘做完**：拆 WaterQualitySection 共用 helper 比拆三邊小元件容易；7 tabs 一次拍板 + typecheck + 截圖一次過
4. **incremental commit 救命**：user 提醒「持續 commit 假設壞掉能回」之後改變策略，Cycle A 每階段都 commit 一個，Cycle B 也是
5. **AskUserQuestion 在 LIVE 拍板處**：「collector 持續跑哪些 dataset」用 multiSelect 讓 user 一次拍板多個資料源
6. **去 data-collectors/ 自己看** 比問 user 「你 collector 跑啥」更快又準確（user 也提示「請直接去 data-collector/ 確認」）

### What didn't / 失誤

1. **LIVE 用詞濫用 30 分鐘**：之前 cycle 1 + wrap-up 一直寫「6/6 KPI 全 LIVE」「LIVE 接好」沒 user 抓我就一直犯。**新原則寫進 CLAUDE.md（全域可見）+ PRINCIPLES**
2. **Discovery agent 報告失準**：「water_quality_stations 2449 + readings 8775」沒拆 source 看，差點直接做「河川水質」tab 但實際 0 reading。**SKILL Stage 1 已加「by source freshness 驗證」**
3. **Migration dry-run 用 transaction rollback 失效**：migration 內有 COMMIT 提前結束我的 outer BEGIN，function 不小心被 apply 進 DB。下次 dry-run 要拿掉 migration 內 COMMIT 或用其他方式
4. **dev server 中途死掉沒發現**：跑 typecheck pass 跑 agent-browser 截全白才知道。SKILL Stage 4 加 curl health check
5. **commit message 內 LIVE 錯字已 immutable**：5075b87 / 95bc30e 標題寫 LIVE，git history 動不了。下次嚴守用詞，commit 前再讀一遍 message
6. **WWTP 圖示換錯**：lucide-react 沒有 Pipette/Pipe icon，用 Recycle 替代 supplies tab — 不完全直觀但夠用

### Next-time rules

- **接新資料 cycle 起手**：先 `SELECT count + by source` drill 真實 freshness，不單信 agent 「N 站 + N reading」報告
- **migration dry-run**：拿掉 COMMIT 或用 `psql -c "ROLLBACK; BEGIN; ..."` 包，避免 accidentally apply
- **dev server health check**：agent-browser 截圖前 `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` 確認 200
- **「LIVE」字嚴守**：commit / docs / 對話一律 collector cron 才能用；其他用「接通真實資料」（CLAUDE.md 第 9 條）
- **IA 重組（Mode V）SOP**：依 PB-10 走 — manifest 先動 / ViewB 結構 / typecheck loop / 截圖驗證 / atomic 拆 commit
- **跨 4 repo 不是 3**：data-collectors/ 也算 GIS 部曲，未來 cycle 涉及 collector cron 設定要去這個 repo

### Memory 產出（本 session）

新建/更新：
- `frontend/src/components/DataAgeBadge.tsx`（新 component，6 級 freshness）
- `frontend/src/components/views/ViewB.tsx`（IA 重組 + 4 新 tab component + WaterQualitySection 共用 helper）
- `frontend/src/lib/queries/water.ts`（+2 fetch + 4 types）
- `frontend/src/hooks/useWaterQuality.ts`（新 hook）
- `gis-platform/migrations/097_water_quality_rpcs.sql`（2 RPC + helper function）
- `taipei-gis/pipelines/water_resources/extensions/03_load_water_quality.py`（+118 行 wqx_p_01 endpoint）
- `themes/water.yaml` v1.2 county_dashboard.tabs[] 重編
- `docs/themes/water-system-cycle.md`（新 doc，468 行 roadmap）

PRINCIPLES append 2 條：LIVE 嚴格定義 + 用詞嚴守
CLAUDE.md append 1 規範：LIVE 用詞守則（全域可見）
INCIDENTS append 3 條：river reading 漏 / LIVE 用詞濫用 / dev server 中途死
PLAYBOOKS append PB-10 ViewB IA 重組 SOP
GLOSSARY append: ViewB IA v2 / WaterQualitySection / DataAgeBadge / data-collectors / 新 RPC + 13 個表清單
BACKLOG: 移完成項 + B029-B040 共 12 個新項

### Cycle 模式驗證

第二次正式跑 /water-loop（Cycle A）+ 第一次 Mode V（Cycle B）：
- Cycle A 是 Mode D（資料整合）→ Checkpoint A migration apply 前停 + Checkpoint C commit 顆粒度都跑了
- Cycle B 是 Mode V（視覺重做）→ 強化 Checkpoint B 視覺拍板（給 user 選 7/8 tab + IA 結構）
- **SKILL.md 雙模式都驗證**

### 對 /water-loop skill 本身的反省

需回頭修 SKILL.md：
1. Stage 1 Discovery agent 報告**必須加 SQL drill 驗證**（這次 epa_river reading 0 筆教訓）
2. Stage 4 Verify 前**加 dev server health check**
3. Stage 3 Mode D 加「migration dry-run 拿掉 COMMIT」hint
4. Mode V 強化 Checkpoint B：給 user 看 ASCII layout preview（這次拍板 7 tab 用 ASCII 結構列就有效）

留下個 cycle 或 wrap-up 後回頭改 SKILL.md。

---

## 2026-05-15 · Session 5 · 消防主題 ViewA Phase 1（4 區塊 + 接通真實）

### 本 session 做了什麼

User 開場：「接續做 fire 主題資料端 TODO-1 → 完成後接著做 → 然後依設計實現 + 接真實」。流程：

1. 讀 3 個 fire 文件（handoff / tic / progress）+ 既有 fire.yaml v1 + 設計 SPEC
2. 跑 TODO-1 upload script — 發現 fire.incidents 已 48,626 筆（前次跑過），refresh 4 MV 確認
3. TODO-2/3 跳過（user 拍板「全前端 + 接所有現有真實 + mock 標 placeholder」）
4. 拆 9 個 F-task：F0 manifest / F1 queries / F2 hook / F3 components / F4 CSS / F5 routing / F6 typecheck / F7 codex review / F8 截圖 / F9 commit
5. 寫 fire 全套：themes/fire.yaml v2 + queries/fire.ts 370 行 + useFireData hook + 11 components + ~550 行 CSS + App.tsx routing
6. 撞 PostgREST 牆 → 寫 migration 104 在 public 建 wrapper views/RPCs → 改 queries 走 public
7. Codex review 抓出 2 critical（ViewB 路由 / 水主題 layer 仍渲染）+ 6 improvement → 全修
8. agent-browser screenshot 9 張驗證 4 區塊
9. Atomic commits 共 8 個（gis-platform 1 + taipei-gis 1 + mini-taiwan 6）
10. User 回報 3 個 CSS bug：河川層仍顯示 / KPI 窄頁壓垮 / S4 雙欄擠 → 修完 +3 commit
11. /wrap-up 結束

最終 6 個 mini-taiwan-info commits（init phase）+ 3 個 css fix commits + memory commits

### What worked

1. **設計 SPEC + Anthropic bundle 兩來源對齊** — SPEC.md 高層敘事 + view-a-fire.jsx low-level 結構，互補產出完整 mental model
2. **並行 task agent**：codex review + agent-browser screenshot 並行跑，省時間
3. **任務拆 9 個 F-step + STATUS doc** — _FIRE_IMPL_STATUS.md 把 backend ready/not-ready 跟 27 個元件 data source 一張表釐清，避免邊做邊發現要 mock
4. **TypeScript 全程強型別** — `Cause5Id` literal union + 強制 bigint → number 轉換 + RPC 簽名對齊原 SQL，typecheck 0 error
5. **Mock data 命名 + UI 標示一致** — `lib/mock-fire.ts` 全部標 Sprint X 待ETL，UI 元件 KPI label 旁 `<span class="muted">待ETL</span>` 等等，user 一眼看穿哪些真哪些假
6. **Codex review 是 critical bug 抓手**：手動 review 漏掉「點 fire 縣市進 water ViewB」+「water layer 仍顯示」兩個 critical，codex 一眼抓到（PB-08 driver 驗證成功）
7. **跨 repo migration 拆分**：fire schema 099 已 apply 過，本 session 只加 104 wrapper（atomic + 不動歷史 migration）

### What didn't / 失誤

1. **沒先測 `withSchema("fire")` 能不能跑** — 純 typecheck pass 就寫完所有 query，跑到 dev server 才發現 PostgREST 不 expose fire schema。**rework：寫 migration 104 + 改 4 處 fire.ts `db` 引用 + 改表名 `cause_taxonomy` → `fire_cause_taxonomy`**。應該寫第一個 query 後**立即 dev server 跑一次驗 fetch**
2. **wrapper RPC 簽名第一次寫錯** — 抄了不存在欄位（street / cause_22_name / cause_5_name / response_minutes），migration 104 apply 報「return type mismatch」，rework 1 次。應該先 `SELECT pg_get_function_result('fire.list_incidents'::regprocedure)` 拿原 RPC 確切簽名再寫 wrapper
3. **MapView 寫死河川基底層**沒 audit 到 — user 切到 fire 主題才回報「消防圖層有河川」。應該在 fire routing 設計時，**grep `MapView.tsx` 找所有 `map.addLayer` 看哪些是水主題專屬**
4. **KPI cols-4 響應式漏了** — 沒測過窄頁面，user 截圖才看到 label 被截 + value 強制斷行。應該 implement 時就**拖視窗測過 1100/900/600 三個寬度**
5. **S4 1fr 320px 雙欄太天真** — 設計圖在桌面寬看起來 OK，但 dashboard pane 只占 viewport 40%，1fr 那欄被 320px 擠到只剩 100px → 表格縣市名變直排。**設計時就該知道 pane 寬 = viewport × 40%**
6. **`themes/fire.yaml.v1.bak` 留了** — 備份檔該 commit 前刪。已清

### Next-time rules

- **新 schema 第一個 query 寫完後立即 dev server fetch 驗證** — 不能只信 typecheck（PostgREST schema / RLS / RPC overload 都跑得起來才知道）
- **寫 wrapper RPC 前**：psql 跑 `SELECT pg_get_function_result('schema.rpc'::regprocedure)` 拿確切簽名 + `\df+ schema.rpc` 看 argument 順序
- **新主題 implement 階段就 grep `MapView.tsx` `map.addLayer` `map.addSource`** 列出所有寫死的水主題層，加 `showXxxBaseLayers` prop
- **新元件涉及 dashboard pane（窄容器）時，拖視窗測 4 個寬度**：>1500 / 1100-1500 / 900-1100 / <900
- **dashboard pane 內 grid 永遠用 1fr 或 1fr 1fr，不用固定 px 欄寬**
- **備份檔（.bak / .old）commit 前一律 rm**
- **Codex review 在 critical changes 完成後立刻派**（不要等 wrap-up 才補）— PB-08 driver 已驗證有效

### Memory 產出（本 session）

新增（無新 skill / file）。
更新 8 個 memory 檔：
- BACKLOG: +7 fire 後續 (B041-B047) + 完成 3 項
- PRINCIPLES: +2 拍板（PostgREST wrapper / KPI 響應式斷點）
- PLAYBOOKS: +PB-10 開新主題完整 SOP（跨 3 repo）
- INCIDENTS: +3 條 fire incidents（PostgREST / MapView / KPI grid）
- GLOSSARY: +8 詞（4 區塊 / cause_5_id / severity / 民國年 / public.fire_* / dashboard pane / cat-block / 待ETL）
- REFLECTIONS: 本條
- CROSS_REPO: 更新 pending（mini 11+ / gis 1 / taipei 1 ahead）
- STATUS: rewrite（下一步：mock 替換真實，3 條方向）
- _STATUS.md (root): 加 Session 5 段

### 下一個 session 的目標（user 明說）

**把 fire 主題所有 mock 都替換成真實**。最高優先三條：
1. TODO-3 MOI 5 表 ETL（解 S1 財損 + 起火處所，3-4 天）
2. TODO-5/6/7 7 都分隊 + 374 筆 Google geocoding（解 S2，5-7 天）
3. fire 地圖層 dot + heatmap（用現有 fire.incidents 立即可做，1-2 hr）

詳見 STATUS + BACKLOG B041-B047。


