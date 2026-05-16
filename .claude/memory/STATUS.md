# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-16（Session 7 結束 · B047 fire KPI 爆炸視圖完成）

---

## 一句話現況

Fire 主題 ViewA + ViewB + KPI 爆炸視圖（B047）全套上線。Session 7 一個 cycle 跑完純前端 1-2 天工作：FireKpiExplode.tsx 260 行 + FireStackedBar.tsx 100 行 + S1Incidents wire + globals.css 130 行。年度火災件數 KPI 點擊就地展開（grid-column 1/-1）4 scale × 4 dim = 16 組合切換，圖型自動 bar/line/stacked，缺資料 inline reason。Codex 抓 1 blocker（unknown cause_5 silently 漏資料）+ 2 nice-to-have 全修，但 agent-browser 互動才抓到 KPICard onClick bubble 收回卡片這個 codex 盲區 bug。下個 session 候選：B041 MOI ETL（3-4 天）/ 開新主題 / B052 把其他 3 KPI 也支援爆炸。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5173

### View A
- **water 主題**：6 KPI 接通真實資料（蓄水率 / 雨量 / 警戒 / 淹水 / LPCD / 接管率）
- **fire 主題**：4 區塊 + heatmap + 分隊 dot + 「無染色」灰底模式（METRIC_NONE）+ 5 個 point layer toggle + **B047 年度火災件數 KPI 點擊爆炸**（年×全國/年×cause/年×county/月×daypart/月×county/日×全國/時×daypart/時×county，10 種有效組合 + 6 個 inline reason）

### View B
- **water 主題**：IA v2 7 tabs（概覽 / 水庫 / 河川 / 地下水 / 防洪 / 用水與配送 / 排名）
- **fire 主題**：Hero + FireRadarCard 5 軸 vs 全國平均 + 5 tabs（overview/incidents/response/service/others）

### View C
- 水庫詳情頁 4 stat + 1 年 trend（fire 未支援）

## Fire 主題真實 vs Mock 對映（給下個 session 看）

| 元件 | 資料來源 | Real / Mock |
|---|---|---|
| ViewA / ViewB S1 年度件數 / 死傷 / 主因 | MV + counties pop | ✅ 真實（48,626 件 / 民111-113） |
| **ViewA S1 KPI 爆炸（年度件數）**| MV 聚合，10 組合可行 | ✅ 真實（B047 新接通） |
| ViewB Overview 縣市 5+22 起火原因 | migration 105 MV | ✅ 真實 |
| ViewB Incidents 月度 bar | hourMonth MV filter | ✅ 真實 |
| ViewA 火災財損 KPI / 起火處所表 | mock | 🔶 待 B041 MOI 5 表 ETL |
| ViewA / ViewB Response 分隊 KPI + 清單 | mock（22 縣市質心 jitter 629 點） | 🔶 待 B042 Sprint 2 |
| ViewB Service 圈外人口 / Top 10 村里 | 高雄 mock 10 筆 | 🔶 待 B043 Sprint 3 PostGIS |
| ViewA / ViewB Others 救護 / 醫院 / 山林 / 災變 | mock | 🔶 待 B044 Sprint 4 |
| 地圖 fire 點位層 | heatmap 真實 12k 點 + 分隊 mock 629 dot | 混合 |
| 雷達圖 5 軸 | 2 真實 + 3 mock | 混合 |

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

2. **B052 fire KPI 爆炸擴展到其他 3 KPI**（1-2 天，純前端）
   - 死傷 / 財損 / 主因 各自 metric 聚合 + 爆炸內容
   - 沿用 FireKpiExplode 抽 generic 版（其實就改 metric extractor）
   - 注意財損是 mock，要等 B041 才有真實財損

3. **B043 Sprint 3 PostGIS 服務圈**（依賴 B042 真實 stations，**不建議現在做**）

4. **開新主題：demographics 或 safety**
   - 仿 PB-10 開新主題 SOP + PB-12 移植 design bundle

5. **B048-B051 響應式 / 視覺小 bug 一次掃**（< 2 hr 純前端 polish）

## 跑得起來但還沒接的

- **15 commits ahead origin/main**（B046 + S6 memory 8 + B047 + S7 wrap-up memory 6 + 本次 STATUS）— 待 user push
- A2 pipeline 仍未 run（taipei-gis 88353ae，1-2 hr）
- TGOS batch_003 待 user 手動上傳（1-3 天回應期）
- demographics / socioeconomic / home-basics 主題 yaml 仍 v1.0 spec（B003-B005）

## 等用戶執行

- Push mini-taiwan-info（**15 commits ahead**）
- 拍板下個 cycle 方向（B041 / B052 / 新主題 / 小 bug 掃）
- 上傳 TGOS batch_003

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3
- Supabase project `utcmcikhvxnohbxchbrs` (pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env
- agent-browser 0.10.0 全局
- Dev server: localhost:5173
- Mapbox dev token 在 .env.local

## 跨 4 repo 狀態（Session 7 結束）

- **mini-taiwan-info**: **15 commits ahead origin/main**（B046 + S6 memory 8 + B047 + S7 memory 6 = 預計 push 後 reset）— 待 push
- **gis-platform**: **0 commits**（migration 105 在 Session 6 末已 push）
- **taipei-gis-analytics**: 其他 session 工作 dirty + untracked（**非本 wrap-up 範圍**）
- **data-collectors**: 本 session 沒動

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` 仍 v1.0 spec
- `scripts/regen-counties.ts` 沒寫
- agent-browser headless 沒 WebGL，無法驗證地圖 heatmap / 分隊 dot（要 user 真實瀏覽器驗）
- B048（800×600 stack 缺）/ B049（Donut 圖例溢位）/ B050（KPI 單位緊貼）/ **B051（24 column totals overlap，本 session 截到）** 四個響應式/視覺 bug 留 backlog

## Skill 狀態

| Skill | 版本 | 跑過幾次 | 待修 |
|---|---|---|---|
| `/theme-loop` | v1.0 | 4 (本 session 0 — B047 太單純沒走 loop) | Stage 4 加 codex+agent-browser 並行（codex 對事件流盲區） |
| `/wrap-up` | v1.1 | 7 (含本次) | Stage 2 事件分類表加「codex 漏抓的 runtime bug」項 |
| `/cross-repo-status` | v1.0 | 2 | 本 session 0 次（純前端不需要） |
| `/check-schema-exposed` | v1.0 | 0 | 本 session 沒實際 invoke |
| `/scaffold-rpc-wrapper` | v1.0 | 0 | 本 session 沒新 schema |

兩個主流 skill 待下個 session 跑完一輪後回頭修。

## 本 session 學到的關鍵（看 REFLECTIONS Session 7 完整版）

1. **codex review 對 DOM 事件流盲區** — 靜態碼分析看不到 onClick bubble / event cleanup / focus management；Verify 三閘 = typecheck + agent-browser 互動 + codex review，不可三選二
2. **KPI 卡 inline-expand SOP** — `.kpi-card.expanded { grid-column: 1/-1 }` + 爆炸 root `onClick={e => e.stopPropagation()}` 是黃金組合
3. **缺資料 inline reason** 比 disable toggle 教育性好（03-pattern §6 規範）
4. **24+ column stacked label overlap** 是未來陷阱，B051 留 backlog
5. **PB-08 第 4 次驗證有效**，但 codex 不抓事件流 bug 要補三閘
