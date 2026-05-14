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
