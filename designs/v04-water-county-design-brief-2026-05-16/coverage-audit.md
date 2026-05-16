# ViewB Water 縣市儀錶板 · 22 縣市資料就緒度盤點

> 2026-05-16 audit · 配套 `SPEC.md`
> 對應後端：gis-platform / taipei-gis-analytics / data-collectors

---

## TL;DR — 給另一個專案的 4 句話

1. **資料就緒度比預期高**：22 縣市 × 9 核心元素 ~80% 可直接接通真實資料，不需後端先補
2. **3 個 mapping table 都不存在**（drought_region / twc_region / supply_county→reservoir）— **P0 阻塞 ViewB 章 2 章 3 章 4**
3. **章 3 水情燈號是最大坑**：collector 只跑 2/6 區（北水/桃竹/南水/高屏 全缺）+ history 累積為 0
4. **flood_hazard_zones 已有 `town` 欄位** → 章 6「淹水展開到鄉鎮里」**不需要新 RPC**（省 1-2 day）

---

## Part 1 · 22 縣市 × 元素 Coverage Matrix

### 章 1 現況 + 章 2 儲存 + 章 4 處理（合表 — 點 / 設施類）

| id_moi | 縣市 | 水庫 | 流量站 | 水質站 | 雨量站 | 地下水區 | 大型淨水場 | 汙水廠 |
|---|---|---|---|---|---|---|---|---|
| A | 臺北 | 2 | spatial | 12+34 | 71 | 台北盆地 | 0 | 2 |
| B | 臺中 | 6 | spatial | 17+73 | 84 | 臺中地區 | 3 | 10 |
| C | 基隆 | 2 | spatial | 22 | 14 | (無) | 1 | 2 |
| D | 臺南 | 9 | spatial | 117+119 | 82 | 嘉南平原 | 2 | 7 |
| E | 高雄 | 7 | spatial | (?) | 94 | 嘉南平原 | 4 | 7 |
| F | 新北 | 8 | spatial | 111 | 102 | 台北盆地 | 1 | 7 |
| G | 宜蘭 | 1 | spatial | 45+75 | 76 | 蘭陽平原 | 0 | 2 |
| H | 桃園 | 3 | spatial | 21+69 | 47 | 桃園中壢臺 | 2 | 10 |
| I | 嘉義市 | 1 | spatial | 30+9+54 | 5 | 嘉南平原 | 1 | 1 |
| J | 新竹縣 | 4 | spatial | 11+58 | 53 | 新苗地區 | 1 | 2 |
| K | 苗栗 | 6 | spatial | 10 | 73 | 新苗地區 | 1 | 5 |
| M | 南投 | 8 | spatial | 15+49 | 123 | (無) | 0 | 5 |
| N | 彰化 | 0 | spatial | 90+39 | 46 | 濁水溪沖積 | 0 | 3 |
| O | 新竹市 | 0 | spatial | 28 | 8 | 新苗地區 | 0 | 1 |
| P | 雲林 | 1 | spatial | (?) | 51 | 濁水溪沖積 | 1 | 1 |
| Q | 嘉義縣 | 3 | spatial | 30+54 | 79 | 嘉南平原 | 0 | 3 |
| T | 屏東 | 3 | spatial | 114+136 | 97 | 屏東平原 | 0 | 3 |
| U | 花蓮 | 3 | spatial | 18+49 | 107 | 花東縱谷 | 0 | 1 |
| V | 臺東 | 1 | spatial | 19+33 | 92 | 花東縱谷 | 0 | 2 |
| W | 金門 | 0* | spatial | (?) | 6 | (無) | 0 | 5 |
| X | 澎湖 | 6 | spatial | 24 | 9 | (無) | 0 | 2 |
| Z | 連江 | 0* | spatial | (?) | 4 | (無) | 0 | 1 |

註：
- **水庫**：用 `reference.reservoir_geometry.county`（中文名）為 SSOT。`water_reservoirs.region` 只 4 大區（南/北/中/離島），必須與 reservoir_geometry join 才能拿縣市切片
- **流量站**：`river_flow_stations` 0 county 欄位，**只有 lat/lng/geom + address**。需要 ST_Contains spatial join 或 address 萃取
- **水質站**：嚴重 dirty — 同縣市出現「南投」「南投縣」雙寫、「台北」「臺北市」雙寫。必須先 normalize（用 `reference.county_aliases`）。第二欄為「短名+全名」加總概估
- **雨量站**：`realtime.rain_gauge_readings.county` 22 縣市齊（用全名「臺北市/臺中市」）
- **地下水分區**：西部 9 區為主 + 4 雜項段名，東部/離島/北市無對應
- **大型淨水場**：17 座只在 10 縣市

### 章 3 水情燈號（區域，非縣市）

| 項 | 狀態 | 細節 |
|---|---|---|
| `drought_alert_current` | **嚴重不足** | 全表只 2 列（台中地區/新竹地區）都「綠燈」。**6 大水情區僅 2 區 collector 有跑**，其餘 4 區（北水/桃竹/南水/高屏）completely missing |
| `drought_alert_history` | 同上 | 累積 2 列，min=max=2026-04-27 — 等於沒歷史。「上次紅燈 / 5 年 timeline / 最嚴重曾達」全部做不出來 |
| 縣市 → 水情區 mapping | ❌ 不存在 | reference 無此 mapping table |

### 章 4 處理 — 自來水 / 汙水

| 項 | 22 縣市 coverage | 細節 |
|---|---|---|
| `water_treatment_plants_large` | 10/22 | 17 座分布於 10 縣市，12 縣市為 0 |
| `water_supply_penetration` | 19/22 | **A 臺北 / W 金門 / Z 連江 缺**（北市、外島走自有單位非台水） |
| `twc_supply_system_monthly` | 141 systems，**無 county 欄位** | system_name 全為單字水區名（板新區/台中區/台南區/高雄區/...）需手建「縣市 → 1 至多個 system」mapping |
| `twc_customer_yearly` | **全國單表** | 只有 year + total_customers，**完全無 county**。「該縣市自來水用戶數」做不出來，要拿 `water_supply_penetration.served_population` 替代 |
| `sewage_treatment_plants` | **22/22 ✅** | 全縣市齊，連江 1 / 金門 5 都有 |
| `sewage_coverage_yearly` | **22/22 ✅** | 22 縣市最新到 2024，乾淨 |

### 章 5 使用

| 項 | Coverage | 細節 |
|---|---|---|
| `water_usage_yearly` | **22/22 × 17 年完整** ✅✅ | 所有 22 縣市 2008-2024 完整無缺，最乾淨的一張表 |
| `water_loss_rate_yearly` | **0/22** ❌ | 全國單表 PK=year，無 county 欄位 |
| 用水結構（民生/工業/農業 by 縣市）| **0/22** ❌ | DB 完全無 sector × county 切片 |

### 章 6 災防

| 項 | 22 縣市 coverage | 細節 |
|---|---|---|
| `flood_hazard_pct_by_county` MV | **22/22 ✅** | 每縣市 17-30 列（不同 scenario）齊全 |
| `flood_hazard_zones`（**含 town 欄位**）| **22/22 ✅** | **有 county + town 兩層！** 章 6「淹水展開到鄉鎮里」直接可做，**無需新表** |
| `detention_basins` | 8 群（5 縣市 + 3 園區）| 14 縣市為 0。命名英文 slug |
| `land_subsidence_stations` | 10/22 | 雲林 55 / 嘉義 15 / 屏東 9 / 彰化 8 / 台南 6 / 臺東 5 + 4 縣市各 1-2 站。12 縣市無 |
| `storm_drainage_pipes` | 3/22 | 只 taipei / taoyuan / chiayi_city。命名英文 slug |
| `iot_wra_stations`（替代河川站） | **21/22 ✅** | 少連江。`county_name` 含「臺灣省/福建省」前綴需 strip |

---

## Part 2 · 後端 TODO 清單

### P0 — ViewB 阻塞項（必先做）

| # | 工作 | 對應 SPEC | 工時 | 給哪個 repo |
|---|---|---|---|---|
| 1 | 建 `reference.county_supply_region` mapping table（22 縣市 → 「無自有水庫由 X 縣 X 水庫供水」） | 章 2「無水庫」替代呈現 | 0.5 day | gis-platform migration |
| 2 | 建 `reference.county_drought_region` mapping（22 縣市 → 6 水情區） | 章 3 燈號 | 0.5 day | gis-platform |
| 3 | 建 `reference.county_twc_region` mapping（22 縣市 → 1+ 個 twc system_name） | 章 4 配水管線 | 0.5 day（手抄） | gis-platform |
| 4 | 補 4 個水情區 collector（北水/桃竹/南水/高屏）讓 `drought_alert_current` 6 區齊 | 章 3 | 0.5 day | data-collectors（pipelines） |
| 5 | normalize `water_quality_stations.county` — 雙寫合併（南投/南投縣 → M）+ 加 county_id 欄位 | 章 1 水質站 | 0.5 day | gis-platform migration（用 county_aliases LEFT JOIN）|

**P0 合計 ~2.5 day** — 不做這 5 項，章 2 章 3 章 4 整段做不出來

### P1 — 改善 + 統合

| # | 工作 | 對應 SPEC | 工時 | 給哪個 repo |
|---|---|---|---|---|
| 6 | 寫 `get_river_stations_by_county(county_id)` RPC（用 ST_Contains + reference.counties.geom_4326）| 章 1 流量站 | 0.5 day | gis-platform |
| 7 | 寫 `get_river_lines_by_county(county_id)` RPC | 章 1 河川條數 | 1 day | gis-platform |
| 8 | 寫 `get_flood_hazard_townships(county_id)` RPC（GROUP BY town）— flood_hazard_zones 已有 town 欄位 | 章 6 淹水展開 | 0.5 day | gis-platform |
| 9 | 寫 `get_county_water_summary(county_id)` 統合 RPC（章 1+2+5 一次包） | 統合 | 1 day | gis-platform |

**P1 合計 ~3 day**

### P2 — 後續優化

| # | 工作 | 對應 SPEC | 工時 | 給哪個 repo |
|---|---|---|---|---|
| 10 | 寫 `get_drought_history_by_region(region_name, since_date)` RPC | 章 3 timeline（要等 collector 補齊後才有意義） | 0.5 day | gis-platform |
| 11 | 加 `iot_wra_stations.county_name` strip 「臺灣省/福建省」前綴的 normalize 欄位 | 章 1 替代河川站 | 0.5 day | gis-platform |

### P3 — 純前端

| # | 工作 | 對應 SPEC | 工時 | 給哪個 repo |
|---|---|---|---|---|
| 12 | Hook rules engine 模板化「跨章敘事」 | Hero | 1 day | mini-taiwan-info frontend |

**全部後端工作合計 ~6 day**（不含前端 ViewB 重做）

---

## Part 3 · 建議 Mapping Table Schema

```sql
-- 1. 縣市 → 水情區（drought）
CREATE TABLE reference.county_drought_region (
  id_moi      varchar(2) PRIMARY KEY REFERENCES reference.counties(id_moi),
  region_name text NOT NULL,  -- 對齊 drought_alert_current.region_name
  region_slug text NOT NULL   -- north_water/taoyuan_hsinchu/taichung/southern/kaonan/...
);

-- 2. 縣市 → 台水分區（多對多）
CREATE TABLE reference.county_twc_region (
  id_moi          varchar(2) NOT NULL REFERENCES reference.counties(id_moi),
  twc_system_name text       NOT NULL,  -- 對齊 twc_supply_system_monthly.system_name
  is_primary      boolean    DEFAULT true,
  PRIMARY KEY (id_moi, twc_system_name)
);

-- 3. 縣市 → 供水水庫（無水庫縣市 fallback）
CREATE TABLE reference.county_water_supply (
  id_moi         varchar(2) NOT NULL REFERENCES reference.counties(id_moi),
  source_county  varchar(2) REFERENCES reference.counties(id_moi),  -- null = 自有
  reservoir_id   text REFERENCES public.water_reservoirs(id),
  supply_share   numeric,  -- 多源供水佔比
  PRIMARY KEY (id_moi, reservoir_id)
);
```

---

## Part 4 · County 欄位 Cheat Sheet（給 frontend query）

mini-taiwan-info ViewB 寫 query 必背：

| 表 | county 欄位 | 命名格式 | 推薦做法 |
|---|---|---|---|
| `water_reservoirs` | `region` | 4 區（南/北/中/離島）| **不用**，改 join `reference.reservoir_geometry` 拿縣市 |
| `reference.reservoir_geometry` | `county` | 中文短/全混（台中/臺中市）| `JOIN reference.county_aliases ON alias = county` 拿 id_moi |
| `water_quality_stations` | `county` | 雙寫（南投 / 南投縣 都有） | 同上，先 normalize |
| `water_monitoring_stations` | `county` | 雙寫 + 雜訊（含「南港溪」「環河路」非縣市值）| 加 WHERE 過濾 |
| `iot_wra_stations` | `county_name` | 含「臺灣省/福建省」前綴 | `REPLACE(county_name,'臺灣省','')` |
| `realtime.rain_gauge_readings` | `county` | 全名（臺北市 / 臺中市）| 用 `name_zh` join 即可 |
| `water_treatment_plants_large` | `county` | 全名 | 用 `name_zh` |
| `sewage_treatment_plants` | `county` | 全名 | 用 `name_zh` |
| `flood_hazard_zones` | `county` + `town` | 全名 | 用 `name_zh` |
| `detention_basins` / `storm_drainage_pipes` | `county` | **英文 slug**（taipei/taoyuan/...） | 用 `slug` 欄位 join |
| `land_subsidence_stations` | `county` | 中文全名 | 用 `name_zh` |
| `water_supply_penetration` / `sewage_coverage_yearly` / `water_usage_yearly` / `flood_hazard_pct_by_county` | `county_id` | **id_moi**（A-Z）✅ | **直接 join，最乾淨** |

**萬用 normalize 範式**：
```sql
-- 中文 → id_moi
LEFT JOIN reference.county_aliases ca ON ca.alias = trim(replace(t.county, '臺灣省', ''))
-- 英文 slug → id_moi
LEFT JOIN reference.counties rc ON rc.slug = t.county
```

---

## Part 5 · 已 Ready 不需動（避免另一個 repo 重做）

以下章節**直接接通真實資料**，後端不必再做：

1. ✅ **章 1 水庫數**：`reference.reservoir_geometry` GROUP BY county join `county_aliases`
2. ✅ **章 1 雨量站數**：`realtime.rain_gauge_readings` GROUP BY county join `name_zh`
3. ✅ **章 2 水庫個別卡 + 30 天 trend**：`reservoir_situation_v` + 既存 `reservoir_timeseries` RPC（ViewC 已用）
4. ✅ **章 4 大型淨水場**：`water_treatment_plants_large` GROUP BY county
5. ✅ **章 4 公共汙水廠數**：`sewage_treatment_plants` GROUP BY county（22 縣市齊）
6. ✅ **章 4 汙水接管率**：`sewage_coverage_yearly` WHERE county_id（22/22 齊，2024 最新）
7. ✅ **章 5 LPCD 17 年 trend + 22 縣市 ranking**：`water_usage_yearly`（最完整的表）
8. ✅ **章 6 淹水高潛勢 %**：`flood_hazard_pct_by_county`（既有 MV 直接用）
9. ✅ **章 6 淹水「展開到鄉鎮里」**：`flood_hazard_zones` 有 `town` 欄位 — **不需新 RPC，前端直接 GROUP BY town 即可**

---

## 配套文件

- `SPEC.md` — ViewB design brief（給設計師）
- `../../taipei-gis-analytics/docs/topic-research/water-overview/kpi-data-status.md` — 後端就緒度（ViewA 角度）
- `../../mini-taiwan-info/_CYCLE_water_viewa.md` — ViewA 重寫 cycle 紀錄
