# Mini Taiwan Info · 實作狀態追蹤

> **Living document**。每完成一個 task / 做一個決定 / 發現新 backlog，就更新這份檔。
> 一日一次同步：每天結束時對齊 TaskList tool 與本檔。

**最後更新**：2026-05-14 (Session 2，下午 · A-3 完成 + atomic commits)
**當前 Phase**：Phase 0b+ A-3 ✅ ViewB 完整版（mockup must-have 達成）
**當前 Focus**：📍 阿公店真實 8.6%（mock 28.3%）— 南部缺水實況上線。剩 A-4 View C / A-5 View D / Phase 0d

---

## 📊 Phase 進度總覽

| Phase | 名稱 | 估時 | 狀態 |
|---|---|---|---|
| **0a** | Foundation refactor（manifest + SSOT） | 1 天 | ✅ 完成 2026-05-14 |
| **0b** | Frontend Vite SPA 骨架（核心） | 1 天 | ✅ 完成（dev server 已啟動驗證） |
| **0c** | View A 真實資料接入（含 2 ETL） | 2-3 天 | ✅ 完成 |
| **0c-C** | 22 縣市 ranking + choropleth + explode + hero LIVE | 30 min | ✅ 完成 |
| **0b+** | 補完 PointProfile / Charts / View B-D 元件 | 1-2 天 | 🟡 2/5 完成（A-1, A-2 ✅） |
| └ A-1 | PointProfile 三模式 | 0.5 天 | ✅ 完成 |
| └ A-2 | TwoSectionLayers 控制 | 0.5 天 | ✅ 完成 |
| └ A-3 | View B 縣市儀錶板（7 tabs，4 real + 3 placeholder） | 1 天 | ✅ 完成 2026-05-14 |
| └ A-4 | View C 阿公店水庫詳情 | 0.5 天 | ⬜ 待開工 |
| └ A-5 | View D 比較模式 | 0.5 天 | ⬜ 待開工 |
| **0d** | Flood + Rain materialized views | 0.5 天 | ⬜ 待開工 |
| **0e** | 「View A 全跑通真實資料」驗收 | 0.5 天 | ⬜ 待開工 |

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
#   VITE_MAPBOX_TOKEN=pk.eyJ1IjoiaWFubGsxMTIzNHMi... （prototype 內的 dev token，可先用）
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
| 0c-4 | LPCD + 接管率 查詢預先寫好（ETL 跑完自動 LIVE） | ✅ 2026-05-14 | `fetchLpcdLatest` / `fetchSewageCoverageLatest` / `fetchGovernanceSummary` |

**Phase 0c 完整執行結果**（截圖 `/tmp/miniti-5live.png`，2026-05-14 12:25）：

| KPI | 數字 | LIVE | 比對 mock |
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

# 3) 重新整理瀏覽器 → 全部 6 KPI 應該都標 LIVE
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

### 🔵 規格延伸（未來主題）
- 5-8 主題：fire / medical / transport / population / environment / realestate — 都還 `disabled: true`
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

---

## 🔗 關聯位置

- TaskList tool（即時狀態）：每個 task 都有 ID 對應
- `HANDOFF.md`：上一個 session 的銜接書（保留作歷史紀錄）
- `designs/v02-claude-design-2026-05-14/`：mockup SSOT
- `data/counties.yaml`：縣市 SSOT
- `themes/water.yaml`：水主題 manifest（將升級 v1.1）

---

## ▶️ 下一步（自動執行已完成，user 選方向）

**選 A：補完 Phase 0b+ 視覺**（PointProfile / Sparkline / TrendChart / TwoSectionLayers / View B 高雄水資源 / View C 阿公店 / View D 比較）— 補足 mockup 對齊
**選 B：Phase 0d**（淹水高潛勢 + 月雨量 MV，最後 1 個 KPI 真實化）— 6/6 KPI 全 LIVE
**選 C：22 縣市 ranking + choropleth 改用真實 LPCD / 接管率**（現在 ranking 還是 mock，但 DB 有真實資料了）
**選 D：擴展到 4 個主題都 v1.1**（home-basics / fire / socioeconomic 升級 manifest）

推薦：**C → A**。先把 22 縣市排名 + choropleth 著色都接真實資料（30 分鐘事，DB 已就緒），然後再做 View B 高雄水資源 + PointProfile（mockup must-have）。
