# HANDOFF · 設計階段 → 實作階段

> **2026-05-14 銜接書**。設計與規劃階段已完成，本檔提供下一個 session（或下個工作日）銜接所需的所有 context。
>
> 給未來的 Claude session / 工程師 / 設計師：**讀這份檔案 + `README.md` 就能接手**。

---

## 已完成（設計階段）

### 規劃文件（10 份）

```
docs/
├── 00-vision-and-positioning.md
├── 01-information-architecture.md
├── 02-layout-and-wireframes.md
├── 03-exploded-view-pattern.md
├── 04-theme-manifest-spec.md
├── 05-storytelling-framework.md
├── 06-components-library.md
├── 07-data-sources-overview.md
├── 08-roadmap-12weeks.md
├── 09-phase0-infrastructure-tasklist.md  ← Phase 0 開工清單
├── 10-point-data-pattern.md              ← 點位設計補充（給設計師）
└── themes/
    ├── home-basics.md
    ├── water.md
    ├── socioeconomic.md
    └── fire.md
```

### Theme Manifests（5 份）

```
themes/
├── _template.yaml
├── home-basics.yaml
├── water.yaml
├── socioeconomic.yaml
└── fire.yaml
```

### 範例資料（8 份）

```
samples/
├── home-basics/{tgos-moi-api-endpoints.md, sample-population-by-county.json}
├── water/{lpcd, sewage-coverage, reservoir-realtime}-sample.json
├── socioeconomic/{income-tax-county, housing-price-grid, long-term-care}-sample.json
└── fire/{fire-stations, fire-incidents-monthly, emergency-shelters}-sample.json
```

### 設計師初版 mockup

- 第一版桌機 View A 已交付（截圖 2026-05-14 上午 10:20）
- **review 結論**：點位資料偏弱，已寫 `docs/10-point-data-pattern.md` 給設計師補強
- 第二版 mockup 待收（預計含點位圖層 UI、點位概況面板、散布圖、點位爆炸圖）

---

## 拍板決定（2026-05-14）

| 項目 | 決定 |
|---|---|
| **Repo 結構** | Monorepo 在本資料夾 `mini-taiwan-info/` 擴展，不另開 repo |
| **Frontend** | Next.js 14 App Router + Tailwind + shadcn/ui |
| **Map** | **Mapbox GL JS**（非 MapLibre） |
| **Backend** | FastAPI (Python) |
| **DB** | Supabase（共用 GIS 三部曲的 `utcmcikhvxnohbxchbrs`） |
| **部署** | Vercel (frontend) + Zeabur (backend) |
| **設計稿位置** | 留在 `mini-taiwan-info/` 內，當 SSOT |
| **設計師 mockup** | 進入 `designs/` 資料夾 |

---

## 下階段：3 條並行工作線

### 🔵 Session A · 本資料夾擴展（最重要）

**位置**: `mini-taiwan-info/` 內新增 `frontend/` `backend/` `migrations/` `infra/`

**Phase 0 工作（W1-2）**：見 `docs/09-phase0-infrastructure-tasklist.md`
- A. 行政區邊界三表（admin.counties / townships / villages）
- B. 縣市維 materialized views（v_county_*）
- C. Theme manifest validator + CI
- D. API 路由 + OpenAPI spec
- E. TGOS MOI 後端 wrapper + Mapbox token 申請
- G-L. 前端骨架 + 共用元件 + 假主題跑通

**驗收**：「假主題跑通 4 個 view」

### 🟢 Session B · ETL pipelines（並行）

**位置**: `../taipei-gis-analytics/pipelines/`

**Phase 1 W3 必做的 4 個 pipeline**：
- `pipelines/socioeconomic/datagov_8316_lpcd.py` → `socioeconomic.lpcd_by_county`
- `pipelines/infra/datagov_26815_sewage.py` → `infra.sewage_coverage_by_county`
- `pipelines/environment/datagov_45134_water_pollution.py` → 三表
- `pipelines/agriculture/datagov_35644_irrigation.py` → 18 水利會 → 縣市映射

**SOP**：依 taipei-gis-analytics CLAUDE.md 的「Pipeline 探索 → 上線流程」

### 🟣 Session C · gis-platform migrations（並行）

**位置**: `../gis-platform/migrations/`

**必做 migration**：
- `admin.counties` + `townships` + `villages` 三表（NLSC 圖資）
- `v_county_reservoirs` / `v_county_river_basins` / `v_county_flood_hazard` ...等 materialized views
- 已上線的 24+ 個水資源表加上 county_code 切片視圖

---

## 銜接 Checklist（新 session 接手要做的事）

```
□ 1. 讀本檔（HANDOFF.md）
□ 2. 讀 README.md
□ 3. 確認在 mini-taiwan-info/ 目錄
□ 4. 看 docs/09-phase0-infrastructure-tasklist.md 找下一步
□ 5. 從 designs/ 看設計師最新 mockup（如有）
□ 6. 申請 Mapbox dev token
□ 7. 跑 Phase 0 work
```

---

## 三個 repo 的位置關係

```
Desktop/.../GIS/
├── mini-taiwan-info/          ← 本 repo（設計 + 實作 monorepo）
│   ├── docs/                  規劃 SSOT
│   ├── themes/                Theme manifest
│   ├── samples/               範例資料
│   ├── designs/               設計師 mockup
│   ├── frontend/              （待建）
│   ├── backend/               （待建）
│   ├── migrations/            （待建）
│   └── infra/                 （待建）
│
├── taipei-gis-analytics/      ← 探索 + ETL pipelines（Session B）
│   └── pipelines/             新增 4 個 pipeline 進這
│
└── gis-platform/              ← Supabase + migrations（Session C）
    ├── migrations/            新增 admin 三表 + materialized views
    └── docs/                  資料 inventory
```

三個 repo 對應 mini-taiwan-info 主題詳規裡描述的「**探索 → 收集 → 儲存**」三部曲（見 GIS 基礎設施三部曲 memory）。

---

## 設計師 mockup 投遞規範

`designs/` 資料夾接收設計師 mockup。建議命名：

```
designs/
├── v01-first-draft-2026-05-14.png       初版（已收，需改）
├── v02-with-point-layers/                 待收（依 doc 10 補點位）
│   ├── view-a-desktop-water.png
│   ├── view-a-desktop-home-basics.png
│   ├── view-b-desktop-water.png
│   ├── view-c-desktop-reservoir.png
│   ├── view-d-desktop-compare.png
│   ├── view-a-mobile.png
│   ├── view-b-mobile-sheet.png
│   ├── popup-spec/                        (3 種 popup)
│   ├── cluster-states/                    (3 級 cluster)
│   └── exploded-view-animation.gif
└── tokens/                                Figma 或 Penpot 連結
    └── README.md                          含 Figma share link
```

---

## Mapbox 開工 Quick Start（給工程師）

1. 註冊 Mapbox 帳號 → https://account.mapbox.com/
2. 開發用 token：Default public token 放 `frontend/.env.local`
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
   ```
3. 正式上線前申請 **URL-restricted token**（限制 referrer）
4. 安裝
   ```
   pnpm add mapbox-gl
   pnpm add -D @types/mapbox-gl
   ```
5. 計費警覺：免費 100k loads/月，超過 0.0001 USD/load。設 sentry alert at 80k

---

## 關鍵風險（提醒未來 session）

1. **TGOS MOI Apikey 永不到前端** — 一定走後端 wrapper
2. **行政區邊界版本對齊** — 用 NLSC 2024+ 版，歷年資料對齊小心
3. **縣市覆蓋資料不齊** — 雨水下水道 / 滯洪池 / 漏水率 等都有 known gap，每個 yaml 內 `meta.coverage_notes` 已標
4. **Mapbox loads 計費** — 上線前壓測
5. **跨 repo 改動同步** — taipei-gis-analytics 的 ETL 進 Supabase 後，要更新該 repo `docs/data-registry.yaml` + 跑 `data-catalog-audit` skill
6. **記得做設計師第二版 review** — 對照 `docs/10-point-data-pattern.md` 的 self check 5 題

---

## 給 Claude session 的提示

如果你是新 session 接手：

1. **memory 自動載入** `project_mini_taiwan_info.md`（包含本專案的設計階段摘要）
2. **若用戶說「繼續做 mini-taiwan-info」**：來這個目錄，看 09 Phase 0 找下一步
3. **若用戶說「設計師回稿了」**：看 `designs/` 最新 mockup，對照 `docs/10-point-data-pattern.md` 評估
4. **若用戶說「跑水資源 ETL」**：切到 `../taipei-gis-analytics/`，建 4 個 pipeline
5. **若用戶說「建 admin 表」**：切到 `../gis-platform/migrations/`

---

## 設計階段成果一句話

「**31 個檔案 + 10 份規劃文件 + 4 個主題完整詳規 + 5 個 manifest + 8 個範例資料 = 設計藍圖完整、可進入實作**」

---

## 完成時間軸（回顧）

| 日期 | 里程碑 |
|---|---|
| 2026-05-13 | 專案啟動，規劃 4 個 view IA + 爆炸圖模式 |
| 2026-05-13 | 三主題盤點：水 / 社經 / 消防（含 twinkle-hub 交叉比對）|
| 2026-05-13 | 寫完 32 份設計檔（含 10 docs + 5 yaml + 8 samples）|
| 2026-05-14 | 設計師交付第一版 mockup |
| 2026-05-14 | review + 補點位設計補充（docs/10）|
| 2026-05-14 | 拍板 Mapbox + monorepo，本檔生成，**準備進入 Phase 0** |

進入 Phase 0 → 後續對照 `docs/08-roadmap-12weeks.md` 跑 12 週。

---

# Session 4 銜接書（2026-05-14 · Cycle A + B 後）

> Cycle 1 (Session 3) + Cycle A 水質 (Session 4) + Cycle B IA 重組 (Session 4) 完成後的接手書。
> 給下一個 session / 工程師：**讀本節 + `docs/themes/water-system-cycle.md` 就能接手**。

## 一句話現況

Phase 0 已收尾、Cycle 1/A/B 完成；ViewB 7 tabs 依水循環層重組 (IA v2)；水質測站接通真實資料（月度，非 LIVE）；LIVE 用詞嚴守原則拍板；**3 個 repo 都 ahead origin 未 push**。

## 已建立的核心抽象

| 抽象 | 位置 | 用途 |
|---|---|---|
| `/water-loop` skill | `.claude/skills/water-loop/SKILL.md` | 半自動 5 階段 cycle SOP（Discovery → Plan → Execute → Verify → Commit）|
| `/wrap-up` skill | `.claude/skills/wrap-up/SKILL.md` | Session 收尾 6 階段 + 9 memory 檔更新 |
| `<DataAgeBadge>` component | `frontend/src/components/DataAgeBadge.tsx` | 6 級 freshness 自動分類（非 LIVE 資料用） |
| `<WaterQualitySection>` helper | `frontend/src/components/views/ViewB.tsx` | 水質卡共用 helper，stationType 由 prop 鎖定 |
| `useWaterQuality` hook | `frontend/src/hooks/useWaterQuality.ts` | 拉縣市平均 + 該縣 stations |
| `get_water_quality_*` RPCs | `gis-platform/migrations/097_*.sql` | 2 RPC + helper（jq_extract_numeric jsonb 多 alias）|

## 關鍵原則（不破壞）

1. **LIVE 嚴格定義**：collector cron + 上游 realtime 雙條件。其他用「接通真實資料」+ DataAgeBadge
2. **commit / docs / 對話 「LIVE」嚴守**：違反即錯（CLAUDE.md + PRINCIPLES）
3. **/water-loop 為標準 cycle 啟動方式**：半自動 3 checkpoint（apply migration / 視覺拍板 / commit-push）
4. **跨 4 repo 同步**：mini-taiwan-info / gis-platform / taipei-gis-analytics / **data-collectors**
5. **Secret 永遠走 .env**：commit 前 grep `pk\.eyJ|sk_|AKIA|ghp_`

## 跑得起來的東西

```bash
cd frontend && pnpm dev   # http://localhost:5173
```

- **View A**：6 KPI 接通真實資料（蓄水率/雨量 真 LIVE / 其他月度/年度/靜態，DataAgeBadge 標）
- **View B**：7 tabs 依水循環層
  - 概覽 ✅ / 水庫(+水質) ✅ / 河川(+水質 warning) ✅ / 地下水(+水質) ✅
  - 防洪(4 section placeholder) ✅ / 用水與配送 ✅ / 排名 ✅
- **View C**：水庫詳情頁 4 stat + 1 年 trend
- **agent-browser** 全局已裝（截圖前 curl 驗 dev server alive）

## 未 push 狀態（Session 4 結束時）

| Repo | Commits ahead | 含 |
|---|---|---|
| mini-taiwan-info | 7 + wrap-up commits | docs/water-system-cycle / Cycle A frontend / DataAgeBadge / LIVE 用詞 / Cycle B manifest + ViewB 重組 + memory 9 檔 |
| gis-platform | 1 | migration 097 water_quality RPCs |
| taipei-gis-analytics | 1 | 03_load_water_quality + wqx_p_01 河川 reading endpoint（**未 run**）|

## 下個 session 接什麼

最有 ROI 的選擇是 **Cycle E 河川流量 + map layers**：
- river_flow_stations 188 站 + river_lines 2015 條 + river_basins 116 個 全在 Supabase
- ViewB 河川 tab 流量 placeholder 可直接接通真實 LIVE 資料
- 0.5 天

或 **Cycle A2 run epa_river pipeline**：
- commit 88353ae 已存在
- `cd taipei-gis-analytics && python3 pipelines/water_resources/extensions/03_load_water_quality.py --full`
- 1-2 小時 / 30k reading 進 DB / 跑完河川 tab 接通真實資料

啟動：
```
> /water-loop 跑 Cycle E 河川流量 + map layers
```
或
```
> /water-loop 跑 Cycle A2 epa_river pipeline run
```

## 環境

- Node 23.10 / pnpm 10.17 / psql 14.13 / python3 (venv with psycopg2-binary)
- Supabase project `utcmcikhvxnohbxchbrs`，pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`
- DATABASE_URL 在 `gis-platform/.env`
- Mapbox dev token 在 `frontend/.env.local`（git history 內已 placeholder，本地仍是 real value）
- agent-browser 0.10.0 全局 + 4500ms wait + dev server curl 驗 200
- `git-filter-repo` 已裝於 `/opt/homebrew/bin/`（cycle 1 用過清 secret）

## 已知小瑕疵（不阻塞）

- `home-basics.yaml` / `socioeconomic.yaml` / `fire.yaml` 還是 v1.0 spec
- `scripts/regen-counties.ts` 沒寫（counties.ts 手寫對齊）
- ViewA / ViewB OverviewTab 既有 LIVE badge 還沒 audit（B029，後續 cycle）
- 「全國蓄水率」「24hr 雨量」「警戒水庫」可保留 LIVE（collector cron 真跑），但 LPCD / 接管率 / 淹水 LIVE 要改 DataAgeBadge
- migration 097 在 dry-run 時 accidentally apply（內含 COMMIT 提前結束 outer BEGIN）— 結果無害但 SOP 要修

## Skill 狀態

| Skill | 版本 | 跑過幾次 |
|---|---|---|
| `/wrap-up` | v1.1 | 3（Session 2 試跑 + S3 Mode B 首次 + S4 完整 Cycle A+B 收尾）|
| `/water-loop` | v1.0 | 2（Session 3 Cycle 1 / Session 4 Cycle A + B）|

兩個 skill 都待回頭修：
- `/wrap-up`：Stage 1 並行 read 全 9 個檔，不要因「上次讀過」略過
- `/water-loop`：Stage 1 加 SQL drill 驗證 / Stage 4 加 dev server health check / Mode V 強化 ASCII layout preview

## 關聯文件

- [_STATUS.md](_STATUS.md) — Phase 進度 + Cycle Roadmap pointer
- [docs/themes/water-system-cycle.md](docs/themes/water-system-cycle.md) — **水循環體系 Roadmap（最關鍵接手文件）**
- [.claude/memory/STATUS.md](.claude/memory/STATUS.md) — 下個 session handoff（精簡版）
- [.claude/memory/REFLECTIONS.md](.claude/memory/REFLECTIONS.md) — Session 1-4 反省
- [.claude/memory/CROSS_REPO.md](.claude/memory/CROSS_REPO.md) — 跨 4 repo 同步狀態
- [.claude/memory/PRINCIPLES.md](.claude/memory/PRINCIPLES.md) — 拍板決策（含 LIVE 嚴格定義）
- [.claude/memory/PLAYBOOKS.md](.claude/memory/PLAYBOOKS.md) — 10 個 SOP（PB-01～10）
- [CLAUDE.md](CLAUDE.md) — 專案規則（含 LIVE 用詞嚴守）

