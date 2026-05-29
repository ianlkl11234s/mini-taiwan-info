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

## 2026-05-16 · Session 6 · B045 fire 地圖層 + B046 fire ViewB（兩個 cycle 一 session）

### 本 session 做了什麼

User 開場引用 HANDOFF_NEXT_SESSION.md，目標「fire mock 換真實」。一次 session 跑完 2 個完整 cycle：

**Cycle 1 — B045 fire 地圖層**（Mode V+P，純前端 1-2 hr）：
- /theme-loop fire → 4 並行 discovery agent 確認 fire.incidents 100% 有 lat/lng + public.fire_list_incidents RPC 已暴露（不用 migration 105 — agent D 報錯，實際後續驗證需要 wrapper view）
- MapView 加 fire-incidents-heatmap + fire-stations-pt + fire-stations-label
- 補水主題 gate 漏網之魚（reservoirs-pt / reservoirs-label / river-stations-pt 沒被 gate）
- 加「無染色」灰底模式（METRIC_NONE sentinel）— user 截圖踩到「分隊密度紅 + heatmap 紅」整片紅看不清才意識到要做
- buildFirePointLayers 5 toggle panel（hotspots/stations enabled，hydrants/forestRisk/emsHospital disabled 待 Sprint）
- 兼修 1100×700 邊界裁切（@media (max-width: 1200px) padding/gap/grid min 縮）
- B048-B050 backlog 加（800×600 stack / Donut 溢位 / KPI 單位緊貼）
- Codex 抓 1 critical（heatmap z-order 蓋縣市標籤）→ addLayer beforeId='counties-border' 一行修
- heatmap paint 漸層調整（user 截圖太紅後 weight 1→0.6 / intensity zoom6 0.6→0.25 / 加 7 個 color stops）
- 4 commit 上 origin/main

**Cycle 2 — B046 fire ViewB 縣市儀錶板**（Mode D 跨 repo，~3-4 hr）：
- /theme-loop fire → 4 並行 discovery → 結論：fire 5+22 cause MV 缺 county_id 維度，必須新 migration
- gis-platform/migrations/105 incidents_by_county_cause_year MV + public wrapper（823 rows applied）
- frontend ViewBFire.tsx 1170 行（Hero + Radar 5 軸 + 5 sub-tabs：overview/incidents/response/service/others）
- 雷達拍板「5 軸去掉財損」（schema 無 property_loss 欄位）
- Codex 抓 2 critical：
  - **norm() lower-better 軸方向錯**（火災密度 v=14 = 外圈 = 視覺「最危險」但同一圖內 stationDensity v=14 也 = 外圈 = 視覺「最好」，矛盾）→ 統一 score 公式 `lower-better: 1 - v/max`，外圈永遠 = 表現好
  - **hydrants=0 對 18 縣市被當真值**（4 都才有資料）→ 設 null，雷達/avg/verdict 跳過該軸
- User 截圖回報「分隊清單看起來只是文字 list」→ 發現移植 ViewBFire 沒一併把設計 bundle 的 fire-* CSS（.fire-radar-card / .fcm-row / .fire-station-grid 等 9 組）append 到 globals.css → 補 184 行 + 加 `--accent-fire-deep` / `--accent-fire-soft` CSS 變數
- 1 commit gis-platform + 1 commit mini-taiwan-info（含 6 檔）

### What worked

1. **2 cycle 一 session 跑得完** — Mode P (B045) → Mode D (B046) 不同模式都 fire；context 控管靠 discovery agent 並行 + 細部 read 用 grep 限縮
2. **discovery agent 並行 4 個** 兩個 cycle 都用 — schema 預檢 / data candidates / structure gap / current screenshot；agent D schema 預檢避免亂跑 migration（B045 不需 / B046 需要）
3. **Codex review 對 critical bug 3 連抓**（B045 z-order / B046 norm 方向 / B046 hydrant 0）— 都是視覺上很難察覺但邏輯上嚴重的錯誤。PB-08 driver 第三次驗證成功，採納為「視覺/數值類大改動必派 codex」strict rule
4. **/theme-loop skill 5 階段第三 / 四次跑** — TaskList 跟 stage 對應穩定，Stage 2 拍板 AskUserQuestion 用得順
5. **CSS verbatim 從 design bundle 直接拷貝** — 184 行 fire-* 樣式 grep + append 一氣呵成，沒 rework
6. **migration 105 用 scaffold-rpc-wrapper 心智模型**（雖然沒實際 invoke skill）— LEFT JOIN cause_taxonomy 保留 null cause + public wrapper view + security_invoker，0 rework
7. **atomic commit 跨 2 repo** — gis-platform migration 105 / mini-taiwan-info ViewBFire 1 commit 6 檔（合理：B046 是一體變動）

### What didn't / 失誤

1. **B045 user 第一次截圖看到「整片紅」** — 我沒在 heatmap 上線 + 著色指標切到「分隊密度」（紅 ramp）同時 preview 視覺，user 才意識到要做「無染色」模式。**下次：色彩衝突要在 Stage 2 plan 階段就 simulate**
2. **雷達圖 norm() 方向反向** — 我直接 copy view-b-fire.jsx 公式（`v / max`）沒思考 lower-better / higher-better 混在同圖內視覺意義，codex 才抓
3. **hydrants 0 對 18 縣市** — copy 設計時沒注意這是「沒這資料」不是「密度真的 0」，雷達 verdict 把每個非 4 都縣市都標「比全國差」，codex 抓
4. **CSS 移植漏網之魚** — ViewBFire.tsx 寫完 typecheck 過、scaffold 看似完整，但跑 dev server user 看到「只是文字 list」— 沒記得 globals.css 缺對應 fire-* className。**下次：移植 design component 必須 grep `styles.css` 對應 className 區段，一併 append**
5. **agent D Schema 預檢第一次 wrong call** — 對 B045 報「不需 migration」沒問題；但對 B046（5+22 cause 縣市版）一開始也是 RPC 直接撐住的論點，但後來討論才確認 MV 缺維度。**Discovery 階段 agent 報告要明確問「縣市維度可用嗎」，不要只看「RPC 是否暴露」**
6. **設計稿 fire-* CSS 沒在 Session 5 fire ViewA 時就移植** — 因為 ViewA 只用到 fire-bar-row / fire-table / fire-timeline，剛好都有 globals.css 內，沒撞牆。等 ViewB 加 fire-radar-card / fcm-row / fire-station-grid / fire-buffer-legend / fire-risk-bar 才爆，這是 Session 5 沒一勞永逸把整套 fire-* CSS 一起移植的後果

### Next-time rules

- **新主題大改動完成後，到瀏覽器切 metric / point layer / theme 4-5 種組合 preview 視覺衝突**（特別是相同 color ramp 同時 active 時）
- **雷達圖 / 進度條 / score-based 圖表，所有軸用統一 normalized score（0=worst, 1=best），外圈永遠=表現好**；混 higher/lower-better 軸時必須反轉公式不是反 goodDir flag
- **mock 0 值要區分 missing vs 真實 density 0** — 寫程式時若 mock 對部分縣市/類別不適用，設 null 而非 0，雷達/平均/verdict 跳過
- **移植 design bundle 元件 SOP（PB-12 提取）**：
  1. Read 完整 jsx file（不是只 grep 結構）
  2. Grep 對應 styles.css 的所有 className 區段
  3. TS strict 化 JSX
  4. Append CSS 到 globals.css 對應主題段
  5. 響應式 media query 防 dashboard pane 窄時擠垮
- **跨 cycle scope creep 處置**：B045 user 中途要求「無染色 + point panel」就重開 Stage 3 不另開 cycle（這次 30min 兼修，順）；但若 user 要求「+ 雷達」那種 1 hr+ 工作量，應該另開 cycle 維持 commit 顆粒度
- **Stage 4 typecheck PASS + codex review 仍可能漏 CSS** — Stage 4 加「user 真實瀏覽器 screen check」明確列為 checkpoint，typecheck/截圖 agent 都驗不出 CSS 缺失

### Memory 產出（本 session）

更新 8 個 memory 檔：
- BACKLOG: B045 + B046 → 完成；B048-B050 已加（前次 commit）
- PRINCIPLES: +3 條（雷達 score-unified / design bundle CSS 一併移植 / mock 0 區分）
- INCIDENTS: +4 條（heatmap z-order / 雷達 norm 反向 / hydrants null / 設計稿 CSS 缺）
- PLAYBOOKS: +PB-12（移植 design bundle 元件 4 步 SOP）
- GLOSSARY: +6 詞（METRIC_NONE / showFireHeatmap / score-unified / FIRE_RADAR_AXES / FIRE_KHH_OUTOF_VILLAGES / 設計稿 className）
- CROSS_REPO: update（B045 push 完 / B046 commit / gis 105 push）
- STATUS: rewrite（fire 主題 ViewA+ViewB 全上線，下一目標 B041/B043）
- REFLECTIONS: 本條

### 對 /theme-loop skill 的反省

- 4 次累計（cycle 1 / 4 / 5 / 6），核心結構穩，但 Stage 1 discovery agent D「schema 預檢」要明確區分兩件事：
  - 「該 schema 是否 PostgREST exposed」（public wrapper 是否存在）
  - 「該 schema 內表的維度是否夠用」（如 B046 需要 county_id 維度但既有 MV 沒有）
  Agent prompt 加「能 by-county filter 嗎 / RPC p_county 對齊嗎」二問
- Stage 2 plan 階段缺「視覺衝突 preview 機制」— 新主題完整跑前，list 出 metric × point layer × heatmap 可能組合，標出已知會撞色的搭配
- Stage 4 Verify 三閘還有缺：CSS / 移植完整性閘（用 grep className 對比 globals.css）
  → 留下次 cycle 跑完一輪後回頭修 SKILL.md（同 v1 反省）

### 對 /wrap-up skill 的反省

- 5 次累計（Session 2 init + Session 2 試跑 + Session 3 + Session 4 + Session 5 + 本次）
- Mode B Incremental 第 4 次驗證流程順
- Stage 0 mode 判斷 + Stage 6 harness audit 兩個 v1.1 加的 stage 都實際 fire
- 待修 SKILL.md：Stage 2 加事件分類表新增類別「移植 design bundle 缺 CSS」→ INCIDENTS

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

---

## 2026-05-16 Session 7 — B047 fire KPI 爆炸視圖（純前端 1 cycle）

**做完**：FireKpiExplode（~260 行）+ FireStackedBar（~100 行）+ S1Incidents wire + globals.css 130 行。fire S1 「年度火災件數」KPI 卡點擊就地展開（grid-column 1/-1 撐滿），4 scale × 4 dim = 16 組合切換 + 圖型自動 + 6 個缺資料組合 inline reason。User 拍板 B047 收斂：只做 1 個 KPI、不做 drill-down、inline 展開（不 modal）。

**這次學到**：

1. **codex review 對 DOM 事件流盲區**（新發現的 codex 限制）
   codex 抓到 1 blocker（unknown cause_5 silently 漏資料）+ 2 nice-to-have（dead branch / hardcoded count）— 全是靜態碼層級分析。**漏掉 KPICard onClick bubble 收回卡片**這個關鍵 runtime bug，要 agent-browser 互動 + `document.querySelectorAll('.kpi-card.expanded').length` 計數查驗才測到。教訓：Verify 階段不能省 agent-browser 互動 — codex + typecheck 對「父子事件 bubble / cleanup / focus management」這類 runtime DOM 行為看不到。寫進 INCIDENTS + PRINCIPLES。

2. **inline-expand 的 CSS 機制**：`.kpi-card.expanded { grid-column: 1 / -1 }` 是 KPI 卡撐滿 dashboard 寬度的關鍵 — 用既有機制就好，不用另寫 modal/drawer。爆炸內容 root 加 `onClick={e => e.stopPropagation()}` 配合無痛。

3. **「資料不足」inline reason 比 disable toggle 好**：16 組合中 6 個無對應 MV（如 月×cause / 日×any-dim）。一開始想 disable button，但 disable 不教育 user 為何不能。改成 toggle 任點，缺資料的組合顯示「⏳ 資料不足以爆炸展開」+ 原因（「月/時段 × 5 大類原因 缺對應 MV」）— 既符合 03-exploded-view-pattern §6 規範，又讓 user 知道資料限制 + 替代方案。

4. **PB-08 codex review SOP 第 4 次驗證有效**：B045（heatmap z-order）、B046（雷達 norm + hydrant null）、B047（unknown enum 漏資料）連 4 次抓 critical。但這次新發現 codex 不抓 runtime 事件流 bug — 補一個 PB-08 衍生：「**Verify 三閘 = typecheck + agent-browser 互動 + codex review**」，不可三選二，每閘抓不同面向。

5. **24 column stacked bar 的 totals overlap**：時段（24h）× 縣市 stacked 時，每柱寬度 ~32px 但 totals number 占 40px 寬會橫向 overlap（截圖見過）。未來主題遇到 ≥ 24 column 要重新評估 label 策略（rotate 90deg / 隔列 show / hover-only / 移到柱內）。先 backlog（B051 候選），不阻塞 B047 完成。

**對應寫回**：
- INCIDENTS: 本次 KPICard bubble 條
- PRINCIPLES: stopPropagation 規則條
- REFLECTIONS: 本條
- CROSS_REPO: Session 7 純 frontend 無跨 repo
- BACKLOG: B047 移已完成
- STATUS: rewrite（B047 done，下一步 B041/B043/新主題）

### 下一個 session 的合理選項（user 5/16 晚對話）

1. **B041 MOI 5 表 ETL**（3-4 天，跨 3 repo Mode D）— 解 ViewA 火災財損 KPI + 起火處所 placeholder
2. **B043 PostGIS 服務圈**（依賴 B042 真實 stations，blocker 多，**不建議現在做**）
3. **開新主題（demographics / safety）**— fire 還有大片 mock 但 ViewA/B 視覺骨架已成型
4. **B051（新）**：24 column stacked bar totals overlap 修法 — 30min 純前端 fix

---

## 2026-05-16 · Session 8 · Water ViewA 6 章敘事重寫（design bundle handoff 第 2 次跑）

### 本 session 做了什麼

User 帶 design bundle handoff URL（claude.ai/design 匯出的 6.4MB gzip tar），要重構水資源 ViewA 從「manifest-driven 6 KPI grid」改成「**6 章敘事結構**」（現況/儲存/水情燈號/處理/使用/災防）。

走完整 /theme-loop 5 階段：
1. **Discovery** 4 agent 並行（baseline 截圖 / 後端 audit / 設計→資料 mapping / frontend 現況）
2. **Plan** mini-audit 後 user 拍板 3 件 spec 改（vs 上月同期 / 月供水量 / hook 架構）
3. **Execute** 8 新檔 + 2 改檔（CSS +568 / queries / hook expand / 6 sections + ViewAWater / App 分派）
4. **Verify** typecheck 0 error + codex 1 BLOCKER + 1 HIGH 修 + 截圖 agent 抓 2 P0 schema 欄名錯修
5. **Commit** 5 atomic commit on mini-taiwan-info（21 commits ahead origin/main，user 拍板不 push）

### What worked

1. **4 並行 Discovery agent 一次盤完整個 cycle 範圍** — Agent B（後端 audit）一個 psql query 確認「migration 098-102 已 apply、表全有資料」校正 user 認知 vs 我認知，省 1 hr 誤判時間
2. **Mini-audit 在 Plan 後 / Execute 前必跑** — 抓到 3 個 spec 不能直接做：(a) reservoir snapshot 30 天保留期沒法 vs 歷年同期 (b) twc_supply_system_monthly 只有 2026-03 單月沒法 12m trend (c) DB 無 sector 欄位沒法用水結構細拆。**User 拍板 spec 改前不寫一行 code**，避免 rework
3. **PB-12 設計 bundle CSS 移植 SOP**第三次驗證有效 — 562 行 styles.css line 1352-1913 verbatim sed append 到 globals.css，pixel-perfect 對齊設計
4. **per-theme ViewA 架構 sib pattern fire ✓ water ✓** 二次驗證成 confirmed pattern：原 ViewA.tsx 留 fallback，新主題建 ViewA{Theme}.tsx 一份。已 PRINCIPLES + PB-13
5. **Codex review 抓 hook 級 Promise.all BLOCKER**（PB-08 driver 第 5 次）— `fetchReservoirStatusLatest` 仍 throw 會拖垮整個 useWaterKpis，改 Promise.allSettled + helper
6. **5 atomic commit 顆粒度乾淨**：CSS / queries / hook / components+App / docs+backlog
7. **Verify 三閘並行**（typecheck + 截圖 + codex review）省時 + 抓到不同層 bug：codex 抓邏輯 / 截圖抓 schema mismatch / typecheck 抓 type 問題

### What didn't / 失誤

1. **誤判 user 認知 vs 後端實際狀態** — user 說「水資源資料應該都已處理完成了」，我看 `kpi-data-status.md` 是 5/15 規劃清單就**準備告訴 user 還沒做**。Discovery Agent B 實際 psql 才證實 user 對的是我。**教訓**：user 對自家後端狀態通常比 doc 準，默認信 user + 派 agent 驗
2. **規劃 doc vs 實際 schema 不同步** — 寫 `fetchTreatmentPlantsLarge` / `fetchWaterLossRate` 時參考 `kpi-data-status.md` 寫的欄名（id / area / loss_rate_pct），實際 schema 完全不同（plant_name / 無 area / loss_pct）。typecheck + codex 都看不出來，截圖 agent console 抓 2 個 400 error 才知道。**教訓**：query 寫之前 psql `\d table_name` 30 秒驗
3. **codex review 對 schema mismatch 是盲區**（新發現的 codex 限制，跟 S7 的「DOM 事件流盲區」是 sibling）— codex 看靜態碼，不知道實際 DB 有沒這欄位。**Verify 三閘 = typecheck + agent-browser 互動 + codex review + 截圖 agent console 抓 fetch error**，四閘缺一不可
4. **本 session 沒實際派 /check-schema-exposed / /scaffold-rpc-wrapper 雖然有適用場景** — Discovery Agent B 報告「migration 098-102 已 apply」我就接收沒走 schema 預檢 skill。下次 cycle 涉及新主題或新 schema query 仍應派
5. **vs 上月同期硬編 footnote「對比資料累積中」** — 設計圖原本有 bar-mark 標歷年位置，我為了不阻塞改 spec 拿掉。本應加 `get_reservoir_storage_avg_28d_ago()` wrapper RPC 真接通，但 cost 估 1 hr 拍板移 B055 backlog。**教訓**：spec 改太多會掏空設計意圖，下次盡量補 RPC 而非拿掉視覺元素
6. **800px 響應式破洞**（章 2 two-up / 章 3 alert-grid / 章 5 usage-split 水平 overflow）— 截圖 agent 抓到但我沒當場修，移 B054 backlog。**user 拍板桌面優先可接受**，但理想上 design bundle 移植時就該加 `@media (max-width: 900px) { grid-template-columns: 1fr }`

### Next-time rules

- **Discovery Agent B「後端 audit」prompt 必含「psql `\d` + COUNT 直查實際 schema」步驟**，不只 grep migration 檔（migration 寫的 SQL 跟實際 apply 可能差很多，因為 `ALTER TABLE` / 後續 migration 修改原表）
- **寫 new query 寫第一個 select 之前**，psql `\d {table_name}` 30 秒確認實際欄位，不參考規劃 doc
- **用戶對自家後端狀態的認知優先於 doc**：user 說「已處理完」/「還沒做」/「跑了某 commit」時，先信 user，派 agent psql 驗
- **設計 bundle 移植時 CSS 一併附 `@media (max-width: 900px)` 響應式 fallback**（即使本 cycle 不全做，至少寫 single-column override 防 800px 破洞）
- **vs 歷年/上月對比類視覺元素**，若 snapshot 表保留期不夠，**寫一個輕量 RPC 28d ago snapshot** 而非拿掉視覺元素（保留設計意圖）
- **codex review 抓不到的 4 類**（累積發現）：(a) DOM 事件流（S7）(b) schema mismatch（S8）(c) CSS 缺失（S6）(d) Promise.all/allSettled race（S8 抓到了）

### Memory 產出（本 session）

新增：
- `_CYCLE_water_viewa.md`（root, user-facing cycle status，commit 410b20c）
- `frontend/src/components/water/`（8 新檔：WaterCatHeader + 6 sections + ViewAWater）
- `frontend/src/lib/queries/water-overview.ts`（10+ 新 query）

更新 memory 7 檔：
- STATUS rewrite（Session 8 結束狀態）
- BACKLOG +B054-B058 5 項（commit 410b20c 已加）
- PRINCIPLES +2 條（per-theme view confirmed pattern / Promise.allSettled 規範）
- PLAYBOOKS +PB-13（design bundle handoff → ViewA rewrite SOP）
- GLOSSARY +13 條（水主題 6 章敘事詞彙）
- INCIDENTS +3 條（Promise.all blocker / schema doc drift / user 認知信任）
- REFLECTIONS 本條
- CROSS_REPO update（Session 8 純前端 21 commits ahead）

### 對 /theme-loop skill 的反省

第 5 次跑（cycle 1/4/5/6 fire S5+S6+S7 / 本次 water S8）：
- Stage 1 Discovery 4 agent 並行 SOP 穩
- **Mini-audit 是新發現的中間階段**，介於 Plan 後 / Execute 前，應寫進 SKILL.md Stage 2 結尾「拍板前 mini-audit 補驗 🟡 項」
- Stage 4 Verify **codex review 限制清單** 累積到 4 類（DOM 事件流 / schema mismatch / CSS 缺失 / Promise.all race），可整理進 SKILL.md
- /check-schema-exposed / /scaffold-rpc-wrapper 兩個輔助 skill 累積 0 次使用，可能太隱性 — 在 Discovery Agent B 報告抓到 schema 預檢需要時自動派？

留下個 cycle 跑完一輪後回頭修 SKILL.md。

### 對 /wrap-up skill 的反省

第 7 次跑（含 init / 試跑）：
- Mode B Incremental 第 6 次驗證流程順
- Stage 6 Harness Audit 抓到「BACKLOG 95 行 58 項接近上限」— 下次 wrap-up 提醒清 P3 已完成項
- Stage 2 事件分類表新增「規劃 doc vs 實際 schema 不同步」類別 → INCIDENTS（本次已用）
- **跨專案事實同步**機制這次第一次明確 fire（之前條件式提）— 2 條同步到全域：Promise.allSettled pattern + 規劃 doc drift

### 下一個 session 的合理開頭

1. **B041 MOI 5 表 ETL**（3-4 天跨 3 repo Mode D）— 解 ViewA 火災財損 KPI + 起火處所 placeholder
2. **B054 ViewAWater @800 響應式修補**（30min 純前端 fix，B055/B057 一起也合理）
3. **開新主題（demographics / safety）**— 沿 PB-10 + PB-13 SOP
4. **B048-B051 響應式 / 視覺小 bug 一次掃**（< 2 hr）

---

## Session 9 反省（2026-05-16 · fire 主題 ViewA + ViewB 去 mock 化）

User 一句話 task「依資料盤點結果，把可以換成真實資料的部分都換成真實資料」。範圍跨 2 repo (gis-platform migration 109 + 14 wrapper view + frontend 7 檔重寫)。最終 11 atomic commits（gis-platform 1 + mini-taiwan-info 10）。

### 做對的

1. **動手前先做 2 件事**：
   - 派 2 並行 Explore agent（A: 列 fire mocks 與所需資料 / B: 列 migration 106/107/108 對應 wrapper 狀態）— 30 sec 拿到全貌
   - 然後 psql `\d` 直接驗 12 張表實際欄位，不信規劃 doc — 避免 Session 8 PB-14 的 schema drift 二度
2. **wrapper migration 一次寫 14 個**（PB-16 新 pattern）— `BEGIN/COMMIT` block + IF NOT EXISTS + 統一 GRANT 收尾，比過去一張一張寫快 8x
3. **詢問用戶 2 個關鍵決策**前才動手（apply migration / 缺資料處置）— pattern「拍板後不再回頭」對 user 偏好
4. **Promise.allSettled 17 fetch hook** + queryNames 對應 array — 沿用 PB-13 教訓，沒撞 Session 8 那道 BLOCKER
5. **第二輪「B 類順手修」**：完成 A 類後幫 user 識別「能改但 Session 範圍外」4 項（label / choropleth / radar）— user 拍板採用其中 3 件，雷達圖修完才發現之前 mock_avg 拉的差距是 artifact（INCIDENTS 第 1 條）
6. **誠實 footnote 接通真實 > 假裝 mock**：A 類缺資料採 user 拍板「接通 + footnote 揭露」— 顯示「2020 only」「僅 X 縣市完整」「待 ETL」比假裝有資料對使用者誠實（PRINCIPLES 新拍板）

### 做錯 / 漏的

1. **沒在 cycle 開頭跑 cross-repo audit**：直接接 user task 沒先 `/cross-repo-status`，wrap-up Stage 1 才發現其他 session 已建 migration 110/111/112 + Sprint G ETL — 本 session 「fire 去 mock」原本可以一起對接 emergency_hospitals + service_coverage MV。INCIDENTS 第 2 條
2. **手動 grep / git log 取代輔助 skill**：累計 `/cross-repo-status` 0 次、`/check-schema-exposed` 0 次、`/scaffold-rpc-wrapper` 0 次 — 這些 skill 本該觸發但我心智用熟手動指令 → skill description 不夠 pushy / 設計 trigger 不明顯
3. **disaster_incidents dedup 第一輪沒做**：fetch 200 筆全是同名颱風 spam，user 看截圖才發現問題 → bump limit 2000 + 加 dedup-by-name helper（PB-17）。**首次 fetch event-table 預設要先 unique audit**
4. **災變 timeline 沒主動加 footnote**：「共 50 筆 · 顯示最近 2 筆」這種揭露 user 拍板「A 類處置」前我沒寫；EMS 表「只 2 縣市」也是 user 提示後才補
5. **screenshot agent reload 後重新點 tab 沒記憶**：fire theme URL param `?theme=fire` 沒被 App.tsx 解析、reload 一定 reset 回 water → 改 `agent-browser` 流程要 reload 後 1 sec 點消防 tab。可加進 PB-03

### Skill 觸發本 session 統計

| Skill | 本 session | 累計 | 觀察 |
|---|---:|---:|---|
| /theme-loop | 0 | 6 | user 直接給 task，未走 SOP（範圍清楚不需要） |
| /wrap-up | 1 | 9 | mode B 第 7 次 |
| /cross-repo-status | 0 | 2 | 本該開頭跑（漏） |
| /check-schema-exposed | 0 | 0 | wrapper migration 我直接寫，未過 audit skill |
| /scaffold-rpc-wrapper | 0 | 0 | 14 view 批量寫，沒走 scaffold |

→ 兩個輔助 skill 累計 0 次 + cross-repo-status 漏跑 = 設計上 trigger 不主動。下次 wrap-up 考慮：是否在 SKILL.md description 加入更強的 trigger，或在 wrap-up Stage 1 自動 inline 跑這些 audit

### Harness 健康度

- **Memory 9 檔行數**：BACKLOG 102（OK）/ INCIDENTS 558（append-only，OK）/ PLAYBOOKS 542（append-only，OK）/ REFLECTIONS 565（將達 600+ 後考慮歸檔早期 session）/ PRINCIPLES 289（OK）
- **Hooks**：PostToolUse pnpm typecheck 本 session 跑 ~10 次無誤
- **Permissions**：本 session 沒撞 prompt（psql / agent-browser 都已 allow）

### 對 /wrap-up skill 的反省

第 9 次跑：
- Stage 1 跨 repo log 比對首次發現「本 session 漏對接其他 session 已完成 ETL」的 case — 應強化成「Stage 1 寫死跑 cross-repo + DB 對比」（不只列 commit）
- 跨專案事實本次 0 條同步全域（fire 主題太 mini-taiwan-info-specific）
- BACKLOG 達 102 行 / 70+ 項 — 開始接近 P3 該收的時機，下次清

### 下一個 session 的合理開頭

1. **接通 migration 110/111/112 跨 session ETL 成果**（B066-B068，1 day 純前端）— 解 fire 主題剩下 3 個 placeholder（急救醫院 / 5min 圈外 / 圈外村里）
2. **B054 ViewAWater @800 響應式修補**（30min 純前端）
3. **B042 後段補完**：fire.hydrants 其他 3 都欄位 mapping bug（taipei-gis pipeline 修）
4. **開新主題 demographics**（design bundle handoff 第 3 次跑 PB-13）

---

## 2026-05-29 — Session 10：首次部署上線 + harness IO 不穩的應對

本 session 從「資料迭代」轉「**部署上線**」。用 Workflow tool（15 agents）跑上線前強化（egress 收斂 + cache 層 + 部署 infra + 資料分級），再用 zeabur:* skills 一條龍部署。成果：https://mini-tw-info.zeabur.app 上線。

### harness IO 不穩時用「寫檔+Read / git show / grep -c」取代直讀 stdout
本 session harness 多次吞輸出 / 印重複行，數次被假輸出誤導：一度以為 `tsconfig.json` 被改壞、Dockerfile 有巢狀路徑 bug；最嚴重是 wrap-up Stage 5 有 4 個 memory Edit 靜默失敗但 commit script 照印 ✓（差點漏寫）。

**教訓**：
1. Edit 前用 **Read 工具**讀（非 Bash cat），否則 Edit 報 "File has not been read yet" 失敗。
2. git 真相用 `git show HEAD:<file>` / `git check-ignore` / `grep -c`，別信被截斷的 status/cat 輸出。
3. 關鍵輸出寫檔再 Read（`cmd > /tmp/x 2>&1; Read`）。
4. **memory commit 後務必 grep -c 驗內容真的寫進去**，不信 script 的 ✓（本 session 真的踩到空 commit）。
5. 並行 Bash 一個 exit≠0 cascade-cancel 整批 → 探測指令 `|| true`、別跟 Edit 混批。
詳見 INCIDENTS 2026-05-29 兩條。

### 部署型 session 的 wrap-up
- 部署知識落在 INCIDENTS（Zeabur 坑）+ PRINCIPLES（egress 三層 + 部署選型）+ DEPLOYMENT.md（操作 SOP）+ 全域 memory（zeabur-deploy-gotcha）。運作 OK，但 wrap-up 事件分類表無「部署」類，可考慮補。
- 首次觸發全域 memory 同步（Zeabur direct deploy 不 build Dockerfile，跨 GIS 應用層通用）。
- **並行 session 警示**：本 session 進行中，另一終端在同 repo commit 了 6 個 feat/fix（maritime/rail 圖層、demographics 戶量等）。wrap-up 時 git log 混入非本 session commit 屬正常，不誤判為自己做的。

### Harness 健康度（Session 10）
- 重度新工具：**Workflow tool**（15 agents pre-launch）+ **zeabur:* skills**（auth/deploy/project-create/variables/domain/logs）。
- PostToolUse typecheck hook：多次跑無誤。
- BACKLOG ~118 行接近上限，下次務必清 P3。

### 下一個 session 的合理開頭
1. **套用 gis-platform migration 124**（RPC 硬上限，CROSS_REPO pending / B073）
2. **debug Zeabur Dockerfile build → 改 Git deploy**（B074，auto-redeploy + nginx 長快取）
3. **手機 <900px 版面**（B048/B054，公開後升 P1）
4. **後端 FastAPI 部署**（B008，解 explode/TGOS 降級）
5. fire 3 placeholder 對接（B066-B068）/ 水主題 P0（B059-B061）

---

## 2026-05-29 Session 11 — GitHub 部署 404 + UX/SSOT 大量微調

**做了什麼**：road_events 接 pulse（早段，另 repo）→ 然後整段都在 mini-taiwan-info：rail 對齊設計 chat9、rail 32 大站跨 repo 修、SSOT 老化/出生死亡、地圖染色接真實、mock→PendingDataCard、消防/breadcrumb/分頁順序/footer/favicon/版面，最後**改 GitHub 部署觸發整站 404**並修復。

**順利**：
- 跨 repo 資料根因（rail 大站缺）**派 general-purpose agent 追查**，一次定位到 station_points 刻意排除 class 0/1 + ETL 誤用，省大量手動 trace。
- 部署除錯靠 **deployment list 的 PLANTYPE/STATUS + build log + service network** 三件組逐步逼近根因（static vs docker plan、port 8080 對齊、build 在哪步 fail）。
- SSOT 優先：發現 demographics 已有真實 vitalsTrend / 村里 birth/death，直接接掉 ViewAHome / ViewBDemographics 的 mock，比 placeholder 更好。

**卡住 / 教訓（→ 下次怎麼改）**：
1. **部署 404 繞了一圈才中**：先試 zbpack.json app_dir → 無效，再試 ZBPACK_APP_DIR env → 無效，最後才用 root Dockerfile。**下次 monorepo 子目錄 app 走 GitHub 直接上 root Dockerfile**，別浪費兩輪在 app_dir。已寫進 PRINCIPLES + DEPLOYMENT.md §九。
2. **build 成功但 deploy FAILED 一度誤判**：以為 Dockerfile 還有錯，其實 image 已成功匯出、只是 promotion 卡住，`service restart` 就上線。「FAILED」狀態要先分辨是 build-stage 還是 deploy/runtime-stage。
3. **快取造成「資料沒更新」假象**：rail 大站修好 DB 後前端仍顯示舊值，是 sessionStorage 6hr TTL 擋住；refresh 不清 sessionStorage。**改資料 schema/內容後升 cache key 版本號**（rail:stations→v2）讓所有 client 自動失效，比叫 user 手動清快取可靠。
4. wrap-up 事件分類表仍無「部署」類（S10 已提，這次又遇到）——本次部署知識落 INCIDENTS + PRINCIPLES + DEPLOYMENT.md §九 + PB-18。

### 下一個 session 的合理開頭（S11 更新）
1. **套用 gis-platform migration 124**（B073，仍未套）
2. 公開站體驗：**手機 <900px 版面**（B048/B054）
3. 後端 FastAPI 部署（B008）
4. fire 3 placeholder 對接（B066-B068）/ 水主題 P0（B059-B061）
5. road_events pulse 圖層 **push + browser 驗收**（feat/fire-rescue，096c1c5 未 push）
