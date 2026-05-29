#!/bin/bash
# cmux_view_tabs.sh — L1 原語：開 cmux workspace 給已 spawn 的 tmux sessions 當觀景窗
#
# 用法：
#   cmux_view_tabs.sh <workspace_name> <mode:tabs|splits> <tmux_session1> [session2 ...]
#
# 範例：
#   # 1 個 cmux workspace、3 個 tab（Ctrl+1/2/3 切換）
#   cmux_view_tabs.sh "AutoPilot-Tabs" tabs ap_A ap_B ap_C
#
#   # 1 個 cmux workspace、3 個並排 split panes
#   cmux_view_tabs.sh "AutoPilot-Splits" splits ap_A ap_B ap_C
#
# mode 對應 cmux layout schema：
#   tabs   = 1 pane / N surfaces（用 cmux tab 鍵切換）
#   splits = N panes（水平並排，同時顯示）

set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: $0 <workspace_name> <tabs|splits> <session1> [session2 ...]" >&2
  exit 1
fi

WS_NAME="$1"
MODE="$2"
shift 2
SESSIONS=("$@")
N=${#SESSIONS[@]}

command -v cmux >/dev/null || { echo "ERROR: cmux not installed" >&2; exit 2; }

# 確認 sessions 都活著
for s in "${SESSIONS[@]}"; do
  tmux has-session -t "$s" 2>/dev/null || { echo "ERROR: tmux session '$s' not found" >&2; exit 1; }
done

# 構 layout JSON
if [ "$MODE" = "tabs" ]; then
  # 1 pane / N surfaces
  SURFACES=""
  for s in "${SESSIONS[@]}"; do
    SURFACES+="{\"type\":\"terminal\",\"command\":\"tmux attach -t $s\"},"
  done
  SURFACES="${SURFACES%,}"  # 去尾逗號
  LAYOUT="{\"pane\":{\"surfaces\":[$SURFACES]}}"

elif [ "$MODE" = "splits" ]; then
  # N panes 水平並排：遞迴用 horizontal split 做
  # 簡化：兩個的話直接 split=0.5；三個以上用嵌套
  if [ $N -eq 1 ]; then
    LAYOUT="{\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[0]}\"}]}}"
  elif [ $N -eq 2 ]; then
    LAYOUT="{\"direction\":\"horizontal\",\"split\":0.5,\"children\":[
      {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[0]}\"}]}},
      {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[1]}\"}]}}
    ]}"
  elif [ $N -eq 3 ]; then
    LAYOUT="{\"direction\":\"horizontal\",\"split\":0.333,\"children\":[
      {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[0]}\"}]}},
      {\"direction\":\"horizontal\",\"split\":0.5,\"children\":[
        {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[1]}\"}]}},
        {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[2]}\"}]}}
      ]}
    ]}"
  elif [ $N -eq 4 ]; then
    LAYOUT="{\"direction\":\"horizontal\",\"split\":0.25,\"children\":[
      {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[0]}\"}]}},
      {\"direction\":\"horizontal\",\"split\":0.333,\"children\":[
        {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[1]}\"}]}},
        {\"direction\":\"horizontal\",\"split\":0.5,\"children\":[
          {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[2]}\"}]}},
          {\"pane\":{\"surfaces\":[{\"type\":\"terminal\",\"command\":\"tmux attach -t ${SESSIONS[3]}\"}]}}
        ]}
      ]}
    ]}"
  else
    echo "ERROR: splits mode supports 1-4 sessions, got $N. Use tabs mode for more." >&2
    exit 1
  fi
else
  echo "ERROR: mode must be 'tabs' or 'splits', got '$MODE'" >&2
  exit 1
fi

RESULT=$(cmux new-workspace --name "$WS_NAME" --layout "$LAYOUT" 2>&1)
echo "$RESULT"
