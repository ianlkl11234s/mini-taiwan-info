#!/bin/bash
# tmux_send_prompt.sh — L1 原語：安全送 prompt 給 tmux 內的 claude TUI
#
# 用法：
#   tmux_send_prompt.sh <session_name> <prompt_text>
#   或 stdin：echo "prompt" | tmux_send_prompt.sh <session_name>
#
# 範例：
#   tmux_send_prompt.sh ticket_57 "請完成 spec X"
#   cat long_prompt.txt | tmux_send_prompt.sh ticket_57
#
# 邊界處理（必修）：
#   - 長文 paste-mode bug：claude TUI 對「一次 send 文字 + Enter」會把 Enter 當 paste 的一部分
#     而非 submit。修法：拆「先 send 文字」→ sleep 1 → 「單獨 send Enter」兩步
#   - 中文/特殊字元：tmux send-keys 變數展開即可，不需 -l flag
#   - 換行 prompt：自動轉成「end with newline send + Enter」順序

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <session_name> [prompt_text]  (or pipe via stdin)" >&2
  exit 1
fi

NAME="$1"
shift

# 接收 prompt：argument 或 stdin
if [ $# -ge 1 ]; then
  PROMPT="$*"
elif [ ! -t 0 ]; then
  PROMPT=$(cat)
else
  echo "ERROR: prompt missing (provide as argument or via stdin)" >&2
  exit 1
fi

# session 存在檢查
tmux has-session -t "$NAME" 2>/dev/null || { echo "ERROR: session '$NAME' not found" >&2; exit 1; }

# Step 1: send 純文字（不送 Enter）
tmux send-keys -t "$NAME" "$PROMPT"

# Step 2: 等 paste buffer 處理完
sleep 1

# Step 3: 單獨 send Enter 觸發 submit
tmux send-keys -t "$NAME" Enter

echo "sent to $NAME ($(echo -n "$PROMPT" | wc -c | tr -d ' ') chars)"
