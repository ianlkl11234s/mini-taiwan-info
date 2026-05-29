# cmux + tmux Spawn 能力原語（L1 Primer）

主 agent 用 Bash 從外部 spawn **真實獨立 claude session**（**不是** Task agent，無 token 限制、有完整工具、可多輪互動）的能力底層。

**這份文件是「能力參考」不是「流程 SKILL」**。動手前看一眼確認原語怎麼用就好；具體什麼場景用什麼變形，看 [`spawn_patterns_catalog.md`](./spawn_patterns_catalog.md)。

---

## 為何存在

Task agent（`Agent` tool）有先天限制：
- 受主 agent context 影響
- 子 agent 不能再呼叫 subagent
- 不能用某些 MCP（background subagent）
- 沒有獨立 session 生命週期（跑完即沒）

**Spawn 機制 = 從 Bash 開真實獨立 claude session**：
- 用 tmux 在背景跑 `claude` 互動 TUI
- 用 `tmux send-keys` 餵 prompt
- 用 polling 實體檔案監控完成
- 可選用 cmux 開「觀景窗」給人看正在跑什麼

對應實作參考：[memorysaver/agentic-engineering-patterns](https://github.com/memorysaver/agentic-engineering-patterns) 的 `/launch` SKILL。

---

## 4 個能力原語

對應 `.claude/scripts/` 4 個腳本：

### 1. spawn — 啟動一個獨立 claude TUI

```bash
.claude/scripts/spawn_tmux_claude.sh <session_name> <cwd> [claude_args...]
```

實際做的事：
```bash
tmux new-session -d -s <name> -c <cwd> "claude --dangerously-skip-permissions"
sleep 6                             # 等 TUI 起來
tmux send-keys -t <name> "1" Enter  # 過 trust folder（第一次 cwd 才會問）
sleep 4
```

### 2. send — 餵 prompt 給已啟動的 claude TUI

```bash
.claude/scripts/tmux_send_prompt.sh <session_name> <prompt>
# 或 pipe：
cat long_prompt.txt | .claude/scripts/tmux_send_prompt.sh <session_name>
```

**核心 fix**（解 paste-mode bug）：
```bash
tmux send-keys -t <name> "$PROMPT"   # 純文字
sleep 1                              # 等 claude TUI 處理 paste
tmux send-keys -t <name> Enter       # 單獨 send Enter 才會 submit
```

### 3. monitor — polling 多個輸出檔案直到全 stable

```bash
.claude/scripts/tmux_monitor_files.sh <timeout_sec> <min_size> <file1> [file2 ...]
```

**核心邏輯**（解 false-positive bug）：
```
loop:
  for each file:
    size = stat -f%z file
    if size >= min_size AND size == last_size:
      mark done
    else:
      last_size = size
  if all done: exit 0
  if elapsed > timeout: exit 1
  sleep 12
```

### 4. view — 開 cmux 觀景窗給已 spawn 的 tmux 看（可選）

```bash
# tabs 模式：1 個 workspace、N 個 tab（Ctrl+1/2/3... 切換）
.claude/scripts/cmux_view_tabs.sh "AutoPilot" tabs ap_A ap_B ap_C

# splits 模式：1 個 workspace、N 個並排 panes（同時可見，1-4 個）
.claude/scripts/cmux_view_tabs.sh "AutoPilot" splits ap_A ap_B ap_C
```

---

## 5 個必修邊界（這次驗證踩過）

### 1. Trust folder 詢問

每個**新 cwd 第一次跑 claude** 都會問「Yes, I trust this folder」。Spawn 後 `send "1" Enter` 過掉。如果 cwd 已 trust 過，「1」變 chat input 但只影響 1 次無傷。

### 2. 長文 paste-mode bug

`tmux send-keys "$VERY_LONG_PROMPT" Enter` 會被 claude TUI 當作 paste，**Enter 不會觸發 submit**（被當 paste 內容）。必修：拆 send + sleep 1 + send Enter 兩步。

### 3. capture-pane grep marker 的 false-positive

不要這樣寫：
```bash
tmux send-keys "...印 DONE_X..." Enter
sleep 30
tmux capture-pane -p | grep DONE_X  # ← prompt 本身含 DONE_X 立刻 match
```

正確：**polling 實體輸出檔**（要求 sub-claude 寫檔），用「size 穩定 + 達 min_size」判完成。

### 4. `wc -c` leading space

macOS `wc -c < file` 輸出有 leading space，eval 算術會 split 失敗。改用 `stat -f%z file`（純數字）。

### 5. cmux 沒有 close workspace cli

`cmux workspace-action --action close` 不存在（合法 actions：pin/unpin/rename/clear-name/set-description/clear-description）。要關 workspace **必須手動到 cmux GUI**。腳本設計避免每次都新建 workspace，改用 layout JSON 一次性建好。

---

## 額外 cmux 控制原語（AEP 補充我們的）

從 AEP 的 `/launch` SKILL 學到的 cmux 進階指令：

| 指令 | 作用 |
|------|------|
| `cmux new-surface --type terminal \| grep -o 'surface:[0-9]*'` | 動態加 tab 並取 ID |
| `cmux send --surface "$ID" "text\n"` | 直接餵 surface 文字（含 \n 換行 = Enter） |
| `cmux rename-tab --surface "$ID" "<name>"` | 改 tab 標題 |
| `cmux new-workspace --layout '{...}'` | 用 JSON 一次性建多 pane / surface |
| `cmux tree --workspace <ref>` | 看 workspace 結構（panes / surfaces） |
| `cmux events --after <seq> --reconnect` | 訂閱事件流（agent hook events 即時通知） |

### cmux GUI 快捷鍵

| 動作 | Mac |
|------|-----|
| 依編號選 surface（tab） | `Ctrl+1` ~ `Ctrl+9` |
| 下一個 surface | `⌘+Shift+]` |
| 上一個 surface | `⌘+Shift+[` |
| 新 surface（新 tab） | `⌘+T` |
| 關 tab | `⌘+W` |
| 重命名 tab | `⌘+R` |
| 下一個 workspace | `Ctrl+⌘+]` |
| 上一個 workspace | `Ctrl+⌘+[` |

---

## 監控方式選擇樹

| 任務型態 | 監控方式 | 為什麼 |
|---------|--------|------|
| Sub 寫實體檔（report / SQL / json）| **file polling**（推薦）| 最可靠，size 穩定 = done |
| Sub 只回對話（無檔產出） | `tmux pipe-pane -o -t <name> /tmp/output.log` 全程錄 + tail/grep | capture-pane 只給最新螢幕，pipe-pane 給完整 stream |
| 大量並行 + 需即時觸發 | `cmux events --reconnect` 訂閱 agent.hook.Stop | 事件流不需 polling，但 background bash 內 cmux events 不穩定 |
| 完全 batch、不需互動 | `claude --print '<prompt>'`（不走 tmux）| one-shot 跑完即退，用 `&` + wait |

---

## 完整 demo 範本

3 個 sub-claude 並行寫 3 個檔，主 agent 彙整：

```bash
#!/bin/bash
OUT=/tmp/demo
mkdir -p "$OUT"

# Phase 1+2: spawn + trust
for t in A B C; do
  .claude/scripts/spawn_tmux_claude.sh "ap_$t" "$OUT"
done

# Phase 3: view（可選）
.claude/scripts/cmux_view_tabs.sh "Demo" tabs ap_A ap_B ap_C

# Phase 4: dispatch
.claude/scripts/tmux_send_prompt.sh ap_A "分析 X，寫到 $OUT/task_A.md"
.claude/scripts/tmux_send_prompt.sh ap_B "分析 Y，寫到 $OUT/task_B.md"
.claude/scripts/tmux_send_prompt.sh ap_C "分析 Z，寫到 $OUT/task_C.md"

# Phase 5: monitor
.claude/scripts/tmux_monitor_files.sh 300 80 \
  "$OUT/task_A.md" "$OUT/task_B.md" "$OUT/task_C.md"

# Phase 6: collect
for t in A B C; do
  echo "--- $OUT/task_$t.md ---"
  cat "$OUT/task_$t.md"
done

# 收尾（可選）：kill tmux sessions
# for t in A B C; do tmux kill-session -t "ap_$t"; done
```

---

## 跟 AEP 的關係

memorysaver/agentic-engineering-patterns 是 Anthropic 社群成熟的 Claude Code plugin，**它的 `/launch` SKILL 就是這套機制的完整實作**。差異：

| 維度 | iChef 本專案 | AEP |
|------|------------|-----|
| 場景 | 數據分析（產 Notion / dashboard）| 軟體開發（產 PR） |
| Story 單位 | 一份分析 / 一份報告 | 一張 ticket / 一個 PR |
| `launch` 前置 | tmux session 命名 + cwd | git worktree + feature branch |
| 收尾 | 讀檔彙整 → 上傳 Notion | merge PR |

**借用 AEP 的設計概念**（不直接安裝）：
- Control Plane（你 + AI 規劃）vs Execution Plane（子 agents 平行 build）分離
- **Artifacts-based 協作**（子 agent 透過實體檔交付，主 agent 讀檔，不直接對話）
- product-context.yaml 風格的 roadmap → wave → ticket 規劃

下一步若要做產品開發類任務，可以**直接安裝 AEP plugin**。

---

## 變形目錄

7 種 spawn pattern 對應 iChef 場景，看 [`spawn_patterns_catalog.md`](./spawn_patterns_catalog.md)。
