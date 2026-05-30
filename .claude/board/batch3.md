# Batch 3 — 後端根治 ETL（去 taipei-gis-analytics / gis-platform）

> 執行：2026-05-30 · Flow B · gis-platform migration 138-141
> Commits：gis-platform `e0fdd41`(main) · taipei-gis-analytics `bab4d7e`(master)（未 push）
> 原則：每項先驗證再改；anon REST 實測；不可得來源 🔴 記原因。

---

## ✅ D-1 🔴🔴 出生/死亡量級錯 + 補民國114（national_population_trend）

**查證**：`spatial.national_population_trend` 是 view，聚合 `spatial.village_demographics_yearly`。村里 `birth_total/death_total` 來自 `ODRP010_{YYYY}12.csv`＝戶政司村里動態「**12 月單月**」，被 SUM 當年度存 → 民113 全國出生 12,496 / 死亡 17,445（實際 134,856 / 202,107，約 1/10）。新北 1,573、連江 10 同症。原始檔**只有 YYYY12 單月**，無逐月可彙總。

**修法**：
- 新建權威表 `demographics.national_vital_yearly`（民104-114，戶政司戶籍登記年度合計，已用 dgbas A130203010 + 衛福死因統計交叉確認量級）。
- 重定義 view：`births/deaths/natural` 改吃 national_vital_yearly（覆蓋村里單月錯值）；`population/aging/median/elderly/village_count` 仍由村里聚合（民104-113 正確）。
- 補民114(2025)：`total_population=23,299,132`（township_monthly 對齊）、`births=107,812`、`deaths=200,268`、`natural=-92,456`、`aging_index=174.25`（全國彙總 65+/0-14×100，由 population_by_age_sex_county 2025 算）。

**驗證**（anon REST `Accept-Profile: spatial` 206）：11 列(104-114)。民113 出生134,856/死亡202,107；民114 出生107,812/死亡200,268/現住23,299,132/老化174.25。**死亡交叉年=民109(2020)**（自然增加 民108=+2,343 最後正值 → 民109=-7,907 首度轉負；原 bug 資料誤判在民110）。

**新表/VIEW**：`demographics.national_vital_yearly`（新表，11 列，anon 可讀）；`spatial.national_population_trend`（view 重定義）。

**前端該怎麼接**：
- ViewA 人口頁頭部「老化/自然增加/出生死亡 trend」**自動修正且到民114**，前端**無需改 query**（同一 view、同欄位、多一年 114）。請移除任何「口徑存疑」短期 badge。
- ⚠️ **avg_aging_index 方法學落差**：民104-113 是「村里未加權平均」(113≈270.9，偏高於真實全國≈159)、民114 是「全國彙總值」(174.25)。trend 在 113→114 會出現視覺落差(271→174)。**建議後續**：把整條 aging 序列統一成全國彙總口徑（需歷年 age-band，本輪無歷史村里 age 資料故未動）。短期前端若覺落差刺眼，可只顯示 aging「最新值」而非連線 trend，或加註說明。

**🔴 縣市別（village_demographics_yearly / ViewB 全縣市人口動態）— 未修，來源不可得**：
- 縣市別「年度」出生/死亡**無現成來源**：戶政司只發村里級「月報」、本地僅存 12 月檔；dgbas 出生死亡僅全國維度；SEGIS county_indicators 無出生死亡欄。
- 故 **ViewB 縣市人口動態的 births/deaths 仍是村里 12 月單月值（量級錯，新北 1,573 等）**。
- **前端該怎麼接**：ViewB 縣市別 births/deaths **暫不可信**，請（a）標示「12 月單月、非年度」或（b）暫隱該兩欄，待縣市年度來源（須程式化彙總戶政司村里 12 個月月報，另開任務）。村里 ETL 已加語意警告註解（`12_build_village_yearly.py`）。

---

## ✅ F-1 🔴 火災月度/時段「三年累計標單年」（fire.incidents_by_hour_month）

**查證**：MV `fire.incidents_by_hour_month` 原 `GROUP BY county_id,month,hour` **無 year** → 民111-113 三年合併。`fire.incidents` 有 111(15,848)/112(17,394)/113(15,384)。前端依 month/hour 加總＝三年總和（台北 12 月加總 3,957 ≠ 全年 1,137；ViewA SPLIT 4 段 48,626 ≠ KPI 15,384）。

**修法**（migration 139）：MV 加 `data_year_minguo` 維度（與 incidents_by_county_year 同口徑），重建 MV + index；public wrapper `public.fire_incidents_by_hour_month` 一併 expose `data_year_minguo`。

**驗證**（anon REST 206）：MV 12,590 列，111/112/113 分開。台北單年 113=**1,137**（=全年，原 3,957）/112=1,268/111=1,552。

**新表/VIEW**：MV `fire.incidents_by_hour_month`（重建+year）；`public.fire_incidents_by_hour_month`（wrapper +year 欄）。

**前端該怎麼接（需跟進，否則仍顯三年總和）**：
- `lib/queries/fire.ts` 的 `IncidentsByHourMonthRow` 加欄位 `data_year_minguo: number`。
- `fetchIncidentsByHourMonth()` 帶 year filter：`.eq('data_year_minguo', 113)`（或預設最新年；KPI 用單年＝民113）。
- ViewBFire.tsx 月度圖、ViewARail.tsx SPLIT 時段：filter 單年後再 sum by month/hour。
- ⚠️ **未加 filter 前**：取全部列再 sum 仍是三年總和（不比現況更糟，但要 filter 才正確）。

---

## ✅ F-2 ⚠️ 消防栓涵蓋釐清（fire.hydrants）— 確認台北「重複灌兩次」並去重

**查證**：fire.hydrants 各縣市（去重前）：台北A=43,724 / 高雄E=39,392 / 新北F=8,572 / 屏東T=3。**「91,691」= 43,724+39,392+8,572+3 = 全台總和**，被前端誤標成「高雄」。台北 43,724 = 同批北水處消防栓被兩個 dataset 灌入：
- `datagov:146006`（北水處 UTL XML，地上/地下式消防栓，hydrant_id=TP_WPH*）≈21,848
- `datagov:128639`（data.gov CSV，地上/地下式，hydrant_id=A_HYD_*）≈21,876
- 兩者 hydrant_id 格式不同（PK dedup 抓不到），但座標 round(4) 重疊 **21,541（≈99.5%）**＝同一批實體。

**修法**（migration 141）：刪台北 `datagov:128639` 重複列（保留 146006 北水處權威源；128639 的新北列保留）。ETL `12e_upload_hydrants.py` 加 `dedup_taipei_overlap()`（county 校正後執行，與 migration 等價）。

**驗證**（anon REST `Accept-Profile: fire` 206）：台北 43,724→**21,848**（僅剩 146006）；高雄39,392/新北8,572/屏東3 不動。

**涵蓋結論（DB 標清）**：
| 縣市 | 筆數 | 涵蓋 |
|---|---|---|
| 台北 A | 21,848 | ✅ 完整（北水處全市） |
| 高雄 E | 39,392 | ✅ 完整（5 個 data.gov dataset） |
| 新北 F | 8,572 | ⚠️ 部分（僅 128639） |
| 屏東 T | 3 | ⚠️ 零星樣本，視為無資料 |

**前端該怎麼接**：
- **不可 SUM 全台當單一縣市**（91,691 的由來）。消防栓數/密度一律 **per-county** 顯示。
- 標示「部分涵蓋」縣市（新北、屏東）；台北/高雄可標完整。
- S2Response.tsx / ViewBFire.tsx 三處 hydrantCount 改用 per-county 正確值（台北 21,848、高雄 39,392），移除「僅高雄完整」舊假設（台北其實也完整）。

---

## ✅ M-2(b) ⚠️ port_traffic 航商名污染（maritime.port_traffic_yearly）— 後端根治

**查證**：港別列混入無法解析成港名的 LOCODE，fallback 寫成假港名：`(CMA)`TWCMA / `(KTA)`TWKTA / `(SHL)`TWSHL / `(OWP)`TWOWP，共 **7 列**（2025/2026，值極小 73 TEU / 8-82 艘次）。全國(national)列 port_name=NULL 為合法設計（CHECK 約束），不動；全國總量非由港別 SUM，刪這 7 列不影響全國數字。

**修法**：
- DB（migration 140）：`DELETE scope='port' AND port_name LIKE '(%'`（冪等，刪 7 列，48→41）。
- ETL（`05_fetch_imarine.py`）：加 `PORT_BLACKLIST={TWCMA,TWKTA,TWSHL,TWOWP}`，etl_ship/etl_container 不再 emit 該港別列（全國累加在 blacklist 前完成，不受影響）；移除 LOCODE_ZH_FALLBACK 的 4 個假港名。

**驗證**（anon REST `Accept-Profile: maritime` 206）：港別污染 0 列；TOP 全是真港名（高雄港/臺中港/基隆港/臺北港…）；全國 2025 艘次95,162/TEU14,607,647/噸216,916,398 不變。

**前端該怎麼接**：根源已清，`deriveTopCommPorts` 的 `startsWith("(")` 防衛(Batch1)**保留為雙保險**即可，無需改動。

---

## ✅ W-3 ⚠️ 滯洪池容量 0（public.detention_basins）— DB 查證 + 結論（無 migration）

**查證**：欄位是 `designed_volume_m3`（非 design_capacity_m3）。各縣市分布：
| county | 座 | designed_volume_m3 |
|---|---|---|
| 台北 taipei | 17 | **全 NULL** |
| 台南 tainan | 45 | **全 NULL** |
| 桃園 taoyuan | 11 | **全 NULL** |
| 台中 taichung | 1 | **全 NULL** |
| 中科 central_park | 18 | 有值(1,366,314) |
| 竹科 hsinchu_park | 29 | 有值(537,378) |
| 高雄 kaohsiung | 13 | 有值(2,956,400) |
| 南科 south_park | 6 | 有值(1,650,236) |

**結論：是 NULL（缺值），非真 0**。根因＝來源資料就缺設計容量欄（台南108523/桃園152950 來源無此欄；台北140019 只有事件最高滯洪量 `current_volume_m3` 非設計容量）。非 ETL bug。

**前端該怎麼接（前端改另列）**：
- `ViewB.tsx:1079` DETENTION 區塊：`fetchDetentionSummary` 目前 `vol += Number(r.designed_volume_m3 ?? 0)` 把 NULL 當 0 加總 → 顯示「0.0 萬m³」。
- 改為：**只 sum 非 NULL**；若該縣市所有座皆 NULL（台北/台南/桃園/台中）→ 容量顯示「**—（容量待補）**」而非「0.0」，但**座數照常顯示**（台北仍 17 座）。
- 即：容量 = NULL 全缺 ⇒ 顯示 —；有部分有值 ⇒ sum 有值者並可標「部分」。

---

## 跨 repo / 文件同步

- ✅ gis-platform `docs/data-inventory.md`：人口(新表 national_vital_yearly + D-1 註記)、fire(F-1/F-2)、maritime(M-2b)、spatial(national_population_trend) 皆已更新。
- ✅ ETL 語意註記：`12_build_village_yearly.py`(D-1)、`05_fetch_imarine.py`(M-2b)、`12e_upload_hydrants.py`(F-2)。
- ✅ anon GRANT/RLS：national_vital_yearly 加 anon SELECT policy；fire wrapper GRANT SELECT；`NOTIFY pgrst` 已送。
- 未 push（依指示）。dev server 未啟動。

## 前端跟進清單（彙整）
1. **F-1**：fire.ts 加 `data_year_minguo` 欄 + query `.eq('data_year_minguo', 113)`，否則月度/時段仍三年總和。
2. **F-2**：hydrant 改 per-county 顯示（台北21,848/高雄39,392），勿 SUM 全台；標部分涵蓋(新北/屏東)。
3. **W-3**：detention 容量 sum 只算非 NULL，全缺顯「—（容量待補）」非 0.0。
4. **D-1**：ViewA 自動好（移除存疑 badge）；ViewB 縣市 births/deaths 暫不可信（標單月或暫隱）；aging trend 113→114 方法學落差待統一。
5. **M-2(b)**：無需改，防衛保留。

=== DONE batch3 ===
