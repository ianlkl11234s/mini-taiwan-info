# runs/ — 每次執行的清單 + 進度（執行佇列專區）

> user 一次列出一批要做的事 → 一個 run 檔。Claude 照它逐項執行、即時勾選、結果回填。
> 這裡放「**這一批要做什麼 + 做到哪**」；方法論看 `../guidelines/`、長期記憶看 `../memory/`、每個 session 細節看 `../board/`、總結看 `../WAVE_REPORT.md`。

## 檔案命名
`YYYY-MM-DD-<主題>.md`，例：`2026-05-30-audit-fixes.md`、`2026-06-01-socioeconomic.md`

## 一個 run 的生命週期
1. **user 或 Claude 列清單** → 建 `runs/<date>-<topic>.md`（用 `_TEMPLATE.md`）
2. **Claude 逐項執行**：每項標執行方式（純前端 / spawn ETL session / SSOT / 響應式…）+ 即時更新狀態欄
3. **結果回填**：每項做完填 commit hash / board 檔連結；卡住標 🔴 + 原因
4. **收尾**：整批做完，摘要寫進 `../WAVE_REPORT.md` + 必要的進 `../memory/`

## 狀態圖示
⬜ 待跑 ｜ 🟡 進行中 ｜ ✅ 完成 ｜ 🔴 卡住(記原因) ｜ ⏸ 等 user 拍板

## 與其他檔的關係
| 檔 | 角色 |
|---|---|
| `runs/<date>.md` | **這一批的清單 + 即時進度**（你列、我執行、勾選）|
| `../SESSION_BOARD.md` | 跨 session 即時看板（多 spawn session 並行時的總狀態）|
| `../board/<session>.md` | 單一 spawn session 的詳細執行報告 |
| `../WAVE_REPORT.md` | 跨多批的「做了什麼」總結（給人看歷史）|
| `../memory/BACKLOG.md` | 還沒排進 run 的待辦池 |

## 慣例
- run 檔**保留**（不像 tmp 拋棄）→ 可回顧某批做了什麼、怎麼分流的。
- 大批量執行（你說的「一次列很多」）→ Claude 會自動分類每項該用哪種執行方式 + 排序（純前端/SSOT 先、ETL 序列化避免 migration 撞號、響應式最後），並照 spawn 工作流（PB-19）跑。
