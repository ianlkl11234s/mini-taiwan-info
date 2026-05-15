---
name: cross-repo-status
description: GIS 三部曲（mini-taiwan-info + gis-platform + taipei-gis-analytics）跨 repo 同步狀態一鍵盤點。當使用者問「三 repo 都同步了嗎」「哪邊還沒 push」「跨 repo 狀態」「該不該 pull」「準備收尾」時觸發，或在 `/wrap-up` Stage 1 / `/theme-loop` Stage 5 自動呼叫。回報每 repo 的 ahead/behind/dirty/未推 commit 摘要，不執行破壞性動作。主動更新時機：data-collectors / 新 sibling repo 加入時更新 repo 清單；fetch 行為被 GitHub 阻擋有新 error pattern 時更新「失敗判讀」章節。
user_invocable: true
---

# /cross-repo-status — GIS 三部曲跨 repo 狀態盤點

## 核心原則

**先看清楚再動手**。push / pull / rebase 之前，掌握 3 個 repo 的 divergence + 未 commit 變動 + 與 origin 的關係，才知道該不該動、動哪個。

跨 repo 狀態查詢應該是**乾淨且可重複**的 read-only 操作，不會引發任何 side effect。

## 何時觸發

- User 說「同步了嗎」「該 push 嗎」「3 repo 狀態」「跨 repo 看一下」
- `/wrap-up` Stage 1 Gather 階段自動呼叫
- `/theme-loop` Stage 5 Commit/Push 前自動呼叫
- 開新 session 想知道接手狀態時
- 準備 `git pull` / `git push` 前

## 標準 4 步驟

### Step 1: 列 3 repo 路徑

固定三個：
- `/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/mini-taiwan-info`（main branch）
- `/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/gis-platform`（main branch）
- `/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/taipei-gis-analytics`（master branch）

可選第 4 個（若 user 提到 collector 相關）：
- `/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/data-collectors`

### Step 2: 並行 fetch + 比對

```bash
# 對每個 repo（並行跑）
cd <repo_path> && git fetch origin -q && \
  git rev-list --left-right --count origin/${BRANCH}...HEAD
# 輸出：<behind>\t<ahead>
```

### Step 3: 列每 repo 額外狀態

```bash
# 已 stage / unstaged / untracked
git status -s | wc -l                                    # 總變動數
git status -s | head -20                                 # 列前 20

# 最近 5 個 commits（看本 session 寫了什麼）
git log --oneline origin/${BRANCH}..HEAD | head -10      # ahead commits（要 push 的）
git log --oneline HEAD..origin/${BRANCH} | head -10      # behind commits（要 pull 的）

# Stash 數
git stash list | wc -l
```

### Step 4: 彙整成單一表格

```markdown
| Repo | Branch | Behind | Ahead | Modified | Untracked | 動作建議 |
|---|---|---:|---:|---:|---:|---|
| mini-taiwan-info | main | 0 | 8 | 0 | 1 | push 前先 grep secret |
| gis-platform | main | 1 | 1 | 0 | 0 | pull --rebase 再 push |
| taipei-gis-analytics | master | 0 | 1 | 5 | 12 | push 安全（modified 是 user 其他 session） |
```

附建議：
- 哪個能直接 push、哪個要先 pull --rebase
- 哪個有 untracked 是 user 其他 session 的（**不該動**）
- 哪個的 ahead commits 看起來是本 session 寫的

## 失敗判讀

| 訊息 | 意思 | 對策 |
|---|---|---|
| `fatal: not a git repository` | repo 路徑不對 | 確認絕對路徑 |
| `fatal: couldn't find remote ref` | branch 名不對（main vs master） | gis-platform/mini = main，taipei = master |
| fetch hang | 網路 / GitHub 雙因素 | timeout 後降級顯示 local 狀態 |
| 大量 untracked | 通常是 user 在其他 session 改的 | **不提議 add，列出讓 user 知道即可** |
| 三 repo 都 0/0/0/0 | 完全乾淨 | 報「clean，無動作建議」 |

## 邊界（不做的事）

- ❌ **不 push**（即使 ahead 也只報告）
- ❌ **不 pull**（即使 behind 也只報告）
- ❌ **不 stash**
- ❌ **不 add / commit**
- ❌ **不刪 untracked**

純 read-only。後續動作由 user 拍板，可呼叫 `/theme-loop` Stage 5 或手動處理。

## 整合呼叫範例

```
User: 跨 repo 看一下
Claude: [跑 4 步驟] → 出表格 + 動作建議

User: 都 push 吧
Claude: [push mini → push gis 撞 1 behind → rebase → push] 不在本 skill 範圍，是 /theme-loop Stage 5 的事
```

## 何時更新這份 skill

| 情境 | 更新什麼 |
|---|---|
| 新增 sibling repo 加入 GIS 體系 | Step 1 repo 路徑清單 |
| GitHub 推出新 reject pattern（branch protection / signing / ...） | 「失敗判讀」表追加 |
| fetch 速度慢 → 改 default `--depth=10` 之類 | Step 2 指令 |
| 某 repo 改 branch 名（main → trunk 等） | Step 1 branch 對照 |

---

**設計理念**：純資訊蒐集職責單一，不跟「執行 push/pull」混在一起。是 `/theme-loop` 與 `/wrap-up` 的前置情報層。
