# 資料缺口處置決策樹

> Stage 2 Plan 用。Discovery 列出的 missing data 每一項都跑這棵樹判斷。

## 為什麼需要

Session 5 fire 主題 4 個區塊 12 個 KPI，只有 3 個能接真實，9 個是 placeholder。沒有清楚的處置標準 → user 容易誤以為「都跑通了」。

決策樹的目的：把每個 missing data 分流到正確的處置軌道，不混淆。

## 三個處置軌道

```
                    Discovery 列出 missing data X
                              │
                              ▼
                ┌────────────── X 是什麼類型 ──────────────┐
                │                                          │
        ┌───────┴──────┐                          ┌────────┴───────┐
        │ A. 純前端能解 │                          │ B. 缺資料     │
        └───────┬──────┘                          └────────┬───────┘
                │                                          │
                ▼                                          ▼
        本 cycle 做完                  ┌────── B 的子分類 ──────┐
                                       │                        │
                            ┌──────────┴──────────┐  ┌─────────┴────────┐
                            │ B1. pipeline 已存在  │  │ B2. pipeline 不存在│
                            │  （只是沒 run / 沒上 │  │  （catalog 沒這個 │
                            │   Supabase）        │  │   datagov / 無公開 │
                            └──────────┬──────────┘  │   資料）          │
                                       │             └─────────┬────────┘
                                       ▼                       │
                          AskUserQuestion：                    ▼
                          「要不要本 cycle 兼跑？」      寫進 BACKLOG
                          - 是 → 走 Mode D                 標等 ETL / 等資料端
                          - 否 → 寫 BACKLOG               不阻塞本 cycle
```

## 三類定義 + 範例

### A. 純前端能解（本 cycle 處理）

**判斷**：資料已在 Supabase / 已有 RPC / 已有 wrapper，只是前端沒接 / 視覺化不對。

範例：
- ✅ `fire.incidents_by_county_year` MV 已建 + 已 wrapper，但 ViewA 縣市排名表還用 mock → 前端 swap query 即可
- ✅ `water.reservoir_status_latest` RPC 已用，但「警戒水庫數」KPI 仍顯 hardcoded → 前端改用 RPC count
- ✅ KPI 響應式破版 → 純 CSS

**處置**：走 Mode P / Mode S（mock-swap），本 cycle 解完。

### B1. Pipeline 已存在但沒 run / 沒上 Supabase

**判斷**：`taipei-gis-analytics/pipelines/` 已有對應 .py 檔，但沒灌進 Supabase（或灌的版本舊）。

範例：
- 🟡 fire `12_upload_to_supabase.py` 已寫但沒跑（fire.incidents 仍空）→ Session 5 跑了
- 🟡 water A2 pipeline `03_load_water_quality.py` 已 commit 但沒 run epa_river endpoint
- 🟡 LPCD pipeline 已寫但只灌到 110 年，113 年沒補

**處置 1**（推薦）：AskUserQuestion：「本 cycle 兼跑 pipeline 嗎？預計 X 分鐘 / X 個 RPC quota」
- Yes → 走 Mode D，本 cycle 內跑 dry-run → full → 驗證 → 接前端
- No → 寫 BACKLOG，前端先 placeholder

**處置 2**：若 pipeline 跑很慢（小時級）/ 吃 API quota → 預設 No，寫 BACKLOG，user 自己抽空跑。

### B2. Pipeline 不存在（catalog 無 datagov / 無公開資料）

**判斷**：對應資料 catalog 找不到，需要新 pipeline / 新資料源 / 手爬。

範例：
- 🔴 fire S2 消防分隊（15 縣市無公開座標，靠 user 蒐集 374 筆名冊 + Google geocoding）
- 🔴 fire S2 消防栓（全台只 4 都有，其他 18 縣市永遠不可能）
- 🔴 衛福部全國急救醫院（catalog 沒統一條目，需手爬 mohw 網站）
- 🔴 fire S3 PostGIS 衍生表（依賴 S2 完成後才能算 service_coverage）

**處置**：寫 BACKLOG（P1-P3 看重要性），標等 Sprint X / 等手爬 / 永遠 4 都 only。
- 前端走 mock placeholder + `coverage_note` 標清楚
- 不阻塞本 cycle

## BACKLOG 寫入慣例

新增條目格式（對齊 `.claude/memory/BACKLOG.md` 既有）：

```markdown
| B0XX | P1 | {theme}-{section} placeholder swap | 待開工 | {KPI 名} → 等 taipei-gis {pipeline 名} ETL（Sprint X TODO-N），{工期估} |
```

要點：
- 編號連續（看現有最大 +1）
- 優先級：P0 阻塞 / P1 影響核心敘事 / P2 補強 / P3 nice-to-have
- 備註必寫 blocker + 預期工期

## Decision flag（在 AskUserQuestion 內用）

每個 missing data 給 user 看時，加 emoji prefix：
- 🟢 A 類：本 cycle 解
- 🟡 B1 類：本 cycle 可選兼跑（標工期 / quota）
- 🔴 B2 類：寫 BACKLOG 等 ETL，本 cycle 走 placeholder

User 用 emoji 判斷不用解釋。

## 反模式

- ❌ **silently mock**：不告知 user 就用 mock，看似跑通實際沒接
- ❌ **看到 missing 立刻補 ETL**：B2 類在本 cycle 處理會炸 scope
- ❌ **不寫 BACKLOG**：下次 session 接手不知道哪些是真正缺資料 vs 純前端忘接
- ❌ **A 類也 placeholder**：能接卻不接，浪費真實資料

## 何時更新本檔

- 撞到新的處置類型（如 C. 資料在但 RLS 擋）→ 加新分流
- BACKLOG 編號跳號規則改變 → 更新慣例
- 新增 priority tier（P-1 immediate）→ 同上
