# ETL 貓纜班次污染後端根治（etl_cable_fix）

**日期**: 2026-05-30　**Flow**: B（analytics + gis-platform，不動 data-collectors）　**狀態**: ✅ 根治完成

## 問題
`rail.station_daily_trips` 內貓空纜車(貓纜) 4 站（system_id='trtc'、line_id='MK'、MK01-MK04）
daily_stop_count 各 **962**，是全國 daily_stop_count TOP1-4，污染「大車站車次排名」。
根因：來源 `mini-taiwan-pulse/public/rail/trtc/schedules/MK-1-0.json`(481 班)+`MK-1-1.json`(481 班)
兩方向靜態快照 → 481+481=962，被 07 ETL 當軌道班次灌入。貓纜是**索道(gondola)非軌道班次**。

## 做法選擇：排除（非 transport_type 標註）
- **選排除**：與前端 isCableBackfill 一致、最乾淨；migration 123 表無 transport_type 欄。
- **未選次選方案**（加 transport_type='gondola' 欄）：需 gis-platform migration 137 改建表 +
  前端另處理，較重，無「日後 gondola 專用顯示」明確需求 → 不採用。

## 改了哪些檔
**taipei-gis-analytics**（commit `1d563c5`，未 push）：
- `pipelines/transportation/rail/07_derive_station_daily_trips.py` — derive_metro 聚合迴圈加
  `if real_sys=='trtc' and lid=='MK': continue`（+ docstring 註記）
- `docs/data-catalog/transportation/rail_station_daily_trips.md` — 528→524 + MK 排除陷阱 + 更新日期
- `docs/data-registry.yaml` — coverage/row_count 528→524 + notes
- `docs/systems/transport_tic.md` — 最後更新欄 + 表格列 528→524
- `data/processed/transportation/rail_station_daily_trips/_manifest.json` — 重產（指向 20260530.parquet）

**gis-platform**（commit `fe30294`，未 push）：
- `migrations/137_rail_station_daily_trips_drop_maokong_gondola.sql` — 冪等 DELETE（新增）
- `docs/data-inventory.md` — 528→524 + MK 排除註記

## 執行
1. 重跑 `07_derive_station_daily_trips.py` → 528→**524 列**（trtc 139→135，其餘系統列數全不變）
2. `08_upsert_..._supabase.py` → upsert 524 列（PK 唯一自檢通過）
3. **DELETE 既有 4 筆 MK**（UPSERT 不刪舊列）：
   `DELETE FROM rail.station_daily_trips WHERE system_id='trtc' AND line_id='MK'`
   → **DELETE rowcount = 4**，刪後 MK=0，全表 524。

## REST 驗證（anon，Accept-Profile: rail）
- `line_id=eq.MK` → **`[]`（0 筆）** ✅
- 全國 TOP（order=daily_stop_count.desc）→ **TOP1 = trtc/R22/R 748（北投）**，
  接續 G03 623 / BL09-BL15 590…，**不再有 962/MK** ✅
- trtc 筆數 = **135**（content-range 0-134/135） ✅

## 前端
不用動。前端 `isCableBackfill`（排除 line_id=='MK'）止血邏輯在後端根治後變成**無害的安全網**，
可保留或日後移除——MK 已不在 station_daily_trips，前端排除條件已永遠匹配不到。

## 收尾
- 兩 repo 各自 atomic commit（只 add 明確路徑、未 push）。
- 注意：`rail.stations` 仍保留 trtc 139 站含 MK01-04（實體車站存在，僅班次統計不計索道）。

=== DONE etl_cable_fix ===
