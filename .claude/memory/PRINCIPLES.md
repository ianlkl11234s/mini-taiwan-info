# PRINCIPLES — 不用再溝通的預設

> 達成共識的決策列在這。衝突時新覆蓋舊，舊版搬去 INCIDENTS。
> Append 但可以 update（INCIDENTS 才是 strict append-only）。

---

## 專案層

- **回應語言**：繁體中文（技術詞可保留英文）
- **時區**：Asia/Taipei (UTC+8)
- **Python 指令**：`python3`、`pip3`（不是 python / pip）
- **前端 working dir**：`cd frontend && pnpm xxx`（不要在 root 跑 pnpm）
- **commit prefix**：`feat:` / `fix:` / `docs:` / `memory:` + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

## 架構決策（拍板，不再回頭）

### 2026-05-14: Frontend 用 Vite + React 18 SPA（非 Next.js）

- 理由：與 mini-taiwan-pulse 同模式（已驗證 ~20 RPC loaders）；prototype 是 React 18 + babel；無 SEO 需求；React 19 也可但 18.3 是 prototype 對齊保守選
- 不引入 Tailwind / shadcn（CSS 變數 + prototype globals.css 1504 行 verbatim 已足）

### 2026-05-14: 資料取用 = Supabase 前端直連 anon key

- 理由：gis-platform RLS 已 `anon SELECT all`；資料全公開政府資料；mini-taiwan-pulse 已驗證模式
- TGOS（apikey 機敏）走後端 FastAPI wrapper（Phase 1+）
- service_role key 只在 pipeline（ETL 寫入）使用，不在前端

### 2026-05-14: 縣市代碼三軌

- `id_moi` (VARCHAR(2), A-Z，排除 L/R/S 歷史) — 內政部標準，Supabase PK
- `code3` (TPE/KHH/NTP...) — 前端 state，視覺友善
- `slug` (taipei/kaohsiung...) — 英文 URL
- SSOT 在 `data/counties.yaml`，TS 衍生 `frontend/src/lib/counties.ts`
- 三套對照含 `name_aliases`（含歷史名「臺北縣→F」，給 ETL normalize）

### 2026-05-14: Manifest 規格 v1.1（response_shape 強制契約）

- 所有 KPI 必有 `response_shape: {value, delta?, spark?}`
- `point_profile` / `hook_rules` / `layers_catalog` / `coverage_notes` 全結構化
- 對 v1.0 主題（home-basics 等）`applyManifestDefaults` 自動補 fallback
- Spec SSOT: `docs/04-theme-manifest-spec.md`

### 2026-05-14: 真實資料優先 + LIVE badge

- 所有可接 Supabase 的 KPI 都接，缺 ETL 才 fallback 到 mock
- 即時資料用綠色 `LIVE` badge 標記，user 一眼分辨
- Mock 數字保留在 `frontend/src/lib/mock-data.ts` 作 fallback

### 2026-05-14: View B 縣市水庫用 nearest-centroid 推算

- `reservoir RPC` 只給 `region` (北/中/南/東)，沒給 county
- 不靠 spatial PIP，直接 haversine 對 22 縣市 centroid 取最近
- 邊界縣市可能誤判但對「明顯在縣市中心」的水庫足夠
- 未來改進：admin.counties polygon migration + ST_Contains

## 行為原則（Claude 自律）

### Atomic Commit

- 每完成一個邏輯單元就 commit
- 不把 docs / migration / frontend 合併成一個 mega-commit
- Co-Authored-By 一定加

### 視覺改動必驗證

- 任何改 layout / position / overlap / spacing 的 CSS / component 改動，**必跑 agent-browser 截圖驗證**
- screenshot 路徑 `/tmp/audit-*.png` 系列
- 不要只看 typecheck pass 就 declare done

### Manifest 變動連鎖驗證

- 改 `themes/*.yaml` → 必跑 `pnpm typecheck`
- 改 `data/counties.yaml` → 改 `frontend/src/lib/counties.ts` 同步
- 改 `docs/04-*.md` → 確認 spec 不破壞既有 yaml

### 不誤觸用戶其他變動

- 跨 repo commit 時，用 `git add <specific filename>`，**避免 `git add -A` 或 `git add .`**
- 用戶其他 untracked / modified 不是本 session 改的，**不 commit 也不報告**

### 防禦性 fallback

- 任何外部依賴（Supabase RPC / Mapbox token / yaml parse）失敗時，**fallback 到合理 default**，不要整頁炸
- 用 ErrorBoundary 隔離 panel（MapView WebGL fail 不該炸整頁）

### 用 Task tracking

- 每個 session 用 TaskList + `_STATUS.md` + `.claude/memory/STATUS.md` 三系統並行
- TaskList 是 in-session 即時狀態
- `_STATUS.md` 是 user-facing 進度
- `.claude/memory/STATUS.md` 是 next-Claude-session handoff
