---
name: wrap-up
description: Session 結束後收尾 + 更新 .claude/memory/ 的 skill。當使用者說 /wrap-up、「收工」、「收尾」、「session 結束」、「做完了」、「commit memory」、「整理記憶」時觸發。讀本 session 脈絡 + git log + 現有 memory → 對應更新 9 個 memory 檔 → 產出 diff 給用戶 review → 每檔 atomic commit（prefix memory:）→ 不自動 push。mini-taiwan-info 客製：(1) 偵測跨 3 repo 變動 → 更新 CROSS_REPO.md；(2) 偵測 manifest / SSOT 變動 → 觸發 typecheck 驗證；(3) 完成後提示是否同步全域 memory。
user_invocable: true
---

# /wrap-up — Session 收尾 SOP（mini-taiwan-info 客製版）

## 目的

- 分析本 session 做了什麼、學到什麼、失誤什麼
- 寫回 `.claude/memory/` 9 個檔
- 每檔 atomic commit（prefix `memory:`），git log 可追記憶演進
- 不 push，保留用戶最後 review 機會
- mini-taiwan-info 客製三規則：跨 3 repo 同步、manifest 變動驗證、全域同步提示

---

## 6 階段流程（v1.1，加 Stage 0）

### Stage 0: Mode 判斷（v1.1 新增）

跑 wrap-up 前先決定走哪個 mode：

| Mode | 判斷條件 | 流程差異 |
|---|---|---|
| **A. Init mode** | `.claude/memory/STATUS.md` 不存在 / 或本 session 內剛建立 | 把 session 全部知識倒進 9 個 memory；REFLECTIONS append 一條「初始化」紀錄 |
| **B. Incremental mode**（預設）| STATUS 存在且非本 session 建立 | Diff 上次 STATUS 跟現況；只 append 新事件到對應 memory |
| **C. Empty mode** | 純閒聊 / 純 read 的 session | 問用戶「要強制留紀錄嗎？」；若 no，跳過 Stage 2-5 |

**判斷指令**：
```bash
# 看 STATUS 上次更新時間
head -10 .claude/memory/STATUS.md | grep "最後更新"
# 看本 session 有沒有 commit memory 檔
git log --oneline --since="1 hour ago" -- .claude/memory/
```

### Stage 1: Gather

**平行發**：

- Read `.claude/memory/` 9 個檔（除 README）
- 本 session 的 commit hash 範圍：
  ```bash
  # 找出本 session 開始時的 HEAD（用 reflog 而非 --since，更精準）
  SESSION_START=$(git reflog --date=iso | grep -B1 "from $(git rev-parse HEAD~20)" | head -1 | awk '{print $1}')
  git log --oneline $SESSION_START..HEAD
  ```
  或更簡單：直接用「最早的 memory: 或 feat: commit 之前一個」當 baseline
- 跨 repo：在每個 repo 內看 `git log --oneline` 用相同 hash whitelist（**不要用 --since=**，會抓到其他 session 的 commits）
- `git status` 看未 commit 的變動
- Read root `_STATUS.md` 看 user-facing Phase 進度（不重寫，只取摘要參考）

**接著回顧本 session**：
- 用戶要求什麼？
- 做了什麼（新 component / new query / new migration / new pipeline）？
- 哪裡卡住、有 typecheck error / runtime error？
- 用戶糾正幾次、哪些 feedback？
- agent-browser 抓到的視覺問題？

**陷阱**：
- ❌ `git log --since="1 hour ago"` — 跨 session 邊界不精準
- ❌ `git log origin/main..HEAD` — origin 同步狀態取決於是否 fetch
- ✅ 用具體 commit hash 範圍（從 reflog 或本 session 已知的第一個 commit）

### Stage 2: Analyze

事件分類表（mini-taiwan-info 客製）：

| 事件 | 寫到哪 |
|---|---|
| 做完某 view / KPI / component | STATUS（rewrite）+ 若大里程碑也寫 `_STATUS.md` (root) |
| 新 idea | BACKLOG（P0/P1/P2/P3）|
| 關閉舊待辦 | BACKLOG「已完成」區 |
| 新決策 / 預設 / 架構選擇 | PRINCIPLES |
| 重複性流程（做過 ≥2 次）| PLAYBOOKS |
| 新術語 / 縣市代碼 / 規格詞 | GLOSSARY |
| Bug 修好**且造成 rework** | INCIDENTS（append；長篇另放 `.claude/pitfalls/`）|
| 「下次怎麼改」/「以後要先 X」| REFLECTIONS（append）|
| **跨 repo 變動**（改 `../gis-platform/migrations/` 或 `../taipei-gis-analytics/pipelines/`）| **CROSS_REPO pending 區** |
| **manifest / SSOT 變動**（`themes/*.yaml` / `data/counties.yaml` / `docs/04-*.md`）| **stage 3 前先跑 `pnpm typecheck`，fail 則阻止 commit** |
| 新學到跨專案事實（如 Mapbox / Supabase / Vite 行為）| Stage 5 後提示同步到 `~/.claude/.../memory/` |
| 視覺 UX bug（agent-browser 截到）| INCIDENTS + 寫進 REFLECTIONS「下次預先檢核」 |

**寫回規則**：

- `INCIDENTS` / `REFLECTIONS` 只 append，不改舊條目
- `INCIDENTS` 收錄門檻：至少造成一次 rework 或靜默錯誤
- `PRINCIPLES` 衝突：新覆蓋舊，舊搬進 `INCIDENTS`
- `STATUS` 每次 rewrite（只留當下）
- `CROSS_REPO` 同步完成項從 pending 移除（交 git log 保歷史）
- 數字改動前 `wc -l` / `git log --oneline | wc -l` / Supabase count 驗證，不單信對話摘要

### Stage 3: Draft

- 產出**總表**（檔名 / 動作 / 摘要）給用戶一眼看全
- 逐條 show diff 草稿（Edit old/new string 或 Write 全文）
- **若偵測到 manifest / counties.yaml / docs/04 變動** → Draft 前先跑：
  ```bash
  cd frontend && pnpm typecheck
  ```
  TypeScript error 則提示用戶先修 frontend 再 commit memory

### Stage 4: Confirm

問用戶：

- 全部採用？
- 要改哪幾個？
- Skip 哪幾個？

**等用戶回覆才進 Stage 5**，不自作主張。

### Stage 5: Atomic Commit

- 每檔一個 commit，訊息格式：`memory: <動詞> <檔名> (<1 句摘要>)`
- 非 memory 檔（如 frontend bug 修、新 migration）用對應 `fix:` / `feat:` / `docs:` prefix
- commit 順序：**STATUS 最後**（避免引用尚未 commit 的變動）
- Co-Authored-By line 仍保留
- Pre-commit hook 失敗 → fix 後開新 commit，**不 amend**
- 完成後 `git status` 確認 tree clean

### Stage 6: Harness Audit（2026-05-15 加，整個 .claude/ 系統的自我檢視）

> Memory 只記「做什麼」，Harness 才管「怎麼讓 Claude 做得更好」。每次 wrap-up 順便檢視 5 件事。

#### 6-1. Skill 使用率盤點

跑：
```bash
ls .claude/skills/*/SKILL.md
```
列當前 N 個 skill。比對本 session **實際被觸發次數**（從 conversation 自我觀察）：

| Skill | 本 session 觸發 | 累計 |
|---|---:|---:|
| /theme-loop | X | Y |
| /wrap-up | 1 | Y+1 |
| /check-schema-exposed | X | Y |
| ... | ... | ... |

判讀：
- **0 次但 description 寫了該觸發**：description 不夠 pushy → 提醒 user 改
- **本該觸發卻沒**：典型 undertrigger，可能 description / trigger 詞要強化
- **過度觸發**：少見，但若 skill 跟其他 skill 範圍重疊也提

#### 6-2. Hook 健康度

跑：
```bash
ls .claude/hooks/*.sh 2>/dev/null && cat .claude/settings.json | jq '.hooks'
```

檢查：
- 每個 hook script 是否還執行得通（` 'echo {} | bash <script>'` 試跑）
- settings.json hook matcher 是否與當前需求對齊
- 本 session 有沒有觀察到 hook 失靈（沒抓到 typecheck error 之類）

異常立刻列出來給 user 看 + 提建議。

#### 6-3. Permission allow-list 增量

跑：
```bash
git diff HEAD~10 .claude/settings.json 2>/dev/null | head -50
```

檢查：
- 本 session 有沒有 user 反覆按 allow 同類指令的 pattern → 該加進 allow
- 有沒有過度寬鬆的 wildcard 該收斂

提示用 `fewer-permission-prompts` skill 自動掃 transcript 補 allow（user 全域 skill 已有）。

#### 6-4. Memory 9 檔健康度

跑：
```bash
wc -l .claude/memory/*.md
```

檢查：
- 哪個檔超過 500 行可能該重整（INCIDENTS / REFLECTIONS 是 append-only 例外）
- BACKLOG > 30 項 → 提醒清 P3
- PRINCIPLES 是否有衝突條目（新舊覆蓋規則沒處理乾淨）
- GLOSSARY 是否有重複定義

#### 6-5. 新模式提取（最重要）

問自己：本 session 有沒有出現「**做超過 1 次的新動作**」、「**新撞牆**」、「**新意外效率提升**」？

| 信號 | 對策 |
|---|---|
| 同個動作做 ≥ 2 次 | 是否該抽成新 skill / 新 PB / 新 hook？ |
| 撞了新坑 | 已 append INCIDENTS，但若該坑可被預先 lint / hook 攔截 → 寫新 hook |
| 某 skill 內某段重複出現在不同任務 | 抽出 shared reference |
| 新人 onboard 看不懂某個慣例 | 加進 GLOSSARY 或 CLAUDE.md must-check |

→ Harness audit 完成後，給 user 看「Skill / Hook / Permission / Memory / 新模式」5 項建議清單，user 拍板才做（不自動改）。

**完成後客製提示**：

- 「要 push 嗎？`git push origin main`」（不自己 push）
- Stage 2 若標記跨專案事實，列清單問「要同步到全域 memory 嗎？」（等 yes 才寫）
- 若 CROSS_REPO 有 pending 跨 repo 變動：提醒去對應 repo（gis-platform / taipei-gis-analytics）也跑 wrap-up
- Stage 6 若有建議：問「現在採用嗎？/ 寫進 BACKLOG 下次做？/ Skip」

---

## 注意事項

- **Read first**：Edit 前先 Read 避免 old_string 不精確
- **驗證數字**：STATUS / BACKLOG 的數字用 `wc -l` / `git log | grep -c` / Supabase count 確認
- **不修**：root `CLAUDE.md`（規則層）、`docs/00-10*.md`（規劃 SSOT，各自有更新流程）、`themes/_template.yaml`（規格 SSOT）
- **不跨 session 臆測**：只信「本 session 對話 + git log + 現有 memory + 現有 docs」四者交叉驗證
- **跨 repo 誤報**：若其他 repo 有變動但非本 session 改的（其他終端 / session），**不寫入** CROSS_REPO，只提示用戶
- **沒什麼好記**：純閒聊 / 純 read 的 session，問用戶「要強制留紀錄嗎？」
- **agent-browser 視覺驗證**：每次大改 view 後跑 agent-browser screenshot，截圖路徑記在 REFLECTIONS

---

## 客製三規則的目的

1. **跨 3 repo 追蹤** — 防 GIS 三部曲漏同步（mini-taiwan-info / gis-platform / taipei-gis-analytics）
2. **Manifest / SSOT 變動觸發 typecheck** — 防 yaml 改錯但 frontend 沒對齊，到下次 session 才爆
3. **全域同步提示** — 跨專案事實沉澱，避免別的 GIS 子專案重蹈覆轍

---

## Skill 自身反省

- 每次 `/wrap-up` 若漏抓重要事件、或 commit 訊息風格失誤 → 在本次 REFLECTIONS 記下 → 回頭修本 SKILL.md → 下次按新規則執行
- **Skill 自我優化 = 記憶系統持續進化的核心**
- 第 10 次 `/wrap-up` 後檢視 PLAYBOOKS 是否過期
