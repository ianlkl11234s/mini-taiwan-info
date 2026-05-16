# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-16（Session 6 結束 · B045 fire 地圖層 + B046 fire ViewB 縣市儀錶板都上線）

---

## 一句話現況

Fire 主題 **ViewA + ViewB 全套上線**。Session 6 一 session 跑完 2 個完整 cycle：B045 fire 地圖層（heatmap + 分隊 dot + 無染色模式 + point panel + 兼修 1100×700）+ B046 ViewB 縣市儀錶板（gis-platform migration 105 + ViewBFire 1170 行 / Hero + Radar 5 軸 + 5 sub-tabs / 設計稿 fire-* CSS 184 行補齊）。B045 已 push、B046 commit 未 push。下個 session 候選：B041 MOI ETL（3-4 天，cross-repo Mode D）/ B043 Sprint 3 PostGIS 服務圈 / B047 fire KPI 爆炸視圖 / 開新主題（demographics / safety）。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5173

### View A
- **water 主題**：6 KPI 接通真實資料（蓄水率 / 雨量 / 警戒 / 淹水 / LPCD / 接管率）
- **fire 主題**：4 區塊 + heatmap + 分隊 dot + 「無染色」灰底模式（METRIC_NONE）+ 5 個 point layer toggle（hotspots/stations enabled, hydrants/forestRisk/emsHospital 待 Sprint）

### View B
- **water 主題**：IA v2 7 tabs（概覽 / 水庫 / 河川 / 地下水 / 防洪 / 用水與配送 / 排名）
- **fire 主題**：**B046 已上線** — Hero（縣市名 + 人口/面積/分隊/件數/死亡）+ FireRadarCard 5 軸 vs 全國平均（score-unified 公式，外圈=表現好）+ 5 tabs（overview/incidents/response/service/others）

### View C
- 水庫詳情頁 4 stat + 1 年 trend（fire 未支援，不規劃）

## Fire 主題真實 vs Mock 對映（給下個 session 看）

| 元件 | 資料來源 | Real / Mock |
|---|---|---|
| ViewA / ViewB S1 年度件數 / 死傷 / 主因 | MV + counties pop | ✅ 真實（48,626 件 / 民111-113） |
| ViewB Overview 縣市 5+22 起火原因 | migration 105 `incidents_by_county_cause_year` MV | ✅ 真實（B046 新接通） |
| ViewB Incidents 月度 bar | hourMonth MV filter by county | ✅ 真實 |
| ViewA 火災財損 KPI / 起火處所表 | mock | 🔶 待 B041 MOI 5 表 ETL |
| ViewA / ViewB Response 分隊 KPI + 清單 | mock（22 縣市質心 jitter 629 點，Sprint 2 真實前過渡）| 🔶 待 B042 Sprint 2 |
| ViewB Service 圈外人口 / Top 10 村里 | 高雄 mock 10 筆，其他 placeholder | 🔶 待 B043 Sprint 3 PostGIS |
| ViewA / ViewB Others 救護 / 醫院 / 山林 / 災變 | mock | 🔶 待 B044 Sprint 4 |
| **地圖 fire 點位層** | heatmap 真實 12k 點（113 年）+ 分隊 mock 629 dot | 混合 |
| 雷達圖 5 軸 | 2 真實（fireDensity/deathRate）+ 3 mock（stationDensity/outOf5Min/hydrantDensity 4 都真實+18 null）| 混合 |

## 下一個 session 的合理開頭

讀本檔 + `_STATUS.md`，挑下面之一：

1. **B041 MOI 5 表 ETL**（Mode D 跨 3 repo，3-4 天）
   - taipei-gis-analytics 寫 `pipelines/environment/fire/07_fetch_moi_stats.py`
   - gis-platform 寫 `migrations/106_fire_moi_stats_tables.sql`（5 張表 + RPC）
   - 5 個 dataset：行政區火災統計 / 死傷財損 / 起火原因 / 起火處所 / 火災類別
   - 解 ViewA / ViewB 火災財損 KPI + 起火處所表 placeholder
   ```
   > 開 TODO-3：MOI 5 表 ETL
   ```

2. **B043 Sprint 3 PostGIS 服務圈衍生表**（3-4 天）
   - gis-platform 寫 `migrations/107_fire_service_buffer.sql`（ST_Buffer 3km/6km 衍生表 + 圈外人口 + Top 10 村里）
   - 依賴：B042 真實 stations + 村里 polygon GeoJSON（兩者都還沒）
   - 解 ViewB Service tab 從 mock 變真實
   ```
   > 開 Sprint 3 fire 服務圈
   ```

3. **B047 fire KPI 爆炸視圖**（1-2 天，純前端）
   - 點 KPI 卡 → 大圖 + time scale × dimension 切換
   - 設計 SPEC.md 區塊「KPI 爆炸視圖」

4. **開新主題：demographics 或 safety**
   - 仿 PB-10 開新主題 SOP + PB-12 移植 design bundle（如果有設計稿）

5. **B042 Sprint 2 真實分隊 + 4 都消防栓**（5-7 天，taipei-gis ETL + Google geocoding）

## 跑得起來但還沒接的

- B046 commit 未 push（mini-taiwan-info 9 commits ahead origin/main 待 user push）
- A2 pipeline 仍未 run（taipei-gis 88353ae，1-2 hr）
- TGOS batch_003 待 user 手動上傳（1-3 天回應期）
- demographics / socioeconomic / home-basics 主題 yaml 仍 v1.0 spec（B003-B005）

## 等用戶執行

- Push mini-taiwan-info（B046 + memory 9 個 commits ahead）
- 拍板下個 cycle 方向（B041 / B043 / B047 / 新主題）
- 上傳 TGOS batch_003

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3
- Supabase project `utcmcikhvxnohbxchbrs` (pooler at `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env
- agent-browser 0.10.0 全局
- Dev server: localhost:5173
- Mapbox dev token 在 .env.local

## 跨 4 repo 狀態（Session 6 結束）

- **mini-taiwan-info**: **9 commits ahead origin/main**（B046 1 + memory 8）— 待 push
- **gis-platform**: **0 commits**（migration 105 已 push）
- **taipei-gis-analytics**: **2 commits ahead origin/master**（其他 session 工作，本 session 未動）
- **data-collectors**: 本 session 沒動

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` 仍 v1.0 spec
- `scripts/regen-counties.ts` 沒寫
- agent-browser headless 沒 WebGL，無法驗證地圖 heatmap / 分隊 dot（要 user 真實瀏覽器驗）
- B048（800×600 stack 缺）/ B049（Donut 圖例溢位）/ B050（KPI 單位緊貼）三個響應式 bug 留 backlog 未做

## Skill 狀態

| Skill | 版本 | 跑過幾次 | 待修 |
|---|---|---|---|
| `/theme-loop` | v1.0 | 4 (含本 session 2 次) | Stage 1 agent D schema 預檢要明確問「by-county 維度」；Stage 4 加 CSS 移植完整性閘 |
| `/wrap-up` | v1.1 | 6 (含本次) | Stage 2 事件分類表加「移植 design bundle 缺 CSS」 |
| `/cross-repo-status` | v1.0 | 2 | 本 session 1 次驗證流暢 |
| `/check-schema-exposed` | v1.0 | 0 | 本 session 沒實際 invoke（agent D 直接做完）|
| `/scaffold-rpc-wrapper` | v1.0 | 0 | 本 session migration 105 手寫（夠簡單）|

兩個主流 skill 待下個 session 跑完一輪後回頭修。

## 本 session 學到的關鍵（看 REFLECTIONS Session 6 完整版）

1. **雷達圖混 lower/higher-better 軸要統一 score 公式** — `1 - v/max` 反轉 lower-better 軸，外圈永遠 = 表現好（PRINCIPLES 2026-05-16）
2. **移植 design bundle 元件 = JSX + CSS** — 寫 component 必須一併把 styles.css 對應 className 段 append 到 globals.css，不然 dev server 看起來「跟 word 沒兩樣」純文字（PB-12）
3. **Mock 0 vs 真實 0 區分** — 部分縣市/類別沒資料時設 null 不是 0，雷達/平均/verdict 跳過該 entry（PRINCIPLES 2026-05-16）
4. **Heatmap addLayer 用 beforeId** 控 z-order，避免蓋掉縣市標籤 / 邊線 / 選取框
5. **Codex review 三抓 critical bug** — heatmap z-order / 雷達 norm 方向 / hydrant null。手動 review + 截圖 verify 都漏，必派 codex（PB-08 第 3 次驗證）
6. **同 session 跑 2 cycle 是可行的**（B045 Mode P+V → B046 Mode D），但 cycle 之間要清晰分界（atomic commit + skip wrap-up + 重開 theme-loop）
