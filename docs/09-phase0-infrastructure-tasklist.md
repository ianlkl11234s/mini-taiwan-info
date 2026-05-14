# 09 · Phase 0 共用基礎設施工作清單

> 給工程開始實作前的具體 todo。Phase 0 = 「設計完成、Phase 1 起跑前」必須完成的全部底層工作。
> 預估工期 **2 週**（W1-2），是後續所有主題的共用骨架。

---

## 工作分組總覽

```
┌─ 後端 / 資料層 ────────────────┐
│  A. 行政區邊界三表              │
│  B. 縣市維 materialized views  │
│  C. Theme manifest validator   │
│  D. API 路由 + OpenAPI         │
│  E. TGOS MOI 後端 wrapper      │
│  F. ETL 框架建立                │
└─────────────────────────────────┘

┌─ 前端 / UI 層 ────────────────┐
│  G. Repo 結構 + Stack 選型     │
│  H. 設計系統 tokens 落地        │
│  I. 共用底層元件（6 個）        │
│  J. Theme manifest loader      │
│  K. 響應式 layout 骨架          │
│  L. 假主題 stub 跑通 4 個 view │
└─────────────────────────────────┘

┌─ 設計 / 內容 ───────────────────┐
│  M. Hi-fi mockup 8 張清單      │
│  N. 文案模板規範                │
│  O. 顏色語意對照表              │
│  P. 圖示集                      │
└─────────────────────────────────┘

┌─ 運維 / DevOps ─────────────────┐
│  Q. 環境變數清單 (.env.example) │
│  R. 部署目標選定                │
│  S. Supabase RLS               │
│  T. 監控 / alerting             │
└─────────────────────────────────┘

┌─ 驗收 ──────────────────────────┐
│  U. 「假主題跑通 4 view」驗收劇本│
└─────────────────────────────────┘
```

---

## A. 行政區邊界三表

**目標**：所有 view 的左側地圖底圖 + 縣市/鄉鎮/村里 boundary lookup。

### 三個表

| 表名 | 筆數 | 來源 | 內容 |
|---|---|---|---|
| `admin.counties` | 22 | NLSC 內政部國土測繪 | 縣市 polygon (TWD97 + WGS84) |
| `admin.townships` | 368 | NLSC | 鄉鎮市區 polygon |
| `admin.villages` | ~7,800 | segis | 村里 polygon（最細粒度） |

### Schema 範本

```sql
CREATE TABLE admin.counties (
  county_id VARCHAR(2) PRIMARY KEY,  -- A, B, C, ..., Z
  county_name TEXT NOT NULL,         -- '臺北市'
  county_name_en TEXT,                -- 'Taipei'
  geom_3826 GEOMETRY(MultiPolygon, 3826),  -- TWD97
  geom_4326 GEOMETRY(MultiPolygon, 4326),  -- WGS84
  area_km2 NUMERIC,
  population INTEGER,
  centroid_lng NUMERIC,
  centroid_lat NUMERIC,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_counties_geom_4326 ON admin.counties USING GIST(geom_4326);

-- 鄉鎮表類似 + county_id FK
-- 村里表類似 + township_id FK
```

### 工作項

- [ ] 寫 `pipelines/admin/01_fetch_nlsc_boundaries.py` 從 NLSC 抓 shapefile
- [ ] 寫 `pipelines/admin/02_load_to_supabase.py` 灌進 Supabase
- [ ] migration 寫好 + apply
- [ ] 驗證：`SELECT COUNT(*) FROM admin.counties` = 22
- [ ] 簡化 polygon（前端用）：生成簡化版 `geom_4326_simplified`（容差 0.0001）給 choropleth 用

### 預估：3 天

---

## B. 縣市維 Materialized Views

**目標**：所有靜態 GIS 表沒有 `county_code` 欄位，預先做空間 join 切片，避免前端每次都做 ST_Intersects。

### Phase 1 必建的 view 清單

```sql
-- 水資源主題
CREATE MATERIALIZED VIEW v_county_reservoirs AS
SELECT 
  c.county_id,
  r.reservoir_id,
  r.name,
  r.lat, r.lng,
  r.total_capacity_million_m3
FROM public.reservoirs r
JOIN admin.counties c ON ST_Within(r.geom, c.geom_3826);

CREATE MATERIALIZED VIEW v_county_river_basins AS
SELECT 
  c.county_id,
  rb.basin_id,
  rb.name,
  ST_Area(ST_Intersection(rb.geom, c.geom_3826)) / 1000000 AS intersect_area_km2
FROM public.river_basins rb
JOIN admin.counties c ON ST_Intersects(rb.geom, c.geom_3826);

CREATE MATERIALIZED VIEW v_county_flood_hazard AS
SELECT 
  c.county_id,
  fh.scenario,  -- 200mm/350mm/500mm
  fh.depth_class,
  SUM(ST_Area(ST_Intersection(fh.geom, c.geom_3826))) / 1000000 AS area_km2,
  SUM(ST_Area(ST_Intersection(fh.geom, c.geom_3826))) / ST_Area(c.geom_3826) AS area_pct
FROM public.flood_hazard_zones fh
JOIN admin.counties c ON ST_Intersects(fh.geom, c.geom_3826)
GROUP BY c.county_id, fh.scenario, fh.depth_class;

CREATE MATERIALIZED VIEW v_county_water_facilities AS ... -- 給水設施
CREATE MATERIALIZED VIEW v_county_water_quality_stations AS ... -- 水質測站
```

### 工作項

- [ ] 列出 Phase 1 所有靜態 GIS 表（已盤點 24+ 個）
- [ ] 對每個表寫對應的 `v_county_*` materialized view
- [ ] 設定 refresh 排程（靜態表每月 refresh 一次即可）
- [ ] index：每個 view 都建 `(county_id)` index

### 預估：3-4 天（PostGIS 寫法是熟手活但要驗）

---

## C. Theme Manifest Validator

**目標**：每個 `themes/*.yaml` 在 commit 前 CI 驗證 schema，避免 typo 或欄位漏。

### 工作項

- [ ] 寫 JSON Schema（`themes/_schema.json`）描述 manifest 規格
- [ ] 寫 validator 腳本 `scripts/validate_themes.py`
- [ ] 整合到 pre-commit hook + CI（GitHub Actions）
- [ ] 驗證項：
  - `theme.id` 唯一
  - `kpis[].source` 必對應 `data_sources[].id`
  - `tabs[].layers[]` 必為已註冊的 layer name
  - `crosslink[].with` 必為另一 theme.id
  - 無循環依賴

### 預估：2 天

---

## D. API 路由 + OpenAPI

**目標**：前後端介面契約，後端能換實作。

### 端點清單

```
GET  /api/themes                       列出所有 theme
GET  /api/themes/:id                   單一 theme manifest
GET  /api/themes/:id/overview          View A 全國資料
GET  /api/themes/:id/counties/:cid     View B 縣市資料
GET  /api/themes/:id/counties/:cid/tab/:tab  Tab 細節
GET  /api/themes/:id/datasets/:type/:did     View C 資料集詳情
GET  /api/themes/:id/compare?counties=&metric=  View D 比較

GET  /api/geo/admin/counties           縣市清單
GET  /api/geo/admin/townships?county=  鄉鎮清單
GET  /api/geo/admin/villages?township= 村里清單
GET  /api/geo/admin/reverse?lng=&lat=&level=county|town|village  反查
GET  /api/geo/poi?theme=&county=&keyword=  TGOS Theme/Query 代理
GET  /api/geo/buffer?lng=&lat=&radius=&theme=  TGOS Theme/Buffer 代理
GET  /api/geo/zip?address=  TGOS Zip33 代理

POST /api/explode                      爆炸圖資料（依模式）
```

### 工作項

- [ ] 寫 OpenAPI 3.0 spec（YAML）
- [ ] Swagger UI 部署（供前端 review）
- [ ] mock server 跑起（前端可在 backend 完成前先接）

### 預估：2 天

---

## E. TGOS MOI 後端 Wrapper

**目標**：保護 Apikey、加 cache、處理錯誤、節流。

### 工作項

```python
# server/services/tgos_wrapper.py

class TGOSWrapper:
    def __init__(self, api_key: str, cache_backend):
        self.api_key = api_key
        self.cache = cache_backend  # Redis / SQLite
        
    def range_admin(self, lng, lat, level):
        cache_key = f"range_admin:{lng}:{lat}:{level}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        # call TGOS, cache 1 day
        ...
    
    def theme_query(self, theme_id, county, town=None):
        cache_key = f"theme_query:{theme_id}:{county}:{town}"
        # cache 1 hour
        ...
    
    def theme_buffer(self, theme_id, lng, lat, radius):
        # cache 10 minutes
        ...
```

### 規範

- [ ] Apikey 只在後端 `.env`，**永不到前端**
- [ ] 三層 cache 策略（1d / 1h / 10min）
- [ ] retry 機制（指數退避 max 3 次）
- [ ] rate limit：每秒最多 3 個請求 + 排隊
- [ ] 編碼自動處理（中文 URL-encode，「臺」非「台」）
- [ ] 結果統一 transformer（TGOS 原始格式 → 內部標準格式）

### 預估：2 天

---

## F. ETL 框架建立

**目標**：每個外部資料源寫一個 pipeline，遵循統一規範。

### 工作項

- [ ] ETL 腳本骨架（taipei-gis-analytics 已有 SOP，借用）
- [ ] 統一 fetcher: 處理 datagov / TGOS / twinkle-hub 三種來源
- [ ] 增量更新邏輯（only fetch updated since last_seen）
- [ ] error handling + alerting（fail 通知 Slack/email）
- [ ] 對 Phase 1 必要的 4 個 ETL pipeline 寫好骨架：
  - `pipelines/socioeconomic/datagov_8316_lpcd.py`
  - `pipelines/infra/datagov_26815_sewage.py`
  - `pipelines/environment/datagov_45134_water_pollution.py`
  - `pipelines/agriculture/datagov_35644_irrigation.py`

### 預估：3 天（多數借用 taipei-gis-analytics 既有架構）

---

## G. Repo 結構 + Stack 選型

### 拍板（2026-05-14）

**Monorepo，直接在本資料夾 `mini-taiwan-info/` 內擴展**：

```
mini-taiwan-info/                  ← 本 repo，已有設計稿
├── README.md
├── docs/                          ← 既有規劃文件（10 份）
├── themes/                        ← 既有 manifest YAML
├── samples/                       ← 既有範例資料
├── designs/                       ← 設計師 mockup 收件區
├── HANDOFF.md                     ← session 銜接書
│
├── frontend/                      ← 新增（Phase 0）
│   ├── app/                       Next.js 14 App Router
│   ├── components/                元件庫
│   ├── lib/                       utilities + theme manifest loader
│   ├── public/
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/                       ← 新增（Phase 0）
│   ├── api/                       FastAPI routes
│   ├── services/                  tgos_wrapper / explode_engine
│   ├── db/                        Supabase client + queries
│   ├── pyproject.toml
│   └── .env.example
│
├── migrations/                    ← 新增（Phase 0）
│   └── 0001_admin_boundaries.sql  …等
│
└── infra/                         ← 新增（Phase 0）
    ├── vercel.json
    └── zeabur.toml
```

設計稿 + 規劃文件**留在原位當 SSOT**，frontend / backend 開新資料夾，根本不需要另開 repo。

### Stack 建議

| 層 | 選擇 | 理由 |
|---|---|---|
| Frontend framework | Next.js 14 App Router | SSR + 路由 + image opt |
| UI | Tailwind + shadcn/ui | 既有設計 tokens 適配 |
| Map | **Mapbox GL JS** | 拍板決定（2026-05-14）。需 `MAPBOX_ACCESS_TOKEN`；style 建議 `mapbox://styles/mapbox/light-v11`（白底）+ `dark-v11`（暗色模式） |
| Charts | Recharts / visx | 跟現有 mini-taiwan-* 一致 |
| State | URL state + React Query | 可分享 + 快取 |
| Backend | FastAPI (Python) | 跟 taipei-gis-analytics 同語言 |
| DB | Supabase Postgres + PostGIS | 已存在 |
| Cache | Redis or SQLite | Phase 0 用 SQLite，量大再上 Redis |
| 部署 | Vercel (frontend) + Zeabur (backend) | mini-taiwan-* 慣例 |

### 工作項

- [ ] 確認 mono-repo or 雙 repo
- [ ] `package.json` / `pyproject.toml` 初始化
- [ ] CI/CD pipeline（GitHub Actions）

### 預估：2 天

---

## H. 設計系統 Tokens 落地

**目標**：把 `docs/06-components-library.md` 的設計 tokens 變成程式碼。

### 工作項

- [ ] 建 `frontend/lib/design-tokens.ts` 匯出常數
- [ ] `tailwind.config.js` 引入 tokens（顏色、間距、字級）
- [ ] CSS variables for 暗色模式預留
- [ ] 8 個主題 accent color 對映表

### 預估：1 天

---

## I. 共用底層元件（6 個必做）

**Phase 0 結束前必須完成這 6 個，後續主題才能套用。**

| 元件 | 用途 | 預估 |
|---|---|---|
| `AtlasTopBar` | 頂部 nav | 0.5 天 |
| `ThemeSwitcher` | 底部主題列 | 0.5 天 |
| `MapCanvas` + `ChoroplethLayer` + `PointLayer` | 地圖底層 | 2 天 |
| `KPICard` | KPI 卡片 + 爆炸 trigger | 1 天 |
| `TabBar` + `Breadcrumb` | 導航 | 0.5 天 |
| `DataSourceBadge` + `DataMissingState` | 來源/未開放 UI | 0.5 天 |

### 預估：5 天

---

## J. Theme Manifest Loader

**目標**：前端讀 `themes/water.yaml` → 渲染整個 view。

### 工作項

- [ ] manifest 讀取與快取
- [ ] manifest → React props 轉換器
- [ ] 切主題時的狀態保留（保留選中的縣市）
- [ ] 主題切換動畫

### 預估：2 天

---

## K. 響應式 Layout 骨架

**目標**：桌機（左地圖右儀錶板）+ 手機（上下堆疊 + sheet）。

### 工作項

- [ ] PC 版 layout shell
- [ ] 手機版 layout shell（地圖 40vh + 儀錶板 sheet）
- [ ] 中間斷點處理
- [ ] 暗色模式 CSS 預留

### 預估：2 天

---

## L. ⭐ 「假主題跑通 4 個 view」驗收

**Phase 0 最重要的驗收標準**：建一個 `themes/_demo.yaml`（mock 資料），跑通 View A → B → C → D 完整流程。

### 驗收劇本

```
1. 開站 → 看見假主題的 6 個 KPI（mock 數字）
2. 點台灣地圖 → 進高雄 View B → 看見假 Tab
3. 點 KPI ⤴ → 看見爆炸圖 mock 資料展開
4. 點某 Tab 內某資料集 → 進 View C
5. 按「← 高雄」回到 View B
6. 按「比較」進 View D → 多選台北/高雄 → 看排名
7. 全程切桌機 ↔ 手機尺寸 → 響應式正常
```

通過驗收 → Phase 0 完成 → 進入 Phase 1。

---

## M-T 其他工作（簡要）

### M. Hi-fi Mockup 清單（給設計師）

要 8 張 mockup：
- View A 桌機（水主題） / View A 桌機（home-basics）
- View B 桌機 / View B 桌機 + 爆炸圖展開
- View C 桌機 / View D 桌機
- View A 手機 / View B 手機 + sheet 展開

### N. 文案模板規範

- KPI 主數字 / label / trend 格式
- Hook 動態文案模板（依資料條件變化）
- 爆炸圖標題格式
- 「資料未開放」UI 文案

### O. 顏色語意對照表

| 升 = 好 / 升 = 壞 | 主題各自定，寫進 manifest `ranking_better` |

### P. 圖示集（lucide-react）

| 主題 | 圖示候選 |
|---|---|
| 水 | droplet, waves, cloud-rain |
| 火 | flame, alert-triangle, shield |
| 人口 | users, user, baby |
| 經濟 | dollar, briefcase, building |
| ...

### Q. 環境變數 .env.example

```
# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=... (backend only)

# TGOS
TGOS_MOI_API_KEY=...    (backend only)

# Map
MAPLIBRE_STYLE_URL=...

# Analytics
NEXT_PUBLIC_GA_ID=...

# Cache
REDIS_URL=... (optional)
```

### R. 部署目標選定

- Frontend: Vercel（推薦）
- Backend: Zeabur 或 Render
- 注意 Zeabur 部分 project 出口 IP 被部分政府平台 WAF 擋

### S. Supabase RLS

- Anon key 只能讀，不能寫
- 寫操作走 service key（backend only）
- 各 view 的 read policy 明確

### T. 監控

- Vercel Analytics（前端）
- Supabase Pro plan 的 logs（後端）
- Uptime monitor（uptime kuma or external）

---

## 預估工時總表

| 區塊 | 工作天 |
|---|---|
| 後端 / 資料層 (A-F) | ~14 天 |
| 前端 / UI 層 (G-L) | ~12 天 |
| 設計 / 內容 (M-P) | 設計師主導，~5 天 |
| 運維 (Q-T) | ~3 天（與其他並行）|

**雙週 sprint：兩人並行可在 2 週內完成**（前端 + 後端各 1）。

設計師同時跑 Hi-fi mockup（M），最晚 W2 末完成 8 張圖。

---

## Phase 0 完成的具體條件

✅ A-F 後端資料層全完成  
✅ G-L 前端骨架全完成  
✅ 「假主題跑通 4 個 view」驗收通過  
✅ Hi-fi mockup 至少完成 4 張（View A/B 桌機 + View A/B 手機）  
✅ 文件齊全：API spec 已寫、tokens 已落地  
✅ Phase 1 開工前的 Sprint planning 已開

---

## ⚠️ Phase 0 內最常被低估的事

1. **行政區邊界版本控制** — 鄉鎮合併會發生（如 2010 五都升格、2014 桃園升格）。本檔示意用 2024+ 最新版，但歷年資料對齊時要小心
2. **縣市維 view 的 refresh 排程** — 靜態表少有變動，但 refresh 一次成本高，要排在夜間
3. **TGOS rate limit 實打驗證** — swagger 沒寫明，要實際壓測；萬一比預期嚴，後端 cache 策略要更積極
4. **設計師的色階圖意見** — choropleth 色階是設計師最容易有意見的環節，要早跑

---

## 下個階段（Phase 1）等什麼條件就可以開工？

- [ ] Phase 0 全部 ✅
- [ ] 水資源 ETL（4 個 pipeline）落地
- [ ] 設計師 Hi-fi 水資源主題 mockup 完成
- [ ] 「假主題跑通」驗收通過

達標 → Phase 1 W3 起跑。
