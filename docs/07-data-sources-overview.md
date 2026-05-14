# 07 · 資料來源全景

> 全網站資料分四層。每層職責不同，主題 yaml 內 `data_sources` 段位明確標示。

## 四層資料源

```
┌────────────────────────────────────────────────────────────┐
│ Layer 1 · INTERNAL SUPABASE  (taipei-gis-analytics 收集)   │
│   - production 資料庫 (gis-platform 共用 Supabase)         │
│   - water_*, reservoir_*, river_*, fire_*, demographics_*  │
│   - 由 data-collectors 持續寫入即時/月度資料               │
└────────────────────────────────────────────────────────────┘
                          ▲
                          │ 主要供 View B/C 的主題詳情
                          │
┌────────────────────────────────────────────────────────────┐
│ Layer 2 · MASTER CATALOG  (本地索引)                       │
│   - docs/gov-portals/master_catalog.sqlite                 │
│   - 73,900 筆 22 個政府門戶資料集索引                      │
│   - LLM 標籤、subject/spatial/temporal/disaster tags       │
│   - FTS5 全文搜尋                                          │
└────────────────────────────────────────────────────────────┘
                          ▲
                          │ 探勘新主題時用；不上前端
                          │
┌────────────────────────────────────────────────────────────┐
│ Layer 3 · TGOS MOI API  (互動地圖層)                       │
│   - https://data.tgos.tw/MOIDataThemeAPIMgr                │
│   - 點擊地圖 → 行政區反查（縣/鄉/村）                       │
│   - POI 主題分布 (Theme/Query, Buffer, Nearest)            │
│   - 郵遞區號工具                                           │
│   - 用 .env TGOS_MOI_API_KEY 認證                          │
└────────────────────────────────────────────────────────────┘
                          ▲
                          │ Phase 1 用於首頁 + 互動鑽取
                          │
┌────────────────────────────────────────────────────────────┐
│ Layer 4 · GOVERNMENT OPEN DATA  (外部直抓)                 │
│   - data.gov.tw                                            │
│   - 內政部統計處 (戶政月報)                                │
│   - 經濟部水利署                                           │
│   - 環境部 (水污染裁罰)                                    │
│   - twinkle-hub MCP（探勘用，不上前端）                    │
│   - 6-7 個白金縣市對齊資料集                               │
└────────────────────────────────────────────────────────────┘
```

## 層級職責

| Layer | 用途 | 即時性 | 上前端？ |
|---|---|---|---|
| 1 Supabase | 主題核心數值 + GIS 幾何 | 月度/即時 | ✅ 直接 |
| 2 Master Catalog | 探勘新主題、規劃 KPI | 月度同步 | ❌ |
| 3 TGOS MOI API | 互動地圖（行政區反查、POI） | 即時 | ✅ 用戶互動時 |
| 4 Gov Open Data | 月度 ETL 進 Layer 1，或週期性外部抓 | 月/季/年 | ⚠️ 經 ETL |

## Phase 1 水資源用到的具體資料源

### Layer 1（已在 Supabase）

| 表 | 用途 | 即時性 |
|---|---|---|
| `realtime.reservoir_status` | 即時水庫蓄水率 | 1 小時 |
| `realtime.rain_gauge_readings` | 即時雨量 | 10 分鐘 |
| `realtime.river_water_level` | 即時河川水位 | 10 分鐘 |
| `public.reservoirs` / `reservoir_storage` | 水庫靜態 + 容量 | 年 |
| `public.river_basins` | 流域 polygon | 靜態 |
| `public.river_lines` | 河川 line | 靜態 |
| `public.flood_hazard_zones` | 淹水潛勢 polygon | 不定期 |
| `public.water_quality_stations` + `readings` | 河川水質 | 季 |

### Layer 4（外部，需建 ETL）

| 來源 | dataset id | 用途 | 頻率 |
|---|---|---|---|
| data.gov.tw | `8316` | 縣市別 LPCD 人均用水 | 年 |
| data.gov.tw | `26815` | 縣市別污水接管率 | 年 |
| data.gov.tw / twinkle-hub | `45134` | 縣市別水污染稽查次數 | 年 |
| data.gov.tw / twinkle-hub | `45135` | 縣市別水污染罰鍰次數 | 年 |
| data.gov.tw / twinkle-hub | `45136` | 縣市別水污染實收罰鍰 | 年 |
| 農業部 | `35644` | 18 水利會灌溉用水（→映射縣市） | 年 |
| 環境部 | `45174` | 列管事業 + 下水道點位 | 不定期 |

### Layer 3（互動地圖）

- 點縣市 / 鄉鎮 / 村里 → `Range/Administrative` 反查
- 找附近 POI（學校、消防隊等）→ `Theme/Query` + `Theme/Buffer`
- 鄉鎮級 POI 聚合 → `Theme/Query?County=X` group by Town

## Phase 1 首頁基礎主題（home-basics）資料源

> ⚠️ **TGOS MOI API 不提供人口統計**。首頁的「人口變化、鄉鎮數」必須另接。

| 指標 | 來源 |
|---|---|
| 全國人口 / 縣市人口 | **內政部統計處戶政月報**（datagov:`133252` 或類似 nid） |
| 老化指數 / 扶養比 | 戶政月報衍生 + segis |
| 鄉鎮數 | TGOS `Range/Administrative` 列舉 或 內政部行政區清冊 |
| 村里數 | 同上 |
| 互動鑽取（點縣市看鄉鎮） | TGOS `Range/Administrative` |
| 鄉鎮邊界 polygon | TGOS 或 NLSC 行政區圖資 |

## 授權聲明

| 來源 | 授權 |
|---|---|
| data.gov.tw | OGDL-Taiwan-1.0（政府資料開放授權條款） |
| TGOS MOI API | 內政部資料開放條款（同 OGDL） |
| 內政部統計處 | OGDL |
| 中央氣象署 | CC BY 4.0 |
| OpenStreetMap | ODbL |
| 本網站產出（衍生統計） | CC BY 4.0（建議） |

每張圖表必標來源。embed 嵌入第三方網站時，圖表必帶授權連結。

## ETL 規範

外部資料進 Layer 1 的 pipeline 統一寫在 `taipei-gis-analytics/pipelines/` 下，遵循該 repo 的 SOP：

1. 每個資料源一個資料夾
2. 每個 pipeline 對應一份 `docs/data-catalog/{theme}/{source}.md`
3. 更新 `docs/data-registry.yaml`
4. 跑 `data-catalog-audit` skill 驗證

詳見 `taipei-gis-analytics/.claude/CLAUDE.md` 的「Pipeline 探索 → 上線流程」段。

## 不在前端用的資料源

| 來源 | 為何不用 |
|---|---|
| **Master Catalog SQLite** | 內部探勘用，不是 production 資料；前端要的指標都已落 Supabase |
| **twinkle-hub MCP** | 探勘工具，不適合即時前端查詢 |
| **PDF / Word 政府公文** | 未結構化，需 LLM 抽取後才能用，視作 Layer 4 的次級 |

## 資料更新時間 SLA

| 層級 | 期望更新延遲 |
|---|---|
| 即時感測（reservoir、rain、water level） | ≤ 30 分鐘 |
| 月度統計（戶政、火警） | ≤ 7 天於官方公布日後 |
| 年度統計（LPCD、接管率） | ≤ 14 天 |
| 靜態 POI / 行政區界 | 季度檢查 |

前端要展示 `最後更新` 時間，超過 SLA 顯示 ⚠️ icon。
