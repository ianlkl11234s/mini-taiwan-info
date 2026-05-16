# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-16（Session 9 結束 · fire 主題 ViewA + ViewB 去 mock 化）

---

## 一句話現況

Fire 主題 ViewA（S1-S4 全 4 區塊）+ ViewB（hero + radar + ResponseTab + OthersTab）整輪去 mock 化完成。gis-platform migration 109 一次 14 wrapper view（fire/safety/ems）apply + 驗證；frontend `lib/queries/fire.ts` +683 行、`useFireData` 17 fetch Promise.allSettled、新 `useFireCountyData` lazy hook、ViewA 4 sections + ViewB merged{} + 2 tabs rewrite、App.tsx 3 fix（label / choropleth / map layer），雷達圖全國平均也接通真實。User 拍板「DB 稀疏時誠實 footnote 接通真實 > mock」進 PRINCIPLES。剩 3 個 placeholder（急救醫院 / 5min 圈外 / 圈外村里）其實 DB 表已被其他 session 建好（migration 110/111/112 + Sprint G），下 session 純前端 1 day 對接完。11 atomic commits 跨 2 repo + 7 wrap-up，**44+ commits ahead origin/main 待 user push**。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5173

### View A
- **fire 主題（NEW S9 接通真實）**：4 區塊全 swap mock
  - S1 火災發生：年度件數 15384 / 死傷 175-405 / 財損 3.9 億（2020 only badge）/ 主因 36.4% — 全真實
  - S1 時間長條 4 scale + 5 dim donut + B047 KPI 爆炸 — 真實
  - S1 縣市排名表 22 縣（incidents/deaths/injuries/density/damage 全真實，財損 column 加「· 2020」year suffix）
  - S2 全國分隊 716 + 栓 39395 KPI + 4 都消防栓+分隊表 — 真實（footnote「限高雄 + 4 都待補」）
  - S3 分隊密度 0.31/萬人 + 1.98/100km² + scatter Y 軸真實 + 22 縣量能對照表 — 真實（5min 圈外仍 placeholder）
  - S4 救護 1.8 萬 + 山林高風險 172 處 + 22 縣 EMS 表（footnote「僅 X 縣市完整」）+ 災變 timeline dedup-by-name — 真實
  - 急救責任醫院 KPI 仍 placeholder「待 ETL」（B066 下 session 接通）
- **water 主題（S8）**：6 章敘事 — 不動
- **App.tsx map layer**：fire.stations 716 個分隊真實點層；hydrants 39395 限高雄；shelters 5947；forest_risk 10000

### View B
- **fire 主題（NEW S9 接通真實）**：
  - Hero：273.4 萬人 · 分隊 53 · 火災 1139 件 · 死亡 22（高雄 sample）
  - Radar 5 軸：4/5 軸全國平均真實算（火災密度 / 致死率 / 分隊密度 / 栓密度），1 軸 mock（5min 圈外，等 Sprint 3）
  - ResponseTab：53 分隊清單 + 栓 39395 + 1.80 隊/100km² — 真實 from useFireCountyData hook
  - OthersTab：OHCA 6807 + 避難 500 處 + 災變 50 筆 dedup — 真實
  - ServiceTab 圈外村里 Top 10 仍 KHH mock（B068 接 admin.villages PostGIS RPC）
- **water 主題**：IA v2 7 tabs — 不動

### View C
- 水庫詳情頁 4 stat + 1 年 trend（fire 未支援）

## Fire 主題真實 vs Mock 對映（給下個 session 看）

| 元件 | 資料來源 | Real / Mock | 揭露 |
|---|---|---|---|
| S1 火災件數 / 死傷 / 主因 | incidents_by_county_year + cause_year MV | ✅ 真實 | 民 113 (2024) |
| S1 火災財損 KPI | fire.casualty_property_by_county_year | ✅ 真實 | footnote「2020 only」（DB 只 1 年）|
| S1 起火處所 donut + table | fire.incidents_by_location_type | ✅ 真實 | 「2022 年」footnote（DB 只 1 年）|
| S1 縣市排名 財損 column | 同 casualty | ✅ 真實 | header「· 2020」 |
| S2 全國分隊 / 栓 KPI | fire.stations / fire.hydrants COUNT | ✅ 真實 | 栓「限高雄」footnote |
| S2 4 都栓+分隊表 | fire.hydrants groupBy + fire.stations groupBy | ✅ 部分 | 高雄已通、其他 3 都「待 ETL 補欄位」 |
| S3 分隊密度 / 面積密度 KPI | fire.stations + COUNTIES pop/area | ✅ 真實 | — |
| S3 scatter Y 軸 | 同上 | ✅ 真實 | — |
| S3 5min 圈外人口 | — | 🔶 placeholder | 「·待Sprint3」(實已建 → B067) |
| S4 救護出勤 + OHCA | fire.ems_stats_by_county_year SUM | ✅ 真實 | — |
| S4 山林高風險 | fire.forest_fire_risk_snapshot risk_level >=3 | ✅ 真實 | — |
| S4 急救責任醫院 | — | 🔶 placeholder「待ETL」 | 252 家已 in DB → B066 |
| S4 22 縣市 EMS 表 | fire.ems_stats_by_county_year | ✅ 真實 | footnote「僅 X 縣市完整」（DB 只 2 縣）|
| S4 災變 timeline | fire.disaster_incidents dedup-by-name | ✅ 真實 | 顯示 unique events |
| ViewB Hero | 全部真實 | ✅ 真實 | — |
| ViewB Radar 4/5 軸 | countyAggregates + fire.stations 真實 mean | ✅ 真實 | — |
| ViewB Radar outOf5Min | mock | 🔶 placeholder | 等 Sprint 3（→ B067） |
| ViewB Response 分隊清單 | useFireCountyData.stations | ✅ 真實 | — |
| ViewB Response 栓 KPI | useFireCountyData.hydrantCount | ✅ 真實 | KHH 才有 |
| ViewB Others EMS/OHCA/災變/避難所 | data.emsYearlyRows + countyData | ✅ 真實 | 各自 footnote |
| ViewB Service 圈外村里 Top 10 | KHH mock | 🔶 placeholder | admin.villages 已建 → B068 |

## 下一個 session 的合理開頭

讀本檔 + REFLECTIONS Session 9，挑下面之一：

1. **接通 110/111/112 跨 session ETL 成果**（B066/B067/B068，1 day 純前端）
   - 寫 wrapper migration（safety_emergency_hospitals + fire_service_coverage_by_county 2 view）
   - 加 query function + 接 ViewA S4 急救醫院 KPI + ViewA S3 5min 圈外 KPI + ViewB ServiceTab
   - admin.villages 圈外村里需新 PostGIS RPC

2. **B069 fire.hydrants 4 都欄位 mapping bug 修**（taipei-gis Sprint B2 pipeline，0.5 day）
   - 修完 4 都消防栓資料齊全，ViewA S2 + ViewBFire ResponseTab 自動受益

3. **B054 ViewAWater @800 響應式修補**（30min 純前端）

4. **開新主題：demographics 或 safety**（沿 PB-10 + PB-13 SOP）

5. **B048-B051 響應式 / 視覺小 bug 一次掃**（< 2 hr）

## 跑得起來但還沒接的

- **44+ commits ahead origin/main**（S6 + S7 + S8 + S9 + 2 輪 wrap-up memory）— 待 user push
- A2 pipeline 仍未 run（taipei-gis 88353ae，1-2 hr）
- TGOS batch_003 待 user 手動上傳（1-3 天回應期）
- demographics / socioeconomic / home-basics 主題 yaml 仍 v1.0 spec（B003-B005）

## 等用戶執行

- Push mini-taiwan-info（**44+ commits ahead**）
- Push gis-platform（migration 109 + 110/111/112，3 commits ahead）
- 拍板下個 cycle 方向（B066-B068 / B069 / 新主題 / B054）
- 上傳 TGOS batch_003

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3
- Supabase project `utcmcikhvxnohbxchbrs` (pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env
- agent-browser 0.10.0 全局
- Dev server: localhost:5173（VITE_DEFAULT_THEME=water 默認進水主題）
- Mapbox dev token 在 .env.local

## 跨 4 repo 狀態（Session 9 結束）

- **mini-taiwan-info**: **44+ commits ahead origin/main**（S6+S7+S8+S9+wrap-up）— 待 push
- **gis-platform**: **3 commits ahead origin/main**（109 本 session + 110/111/112 其他 session）
- **taipei-gis-analytics**: 6+ ahead master + dirty（其他 session 工作，Sprint G 已 commit）
- **data-collectors**: clean（其他 session 工作）

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` 仍 v1.0 spec
- `scripts/regen-counties.ts` 沒寫
- agent-browser headless 沒 WebGL，無法驗證地圖 heatmap / 分隊 dot（要 user 真實瀏覽器驗）
- B048-B051 + B054-B058 響應式/視覺 bug 留 backlog
- B042 後段：消防栓其他 3 都欄位 mapping bug
- B070 fire.ems 只 2 縣市 / B072 forest_risk 無 county_id（DB 限制）
- BACKLOG 107 行 / 70+ 項接近上限，下次 wrap-up 應清 P3 已完成項

## Skill 狀態

| Skill | 版本 | 跑過幾次 | 本 session | 待修 |
|---|---|---|---|---|
| `/theme-loop` | v1.0 | 6 | 0（user 直接給 task）| Stage 1 Discovery 加 cross-repo + DB 對比 Agent E |
| `/wrap-up` | v1.1 | 9（含本次）| 1 | Stage 1 強化「跨 session 已建未對接」audit |
| `/cross-repo-status` | v1.0 | 2 | 0（漏跑）| 在 wrap-up Stage 1 自動 inline 派？ |
| `/check-schema-exposed` | v1.0 | 0 | 0 | 累積 0 次使用，description 太隱性 |
| `/scaffold-rpc-wrapper` | v1.0 | 0 | 0 | 同上 |

兩個輔助 skill 累積 0 次 + cross-repo-status 漏跑 = 都是「設計上 trigger 不主動」問題。下個 cycle 涉及新 schema 時主動派看看效用。

## 本 session 學到的關鍵（看 REFLECTIONS Session 9 完整版）

1. **比較視覺 avg 跟 city 必須同 source** — 雷達圖 mock_avg vs real_city 拉假差距是 artifact（INCIDENTS 第 1 條）
2. **Cross-session schema drift 二度** — 其他 session 已建 ETL/MV 但本 session 不知，cycle 開頭強制跨 repo audit（INCIDENTS 第 2 條）
3. **誠實 footnote > 假裝 mock** — user 拍板 PRINCIPLES：DB 稀疏時接通真實 + 揭露範圍
4. **Supabase count:exact head:true** — 避免下載大表拿 COUNT（PB-15）
5. **Batch wrapper migration** — 一次 14 view + BEGIN/COMMIT + IF NOT EXISTS（PB-16）
6. **County-level event-table dedup-by-name** — 55k row 只 ~15 unique disaster_name，前端 dedup 模式（PB-17）
