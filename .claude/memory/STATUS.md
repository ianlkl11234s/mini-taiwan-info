# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-16（Session 8 結束 · water ViewA 6 章敘事重寫完成）

---

## 一句話現況

Water 主題 ViewA 從「manifest-driven 6 KPI grid」整個重寫成「6 章敘事結構」（現況/儲存/水情燈號/處理/使用/災防），design bundle handoff 第 2 次跑（fire S5 + water S8）成功抽 PB-13。8 新檔 + 2 改檔 + 568 行 CSS verbatim 移植 + 16 fetch Promise.allSettled hook，**~28/33 元素接通真實 Supabase**（migration 098-102 在 5/15 已 apply）。Codex 抓 1 BLOCKER + 1 HIGH 修，截圖 agent 抓 2 P0 schema 欄名錯（規劃 doc vs 實際 schema 不同步）修。5 atomic commit 本地保留不 push。下個 session 候選：B041 MOI ETL / B054 響應式修補 / 開新主題。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5173

### View A
- **water 主題（NEW S8）**：**6 章敘事結構**
  - 章 1 現況：6 stat tile（37 / 26 / 2041km / 116 / 2449 / 1309 全真實）
  - 章 2 儲存：4 區容量加權 bar + 5 大水庫排行 + 24hr 雨量 KPI + 警戒水庫數 + PointProfile 40 水庫
  - 章 3 水情燈號：4 級當前燈號 + 過去 5 年 timeline placeholder（collector 累積中）
  - 章 4 處理：A→B→C→D flow（17 淨水場 / 68k km 管線 / 786 萬戶 / 82 汙水廠）+ 最新月供水 2.67 億 m³ + 接管率
  - 章 5 使用：LPCD 273L + 17 年趨勢 + 用水結構 mock（DB 無 sector）+ 漏水率 + TOP/BOTTOM 5
  - 章 6 災防：淹水（200/350/500mm，只 350 接通）+ 河川警戒 lv1/2/3 split + 雨量警報 + 滯洪池（5 縣市 + 3 園區）+ 地層下陷描述行
- **fire 主題**：4 區塊 + heatmap + 分隊 dot + 無染色灰底 + 5 點位 toggle + B047 KPI 爆炸

### View B
- **water 主題**：IA v2 7 tabs（概覽 / 水庫 / 河川 / 地下水 / 防洪 / 用水與配送 / 排名）— 不動，本 cycle 範圍只 ViewA
- **fire 主題**：Hero + FireRadarCard 5 軸 vs 全國 + 5 tabs

### View C
- 水庫詳情頁 4 stat + 1 年 trend（fire 未支援）

## Water 主題真實 vs Mock 對映（給下個 session 看）

| 元件 | 資料來源 | Real / Mock |
|---|---|---|
| 章 1 6 stat tile | water_facts_official + COUNT | ✅ 真實 |
| 章 2 4 區加權蓄水率 | reservoirs 前端 weighted avg | ✅ 真實 |
| 章 2 5 大供水水庫 | reservoirs sort by capacity | ✅ 真實 |
| 章 2 24hr 雨量 / 警戒水庫 | get_rain_gauge_latest / aggregateWaterKpis | ✅ 真實 |
| 章 2 PointProfile 40 水庫 | water_reservoirs_with_status | ✅ 真實 |
| 章 2 vs 歷年同期 | — | 🔶 footnote「對比資料累積中」（B055 缺 wrapper RPC）|
| 章 3 4 級當前燈號 | drought_alert_current | ✅ 真實 |
| 章 3 5 年 timeline | drought_alert_history（薄）| 🔶 placeholder「collector 累積 6 個月後」（B056）|
| 章 4 4-step flow | water_treatment_plants_large + water_pipe_length_yearly + twc_customer_yearly + sewage_treatment_plants COUNT | ✅ 真實 |
| 章 4 月供水量 | twc_supply_system_monthly 2026-03 | ✅ 真實（單月）|
| 章 4 接管率 + trend | sewage_coverage_yearly | ✅ 真實 |
| 章 5 LPCD + 17 年趨勢 | water_usage_yearly + fetchLpcdNationalHistory | ✅ 真實 |
| 章 5 用水結構 | mock + badge「結構估算」| 🔶 DB 無 sector 欄位（B058）|
| 章 5 漏水率 | water_loss_rate_yearly | ✅ 真實 |
| 章 5 ranking TOP/BOTTOM 5 | LPCD 22 縣市 | ✅ 真實 |
| 章 6 淹水 350mm | flood_hazard_pct_by_county | ✅ 真實 |
| 章 6 淹水 200/500mm | — | 🔶 placeholder「待 RPC 擴充」（B057）|
| 章 6 河川警戒 lv1/2/3 split | useRiverWaterLevel + classifyAlertLevel | ✅ 真實 |
| 章 6 雨量警報 ≥50mm/hr | rainStations.precipitation_1hr filter | ✅ 真實 |
| 章 6 滯洪池 | detention_basins GROUP BY county | ✅ 真實 |
| 章 6 地層下陷 | land_subsidence_stations + readings TOP 5 | ✅ 真實 |

## 下一個 session 的合理開頭

讀本檔 + `_CYCLE_water_viewa.md`，挑下面之一：

1. **B041 MOI 5 表 ETL**（Mode D 跨 3 repo，3-4 天）
   - taipei-gis-analytics 寫 `pipelines/environment/fire/07_fetch_moi_stats.py`
   - gis-platform 寫 `migrations/106_fire_moi_stats_tables.sql`（5 張表 + RPC）
   - 解 ViewA / ViewB 火災財損 KPI + 起火處所 placeholder

2. **B054-B058 water ViewA 補完**（1-2 hr 純前端 polish）
   - B054 @800 響應式修（章 2/3/5 加 `@media (max-width: 900px) { 1fr }`）
   - B055 reservoir vs 上月同期 wrapper RPC（1 hr 後端 + 前端接）
   - B057 200/500mm 淹水情境接通（hook 加 2 fetch）

3. **B052 fire KPI 爆炸擴展到其他 3 KPI**（1-2 天純前端，沿 B047 pattern）

4. **開新主題：demographics 或 safety**
   - 沿 PB-10（初次上 production）+ PB-13（design bundle handoff 重寫）SOP

## 跑得起來但還沒接的

- **28+ commits ahead origin/main**（S6 + S7 + S8 + wrap-up memory）— 待 user push
- A2 pipeline 仍未 run（taipei-gis 88353ae，1-2 hr）
- TGOS batch_003 待 user 手動上傳（1-3 天回應期）
- demographics / socioeconomic / home-basics 主題 yaml 仍 v1.0 spec（B003-B005）

## 等用戶執行

- Push mini-taiwan-info（**28+ commits ahead**）
- 拍板下個 cycle 方向（B041 / B054-B058 / B052 / 新主題）
- 上傳 TGOS batch_003

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3
- Supabase project `utcmcikhvxnohbxchbrs` (pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env
- agent-browser 0.10.0 全局
- Dev server: localhost:5173（VITE_DEFAULT_THEME=water 默認進水主題）
- Mapbox dev token 在 .env.local

## 跨 4 repo 狀態（Session 8 結束）

- **mini-taiwan-info**: **28+ commits ahead origin/main**（S6 8 + S7 6 + S8 5 + S8 wrap-up 7+）— 待 push
- **gis-platform**: **2 commits ahead + dirty**（migration 107 / images，其他 session 工作）
- **taipei-gis-analytics**: 6 ahead master + dirty（其他 session 工作）
- **data-collectors**: clean + 1 dirty README（其他 session 工作）

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` 仍 v1.0 spec
- `scripts/regen-counties.ts` 沒寫
- agent-browser headless 沒 WebGL，無法驗證地圖 heatmap / 分隊 dot（要 user 真實瀏覽器驗）
- B048（800×600 stack 缺）/ B049（Donut 圖例溢位）/ B050（KPI 單位緊貼）/ B051（24 column totals overlap）四個響應式/視覺 bug 留 backlog
- B054-B058 water ViewA 新加 5 backlog（@800 響應式 / vs 上月 RPC / timeline / 200·500mm 淹水 / sector 拆解）
- BACKLOG 95 行 58 項接近上限，下次 wrap-up 應清 P3 已完成項

## Skill 狀態

| Skill | 版本 | 跑過幾次 | 待修 |
|---|---|---|---|
| `/theme-loop` | v1.0 | 5（本 session 1 — water S8）| Stage 2 結尾加 Mini-audit 階段；Stage 4 列 codex review 4 類盲區 |
| `/wrap-up` | v1.1 | 8（含本次）| Stage 2 事件分類表已加「規劃 doc vs 實際 schema 不同步」類別 |
| `/cross-repo-status` | v1.0 | 2（本 session 0 — Stage 5 手動 git rev-list）| 在 wrap-up Stage 1 自動派？ |
| `/check-schema-exposed` | v1.0 | 0 | 累積 0 次使用，可能太隱性 |
| `/scaffold-rpc-wrapper` | v1.0 | 0 | 累積 0 次使用，可能太隱性 |

兩個輔助 skill 累積 0 次，下個 cycle 涉及新 schema 時主動派看看效用。

## 本 session 學到的關鍵（看 REFLECTIONS Session 8 完整版）

1. **用戶對自家後端狀態的認知優先於 doc** — user 說「已處理完」我看 doc 過度懷疑，Agent B psql 才證實 user 對的是我
2. **規劃 doc vs 實際 schema 不同步** 是新發現的撞牆 — query 寫前 psql `\d` 30 秒驗
3. **codex review 對 schema mismatch 是盲區**（第 4 類限制 + S7 DOM 事件流 + S6 CSS 缺失 + S8 Promise.all race）— Verify 三閘 → 四閘
4. **Mini-audit 在 Plan 後 / Execute 前**是新發現的中間階段，抓 spec 不能直接做的場景
5. **Per-theme view 已是 confirmed pattern**（fire ✓ water ✓），原 ViewA.tsx 留 fallback 給未做專屬版主題
6. **Promise.allSettled for multi-fetch hook** 必用（codex 抓的 BLOCKER 教訓）
