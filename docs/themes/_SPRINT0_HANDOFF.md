# 三新主題 Sprint 0 前置 ETL · 執行清單 & Handoff

> **一句話**：人口 / 軌道 / 航運 三個 `draft` 主題的 manifest + 詳規已就緒，但要先補完關鍵缺口資料（Sprint 0 前置 ETL）才能上前端。本文是**跨 repo 的可執行清單**，照著做即可。
>
> **兩個定錨決策（不可動）**
> 1. **靜態統計、不放即時** — mini-taiwan-info 只呈現統計資料；即時（列車位置、AIS 船舶）歸 `mini-taiwan-pulse`。
> 2. **缺口先補再上線** — 缺口資料全部排在 Sprint 0，前端 view 在其後。
>
> 最後更新：2026-05-27 · 範本對齊：water / fire（已上線主題）

---

## 0. 涉及的三個 repo 與資料流

```
taipei-gis-analytics            gis-platform              mini-taiwan-info
（探索 & 開發 pipeline）   →    （Supabase 儲存）    →    （前端 manifest 消費）
 pipelines/{theme}/             migrations/NNN_*.sql       themes/{theme}.yaml
 data/processed/{theme}/        Supabase schema.table      frontend ViewA/ViewB
```

每個 ETL 工作項都走 `taipei-gis-analytics/.claude/CLAUDE.md` 的「探索 → 上線 8 步」，完成後**必補** catalog `.md` + `data-registry.yaml` + audit（見 §5）。

**主題對映**（資料落在既有 analytics 主題，不開新主題）：
- 人口 → analytics `demographics` 主題
- 軌道 → analytics `transportation` 主題（新 `pipelines/transportation/rail/`）
- 航運 → analytics `transportation`（港口/船）+ `agriculture`/`environment`（漁業統計）

---

## 1. Sprint 0 工作項（8 項 = 3 主題 × 各缺口）

> migration 編號以 gis-platform 當下 `ls migrations/` 為準；目前最新 **114**，下表用 **115 起**示意。

### 👥 人口 demographics

#### `S0-DEMO-1` 性別 × 5 歲年齡組金字塔 🔴 唯一硬缺口
- **缺口**：現有本地資料「5 歲組」與「性別」是兩個獨立維度、未交叉，畫不了標準金字塔。
- **來源**：戶政司「現住人口性別、年齡、婚姻狀況(含同婚)」(national DL) 或各縣市民政局「現住人口數按性別及年齡分」(catalog 命中臺南 107-115 / 臺中 / 基隆 / 新竹縣 / 澎湖 / 連江 等現成 DL)
- **pipeline**：`taipei-gis-analytics/pipelines/demographics/population/`（新增 `15_fetch_age_sex_pyramid.py`）
- **目標表**：`demographics.population_by_age_sex_county`（migration 115）— 欄位：county_id, age_band(0-4…100+), sex, population, stat_year
- **解鎖 manifest**：`demographics.yaml` 的 `population_pyramid` chart + 年齡結構 tab
- **驗收**：22 縣市 × 21 個 5 歲組 × 男/女，可繪男左女右標準金字塔
- **依賴**：無 · **狀態**：☐

#### `S0-DEMO-2` 全國村里 / 統計區屬性上 Supabase
- **缺口**：村里 171 欄 / 統計區 345 欄屬性僅雙北+新竹在線上，全國面圖缺。
- **來源**：本地 `data/processed/demographics/population/yearly/village_demographics_all.parquet`（104-113）+ `village_comprehensive/village_comprehensive.geojson`
- **pipeline**：上傳腳本（analytics → Supabase；可沿用 `national_basics` 上傳模式）
- **目標表**：擴充 `spatial.village_*` 屬性（`admin.villages` 邊界已存在於 migration 110）（migration 116）
- **解鎖 manifest**：城鄉分布 tab 的全國村里 choropleth + 日夜人流（標模擬版）
- **驗收**：全國 ~7,800 村里 10 年屬性可 query
- **依賴**：無 · **狀態**：☐

### 🚆 軌道 rail

#### `S0-RAIL-1` 逐站縣市歸屬 space join ⭐ 其他項的前提
- **缺口**：現況只有 system_id/line_code，無乾淨的逐站 county_id。
- **來源**：`mini-taiwan-pulse/public/geo/station_points.geojson`（491 站）+ reference 行政區邊界
- **pipeline**：`taipei-gis-analytics/pipelines/transportation/rail/`（**新目錄**，`01_stations_county_join.py`）
- **目標表**：`rail.stations`（system / class / county_id / lat / lng）（migration 117）+ `line → county_ids[]` 映射
- **解鎖 manifest**：跨縣市系統(北捷/桃捷雙縣市)、按縣市篩選、各縣市車站數 choropleth、point_profile
- **驗收**：491 站皆有 county_id；北捷/桃捷的 line 正確標出跨縣市
- **依賴**：無（但必須先於 RAIL-2/3）· **狀態**：☐

#### `S0-RAIL-2` 站 / 線 / 車次統計落表（時刻表 derive）
- **缺口**：站/線幾何與車次統計散在 mini-pulse 靜態檔 + collector，未落 Supabase。
- **來源**：`mini-taiwan-pulse/public/rail/*/tracks/` + `*/schedules/` + data-collectors `rail_timetable.py` / `tra_static.py`（TrainType 車種）
- **pipeline**：`pipelines/transportation/rail/`（`02_lines.py`、`03_station_daily_trips.py`）
- **目標表**：`rail.lines`、`rail.station_daily_trips`（每站每日停靠車次 + 尖峰離峰每小時分布 + 車種占比）（migration 118）
- **解鎖 manifest**：路線數 / 營運里程 / 每日總車次 / 尖峰離峰 / 車種 donut / 大站停靠車次排名
- **驗收**：每站每日停靠車次、每小時班次分布、台鐵車種占比皆可查
- **依賴**：`S0-RAIL-1`（站 county_id）· **狀態**：☐

#### `S0-RAIL-3` 站級進出站運量
- **缺口**：站級進出站人次 catalog 已索引但全未撈。
- **來源**：台鐵「每日各站進出站人數」+ 各捷運「各站旅運量」+ 高鐵運量（datagov，monthly）
- **pipeline**：`pipelines/transportation/rail/`（`04_ridership.py`，撈後 join 站碼 → 座標）
- **目標表**：`rail.ridership_by_station`（migration 119）
- **解鎖 manifest**：年運量 KPI + 大站運量排名 + 各縣市運量 choropleth（manifest 中標 placeholder 者轉正）
- **驗收**：各系統站級月運量 join 到站點，可排名 / 著色
- **依賴**：`S0-RAIL-1`（站碼↔座標↔county）· **狀態**：☐

### ⚓ 航運 maritime

#### `S0-MAR-1` 277 港口全量上 Supabase ⭐ 最快出成品（資料現成）
- **缺口**：線上 `ports` 表只有 73 筆 TDX 子集。
- **來源**：`taipei-gis-analytics/data/processed/transportation/ports/ports_merged_latest.geojson`（277 筆，**現成**）
- **pipeline**：`pipelines/transportation/port/02_fetch_ports_merged.py`（已存在，只需上傳 + migration）
- **目標表**：`maritime.ports`（port_class / county / county_id）（migration 120）
- **解鎖 manifest**：港口 / 漁港 / 商港 KPI + 分類 donut + 各縣市港口數 choropleth + point_profile
- **驗收**：277 筆含 port_class/county_id 線上可 query
- **依賴**：無 · **狀態**：☐

#### `S0-MAR-2` 漁業縣市統計
- **缺口**：漁業生產量 / 產值 / 漁船數未撈。
- **來源**：漁業署「漁業生產量 / 產值─按縣市別分」+ 主計處各縣市現有漁船數（datagov，yearly）
- **pipeline**：`pipelines/agriculture/fishery_stats/`（新目錄，`01_fetch_fishery_stats.py`；落點 agriculture 或 environment 由執行者確認）
- **目標表**：`maritime.fishery_stats_by_county`（migration 121）
- **解鎖 manifest**：漁業生產量 / 產值 / 漁船數 KPI + choropleth + 漁業 tab
- **驗收**：各縣市年度漁業統計可查
- **依賴**：無 · **狀態**：☐

#### `S0-MAR-3` iMarine 港埠運量
- **缺口**：進出港船舶 / 貨櫃量未撈。
- **來源**：航港局 iMarine `171745`(進出港船舶) / `171741-3`(貨櫃) / `171744`(承運量)（datagov，全國級無座標）
- **pipeline**：`pipelines/transportation/port/`（`03_fetch_imarine.py`）
- **目標表**：`maritime.port_traffic_yearly`（migration 122）
- **解鎖 manifest**：年進出港船舶 / 貨櫃量 KPI + 趨勢（無座標 → 指標/趨勢，join 港口後氣泡標註）
- **驗收**：港別 / 全國年度運量可查
- **依賴**：`S0-MAR-1`（join 港口點位）· **狀態**：☐

---

## 2. 建議執行順序（依賴 + 平行批次）

```
批次 1（現成資料 / 低風險，可立即平行）
  ├─ S0-MAR-1  港口全量上傳   → 航運 View A 立即可動（最快見效）
  ├─ S0-RAIL-1 逐站 county join → 解鎖軌道縣市維（其他軌道項前提）
  └─ S0-DEMO-2 村里屬性上傳

批次 2（需撈新 open data，可平行）
  ├─ S0-DEMO-1 性別×年齡金字塔  → 人口 View A 解鎖（人口最單純，單一缺口）
  ├─ S0-MAR-2  漁業縣市統計
  ├─ S0-MAR-3  iMarine 運量      （依賴 MAR-1）
  └─ S0-RAIL-3 站級運量          （依賴 RAIL-1）

批次 3（derive 統計）
  └─ S0-RAIL-2 站/線/車次統計     （依賴 RAIL-1）
```

**最短上線路徑**：批次 1 完成後，航運與軌道的「家底型」KPI（港口數/分類、車站數/路線）即可上 View A；批次 2 的人口金字塔讓人口分頁完整。

**分工模式**（依 memory `feedback_agent_code_main_runs`）：Task Agent 寫 pipeline code，主 agent 跑 + fix bug。各批次內彼此獨立 → **平行派 Agent**。

---

## 3. 每個 ETL 完成後收尾（CLAUDE.md 強制，逐項都要）

```
☐ data/processed/{theme}/{dataset_id}/{dataset_id}_YYYYMMDD.geojson（三維階層，不准頂層散檔）
☐ python3 .claude/skills/data-catalog-audit/generate_manifests.py --theme {theme}（產 _manifest.json）
☐ gis-platform/migrations/NNN_*.sql（建表）→ apply 前先 query 既有 schema（防 silent skip）
☐ data-collectors/（僅即時資料才需；本批多為靜態，跳過）
☐ docs/data-catalog/{theme}/{dataset_id}.md（複製 _template.md，含 v2 frontmatter）
☐ docs/data-registry.yaml（含 paths / manifest / lifecycle）
☐ docs/data-sources.md（部署狀態）
☐ docs/systems/{theme}_tic.md（TIC 體系更新）
☐ python3 .claude/skills/data-catalog-audit/audit.py --check-all-v2（0 ERROR）
☐ 跨 repo：gis-platform/docs/data-inventory.md 加新表；視情況更新 .claude/memory/CROSS_REPO.md
```

---

## 4. Sprint 1+ 前端（Sprint 0 後才動）

各主題前端細節見對應 `docs/themes/{theme}.md` 的 Sprint 規劃。共通步驟（依 mini-taiwan-info 既有範式）：

| 步驟 | 檔案 |
|---|---|
| manifest status 升 `beta` | `themes/{theme}.yaml` |
| 新增資料 hook | `frontend/src/hooks/use{Theme}Data.ts`（`Promise.allSettled` 多表） |
| Supabase query | `frontend/src/lib/queries/{theme}.ts`（前端 reduce 聚合） |
| View A / View B | `frontend/src/components/views/ViewA{Theme}.tsx` + `ViewB{Theme}.tsx` |
| App 接線 | `App.tsx`：import + `THEME_ACCENT_VARS` 加品牌色 + View 三元式加分支 + hook `enabled` |

> ⚠️ **架構紅旗**：`App.tsx` 的 View 分派是巨大三元式，`_STATUS.md` Backlog 已警告「加第 5 主題會炸」。**一次加 3 主題前，先評估把 ViewA/ViewB 重構成 generic（讀 manifest 驅動）**，否則三元式會難以維護。
> ⚠️ `rail.yaml` 有 spec 外的頂層 key `rail_systems`（存 9 系統色票）。目前無 `_schema.json` validator 故無妨；若日後補 CI schema 要放寬。

---

## 5. 狀態追蹤表

| ID | 主題 | 工作 | migration | 依賴 | 批次 | 狀態 |
|---|---|---|---|---|---|---|
| S0-DEMO-1 | 人口 | 性別×年齡金字塔 🔴 | 115 | — | 2 | ☐ |
| S0-DEMO-2 | 人口 | 村里屬性上 Supabase | 116 | — | 1 | ☐ |
| S0-RAIL-1 | 軌道 | 逐站 county join ⭐ | 117 | — | 1 | ☐ |
| S0-RAIL-2 | 軌道 | 站/線/車次統計 | 118 | RAIL-1 | 3 | ☐ |
| S0-RAIL-3 | 軌道 | 站級運量 | 119 | RAIL-1 | 2 | ☐ |
| S0-MAR-1 | 航運 | 277 港口上傳 ⭐ | 120 | — | 1 | ☐ |
| S0-MAR-2 | 航運 | 漁業縣市統計 | 121 | — | 2 | ☐ |
| S0-MAR-3 | 航運 | iMarine 運量 | 122 | MAR-1 | 2 | ☐ |

---

## 6. 參考檔案

- Manifest：`themes/demographics.yaml` / `themes/rail.yaml` / `themes/maritime.yaml`
- 詳規：`docs/themes/demographics.md` / `rail.md` / `maritime.md`
- 範本主題（已上線）：`themes/water.yaml` / `themes/fire.yaml` + `docs/themes/fire.md`
- manifest 規格：`docs/04-theme-manifest-spec.md`
- 前端進度 SSOT：`_STATUS.md`
- 跨 repo SSOT：
  - `taipei-gis-analytics/docs/DATA_LAYOUT.md`（資料骨架憲法）/ `docs/THEMES.yaml`（主題 SSOT）/ `docs/data-registry.yaml`
  - `taipei-gis-analytics/docs/systems/transport_tic.md`（軌道+航運整合視圖）
  - `gis-platform/docs/data-inventory.md`（線上 Supabase 清冊）
