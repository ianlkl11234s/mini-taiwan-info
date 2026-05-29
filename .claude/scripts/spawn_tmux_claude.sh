#!/bin/bash
# spawn_tmux_claude.sh — L1 原語：背景 spawn 一個獨立 claude TUI session
#
# 用法：
#   spawn_tmux_claude.sh <session_name> <cwd> [claude_args...]
#
# 範例：
#   spawn_tmux_claude.sh wk_omo /Users/migu/.../ichef_analys_place
#   spawn_tmux_claude.sh ticket_57 /repo --model sonnet
#
# 功能：
#   1. tmux new-session -d 啟動 claude --dangerously-skip-permissions
#   2. 等 6 秒讓 TUI 起來
#   3. 自動過 trust folder（send "1" + Enter）
#   4. 印出 session_name 給呼叫者
#
# 邊界處理：
#   - 已存在 session 同名 → exit 1（呼叫者要先 kill）
#   - claude 不在 PATH → exit 2

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <session_name> <cwd> [claude_args...]" >&2
  exit 1
fi

NAME="$1"
CWD="$2"
shift 2
EXTRA_ARGS="$*"

# 環境檢查
command -v tmux >/dev/null || { echo "ERROR: tmux not installed" >&2; exit 2; }
command -v claude >/dev/null || { echo "ERROR: claude not in PATH" >&2; exit 2; }
[ -d "$CWD" ] || { echo "ERROR: cwd not exist: $CWD" >&2; exit 2; }

# 重名檢查
if tmux has-session -t "$NAME" 2>/dev/null; then
  echo "ERROR: tmux session '$NAME' already exists. Kill it first or use different name." >&2
  exit 1
fi

# spawn
CLAUDE_CMD="claude --dangerously-skip-permissions $EXTRA_ARGS"
tmux new-session -d -s "$NAME" -c "$CWD" "$CLAUDE_CMD"

# 等 TUI
sleep 6

# 過 trust folder（第一次 cwd 才會問；如果不問，"1" 變 chat input 不影響）
tmux send-keys -t "$NAME" "1" Enter
sleep 4

echo "$NAME"
