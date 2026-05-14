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

無。本 session（2026-05-14）所有跨 repo 變動已 atomic commit：

- gis-platform: 4 commits ahead of origin/main（093/094/095/096 migrations）— **尚未 push**
- taipei-gis-analytics: 2 commits ahead of origin/master（datagov 8316 / 26815 pipelines）— **尚未 push**
- mini-taiwan-info: 21+ commits ahead of origin/main — **尚未 push**

下次 session 開始前，user 可 push 三個 repo 確認 GitHub 同步。

---

## 已完成（紀錄性，最多保留 5 筆）

| 日期 | Repo | 動作 | Commit |
|---|---|---|---|
| 2026-05-14 | gis-platform | 096 flood MV + RPC | d6ad160 |
| 2026-05-14 | gis-platform | 095 sewage_coverage_yearly | e457a7a |
| 2026-05-14 | gis-platform | 094 water_usage_yearly | 63ca7fb |
| 2026-05-14 | gis-platform | 093 reference.counties | 26d8105 |
| 2026-05-14 | taipei-gis-analytics | datagov_26815 sewage pipeline | 13535f5 |
| 2026-05-14 | taipei-gis-analytics | datagov_8316 LPCD pipeline | 1ab1fb9 |

---

## 同步規則（避免漏同步）

1. **改 gis-platform/migrations/** → 同 session 內 apply + 寫成功狀態到 STATUS
2. **改 taipei-gis-analytics/pipelines/** → 同 session 內 dry-run 至少一次 + 紀錄統計到 STATUS
3. **改 frontend/src/lib/queries/** 引用新 RPC → 確認對應 gis-platform migration 已 apply
4. **改 themes/*.yaml** 加新 data_sources → 確認對應 taipei-gis-analytics pipeline 已存在或加入 BACKLOG
5. **新 pipeline 入庫** → 跑 audit（taipei-gis-analytics/.claude/skills/data-catalog-audit）

## 跨 repo 未同步陷阱（INCIDENTS 來源）

- **2026-05-14**: LPCD pipeline 改了 `get_max_year_in_db` 邏輯（修空表誤判 bug），但 sewage pipeline 沒同樣寫法，幸好沒中招。教訓：寫 ETL helper 時抽出 shared/ 模組。記在 INCIDENTS。
