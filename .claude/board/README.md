# Session Board — 跨 session 共編進度（artifacts-based，免 race）

主 agent（control plane，在 mini-taiwan-info）與多個 spawn session（execution plane，在 taipei-gis-analytics）
透過**實體檔**協作進度，不直接對話。設計目標：**多 session 並行寫進度但不互相覆蓋**。

## 規則（每個 spawn session 必遵）

1. **每個 session 只寫自己的檔**：`.claude/board/<session_name>.md`（絕對路徑）。**絕不**碰別人的檔或主檔。
2. **格式**：固定區塊，每完成一個里程碑就 **append** 一行（不重寫整檔），這樣 size 單調遞增，主 agent 的 file-polling 可同時當「進度心跳」+「完成判定」。
3. **狀態值**：`🟡 進行中` / `✅ 完成` / `🔴 卡住(原因)` / `⏸ 等 gate`。
4. **完成時**最後一行印 `=== DONE <session_name> ===`，主 agent 據此判定該 session 收工。

## 每個 session board 檔模板

```markdown
# <session_name> · <負責任務一句話>
- repo: taipei-gis-analytics | flow: B | 開始: <主 agent 啟動時帶入的時間>
- MCP 可用: twinkle-hub(✅/❌ 實測)

## milestones（append-only）
- [t+..] 🟡 載入 /gis-data-onboard
- [t+..] 🟡 寫 migration 127 ...
- [t+..] ✅ 上 Supabase 836 列
- [t+..] ✅ 實測 REST 不再 406
=== DONE <session_name> ===

## 待 commit 清單（給主 agent / user）
- gis-platform/migrations/127_xxx.sql
- taipei-gis-analytics/pipelines/.../01_fetch.py
```

## 主 agent 職責

- `SESSION_BOARD.md`（上層目錄）= 主 agent 維護的**總表**：plan / waves / gate 決策 + 各 session 即時狀態彙總。
- 主 agent 用 `tmux_monitor_files.sh` 同時 poll 所有 `board/*.md`，size 穩定 + 含 `=== DONE` 即該 session 完成。
- 主 agent 定期把各 board 檔狀態彙整回 `SESSION_BOARD.md` 給 user 看一眼即知全局。

## 為何不用單一共享檔讓大家一起寫

兩個 session 同時 append 同一檔會 interleave/corrupt。**一人一檔 + 主 agent 彙整**是 multi-agent
artifacts 協作的標準解（對應 primer「Artifacts-based 協作」）。從 user 角度看仍是「一份 SESSION_BOARD.md」。
