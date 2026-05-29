# Mini Taiwan Info — Zeabur 部署指南

**部署目標**：Zeabur（靜態 SPA，Vite6 build + nginx）
**技術棧**：Vite 6 + React 18.3 + TypeScript 5.7，pnpm（lockfileVersion 9.0）
**上線日期**：2026-05-29
**責任人**：工程團隊

> 部署單位是 `frontend/`（Dockerfile / nginx.conf / .dockerignore 皆在此）。
> 後端 wrapper（FastAPI，TGOS + explode engine）為獨立服務，本文件以前端為主、附 API_BASE_URL 接線說明。

---

## 一、快速開始

### 1.1 前置準備

```
frontend/
├── Dockerfile                 multi-stage（pnpm build → nginx）
├── nginx.conf                 SPA fallback + gzip + 分層 cache-control
├── .dockerignore
└── .env.production.example     環境變數範本
```

```bash
cd frontend
pnpm --version   # 需 v9+（lockfileVersion 9.0）
```

### 1.2 本機驗證

```bash
cd frontend
pnpm install            # 安裝依賴
pnpm build              # tsc -b + vite build
pnpm preview            # 預覽 build 產物 → http://localhost:4173
```

### 1.3 Docker 本機測試（建議部署前執行）

```bash
cd frontend

# Build image
docker build -t mini-taiwan-info-frontend:test .

# 執行容器
docker run --rm -p 8080:8080 mini-taiwan-info-frontend:test

# 驗證 SPA fallback（不存在路徑應回 index.html，HTTP 200）
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/some/spa/route

# 驗證 gzip
curl -s -H "Accept-Encoding: gzip" -I http://localhost:8080/ | grep -i content-encoding
```

> 注意：本機 Docker build 不會帶 Zeabur 面板的環境變數，地圖 / Supabase 會因缺 token 而無法連線，但可驗證 nginx 設定、SPA fallback、gzip、cache header 是否正確。若要本機完整測試，可在 build 時用 `--build-arg VITE_MAPBOX_TOKEN=... --build-arg VITE_SUPABASE_ANON_KEY=...` 傳入。

---

## 二、Zeabur 部署流程

### 2.1 連接 GitHub repo

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com/)
2. 建立新專案 → 連接 GitHub 帳號
3. 選擇 `mini-taiwan-info` repo
4. 選擇部署分支：`main`

### 2.2 設定部署服務

Zeabur 偵測到 `frontend/Dockerfile` → 以 Docker 部署。手動設定時：

```
Build Context Path: /frontend
Dockerfile Path:    frontend/Dockerfile
Publish Port:       8080
```

### 2.3 環境變數設置（Zeabur 後台）

在 Zeabur 環境變數面板逐項設置。所有 `VITE_*` 變數會在 **build 階段**注入並 bundle 進 JS：

| 變數名 | 值 | 說明 |
|------|-----|------|
| `VITE_SUPABASE_URL` | `https://utcmcikhvxnohbxchbrs.supabase.co` | Supabase 專案 URL |
| `VITE_SUPABASE_ANON_KEY` | (從 Supabase 複製) | anon key（RLS public，可公開） |
| `VITE_MAPBOX_TOKEN` | (URL-restricted token) | Mapbox token（見 2.4） |
| `VITE_API_BASE_URL` | `https://<backend>.zeabur.app` | 後端 API 基準 URL（見 2.5） |
| `VITE_GA_ID` | (選填) | GA4 measurement ID |
| `VITE_DEFAULT_THEME` | `home-basics` | 預設主題 |

> Dockerfile 已宣告對應 `ARG`，Zeabur 會把面板變數作為 build-arg 帶入 build 階段。

### 2.4 Mapbox Token 設定（關鍵步驟）

URL-restricted token 是上線必要條件，防止他人盜用前端 bundle 內的 token。

#### 建立 URL-restricted token

1. 登入 [Mapbox Account](https://account.mapbox.com/tokens/)
2. "Create a token"
3. Token name：`mini-taiwan-info-prod`
4. Scopes 勾選：`tiles:read`、`styles:read`、`fonts:read`
5. 勾選 "Restrict to URL(s)"，輸入生產域名：
   ```
   https://your-production-domain.com/*
   ```
   若用 Zeabur 預設域名：`https://*.zeabur.app/*`
6. 建立 token → 複製 → 貼入 Zeabur `VITE_MAPBOX_TOKEN`

#### 驗證 token

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=YOUR_TOKEN"
# 200 = OK
```

### 2.5 API_BASE_URL 設置

| 環境 | 值 |
|-----|----|
| 開發 | `http://localhost:8000` |
| Zeabur 後端服務 | `https://<backend-service>.zeabur.app` |
| 自有後端 | `https://api.your-domain.com` |

後端 CORS 必須允許前端域名：
```
Access-Control-Allow-Origin: https://<frontend>.zeabur.app
```

### 2.6 Deploy

1. Zeabur 後台點 "Deploy"（或 git push 自動觸發）
2. 等待 build（約 3-5 分鐘）
3. 驗證：
   ```bash
   # SPA 首頁
   curl -s -o /dev/null -w "%{http_code}\n" https://<frontend>.zeabur.app/

   # index.html no-cache
   curl -sI https://<frontend>.zeabur.app/index.html | grep -i cache-control
   # → Cache-Control: public, max-age=0, must-revalidate

   # assets immutable（檔名實際 hash 以 build 產物為準）
   curl -sI https://<frontend>.zeabur.app/assets/index-XXXX.js | grep -i cache-control
   # → Cache-Control: public, immutable, max-age=31536000
   ```

---

## 三、環境變數清單

### 必填

- **VITE_SUPABASE_URL** — Supabase 專案 URL（公開）
- **VITE_SUPABASE_ANON_KEY** — anon key（公開，RLS 保護）
- **VITE_MAPBOX_TOKEN** — Mapbox URL-restricted token（公開，已限域名）
- **VITE_API_BASE_URL** — 後端 API 基準 URL

### 選填

- **VITE_GA_ID** — GA4 ID（`G-XXXXXXXXXX`）
- **VITE_DEFAULT_THEME** — 預設主題（預設 `home-basics`）

### 不進 git（本機開發用）

`.env.local` 由開發者本機填寫，已被 `.gitignore` 排除：
```bash
VITE_MAPBOX_TOKEN=pk.eyJ...（本機可用未限域名的 dev token）
VITE_API_BASE_URL=http://localhost:8000
```

---

## 四、上線後監控

### 4.1 Mapbox 配額

**免費層**：50,000 map loads / 月。

1. [Mapbox Account](https://account.mapbox.com/) → Billing → Usage
2. 預警：月用量 > 40,000 啟動優化；超額會被停用。
3. 優化：map instance reuse、減少不必要重新初始化、善用 Mapbox GL JS v3.9 tile cache。

### 4.2 Supabase Egress

**免費層**：每月 bandwidth 額度（超額計費）。

1. Supabase Dashboard → Project → Usage → egress
2. 優化：前端 HTTP cache-control（本 nginx 已設）、收斂 useEffect 重複查詢、egress 實測用 `curl --compressed` 比對壓縮後大小。

### 4.3 Zeabur Logs

Zeabur 後台 → 服務 → Logs：
- nginx error.log：有無 502/503
- build logs：有無編譯錯誤
- Health check：應有定期 200

---

## 五、Rollback 流程

### 5.1 快速 Rollback（Zeabur 已部署版本）

1. Zeabur 後台 → 服務 → Deployments
2. 找到上個穩定版本 → "Rollback" → 確認
3. 等待重新部署完成

### 5.2 Git Revert（代碼級）

```bash
git revert <problematic-commit-hash>
git push origin main
# Zeabur 自動重新 build & deploy（約 3-5 分鐘）
```

### 5.3 環境變數 Rollback

Zeabur 後台 → 服務 → Variables → 修正錯誤變數 → Redeploy（VITE_ 變數改動需重新 build 才生效）。

---

## 六、常見問題

**Q：為何 /assets 用永久 cache？**
A：Vite build 為 JS/CSS 產出含 hash 檔名（如 `index-abc123.js`），版本變即換檔名，可設 immutable 長 TTL。index.html 不含 hash，故 no-cache 以便取得最新檔名映射。

**Q：為何要 URL-restricted Mapbox token？**
A：token 會 bundle 進前端 JS，公開可見；URL restriction 限定只能從指定域名呼叫，避免被盜刷配額。

**Q：如何驗證 SPA fallback？**
A：`curl https://<domain>/any-non-exist-path` 應回 index.html（200）而非 404。

**Q：部署後頁面空白？**
1. Zeabur build logs 有無編譯錯誤
2. 瀏覽器 DevTools Console 有無 JS 錯誤（常見：缺 VITE_MAPBOX_TOKEN / VITE_SUPABASE_ANON_KEY）
3. Network 有無 CORS 錯誤（後端 CORS）
4. `VITE_API_BASE_URL` 是否正確
5. VITE_ 變數改動後需 **重新 build**（非僅 restart）

---

## 七、部署清單

- [ ] `frontend/Dockerfile` 已提交
- [ ] `frontend/nginx.conf` 已提交
- [ ] `frontend/.dockerignore` 已提交
- [ ] `frontend/.env.production.example` 已提交
- [ ] Zeabur 帳號已建立並連接 GitHub
- [ ] 後端服務已部署（或確認開發服務 URL）
- [ ] Mapbox URL-restricted token 已建立
- [ ] Supabase anon key 已取得
- [ ] Zeabur 環境變數已全部設置（VITE_*）
- [ ] 本機 `pnpm build` 通過
- [ ] 本機 `docker build` 通過（建議）
- [ ] Zeabur 首次 deploy 成功
- [ ] 前端 URL 頁面正常載入
- [ ] Mapbox 地圖正常顯示
- [ ] API 請求成功（Network tab）
- [ ] cache-control headers 驗證通過
- [ ] 監控工具已配置（可選）

---

## 八、聯絡資訊

- 問題回報：GitHub issue
- Mapbox 支援：https://support.mapbox.com
- Supabase 支援：https://supabase.com/support

---

## 實際部署紀錄（2026-05-29）

**已上線：** https://mini-tw-info.zeabur.app

| 項目 | 值 |
|---|---|
| Zeabur 帳號 | ianlk11234s（DEVELOPER plan） |
| Project | `mini-tw-info` · ID `6a1946657e81687840b6d363` |
| Service | `web` · ID `6a194b4718463d8ee2669f6e` |
| Environment ID | `6a1946655245baf7fc3dda0c` |
| Region | agent_test（LINODE） |
| 網域 | mini-tw-info.zeabur.app（Zeabur generated） |

### 採用的部署方式：direct deploy 預建 dist（PREBUILT_V2）

> ⚠️ 注意：目前**不是**走 repo 內的 Dockerfile+nginx。`zeabur deploy` 是上傳「已建置靜態檔」直接 serve，不會跑 Dockerfile build。
> 因此目前的 cache 行為是 Zeabur 預設（gzip + ETag/no-cache 重驗證），**非** nginx.conf 裡的 immutable 長快取。
> dist 的 VITE_ 變數是本機 `pnpm build` 時從 `.env.local` baked 進去的。

### 重新部署（改了程式後）

```bash
cd frontend
pnpm build                      # 用 .env.local 的值 baked 進 dist
cd dist
npx zeabur@latest deploy --project-id 6a1946657e81687840b6d363 \
  --service-id 6a194b4718463d8ee2669f6e --json
```

> **務必帶 `--service-id`**，否則會建出重複服務。

### 若要改走 Dockerfile + nginx（取得 immutable 長快取 + auto-redeploy on push）

改用 Git deploy，並在 Zeabur 服務設定把 **Root Directory 設為 `frontend/`**（Dockerfile 在該子目錄），Zeabur 才找得到 Dockerfile。屬日後優化，非上線必需。

### 上線後待辦

- [ ] **Mapbox token 設 URL restriction** → 限 `mini-tw-info.zeabur.app`（token 已 baked，restrict 後免重建）
- [ ] 套用 `gis-platform/migrations/124_rpc_hard_limits.sql`（DB 層 RPC 硬上限）
- [ ] 後端 FastAPI 未部署 → explode/TGOS 功能降級（`VITE_API_BASE_URL` 預設空字串，不影響 Supabase KPI）

---

## 九、改走 GitHub 部署的 404 事件報告（2026-05-29）

> 背景：從「direct deploy 預建 dist（PREBUILT_V2 static）」改成「GitHub repo 自動部署」（需求：push 自動重新部署）。
> 改完線上 `https://mini-tw-info.itsmigu.com/` 回 **HTTP 404**。以下為完整根因鏈與修法，供日後重現時對照。

### 症狀
- 整站 404（含首頁），Zeabur build 顯示「成功」但 serve 不到 app。

### 根因鏈（三層疊加，缺一不可）

**① zbpack 從 repo 根誤判為靜態站**
GitHub 部署時 Zeabur（zbpack）掃描 **repo 根目錄**，但 app 在 `frontend/` 子目錄、根目錄無 `package.json`/`Dockerfile` → zbpack 選了 `zeabur/caddy-static` plan，直接把 repo 根當靜態檔目錄 serve。根目錄沒 `index.html` → **404**。
（對照：原本 direct deploy 是從 `frontend/dist` 上傳，Zeabur 知道內容在哪；改 GitHub 後從根掃描就跑錯。）

**② Dockerfile build 早先就失敗過（缺 @types/node）**
更早嘗試的 docker plan（`frontend/Dockerfile`）build 時 `pnpm build`（`tsc -b`）報錯：
```
scripts/snapshot-static-data.ts: error TS2580 Cannot find name 'process'/'Buffer'
                                  error TS2307 Cannot find module 'node:url'/'node:zlib'/'node:path'
```
原因：`tsconfig.json` 的 `include: ["src","scripts"]` 把 dev 腳本納入 build，但 **`@types/node` 沒列入 devDependencies**。本機 `tsc --noEmit` 會過是因為本機 `node_modules` 剛好有 @types/node（其他套件帶進來），Docker `pnpm install --frozen-lockfile` 則嚴格按 lockfile → 沒裝 → build fail。docker build 失敗後 Zeabur fallback 回 static plan（接 ①）。

**③ 試過但無效的修法（記錄避免再走）**
- ❌ root `zbpack.json` `{"app_dir":"frontend"}` — static builder 不理會，仍 serve repo 根。
- ❌ 服務環境變數 `ZBPACK_APP_DIR=frontend` — 同樣未改變 plan type（仍 static）。
  → 結論：**zbpack 的 app_dir 機制無法把已選 static 的 plan 導回 frontend/**。

### 最終修法（已生效）

1. **加 `@types/node` 到 `frontend/package.json` devDependencies**（commit `1edbb90`）
   - `pnpm add -D @types/node`，lockfileVersion 仍 9.0（相容 Docker 內 pnpm@9.15.0）。
   - 本機 `pnpm build` 驗證綠（dist 正常產出）。

2. **在 repo 根放 `Dockerfile`**（commit `1fd13e5`）— 關鍵
   - zbpack 偵測到**根 Dockerfile** → **必選 docker plan**，不再 fallback static。
   - 該 Dockerfile 以 repo 根為 build context，保留 `/app/frontend` + `/app/themes` 的 **sibling 結構**
     （前端 build 時 `themes.ts` 會 `import.meta.glob("../../../themes/*.yaml")` 讀 repo 根 themes/），
     從 `/app/frontend` 跑 `pnpm build`，產物 → nginx serve。
   - 配 root `.dockerignore`：保留 `themes/`（**不可排除**，build 必需），排除 `data/designs/docs/samples` 縮小 context。
   - 移除無效的 `zbpack.json`。

3. **首次 docker build 成功但 deploy 卡 FAILED → `service restart` 推上線**
   - build image 完整匯出成功，但部署 promotion 卡住（舊 static 仍 RUNNING）。
   - `npx zeabur@latest service restart --id <web-svc>` 後，docker deployment 轉 RUNNING、舊 static REMOVED、URL 回 **200**。

### 驗證（修復後）
| 檢查 | 結果 |
|---|---|
| 首頁 HTTP | 200 ✅ |
| `<title>` / `<div id="root">` / vite assets | 正常 ✅ |
| SPA fallback（任意路徑 → index.html） | 200 ✅ |
| Deployment | docker plan · RUNNING（static 已 REMOVED）✅ |
| 自動部署 | `git push origin main` 觸發 → docker build ✅ |

### 經驗教訓
- **monorepo 子目錄 app 走 GitHub 部署**：最可靠是 **repo 根放 Dockerfile**（zbpack 必認），而非依賴 `zbpack.json app_dir` / `ZBPACK_APP_DIR` / dashboard Root Directory。
- **build 必跑的跨目錄依賴**（此處 `themes/`）：root Dockerfile 的 build context 與 `.dockerignore` 要保留它，且維持原相對結構。
- **`@types/node`**：只要 `tsc` build 範圍含用到 Node API 的腳本（scripts/），就要明列 devDependency，別靠本機 node_modules 巧合。
- **docker build 成功 ≠ 已上線**：deploy promotion 可能卡住，`service restart` 可強制切換到新 image。
- 注意網域：紀錄上線網址為 `mini-tw-info.zeabur.app`，但實際自訂網域是 `mini-tw-info.itsmigu.com`。
