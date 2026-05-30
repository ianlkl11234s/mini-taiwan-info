# Session 能力盤點 — probe_analytics

> 探測時間：2026-05-30 ｜ 模型：Opus 4.8 (1M context, `claude-opus-4-8[1m]`)
> 探測時所在 CWD：`taipei-gis-analytics`（注意：本報告寫到 `mini-taiwan-info/.claude/board/`）
> 方法：讀 settings.json（專案+全域）、hook 腳本原始碼、`~/.claude.json`，並用 **ToolSearch** 對 deferred 工具池做實證查核（這才是「本 session 真的能呼叫什麼」的 ground truth）。

---

## ⚠️ 三個最重要結論（先看這裡）

1. **twinkle-hub 沒有在本 session 生效。** 它在 `~/.claude.json` 的本專案區塊有設定（http），`settings.local.json` 也 allow 了 `mcp__twinkle-hub__opendata-list_domains`，但 ToolSearch 用關鍵字查、再用精確 `select:` 查工具名，**全部 0 結果** → 工具沒載入 deferred 池 → **現在無法呼叫**。
2. **本 session 真正能用的 MCP 只有 claude.ai connectors**（Asana / Google Drive / Slack 已登入可用；Canva / Figma / Gmail / Google Calendar / Notion / Sentry 只有 `authenticate` 工具 = 尚未授權）。
3. 其他在 config 出現的 MCP（ichef-analytics、graphiti-memory、dev-orchestrator、pencil、context7、sequential-thinking、puppeteer、krush-mcp）**同樣沒載入本 session**，ToolSearch 查不到 → 不能呼叫。

---

## (1) SKILL — available skills 全部名稱

### 專案自訂（taipei-gis-analytics `.claude/skills/`）
- catalog-search
- catalog-tag
- data-catalog-audit
- gis-data-onboard
- gis-start
- opendata-osint
- outstation-fare-finder
- tdx-api-explorer
- tgos-batch-geocoding
- threads-api
- wrap-up
- agentskill-expertise
- deep-research

### 全域 / 個人
- agent-identifier
- skill-creator
- mcp-builder
- frontend-design
- notebooklm
- docx
- pdf
- pptx
- xlsx
- 擲筊
- 擲筊-通用

### plugin: document-skills
- document-skills:algorithmic-art
- document-skills:brand-guidelines
- document-skills:canvas-design
- document-skills:claude-api
- document-skills:doc-coauthoring
- document-skills:docx
- document-skills:frontend-design
- document-skills:internal-comms
- document-skills:mcp-builder
- document-skills:pdf
- document-skills:pptx
- document-skills:skill-creator
- document-skills:slack-gif-creator
- document-skills:theme-factory
- document-skills:web-artifacts-builder
- document-skills:webapp-testing
- document-skills:xlsx

### plugin: plugin-dev
- plugin-dev:create-plugin
- plugin-dev:agent-development
- plugin-dev:command-development
- plugin-dev:hook-development
- plugin-dev:mcp-integration
- plugin-dev:plugin-settings
- plugin-dev:plugin-structure
- plugin-dev:skill-development

### plugin: zeabur
- zeabur:zeabur-ai-hub
- zeabur:zeabur-auth
- zeabur:zeabur-database
- zeabur:zeabur-deploy
- zeabur:zeabur-deployment-logs
- zeabur:zeabur-dockerfile
- zeabur:zeabur-domain-dns
- zeabur:zeabur-domain-register
- zeabur:zeabur-domain-url
- zeabur:zeabur-email
- zeabur:zeabur-migration
- zeabur:zeabur-object-storage
- zeabur:zeabur-port-mismatch
- zeabur:zeabur-project-create
- zeabur:zeabur-project-delete
- zeabur:zeabur-restart
- zeabur:zeabur-server-catalog
- zeabur:zeabur-server-list
- zeabur:zeabur-server-rent
- zeabur:zeabur-service-delete
- zeabur:zeabur-service-exec
- zeabur:zeabur-service-list
- zeabur:zeabur-service-metric
- zeabur:zeabur-startup-order
- zeabur:zeabur-template
- zeabur:zeabur-template-backup
- zeabur:zeabur-template-deploy
- zeabur:zeabur-template-publish
- zeabur:zeabur-update-service
- zeabur:zeabur-variables

### plugin: slack
- slack:channel-digest
- slack:draft-announcement
- slack:find-discussions
- slack:standup
- slack:summarize-channel
- slack:slack-messaging
- slack:slack-search

### plugin: last30days
- last30days:last30days

### 內建 slash / 系統 skill
- init
- review
- security-review
- code-review
- simplify
- verify
- run
- loop
- schedule
- update-config
- keybindings-help
- fewer-permission-prompts
- claude-api
- statusline-setup（agent，非 skill；列此供參）

> 備註：`codex@openai-codex` plugin 在 `enabledPlugins` 啟用，但本 session skill 清單未見其 skill 名（可能僅提供 agent/command）。

---

## (2) Hooks — 已設定的 hook（event + 作用）

| 來源檔 | Event | Matcher | 指令 | 作用 |
|--------|-------|---------|------|------|
| 專案 `.claude/settings.json` | **SessionStart** | `*` | `bash ${CLAUDE_PROJECT_DIR}/.claude/hooks/session_start.sh` | 每次開 session 跑 `gis-start/scripts/status_snapshot.py`，印出 9 repo 生態狀態 + pending + 半動態提醒。優先用 `venv/bin/python3`，否則 fallback `python3`；任何錯誤都不擋 session 啟動。（= 你這次開場看到的那段藍圖） |
| 全域 `~/.claude/settings.json` | **PreToolUse** | `Bash` | `bash /Users/migu/.claude/hooks/pre-push-check.sh` | 攔截含 `git push` 的 Bash 指令，push 前自動偵測專案類型做 build/typecheck：TS→`tsc --noEmit`；Python→`ruff`(無則`flake8`)；Rust→`cargo check`；Go→`go vet`。失敗則 `exit 2` 阻擋 push 並印 `BLOCKED:`；非 push 指令直接放行。 |

- 專案 `settings.local.json`、全域 `settings.local.json`：**皆無 hooks**，只有 `permissions.allow`（見下）。
- 沒有 Stop / PostToolUse / UserPromptSubmit / PreCompact 等其他 event 的 hook。

### 附帶：permissions（影響 hook/工具放行）
- 專案 `settings.json` allow：`mcp__pencil`
- 專案 `settings.local.json` allow：`Bash(grep -iE "...")`、`mcp__twinkle-hub__opendata-list_domains`
- 全域 `settings.local.json` allow：大量 Bash/git/npm/python/modal 白名單 + `mcp__sequential-thinking__*`、`mcp__context7__*`（這些 MCP 雖被 allow，但本 session 未載入，見下）
- 全域 `settings.json`：`skipDangerousModePermissionPrompt`、`skipAutoPermissionPrompt`、`autoDreamEnabled`、`agentPushNotifEnabled`、`voiceEnabled` 皆 true；`effortLevel: medium`；`outputStyle`（全域 local）= Explanatory。

---

## (3) MCP — server 與 tools（含 twinkle-hub 確認）

### A. 本 session 實際可呼叫（deferred 工具池，ToolSearch 證實）
僅 **claude.ai connectors**：

| Server | 狀態 | 代表 tools |
|--------|------|-----------|
| `mcp__claude_ai_Slack__*` | ✅ 已授權（已知 user_id `U05LT29KQMQ`） | send_message / search_public_and_private / search_channels / read_channel / read_thread / schedule_message / canvas… |
| `mcp__claude_ai_Asana__*` | ✅ 已授權（完整工具，無 authenticate 卡關） | get_me / search_tasks / create_tasks / get_project / update_tasks… |
| `mcp__claude_ai_Google_Drive__*` | ✅ 已授權 | search_files / read_file_content / create_file / download_file_content… |
| `mcp__plugin_slack_slack__*` | ⚠️ 僅 authenticate / complete_authentication（待授權） | authenticate, complete_authentication |
| `mcp__claude_ai_Canva__*` | ⚠️ 待授權 | authenticate, complete_authentication |
| `mcp__claude_ai_Figma__*` | ⚠️ 待授權 | authenticate, complete_authentication |
| `mcp__claude_ai_Gmail__*` | ⚠️ 待授權 | authenticate, complete_authentication |
| `mcp__claude_ai_Google_Calendar__*` | ⚠️ 待授權 | authenticate, complete_authentication |
| `mcp__claude_ai_Notion__*` | ⚠️ 待授權 | authenticate, complete_authentication |
| `mcp__claude_ai_Sentry__*` | ⚠️ 待授權 | authenticate, complete_authentication |

> 「待授權」= 該 connector 目前只暴露 OAuth 的 `authenticate`/`complete_authentication`，要先跑授權才會展開實際工具。

### B. config 有設定、但本 session **未載入**（ToolSearch 查不到 → 不能呼叫）

| Server | 設定位置 | 型別 / 端點 |
|--------|---------|------------|
| **twinkle-hub** ⭐ | `~/.claude.json` › 本專案區塊 | http `https://api.twinkleai.tw/mcp/` |
| ichef-analytics | `~/.claude/settings.local.json` › mcpServers | sse `http://10.101.2.34:8080/sse` |
| graphiti-memory | `~/.claude.json` 全域 mcpServers | sse `http://localhost:8000/sse` |
| dev-orchestrator | `~/.claude.json` 全域 mcpServers | stdio (python `-m src.mcp_server.server`) |
| pencil | `~/.claude.json` 全域 mcpServers | stdio (Pencil.app) |
| context7 | `~/.claude.json` › `/Users/migu` 區塊 | http `https://mcp.context7.com/mcp` |
| sequential-thinking | `~/.claude.json` › `/Users/migu`、SuperClaude 區塊 | stdio (npx) |
| puppeteer | `~/.claude.json` › `/Users/migu` 區塊 | stdio (npx) |
| krush-mcp | `~/.claude.json` › Krush_mcp 區塊 | stdio (python) |

### twinkle-hub 結論（重點）
- **設定有**（本專案 mcpServers + permission allow `opendata-list_domains`）。
- **本 session 沒生效**：ToolSearch 關鍵字查 0 結果、精確 `select:mcp__twinkle-hub__opendata-list_domains` 也 0 結果 → 工具未進 deferred 池。
- **現在無法呼叫 twinkle-hub。** 若要用：需確認此 session 是否在本專案 CWD 啟動 MCP、server 是否連線成功（http 端點可達性 / 啟動失敗），或重啟 session 讓 MCP 重連。

---

## 探測方法備註
- Skill 清單來自 session 啟動時系統載入的 available skills。
- Hooks 來自實讀 `settings.json` 兩份 + 兩支 hook 腳本原始碼。
- MCP「設定」來自 `~/.claude.json` + `settings.local.json`；MCP「能不能用」一律以 **ToolSearch 對 deferred 池查證** 為準（設定有 ≠ 本 session 可呼叫）。
