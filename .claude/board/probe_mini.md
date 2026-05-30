# Probe · mini-taiwan-info session 實際可用能力盤點

> 產生時間：2026-05-30 · session model：Opus 4.8 (1M context)
> 方法：(1) skills 取自本 session system-reminder 注入清單；(2) hooks 讀 `.claude/settings.json`（專案）+ `~/.claude/settings.json`（全域）並讀 hook script 本體；(3) MCP 讀 `~/.claude.json` 設定 + 用 ToolSearch 實際 probe 確認哪些 server 真的連上。

---

## (1) SKILLS — available skills 全部名稱

### 專案自製 skills（mini-taiwan-info 主流程）
- `theme-loop` — 通用主題資料-視覺迭代 SOP（5 階段 4 checkpoint）
- `wrap-up` — session 收尾 + 更新 9 個 memory 檔
- `check-schema-exposed` — Supabase PostgREST exposed-schemas 預檢
- `scaffold-rpc-wrapper` — public schema wrapper migration + TS query 產生
- `cross-repo-status` — GIS 三 repo 同步狀態盤點

### 內建 / 通用 skills
- `init`
- `review`
- `security-review`
- `verify`
- `code-review`
- `simplify`
- `fewer-permission-prompts`
- `loop`
- `schedule`
- `run`
- `update-config`
- `keybindings-help`
- `deep-research`
- `claude-api`

### 趣味 / 在地化 skills
- `擲筊`
- `擲筊-通用`

### Anthropic agent-skills（頂層別名）
- `agent-identifier`
- `docx`
- `frontend-design`
- `mcp-builder`
- `notebooklm`
- `pdf`
- `pptx`
- `skill-creator`
- `xlsx`

### plugin: `document-skills@anthropic-agent-skills`
- `document-skills:algorithmic-art`
- `document-skills:brand-guidelines`
- `document-skills:canvas-design`
- `document-skills:claude-api`
- `document-skills:doc-coauthoring`
- `document-skills:docx`
- `document-skills:frontend-design`
- `document-skills:internal-comms`
- `document-skills:mcp-builder`
- `document-skills:pdf`
- `document-skills:pptx`
- `document-skills:skill-creator`
- `document-skills:slack-gif-creator`
- `document-skills:theme-factory`
- `document-skills:web-artifacts-builder`
- `document-skills:webapp-testing`
- `document-skills:xlsx`

### plugin: `plugin-dev@claude-plugins-official`
- `plugin-dev:create-plugin`
- `plugin-dev:agent-development`
- `plugin-dev:command-development`
- `plugin-dev:hook-development`
- `plugin-dev:mcp-integration`
- `plugin-dev:plugin-settings`
- `plugin-dev:plugin-structure`
- `plugin-dev:skill-development`

### plugin: `slack@claude-plugins-official`
- `slack:channel-digest`
- `slack:draft-announcement`
- `slack:find-discussions`
- `slack:standup`
- `slack:summarize-channel`
- `slack:slack-messaging`
- `slack:slack-search`

### plugin: `last30days@last30days-skill`
- `last30days:last30days`（清單中出現兩次，實際同一個）

### plugin: `zeabur@zeabur`
- `zeabur:zeabur-ai-hub`
- `zeabur:zeabur-auth`
- `zeabur:zeabur-database`
- `zeabur:zeabur-deploy`
- `zeabur:zeabur-deployment-logs`
- `zeabur:zeabur-dockerfile`
- `zeabur:zeabur-domain-dns`
- `zeabur:zeabur-domain-register`
- `zeabur:zeabur-domain-url`
- `zeabur:zeabur-email`
- `zeabur:zeabur-migration`
- `zeabur:zeabur-object-storage`
- `zeabur:zeabur-port-mismatch`
- `zeabur:zeabur-project-create`
- `zeabur:zeabur-project-delete`
- `zeabur:zeabur-restart`
- `zeabur:zeabur-server-catalog`
- `zeabur:zeabur-server-list`
- `zeabur:zeabur-server-rent`
- `zeabur:zeabur-service-delete`
- `zeabur:zeabur-service-exec`
- `zeabur:zeabur-service-list`
- `zeabur:zeabur-service-metric`
- `zeabur:zeabur-startup-order`
- `zeabur:zeabur-template`
- `zeabur:zeabur-template-backup`
- `zeabur:zeabur-template-deploy`
- `zeabur:zeabur-template-publish`
- `zeabur:zeabur-update-service`
- `zeabur:zeabur-variables`

> 註：`codex@openai-codex` plugin 已啟用（見全域 enabledPlugins），但未在本 session 注入任何 user-invocable skill；codex review 走 Bash CLI 而非 skill。

**Skills 總數**：約 90+ 個（含 plugin namespace）。

---

## (2) HOOKS — 實際有設定的 hook

### 專案 `.claude/settings.json`
| Event | Matcher | 行為 |
|---|---|---|
| **PostToolUse** | `Edit\|Write\|MultiEdit` | 執行 `.claude/hooks/typecheck-on-frontend-edit.sh` |

**`typecheck-on-frontend-edit.sh` 做什麼**：
- 從 stdin 取 `tool_input.file_path`
- 只在改到 `frontend/src/**/*.{ts,tsx}` 時觸發（其他檔案直接 exit 0）
- `cd frontend && pnpm typecheck`，**只有 typecheck 失敗才輸出**前 10 行 error（以 `{"systemMessage": ...}` JSON 回傳，advisory 性質）
- 永遠 `exit 0`，**不阻擋**操作

### 全域 `~/.claude/settings.json`
| Event | Matcher | 行為 |
|---|---|---|
| **PreToolUse** | `Bash` | 執行 `~/.claude/hooks/pre-push-check.sh` |

**`pre-push-check.sh` 做什麼**：
- 只攔截含 `git push` 的指令（`CLAUDE_TOOL_INPUT` 不含 git push 直接 exit 0）
- 偵測專案類型並跑對應檢查：
  - TypeScript（有 `tsconfig.json`）→ `npx tsc --noEmit`
  - Python（`pyproject.toml`/`setup.py`）→ `ruff check` 或 fallback `flake8`
  - Rust（`Cargo.toml`）→ `cargo check`
  - Go（`go.mod`）→ `go vet ./...`
- 檢查失敗 → 印 `BLOCKED:` 並 **exit 2 阻擋 push**；通過 → exit 0
- ⚠️ 注意：本專案 `tsconfig.json` 在 `frontend/` 子目錄、repo root 沒有，所以此 hook 在 root 執行 `git push` 時不會跑 tsc（會跳過），typecheck 改由專案 PostToolUse hook 負責

**合計**：2 個 hook（專案 PostToolUse typecheck × 1、全域 PreToolUse pre-push × 1）。

---

## (3) MCP — 本 session 實際可用的 MCP server 及 tools

### ⚠️ 設定 vs 實際落差
`~/.claude.json` 全域 `mcpServers` 設定了 3 個 stdio server：`dev-orchestrator`、`graphiti-memory`、`pencil`（全域 permissions 也 allow 了 `mcp__pencil`）。
**但本 session 用 ToolSearch probe 這三個名稱，回傳 0 個 MCP tool** → 這三個在本 session **未連線 / 未暴露工具**，實際不可用。

其他 project（`/Users/migu`、`SuperClaude`、`taipei-gis-analytics`、`Krush_mcp`）各自有 per-project mcpServers，但**非本專案範圍**，不影響本 session。

### ✅ 本 session 實際可呼叫的 MCP server（claude.ai connector 注入）

| Server | 狀態 | Tools |
|---|---|---|
| **claude_ai_Asana** | 已連線可用 | `add_comment` / `create_project`(+confirm/preview 系列) / `create_project_status_update` / `create_task_confirm` / `create_task_preview`(v2-v4) / `create_tasks` / `delete_task` / `get_agent` / `get_attachments` / `get_items_for_portfolio` / `get_me` / `get_my_tasks` / `get_portfolio(s)` / `get_project(s)` / `get_status_overview` / `get_task(s)` / `get_teams` / `get_user(s)` / `get_workspace_agents` / `log_widget_event` / `save_project_changes_confirm` / `save_task_changes_confirm` / `search_objects` / `search_tasks`(+preview) / `update_tasks` |
| **claude_ai_Google_Drive** | 已連線可用 | `copy_file` / `create_file` / `download_file_content` / `get_file_metadata` / `get_file_permissions` / `list_recent_files` / `read_file_content` / `search_files` |
| **claude_ai_Slack** | 已連線可用（probe 驗證成功，user_id `U05LT29KQMQ`） | `slack_add_reaction` / `slack_create_canvas` / `slack_get_reactions` / `slack_list_channel_members` / `slack_read_canvas` / `slack_read_channel` / `slack_read_file` / `slack_read_thread` / `slack_read_user_profile` / `slack_schedule_message` / `slack_search_channels` / `slack_search_emojis` / `slack_search_public` / `slack_search_public_and_private` / `slack_search_users` / `slack_send_message` / `slack_send_message_draft` / `slack_update_canvas` |

### 🔒 已連線但僅暴露登入工具（尚未 authenticate，功能受限）

| Server | 可用 tools |
|---|---|
| **claude_ai_Canva** | `authenticate` / `complete_authentication` |
| **claude_ai_Figma** | `authenticate` / `complete_authentication` |
| **claude_ai_Gmail** | `authenticate` / `complete_authentication` |
| **claude_ai_Google_Calendar** | `authenticate` / `complete_authentication` |
| **claude_ai_Notion** | `authenticate` / `complete_authentication` |
| **claude_ai_Sentry** | `authenticate` / `complete_authentication` |
| **plugin_slack_slack** | `authenticate` / `complete_authentication` |

> 這 7 個 server 目前只露出 `authenticate`/`complete_authentication`，需先完成 OAuth 才會解鎖其餘工具。

### MCP 取用機制備註
- 所有 MCP tool 都是 **deferred tool**：schema 不預載，呼叫前需先 `ToolSearch` 查 `select:<tool_name>` 載入 schema，否則直接呼叫會 InputValidationError。
- 本 session **沒有**本地 / 自架 MCP（dev-orchestrator / graphiti-memory / pencil 皆未連線）。
- 本專案的 Supabase / psql / agent-browser 走 **Bash + permissions allowlist**，非 MCP。

---

## 一句話總結
本 session 實際火力 = **90+ skills**（含專案 5 個自製主流程 skill）＋ **2 個 hook**（前端 typecheck PostToolUse、pre-push PreToolUse）＋ **claude.ai connector 的 3 個可用 MCP**（Asana / Google Drive / Slack）＋ 7 個待登入 connector；全域設定的本地 MCP（pencil / dev-orchestrator / graphiti-memory）本 session 未連線。
