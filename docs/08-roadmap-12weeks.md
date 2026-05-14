# 08 · 12 週路線圖

## 全圖

```
W1-2  Phase 0  共用基礎設施 + 設計 finalize
W3-5  Phase 1  水資源 MVP（first complete theme）
W6    Phase 1.5 首頁 home-basics 上線
W7-9  Phase 2  社會經濟（人口 + 住宅）
W10-12 Phase 3 消防
+ 隨時補：跨主題比較、爆炸圖空間爆炸、polish
```

## Phase 0 · 共用基礎設施（W1-2）

**目標**：把所有主題都需要的底子建好。

| 工作 | 負責 | 產出 |
|---|---|---|
| 設計師 hi-fi mockup | 設計 | 4 個 view × 桌機/手機 = 8 張 mockup |
| 行政區邊界表進 Supabase | 工程 | `admin_counties` (22) / `admin_townships` (368) / `admin_villages` (segis) |
| 縣市維 materialized views | 工程 | 給靜態 GIS 表加 county_code（用 ST_Intersects） |
| Theme manifest schema + validator | 工程 | YAML JSON Schema + CI check |
| MapCanvas + ChoroplethLayer 元件 | 前端 | 基礎地圖元件，跨主題共用 |
| AtlasTopBar / ThemeSwitcher 元件 | 前端 | 全域導航 |
| TGOS MOI API 客戶端 | 前端/後端 | 帶 cache 的 wrapper（避免 rate limit） |
| API 路由設計（/api/themes/:id 等） | 後端 | OpenAPI spec |
| 設計系統 tokens（顏色、字體、間距） | 設計+前端 | Tailwind config + design tokens |

**驗收**：能渲染一個「假主題」(stub)，跑通 View A → B → C → D 的 navigation，地圖能著色，但資料用 mock。

## Phase 1 · 水資源 MVP（W3-5）

**目標**：完整跑通水資源主題的 4 個 view + 爆炸圖（維度 + 時間）。

### W3 後端

| 工作 | 產出 |
|---|---|
| ETL：data.gov.tw 8316 (LPCD) | `socioeconomic.lpcd_by_county` 表 |
| ETL：data.gov.tw 26815 (接管率) | `infra.sewage_coverage_by_county` 表 |
| ETL：data.gov.tw 45134/45135/45136 (水污染裁罰) | `environment.water_pollution_fines` 表 |
| 縣市維 view：`v_county_reservoir_status` | 即時水庫按縣市彙整 |
| 縣市維 view：`v_county_rain_24hr` | 24hr 雨量按縣市彙整 |
| API endpoint：`/api/themes/water/overview` | 回 View A 所需資料 |
| API endpoint：`/api/themes/water/counties/:id` | 回 View B 所需資料 |
| API endpoint：`/api/themes/water/datasets/:type/:id` | 回 View C 所需資料 |

### W4 前端

| 工作 | 產出 |
|---|---|
| `themes/water.yaml` v1 | 主題 manifest |
| 套 View A：全國 6 KPI + ranking | 接 `/api/themes/water/overview` |
| 套 View B：6 個 Tab | 接 `/api/themes/water/counties/:id` |
| 套 View C：水庫 / 監測站 / 河川 | 接 `/api/themes/water/datasets/:type/:id` |
| ExplodedView 元件（維度 + 時間） | 點 KPI 卡片展開 |
| DataSourceBadge | 來源 + 更新 + 下載連結 |

### W5 整合 + polish

| 工作 |
|---|
| View D 比較模式（多縣市排名 + 多縣市時序） |
| 「資料未開放」狀態（雨水下水道只 3 縣市等） |
| 跨主題 stub（先放 placeholder） |
| 響應式（手機版上下堆疊） |
| 效能（地圖渲染 < 1.5s、KPI 載入 < 500ms） |
| 文案 review（hook、KPI label、來源標示） |

**驗收**：
- 任一縣市 × 任一 Tab 都能正常顯示
- 縣市覆蓋不全的資料有優雅 fallback
- 4 個 view + 爆炸圖完整可用
- 設計師 review pass

## Phase 1.5 · 首頁 home-basics（W6）

**目標**：把 TGOS MOI + 戶政月報接上，首頁能跑。

| 工作 | 產出 |
|---|---|
| ETL：戶政月報（datagov 內政統計） | `demographics.population_by_county_monthly` |
| TGOS MOI 包裝層：`/api/geo/admin/:level` | 點地圖反查行政區 |
| `themes/home-basics.yaml` | 首頁主題 manifest |
| 首頁版面（KPI：總人口、縣市數、鄉鎮數、村里數、出生率、老化指數） | 接戶政月報 + TGOS Range |

## Phase 2 · 社會經濟（W7-9）

**目標**：上線「人口」+「住宅」兩個次主題。

| W7 | 後端 ETL：戶政月報深化 + 實價登錄 grid（本專案已有） |
| W8 | 前端：`themes/demographics.yaml` + 套 View A/B/C |
| W9 | 前端：實價登錄 Tab + 整合 + polish |

**特別點**：
- 人口主題的 KPI 卡片特別適合「年齡金字塔爆炸圖」（維度爆炸） + 「歷年人口變化」（時間爆炸）
- 實價登錄已有 150m grid pipeline，可用空間爆炸（縣市 → grid 熱圖）

## Phase 3 · 消防（W10-12）

**目標**：上線消防主題。

| W10 | 後端 ETL：消防分隊位置（六都各自 CSV，要 ETL 對欄位）+ 火警月度（45134 + 縣市月報）+ 避難收容所（消防署 73242） |
| W11 | 前端：`themes/fire.yaml` + 「分隊服務圈」demo + 火警原因爆炸圖 |
| W12 | 整合 + polish + 上線預備 |

**特別點**：
- 「消防分隊 5/10 分鐘服務圈 + 戶政人口疊圖」是最強敘事，做成 hero feature
- 火警原因 22 類 → 維度爆炸的標竿範例

## Phase 4+ · 加碼（隨時）

| 項目 | 預估 |
|---|---|
| 爆炸圖空間爆炸（縣市 → 鄉鎮） | 2 週 |
| 跨主題 InsightCard | 1 週 |
| 第 4 個主題（醫療 / 環境 / 交通…擇一） | 2-3 週 / 主題 |
| Embed 嵌入第三方 | 1 週 |
| OG image 自動產生（分享優化） | 1 週 |
| 暗色模式 | 1 週 |
| i18n（英文版） | 2 週 |

## 工作流程

每週週一 demo + 規劃，週五 review + commit。

每完成一個 phase / agent 任務 / migration apply 立即更新：
- `docs/themes/{theme}.md`（主題詳規）
- `themes/{theme}.yaml`（manifest）
- 主 repo 的 `docs/data-catalog/` 對應條目
- 跑 `data-catalog-audit` skill 驗證

## 風險清單

| 風險 | 機率 | 影響 | 對策 |
|---|---|---|---|
| TGOS MOI API rate limit | 中 | 中 | 前端走 cache + 後端代理（不直接從瀏覽器呼） |
| 縣市覆蓋資料不齊（雨水下水道只 3 縣市） | 高 | 中 | 「資料未開放」設計 + 鼓勵縣市開放的引導 |
| 設計師 hi-fi 延期 | 中 | 高 | Phase 0 雙週尾巴設緩衝 |
| 行政區邊界資料更新（鄉鎮合併等） | 低 | 高 | 用 NLSC 官方 + 版本化 admin_* 表 |
| 主題擴充失控（一直加新主題） | 中 | 中 | manifest 規格嚴格 + 每主題 hook 文案 review |
| 即時資料源 API 改版 | 中 | 中 | data-collectors 已有監控 + alerting |

## 終點線（12 週後）

- ✅ 4 個主題上線（首頁基礎 + 水 + 社經 + 消防）
- ✅ 4 個 view 完整可用
- ✅ 爆炸圖維度 + 時間模式完成
- ✅ 22 縣市完整可探
- ✅ 桌機 + 手機可用
- ✅ 文件完整（設計 + 工程 + 運維）
- ⏳ 空間爆炸、跨主題 insight、暗色模式 → Phase 4+
