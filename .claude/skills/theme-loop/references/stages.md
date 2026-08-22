# 5 階段完整 SOP

> /theme-loop SKILL.md 的詳細展開。SKILL.md 是骨架，本檔是肉。

## 線性 11 步檢核表（開新 view / theme / KPI）

> 線性 11 步檢核表——配合 SKILL.md 的 Mode 矩陣（P/D/V/S）使用；來源：專案 CLAUDE.md 2026-07 遷入。
> 每步附 verify：先定義可驗證的完成條件再動手，做完逐步勾。

```
1. 改 themes/{theme}.yaml        → verify: yaml lint 過 + manifest schema 符合
2. 改 docs/themes/{theme}.md     → verify:（可選詳規，無 verify）
3. 確認 schema 已 expose         → verify: /check-schema-exposed 不報錯
4. 改 gis-platform/migrations/  → verify: supabase db push + select pg_get_function_result 簽名對
5. 改 frontend/src/lib/queries/  → verify: dev server fetch 200 + 回值 shape 符合 yaml
6. 改 frontend/src/hooks/        → verify: 在 view 內 console.log 看 data 非 undefined
7. 改 components/views/          → verify: 畫面有渲染、loading state 正常
8. pnpm typecheck                → verify: 0 error（PostToolUse hook 已自動跑）
9. agent-browser 截圖驗證        → verify: 4 寬度（>1500/1100-1500/900-1100/<900）皆不爆版
10. codex review                 → verify: 0 critical bug
11. atomic commit                → verify: feat(scope): xxx + secret scanning 過
```

---

## Stage 1: Discovery（自動，並行 4 agent）

### 並行 4 個 Task agent — 標準 prompts

```
Agent A (Screenshot multi-viewport, general-purpose subagent):
"用 agent-browser 截 mini-taiwan-info ViewA 焦點 {theme} 主題 4 寬度：1920/1280/1100/800。
從 http://localhost:5174/ 開始，切到 {theme} 主題後等 4 秒（避免 fetch 時序假象），
逐個寬度 eval window.resizeTo(W, 900) → screenshot 到 /tmp/disco-shots-N/wW.png。
回報：每寬度看到什麼破版 / 文字截斷 / 響應式洞 + 整體可改進 top 3。"

Agent B (Data candidates, Explore subagent):
"對齊 themes/{theme}.yaml + gis-platform/migrations/ 看哪些 KPI 已 wrapper 但 frontend 沒接，
+ taipei-gis-analytics/pipelines/{theme}/ 看哪些資料端 ETL 已寫但沒 run。
列 Tier S/A 候選 5 個 + 各預估工期。"

Agent C (Gap analysis, Explore subagent):
"列三類 gap：
1. {theme} manifest 列了但 UI 用 mock 的 KPI（grep coverage_note 標 待ETL）
2. Supabase 有資料但 UI 沒接的（schema-drift-auditor agent 邏輯）
3. UI 視覺化方式不適合資料形狀的（如 KPI 該換 sparkline / donut 該換 bar）。"

Agent D (Schema pre-check, Explore subagent):
"列當前 frontend/src/lib/queries/{theme}.ts 用的 RPC + table，
比對 gis-platform/migrations/ 是否有對應 wrapper。
若 {theme} 用非 public schema → 提示呼叫 /check-schema-exposed。
列 wrapper 簽名 drift（用 pg_get_function_result 對比）。"
```

### 並行同一訊息發

```
Task A + Task B + Task C + Task D 一次發 4 個 Agent tool call。
等四個回再彙整成 Discovery 報告。
```

### 防 fetch 時序假象（Cycle 1 學到）

agent-browser headless 截圖時 SPA 可能還沒 hydrate：
- KPI 顯示 `━`、`---` 或 stat=0 但理論應有值 → 不立即下結論「真的 0」
- 應再 wait 3500ms + 重截一張，或用 eval 看 `.kpi-card .kpi-value` text 非 `━` 才當有效樣本
- 不確定就拉用戶實機驗證

### Discovery 報告格式

```markdown
## Discovery 報告 — {theme} cycle {N}

### A. 視覺問題（多寬度）
- 1920px: ...
- 1280px: ...
- 1100px: KPI cols-4 「主因」label 截斷 / 「8.4 億」trend 文字 overflow
- 800px: 區塊 4 timeline 列截斷

### B. 資料候選（Tier S/A）
1. {KPI 名}：{ETL 狀態}，{工期估}
2. ...

### C. 三類 gap
- 待 ETL（manifest 標 placeholder）：{N} 項列清單
- 已有資料但沒接：{M} 項
- 視覺化不對：{K} 項

### D. Schema 預檢
- {theme} 用 schema：{xxx}
- Wrapper coverage：{X}/{Y} RPC 已 wrapper
- Drift：{rotten N / orphan M / sig_mismatch K}
```

---

## Stage 2: Plan（Checkpoint 0）

### AskUserQuestion 三題

依 Discovery 報告，列：

```
1. 「這輪做什麼？」候選列表（含 Mode）：
   A. P 純前端 fix — 修響應式 KPI cols-4 + 表格欄擠（30 min）
   B. S mock-swap — 把 fire S1 縣市排名表 mock 換真實（1 hr）
   C. D 資料整合 — 跑 MOI 5 表 ETL 解 S1 財損 + 起火處所（3-4 天）
   D. V 視覺重做 — S3 散布圖換 bubble chart（45 min）

2. 「資料缺口處置」（每項分 🟢🟡🔴）：
   🟢 響應式 bug（純前端） → 本 cycle 解
   🟡 MOI 5 表 ETL（B1 pipeline 已寫） → 本 cycle 兼跑？(3-4 天)
   🔴 衛福部急救醫院（B2 catalog 缺） → 寫 BACKLOG 等手爬

3. 「自動化程度」：
   - 半自動 4 checkpoint（預設）
   - 監督模式每階段停
   - zero-touch 純前端（僅 Mode P）
```

### 建立 TaskList

User 拍板後立刻建任務群：
- `cycle Na`: 主任務 1
- `cycle Nb`: 主任務 2
- `cycle N verify`: typecheck + multi-viewport screenshot + codex
- `cycle N commit`: atomic split + push

---

## Stage 3: Execute（依 Mode）

### Mode P (Pure-frontend fix)

```
1. Read 涉及檔（每個 ≤ 2000 line，多檔並行 Read）
2. Edit / Write 改檔
3. PostToolUse hook 自動跑 typecheck（settings.json 已設）
4. typecheck pass → Stage 4
5. typecheck fail → 修
```

### Mode D (Data-integration) — 完整流程

#### Checkpoint A0: Freshness / LIVE 判定（資料整合必跑）

每接新資料集，先判 freshness 級別 + 與 user 討論是否加進 collector cron。

| 上游性質 | freshness 級別 | UI 標示 | collector 動作 |
|---|---|---|---|
| Realtime API（如雨量 / 蓄水率）| 即時 | 🟢 LIVE | **必跟 user 討論加 cron** |
| 日 / 週度更新 | 日 | 「資料時間 YYYY-MM-DD」 | 可選加 cron |
| 月 / 季度採樣（如水質）| 月 | 「資料時間 YYYY-MM-DD」 | 一次性 backfill |
| 年度報告（如 LPCD / fire 13764）| 年 | 「資料時間 民YYY」 | 一次性 backfill |
| 半年以上未更新 | 已停 | 「資料時間 YYYY-MM-DD（已停採）」 | 不加 cron |

**LIVE 嚴格定義**：collector 設 cron 自動持續抓 + 上游有 realtime / 高頻 update。**不是「DB 真資料」就叫 LIVE**（PRINCIPLES）。

Cycle Discovery 階段必做：
```sql
SELECT MAX(sampled_at) AS latest, AGE(NOW(), MAX(sampled_at)) AS staleness
FROM public.{new_table};
```

#### Checkpoint A: Schema 預檢 + Wrapper migration + apply

**先呼叫 `/check-schema-exposed`** 確認 schema 是否 expose：
- 若 public schema → 跳過 wrapper，直接寫 migration
- 若非 public schema → **必寫 wrapper migration**，呼叫 `/scaffold-rpc-wrapper`

**Wrapper migration 寫完 + dry-run + 給 user 看**：
```bash
psql "$DATABASE_URL" -f migrations/{N}_{schema}_public_wrappers.sql --single-transaction
# 期望看到 BEGIN / CREATE / GRANT / COMMENT / COMMIT 一連串
# 任何 ERROR → 99% 是 RPC 簽名抄錯
```

**Checkpoint A 給 user 看四件**：
- Sample rows (5-10 列)
- Wrapper migration SQL（diff）
- 預期影響表名 + 列數估算
- Freshness 級別判定 + UI 標示策略

User 拍板才 apply。

#### Step 3-1 ~ 3-7: 主流程

```
1. 確認 pipeline 存在於 ../taipei-gis-analytics/pipelines/{theme}/
2. dry-run pipeline：
   python3 pipelines/{theme}/{pipeline}.py --dry-run --limit 10
3. 寫 migration（若 schema 非 public，已 Checkpoint A wrapper）
4. Apply migration → 跑 pipeline --full
5. 寫 frontend：query → hook → component
   - LIVE badge 只在真 cron 持續抓的資料用
   - 其他用 <DataAgeBadge sampled_at={...} />
6. PostToolUse hook 自動 typecheck
7. 寫第一個 query 後 dev server fetch 驗（防 PostgREST Invalid schema）
```

### Mode V (Visual rework)

```
1. 同 Mode P 改 .tsx
2. 先在 BACKLOG 留底「重做前長什麼樣」（含 screenshot link）
3. 改後 Checkpoint B 必比對 before/after 4 寬度
```

### Mode S (Mock-swap, fire 後新增)

```
1. 找 mock-{theme}.ts 對應的 placeholder field
2. 寫 query function（lib/queries/{theme}.ts append）
3. 寫 hook 或擴 existing hook（hooks/use{Theme}Data.ts append）
4. 改 component import：mock → real
5. 留 mock 不刪（fallback / 緊急回退）
6. UI 上 「待ETL」label 拿掉
7. PostToolUse hook 自動 typecheck
```

---

## Stage 4: Verify（Checkpoint B：三閘）

並行跑：

1. **typecheck** final confirm（PostToolUse hook 已先跑）
2. **multi-viewport screenshot** — 詳見 `references/multi-viewport-screenshot.md`
3. **codex review** — 派 codex:rescue background：
   ```
   subagent_type: "codex:codex-rescue"
   prompt: "Review {N} files modified in cycle {X}: {file list}. Check:
     (1) supabase RPC alignment vs migrations
     (2) TS type safety
     (3) mock data labeling clarity
     (4) accessibility
     (5) design fidelity per SPEC.
     Report critical / improvement / confirmed correct. Max 400 words."
   run_in_background: true
   ```

收到回報後分類：
- **Critical** → 退回 Stage 3 修
- **Improvement** → 加進 BACKLOG（P2）
- **Confirmed correct** → 紀錄到本 cycle commit message 內

---

## Stage 5: Commit / Push

### Checkpoint C: commit 顆粒度

`AskUserQuestion`：
1. N 個 atomic commit（推薦，分 feat/fix/docs prefix）
2. 1 個包裝 commit（懶人用）
3. 不 commit 留 worktree

執行（用 `git restore + redo Edit per commit` 拆 hunk，Cycle 1 學到比 git add -p 穩）。

### Checkpoint D: 跨 3 repo push 策略

**先呼叫 `/cross-repo-status`** 看三 repo divergence。

`AskUserQuestion`：
- 不 push（保守）
- push 本 repo only
- 3 repo 全 push（推薦，若都 ahead）

執行依 push fallback（`references/push-fallbacks.md`）：
- behind > 0 → `git pull --rebase` 先
- secret scanning 擋 → filter-repo flow
- branch protection → 改 PR

### 收尾提示

push 完跳 `AskUserQuestion`：
- 跑 `/wrap-up` 嗎？（推薦 — 更新 memory + CROSS_REPO）
- 跑 `schema-drift-auditor` agent 確認沒漏接 wrapper 嗎？

---

## 各 Mode 統整對照

| Mode | Stage 3 主任務 | Checkpoint A0 | Checkpoint A | typical 工期 |
|---|---|---|---|---|
| P 純前端 fix | Read + Edit + typecheck | ❌ skip | ❌ skip | < 1 hr |
| S Mock-swap | swap query + hook + UI label | ❌ skip | ❌ skip | 30 min - 2 hr |
| D 資料整合 | wrapper + pipeline + frontend | ✅ freshness 判定 | ✅ schema 預檢 + apply | 1 天 - 1 週 |
| V 視覺重做 | 重寫 component + CSS | ❌ skip | ❌ skip | 30 min - 1 天 |

## 何時更新本檔

- 撞到新 Mode（如 M = Migration-only / R = Refactor）→ 加 Mode 章節
- Stage 3 流程改變（如加新 sub-step）→ 對應 Mode 更新
- Checkpoint 數量或順序變 → 全面對齊 SKILL.md
- 並行 agent 數從 4 → 5/6（如加 perf-audit agent）→ Stage 1 更新
