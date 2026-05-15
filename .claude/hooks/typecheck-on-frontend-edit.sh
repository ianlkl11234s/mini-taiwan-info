#!/bin/bash
# typecheck-on-frontend-edit.sh
# PostToolUse hook：偵測 Edit/Write/MultiEdit 改了 frontend TS/TSX 時，自動跑 typecheck。
# - 只在改 frontend/src 內 .ts/.tsx 時跑
# - 只在有 error 時輸出（無錯不擾）
# - 不阻擋（exit 0 always）

PROJECT_ROOT="/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/mini-taiwan-info"

# Read JSON from stdin (Claude Code hook protocol)
INPUT=$(cat)

# Extract edited file path（jq 必裝；沒裝就降級用 grep）
if command -v jq >/dev/null 2>&1; then
  FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
else
  FILE=$(echo "$INPUT" | grep -oE '"file_path":[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
fi

# Only act on frontend TS/TSX edits
if [[ ! "$FILE" =~ frontend/src/.*\.(ts|tsx)$ ]]; then
  exit 0
fi

# Run typecheck silently; surface only errors
cd "$PROJECT_ROOT/frontend" || exit 0
OUTPUT=$(pnpm typecheck 2>&1)
EXIT=$?

if [ $EXIT -ne 0 ]; then
  # Print as JSON to stdout — Claude harness treats systemMessage as advisory
  ERRS=$(echo "$OUTPUT" | grep -E 'error TS|error:' | head -10)
  if [ -n "$ERRS" ]; then
    printf '{"systemMessage": "⚠ typecheck failed after editing %s:\\n%s"}\n' \
      "${FILE##*/}" \
      "$(echo "$ERRS" | sed 's/"/\\"/g' | tr '\n' '\v' | sed 's/\v/\\n/g')"
  fi
fi

exit 0
