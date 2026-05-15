# CROSS_REPO — GIS 三部曲跨 repo 同步矩陣

> 每次 session 改了其他 repo（`../gis-platform/` / `../taipei-gis-analytics/`），記在 pending 區。
> 同步完成（已 commit 到對應 repo）就移除（不保留歷史，交 git log）。

---

## GIS 三部曲關係

```
mini-taiwan-info（本專案）
   ↓ 引用 / 接資料
gis-platform（DB schema、migrations、RPC）
   ↑ pipeline 寫入
taipei-gis-analytics（ETL pipelines、data-catalog）
```

| Repo | 路徑 | 我會改它什麼 |
|---|---|---|
| **mini-taiwan-info** | `.` | frontend / docs / themes / data / designs |
| **gis-platform** | `../gis-platform/` | `migrations/0XX_*.sql`（從不改既有 migration） |
| **taipei-gis-analytics** | `../taipei-gis-analytics/` | `pipelines/{theme}/*.py`、`docs/data-registry.yaml` |

---

## Pending 同步（未 commit 到對應 repo 或未 push）

**Session 5（2026-05-15 fire 主題 ViewA Phase 1）三 repo 都 ahead origin 未 push**：

- **mini-taiwan-info**: **15+ commits ahead** origin/main
  - Session 4 殘留：7 commits (558f77c..d96f69e + 4 docs)
  - Session 5 新增 fire：8 commits (9dfd144..b1941a1)
  - Session 5 css fix：3 commits (29de112 + e3bd381 + b1941a1)
  - 本次 wrap-up: 6+ memory commits
- **gis-platform**: **2 commits ahead** origin/main
  - 995efec migration 097（S4 殘留）
  - 93d825f migration 104 fire public wrappers（S5）
- **taipei-gis-analytics**: **2 commits ahead** origin/master
  - 88353ae A2 pipeline（S4 殘留，未 run）
  - 5c7f061 12_upload_to_supabase.py（S5，已 run 48,626 筆進 DB）

**A2 pipeline 仍未 run**：taipei-gis 88353ae，~1-2 小時 / 約 30k reading（待 user 拍板）

**TODO-2 batch_003 未上傳**：taipei-gis fire batch_003 在 2026-04-28 已產出但 user 還沒手動上傳 TGOS web（1-3 天回應期）

---

## 已完成（紀錄性，最多保留 5 筆）

| 日期 | Repo | 動作 | Commit |
|---|---|---|---|
| 2026-05-15 (S5) | mini-taiwan-info | feat(fire-frontend) ViewA Phase 1 — 8 commits | 9dfd144..b1941a1 |
| 2026-05-15 (S5) | gis-platform | feat(fire-schema) migration 104 public wrappers | 93d825f |
| 2026-05-15 (S5) | taipei-gis-analytics | feat(fire-etl) 12_upload_to_supabase.py | 5c7f061（48,626 筆 fire.incidents + 4 MV refresh）|
| 2026-05-14 (S4) | mini-taiwan-info | feat(view-b) Cycle B IA 重組 7 tabs | d96f69e + 462feac |
| 2026-05-14 (S4) | mini-taiwan-info | fix(view-b) DataAgeBadge + LIVE 用詞 patch | 1864a61 + 84c417c + 47d61e4 |
| 2026-05-14 (S4) | mini-taiwan-info | feat(view-b) Cycle A 水質 tab 接通真實資料 | 95bc30e |
| 2026-05-14 (S4) | mini-taiwan-info | memory: LIVE badge 嚴格定義 + 用詞嚴守 | ac44c72 + 84c417c |
| 2026-05-14 (S4) | gis-platform | feat(migration) 097 water_quality RPCs | 995efec |
| 2026-05-14 (S4) | taipei-gis | feat(pipeline) 03_load_water_quality 加 wqx_p_01 | 88353ae |
| 2026-05-14 (S3) | mini-taiwan-info | feat(skill) /water-loop SOP | bf99dfc（filter-repo 後 hash 已改）|

---

## 同步規則（避免漏同步）

1. **改 gis-platform/migrations/** → 同 session 內 apply + 寫成功狀態到 STATUS
2. **改 taipei-gis-analytics/pipelines/** → 同 session 內 dry-run 至少一次 + 紀錄統計到 STATUS
3. **改 frontend/src/lib/queries/** 引用新 RPC → 確認對應 gis-platform migration 已 apply
4. **改 themes/*.yaml** 加新 data_sources → 確認對應 taipei-gis-analytics pipeline 已存在或加入 BACKLOG
5. **新 pipeline 入庫** → 跑 audit（taipei-gis-analytics/.claude/skills/data-catalog-audit）

## 跨 repo 未同步陷阱（INCIDENTS 來源）

- **2026-05-14**: LPCD pipeline 改了 `get_max_year_in_db` 邏輯（修空表誤判 bug），但 sewage pipeline 沒同樣寫法，幸好沒中招。教訓：寫 ETL helper 時抽出 shared/ 模組。記在 INCIDENTS。
- **2026-05-14（Session 3）**: mini-taiwan-info 首次 push 被 GitHub secret scanning 擋 — Mapbox token 在 `designs/v02-claude-design-2026-05-14/` 內。歷史 27 commits 走 `git filter-repo --replace-text` rewrite + force push。教訓：commit 前 grep secret pattern；prototype/mockup 內絕對不放真實 token。記在 INCIDENTS + PB-07。
- **2026-05-14（Session 3）**: gis-platform local 8 commits ahead，但 origin/main 也有 3 個 user 在其他 session 跑的 auto-sync commits → push 被擋。`git pull --rebase` 解決。教訓：跨 session 改 gis-platform 前先 fetch + 看 divergence。詳見 PB-09。
- **2026-05-14（Session 4）**: data-collectors/ 是另一個 sibling repo（path /GIS/data-collectors/），部署在 Zeabur 自動跑 cron。 Session 4 跑 collector dataset audit 才知道有這個 repo（user 提示）。教訓：跨 4 repo 不只 3，data-collectors 也算 GIS 部曲。下次水質 / 即時資料整合若要加 cron，要去這個 repo 加 collector + 部署。
