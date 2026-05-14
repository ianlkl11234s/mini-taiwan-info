# Self-Evolving Project Memory Framework

一個給 Claude Code 專案使用的、會自我反省與持續優化的記憶系統。

> 本文是可移植的說明書。在新專案複製這個框架時，照這份做即可。
> 本專案（taipei-gis-analytics）採用此框架時有 GIS 特色客製，見 §6。

---

## 1. 為什麼需要這個系統

### 問題
- Claude Code 每個 session 重啟就失憶，context window 有限
- 全域 memory（`~/.claude/...`）夠大但跨專案，容易被其他專案污染、或長期腐化
- 純 `CLAUDE.md` 只適合放「不變規則」，放狀態會很快過期卻又改不動
- 本專案另有 `docs/memos/`、`docs/data-catalog/`、`docs/systems/` 三層文件，需要明確切分職責

### 解法
把記憶**分層**：

| 層 | 位置 | 性質 | 變動頻率 |
|---|---|---|---|
| 全域 | `~/.claude/.../memory/` | 跨專案 / 用戶偏好 / API 事實 | 低 |
| 規則 | `<project>/CLAUDE.md` | 不變規則（架構、路徑、SOP 編號） | 低 |
| **狀態** ⭐ | `<project>/.claude/memory/` | **變動狀態 + 反省 + backlog** | **高** |
| 深度 | `<project>/docs/memos/` | per-pipeline 深度進度 | 中 |
| SSOT | `<project>/docs/data-catalog/` | per-source 災難恢復手冊 | 中 |
| 體系 | `<project>/docs/systems/` | per-theme 跨 Layer 聚合 | 低 |
| 長文 | `<project>/.claude/pitfalls/` | 事件的 long-form archive | 低 |

**核心設計決策**：
1. **狀態層 commit 進 git** — 跨機器、跨會話、有 history
2. **分類 9 個檔** — 每種資訊一個檔，單一職責
3. **Atomic commit + `memory:` prefix** — git log 可追「記憶如何演進」
4. **append-only 的反省檔 + 每次 rewrite 的 STATUS** — 既保留歷史又保持清爽
5. **`/wrap-up` skill 自動收尾** — Claude 自己反省、自己 commit
6. **memory 層不抄 docs/ 深度內容** — STATUS 只放一句摘要 + 連結，避免兩份真相

---

## 2. 目錄結構

```
<project>/
├── CLAUDE.md                      # 不變規則（build 檢查、程式風格）
└── .claude/
    ├── README.md                  # .claude/ 目錄索引
    ├── FRAMEWORK.md               # 本檔（可移植說明書）
    ├── memory/                    # ⭐ 狀態層
    │   ├── README.md              # 記憶索引 + Session SOP
    │   ├── STATUS.md              # 當前進度（每次 rewrite）
    │   ├── BACKLOG.md             # 待辦（P0/P1/P2/P3）
    │   ├── PRINCIPLES.md          # 預設 + 決策（不用再溝通）
    │   ├── PLAYBOOKS.md           # 固定流程 SOP（做過 ≥2 次才寫）
    │   ├── GLOSSARY.md            # 術語表
    │   ├── INCIDENTS.md           # 踩坑 + 教訓（append-only）
    │   ├── REFLECTIONS.md         # Session 反省（append-only）
    │   └── <PROJECT_SPECIFIC>.md  # 例：CROSS_REPO.md / API_CONTRACTS.md
    ├── skills/
    │   └── wrap-up/
    │       └── SKILL.md           # ⭐ 收尾 + 自我反省 skill
    └── pitfalls/                  # long-form archive（INCIDENTS 的長文）
```

---

## 3. 檔案職責與更新規則

### `STATUS.md` — 當下狀態（每次 rewrite）
- 本次 session 做了什麼、下一步是什麼
- 等用戶執行的動作（check list）
- 跨 pipeline 當下快照（僅一行摘要 + 連結回 `docs/memos/*_progress.md`）

**更新時機**：每次 `/wrap-up` 必 rewrite，**只保留當下**。

### `BACKLOG.md` — 待辦
- 表格：`ID | 優先級 | 項目 | 狀態 | Blocker/備註`
- 優先級：P0 阻塞 / P1 規劃期 / P2 穩定後 / P3 nice-to-have
- 下方保留「已完成（近期 10 筆）」區

**更新時機**：想到新 idea、完成舊項目時。

### `PRINCIPLES.md` — 不用再溝通的預設
- 專案層：預設日期、語言、時區
- 技術慣例：指令、工具、shell 風格、座標系、時區處理
- 行為原則：Claude 自律規則（例：「不盲信 memory」）

**更新時機**：達成新共識時。衝突時新覆蓋舊，舊的搬去 INCIDENTS。

### `PLAYBOOKS.md` — 固定 SOP
- 標號 `PB-01` / `PB-02` / ...
- Step-by-step 指令清單（若已有 skill，只寫「skill 觸發字 + 參數」，避免兩份真相）
- 規則：**同一操作做過 ≥ 2 次**才寫進來

**更新時機**：流程定型時、或 PRINCIPLES 新增時同步更新相關 PB。

### `GLOSSARY.md` — 術語表
- 外部 API 術語（含 credit 計價、rate limit）
- 代碼對照（例：座標 EPSG、縣市代碼、Layer/Tier 分類）
- 專案自造詞（例：GIS 三部曲、SSOT、TIC）

**更新時機**：遇到新術語時。

### `INCIDENTS.md` — 踩坑（append-only）
- 格式：`## YYYY-MM-DD 標題` → 現象 / 根因 / 對策
- 收錄門檻：**至少造成一次 rework** 才進
- 長文存 `.claude/pitfalls/` 後這裡放摘要 + link

**更新時機**：遇到 bug 並修好後。**絕對不刪**（歷史價值）。

### `REFLECTIONS.md` — Session 反省（append-only）
- 格式：`## YYYY-MM-DD 標題` → What worked / What didn't / Next-time rules / Memory 產出
- 每次 `/wrap-up` 追加

**更新時機**：每次 `/wrap-up`。**絕對不刪**。

### 專案專屬檔（可選）
依專案性質加。範例：

| 專案類型 | 建議檔名 |
|---|---|
| 資料處理（單源）| `DATA_SCOPE.md` |
| 多 repo 協作 | `CROSS_REPO.md`（本 GIS 專案用的） |
| API 整合 | `API_CONTRACTS.md` |
| 前端產品 | `FEATURES.md` |

---

## 4. `/wrap-up` Skill — 自我反省迴圈

收尾 skill 是整個系統的核心運作機制。位置：`.claude/skills/wrap-up/SKILL.md`

### 5 階段流程

1. **Gather**（並行）
   - Read memory/ 全部
   - `git log origin/master..HEAD` + `git log -20 --oneline`
   - `git status`
   - 回顧本 session 對話：用戶要求 / 動作 / 卡點 / 糾正次數

2. **Analyze** — 事件分類到對應 memory 檔

    | 事件 | 寫到哪 |
    |---|---|
    | 做完功能 / 抓完資料 | STATUS + 專案專屬檔 |
    | 新待辦 | BACKLOG (add) |
    | 完成待辦 | BACKLOG (close) |
    | 新決策 / 預設 | PRINCIPLES |
    | 重複流程定型 (≥ 2 次) | PLAYBOOKS |
    | 新術語 | GLOSSARY |
    | Bug 並修好且造成 rework | INCIDENTS (append) |
    | 反省 | REFLECTIONS (append) |
    | **跨 repo 變動** | **CROSS_REPO + 提醒去哪個 repo 同步** |
    | **新增 pipeline** | **自動觸發 data-catalog-audit** |
    | **新學到跨專案事實** | **建議（不自動）同步全域 memory** |

3. **Draft** — 產出**總表**（變動類型 + 摘要）+ 每個變動的實際 diff

4. **Confirm** — 問用戶：全採用 / 修哪幾個 / skip 哪些

5. **Atomic Commit** — 每檔一個 commit，訊息：
    ```
    memory: <動詞> <檔名> (<1 句摘要>)
    ```
    STATUS 放最後 commit（避免引用未 commit 的變動）。不自動 push。

### 關鍵原則

| 原則 | 為什麼 |
|---|---|
| **Read first** | Edit 工具需要精確 old_string |
| **驗證數字** | 數量要 `wc -l` / SQLite count 驗證不單信對話摘要 |
| **INCIDENTS / REFLECTIONS 只 append** | 歷史有價值 |
| **STATUS 每次 rewrite** | 只要當下 |
| **不 amend commit** | pre-commit hook 失敗就開新 commit |
| **不修 CLAUDE.md** | 那是規則層，/wrap-up 不動 |
| **不跨 session 臆測** | 只看 session 對話 + git log + memory |
| **memory 不抄 docs/** | 只放摘要 + 連結，避免兩份真相 |

### Skill 自我優化

這個 skill 自己會被 REFLECTIONS 檢討。若某次 `/wrap-up` 漏抓事件、訊息風格不好，應：
1. 在該次 REFLECTIONS 記下
2. 回頭修 `SKILL.md`（加新規則 / 改流程）
3. 下次 `/wrap-up` 照新規則跑

**這就是「自我演進」的機制**：系統在每次使用中校準自己。

---

## 5. 在新專案設置（5 分鐘）

### Step 1：建立目錄骨架

```bash
cd /path/to/new-project
mkdir -p .claude/memory .claude/skills/wrap-up .claude/pitfalls
```

### Step 2：複製本框架檔

```bash
cp /path/to/this-project/.claude/FRAMEWORK.md .claude/FRAMEWORK.md
cp /path/to/this-project/.claude/skills/wrap-up/SKILL.md .claude/skills/wrap-up/SKILL.md
```

### Step 3：填 9 個 memory 檔初始內容（最小模板）

1. `memory/README.md` — 索引 + SOP
2. `memory/STATUS.md` — 寫「初始化」一條
3. `memory/BACKLOG.md` — 寫 B001 初始化
4. `memory/PRINCIPLES.md` — 至少寫語言、時區、Python 指令
5. `memory/PLAYBOOKS.md` — 空骨架
6. `memory/GLOSSARY.md` — 空骨架
7. `memory/INCIDENTS.md` — 空骨架（append-only 說明）
8. `memory/REFLECTIONS.md` — 空骨架（append-only 說明）
9. 專案專屬檔 — 依性質加

### Step 4：更新 `.claude/README.md`

指向新結構。

### Step 5：首次 commit

```bash
git add .claude/
git commit -m "feat: scaffold .claude/memory/ framework"
```

### Step 6：試跑 `/wrap-up`

第一次跑 skill 可能沒太多東西可記，這沒關係——系統會隨後續 session 積累。

---

## 6. 本專案的客製（taipei-gis-analytics）

### 職責切分（跟既有 docs/ 文件層不重疊）

| 既有位置 | 粒度 | 保留不動 |
|---|---|---|
| `CLAUDE.md` | 架構規則 | ✅ |
| `docs/memos/*_progress.md` | per-pipeline 深度進度 | ✅ |
| `docs/data-catalog/{theme}/*.md` | per-source SSOT（災難恢復） | ✅ |
| `docs/systems/*_tic.md` | per-theme Layer 1/2/3 體系 | ✅ |
| `docs/data-sources.md` | pipeline 部署總覽 | ✅ |
| `docs/data-registry.yaml` | 機器可讀清冊 | ✅ |
| `~/.claude/.../memory/*.md` | 跨專案全域事實 | ✅ |

`.claude/memory/` 是**狀態機 + 反省 + 學習**，不取代上述任何一層。

### 專案專屬檔：`CROSS_REPO.md`

因為本專案是 GIS 三部曲（taipei-gis-analytics / gis-platform / data-collectors）的探索層，跨 repo 同步是最常漏的地方，所以專案專屬檔用 `CROSS_REPO.md` 追蹤同步狀態。

### wrap-up 客製

1. Stage 2 新增「跨 repo 變動」事件類別 → 寫到 CROSS_REPO.md
2. Stage 2 新增「新增 pipeline」事件類別 → 自動觸發 data-catalog-audit
3. Stage 5 完成後提示用戶：是否有新事實要同步到全域 memory（建議不自動寫）

### 導入來源

本專案初次導入時，內容來源：
- `PRINCIPLES.md` ← `.claude/principles.md`（git rm 後整合）+ CLAUDE.md 行為規則 + 全域 memory feedback 提升
- `PLAYBOOKS.md` ← git log 近 30 commits 挖做過 ≥2 次的流程
- `GLOSSARY.md` ← CLAUDE.md 的座標/網格/縣市代碼表 + 全域 memory reference
- `INCIDENTS.md` ← `docs/memos/` 踩坑摘要 + 全域 memory feedback（全域保留備援）
- `BACKLOG.md` ← `docs/memos/` 未完成項目 + TIC 索引待建項 + `docs/data-sources.md` 開發中/探索中

---

## 7. 客製化方向

### 專案差異

| 調整項 | 建議 |
|---|---|
| 回應語言 | `PRINCIPLES.md` 第一行寫死 |
| `SKILL.md` 觸發詞 | 加入該專案團隊常用說法 |
| 專案專屬檔 | 見 §6 |
| Commit 訊息語言 | `SKILL.md` Stage 5 模板 |

### 反模式（不要做）

- ❌ 把 session 任務清單放進 memory（那是 Task / Plan 的責任）
- ❌ INCIDENTS / REFLECTIONS 修改歷史條目（毀掉學習軌跡）
- ❌ 所有變動合併成一個 commit（失去 `memory:` atomic 的追蹤價值）
- ❌ `/wrap-up` 自動 push（用戶必須有 review 機會）
- ❌ PRINCIPLES 寫成「大概 / 通常 / 建議」（原則要明確）
- ❌ PLAYBOOKS 只做過 1 次就寫（沒定型的流程寫了會誤導）
- ❌ 把 `docs/memos/` / `docs/data-catalog/` 的內容抄進 memory（兩份真相 = 沒真相）

### 成熟度指標（多久會長穩？）

- **第 1~3 次 session**：框架骨架還空，/wrap-up 產出少，正常
- **第 4~10 次**：PRINCIPLES + INCIDENTS 開始填滿，Claude 行為穩定性明顯提升
- **第 10 次後**：PLAYBOOKS 開始成形，反覆任務變成純執行
- **腐化訊號**：STATUS 顯示「上次更新 >7 天」、BACKLOG 全是 P3、REFLECTIONS 沒新條目 → 可能系統沒在用

---

## 8. 本框架的版本紀錄

- **v1.0（2026-04-23，plan-art）** — 9 檔 + `/wrap-up` 5 階段 + atomic commit
- **v1.1（2026-04-23，taipei-gis-analytics 首次導入）** — 客製 `CROSS_REPO.md` 取代 `DATA_SCOPE.md`；wrap-up 新增跨 repo / 新 pipeline / 全域同步三條 Stage 2 規則；明確切分跟既有 `docs/memos/` `docs/data-catalog/` `docs/systems/` 的職責邊界
