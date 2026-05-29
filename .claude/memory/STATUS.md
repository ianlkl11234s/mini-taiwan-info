# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-29（Session 10 結束 · 首次正式部署上線 Zeabur）

---

## 一句話現況

本 session 從「資料迭代」轉為「**上線部署**」。完成上線前三大強化 + 實際部署：
- **egress 收斂**：5 query 檔（fire/demographics/rail/maritime/water-overview）精選 SELECT 欄位 + 分頁硬上界 + fire 預設只抓最新年（民 113）。預估 Supabase egress 降 30-50%。
- **前端 cache 層**：新 `lib/cache.ts`（sessionStorage TTL 分級 + in-flight dedupe + storage 不可用 fallback），11 個 data hook 全包 cachedFetch，切 tab 不再重打 API。
- **部署 infra**：Dockerfile（corepack pnpm@9.15 + ARG→ENV）+ nginx.conf（SPA fallback + gzip + 分層 cache）+ .dockerignore + .env.production.example + DEPLOYMENT.md + scripts/snapshot-static-data.ts + docs/DATA_TIERING.md。
- **rail.ts ridership** 改降冪（review medium：升冪+上界會截最舊，consumer 要最新期）。

**部署結果：已上線 → https://mini-tw-info.zeabur.app**
Zeabur project `6a1946657e81687840b6d363` / service `6a194b4718463d8ee2669f6e`（region agent_test/LINODE）。
採 **direct deploy 預建 dist 靜態（PREBUILT_V2）** — Dockerfile build 在 Zeabur 連兩次 FAILED，pivot 成本機 `pnpm build` + 部署 `dist/`。本 session 改動全 push origin/main。User 已自行把 Mapbox token 換新 + URL restrict。

> 部署細節 + redeploy SOP 在 `DEPLOYMENT.md`「實際部署紀錄」。坑見 INCIDENTS 2026-05-29。

## 下個 session 接什麼

### A. 上線收尾（部署相關）
1. **套用 gis-platform migration 124**（`124_rpc_hard_limits.sql`，只產未套未 commit / B073）：fire.list_incidents + get_road_events_current 的 `LIMIT p_limit` → `LEAST(...,10000)`。套用前 psql `pg_get_functiondef` 確認簽名。→ CROSS_REPO pending
2. **debug Zeabur Dockerfile build FAILED**（B074）：修好可改 Git deploy（push 自動重部署 + nginx immutable 長快取，比目前靜態站的 Zeabur 預設 cache 更省）
3. **後端 FastAPI 部署**（B008）：目前 explode/TGOS 降級（VITE_API_BASE_URL 空字串，不影響 Supabase KPI）

### B. 公開後體驗（優先級升）
4. **手機 <900px 版面**（B048/B054 升 P1）：公開站手機流量佔比高，split-view 仍硬切 50/50 會溢出

### C. 既有資料待辦（延續 Session 9）
5. fire 3 placeholder 純前端對接（B066/B067/B068，DB 已齊）
6. 水主題 P0（B059/B060/B061 縣市 mapping table / drought 4 區 / 水質站 county normalize）
7. demographics/rail/maritime 為 draft/beta，已上線可見，可再迭代（注意：並行 session 已在改這些）

## 跑得起來的東西

- **線上**：https://mini-tw-info.zeabur.app（首頁 home-basics，22 縣市 + 主題切換）
- **本機 dev**：`cd frontend && pnpm dev` → http://localhost:5173
- 主題：water（6 章敘事）/ fire（ViewA 4 區 + ViewB）/ demographics / rail / maritime（draft-beta）/ home-basics
- View A 全國 / View B 縣市 / View C 水庫詳情

## 等用戶執行 / 拍板

- 套用 migration 124（DB 層 RPC 硬上限）
- 拍板下個方向：上線收尾（後端/Dockerfile build debug）vs 手機版 vs 既有資料對接
- demographics/rail/maritime 是否要再補完再對外宣傳

## 開發環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3
- Supabase project `utcmcikhvxnohbxchbrs`（pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`），DATABASE_URL 在 gis-platform/.env
- Mapbox token 在 .env.local（已 URL-restricted 到 mini-tw-info.zeabur.app）
- **Zeabur 重新部署**：`cd frontend && pnpm build && cd dist && npx zeabur@latest deploy --project-id 6a1946657e81687840b6d363 --service-id 6a194b4718463d8ee2669f6e --json`（**務必帶 --service-id** 否則建重複服務）
- agent-browser 0.10.0 全局（headless 無 WebGL，地圖要真實瀏覽器驗）

## 跨 4 repo 狀態（Session 10 結束）

- **mini-taiwan-info**: 本 session 改動已 push origin/main（注意有並行 session 也在 commit）
- **gis-platform**: ⚠️ `migrations/124_rpc_hard_limits.sql` 只產生，未 commit 未套用（其他 untracked migration 022/046/067/068 非本 session）
- **taipei-gis-analytics**: 本 session 未動
- **data-collectors**: 本 session 未動

## 已知小瑕疵（不阻塞）

- 部署是 dist 靜態站，非 Dockerfile+nginx → cache 用 Zeabur 預設（gzip+ETag），非 nginx immutable 長快取（B074 修）
- 後端未部署 → explode/TGOS 功能降級
- snapshot-static-data.ts 內 table 名稱是推定的，首次跑前需對照實際 query 校正（B075）
- B048-B054 手機/響應式、B042 消防栓 3 都欄位、fire 3 placeholder（B066-B068）延續
- BACKLOG ~118 行 / 75+ 項，下次 wrap-up 應清 P3

## Skill / Harness 狀態（Session 10）

| Skill / Tool | 本 session 觸發 | 備註 |
|---|---|---|
| `/wrap-up` | 1 | 本次（Stage 5 踩到 Edit 靜默失敗 → 重做）|
| Workflow tool | 1（重度，15 agents）| pre-launch 改動主力 |
| zeabur:* skills | ~6 | auth/deploy/project-create/variables/domain/logs |
| `/theme-loop` | 0 | 本 session 非資料迭代 |

- PostToolUse typecheck hook：本 session 多次跑（Edit 後自動），無誤
- **harness IO 本 session 不穩**（吞輸出/重複行/Edit 靜默失敗）→ 教訓進 INCIDENTS + REFLECTIONS（Read 工具讀檔 / 寫檔+Read / git show / grep -c 驗 commit）
