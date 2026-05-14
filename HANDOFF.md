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
