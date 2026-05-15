# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-15（Session 5 結束 · 消防主題 ViewA Phase 1 上線）

---

## 一句話現況

水主題 Phase 0+ 全部完成（6/6 KPI 接通真實）；**消防主題 ViewA Phase 1 上線**：4 區塊（火災發生 / 火災救災 / 量能交叉 / 其他救護），S1 接通真實 48,626 件 + 5+22 cause + 22 縣市，S2/S3/S4 mock 標待ETL；**三 repo 都 ahead origin 未 push**（mini ~15 / gis 2 / taipei 2）；用戶下個 session 目標：**把 fire mock 都替換成真實**。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5174（5173 被占用自動切 5174）

### View A
- **water 主題**：6 KPI 接通真實資料（蓄水率 / 雨量 / 警戒 / 淹水 / LPCD / 接管率）
- **fire 主題**（NEW）：4 區塊 cat-block 結構
  - S1 火災發生：4 KPI（3 真實 + 1 mock 待ETL）+ 時間長條 4 切片（年/月/日/時）+ 5 維度佔比 + 3 tab 表格（縣市排名 / 5+22 起火原因 / 起火處所 mock）
  - S2 火災救災：2 KPI mock + 4 都消防栓表 mock 待 Sprint 2
  - S3 火災交叉量能：3 KPI mock + 散布圖（x 軸真實 / y 軸 mock）+ 22 縣市量能對照表 mock 待 Sprint 3
  - S4 其他救護：3 KPI mock + 22 縣市救護表 mock + 災變時間軸 mock 待 Sprint 4

### View B
- **water 主題**：IA v2 7 tabs（概覽 / 水庫 / 河川 / 地下水 / 防洪 / 用水與配送 / 排名）
- **fire 主題**：**尚未實作**，user 點縣市目前只在地圖上 highlight（不進 ViewB）

### View C
- 水庫詳情頁 4 stat + 1 年 trend（fire 未支援）

## Fire 主題真實 vs Mock 對映（給下個 session 看）

| 元件 | 資料來源 | Real / Mock |
|---|---|---|
| S1 年度件數 / 死傷 / 主因 | `incidents_by_county_year` MV + `incidents_by_cause_year` MV | ✅ 真實（48,626 件 / 民111-113） |
| S1 火災財損 KPI | mock 838 萬元 | 🔶 待 MOI 統計處 5 表 ETL |
| S1 時間長條 年/月/日/時 | MV 全 derive | ✅ 真實 |
| S1 5 維度佔比 早中晚/5大類/縣市/傷亡 | MV + derive | ✅ 真實 |
| S1 處所佔比 + 起火處所表 | mock | 🔶 待 MOI ETL |
| S1 縣市排名表 | `incidents_by_county_year` JOIN counties | ✅ 真實 |
| S1 起火原因 5+22 表 | `incidents_by_cause_year` + taxonomy | ✅ 真實（含致死率） |
| S2 分隊 / 消防栓 KPI + 表 | mock | 🔶 待 Sprint 2 ETL |
| S3 KPI 量能 3 個 | mock | 🔶 待 Sprint 3 PostGIS |
| S3 散布圖 x 軸火災密度 | derive from S1 真實 + counties.pop | ✅ 真實 |
| S3 散布圖 y 軸分隊密度 | mock | 🔶 待 Sprint 3 |
| S3 22 縣市量能對照表 | mock | 🔶 待 Sprint 3 |
| S4 EMS / 醫院 / 山林 / 災變 | mock | 🔶 待 Sprint 4 |
| 地圖 fire 主題基底 | choropleth 4 metric（火災密度真實 / 其他 mock） | 混合 |
| 地圖 fire 點位層（分隊 dot + heatmap） | **尚未實作** | ⬜ B045 P1 待做 |

## 下一個 session 的合理開頭

讀本檔 + `_STATUS.md` Session 5 段，挑下面之一：

1. **B045 fire 地圖層 dot + heatmap**（推薦，1-2 hr，立即有視覺差別）
   - SPEC.md 明指消防分隊紅 dot + 火災 heatmap **始終 on**
   - 可用 fire.incidents 48,626 lat/lng 立即做 heatmap
   - 分隊用 mock_fire_stations (Sprint 2 真實前的過渡)
   ```
   > 加 fire 地圖層：消防分隊 + 火災 heatmap
   ```

2. **TODO-3 MOI 5 表 ETL**（3-4 天，解 S1 兩個 placeholder）
   - 寫 taipei-gis-analytics/pipelines/environment/fire/07_fetch_moi_stats.py
   - 寫 gis-platform/migrations/100_fire_moi_stats_tables.sql（5 張 + RPC）
   - 解 S1 火災財損 KPI + 起火處所表
   ```
   > 開 TODO-3：MOI 5 表 ETL（先確認 5 個 dataset id）
   ```

3. **B046 fire ViewB 縣市儀錶板**（1-2 天）
   - 5 tabs（概覽 / 火災發生 / 救災量能 / 服務圈 / 其他）
   - 頂端 雷達圖 6 指標（縣市 vs 全國平均）
   - 服務圈 3km / 6km buffer + 圈外 Top 10 村里
   - 設計藍圖：/tmp/fire_design/mini-taiwan-info/project/js/view-b-fire.jsx

4. **push 三 repo + run A2 pipeline**（10 min + 1-2 hr）

## 跑得起來但還沒接的

- fire 主題 4 個 choropleth metric 切換 OK，但 station_density / out_of_5min / hydrant_density 三個是 mock
- fire 地圖層分隊 + heatmap 尚未實作（B045）
- fire ViewB 尚未實作（B046）
- ViewA fire 6 個 placeholder KPI 全標 mock 待 Sprint X ETL
- A2 pipeline 仍未 run（taipei-gis 88353ae，1-2 hr）
- TGOS batch_003 待 user 手動上傳（1-3 天回應期）

## 等用戶執行

- 拍板是否 push 三 repo
- 拍板是否 run A2 pipeline
- 上傳 TGOS batch_003（fire 補抓 109+108）
- 確認 22→5 大類 cause mapping 是否要調整（v1 已上 Supabase，但 user 沒明確 review）

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3
- Supabase project `utcmcikhvxnohbxchbrs` (pooler at `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env
- agent-browser 0.10.0 全局
- Dev server: localhost:5174（5173 被佔，自動切）
- Mapbox dev token 在 .env.local（git history 已 placeholder）

## 跨 4 repo 狀態

- **mini-taiwan-info**: ~15 commits ahead — 未 push（S4 殘 7 + S5 fire 8 + css fix 3 + wrap-up 6）
- **gis-platform**: 2 commits ahead — 未 push（097 S4 + 104 S5 fire wrappers）
- **taipei-gis-analytics**: 2 commits ahead — 未 push（88353ae S4 未 run + 5c7f061 S5 已跑）
- **data-collectors**: 本 session 沒動

## 已知小瑕疵（不阻塞）

- `themes/fire.yaml.v1.bak` 已清（commit 前刪）
- `home-basics.yaml` / `socioeconomic.yaml` 仍 v1.0 spec
- `scripts/regen-counties.ts` 沒寫
- agent-browser headless 沒 WebGL，無法驗證地圖 heatmap / 分隊 dot（要 user 真實瀏覽器驗）

## Skill 狀態

| Skill | 版本 | 跑過幾次 | 待修 |
|---|---|---|---|
| `/wrap-up` | v1.1 | 4 | Mode 判斷已加，本次 incremental 順跑；Stage 1 並行 read 全 9 檔已實踐 |
| `/water-loop` | v1.0 | 2 | Stage 1 加 SQL drill / Stage 4 加 dev server health check / Mode V 加 ASCII preview |

兩 skill 待下個 session 跑完一輪後回頭修。

## 本 session 學到的關鍵（看 REFLECTIONS Session 5 完整版）

1. **PostgREST exposed schema 限制** — 新 schema 直接 `withSchema()` 報 Invalid schema，要寫 public wrapper migration
2. **wrapper RPC 簽名要對齊 `pg_get_function_result`** — 不能憑記憶寫，第一次 apply 報 return type mismatch
3. **MapView 寫死的水主題基底層** — 新主題要 audit 所有 `map.addLayer`，加 `showXxxBaseLayers` prop
4. **dashboard pane = viewport × 40%** — 響應式斷點要對 pane 寬不是 viewport 寬，1500px 才是 cols-4 → 2x2 的合理斷點
5. **固定 px 欄寬（如 1fr 320px）在窄 pane 內擠垮 1fr** — 永遠用 1fr 1fr 或單欄
6. **Codex review 抓 critical bug 比人工有效** — Session 5 兩個 critical（ViewB 路由 / water layer 殘留）codex 一眼，人工 review 漏掉
