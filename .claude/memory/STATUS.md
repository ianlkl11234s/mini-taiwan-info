# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-14（Session 4 結束 · Cycle A 水質 + Cycle B IA 重組）

---

## 一句話現況

Phase 0 已收尾 + Cycle 1 (P0 fix) + Cycle A (水質接通) + Cycle B (ViewB IA v2 7 tabs 依水循環層重組) 完成；水質測站、DataAgeBadge component、LIVE 用詞嚴守原則都已落地；**3 個 repo 都 ahead origin 未 push**（Session 4 wrap-up 後共約 17 commits）。下個 session 建議跑 Cycle E（河川流量 + map layers）或 A2 run（補抓河川水質 reading）。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5173

- **View A**：6 KPI 接通真實資料（蓄水率 / 雨量真 LIVE，其他月度/年度/靜態）
- **View B**：**IA v2 7 tabs 依水循環層**
  - 概覽 ✅ / 水庫(蓄水率+DO/BOD/pH 水庫水質) ✅
  - 河川(流量 placeholder + 水質 warning「epa_river reading 待 A2」) ✅
  - 地下水(水位 placeholder + 水質) ✅
  - 防洪(FLOOD/DETENTION/STORM DRAIN/RAIN 4 section placeholder) ✅
  - 用水與配送(LPCD+接管率 LIVE + 汙水廠/給水/漏水 placeholder) ✅
  - 排名 ✅
- **View C**：水庫詳情頁 4 stat + 1 年 trend

## 下一個 session 的合理開頭

讀本檔 + `HANDOFF.md` Session 4 區段，挑下面之一：

1. **Cycle E 河川流量 + map layers**（推薦，0.5 天）
   - river_flow_stations 188 + river_lines 2015 + river_basins 116 全已建
   - ViewB 河川 tab 流量 placeholder → 接通真實 LIVE 資料
   ```
   > /water-loop 跑 Cycle E 河川流量 + map layers
   ```

2. **Cycle A2 run epa_river pipeline**（1-2 小時）
   ```
   cd taipei-gis-analytics
   python3 pipelines/water_resources/extensions/03_load_water_quality.py --full
   ```
   跑完 ViewB「河川」類別水質從 placeholder 變接通真實資料

3. **Cycle F 地下水位 realtime + 21 區 polygon**（1 天）
   - realtime.groundwater_level_readings 200 萬筆 + groundwater_zones 已建
   - 要 server-side aggregate RPC

4. **Cycle B / C 治理層 datagov 45136 / 45134 / 45135 / 89034**（2-3 天）
   - 寫 4 個 pipeline + migration + frontend

## 跑得起來但還沒接的

- A2 pipeline（taipei-gis 88353ae）已 commit 但**未 run**
- ViewA 6 KPI LIVE badge audit（B029）— 部分仍誤標 LIVE
- ViewB Reservoir / Usage tab 內既有 LIVE badge 待 audit
- `frontend/src/lib/api.ts`：backend wrapper client，等 FastAPI

## 等用戶執行

- 拍板是否 push 三 repo（mini 7+wrapup / gis 1 / taipei 1）
- 拍板是否 run A2 pipeline（吃 1/10 daily quota）

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3 (venv with psycopg2-binary)
- Supabase project `utcmcikhvxnohbxchbrs` (pooler at `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env
- agent-browser 0.10.0 全局；截圖前須 curl 驗 dev server 200
- mini-taiwan-info remote: git@github.com:ianlk11234s/mini-taiwan-info.git
- `git-filter-repo` 已裝（cycle 1 用過清 secret）

## 跨 4 repo 狀態

- **mini-taiwan-info**: 7 commits ahead + Session 4 wrap-up 9 commits (~16 total) — 未 push
- **gis-platform**: 1 commit ahead (995efec migration 097) — 未 push
- **taipei-gis-analytics**: 1 commit ahead (88353ae A2 pipeline) — 未 push
- **data-collectors**: 本 session 沒動（sibling repo，Zeabur 部署自動跑 cron）

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` / `fire.yaml` 仍 v1.0 spec
- `scripts/regen-counties.ts` 沒寫
- ViewA / ViewB OverviewTab 既有 LIVE badge 未 audit（B029）
- Mapbox dev token：本機 .env.local 仍 real value（git history 已 placeholder）
- Backup `/tmp/mini-taiwan-info.bak-pre-filterrepo` 555MB 還沒清

## Skill 狀態

| Skill | 版本 | 跑過幾次 | 待修 |
|---|---|---|---|
| `/wrap-up` | v1.1 | 3 | Stage 1 強制並行 read 全 9 檔 |
| `/water-loop` | v1.0 | 2 | Stage 1 加 SQL drill / Stage 4 加 dev server health check / Mode V 加 ASCII preview |

兩 skill 待下個 session 跑完一輪後回頭修（自演進機制）。

## 本 session 學到的關鍵（看 REFLECTIONS Session 4 完整版）

1. Discovery agent 報告必 SQL drill 驗證（epa_river 0 reading 教訓）
2. LIVE 用詞嚴守（user 抓包 30 分鐘修補）
3. Migration dry-run 拿掉內 COMMIT（避免 accidentally apply）
4. dev server 中途死掉要 curl 驗證
5. data-collectors 是 sibling repo（跨 4 repo 不只 3）
6. Cycle B Mode V IA 重組 25 分鐘超快（共用 helper 比拆三邊容易）
