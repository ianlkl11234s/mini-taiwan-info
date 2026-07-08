# Mini Taiwan Info · 實作狀態追蹤

> **Living document**。每完成一個 task / 做一個決定 / 發現新 backlog，就更新這份檔。
> 一日一次同步：每天結束時對齊 TaskList tool 與本檔。

**最後更新**：2026-05-30 (S12 — spawn 協作工作流固化 + 6 主題大量 mock→真實 + SEGIS 民國114 人口 + 全主題稽核修復 Batch1-4 + about 分頁；詳見 `.claude/WAVE_REPORT.md` / `.claude/AUDIT_MASTER_PLAN.md`)
**當前 Phase**：水/消防/人口/基礎統計/海事/軌道 6 主題上線且**大量 mock 已換真實**；下一步 = socioeconomic 第 7 主題（從零建）。三 repo 已 push 同步。
**當前 Focus**：📍 socioeconomic 主題從零建（資料+後端+前端，用 spawn 工作流）；縣市年度出生死亡彙總；老化指數歷年口徑統一
**待人工確認**：rail/maritime 22 縣市 choropleth 著色（headless 測不到，需真實瀏覽器目視）
**用詞守則**：「LIVE」嚴格定義為 collector cron + 上游 realtime；其他用「接通真實資料」
**用詞守則**：「LIVE」嚴格定義為 collector cron + 上游 realtime；其他用「接通真實資料」

---

## 📊 Phase 進度總覽

| Phase | 名稱 | 估時 | 狀態 |
|---|---|---|---|
| **0a** | Foundation refactor（manifest + SSOT） | 1 天 | ✅ 完成 2026-05-14 |
| **0b** | Frontend Vite SPA 骨架（核心） | 1 天 | ✅ 完成（dev server 已啟動驗證） |
| **0c** | View A 真實資料接入（含 2 ETL） | 2-3 天 | ✅ 完成 |
| **0c-C** | 22 縣市 ranking + choropleth + explode + hero 接通真實資料 | 30 min | ✅ 完成 |
| **0b+** | 補完 PointProfile / Charts / View B-D 元件 | 1-2 天 | 🟡 2/5 完成（A-1, A-2 ✅） |
| └ A-1 | PointProfile 三模式 | 0.5 天 | ✅ 完成 |
| └ A-2 | TwoSectionLayers 控制 | 0.5 天 | ✅ 完成 |
| └ A-3 | View B 縣市儀錶板（7 tabs，4 real + 3 placeholder） | 1 天 | ✅ 完成 2026-05-14 |
| └ A-4 | View C 水庫詳情頁（1 年 trend + 自動跌破標記） | 0.5 天 | ✅ 完成 2026-05-14 |
| └ A-5 | View D 比較模式 | 0.5 天 | ⬜ 待開工 |
| **0d** | Flood MV ✅ + Rain monthly MV (Backlog) | 0.5 天 | ✅ 完成 — 6/6 KPI 接通真實資料 |
| **0e** | 「6/6 KPI 全跑通真實資料」驗收 | 0.5 天 | ✅ 達成 |
| **Cycle 1** (S3) | 3 P0 fix + secret scrub + /water-loop skill 固化 | 1-2 hr | ✅ 完成 2026-05-14 |
| **Cycle A** (S4) | 水質測站 BOD/DO 接通真實資料 + DataAgeBadge + LIVE 用詞嚴守 | 2 hr | ✅ 完成 2026-05-14 |
| **Cycle B** (S4) | ViewB IA v2 依水循環層 7 tabs 重組 | 25 min | ✅ 完成 2026-05-14 |
| **Cycle A2** | epa_river pipeline diff (commit 88353ae) 未 run | 1-2 hr run time | ⬜ user 拍板 run |

**Phase 0 預估總工期**：5-6 天（單人）

---

## ✅ Phase 0a · Foundation Refactor

| # | Task | 狀態 | 產出 |
|---|---|---|---|
| 0a-1 | 鎖死縣市代碼 SSOT | ✅ 2026-05-14 | `data/counties.yaml` |
| 0a-2 | 升級 theme manifest spec 加 response_shape + point_profile | ✅ 2026-05-14 | `docs/04-theme-manifest-spec.md` v2、`themes/water.yaml` v1.1 |
| 0a-3 | Supabase reference.counties migration | ✅ 2026-05-14（檔案已寫，apply 由用戶執行） | `gis-platform/migrations/093_reference_counties.sql` |

**Phase 0a 完成備註**：
- `home-basics.yaml` / `fire.yaml` / `socioeconomic.yaml` 升級到 v1.1 spec **延後到 Backlog**（這些主題目前 disabled，MVP 不需要）
- `_template.yaml` 也未升級到 v1.1，加入 Backlog
- 093 migration 已寫 **待用戶 apply 到 Supabase**：`psql $DATABASE_URL -f gis-platform/migrations/093_reference_counties.sql`
- 水資源主表（`rain_gauge_readings`, `flood_hazard_zones`, `water_reservoirs`）加 `county_id` 派生欄的 migration 延後到 Phase 0c（接 LPCD / 接管率 pipeline 時一併處理）

**Decisions made**：
- (2026-05-14) 縣市代碼採三軌：`id_moi` (A/B/C 內政部) + `code3` (TPE/KHH 視覺友善) + `slug` (taipei 英文 URL) — SSOT 由 `data/counties.yaml` 維護
- (2026-05-14) `name_aliases` 內含「臺/台」與歷史名（臺北縣 → F），ETL pipeline 用這張表 normalize

---

## ✅ Phase 0b · Frontend Vite SPA 骨架（核心完成）

| # | Task | 狀態 | 產出 |
|---|---|---|---|
| 0b-1 | `frontend/` 初始化（Vite + React 18 + TS） | ✅ | `package.json` / `vite.config.ts` / `tsconfig.json` 等 9 個配置檔 |
| 0b-2 | Counties SSOT TypeScript 衍生 | ✅ | `src/lib/counties.ts`（手寫對齊 yaml；regen 腳本 Backlog） |
| 0b-3 | Supabase client + Mapbox token 設定 | ✅ | `.env.example` / `src/lib/supabase.ts` / `src/lib/mapbox.ts` |
| 0b-4 | 移植 styles.css + design tokens | ✅ | `src/styles/globals.css`（1504 行 verbatim） |
| 0b-5 | App shell + TopBar + ThemeSwitcher + Map shell | ✅ | `src/components/chrome/` + `src/components/map/` |
| 0b-6 | Manifest-driven ViewA generic renderer | ✅ | `src/components/views/ViewA.tsx`（無 theme 三元式） |
| 0b-7 | 跑通：mock data 渲染 + 22 縣市 choropleth | ✅ | `App.tsx` + `mock-data.ts`，待用戶 `pnpm dev` 驗證 |

**Stack 拍板（2026-05-14）**：
- Vite 6 + React 18.3 + TypeScript 5.7
- `@supabase/supabase-js` 2.x 直連（anon key）
- Mapbox GL JS v3.9.0
- `js-yaml` 讀 themes/*.yaml（`import.meta.glob` raw）
- `lucide-react` icons
- 不引入 Tailwind / shadcn（CSS 變數已足夠；Backlog 若需要再加）

**核心產出（27 個檔案，~2,250 行 TS + 1,504 行 CSS）**：
```
frontend/
├── package.json, vite.config.ts, tsconfig.json (×2), index.html, README.md, .env.example, .gitignore
├── public/data/tw-counties.geo.json        460KB 簡化邊界
├── src/
│   ├── main.tsx                            entry
│   ├── App.tsx                             state machine (A/B/C/D + theme + county + compare)
│   ├── vite-env.d.ts                       env types
│   ├── styles/globals.css                  1504 行 design tokens + 完整樣式
│   ├── lib/
│   │   ├── types.ts                        451 行 ThemeManifest TS interfaces
│   │   ├── counties.ts                     22 縣市 SSOT + normalizeName helper
│   │   ├── supabase.ts                     anon client + multi-schema
│   │   ├── mapbox.ts                       token + styles + ramps + buildChoroplethExpression
│   │   ├── themes.ts                       glob load yaml + getThemeList
│   │   ├── mock-data.ts                    從 prototype data.js 移植
│   │   ├── format.ts                       fmt.num/pct/pp/datetime
│   │   └── api.ts                          backend wrapper client (TGOS 用)
│   └── components/
│       ├── chrome/{TopBar,Breadcrumb,ThemeSwitcher}.tsx
│       ├── kpi/KPICard.tsx                 含 trend badge + expand
│       ├── map/{MapView,MapLegend}.tsx     22 縣市 choropleth + tooltip + 自動 normalize 名字
│       └── views/ViewA.tsx                 manifest-driven 全台概覽
```

**Phase 0b 完成範圍**：
- ✅ `pnpm install && pnpm dev` 後（用戶執行）應該看到：水主題 View A 全台地圖 choropleth、6 個 KPI 卡（mock）、TOP 5 / BOTTOM 5 LPCD 排名、點 KPI 展開 22 縣市排序爆炸圖、底部主題列、切換 home 主題顯示老化指數
- ✅ Manifest-driven：所有 KPI 都從 `themes/water.yaml overview.kpis[]` 渲染，不寫死
- ✅ 縣市代碼 SSOT 串通：地圖 GeoJSON 自動 normalize 中文名 → id_moi → code3
- ✅ Mapbox tooltip + click → goCity

**Phase 0b 已知遺漏（待 Phase 0b+ 補完）**：
- ❌ PointProfile 元件（manifest 規格已有，渲染待寫）— prototype 的「蓄水率分布桶 / 按地理區 / 散布圖」三模式
- ❌ Sparkline / TrendChart / Donut / Scatter 等 chart primitives — KPI 卡上 sparkline 暫缺
- ❌ TwoSectionLayers（地圖左上著色指標 radio + 點位圖層 checkbox）
- ❌ View B 完整版（目前 placeholder）— 4 tab + KhhOverview + KhhReservoirs
- ❌ View C 阿公店水庫詳情頁
- ❌ View D 比較模式
- ❌ TweaksPanel（density / radius / accent 切換）
- ❌ 40 水庫 points on map（資料已 mock 好，渲染待加 layer）
- ❌ scripts/regen-counties.ts（從 yaml 自動生成 ts）

**驗證指令（給用戶）**：
```bash
cd /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/mini-taiwan-info/frontend
pnpm install
cp .env.example .env.local
# 編輯 .env.local 填入：
#   VITE_SUPABASE_ANON_KEY=（從 gis-platform/.env 拷貝）
#   VITE_MAPBOX_TOKEN=__MAPBOX_TOKEN_PLACEHOLDER__   （從 Mapbox dashboard 拿，dev 可用 unrestricted token，上線換 URL-restricted）
pnpm typecheck   # 預期：可能有少數 unused param warning
pnpm dev         # 開 http://localhost:5173
```

---

## 🟡 Phase 0c · View A 真實資料接入

| # | Task | 狀態 | 產出 |
|---|---|---|---|
| 0c-1 | 接 4 個 ready KPI 真實資料 | ✅ 2026-05-14 | `frontend/src/lib/queries/water.ts` + `hooks/useWaterKpis.ts` + ViewA LIVE badge |
| 0c-2 | LPCD pipeline (datagov_8316) | ✅ 2026-05-14（檔案已寫，待 apply + run） | pipeline + migration 094 + registry |
| 0c-3 | 接管率 pipeline (datagov_26815) | ✅ 2026-05-14（檔案已寫，待 apply + run） | pipeline + migration 095 + registry |
| 0c-4 | LPCD + 接管率 查詢預先寫好（ETL 跑完自動接通真實資料） | ✅ 2026-05-14 | `fetchLpcdLatest` / `fetchSewageCoverageLatest` / `fetchGovernanceSummary` |

**Phase 0c 完整執行結果**（截圖 `/tmp/miniti-5live.png`，2026-05-14 12:25）：

| KPI | 數字 | 接通真實資料 | 比對 mock |
|---|---|---|---|
| 全國蓄水率 | **56.7%** | ✅ | mock 72.3% — 真實偏低 |
| 24hr 全國均雨量 | **18.7mm** | ✅ | mock 12.4mm |
| 高警戒水庫數 | **11 座** | ✅ | mock 4 座 — 真實是南部缺水的反映 |
| 淹水高潛勢面積 | 18.3% | ⏳ mock | 待 Phase 0d MV |
| 全國平均 LPCD | **273L** | ✅ | mock 284L — 接近 |
| 全國接管率 | **52.8%** | ✅ | mock 87% — 真實狀況糟很多 |

**DB 狀態驗證**（執行前後對比）：
- 執行前 public.* = 70 表
- 執行後 public.* = 72 表（新增 2：water_usage_yearly + sewage_coverage_yearly）
- 新增 reference schema 1 表（counties，22 列）
- **舊 70 個表完全沒動到**
- water_usage_yearly: 374 列（22 縣市 × 17 年 2008–2024）
- sewage_coverage_yearly: 22 列（2024 一年，上游只提供最新）

**40 水庫點位 RPC**：拿到 37 列（geometry table 還有 3 個缺座標），地圖在真實 Chrome 顯示紅/黃/綠依蓄水率

**待 user 執行**（解鎖剩 2 個 KPI + 22 縣市 ranking 真實資料）：
```bash
# 1) Apply 兩個 migration
psql $DATABASE_URL -f /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/gis-platform/migrations/094_water_usage_yearly.sql
psql $DATABASE_URL -f /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/gis-platform/migrations/095_sewage_coverage_yearly.sql
# (還沒 apply 過 093 reference.counties.sql 的話也跑一下，094/095 要 FK 到它)

# 2) 跑兩個 pipeline 灌資料
cd /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/taipei-gis-analytics
python3 pipelines/socioeconomic/datagov_8316_lpcd.py --full      # 374 列：22 縣市 × 17 年 LPCD
python3 pipelines/infrastructure/datagov_26815_sewage.py --full  # 接管率 22 縣市 × 多年

# 3) 重新整理瀏覽器 → 全部 6 KPI 應該都接通真實資料（其中 2 個 collector cron 真 LIVE）
```

**Pipeline 階段發現**（小驚喜）：
- LPCD 上游 schema 比 spec 簡 — 沒 domestic / business 拆分，schema 內 2 欄保留為 NULL（後續若有新版資料可補）
- 接管率上游有 4 個普及率分項（公共/專用/建築物/Total）— migration 全部存下來，KPI 用 Total
- 兩個 pipeline 都已 dry-run 驗證上游 endpoint 可達

**執行階段發現的 bug + 修法**：
- LPCD pipeline 的 `get_max_year_in_db` 把「表存在但是空」誤判為「表不存在」（`MAX(year) → NULL`）。已拆出 `table_exists()` 獨立判斷，修在 `pipelines/socioeconomic/datagov_8316_lpcd.py:269`

**Ready 資料來源（不必 ETL）**：
- `reservoir_situation_v` — 全國蓄水率 / 高警戒水庫數
- `realtime.rain_gauge_readings` + `get_rain_gauge_latest()` — 24hr 均雨量
- `public.water_reservoirs` + `get_reservoir_status_latest()` — 40 水庫點位

**Pipeline 要新寫**：
- LPCD (datagov_8316) → `public.water_usage_yearly(county_id, year, lpcd, ...)` 16 年資料
- 接管率 (datagov_26815) → `public.sewage_coverage_yearly(county_id, year, coverage_pct, ...)`

---

## ⬜ Phase 0d · Materialized Views

| # | Task | 狀態 | 產出 |
|---|---|---|---|
| 0d-1 | 淹水高潛勢面積 MV by 縣市/scenario | ⬜ | `gis-platform/migrations/094_flood_hazard_pct_by_county.sql` |
| 0d-2 | 縣市月雨量 MV | ⬜ | `gis-platform/migrations/095_rain_gauge_monthly_by_county.sql` |

---

## ⬜ Phase 0e · 驗收

對照 `docs/09 §L` 的「假主題跑通」清單，改成「水主題 View A 真實資料跑通」：

```
□ 開站 → 看見 6 個水資源 KPI（含 LPCD + 接管率，真實數字）
□ 22 縣市 choropleth 依 LPCD / 蓄水率 / 接管率 / 24hr 雨量 / 淹水佔比 切換
□ 40 水庫 points 顯示，依蓄水率紅黃綠
□ 點任一縣市進 View B（high-level，不必完整）
□ 點 KPI → 爆炸圖展開 22 縣市排序
□ 點位概況三個 mode 都用真實 ALL_RESERVOIRS 資料
□ DataSourceBadge 顯示真實 updated_at
□ 響應式 1280+ 桌機 OK
```

---

## 📥 Backlog（未排程，發現時記錄）

### 🔴 結構性問題（audit 發現，未完全解掉）
- **`hook_rules` 規範化**：(audit-2 R3) `themes/water.yaml:107-113` 的 hook_rules 仍是文件。要嘛寫一個 `hook_engine.ts` 評估條件、要嘛從 spec 刪掉。Phase 0a 只先 freeze 規格、不寫引擎，Phase 1 補。
- **`crosslink` 規範化**：(audit-2 R3) `water.yaml:294-303` 同上，目前無對應 UI。`<InsightCard>` component 設計遺失。
- **`coverage_notes` 對齊 UI**：(audit-2 R3) prototype `<PlaceholderTab warning>` 是 hardcoded `<></>`，未消費 `meta.coverage_notes[].counties`。Phase 0b 順手修。
- **`tabs[].layers` driven**：(audit-2 §4) `app.jsx:219-225` mapLayers 物件 hardcoded。Phase 0b 改為從 manifest 讀。
- **`theme === "water" ? ViewA_Water : ViewA_Home` 三元式**：(audit-2 §2) 加第 5 主題會炸。Phase 0b 重構為 generic `ViewA(manifest, data)`。

### 🟡 資料品質（audit-3 發現）
- **`water_reservoirs` 沒 county_code**：(audit-3 §C-1) 需透過 `reference.reservoir_geometry` 空間 join 補入。Phase 0a-3 順手處理。
- **`rain_gauge_readings.county` 是 free-form TEXT**：「臺/台」spelling drift。Phase 0a-3 加 trigger normalize 或 view 層處理。
- **`reservoir_status` ↔ `water_reservoirs` 無 FK**：(audit-3 §C-6) collector 寫錯 id 會 silent orphan。Phase 1 提加 FK migration。
- **`sewage_treatment_plants` 82 列 lat/lng 全 NULL**：(audit-3 §C-5) 待 TGOS 反查地址。Phase 1。
- **`storm_drainage_*` 只 3 縣市**：(audit-3 §C-5) 雨水下水道、滯洪池、地下水分區、漏水率、工業用水都有 coverage 洞 — 已記在 `water.yaml meta.coverage_notes`，UI 處理是 Backlog。

### 🟢 Mockup 補齊（已實作但要 production-ize）
- **`view-b.jsx` 4 個 tab 是 `PlaceholderTab`**：水質 / 防洪 / 基礎設施 — Phase 1.5 補真實資料
- **`view-c.jsx` 阿公店水庫 timeseries 是 seed-rand mock**：要接 `realtime.reservoir_status` history。Phase 0c 後段
- **`view-d.jsx` 比較模式 `LPCD_COMPARE` 是 mock**：要接真實縣市 × 年 LPCD。Phase 0c LPCD pipeline 跑完後可接
- **`KHH_WWTP` 12 座座標是「示意」**：(data.js:147) 要走 TGOS 反查。Phase 0c 末
- **`KHH_DISTRICTS_LPCD` 38 區僅前 8 名 mock**：(data.js:364) 鄉鎮 LPCD 來源不明，可能 not feasible。Backlog

### 🟢 Phase 0d 延伸（已主動延後）
- **月雨量 MV** (`rain_gauge_monthly_by_county`)：原 Phase 0d 規劃，但目前無 view 使用（ViewB 用 LPCD/接管率歷年；ViewC 用 reservoir timeseries）。月雨量是 nice-to-have，待 Phase 1 月雨量 trend UI 上線時再做。

### 🔵 規格延伸（未來主題）
- 5-8 主題：medical / environment / realestate — 仍 `disabled: true`（fire 已上線；**population→`demographics` / transport→`rail` / 航運→`maritime` 已產 draft manifest + 詳規 + Sprint 0 handoff，見本檔末三主題段**）
- mockup 的 Tweaks panel（density / radius / mapStyle / waterAccent）—Phase 1 才上線
- 暗色模式 — 已有 CSS 變數，沒驗證；Phase 1
- 手機版 — 「這輪只做桌機 1280+」(chat1 user 確認)，手機版 Phase 2
- `home-basics.yaml` / `fire.yaml` / `socioeconomic.yaml` 升級到 v1.1 spec（Phase 0a 延後）
- `themes/_template.yaml` 升級到 v1.1 + `_schema.json` JSON Schema（Phase 0a 延後）
- `themes/` CI validator（pre-commit hook + GitHub Actions）— docs/09 §C

### 🟣 DevOps
- TGOS MOI Apikey 申請 — 後端用，Phase 0c 才需要
- Mapbox 申請 URL-restricted token（目前用 prototype 的 dev token）— 上線前
- CI/CD GitHub Actions — Phase 0b 末
- Vercel + Zeabur 部署 — Phase 0e 驗收後

---

## 📝 Decision Log

| 日期 | 決定 | 理由 |
|---|---|---|
| 2026-05-14 | Frontend 用 **Vite + React 18 SPA**（非 Next.js） | 與 mini-taiwan-pulse 同模式；prototype 是 React 18，移植最直接；無 SEO 需求 |
| 2026-05-14 | 資料取用 = **Supabase 前端直連 anon key**，TGOS 走 FastAPI | gis-platform RLS 已 anon SELECT；資料全公開；mini-taiwan-pulse 已驗證 |
| 2026-05-14 | 縣市代碼三軌：`id_moi`+`code3`+`slug` | id_moi 對齊內政部 / Supabase；code3 對齊 prototype 既有；slug 對齊 URL |
| 2026-05-14 | MVP 範圍 = **View A 完整 + 含 2 個 ETL**（LPCD + 接管率） | 6 KPI 全真實資料；不再有 mock |
| 2026-05-14 | manifest 先重構（R1+R2+R3）再寫 frontend | 否則 hardcode 進 view 後重構超痛 |
| 2026-05-14 | Phase 0 拆 5 子階段（0a-0e） | 每子階段 0.5-2 天，可量化進度 |
| 2026-05-27 | 新增人口/軌道/航運 3 主題（draft）；定錨「**靜態統計、不放即時**」（即時歸 mini-taiwan-pulse）+「**缺口先補再上線**」 | info 定位為統計策展；8 項缺口排 Sprint 0 前置 ETL，前端 view 在其後 |

---

## 🔗 關聯位置

- TaskList tool（即時狀態）：每個 task 都有 ID 對應
- `HANDOFF.md`：上一個 session 的銜接書（保留作歷史紀錄）
- `designs/v02-claude-design-2026-05-14/`：mockup SSOT
- `data/counties.yaml`：縣市 SSOT
- `themes/water.yaml`：水主題 manifest（將升級 v1.1）

---

## ▶️ 下一步 — 水循環體系 Roadmap（2026-05-14 Cycle 1 後拍板）

完整 roadmap 看 **[docs/themes/water-system-cycle.md](docs/themes/water-system-cycle.md)**。

**TL;DR**：
- Phase 0 已收尾，6/6 KPI 接通真實資料（真 LIVE 只 2-3 個 collector cron）
- 後端水資源資料 ~78% 已就緒（14 表已 ingest，11 個前端未接）
- 接下來 11 個 cycle（A-L）按 Tier 1-5 排序依「補弱層 + ROI」推進

### First Move — Cycle A 已完成 ✅，推薦下一個跑 **Cycle E 河川流量 + map layers**

Cycle A + B 已完成（2026-05-14 S4）。新 First Move 候選：

**Cycle E** — 河川流量 188 站 + river_lines 2015 條 + river_basins 116 個 map layer
- 資料完全就緒（後端 collector cron 真跑）
- ViewB「河川」tab 流量 placeholder → 接通真實 LIVE 資料
- 0.5 天

```
> /water-loop 跑 Cycle E 河川流量 + map layers
```

### Roadmap 5 Tier 摘要

| Tier | 目的 | Cycles | 預估 | 狀態 |
|---|---|---|---|---|
| 1 | 補完治理層 | **A 水質 ✅** / B 罰鍰 / C RPI+稽查 / C2 列管事業 | 4-5 天 | 1/4 |
| 2 | 補完配送 + 排放 | D 汙水廠 / D2 TGOS / E 河川流量 / E2 灌溉 | 2-3 天 | 0/4 |
| 3 | 流量觀 + 視覺串接 | F 地下水 / G 水庫 inflow / H sparkline | 2 天 | 0/3 |
| 4 | 循環視覺觀 | I 防洪完整化 / J Sankey 圖 | 2-3 天 | 0/2 |
| 5 | coverage 與收尾 | K warning badge / L 高警戒爆炸 | 1.5 天 | 0/2 |
| 額外 | **Cycle B** IA v2 重組（水循環層 7 tabs）| 0.5 天 | ✅ | 1/1 |

完成全 Roadmap → **前端 KPI 接通率 43% → 100%、Map layer 15% → 100%**。

---

## 📚 歷史「下一步」（已過時，紀錄性保留）

Cycle 1 前的選項（已併入水循環 Roadmap）：
- 選 A 補完 Phase 0b+ 視覺 → 變成 Cycle G/H/L
- 選 B Phase 0d 月雨量 MV → 變成 Cycle K
- 選 C 22 縣市 ranking 真實化 → Cycle 1 已完成
- 選 D 4 主題 v1.1 → 不在水資源體系內（其他主題 roadmap）

---

# 🏠 home theme（基礎統計）— 全台概覽資料層上線（2026-05-20）

**狀態**：🟢 資料層 A+B 階段完成，等用戶 apply migration 114 + UI 重新設計

## 2026-05-20 完成

| 項目 | 路徑 | 狀態 |
|---|---|---|
| **A1 SSOT yaml** | `data/national-basics.yaml` (23 指標, v1.0) | ✅ |
| **A2 TS 衍生** | `frontend/src/lib/national-basics.ts` | ✅ |
| **A3 指標清單** | `docs/themes/home-basics-indicators.md` (給設計師) | ✅ |
| **B1 Supabase migration** | `gis-platform/migrations/114_reference_national_basics.sql` (含 baseline) | ✅ 待 user apply |
| **B2 Catalog v2** | `../taipei-gis-analytics/docs/data-catalog/demographics/national_basics.md` | ✅ |
| **B3 Registry entry** | `../taipei-gis-analytics/docs/data-registry.yaml` | ✅ |
| **B4 Pipeline 骨架** | `../taipei-gis-analytics/pipelines/demographics/national_basics/` (README + 01 + 12) | ✅ 骨架 |
| **B5 前端 query** | `frontend/src/lib/queries/national-basics.ts` (Supabase + fallback) | ✅ |
| **B6 前端 hook** | `frontend/src/hooks/useNationalBasics.ts` (INITIAL + Supabase) | ✅ |

## 資料層設計

- **靜態指標**（A 行政區 + B 面積，12 項）— 永遠 hardcode 在 ts，不入 DB
- **動態指標**（C 人口 + D 年齡 + E 動態，11 項）— Supabase `reference.national_basics_monthly/yearly` + `national_basics_latest` VIEW
- 跨 repo 重用：mini-taiwan-pulse / plan-art / gis-platform 都可 `SELECT * FROM reference.national_basics_latest`

## 2026-05-22 完成（ViewA 設計實作）

| 項目 | 路徑 | 狀態 |
|---|---|---|
| **Migration 114 apply** | `reference.national_basics_monthly + yearly + latest VIEW` | ✅ Supabase verified（pop_total 23,262,544、aging 178.57） |
| **設計檔導入** | `/tmp/mtw_design/mini-taiwan-info/` (chat6 5 章節版型) | ✅ 讀完 6 個 chat |
| **新 CSS 段** | `frontend/src/styles/globals.css` +621 行（admin-tree/territory/pop-hero/density-chip/pyramid/dyn-card/bd-trend） | ✅ |
| **ViewAHome.tsx** | `frontend/src/components/views/ViewAHome.tsx` 459 行 | ✅ |
| **mock-home.ts** | `frontend/src/lib/mock-home.ts`（22 縣市 ranking、AGING_HISTORY、BIRTH_DEATH_HISTORY、DENSITY_COMPARE） | ✅ |
| **App.tsx routing** | `theme === "home-basics"` → ViewAHome | ✅ |
| **typecheck** | 0 error | ✅ |
| **agent-browser snapshot** | 5 章節全渲染 + Footer 顯示「LIVE Supabase」 | ✅ |

## 5 章節結構（對齊水資源頁編號 CatHeader）

1. **01 行政區** — 對數縮放層級樹（22 / 368 / 7,748 / 144,820）+ 平均統計
2. **02 國土地理** — 本島 vs 離島面積方塊（98.9% / 1.1%）+ 5 張地理 fact
3. **03 人口總量** — 23.26M Hero + 男女漸層條 + 全球密度比較
4. **04 年齡結構**（主視覺）— 三段人口金字塔 + 老化指數歷年（2017 死亡交叉）+ 22 縣市 ranking
5. **05 人口動態** — 出生 4.26‰ vs 死亡 8.36‰ 對立雙條 + 自然增加 -2.87‰ + 2000-2026 雙線趨勢

## 2026-05-22 補完（ViewB 縣市鑽取上線）

| 項目 | 路徑 | 狀態 |
|---|---|---|
| **設計檔 2** | `/tmp/mtw_design2/mini-taiwan-info/` (view-b.jsx ViewB_Home) | ✅ 解析 + 移植 |
| **+652 行 CSS** | `frontend/src/styles/globals.css` (county-hero/cs-admin/township/geo-card/neighbor/vs-card/dual-trend) | ✅ |
| **mock-home 擴充** | `frontend/src/lib/mock-home.ts` +COUNTY_TOWNSHIPS_MOCK / MUNI_INFO / COASTAL_COUNTIES | ✅ |
| **county-stats helpers** | `frontend/src/lib/county-stats.ts` deriveHomeStats / rankAmongCounties / vsNationalTag / neighborCounties | ✅ |
| **ViewBHomeBasics 完整版** | `frontend/src/components/views/ViewBHomeBasics.tsx` (620 行 5 章節) | ✅ |
| **URL deeplink** | `App.tsx` 解析 `?county=TNN&view=B&theme=home-basics` | ✅ |
| **typecheck** | 0 error | ✅ |
| **agent-browser 驗證** | ViewA + ViewB 視覺正常、Supabase LIVE baseline 接通 | ✅ |

## ViewB 結構（對齊 ViewA Home 5 章節）

- **Hero · 縣市名片** — 中英文 + 區域 chip + 直轄市/省轄市 + 鄉鎮市區/村里 chip
- **4 fact tile** — 人口 / 面積 / 密度 / 老化指數 + 22 縣市排名 + vs 全國
- **01 行政區結構** — 鄉鎮市區/村里/鄰 strip + 鄉鎮人口 TOP/BOTTOM 5 drill-in (mock)
- **02 地理位置** — 區域/面積占全國/海岸線/座標 + 同區域鄰縣 chip (可點切換)
- **03 人口總量** — 縣市人口 Hero + 男女漸層 + 戶數戶量 + vs 全國密度雙條
- **04 年齡結構**（主視覺）— 三段金字塔 + 全國基準線 tick + 老化指數歷年雙線 (縣市 vs 全國)
- **05 人口動態** — 出生死亡對立雙條 + 自然增加 + vs 全國對照 + 縣市歷年雙線

## 真實 vs Mock 分布

| 來源 | 涵蓋 |
|---|---|
| ✅ **LIVE Supabase** `reference.national_basics_latest` | 全國 baseline（pop_total / aging / birth/death / 密度 / pct_*） |
| ✅ **COUNTIES SSOT**（已 apply migration 093） | 22 縣市名/區域/面積/2024 人口/centroid |
| 🟡 **mock-home.ts** | 22 縣市老化/出生死亡/鄉鎮數 + 歷年趨勢 + 鄉鎮名稱 |
| 🟡 **deriveHomeStats** 推導 | per-county 男女拆分 / 年齡三段 / 戶數 / 村里鄰估算 |

## 下一步

1. ⬜ 月度 pipeline parser（戶政司月報 ETL）
2. ⬜ Migration 115 — `reference.national_basics_by_county_monthly/yearly` + ETL pipeline
3. ⬜ ViewBHomeBasics 切換 mock → query per-county Supabase（hook fallback 留著）

---

# 🚒 消防主題（fire）— ViewA Phase 1 上線（2026-05-15 Session 5 完成）

**狀態**：🟢 ViewA 4 區塊上線（1 區塊真實 + 3 區塊 mock placeholder）；下一步把 mock 換真實

## Session 5 完成（2026-05-15）

| 項目 | 內容 | 狀態 |
|---|---|---|
| **資料端 TODO-1** | 13764 upload — 48,626 筆 fire.incidents + 4 MV refresh | ✅ |
| **gis-platform migration 104** | public.fire_* wrapper views + RPCs（PostgREST exposed schema 限制 workaround） | ✅ |
| **themes/fire.yaml v2** | 對齊 designs/v03 SPEC.md 4 區塊 + 12 KPI + 5 tabs + coverage_notes | ✅ |
| **frontend: data layer** | lib/queries/fire.ts (370 行) + hooks/useFireData.ts + lib/mock-fire.ts | ✅ |
| **frontend: components** | 11 個（FireCatHeader / FireBarRow / FireDonut / FireScatter / FireTables / S1-S4 / ViewAFire） | ✅ |
| **frontend: CSS** | globals.css +~550 行（cat-block / fire-* / 響應式斷點） | ✅ |
| **frontend: App routing** | theme=fire → ViewAFire；隱藏水主題層；fire choropleth metric | ✅ |
| **CSS 修補** | 河川基底層隱藏 / KPI grid 響應式 / S4 改單欄 / dashboard pane overflow | ✅ |
| **Codex review** | 2 critical fix + 6 improvement notes（critical 全修） | ✅ |
| **agent-browser 截圖** | 9 張 / 4 區塊驗證 | ✅ |

**真實 vs Mock 對映**：
- ✅ S1 火災發生：年度件數 / 死傷 / 主因 / 時間 4 切片 / 5 大類 22 細項 / 22 縣市排名（**真實**）
- 🔶 S1 火災財損 + 起火處所（**mock 待 MOI ETL**）
- 🔶 S2 火災救災 全部（**mock 待 Sprint 2**）
- 🔶 S3 量能 散布圖 x 軸真實 / y 軸 mock；對照表全 mock（**等 Sprint 3 PostGIS**）
- 🔶 S4 其他救護 全部（**mock 待 Sprint 4**）

## Session 5 commits

- mini-taiwan-info: 9dfd144 / a5a513b / b9183e6 / 59dc9aa / 8de67df / 29de112 / e3bd381 / b1941a1 (8 commit) + memory commits
- gis-platform: 93d825f migration 104
- taipei-gis-analytics: 5c7f061 12_upload_to_supabase.py

**全 ahead origin 未 push**（等 user 拍板）

## 下個 session 目標（user 明說）

**把 fire 主題所有 mock 都替換成真實**。看 BACKLOG B041-B047，三條優先：

1. **B045 fire 地圖層**（1-2 hr，用現有 fire.incidents 立即可做）— heatmap + mock 分隊 dot
2. **B041 S1 placeholder swap**（3-4 天）— 等 taipei-gis TODO-3 MOI 5 表 ETL → 解 S1 財損 + 起火處所
3. **B042 S2 placeholder swap**（5-7 天）— 等 taipei-gis Sprint 2 → 解分隊 + 消防栓

---

# 🚒 消防主題（fire）— Phase 1 規劃（2026-05-15 早）

**狀態**：🟢 已落地 Session 5（ViewA），規劃內容保留作 reference  
**資料端 SSOT**：[`taipei-gis-analytics/docs/systems/fire_tic.md`](../taipei-gis-analytics/docs/systems/fire_tic.md)（6 層架構）  
**資料端進度**：[`taipei-gis-analytics/docs/memos/fire_progress.md`](../taipei-gis-analytics/docs/memos/fire_progress.md)（4 Sprint）  
**前端詳規（將大改）**：[`docs/themes/fire.md`](docs/themes/fire.md)

## 5 個拍板（2026-05-15）

| # | 拍板 | 結果 |
|---|---|---|
| 1 | 林火風險 collector | 🚫 不做（snapshot import only） |
| 2 | 缺 15 縣市分隊座標 | user 蒐集名冊 + Google Maps API geocoding（路線見 `fire_stations_geocoding_plan.md`） |
| 3 | KPI 預設年份 | 113 年最新 + 提供時間軸切換（年/月/日/時） |
| 4 | 火災財損 KPI | ✅ 做（內政部統計處死傷財損表） |
| 5 | 既有 `themes/fire.yaml` | 大改保留架構（換 source `datagov_11953` → `datagov_13764`，tab 從 7 砍到 5） |

## 4 區塊 → View 對應（前端顯示分工）

| User 區塊 | mini-taiwan-info View | 資料來源（Supabase） |
|---|---|---|
| **1. 火災發生** | View A 主視覺（4 火災 KPI）+ View B tab「火災事件」+ 表格區（縣市/原因/場所排名） | `fire.incidents` + 4 個 MV + `fire.casualty_property_by_county_year` |
| **2. 火災救災** | View B tab「量能地圖」⭐ | `fire.stations` + `fire.hydrants` |
| **3. 火災交叉** | View A 量能 3 KPI + 散布圖 + View D 比較 | `fire.stations_density_by_county` + `fire.service_coverage_by_county` |
| **4. 其他救護山林** | View B tab「其他災害」 | `fire.forest_fire_risk_snapshot` + `fire.ems_stats_*` + `fire.disaster_incidents`（火山移 Backlog 2026-05-15） |

## Phase 1 拆解（前端對齊資料端 4 Sprint）

| Cycle | 對應資料端 Sprint | 前端工作 | 估時 | 狀態 |
|---|---|---|---|---|
| **F1-1** | Sprint 1（火災發生 + 治理）| View A 4 火災 KPI 接通真實資料 + 時間軸 / 維度切換爆炸 + 表格區 | 3 天 | ⬜ blocked by Sprint 1 |
| **F1-2** | Sprint 1（火災發生）| View B tab「火災事件」主體（個案點位 + heatmap + 月度趨勢 + 24h×12月熱力 + donut）| 3 天 | ⬜ blocked by Sprint 1 |
| **F1-3** | Sprint 2（救災設施）| View B tab「量能地圖」（分隊 + 服務圈 + 消防栓 4 都）| 3 天 | ⬜ blocked by Sprint 2 |
| **F1-4** | Sprint 3（交叉量能）| View A 量能 3 KPI + 散布圖 + View D 比較 | 2 天 | ⬜ blocked by Sprint 3 |
| **F1-5** | Sprint 4（其他災害）| View B tab「其他災害」+ 林火 + 火山 + 救護 sub-section | 3 天 | ⬜ blocked by Sprint 4 |
| **F1-6** | —（純前端） | `themes/fire.yaml` 大改（拍板 5）+ `docs/themes/fire.md` 改版 | 1 天 | 🟡 等 Sprint 1 RPC 名稱定下來 |

**前端總工期估**：~15 天（順序執行）；可與資料端 Sprint 並行縮短

## 前端要的 RPC（資料端寫）

| RPC | 用途 | 區塊 |
|---|---|---|
| `aggregate_fire_count(year?, county_id?, cause?)` | View A KPI 1 + 時間/維度 explode | 1 |
| `aggregate_fire_casualty(year?, county_id?, cause?)` | View A KPI 2 | 1 |
| `aggregate_fire_property_loss(year?, county_id?)` | View A KPI 3（拍板 4）| 1 |
| `aggregate_top_cause(year?, county_id?)` | View A KPI 4 | 1 |
| `list_fire_incidents(county_id?, year_range?, cause?, limit?)` | View B 個案點位 | 1 |
| `aggregate_fire_by_hour_month(year?, county_id?)` | View B 24h × 12 月熱力 | 1 |
| `get_service_coverage_by_county(county_id)` | 5min 圈外人口比 | 3 |
| `get_uncovered_villages(county_id)` | View B 量能地圖 drill-down | 3 |
| `aggregate_ems_by_county_year(year?)` | View B 其他災害救護 | 4 |

## 缺口（已知，需 user 配合）

1. **22 → 5 大類起火原因 mapping**：Sprint 1 啟動前需 user 拍板分類
2. **15 縣市分隊名冊蒐集**：user 親自，路線見 `fire_stations_geocoding_plan.md`
3. **衛福部全國急救醫院**：catalog 無，需手動爬
4. **15 縣市消防栓**：catalog 無 → 永遠 4 都 only

---

## 🔀 推薦 First Move（消防主題 Phase 1）

```
> 開始 fire Sprint 1：資料端跑 13764 batch_003 + 上 Supabase + 寫 5 個 MV
```

或先確認拍板：

```
> 確認 22 → 5 大類起火原因 mapping
```

或暫緩消防、繼續水主題 Cycle E：

```
> /water-loop 跑 Cycle E 河川流量 + map layers
```

---

# 👥🚆⚓ 三新主題（人口 / 軌道 / 航運）— 規劃完成 + Sprint 0 待執行（2026-05-27）

**狀態**：🟡 manifest + 詳規 + 跨 repo Sprint 0 handoff 全產出（draft），**待 taipei-gis-analytics 執行 9 項前置 ETL** 才升 beta、接前端。

**定錨決策（2026-05-27）**：① 靜態統計、不放即時（列車即時/AIS 船舶歸 mini-taiwan-pulse）② 缺口先補再上線。

## 產出檔案

| 主題 | manifest | 詳規 | KPI / Tab |
|---|---|---|---|
| 👥 人口 `demographics` | `themes/demographics.yaml` | `docs/themes/demographics.md` | 6 / 4 |
| 🚆 軌道 `rail` | `themes/rail.yaml` | `docs/themes/rail.md` | 7 / 5 |
| ⚓ 航運 `maritime` | `themes/maritime.yaml` | `docs/themes/maritime.md` | 10 / 5 |
| — | 跨 repo 執行清單 | **`docs/themes/_SPRINT0_HANDOFF.md`** ⭐ | 8 工作項 |

> 三份 YAML 已通過 js-yaml 解析驗證。`rail.yaml` 有 spec 外頂層 key `rail_systems`（無 `_schema.json` validator 故無妨）。顏色/priority(15/50/55) 可調；`status: draft` → 不出現在主題切換器。

## Sprint 0 前置 ETL（落在 taipei-gis-analytics + gis-platform，詳見 handoff）

| ID | 工作 | 目標 Supabase 表 | migration | 批次 | 狀態 |
|---|---|---|---|---|---|
| S0-MAR-1 | 277 港口全量上傳 ⭐最快（資料現成）| `maritime.ports` | 120 | 1 | ⬜ |
| S0-RAIL-1 | 逐站 county join ⭐其他軌道項前提 | `rail.stations` | 117 | 1 | ⬜ |
| S0-DEMO-2 | 全國村里/統計區屬性上傳 | `spatial.village_*` | 116 | 1 | ⬜ |
| S0-DEMO-1 | 性別×5歲組金字塔 🔴硬缺口 | `demographics.population_by_age_sex_county` | 115 | 2 | ⬜ |
| S0-RAIL-3 | 站級進出站運量 | `rail.ridership_by_station` | 119 | 2 | ⬜ |
| S0-MAR-2 | 漁業縣市統計 | `maritime.fishery_stats_by_county` | 121 | 2 | ⬜ |
| S0-MAR-3 | iMarine 港埠運量 | `maritime.port_traffic_yearly` | 122 | 2 | ⬜ |
| S0-RAIL-2 | 站/線/車次統計（時刻表 derive）| `rail.lines` / `rail.station_daily_trips` | 118 | 3 | ⬜ |

migration 編號以 gis-platform 當下為準（最新 114，上表 115 起示意）。

## 前端（Sprint 0 後）

各主題 Sprint 1+ 見對應 `docs/themes/{theme}.md`。共通：manifest 升 beta + `queries/{theme}.ts` + `hooks/use{Theme}Data.ts` + `ViewA{Theme}`/`ViewB{Theme}` + `App.tsx` 接線。
⚠️ **架構紅旗**：一次加 3 主題前先評估把 View 三元式重構為 generic（Backlog 既有警告「第 5 主題會炸」）。

## 推薦 First Move（在 taipei-gis-analytics）

```
> 開始三主題 Sprint 0 批次 1：港口全量上傳(S0-MAR-1) + 軌道逐站 county join(S0-RAIL-1) + 村里屬性上傳(S0-DEMO-2)
```

依 handoff §2，批次 1 三項皆現成資料/低風險、彼此獨立 → 可平行派 Agent 寫 pipeline、主 agent 跑+fix。

---

# 🧹 狀態校正 + 技術債清理（2026-07-07）

## 校正（對齊 git log 實況）

- 🏥 **medical 主題已全量上線**（commit `247f5f7`）— 真實資料 + 3 種地圖點位，0 mock。
- 🌲🐟 **forestry + fishery 兩主題已 commit**（commit `c55e9a0`，含 20 GeoJSON）— 但**線上部署落後**，zeabur 尚未 redeploy 含其 GeoJSON。
- 本次 session 開工項目：manifest validator / theme registry / 會員系統移植 / 安全加固。

## 技術債清理（本日）

- 依賴 semver 內更新：`pnpm audit` 5 筆（1 high/2 moderate/2 low）→ 0 筆（vite 6.4.3 / js-yaml 4.3.0 / mapbox-gl 3.25.0 等）。
- Mapbox CSS 改由 npm bundle（移除 index.html 的 v3.9.0 CDN link，版本與 mapbox-gl 3.25 對齊）。
- nginx.conf 加 5 個安全 header（nosniff / SAMEORIGIN / Referrer-Policy / Permissions-Policy / HSTS）；CSP 留註解草稿待線上驗證。
- root `public/`（9.4MB 誤置）清理：4 檔與 `frontend/public/about/` 重複已刪、3 檔 root-only 搬 `designs/about-assets/`。
- 死碼 `frontend/src/lib/mock-medical.ts` 刪除（0 import）。
- 過期 docs 歸檔至 `docs/archive/`：`_CYCLE_water_viewa.md` / `_FIRE_IMPL_STATUS.md` / `HANDOFF_NEXT_SESSION.md`。

# ✅ S13 完成快照（2026-07-08 清晨，已 commit 未 push）

四包改造全數完成，三閘驗收全綠（typecheck / 4 寬度截圖 / codex 0 critical）：

| 包 | 成果 | Commits |
|---|---|---|
| Manifest validator | 手刻 validator + `pnpm validate:themes` 閘門，首跑抓 24 項違規全修（10 manifest 全綠） | `5ab1a66` |
| Theme registry | App.tsx 842→391 行、`theme===` 41→0；MapView 泛用 pointLayers；accent 從 manifest 衍生去雙 SSOT。**加新主題 = 自有檔案 + 1 registry entry，App/MapView 零修改** | `699801d` |
| 會員系統 | pulse 整套移植（Google OAuth + 全域 tier free/member/insider/owner，兩站共用帳號池）；示範鎖層 `info_medical_ltc`（member、full 鎖、資料防漏、281 apply 前後雙態正確） | `998a2a2` |
| 安全 + 債 | gis-platform migration 280 已 apply（anon DEFINER 收斂 + spatial_ref_sys trigger 擋寫）；audit 5→0；nginx header；FireScatter rect bug 修復 | `21cea37` `fa60d0e` |
| /theme-bootstrap skill | 5 階段主題設計 SOP + 28 pattern × 12 資料形狀對照表（theme-loop 上游） | `e0338ad` |

gis-platform 另有 2 commits（`d4a0095` 280 已 apply、`96aaf0c` 281 **未 apply**）。

## ⚠️ 上線待辦（順序不能亂）

1. **[user]** Zeabur → info service → `VITE_MAPBOX_TOKEN` 換成已設 URL 限制那顆（Mapbox 帳號有三顆：線上 `…n-DiOiAQ` 無限制、本地+pulse 共用 `…KlH6m3lg` 無限制、已設 3 URL 限制的是第三顆）
2. **[Claude]** push info（7 commits）+ gis-platform（2 commits）→ Zeabur 自動 rebuild（順帶補上線上缺的 forestry/fishery GeoJSON）
3. **[Claude]** 部署完成後 psql apply migration 281（**先 apply 線上長照點位會 403！**）
4. **[user]** 真 Google 帳號登入 e2e、pulse 後台把自己 tier 調 member+ 驗長照鎖層解鎖
5. **[user]** Mapbox dashboard 刪除舊線上 token `…n-DiOiAQ`；pulse 的 token 之後比照設限
- Supabase Auth Redirect URLs：user 已加 ✅
- 本地 dev `Cannot find module vite@6.4.2`：舊 dev server 殘留，重跑 `pnpm dev` 即好（已驗證 6.4.3 正常）

## Backlog 新增（S13 診斷出、刻意未動）

- **SSOT 雙軌**：急救醫院 fire（`safety_emergency_hospitals`）/ medical（`medical_emergency_hospital_points`）兩條 query；「每萬人」指標分母用 counties.yaml 2024 靜態人口，與 demographics 主題不一致 → 下輪 /theme-loop 收斂
- 小 UI：圖例 3 位數刻度黏連、home-basics 圖例「老化指數 ()」空括號、footer 主題切換器可捲無提示、choropleth 首載 6-12s 白圖
- nginx CSP 草稿已備（註解中），待 staging Report-Only 驗證
- forestry/fishery 仍 draft：啟用前必須給專屬 view（generic ViewA 落水 mock 地雷，已加 DEV warning）
