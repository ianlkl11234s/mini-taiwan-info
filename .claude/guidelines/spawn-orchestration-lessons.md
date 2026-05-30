# Spawn Orchestration 實驗日誌（可復用眉角集）

> 跨 repo 資料 onboard 用 cmux+tmux spawn 真實 session 的**踩坑與心法**，每次跑完 append。
> 配套：`cross-repo-data-onboard-spawn.md`(SOP) / `cmux_tmux_spawn_primer.md`(L1) / `spawn_patterns_catalog.md`(L2)。
> 首次完整實驗：2026-05-29（人口主題 demographics onboard）。

## 心法（為何這套有效）

1. **Control plane / Execution plane 分離**：主 agent 只規劃+orchestrate+讀 board 摘要，重活全丟 fresh session。主 agent context 是稀缺資源，必須護住。
2. **Artifacts-based 協作**：session 間透過實體檔交付，不直接對話。board 一人一檔避免 race。
3. **fresh session per task**：一個 session 只做一件事 → commit → kill。連跑多輪會 context 膨脹拖垮品質（實測 recon_demog 跑兩輪到 94k tokens）。
4. **驗證 > 信任**：稽核 agent / 文件 / 規劃 doc 都會錯，動手前對 ground truth（migrations / 實際 REST）驗證。

## 踩坑清單（實測）

### A. spawn 機制本身（沿用 primer 5 邊界）
- trust folder：新 cwd 第一次 spawn 會問，`send "1" Enter` 過掉。
- 長文 paste-mode：prompt 用 `cat file | tmux_send_prompt.sh`（腳本已拆 send+sleep+Enter）。
- 完成判定：**file polling**（size 穩定+達 min_size），不要 capture-pane grep marker（會 false-positive）。
- `stat -f%z`（非 `wc -c`，後者有 leading space）。
- cmux workspace 無 close cli，要手動 GUI 關。

### B. MCP（⚠️ 2026-05-30 實測更正：本機 MCP 不會載入 spawn session）
- ❌ **先前誤判**：曾說「spawn 到 analytics 會自動載入 twinkle-hub MCP」。**錯**。
- ✅ **實測（兩個 probe session ToolSearch 查證）**：spawn 出的 `claude --dangerously-skip-permissions`
  **不載入任何本機設定的 MCP**（twinkle-hub / pencil / graphiti-memory / dev-orchestrator / context7…
  在 `~/.claude.json` 都有設定，但 ToolSearch 查 0 結果 → 不可呼叫）。
- ✅ spawn session **只有 claude.ai 帳號層 connector**（Asana / Slack / Google Drive 已授權；
  Gmail/Notion/Figma/Canva/Calendar/Sentry 僅露 authenticate）。
- ✅ **SKILL 與 HOOK 確實隨 cwd 不同**（專案 skill/hook 會載入）：
  mini → theme-loop/wrap-up/check-schema-exposed… + PostToolUse 前端 typecheck；
  analytics → gis-start/gis-data-onboard/catalog-search… + SessionStart status_snapshot。
- **教訓**：需要 twinkle-hub 的任務，spawn session 拿不到 → 改用 datagov / master_catalog / 本地檔案
  （昨晚 ETL 都這樣完成，未受影響）。要驗證「某 MCP 能不能用」一律叫 session 跑 ToolSearch 查證，別信 config 有設定。

### C. 稽核/文件不可盡信（本次最大教訓）
- **Explore 稽核 agent 幻覺**：宣稱 maritime `fishery_rights`/`lighthouse` 表「已存在」→ 實際 migrations 根本沒有。建表類一律 `grep "CREATE TABLE" gis-platform/migrations/` 驗證。
- **文件 stale**：demographics schema 全部文件（migration 註解/docstring/data-inventory/catalog）記「未 exposed 406」→ anon REST 實測 **200**，早就 exposed。schema 是否 exposed 用實測，別信文件。
- 連 recon 自己的報告都可能 stale；後續 session 要被允許推翻前面結論。

### D. 跨 repo git（sibling repo 很髒）
- gis-platform / taipei-gis-analytics 有**大量既有無關未提交變更**（flight_look_up / garbage_collection / road-events…）。
- **絕不 `git add -A`**。只 `git add <明確路徑>`，commit 前 `git diff --cached --stat` 確認 scope。
- 修改檔（如 data-inventory.md）先 `git diff <file>` 確認是純本任務 scope 才納入。
- 預設 commit 到各 repo 既有預設分支（gis-platform=main / analytics=master），不 push，user 最後統一 review。

### E. migration 編號協調
- 並行/序列 session 寫 gis-platform/migrations 會撞號。
- 對策：序列跑建表類，或主 agent 在 SESSION_BOARD 預先指派編號區段，寫進各 session prompt。
- 本次 recon_demog 用 126/127；後續區段 fire=128-129 / maritime=130-133 / water=134-135 / rail=136。

### F. 資料源陷阱（領域知識，session 自己抓到的修正）
- 戶政司 **ODRP010 = 人口動態**（出生/死亡/結離婚），**無人口數**；人口數在 **ODRP005**。
- ODRP005 `site_id` 是中文「縣市名+鄉鎮市區名」，非數字代碼。
- 2026-05 ODRP005 月報 API 對所有月回 OD-0102-S（查無），最新落地是 2024-12。

### G. SSOT 多源
- 同指標多表：全國人口有 3 個數（戶籍 national_basics_latest 23,262,544 / 現住 age_sex 23,400,220 / counties.yaml 23,332,000）。
- 對策：選單一 SSOT（戶籍月度）對外，其他標口徑+年份，差異註明非 bug。

### H. cmux 命名觀景窗（實測限制，2026-05-30）
- ❌ `cmux send --surface <id> "..."` 在本機 cmux 版本**一律報 `Surface is not a terminal`**（不論該 surface 有無 tty）→ 不可用。
- ❌ `cmux new-surface`（空 terminal）建的 surface **lazy boot 無 tty**，無法事後 attach。
- ✅ **可靠做法**：`cmux_view_tabs.sh "<NN-任務描述>" tabs <session>` → 用 `new-workspace --layout`（內嵌 `command: tmux attach`）一次建好。**workspace 名 = 任務描述** = user 要的「命名觀景窗」。
- ⚠️ 代價：每 session 一個 workspace 會累積，cmux **無 close workspace cli** → 早上手動 GUI 關（Ctrl+⌘+] 切換，⌘W 關）。
- `cmux_named_tab.sh`（動態加 tab）因上述限制**不可用**，保留檔案但勿用；改用 cmux_view_tabs.sh per session。

### I. 觀景窗終極解：單 space + tmux 分頁 + /exit 釋放（2026-05-30 user 拍板）

cmux 即時加 tab 不可用（見 H）→ 改用 **tmux 視窗當分頁**，全部塞進一個 cmux space：

- **建一個固定 tmux session**（如 `gis_work`），開**一個** cmux space attach 它：
  `cmux_view_tabs.sh "gis_work" tabs gis_work`
- **每個任務 = 該 session 的一個 window**（非獨立 session）：
  `tmux new-window -t gis_work -n "<任務名>" ` → 在該 window 內 `cd <cwd> && claude --dangerously-skip-permissions`
- 切換分頁：cmux space 內，tmux 底部 window 列點選 / `Ctrl+b` + 數字。建議 `tmux set -t gis_work -g mouse on`。
- **永遠只有一個 space**，所有任務是裡面的分頁（解決「一堆 space」）。代價：分頁列是 tmux 的（底部）非 cmux 原生（頂部）。

**完成任務的關閉方式 = `/exit` 不是 kill（釋放記憶體但保留輸出）**：
| 做法 | claude 記憶體 | 輸出可回顧 |
|---|---|---|
| `tmux kill-session/window` | 釋放 | ❌ 全沒 |
| **送 `/exit`（或 Ctrl-D / Ctrl-C ×2）** | ✅ 釋放 | ✅ 分頁留 scrollback 可捲看 |
| Ctrl-C ×1 | ❌ 只中斷不退出 | — |

- 主 agent 偵測 board DONE → `tmux send-keys -t gis_work:<window> "/exit" Enter`（claude 退出釋放記憶體，window 留著靜止畫面）→ append WAVE_REPORT。
- ⚠️ Ctrl-C 按一次只中斷當前動作**不會關閉**；要退出得 `/exit` / Ctrl-D / Ctrl-C 連按兩次。
- 監控仍走 board 檔（不靠 TUI），所以 /exit 後不影響已完成的產物。

## 復用 checklist（下次直接照跑）
1. 盤點本專案缺口（grep theme manifest 待補/mock/placeholder）
2. spawn recon session（read-only 盤點）→ 人工 gate
3. 逐任務 fresh session（驗證→做→自己 commit→寫 board→DONE）→ kill → append WAVE_REPORT
4. 前端接線 session（同樣 fresh，帶確切 endpoint）
5. 驗證閘（typecheck/截圖/codex）+ 每波 atomic commit 不 push
6. 跑完 append 本日誌新踩到的坑
