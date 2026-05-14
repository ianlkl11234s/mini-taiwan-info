# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`。

**最後更新**：2026-05-14（Session 3 結束 · Cycle 1 完成 + /water-loop skill 固化）

---

## 一句話現況

Phase 0 全完成 **6/6 KPI 接通真實資料**（真 LIVE 只 2 個：蓄水率 / 雨量；其他 4 個是月/年/靜態 batch）；Session 3 跑完 Cycle 1（3 P0 fix） + 寫成 `/water-loop` skill 把整個半自動迭代流程固化。**三個 repo 全 push 同步 origin**。下個 session 可直接 `/water-loop` 跑 Cycle 2。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5173

- **View A**：6 KPI 接通真實資料 — 真 LIVE：蓄水率 56.8%（collector cron）/ 雨量 21mm（cron）/ 警戒 11 座（cron 派生）；月/年/靜態：淹水 0.4%（NLDCB 靜態）/ LPCD 273L（年度）/ 接管率 52.8%（年度）；爆炸圖**顯示全 22 縣市**（Cycle 1 fix）；切換主題 hero hook 走 manifest tagline（Cycle 1 fix）
- **View B**：縣市儀錶板 7 tabs（4 接通真實資料 + 3 placeholder；其中水質 tab 為 Cycle A 新接，月度採樣非 LIVE）
- **View C**：水庫詳情頁，**PointProfile chip 可 drill 進來**（Cycle 1 fix）

## 下一個 session 的合理開頭

讀本檔 + BACKLOG.md，講 `/water-loop` 觸發 skill：

**Cycle 2 候選**（BACKLOG B024-026，Tier S，pipeline 已存在）：
1. **水質測站 BOD/DO**（B024，1-2 天）→ 解鎖 ViewB 河川水質 tab
2. **河川流量測站**（B025，< 30min ETL + 前端串）→ Map layer overlay
3. **水污染罰鍰 datagov_45136**（B026，30-60min）→ 新 KPI + ranking

**Cycle 1 後新發現 P1 視覺缺口**（BACKLOG B021-023）：
- B021 ViewB OverviewTab 水庫卡 sparkline 用假資料（要接 30 天 timeseries 或改 gauge）
- B022 ViewB OverviewTab 汙水廠 KPI 寫死「—」（接 sewage_treatment_plants count）
- B023 ViewA「高警戒水庫數」KPI 爆炸是 placeholder

## 跑得起來但還沒接的

- `frontend/src/lib/api.ts`：backend wrapper client 寫好了但沒後端，等 FastAPI（TGOS / explode）
- `themes/{home-basics,socioeconomic,fire}.yaml`：v1.0 spec，靠 `applyManifestDefaults` fallback 不會 crash 但無 color_metrics
- `/water-loop` skill：v1.0 寫完未跑過 Cycle 2 驗證，預期 Cycle 2 跑完會回頭修 Stage 3 Mode D 細節

## 等用戶執行

無。所有變動已 commit + push 到 origin。

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3 (venv with psycopg2-binary)
- Supabase project `utcmcikhvxnohbxchbrs` (pooler at `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env
- agent-browser 全局已裝（version 0.10.0）；headless 截圖時序假象偵測 SOP 已寫進 /water-loop SKILL
- **mini-taiwan-info remote**: git@github.com:ianlkl11234s/mini-taiwan-info.git（Session 3 新設）
- `git-filter-repo` 已裝於 `/opt/homebrew/bin/`（Session 3 用過清 Mapbox token）

## 跨 repo 狀態

- mini-taiwan-info: origin/main = HEAD（27 commits 都 push 過了，含 Session 3 wrap-up memory commits）
- gis-platform: origin/main = HEAD（pull --rebase 8 commits 在 origin 3 auto-sync 之上後 push）
- taipei-gis-analytics: origin/master = HEAD（Session 3 沒動 pipelines）

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` / `fire.yaml` 還是 v1.0 spec（fallback 有效不會 crash）
- `scripts/regen-counties.ts` 沒寫（counties.ts 是手寫對齊 counties.yaml）
- Mapbox dev token：本機 .env.local 還是用既有 dev token（未 revoke 重申）；上線前需 URL-restricted
- Backup `/tmp/mini-taiwan-info.bak-pre-filterrepo` 555MB 還沒清（filter-repo 成功後可手動 `rm -rf`）

## Skill 狀態

| Skill | 版本 | 跑過幾次 |
|---|---|---|
| `/wrap-up` | v1.1（Stage 0 + reflog whitelist）| 2（Session 2 試跑 + Session 3 Mode B 首次正式）|
| `/water-loop` | v1.0（5 階段 + 3 checkpoint）| 0（待 Cycle 2 驗證）|
