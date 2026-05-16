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

### 2026-05-14: Cycle 流程 = `/water-loop` skill

- 所有資料 / 視覺迭代走 5 階段：Discovery → Plan → Execute → Verify → Commit/Push
- 半自動為預設（3 checkpoint：apply migration 前 / 視覺化拍板 / commit-push 顆粒度）
- 不自動 apply migration、不自動 push、不自動 amend commit
- 詳見 `.claude/skills/water-loop/SKILL.md`
- 觸發詞：`/water-loop`、「跑下一輪」、「接下個資料」、「修一輪 P0」

### 2026-05-14: 「LIVE」用詞嚴守 — 不只 badge，溝通也不能亂用

跟下面 LIVE 嚴格定義配對。**「LIVE」這個字只能形容資料本身**（collector cron + 上游 realtime），不能當「接通真實資料 / 從 mock 改 DB / 從 placeholder 變有東西」的代名詞。

| ❌ 不該說 | ✅ 應該說 |
|---|---|
| 「ViewB 水質 tab LIVE 接好」 | 「ViewB 水質 tab **接通真實資料**」 |
| 「6/6 KPI 全 LIVE」 | 「6/6 KPI **接通真實資料**（其中 N 個真 LIVE：collector cron）」 |
| 「ETL 跑完自動 LIVE」 | 「ETL 跑完自動接通真實資料」 |
| 「接 RPC 變 LIVE」 | 「接 RPC 接通真實資料」 |

**用法守則**：
- 「LIVE」只描述「DB 內的某張表 / 某個 KPI」本身，且必須符合「collector cron + 上游 realtime」雙條件
- 描述「實作進度」「從 mock 改成 DB」「接 RPC 完成」一律用「**接通真實資料**」
- commit message / STATUS / BACKLOG / 對話皆遵守
- 介面 UI 同步：LIVE badge 也只用在真 LIVE 資料，其他用 `DataAgeBadge`

**為什麼這條重要**：違反會造成 user 對「哪些資料即時、哪些其實是 backfill」的判斷錯誤；mini-taiwan-info 給 22 縣市公開儀錶板，標 LIVE 等於對外承諾即時性，名實不符會傷信任。

### 2026-05-14: LIVE badge 嚴格定義 = data collector 持續抓的才叫 LIVE

User 在 Cycle A 拍板的重要分隔：

**LIVE = data collector 設了 cron 自動持續抓**（上游有 realtime / 高頻更新 + 我們有設排程跟著拉）

**不是 LIVE 的標示方式**：
- 月 / 季 / 年度更新 → UI 標「資料時間：YYYY-MM-DD」（最新採樣日）
- 已停採 / 半年以上未更新 → 標「資料時間：YYYY-MM-DD（已停採 / 半年未更新）」
- 一次性 backfill 後不再更新 → 同上「資料時間」
- Mock / 未接 → placeholder

**整合新資料集的決策流程**（cycle 內必做）：
1. 上游 API 是否 realtime / 高頻？
2. **是** → 跟 user 討論「要不要加進 data collector 跑 cron」 → 加了才能標 LIVE
3. **否（月/季/年 batch）** → 一次性 backfill，UI 標資料時間，**不標 LIVE**

**已知狀況**：
- collector 部署在網路上自動跑（不在 .github/workflows，在別處 — 待 user 確認 location）
- 蓄水率 / 雨量 = 真 LIVE（collector cron 持續跑 + 上游 API realtime）
- 水庫水質 / 地下水質 / LPCD / 接管率 = **不是 LIVE**，應標資料時間
- 各 dataset 真實 LIVE 狀態待 user 提供清單後 audit

**對 mini-taiwan-info code 的影響**：
- 現有 ViewA/B/C 內所有 LIVE badge 都要 audit 一輪
- 加 freshness 指示 component（含 staleness 級別：即時 / 日 / 月 / 年 / 已停）
- `themes/water.yaml` data_sources 應加 `freshness_class` 欄位驅動 UI

**這條原則覆蓋 2026-05-14 原 PRINCIPLES「真實資料優先 + LIVE badge」的舊定義**（舊定義含糊把「DB 真資料」當 LIVE）。

### 2026-05-14: Secret 永遠走 .env

- 不在 prototype / mockup / chat log / commit message 內留任何 token / API key
- commit 前若不確定，跑 grep：
  ```bash
  grep -rn "pk\.eyJ\|sk_\|AKIA\|ghp_\|gho_" \
    --include="*.{js,jsx,ts,tsx,md,yaml,json}" .
  ```
- 已 commit 進歷史的 secret，走 PB-07 `git filter-repo --replace-text` 移除

### 2026-05-15: PostgREST exposed schema 限制 → public schema wrapper 模式

Supabase Cloud 的 PostgREST 預設只 expose `public` schema；其他 schema（`fire`、`demographics` 等）需在 Dashboard → Settings → API → "Exposed schemas" 手動加。

**Claude 無法 CLI 改這個設定**（不是 SQL，是 Supabase 平台層的 config），所以：

- 新 schema 上線時，**寫一個 migration 在 `public` 建 wrapper views + RPCs**
- View 用 `WITH (security_invoker = true)` 保留 RLS pass-through
- RPC wrapper 用 `LANGUAGE sql STABLE SECURITY INVOKER` 包原 schema function
- 命名慣例：`public.{schema}_{table_or_function}`（如 `public.fire_cause_taxonomy`、`public.fire_aggregate_count`）

**為什麼這條重要**：Session 5 試圖用 `withSchema("fire")` 直接連 fire schema，前端報 "Invalid schema: fire"。打 PostgREST 配置牆才知道要 wrapper。下次開新 schema 主題（demographics / safety / ...）直接寫 wrapper migration 一起 apply。

**範本**：`gis-platform/migrations/104_fire_public_wrappers.sql`

### 2026-05-15: KPI grid 響應式斷點規格

對應元件：`.kpi-grid.cols-{2,3,4}`

| viewport | cols-4 | cols-3 | cols-2 |
|---|---|---|---|
| ≥ 1500px | 4 欄 | 3 欄 | 2 欄 |
| 900-1500px | 2×2 | 3 欄保留 | 2 欄保留 |
| < 900px | 1 欄 | 1 欄 | 1 欄 |

**為什麼 1500 而非 1280**：dashboard pane 在「左地圖 60% / 右儀錶板 40%」layout 中只占 viewport 40%；要讓每張 KPI card 有 ≥ 200px 容身空間，cols-4 至少需 dashboard pane 880px → viewport 2200px。實務上 1500px 是「窄但仍可看」的折衷。

**配套規則**：
- `.kpi-value` 字級用 `clamp(22px, 2.4vw, 32px)` 自動縮放
- `.kpi-label` + `.kpi-trend` 加 `overflow:hidden + text-overflow:ellipsis` 防截斷文字超出 card
- `.dashboard-pane` 必加 `overflow-x:hidden + min-width:0`（防內部超寬產生橫卷）

**Sibling 規則**：任何 fixed-column grid（如 `.fire-s4-grid`）在 dashboard pane 內**不要用固定 px 欄寬**（如 `1fr 320px`），否則窄時 1fr 那欄被擠垮。改用 `1fr 1fr` 或單欄 `1fr` stacked。
- placeholder 慣例：`__MAPBOX_TOKEN_PLACEHOLDER__` / `__SUPABASE_ANON_KEY_PLACEHOLDER__` 等（GLOSSARY 收錄）

### 2026-05-16: 雷達圖 / score-based 圖表 — 統一 score 公式（外圈=表現好）

混 higher-better 與 lower-better 軸的雷達圖必須統一 normalized score：

```
higher-better 軸:  score = v / max
lower-better 軸:   score = 1 - v / max
```

**外圈 (score=1) = 該軸表現好**，整體 polygon 大 = 體質好，verdict 用 `diff > 0 = better` 簡化。

**禁止**：直接 `v / max` 不分 better 方向，會讓火災密度 14 = 外圈（「最危險」）跟分隊密度 14 = 外圈（「最好」）混在同一個 polygon 內視覺意義矛盾。

**對 null 軸 fallback**：city polygon 在 null 軸用 avg score 不塌陷，verdict 排除 null 軸。

Reference: B046 ViewBFire `FireRadarCard.norm()`，codex review 2026-05-16 抓到方向反向 bug。

### 2026-05-16: 移植 design bundle 元件 — JSX + CSS 必須一併移植

寫 component 時對應的 className 必須有 CSS 規則，否則 dev server 看起來「跟 word 沒兩樣」一片純文字（grid / background / border 全 fallback 預設）。

**SOP**：
1. Read 完整 jsx file
2. Grep design bundle 的 `styles.css` 找所有 className 區段（如 `grep -n "fire-radar-card\|frc-\|fcm-\|fbl-" styles.css`）
3. TS strict 化 JSX 移植到 `frontend/src/components/`
4. **必須**：append 對應 CSS 區段到 `globals.css` 對應主題段
5. 確認 design 用的 CSS 變數（如 `--accent-fire-deep` / `--accent-fire-soft`）在 globals.css `:root` 已定義
6. 加響應式 media query 防 dashboard pane 窄時（< 1200px）擠垮

**典型陷阱**：Session 5 移植 fire ViewA 時只 append 用到的 fire-* CSS（fire-bar-row / fire-table / fire-timeline / s4-grid），等 ViewB 加 fire-radar-card / fcm-row / fire-station-grid / fire-buffer-legend / fire-risk-bar 才爆 → 一勞永逸把整套主題 fire-* CSS 一起移植才不會踩坑。

詳見 PB-12。

### 2026-05-16: Mock 0 值要區分 missing data vs 真實 density 0

當 mock 對部分縣市/類別「沒這資料」時，**設 null 而非 0**，下游計算（雷達/平均/verdict/排名）一律過濾 null 跳過該 entry。

**錯誤示範**：`FIRE_MOCK_BY_COUNTY.HUA.hydrants = 0`（花蓮無消防栓 dataset） → 雷達拿來除 area_km2 = 0 density → higher-better 軸下永遠是「比全國差」誤判。

**正確做法**：mock 內維持 0 表示 raw data 缺，但前端轉成 view 時用 `value > 0 ? value / divisor : null`，雷達 city polygon 對 null fallback 到 avg score 不塌陷，avg 計算過濾 null（如 hydrant 平均只算 4 都樣本），verdict 排除 null 軸。

Reference: B046 ViewBFire `FireRadarCard.cityVal.hydrantDensity`，codex review 2026-05-16 抓到。

### 2026-05-16: 卡片就地展開元件 root 必加 stopPropagation

KPICard root `<div className="kpi-card" onClick={onExpand}>` 整張卡綁 toggle。任何放在 `explodeContent` 裡的 interactive child（toggle / 收起按鈕 / select / link）點擊都會 bubble 到 root 觸發 onExpand 收回卡片。

**規則**：任何給 KPICard `explodeContent` 用的展開元件，root container 必加 `onClick={(e) => e.stopPropagation()}` 包整層。額外，需要 close 行為的按鈕（收起 / cancel / 確定）onClick 也雙重 `stopPropagation`。

**為什麼**：KPICard 是「整張卡點擊 = expand toggle」設計（cursor:pointer + hover lift 暗示），這 UX 不應破壞，但內部互動必須能獨立運作。stopPropagation 是兩者並存的唯一解。

**Sibling**：未來 PointProfile / RankBars / 任何「整 row/卡 clickable」元件加可互動 child，都要套這條。

Reference: FireKpiExplode.tsx:91，B047 agent-browser 互動測試 2026-05-16 才發現。codex review 對事件流盲區（見 INCIDENTS 同日條目）。
