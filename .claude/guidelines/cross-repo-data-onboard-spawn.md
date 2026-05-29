# 跨 Repo 資料 Onboard Spawn 工作流（GIS 三部曲專屬 L2 變形）

> 主 agent 以 **mini-taiwan-info（應用層）** 為核心工作，當前端撞到資料缺口時，
> 用 cmux + tmux **spawn 一個真實獨立 claude session 到 taipei-gis-analytics（盤點/搜集層）**，
> 由它跑 `/gis-data-onboard` 完成「盤點 →〔人工 gate〕→ 搜集」，產物寫實體檔，主 agent 讀檔彙整。
>
> L1 能力原語見 `cmux_tmux_spawn_primer.md`（從 ichef_analys_place 借用）。
> 本檔是 **Pattern 2 (Spawn-and-Stream) + 人工 gate** 的 GIS 跨 repo 專屬變形。

---

## 為何用 spawn 而非 Task agent

本專案 CLAUDE.md 預設「探索/SQL/多檔搜尋 → Task agent」。但跨 repo 資料 onboard 不適合 Task agent：

| 限制 | Task agent | spawn 獨立 session |
|---|---|---|
| 能否再開 subagent | ❌ 不能 | ✅ 能（盤點 session 可自己平行分流 3 探索 agent）|
| cwd 切到別的 repo | ⚠️ 受主 context 綁定 | ✅ 完全獨立 cwd = taipei-gis-analytics |
| 載入該 repo 的 skill（/gis-data-onboard）| ⚠️ 不吃該 repo 的 .claude | ✅ 吃 taipei-gis-analytics 的 skill/memory |
| 多輪互動（盤點後追加搜集）| ❌ 跑完即沒 | ✅ session 活著，context 保留可接力 |
| token 限制 | 有 | 無 |

**判準**：要動到「另一個 repo 的職責 + 該 repo 的 skill + 可能多輪」→ spawn。
單純讀本 repo 幾個檔 → 還是用 Task agent。

---

## 角色分工（不可越界）

```
mini-taiwan-info（本專案／主 agent）   taipei-gis-analytics（spawn 出去的 session）
  - 盤點前端資料缺口                      - 跑 /gis-data-onboard 決策
  - 寫盤點需求 prompt                      - 平行探索：本地成品 / Supabase / 上游
  - 開 cmux 觀景窗                         - 動態/半動態/靜態 分類 + Flow A/B/C
  - 人工 gate（盤點結果給 user 拍板）       - 寫盤點報告檔
  - 讀報告 → 接前端（wrapper + query + hook）- 〔gate 通過後〕實際搜集/ETL
```

主 agent **不要**自己跑去 taipei-gis-analytics 抓資料；那是 spawn session 的職責。
spawn session **不要**碰 mini-taiwan-info 前端；那是主 agent 的職責。

---

## 標準流程（6 階段 + 1 gate）

### 前置：腳本就位
`mini-taiwan-info/.claude/scripts/` 需有 4 個 spawn 腳本
（`spawn_tmux_claude.sh` / `tmux_send_prompt.sh` / `tmux_monitor_files.sh` / `cmux_view_tabs.sh`）。
若無，從 `ichef_analys_place/.claude/scripts/` 複製。

### Stage 1 — 盤點缺口（主 agent，在 mini-taiwan-info）
grep theme manifest（`themes/*.yaml`）找 `待 ETL` / `估` / `coverage_note` / `placeholder` /
缺口 source（如 `moi_population_by_township`），列出要 onboard 的資料清單。

### Stage 2 — 寫盤點 prompt（純盤點 read-only）
寫進 `.claude/tmp/recon_prompt.txt`，要點：
- 明確說「在 taipei-gis-analytics，依 /gis-data-onboard，**這輪只盤點不搜集**」
- 每項缺口要它回報 5 點：(a)本地成品? (b)Supabase 表? (c)上游來源? (d)動/半動/靜+Flow? (e)工作量/卡點
- **指定絕對路徑輸出檔** `.claude/tmp/onboard_recon.md`（主 agent 會讀）
- 結尾要它印一個 marker（如 `RECON_WRITTEN`）+ 寫完檔

### Stage 3 — spawn + 觀景窗 + 派工
```bash
cd mini-taiwan-info
tmux kill-session -t recon_demog 2>/dev/null || true     # 清殘留同名
.claude/scripts/spawn_tmux_claude.sh recon_demog "<taipei-gis-analytics 絕對路徑>"
.claude/scripts/cmux_view_tabs.sh "Recon-Demographics" tabs recon_demog
cat .claude/tmp/recon_prompt.txt | .claude/scripts/tmux_send_prompt.sh recon_demog
```

### Stage 4 — 監控（背景 file polling，勿用 capture-pane grep marker）
```bash
.claude/scripts/tmux_monitor_files.sh 600 200 .claude/tmp/onboard_recon.md   # run_in_background
```
完成自動通知主 agent。中途可 `tmux capture-pane -p -t recon_demog | tail` 看進度。

### Stage 5 — 人工 GATE（主 agent 讀報告 → user 拍板）
讀 `onboard_recon.md`，摘要給 user：每缺口 ✅/🟡/🔴 + 建議。
**user 決定哪些要搜集、哪些寫 BACKLOG**。這是 read-only → write 的閘門。

### Stage 6 — 搜集（⭐ fresh session per task，非 Spawn-and-Stream）

**重要（2026-05-29 user 拍板）**：一個 session 只做一個任務，**不要**讓同一 session 連跑多輪——
context 會膨脹拖垮品質。每個任務開**新 session**：

```bash
# 每個任務一個 fresh session
.claude/scripts/spawn_tmux_claude.sh etl_fire "<analytics 路徑>"
# cmux 觀景窗：在過夜 workspace 加一個「以任務命名」的 tab（user 要求過夜也要開）
.claude/scripts/cmux_named_tab.sh "$(cat .claude/tmp/overnight_workspace.txt)" etl_fire "04-fire財損起火處所ETL"
cat prompt_fire.txt | .claude/scripts/tmux_send_prompt.sh etl_fire
# prompt 要求 session：做任務 → 自己 atomic commit（明確路徑,兩 repo,不 add -A,不 push）
#               → 寫 .claude/board/etl_fire.md（append milestones,結尾 === DONE etl_fire ===）
.claude/scripts/tmux_monitor_files.sh 1800 300 <mini>/.claude/board/etl_fire.md
tmux kill-session -t etl_fire     # 完成即關，釋放 context
# → 主 agent append WAVE_REPORT.md → spawn 下一個 fresh session
```

- **session 自己 commit**（offload 主 agent context）；主 agent 只讀 board 摘要不讀全 output。
- **migration 撞號**：序列跑建表類，或 prompt 指派編號區段（見 SESSION_BOARD）。
- 搜集完，主 agent 回 mini-taiwan-info 接前端（query → hook → view）。

### 過夜報告

主 agent 維護 `.claude/WAVE_REPORT.md`：每個 Wave 完成後 append「做了什麼/commit/卡點」，
供 user 醒來一次看完整夜進度。

### 收尾
```bash
tmux kill-session -t recon_demog       # 關 session
# cmux workspace 無 close cli，需手動到 cmux GUI 關（見 primer 邊界 5）
```

---

## MCP 可用性（spawn 勝過 Task agent 的關鍵）

spawn 的是真實 `claude` session，**會自動載入該 cwd 的 project-scoped MCP**（記在 `~/.claude.json` 該專案路徑下）：
- `taipei-gis-analytics` → **`twinkle-hub`**（`https://api.twinkleai.tw/mcp/`，全國資料鏡像，台鐵月度/漁業細分/全國回填的來源）
- Task agent **吃不到** project MCP，這是 spawn 的硬優勢。
- 開工提醒：prompt 可要 session **實測 twinkle-hub 可用**（呼一個 tool）並記到 board 檔；不可用則 fallback datagov/segis。

## 多 session 共編進度：Session Board 模式

跨 session 進度用 **artifacts-based 免 race** 設計（詳見 `.claude/board/README.md`）：
- 每個 session **只寫自己的** `.claude/board/<session>.md`（append-only milestones，結尾 `=== DONE <name> ===`）。
- 主 agent 用 `tmux_monitor_files.sh` 同時 poll 所有 `board/*.md`——**進度心跳 + 完成判定合一**。
- 主 agent 把各 board 彙整進 `.claude/SESSION_BOARD.md`（user 看一份就懂全局）。
- **絕不**讓多 session 寫同一檔（會 interleave 損壞）。

## 並行多 session 的 migration 撞號約束（重要）

多 session 同時寫 `gis-platform/migrations/` 會撞編號。對策：
- **expose / 純前端接線類** → 可並行（不寫 migration 或只改設定）。
- **建表 ETL 類** → 序列 spawn，或主 agent 在 prompt **預先指派編號區段**給各 session（記在 SESSION_BOARD）。

## 5 個必修邊界（沿用 primer，本場景額外提醒）

1. **長文 paste-mode**：prompt 用 `cat file | tmux_send_prompt.sh`（腳本已拆 send+sleep+Enter）。
2. **完成判定用 file polling**，不要 capture-pane grep marker（prompt 自身含 marker 會 false-positive）。
3. **絕對路徑輸出檔**：spawn session cwd 在別 repo，輸出檔一律給 mini-taiwan-info 下的絕對路徑。
4. **同名 session**：spawn 前先 `tmux kill-session -t <name> 2>/dev/null || true`。
5. **cmux workspace 關不掉**（無 cli），手動 GUI 關；別每次新建一堆殘留 workspace。

---

## 何時升 L3 SKILL

本變形重複 ≥ 3 次 + 流程穩定後，可升級成 `.claude/skills/data-onboard-spawn/`，
觸發詞如「去 analytics 盤點 X」「spawn 搜集 Y 資料」。目前 = 原型階段，用本範本拼。

## Worked example（首次驗證 2026-05-29）

- **缺口清單**：township 人口排名 / 村里數·鄰數清冊 / 人口金字塔 / age_sex 交叉表（人口主題）
- **spawn**：session `recon_demog` → cwd taipei-gis-analytics，cmux workspace `Recon-Demographics`
- **recon 耗時**：約 6–7 分鐘（session 自開 3 個 Explore agent：本地/Supabase/上游）
- **產物**：`.claude/tmp/onboard_recon.md`（127 行完整盤點 + SSOT 結論）
- **關鍵發現**：
  - 缺口 3＝缺口 4 是同一張表；金字塔不需另建表
  - 真正卡點是 **demographics schema 未在 Supabase expose（前端 REST 406）**，不是缺資料
  - SSOT 三個數字：戶籍 23,262,544（national_basics_latest，月度）/ 現住 23,400,220（age_sex，2024）/ counties.yaml 23,332,000
  - SSOT 結論：全國總人口認 `reference.national_basics_latest`（戶籍、月度）
- **驗證結論**：spawn 機制相對 Task agent 的優勢（跨 repo cwd + 載入該 repo skill + 自開 subagent）全部成立。
- **gate 後**：見下次 session 接力結果。
