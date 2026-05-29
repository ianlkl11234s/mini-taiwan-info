# front_rail · 進度板

## 2026-05-30 — 各系統縣市別車次接通真實 Supabase

### 驗證發現（不信文件/稽核，REST 實測）
- rail schema **已 exposed**（`Accept-Profile: rail` 直接 200）。
- `station_daily_trips`：**528 列**，有 `system_id` / `station_id` / `daily_stop_count`（+ peak/offpeak/hourly/by_train_type）。
- `stations`：**535 列**，`county_id`(A–Z 內政部) / `county_name` / `system_id` / `station_id` 齊備。
- 稽核屬實：ViewBRail 概覽 tab「各系統縣市別車次」是 `PendingDataCard`（placeholder，note「待 collector 接通」）。早先的假估算已被移除，僅剩占位卡。
- 底層足以聚合「縣市 × 系統」車次：`stations(county_id)` join `station_daily_trips(system_id|station_id)` 按 system 加總 `daily_stop_count`。各系統加總 = 既有 `deriveCountyAggregates.dailyTrips`（同一 tripMap join，內部一致）。
- ground-truth（python 預算，與 UI 完全吻合）：
  - **TPE(A)**：trtc 44,464 / tra 1,123 / thsr 365 / tymc 278 = 46,230 次/日
  - **KHH(E)**：krtc 12,189 / klrt 6,006 / tra 2,012 / thsr 163 = 20,370 次/日

### 做了什麼
1. `lib/queries/rail.ts`：新增 `CountySystemTripsRow` 型別 + `deriveCountySystemTrips(countyIdMoi, stations, trips)` — 回傳該縣市各系統「站數 + 日均停靠車次」，依 trips 降冪。
2. `ViewBRail.tsx` OverviewTab：
   - signature 收 `data: RailDataState` + `county`，呼叫點補傳。
   - 以 `deriveCountySystemTrips` 算 `sysTrips`，用橫條 breakdown（色票對應系統 + 站數 + 佔比 %）取代 `PendingDataCard`；subtitle 主力系統改依車次最高者 + 佔比。
   - fluid flex 版面（label 92px 可 ellipsis / bar flex:1 minWidth 36 / 數字 92px nowrap tabular-nums），窄 pane 不擠垮。
   - 移除 `PendingDataCard` import（此檔唯一引用點）。
   - 更新頂部註解：各系統縣市別車次 → real；資料缺口僅剩臺鐵 2024 月度（ETL Wave 2，未碰，RidershipTab 仍以 missing-data-card 標註）。

### 改了哪些檔
- `frontend/src/lib/queries/rail.ts`（+41，deriveCountySystemTrips）
- `frontend/src/components/views/ViewBRail.tsx`（OverviewTab 接線 + 移除 placeholder）

### typecheck
✅ `pnpm typecheck`（tsc --noEmit）綠燈，無錯。

### 視覺驗證（dev server :5174 + agent-browser）
- **TPE 概覽 tab**（viewport 1440）：臺北捷運 **44,464**(96%, 90站) / 臺鐵 1,123(2%) / 高鐵 365(1%) / 桃園捷運 278(1%)，色票正確、bar 比例正確、無爆版。
- **KHH 概覽 tab**（viewport 1440）：高雄捷運 **12,189**(60%,黃) / 高雄輕軌 6,006(29%,綠) / 臺鐵 2,012(10%,藍) / 高鐵 163(1%,橘)，加總 20,370 = ground-truth。
- **窄寬度 900px**：bar/標籤乾淨 reflow；eval 證實我的 row/section/`.dashboard-pane` 三層 `scrollWidth == clientWidth`（零內部 overflow，row 458px 容於 pane 500px）。截圖右側數字被切是 app 在窄 viewport 的 page-level min-width 水平 overflow **既有行為**（同畫面既有 KPI card「46,230 次/日」一樣被切），非本次新增內容造成。
- console 僅 GoTrueClient 多實例 warning（withSchema 多 client 既有現象，非 error）；無 rail query 錯誤。
- 地圖區 WebGL 在 headless 顯示「載入失敗」屬預期，與本任務無關。

### commit
`bf4b73b` feat(rail): 接通各系統縣市別車次真實資料（未 push）

=== DONE front_rail ===
