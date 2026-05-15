# ViewA 全台概覽 · 6 大類別 KPI ↔ Supabase RPC 對接手冊

> 建立於 2026-05-15。後端由 [taipei-gis-analytics/docs/topic-research/water-overview/](../../../taipei-gis-analytics/docs/topic-research/water-overview/) 規劃，本檔聚焦**前端怎麼接**。
>
> **使用流程**：
> 1. user 依本文件改 `themes/water.yaml` ViewA KPI manifest + lottie / explode mapping
> 2. user 改完前端把調整附給後端
> 3. 後端寫 `frontend/src/lib/queries/water.ts` 內的 fetchXxx + `hooks/useXxx.ts`
> 4. ViewA 重畫接通

---

## TL;DR — 14 個 RPC + 4 表，全部已 apply 到 Supabase

| 類別 | KPI | RPC / 表 | Schema |
|---|---|---|---|
| 1 現況 | 24/26/116/2041km/40 等官方數字 | `get_water_facts_official()` | 7 row × {key,value,unit,label,source} |
| 1 現況 | 116 集水區 | `river_basins` 表 | （已既有，前端可能未接） |
| 2 儲存 | 全國加權蓄水率 | `get_reservoir_storage_weighted_avg()` | 單列：weighted_storage_pct + simple_avg_storage_pct + total_capacity_wan + total_storage_wan + n_reservoirs + latest_snapshot_at |
| 2 儲存 | 5+1 區分區蓄水率 | `get_reservoir_storage_by_region()` | 6 row × {region, weighted_storage_pct, min_pct, max_pct, n_reservoirs, ...} |
| 2 儲存 | 集水區累積雨量 | `get_rain_basin_accumulated(p_days)` | N row × {basin_name, total_rainfall_mm, avg_rainfall_mm, n_stations, latest_observed_at} |
| 2 儲存 | 水庫淨流入/出 | `get_reservoir_inflow_outflow_summary()` | 7 row（5 區 + 澎湖 + national） |
| 2 儲存 | 跌破紅線水庫數 | `get_reservoir_low_count(p_threshold)` | 單列含 jsonb `reservoirs_below`（哪幾座） |
| 3 燈號 | 各區當前燈號 | `get_drought_alert_latest()` | N row × {region_name, alert_level, alert_label, alert_color, published_date, days_since_published, fetched_at, data_age_hours} |
| 3 燈號 | 歷次燈號 timeline | `get_drought_alert_history(p_days)` | 同上 schema（不含 days_since/data_age） |
| 4 處理 | 大型淨水場 17 座 | `water_treatment_plants_large` 表 | name, capacity_cmd, fast_mix_type, ... |
| 4 處理 | 管線長度時序 | `water_pipe_length_yearly` 表 | year, pipe_length_km, replacement_pct ... |
| 4 處理 | 月供水趨勢 | `get_twc_system_monthly_trend(p_system_name, p_months)` | N month × {year, month, household_count, supply_m3, avg_per_household_m3} |
| 5 使用 | 全國 LPCD 時序 | `get_water_consumption_yearly(p_years)` | N year × {year, daily_per_capita_l, annual_per_capita_m3} |
| 5 使用 | 漏水率時序 | `get_water_loss_rate_yearly(p_years)` | N year × {year, loss_pct, supply_m3, loss_m3} |
| 5 使用 | 縣市供水普及率 | `get_water_supply_penetration_latest()` | 19 縣市 × {county_id, county_name, penetration_pct, total_population, served_population, collected_at} |
| 6 災防 | 河川警戒佔比 | `get_river_alert_count_by_county()` | 22 縣市 × {county_id, county_name, n_alert_1/2/3/any, alert_pct, n_stations} |
| 6 災防 | 雨量警報數 | `get_rain_alert_station_count(p_threshold)` | 單列 + top5_stations jsonb |

---

## 每個類別實際資料展示（user 設計版面時參考）

### 類別 1 · 現況（官方靜態大數字）

```sql
SELECT * FROM public.get_water_facts_official();
```

```
fact_key                                | fact_value | fact_unit | fact_label
central_managed_rivers                  |   24       | 條        | 中央管河川
cross_provincial_rivers                 |    2       | 條        | 跨省市河川
central_plus_cross_provincial_rivers    |   26       | 條        | 中央管含跨省市
county_managed_rivers                   |   92       | 水系      | 縣市管河川
total_water_systems                     |  116       | 水系      | 主要水系合計
central_managed_total_length_km         | 2041       | 公里      | 中央管河川總長
major_reservoirs                        |   40       | 座        | 主要水庫
```

**前端用法**：6 個 KPI 卡裡的「框架數字」可以從這拉，比 hardcode 安全且未來水利署更新時不用改 code。

### 類別 2 · 儲存（即時，真 LIVE）

```sql
-- 全國
SELECT * FROM public.get_reservoir_storage_weighted_avg();
-- weighted_storage_pct=54.52 | simple_avg_storage_pct=53.15 | n_reservoirs=37

-- 分區
SELECT region, weighted_storage_pct, min_pct, max_pct FROM public.get_reservoir_storage_by_region();
-- 北區  87.50  73.29  104.72
-- 中區  69.90   6.33   86.75
-- 南區  16.30   0.69   84.39   ← 南部缺水實證
-- 離島  24.30   8.38   77.53
-- 澎湖地區  83.77  ...

-- 跌破 30% 紅線水庫
SELECT n_below, total_active, pct_below, reservoirs_below FROM public.get_reservoir_low_count(30);
-- 14 / 37 / 37.8 / [{id, name, region, storage_pct}, ...]
```

**前端 KPI 卡建議**：
- 卡 1「全國蓄水率」：show `weighted_storage_pct`，括號標 `(N=37 座加權)`
- 卡 4「水庫跌破紅線」：show `n_below / total_active`，⤴ explode 拉開 14 座清單（從 jsonb）
- ⚠️ region 欄目前 raw 含「南區」「臺灣南區」並存（資料品質尚未對齊），前端要 normalize 或直接顯示原文

### 類別 3 · 水情燈號（不能標 LIVE，DataAge 採樣 N 天前）⭐

```sql
SELECT * FROM public.get_drought_alert_latest();
```

```
region_name | alert_level | alert_label | alert_color | published_date | days_since_published | data_age_hours
台中地區    | 綠燈        | 水情提醒    | #33A02C     | 2026-04-27     | 18                   | 18.4
新竹地區    | 綠燈        | 水情提醒    | #33A02C     | 2026-04-27     | 18                   | 18.4
```

**重要 UI 規則**：
1. **配色** — 燈號 4 級 `綠/黃/橙/紅` 使用 `alert_color` 欄回傳的精準色碼，**禁止用於蓄水率/雨量等其他指標**（水利署官方明文警告：「使用者顏色設定勿用綠/黃/橙/紅，避免誤導大眾將水庫蓄水率與水情燈號混淆」）
2. **未列出的地區 = 藍燈/正常** — RPC 只回上游有公告的地區（目前 2 筆），前端 fallback 顯示「藍燈」或「全國其他地區未發布」
3. **DataAge 必標** — show「採樣 X 天前」橘色 badge（`days_since_published` 欄），不能標綠 LIVE
4. **爆炸圖內容** — 點卡可展開歷次燈號 timeline（call `get_drought_alert_history(365)`）

### 類別 4 · 處理（建設規模）

```sql
-- 大型淨水場 top 5
SELECT plant_name, capacity_cmd FROM public.water_treatment_plants_large
ORDER BY capacity_cmd DESC NULLS LAST LIMIT 5;
-- 板新淨水場   1,200,000 CMD
-- 鯉魚潭淨水場 1,100,000
-- 南化淨水場     800,000
-- 鳳山淨水場     700,000
-- 坪頂淨水場     630,000

-- 月供水趨勢（特定系統）
SELECT * FROM public.get_twc_system_monthly_trend('基隆', 12);
-- ⚠️ 目前只有 1 個月資料（141 系統 × 民國 115 年 3 月），歷史靠月度 cron 累積
```

**前端 KPI 卡建議**：
- 卡「17 座大型淨水場」：show `COUNT(*)`，⤴ 列出 top 5（板新/鯉魚潭/南化等）
- 卡「管線長度」：show 最新 `pipe_length_km`，⤴ 拉開 21 年趨勢
- ⚠️ **大型淨水場目前 lng/lat 為 NULL**，前端不能畫 map layer（後續另跑 TGOS geocode 補）

### 類別 5 · 使用（歷年治理）

```sql
-- 全國 LPCD 時序近 30 年
SELECT year, daily_per_capita_l FROM public.get_water_consumption_yearly(30);
-- 2024 → 282 L
-- 2023 → 279 L
-- ... 1996 起共 29 年

-- 縣市普及率（19 縣市）
SELECT county_name, penetration_pct FROM public.get_water_supply_penetration_latest();
-- 嘉義市 99.96% / 屏東縣 71.65% ← 1.4 倍差
-- ⚠️ 缺 臺北市（北水處）/ 金門 / 連江

-- 漏水率時序
SELECT year, loss_pct FROM public.get_water_loss_rate_yearly(20);
-- 2024 → 11.99% / 2004 → 23.78% （20 年下降 12 個百分點）
```

**注意 `water_consumption_yearly` 是全國時序，跟既有 `water_usage_yearly` (datagov 8316, 22 縣市×17 年) 互補不重複**：
- water_consumption_yearly → 全國時序（29 年）
- water_usage_yearly → 縣市切片（22×17）

前端 KPI 卡「LPCD」可雙拉：先看全國時序，⤴ explode 看縣市排名。

### 類別 6 · 災防

```sql
-- 河川警戒
SELECT county_name, n_stations, n_alert_any, alert_pct FROM public.get_river_alert_count_by_county()
WHERE n_stations > 0 ORDER BY n_alert_any DESC LIMIT 10;
-- 目前無警戒（合理現況，非梅雨高峰）

-- 雨量警報 50mm
SELECT * FROM public.get_rain_alert_station_count(50);
-- n_above=63 / total_stations=1312 / max_24hr_mm=160.5 / top5 jsonb
```

---

## 配色 reference（CSS variable 建議）

```css
/* 水情燈號 — 上游精準配色，禁止外用 */
--drought-green:  #33A02C;  /* 水情提醒 */
--drought-yellow: #FDB813;  /* 減壓供水 */
--drought-orange: #F58220;  /* 減量供水 */
--drought-red:    #E32636;  /* 分區或定點供水 */
--drought-blue:   #3399FF;  /* 未發布（正常） */

/* 水庫蓄水率 — 用 sequential blues（避開警示色） */
--storage-low:    #D6E6F2;
--storage-mid:    #5DADE2;
--storage-high:   #1F618D;
```

---

## DataAge / LIVE 守則（PRINCIPLES 拍板）

| KPI | 標籤 | 觸發條件 |
|---|---|---|
| 蓄水率 / 雨量 / 河川警戒 / 雨量警報 | **🟢 LIVE** | collector cron + 上游 realtime |
| 集水區累積雨量 (RPC3, 30 天) | 🟢 LIVE | 同上 |
| 水情燈號 | 🟠 採樣 N 天前 | 上游不定期，DataAge 顯示 `days_since_published` |
| 大型淨水場 / 河川條級 | 🔵 靜態 | 年度級數據 |
| LPCD / 漏水率 / 普及率 / 用戶數 / 管線長度 | 🟠 年度 | show「資料時間 YYYY」 |
| 月供水量 (item 136) | 🟠 月度 | show「資料時間 YYYY-MM」 |

---

## 前端 query / hook 範例（user 改完前端後 backend 接這個）

`frontend/src/lib/queries/water-overview.ts`（新檔，後端寫，不是 user）

```ts
import { supabase } from '../supabase';

export async function fetchWaterFacts() {
  const { data, error } = await supabase.rpc('get_water_facts_official');
  if (error) throw error;
  return data as Array<{ fact_key: string; fact_value: number; fact_unit: string; fact_label: string }>;
}

export async function fetchReservoirStorageWeighted() {
  const { data, error } = await supabase.rpc('get_reservoir_storage_weighted_avg');
  if (error) throw error;
  return (data as any[])[0];
}

export async function fetchDroughtAlertLatest() {
  const { data, error } = await supabase.rpc('get_drought_alert_latest');
  if (error) throw error;
  return data;
}

export async function fetchLpcdYearly(years = 30) {
  const { data, error } = await supabase.rpc('get_water_consumption_yearly', { p_years: years });
  if (error) throw error;
  return data;
}

// ... 同 pattern 14 個 RPC 全部包裝
```

---

## 給 user 的改 manifest 提示

`mini-taiwan-info/themes/water.yaml` ViewA section 重寫時參考類別 1-6 的 KPI 對應。重點不在「列出哪幾張卡」（user 自己決定），而在：

1. **每張卡標清楚 source RPC**（avoid 將來忘記從哪來）
2. **每張卡標 explode 模式**（dim 多維 / time 時序 / point 列點）
3. **每張卡標 DataAge 等級**（LIVE / 採樣 N 天前 / 年度 / 月度 / 靜態）
4. **燈號卡禁用蓄水率配色**

User 改完前端 `themes/water.yaml` + KPI 卡 component → 後端接 RPC（按本檔的 query/hook 範例）→ 串通驗收。

---

## 後端聯絡點

- Migration / RPC 原始檔: `gis-platform/migrations/098_water_overview_rpcs.sql` / `100_twc_opendata_yearly.sql` / `101_water_facts_official.sql` / `102_drought_alert.sql`
- Pipeline 一次性 ingest: `taipei-gis-analytics/pipelines/water_resources/datagov/datagov_twc_opendata.py`
- Collector daily cron: `data-collectors/collectors/wra_drought_alert.py`（push 後 Zeabur 自動部署）
- 規劃 SSOT: `taipei-gis-analytics/docs/topic-research/water-overview/kpi-data-status.md`

下次資料源新增 / RPC 改 schema 時：
1. 改 gis-platform/migrations/NNN_*.sql + apply
2. 更新本檔的對應 KPI row
3. 同步 `kpi-data-status.md`
4. 跑 `python3 .claude/skills/data-catalog-audit/audit.py` 驗
