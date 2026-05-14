# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`。

**最後更新**：2026-05-14（Session 2 結束）

---

## 一句話現況

Phase 0a + 0b + 0c + 0d + 0b+ A-1/A-2/A-3/A-4 全部完成，6/6 KPI LIVE，21+ atomic commits 跨 3 repos。剩 A-5 View D（user 要求延後）。

## 跑得起來的東西

`cd frontend && pnpm dev` → http://localhost:5173

- View A：6 KPI（蓄水率 56.8% / 雨量 19.0mm / 警戒 11 座 / 淹水 0.4% / LPCD 273L / 接管率 52.8%）全 LIVE，22 縣市 choropleth，PointProfile 3 模式（34 座水庫），TwoSectionLayers 可收合，TOP/BOTTOM 5 ranking
- View B：縣市儀錶板 7 tabs（4 real + 3 placeholder），高雄 3 座水庫卡（阿公店 8.6% 警戒 / 鳳山 58.3% / 澄清湖 86.7%），LPCD / 接管率 LIVE，Donut 排名
- View C：水庫詳情頁 4 stat + 1 年蓄水率 trend（自動跌破 30% annotation）+ 基本資料 + insight

## 下一個 session 的合理開頭

讀本檔 + BACKLOG.md，挑下面之一：

1. **A-5 View D 比較模式**（mockup 收尾，0.5 天）
2. **Phase 1 規劃**：4 個 disabled 主題之一升級 v1.1（home-basics 最近）
3. **月雨量 MV**（Phase 0d 延後項，0.5 天）
4. **DevOps**：Vercel 部署 + URL-restricted Mapbox token

## 跑得起來但還沒接的

- `frontend/src/lib/api.ts`：backend wrapper client 寫好了但沒後端，等 FastAPI（TGOS / explode）
- `themes/{home-basics,socioeconomic,fire}.yaml`：v1.0 spec，靠 `applyManifestDefaults` fallback 不會 crash 但無 color_metrics

## 等用戶執行

無。所有 migration 已 apply、所有 pipeline 已跑、所有 commit 已 commit（未 push）。

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3 (venv with psycopg2-binary)
- Supabase project `utcmcikhvxnohbxchbrs` (pooler at `aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- DATABASE_URL 在 gis-platform/.env

## 跨 repo 狀態

- gis-platform: 4 個 migrations applied (093/094/095/096) — committed not pushed
- taipei-gis-analytics: 2 個 pipelines committed (datagov 8316 / 26815)，registry.yaml 沒動（user 有其他變動，避免 conflict）
- mini-taiwan-info: 21+ commits ahead of origin/main

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` / `fire.yaml` 還是 v1.0 spec（fallback 有效不會 crash 但 UI 不完整）
- `scripts/regen-counties.ts` 沒寫（counties.ts 是手寫對齊 counties.yaml）
- Mapbox dev token 是 prototype 共用的，production 需要 URL-restricted
