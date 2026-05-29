#!/bin/bash
# cmux_named_tab.sh — 在指定 cmux workspace 加一個「命名 tab」attach 到某 tmux session
#
# 用法：
#   cmux_named_tab.sh <workspace_ref> <tmux_session> <tab_label>
# 範例：
#   cmux_named_tab.sh workspace:20 front_rail "02-接通rail縣市車次"
#
# 做的事：new-surface(terminal) → 取 surface id → cmux send "tmux attach" → rename-tab
# 設計給「過夜 fresh-session-per-task」用：一個 workspace、每個 session 一個 tab、tab 名=任務內容。

set -euo pipefail
if [ $# -lt 3 ]; then
  echo "Usage: $0 <workspace_ref> <tmux_session> <tab_label>" >&2; exit 1
fi
WS="$1"; SESSION="$2"; LABEL="$3"

command -v cmux >/dev/null || { echo "ERROR: cmux not installed" >&2; exit 2; }
tmux has-session -t "$SESSION" 2>/dev/null || { echo "ERROR: tmux session '$SESSION' not found" >&2; exit 1; }

ID=$(cmux new-surface --type terminal --workspace "$WS" 2>&1 | grep -o 'surface:[0-9]*' | head -1)
[ -n "$ID" ] || { echo "ERROR: failed to create surface" >&2; exit 1; }
sleep 1
cmux send --surface "$ID" "tmux attach -t $SESSION"$'\n'
sleep 1
cmux rename-tab --surface "$ID" "$LABEL" >/dev/null 2>&1 || true
echo "$ID"
