# Design Brief · ViewB Water 縣市儀錶板

> 2026-05-16 由 Session 8 wrap-up 後盤點產出，基於 ViewA Water 6 章敘事架構。
> 目的：給設計師作為重新設計 ViewB 的依據。

---

## 設計目標

點 ViewA 任一縣市（22 中其一）→ ViewB 該縣市專屬儀錶板。

**沿用 ViewA Water 6 章敘事節奏**（章 1 現況 / 章 2 儲存 / 章 3 水情燈號 / 章 4 處理 / 章 5 使用 / 章 6 災防），每章換成「該縣市切片」的內容 + 縣市獨有元素（如 hero 基本、排名位置、無資料 fallback）。

**現有 ViewB**（`frontend/src/components/views/ViewB.tsx`）= IA v2 7 tabs（overview/reservoirs/rivers/groundwater/flood/supplies/ranking），跟新 ViewA 6 章不對齊。本 brief 是 ViewB 重做依據，新版要跟 ViewA 體驗一致。

## 資料源狀態圖例

- ✅ 後端 ready，可直接接通真實資料
- 🔶 mock 或部分缺，需要 fallback 設計
- ❌ 完全缺，需要先建後端才能接

---

## Hero · 縣市基本（章 0，固定頂部）

| 元素 | 資料源 | 狀態 |
|---|---|---|
| 縣市名 + emoji + 區位（北/中/南/東/離島） | counties.yaml | ✅ |
| 人口（萬人） | counties.yaml `pop_2024_wan` | ✅ |
| 面積（km²） | counties.yaml `area_km2` | ✅ |
| 鄉鎮市區數 | counties.yaml `township_count` | ✅ |
| 該縣市「水體規模」一句話：「本縣市 X 座水庫 / X 條河 / X 雨量站」 | 衍生 | ✅ |
| **跨章敘事 hook**：如「南部低於歷年 25.5pp」/「LPCD 全國第 X 名」/「無水庫由 X 縣供水」 | hook_rules engine | 🔶 待寫 |

---

## 章 1 · 現況 — 該縣市有多少水體

| 元素 | 資料源 | 縣市覆蓋 |
|---|---|---|
| 該縣市水庫數 | water_reservoirs WHERE county_id = X | ✅ 全 22 縣市（多數 0-3，僅台中 3 / 屏東 3 / 苗栗 2） |
| 該縣市流經河川條數 | river_lines spatial join | 🔶 需新 RPC |
| 該縣市水質測站數 | water_quality_stations WHERE county = X | ✅ |
| 該縣市雨量站數 | realtime.rain_gauge_readings COUNT DISTINCT by county | ✅ |
| 該縣市地下水分區（屬於哪個） | groundwater_zones spatial join | ⚠️ 只西部 9 區有 |
| 該縣市河川警戒站總數 | river_flow_stations WHERE county = X | ✅ |

**設計考量**：離島 / 都會單市可能多項為 0，要設計 graceful empty state（如「本縣市無水庫，主要由 X 縣供水」）

---

## 章 2 · 儲存 — 該縣市現在水多少

| 元素 | 資料源 | 縣市覆蓋 |
|---|---|---|
| **該縣市水庫個別狀況卡**（N 張，每張：名稱 / 即時蓄水率 / 容量 / 30 天 trend） | water_reservoirs_with_status + reservoir_timeseries RPC | ✅ |
| 該縣市平均蓄水率 | 前端 weighted avg | ✅ |
| 該縣市站平均 24hr 雨量 | rain_gauges WHERE county = X 平均 | ✅ |
| 該縣市高警戒水庫數 | filter < 30% | ✅ |
| **「無水庫縣市」替代呈現**：「由 X 縣市 X 水庫供水」+ 顯示外調水庫狀況 | 縣市 → 供水區 mapping | ❌ 要建 mapping |
| **vs 鄰縣 / vs 同區平均**對比 | region_avg | 🔶 衍生 |

---

## 章 3 · 水情燈號 — 該縣市分區水情

| 元素 | 資料源 | 縣市覆蓋 |
|---|---|---|
| 該縣市所屬水情分區（如台南→嘉南 / 高雄→高屏）+ 當前燈號 | drought_alert_current + 縣市→分區 mapping | ✅ 但要建 mapping |
| 該分區 5 年燈號歷史 timeline | drought_alert_history filter | 🔶 collector 累積中 |
| 上次紅燈距今 X 個月 | history MIN | 🔶 |
| 該分區「最嚴重曾達」記錄 | history aggregation | 🔶 |

**設計考量**：6 個水情分區 ≠ 22 縣市，需要 user 知道「我屬於哪個分區」+ 同分區還有哪些縣市

---

## 章 4 · 處理 — 該縣市自來水基建

| 元素 | 資料源 | 縣市覆蓋 |
|---|---|---|
| 該縣市大型淨水場 N 座 + 容量總和 | water_treatment_plants_large WHERE county = X | ✅ 17 座分布 |
| 該縣市所屬台水分區（13 區）+ 該分區配水管線 km | twc_supply_system + 縣市→台水分區 mapping | ❌ 要建 mapping |
| 該縣市自來水用戶數 + 普及率 | water_supply_penetration | ✅ 但 13 區 ↔ 22 縣市對不齊 |
| 該縣市公共汙水廠 N 座 | sewage_treatment_plants WHERE county = X | ✅ |
| 該縣市接管率 | sewage_coverage_yearly WHERE county_id = X | ✅ |
| **vs 全國接管率差距**（綠/紅標） | 衍生 | ✅ |
| **vs 同 region 平均**對比 | 衍生 | ✅ |

---

## 章 5 · 使用 — 該縣市用水

| 元素 | 資料源 | 縣市覆蓋 |
|---|---|---|
| 該縣市 LPCD 最新值 | water_usage_yearly WHERE county_id = X | ✅ |
| 該縣市 LPCD 17 年 trend（**vs 全國平均線疊圖**） | LPCD history + national avg | ✅ |
| **該縣市排名位置「22 中第 N 名」** + 視覺 highlight | ranking sort | ✅ |
| 該縣市漏水率 | water_loss_rate_yearly | ❌ 只有全國 + 北水有 |
| 該縣市 vs 鄰縣 LPCD 比較 | region_avg | ✅ |
| 該縣市用水結構（民生/工業/農業） | — | ❌ DB 無 sector，全國都缺 |

---

## 章 6 · 災防 — 該縣市風險

| 元素 | 資料源 | 縣市覆蓋 |
|---|---|---|
| 該縣市淹水高潛勢面積 % | flood_hazard_pct_by_county WHERE county_id = X | ✅ |
| **該縣市淹水高潛勢「展開到鄉鎮里」list**（深一層） | flood_hazard_zones spatial by township | 🔶 要新 RPC |
| 該縣市河川警戒站 lv1/2/3 split | river state filter by county | ✅ |
| 該縣市雨量警報站（≥ 50 mm/hr） | rain stations filter | ✅ |
| 該縣市滯洪池清單（座 + 位置 + 容量） | detention_basins WHERE county = slug | ⚠️ 僅 5 縣市 + 3 園區，其餘 0 |
| 該縣市地層下陷站近 2 年 trend | land_subsidence WHERE county = 中文 | ⚠️ 僅彰雲嘉屏台南有 readings |
| 該縣市雨水下水道密度 | storm_drainage_pipes | ⚠️ 僅 3 縣市（台北/桃園/嘉義市） |

---

## 縣市獨有（ViewA 沒有，ViewB 該有）

1. **Hero**：縣市基本（人口/面積/鄉鎮）+ 跨章敘事 hook
2. **水庫個別 30 天 trend 卡**（ViewA PointProfile 只看分布）
3. **「無水庫，由 X 縣供水」替代呈現**
4. **「22 中第 N 名」排名位置 highlight**
5. **vs 全國 / vs 鄰縣 / vs 同 region 對比 baseline**
6. **淹水展開到鄉鎮里 list**（ViewA 只到縣市 %）
7. **「該縣市所屬分區」**（水情分區 / 台水分區 / 地下水分區）

## ViewA 有但 ViewB 不該有

- ❌ 4 區加權蓄水率（全國分區視角）
- ❌ 5 大供水水庫排行
- ❌ TOP/BOTTOM 5 LPCD ranking（單縣市看自己位置就好）
- ❌ 全國總計數字單獨秀

## 已知 Coverage Gap（設計師預先設計 fallback）

| 資料 | 缺哪些縣市 | UI 建議 |
|---|---|---|
| 水庫 | 嘉義市 / 新竹市 / 雲林 / 連江 / 基隆 / 宜花東若干 | 「無自有水庫，由 X 縣 Y 水庫供水」+ 外調狀況 |
| 地下水分區 | 東部 + 離島 | 「本縣市非地下水分區範圍」 |
| 滯洪池 | 17 縣市無 | 「本縣市無公告滯洪池資料」 |
| 雨水下水道 | 19 縣市無 | 「資料未開放（限台北/桃園/嘉義市）」 |
| 地層下陷 | 多數縣市非熱區 | 「本縣市非地層下陷監測重點區」 |
| 漏水率 | 21 縣市無 | 「目前僅全國 + 台北市公開資料」 |
| 用水結構 sector | 全國都無 | 「結構估算」mock（同 ViewA） |

## 互動期望

- 點水庫個別卡 → drill 到 ViewC 水庫詳情頁
- 點淹水鄉鎮里 → 高亮地圖該里 polygon
- 點 ranking 位置 → 看完整 22 縣市排名（jump 回 ViewA 章 5）
- 點任一 KPI → 該指標 22 縣市排序（沿用 ViewA explode pattern）
- Hero「鄰縣對比」 → 跳到該鄰縣 ViewB（horizontal navigation）

---

## 對應後端工作（給後端 PM 預估）

設計師完稿後，預估要先做的後端項目（按 design brief 反推）：

| 工作 | 對應章節 | 工時估 |
|---|---|---|
| 縣市 → 供水區 mapping table | 章 2 「無水庫由 X 縣供水」 | 0.5 day（手抄 + migration） |
| 縣市 → 水情分區 mapping table | 章 3 燈號 | 0.5 day |
| 縣市 → 台水 13 分區 mapping table | 章 4 配水管線 | 0.5 day（已在 BACKLOG B055 提過） |
| `get_river_lines_by_county()` RPC | 章 1 河川條數 | 1 day（spatial join） |
| `get_flood_hazard_by_township(county_id)` RPC | 章 6 淹水展開 | 1-2 day（spatial + 縣市內鄉鎮） |
| `get_county_water_summary(county_id)` RPC（一次包章 1 + 章 2 + 章 5）| 統合 RPC 減少 round trip | 1 day |
| Hook rules engine for hero 跨章敘事 | Hero | 1 day（template engine） |

預計 5-6 天後端工作（不含前端實作）。

## 配套文件

- 對應 ViewA design：`designs/v02-claude-design-2026-05-14/`（6 章敘事原始 prototype）
- 對應 fire 主題範例：`designs/v03-fire-design-brief-2026-05-15/`（per-theme view 設計範本）
- 後端就緒度：`taipei-gis-analytics/docs/topic-research/water-overview/kpi-data-status.md`
- 主題 manifest：`themes/water.yaml`（v1.2，county_dashboard.tabs[] 是舊 IA v2 結構，需改寫）
- ViewA 實作：`frontend/src/components/views/ViewAWater.tsx` + `components/water/sections/`
