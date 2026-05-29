#!/bin/bash
# tmux_monitor_files.sh — L1 原語：polling 多個輸出檔案直到全部「size 穩定」
#
# 用法：
#   tmux_monitor_files.sh <timeout_sec> <min_size> <file1> [file2 ...]
#
# 範例：
#   # 等 task_A/B/C.md 都至少 80 bytes 且 size 穩定，最多等 300 秒
#   tmux_monitor_files.sh 300 80 /tmp/task_A.md /tmp/task_B.md /tmp/task_C.md
#
# 完成判定（必修）：
#   - 不要 grep tmux capture-pane 抓 marker（會 match 到 prompt 本身造成 false-positive）
#   - 用「檔案 size > min_size AND 兩次 polling size 相同」= 寫完且穩定
#   - macOS 用 stat -f%z（純數字無 leading space，避開 wc -c bug）
#
# 退出碼：
#   0 = 全部 done
#   1 = timeout（部分未完成）

set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: $0 <timeout_sec> <min_size_bytes> <file1> [file2 ...]" >&2
  exit 1
fi

TIMEOUT=$1
MIN_SIZE=$2
shift 2
FILES=("$@")
N=${#FILES[@]}

# 初始化 LAST_SIZE 陣列
LAST=()
DONE=()
for ((i=0; i<N; i++)); do
  LAST+=(0)
  DONE+=(0)
done

START=$(date +%s)
while true; do
  ELAPSED=$(( $(date +%s) - START ))
  if [ $ELAPSED -gt "$TIMEOUT" ]; then
    echo "[t+${ELAPSED}s] TIMEOUT" >&2
    # 列未完成
    for ((i=0; i<N; i++)); do
      if [ "${DONE[$i]}" = "0" ]; then
        echo "  not done: ${FILES[$i]}" >&2
      fi
    done
    exit 1
  fi

  ALL_DONE=1
  for ((i=0; i<N; i++)); do
    [ "${DONE[$i]}" = "1" ] && continue
    F="${FILES[$i]}"
    if [ -f "$F" ]; then
      SIZE=$(stat -f%z "$F" 2>/dev/null || stat -c%s "$F")  # macOS / Linux
      if [ "$SIZE" -ge "$MIN_SIZE" ] && [ "$SIZE" = "${LAST[$i]}" ]; then
        DONE[$i]=1
        echo "[t+${ELAPSED}s] DONE $(basename "$F") (size=$SIZE)"
      else
        LAST[$i]=$SIZE
        ALL_DONE=0
        echo "[t+${ELAPSED}s] progress $(basename "$F") (size=$SIZE)"
      fi
    else
      ALL_DONE=0
      echo "[t+${ELAPSED}s] waiting $(basename "$F") (no file)"
    fi
  done

  [ "$ALL_DONE" = "1" ] && { echo "[t+${ELAPSED}s] ALL DONE"; exit 0; }
  sleep 12
done
