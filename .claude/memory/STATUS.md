# STATUS — 當前狀態快照

> 每次 `/wrap-up` 完整 rewrite。只保留當下的「下個 session 接什麼」。
> User-facing Phase 進度看 root `_STATUS.md`，完整接手書看 `HANDOFF.md`。

**最後更新**：2026-05-29（Session 11 結束 · 部署 404 修復 + 改 GitHub 自動部署 + 大量 UX/SSOT 微調）

---

## 一句話現況

本 session 把部署從「direct deploy 預建 dist（PREBUILT_V2 static）」**改成 GitHub 自動部署**（push 觸發重建），途中踩到整站 404 並修復；同時做大量前端微調。

### 部署（B074/B017 done）
- **404 根因**：① zbpack 從 repo 根誤判 static、② docker build 缺 `@types/node` 失敗 fallback、③ zbpack.json app_dir / ZBPACK_APP_DIR 都無效。
- **修法**：加 `@types/node` + **repo 根 Dockerfile**（強制 docker plan，保留 `/app/frontend`+`/app/themes` sibling 供 build glob）+ root `.dockerignore` + `service restart` 推上線。
- **現況**：✅ GitHub auto-deploy 上線，`git push origin main` 自動重建（docker plan + nginx）。自訂網域 **`mini-tw-info.itsmigu.com`**（回 200）。完整報告 `DEPLOYMENT.md §九`。

### rail（軌道）
- 對齊設計 chat9：系統分類 tabs（全部/台鐵/高鐵/捷運+輕軌）+ 可展開縣市排名 + 各系統車次佔比 bar；stat-tile 灰字底部對齊；縣市點入保留地圖車站（filter 該縣市）。
- **補回 32 台鐵大站**（跨 repo）：ETL 誤用 station_points（排除 class 0/1）→ 改用完整 stations.geojson。Supabase rail.stations **503→535**（TRA 212→244）。cache key 升 `rail:stations:v2` 讓舊快取失效。

### SSOT + mock 治理
- 老化指數歷年 / 縣市出生死亡 KPI 改接 demographics 真實資料（取代 mock）；地圖染色（aging/pop/density/area）接真實。
- 新增 `components/common/PendingDataCard`，無真實源的假數字一律「待後續階段補上」：rail 各系統縣市車次、漁業類別組成、離島航線班次、鄉鎮人口排名、用水結構（B058）、縣市出生死亡逐年趨勢。

### 其他 UX
- 消防預設只開火災熱點（stations 預設關）、breadcrumb 去 emoji、分頁順序（基礎統計/人口/軌道/航運/水資源/消防）、footer 連結（data.gov.tw / GitHub repo）、favicon（圓形黑底白 i）、行政區長條圖去內部文字、國土/人口版面改垂直、「都市 vs 鄉村」。

### road_events（早段，跨 repo）
- gis-platform migration 125（`get_road_events_day` + `get_road_events_dates`）已 apply+push；pulse 圖層已 commit（096c1c5，feat/fire-rescue，**未 push**）；collector `ROAD_EVENT_LIVE_INTERVAL=10` 已設。

## 下個 session 接什麼

1. **套用 gis-platform migration 124**（B073，RPC 硬上限，S10 起未套 DB；套前 psql `pg_get_functiondef` 確認簽名）
2. **手機 <900px 版面**（B048/B054，公開後升 P1，split-view 50/50 會溢出）
3. **後端 FastAPI 部署**（B008，解 explode/TGOS 降級）
4. fire 3 placeholder 對接（B066-B068，DB/MV 已齊）/ 水主題 P0（B059-B061）
5. **road_events pulse 圖層 push + browser 驗收**（feat/fire-rescue，096c1c5 未 push；sidebar MONITOR「即時路況」、點群、popup、opacity）
6. PendingDataCard 各處待真實源接通時填回（rail 各系統車次 / 漁業類別 / 航線 / 鄉鎮人口 / 用水結構 / 縣市出生死亡趨勢）

## 跑得起來的東西

- **線上**：https://mini-tw-info.itsmigu.com（GitHub auto-deploy，push 自動重建）
- **本機 dev**：`cd frontend && pnpm dev` → http://localhost:5173
- 主題：home-basics / demographics / rail / maritime（draft-beta）/ fire / water
- View A 全國 / View B 縣市 / View C 水庫詳情

## 等用戶執行 / 拍板

- 套用 migration 124（DB 層 RPC 硬上限）
- road_events pulse 圖層是否 push（feat/fire-rescue 分支）
- 下個方向：手機版 vs 後端部署 vs 既有資料對接

## 開發環境

- Node 23.10 / pnpm 10.17（Docker 內 pnpm@9.15.0）/ psql 14.13 / python3
- Supabase project `utcmcikhvxnohbxchbrs`（pooler 5432），DATABASE_URL 在 gis-platform/.env
- **部署**：GitHub auto-deploy。Zeabur project `6a1946657e81687840b6d363` / service `web` `6a194b4718463d8ee2669f6e`。`git push origin main` 觸發 docker build（root Dockerfile）。build 成功但 deploy 卡 FAILED → `npx zeabur@latest service restart --id 6a194b4718463d8ee2669f6e`。
- VITE_ 變數已設於 service（SUPABASE_URL/ANON_KEY/MAPBOX_TOKEN/DEFAULT_THEME）

## 跨 4 repo 狀態（Session 11 結束）

- **mini-taiwan-info**: 13+ commits 已全 push origin/main
- **gis-platform**: migration 125 + 116 註解 已 commit+push；⚠️ 124 仍未套用 DB（B073）
- **taipei-gis-analytics**: rail ETL 13fc411 已 commit+push
- **mini-taiwan-pulse**: road_events 圖層 096c1c5 已 commit、**未 push**（feat/fire-rescue 無 upstream）
- **data-collectors**: 未動

## 已知小瑕疵（不阻塞）

- road_events pulse 圖層未 push、未 browser 驗收
- migration 124 未套用 DB
- 後端未部署 → explode/TGOS 降級
- 多處 PendingDataCard 待真實源
- B048-B054 手機/響應式延續
- BACKLOG ~115 行，下次 wrap-up 清 P3

## Skill / Harness 狀態（Session 11）

| Skill / Tool | 本 session 觸發 | 備註 |
|---|---|---|
| `/wrap-up` | 1 | 本次 |
| `frontend-design` | 1 | 讀設計 bundle（gzip→tar 解壓 chat9 確認 rail 設計）|
| zeabur:* skills | ~4 | variables / deployment-logs / port-mismatch |
| general-purpose agent | 2 | rail 大站根因追查 + mock 全盤點 |
| Explore agent | 1 | mini-taiwan-info 結構探索 |

- PostToolUse typecheck hook：本 session 多次 `npx tsc --noEmit` 驗證，全綠
- 部署除錯重度用 zeabur CLI（deployment list/log、service network/restart、variable）
