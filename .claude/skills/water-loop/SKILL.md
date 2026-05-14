---
name: water-loop
description: mini-taiwan-info 水資源（與其他主題）資料/視覺迭代循環 SOP。當使用者說 /water-loop、「跑下一輪」、「迭代水資源」、「接下個資料」、「下個 cycle」、「修一輪 P0」時觸發。半自動 5 階段 + 3 checkpoint：Discovery（並行 agent 截圖+資料候選+gap 分析）→ Plan（user 拍板路線）→ Execute（純前端 fix 或 ETL+migration+frontend）→ Verify（typecheck + agent-browser 截圖雙閘）→ Commit/Push（atomic + secret scanning fallback）。專為本專案 manifest-driven SPA + Supabase + 跨 3 repo 同步設計。
user_invocable: true
---

# /water-loop — 主題資料/視覺迭代循環 SOP

## 目的

把「找下個改進點 → 改 → 驗證 → commit」這個循環半自動化。

每跑一次 `/water-loop` 完成 **一個 cycle**（一個 P0 bug、一個資料整合、或一個視覺重做）。

設計原則：
- **半自動**：自動跑 discovery / typecheck / 截圖；user 拍板 3 個 checkpoint
- **不破壞**：不自動 apply migration、不自動 push、不自動 commit
- **可重入**：跑到一半中斷後再說 `/water-loop continue` 應該能接上（透過 TaskList 狀態）

---

## 觸發詞 / Mode 判斷

### 觸發詞
- `/water-loop`
- 「跑下一輪」、「迭代」、「接下個資料」、「下個 cycle」
- 「修一輪 P0」、「補一個 KPI / tab」

### Mode 判斷

| Mode | 條件 | 流程差異 |
|---|---|---|
| **P. Pure-frontend fix** | discovery 發現 P0 bug 且純 .tsx/.ts 改 | 跳過 Checkpoint A（無 DB 變動） |
| **D. Data-integration** | discovery 鎖定要接的新資料/新表/新 RPC | 完整 5 階段 + 3 checkpoint |
| **V. Visual rework** | 視覺化方式重做（chart type 換、layout 重排）| 強化 Checkpoint B（視覺拍板要對比 before/after） |

mode 由 Stage 2 Plan 拍板時決定。

---

## 5 階段流程

### Stage 1: Discovery（自動，並行）

**並行三個 Task agent**：

| Agent | subagent_type | 任務 |
|---|---|---|
| A. **Screenshot** | general-purpose | agent-browser 截 View A / B (該 session 焦點縣市) / C，回報視覺問題、fetch 時序假象風險、可改進點 top 3 |
| B. **Data candidates** | Explore | 對齊 `themes/{theme}.yaml` 規格 + Supabase 現有表 + `../taipei-gis-analytics/pipelines/`，找 Tier S/A/B 候選 |
| C. **Gap analysis** | Explore | 三類 gap：規格已列但 mock / Supabase 有資料但 UI 沒接 / 視覺化不適合資料形狀 |

**並行同一訊息發**，等三 agent 都回再彙整。

**Discovery 截圖驗證的「fetch 時序假象」陷阱**（Cycle 1 學到）：
- agent-browser headless 截圖時 page 可能還沒 hydrate
- 凡 KPI 顯示 `━`、`---` 或 stat=0 但理論應有值 → 不立即下結論「真的 0」
- 應再 wait 3500ms + 重截一張，或用 eval 看 `.kpi-card .kpi-value` text 非 `━` 才當有效樣本
- 不確定就拉用戶實機驗證，不要把假象當 bug 修

### Stage 2: Plan（Checkpoint A 前置）

彙整 discovery → 用 `AskUserQuestion` 問 user 兩件事：

1. **這輪做什麼**？列 2-4 個候選（含理由、工時、預期視覺效果）
2. **自動化程度**？半自動 3 checkpoint（預設）/ 監督模式每階段停 / 激進 zero-touch 純前端

User 拍板後：
- Mode 拍板（P / D / V）
- 建立 TaskList 任務（cycle Xa/Xb/Xc... + verify + commit）
- 進 Stage 3

### Stage 3: Execute（自動，分支依 Mode）

#### Mode P（純前端 fix）

1. Read 涉及檔（每個 ≤ 2000 line，多檔並行 Read）
2. 用 Edit / Write 改檔
3. 跑 `cd frontend && pnpm typecheck`
4. typecheck pass 才進 Stage 4

#### Mode D（資料整合）— 含 **Checkpoint A: apply migration 前** + **Checkpoint A0: freshness 判定**

**Checkpoint A0（新，2026-05-14 拍板）— freshness / LIVE 判定**：

每接一個新資料集，先判斷 freshness 級別 + 與 user 討論是否加進 collector cron。

| 上游性質 | freshness 級別 | UI 標示 | collector 動作 |
|---|---|---|---|
| Realtime API（如雨量 / 蓄水率）| 即時 | 🟢 LIVE | **必跟 user 討論加 cron** |
| 日 / 週度更新 | 日 | 「資料時間 YYYY-MM-DD」 | 可選加 cron |
| 月 / 季度採樣（如水質）| 月 | 「資料時間 YYYY-MM-DD」 | 一次性 backfill，可選排程 |
| 年度報告（如 LPCD）| 年 | 「資料時間 YYYY 年度」 | 一次性 backfill |
| 半年以上未更新 | 已停 | 「資料時間 YYYY-MM-DD（已停採）」 | 不加 cron |

**「LIVE」嚴格定義**：collector 設 cron 自動持續抓 + 上游有 realtime / 高頻 update。**不是「DB 真資料」就叫 LIVE**（PRINCIPLES）。

**Cycle Discovery 階段必做**：
```sql
-- 看新接資料的真實 freshness
SELECT MAX(sampled_at) AS latest, AGE(NOW(), MAX(sampled_at)) AS staleness
FROM public.{new_table};
```
- staleness < 24h → 可能是 LIVE，但要再確認 collector 是否有 cron
- staleness > 30d → 不是 LIVE，標資料時間
- 不同 source 在同表內 freshness 可能差很多（如 epa_reservoir 月度 vs wra_gw 已停）→ UI 要 by source 標

**Stage 2 Plan 時跟 user 討論**：
- 「這 dataset 上游是 realtime？要加進 collector cron 嗎？」
- 「該 source 已停採，要怎麼標？」

1. 確認 pipeline 存在於 `../taipei-gis-analytics/pipelines/`，或寫新 pipeline
2. **dry-run pipeline**：拉 sample 但不寫 DB
   ```bash
   python3 pipelines/{theme}/{pipeline}.py --dry-run --limit 10
   ```
3. 寫 / 更新 migration SQL（**不 apply**）
4. **Checkpoint A**：給 user 看
   - Sample rows（5-10 列）
   - Migration SQL（diff）
   - 預期影響表名 + 列數估算
   - **freshness 級別判定 + UI 標示策略**
   - User 拍板才繼續

5. User OK → `psql $DATABASE_URL -f migrations/0XX_*.sql`
6. 跑 pipeline `--full`
7. 寫 frontend：query → hook → component
   - **LIVE badge 只在真 cron 持續抓的資料用**
   - 其他用 `<DataAgeBadge sampled_at={...} />`（待建 component）
8. `pnpm typecheck`

#### Mode V（視覺重做）

1. 同 Mode P，但要先在 BACKLOG 留底「重做前長什麼樣」
2. 改檔
3. typecheck

### Stage 4: Verify（Checkpoint B）

**自動**：
- agent-browser reload + 截圖 changed view（before/after 對比）
- 對純資料 cycle：截 ViewA KPI 卡 / explode / ViewB tab / ViewC chart
- 對純前端 cycle：focus 改動 area

**Checkpoint B**：給 user 看
- before/after screenshot
- typecheck 結果
- 視覺化選項（若 Mode V）
- 若有「視覺化方式 vs 資料形狀」抉擇 → `AskUserQuestion` 列選項配 preview

User 拍板才進 Stage 5（commit）。

### Stage 5: Commit/Push（Checkpoint C）

**自動草擬**：
- 列影響檔案 + atomic 切分建議（一邏輯一 commit）
- 草擬 commit message（`fix:` / `feat:` / `chore:` prefix + Co-Authored-By）

**Checkpoint C**：`AskUserQuestion` 兩題：
1. **顆粒度**：N 個 atomic commit（推薦）/ 1 個包裝 commit / 不 commit 留 worktree
2. **Push**：不 push（保守）/ push origin / 3 repo 全 push

按 user 拍板執行：
- N atomic commit：用「git restore + redo Edit per commit」拆 hunk（Cycle 1 學到比 git add -p 穩）
- Push：先試 `git push`，遇到失敗依下方 fallback

---

## Push 失敗 fallback（Cycle 1 學到的隱形障礙）

### A. Secret scanning 擋 push

訊息含 `push declined due to repository rule violations` + `secret-scanning/unblock-secret/...`

**自動處理**：
1. `grep -rn "pk\\.eyJ\\|sk_\\|AKIA\\|ghp_\\|gho_" ...` 找出所有 token
2. 列出來給 user 看 + 用 `AskUserQuestion` 問：
   - 用 `git filter-repo --replace-text` rewrite history（推薦）
   - 用 GitHub URL allow 一次（user 自己點）
   - 改 .gitignore 把 designs/ 或 prototype/ 整個排除
3. 若選 rewrite：
   ```bash
   # backup
   cp -r {repo} /tmp/{repo}.bak-pre-filterrepo
   # working tree 改 placeholder + commit
   # 寫 /tmp/replace.txt: <token>==><placeholder>
   git filter-repo --replace-text /tmp/replace.txt --force
   # filter-repo 會 remove remote，要重 add
   git remote add origin <url>
   git push -u origin main --force
   ```

### B. Remote 有 user 沒有的 commits（fetch first）

- 跑 `git fetch origin && git rev-list --left-right --count origin/main...HEAD`
- 列出 remote-only commits 給 user
- 預設 `git pull --rebase origin main` 後 push
- 衝突就停下來給 user 處理（不自動 resolve）

### C. 三個 repo 同步

- mini-taiwan-info（本專案）
- gis-platform（migrations）
- taipei-gis-analytics（pipelines）

只 push 本 session 真實有 commit 的 repo。對其他 repo 用 `git log @{u}..HEAD` 確認有 ahead 才 push。

---

## 客製規則（mini-taiwan-info 專屬）

### 1. Manifest / SSOT 變動 → typecheck 強制

若這輪改了：
- `themes/*.yaml`
- `data/counties.yaml`
- `docs/04-theme-manifest-spec.md`
- `frontend/src/lib/types.ts`

→ Stage 4 verify 前 **必跑** `cd frontend && pnpm typecheck`，fail 阻止進 commit。

### 2. 跨 3 repo 變動 → 更新 CROSS_REPO.md

若改了 `../gis-platform/` 或 `../taipei-gis-analytics/`：
- 在 mini-taiwan-info `.claude/memory/CROSS_REPO.md` 的 pending 區記下
- commit message 內 reference 跨 repo commit hash
- /wrap-up 收尾時提醒同步 push

### 3. 新 pipeline 入庫 → 觸發 data-catalog-audit

若這輪新增 `../taipei-gis-analytics/pipelines/` 內 pipeline：
- 提示 user 跑 taipei-gis-analytics 的 `/data-catalog-audit` skill
- 確保 docs/data-catalog/ 同步

### 4. agent-browser 截圖驗證硬性要求

任何視覺 / layout / spacing 改動 → Stage 4 必跑 agent-browser screenshot，不只看 typecheck pass 就 declare done（PRINCIPLES）。

### 5. 中文標點空格

寫死字串時：「人均日用水量 · TOP 5」前後有空格（REFLECTIONS Cycle 1 之前學到）。

---

## Cycle template（給 Stage 2 Plan 用）

```markdown
## Cycle N: {一句話 scope}

**Mode**: P / D / V
**預計**: {工時}
**Risk**: {低 / 中 / 高}

### Tasks
- [ ] Na: {子任務}
- [ ] Nb: ...
- [ ] N verify: typecheck + agent-browser screenshot
- [ ] N commit: atomic / 1-pack

### Checkpoint
- [ ] A: apply migration（若 Mode D）
- [ ] B: 視覺化拍板（若 Mode V 或新 KPI）
- [ ] C: commit + push 拍板
```

---

## 注意事項

- **Read first**：每個 Edit 前 Read，避免 old_string 不精確
- **不自動 apply migration**：永遠停在 Checkpoint A 等 user
- **不自動 push**：永遠停在 Checkpoint C 等 user
- **不自動 amend commit**：pre-commit hook fail 後 fix 再開新 commit
- **不污染專案外**：所有 skill / hook / 規則寫在 mini-taiwan-info/.claude/，不寫到 ~/.claude/
- **用 TaskList**：每 cycle 一個任務群，pending/in_progress/completed
- **跨 session 不臆測**：只信本 session 對話 + git log + 截圖證據

---

## Skill 自身演進

每次 `/water-loop` 跑完，回到 REFLECTIONS 記：
- 哪個 stage 卡住？
- 哪個 checkpoint user 改主意？
- discovery agent 漏抓了什麼？
- push 遇到新 fallback 場景？

回頭修本 SKILL.md（加新 fallback / 修流程）→ 下次 cycle 套新規則。

**Cycle 1 已沉澱進本 SKILL.md 的學習**：
- ✅ Discovery agent 並行 3 個（screenshot / 資料候選 / gap 分析）
- ✅ Fetch 時序假象偵測（headless 截圖前 wait + value 非 ━ 再截）
- ✅ Atomic commit 拆 hunk 用 git restore + redo Edit（比 git add -p 穩）
- ✅ Secret scanning push 擋 → git filter-repo --replace-text fallback
- ✅ 三個 repo 同步順序（taipei-gis 直接 push / gis-platform rebase / mini-taiwan-info 注意 secret）
