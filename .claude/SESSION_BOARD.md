# SESSION BOARD — mini-taiwan-info 上架前資料真實化（live 跨 session 進度）

> 主 agent（control plane @ mini-taiwan-info）維護此總表。
> 各 spawn session（execution @ taipei-gis-analytics）寫 `.claude/board/<name>.md`，主 agent 彙整於此。
> 規則見 `.claude/board/README.md`。目標：全主題去 mock / 接真實，可上架。

最後更新：2026-05-29（Wave 0 進行中）

## 全局計畫（細節 → `.claude/tmp/evening_plan.md`）

| Wave | 內容 | 執行者 | 並行/序列 |
|---|---|---|---|
| 0 | demographics expose + 村里數 + 鄉鎮排名 | session `recon_demog` | 進行中 |
| 1 | rail+maritime schema expose（純設定）/ 前端接線(漁權·燈塔·rail縣市車次·老化歷年) | session + 主 agent | 並行 |
| 2 | fire/maritime/water/rail ETL 建表（寫 migration） | 序列 spawn | **序列**(避免 migration 撞號) |
| 3 | 前端接 query/hook/view + 去 mock + SSOT 口徑標註 | 主 agent | — |
| 4 | typecheck + 多寬度截圖 + codex review + atomic commit | 主 agent | — |

## ⚠️ 稽核修正（主 agent 對 gis-platform 驗證，推翻稽核 agent 過度宣稱）

- ❌ maritime 漁權/燈塔**並非**「只差接線」：`fishery_rights`/`lighthouse` 表**不存在**（migrations 只有 ports/port_traffic_yearly/fishery_stats_by_county）→ 改歸 Wave 2 ETL。前端註解本來就對。
- ✅ rail.station_daily_trips(mig123)/ridership_by_station(mig119) 表**存在**，卡 rail schema 未 expose → Wave 1 expose 後即可接線。
- 教訓：**稽核 Explore agent 的「表已存在」claim 不可信**，建表類一律對 gis-platform/migrations grep 驗證。

## migration 編號協調（避免並行撞號）

- recon_demog 已用到 **126**(township_village_count)+**127**(township_monthly)。
- 後續 session 開工前主 agent 指派區段：fire=128-129 / maritime=130-133(含漁權/燈塔建表) / water=134-135 / rail=136。

## 各 session 狀態（全部完成，詳見 WAVE_REPORT.md）

| session | 任務 | 狀態 |
|---|---|---|
| recon_demog | demographics 鄉鎮/村里 + 排名 | ✅ 295a546/cfc5730 |
| front_demographics | 接金字塔/村里/鄉鎮排名 | ✅ 17ffd76 |
| front_rail | 接縣市別車次 | ✅ bf4b73b |
| front_ssot | 口徑標註+老化unit | ✅ 45f9198 |
| etl_fire | 財損+起火處所(修2bug) | ✅ 7980ea3/068655a |
| etl_maritime | 燈塔+漁權+港埠 | ✅ 7d7d4a9/27b7270 |
| etl_water | LPCD+接管率 RPC | ✅ c8aeb41/45f5c88 |

**整夜 7/7 完成 0 卡關。早上看 `.claude/WAVE_REPORT.md` 總結 + 待辦 + 待 push。**

## 執行決策（user 2026-05-29 拍板）

- **模式**：自動跨 wave，只在 (a) session 回報需 user 手動步驟 (b) 🔴 卡住 (c) 最終 push 時停。
- **socioeconomic**：今晚不碰，另開計畫（寫 BACKLOG）。
- **並行上限**：最多 2-3 session。
- **commit**：每波過 typecheck+截圖 → atomic commit（跨 3 repo），**不 push**；最後 user 統一 review 再 push。

## Gate / 待 user 拍板

- 最終 push（全部做完彙整待 commit 清單）。
- 任何 session 回報「需 Supabase Dashboard 手動 expose」時。

## 待 commit 清單（彙總，最後 user 拍板才 commit/push）

- _(待各 session 回報)_
