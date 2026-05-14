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

**無**。三個 repo 全部已 push origin（Session 3，2026-05-14）：

- mini-taiwan-info: 27 commits → origin/main（含 history rewrite force push 後）
- gis-platform: pull --rebase 後 8 local commits 接在 origin 3 auto-sync 之上 → push 成功
- taipei-gis-analytics: 0 改動，本 session 沒動 pipelines

---

## 已完成（紀錄性，最多保留 5 筆）

| 日期 | Repo | 動作 | Commit |
|---|---|---|---|
| 2026-05-14 | mini-taiwan-info | feat(skill) /water-loop SOP | bf99dfc |
| 2026-05-14 | mini-taiwan-info | chore(secrets) Mapbox placeholder + filter-repo | 05f7e80 |
| 2026-05-14 | mini-taiwan-info | fix(view-a) 3 P0 (explode 22 / drill / headline) | 5a79d54 / a5f20a1 / 5075b87 |
| 2026-05-14 | gis-platform | rebase 8 local 在 origin/main 3 auto-sync 之上 + push | 3d8e522（tip） |
| 2026-05-14 | mini-taiwan-info | git remote add + force push 初次設定 | — |

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
