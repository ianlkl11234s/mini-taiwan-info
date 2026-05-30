# ETL：人口主題更新至民國114（2025-12）— Flow B

**日期**：2026-05-30
**來源**：內政部統計處 社會經濟資料服務平台(SEGIS)，3 份產品（民國114年12月，INFO_TIME=114Y12M），OGDL-Taiwan-1.0
**範圍**：Flow B（taipei-gis-analytics + gis-platform；未動 data-collectors）
**Commits**：
- gis-platform：`536821c` feat(demographics): 人口資料更新至民國114/2025（migration 135 + 136 + data-inventory）
- analytics：`bb8e05f` feat(demographics): SEGIS 114 五歲組/鄉鎮/指標 pipeline+catalog
- 兩 repo 皆**已 commit、未 push**。

---

## 三張表更新結果

| 表 | 更新到 | 有沒有更到 | 規模 | anon REST |
|----|--------|-----------|------|-----------|
| `demographics.population_by_age_sex_county` | **stat_year=2025** | ✅ | 2024(19組,836) + 2025(21組,924) = 1,760 | 200 ✅ |
| `demographics.population_by_township_monthly` | **year_month=2025-12** | ✅ | 2024-12(368) + 2025-12(368) = 736 | 200 ✅ |
| `demographics.county_indicators_yearly`（**新表**） | **stat_year=2025** | ✅ | 22 縣市 | 200 ✅ |

- 2025 全國總人口 **23,299,132**（age_sex 與 township 兩源吻合），較 2024 的 23,400,220 少約 10 萬。
- anon REST 三表皆實測 **200**（帶 `Accept-Profile: demographics`）。**無 401**（已避開 fire 漏 GRANT 的坑：新表 mig 136 內含 anon GRANT + RLS + NOTIFY pgrst）。

---

## age_band 粒度決定（重要，前端必看）

**決定：保留完整粒度（Option A）。2025 起用完整 21 組，2024 仍維持 19 組，兩種粒度並存。**

- 2024（來源 ODRP052 戶政司婚姻表）：19 組，`0-14` 為**合計組**（資料源限制，15 歲以下無法分齡）。
- 2025（來源 SEGIS 五歲年齡組統計）：完整 **21 組** → `0-4` / `5-9` / `10-14` / `15-19` / … / `95-99` / `100+`。
- gis-platform **migration 135** 已放寬 `age_band` CHECK 為兩者聯集（22 個合法值），讓兩粒度共存。
- **同一年內部自洽**：2024 只出現 `0-14`，2025 只出現 `0-4/5-9/10-14`，**同一年不會同時出現合計組與細組**，故對單一年度做 SUM 不會重複計算。

### 👉 前端金字塔（source `moi_population_pyramid` / 直接接 `population_by_age_sex_county`）要注意
1. **以 `stat_year` 篩選後再畫**。預設展示最新年（2025）→ 會拿到 21 組細組。
2. 若前端先前**寫死 19 組或寫死 `0-14` 這個 band**：選 2025 時 `0-14` 會查無 → 需改成：
   - （建議）動態讀該年實際有的 age_band 清單來畫；或
   - 若一定要 `0-14` 單一條：對 2025 自行 `0-4 + 5-9 + 10-14` 相加。
3. 年份切換器若同時支援 2024/2025，兩年 bar 數不同（19 vs 21）屬正常，分開渲染即可。

---

## township_rank（前端排名）
- VIEW 取 `MAX(year_month)`，已**自動切到 2025-12**，前端**不需改 code**，但顯示數字會變。
- 最新 Top3：板橋區 549,762 / 桃園區 478,487 / 中壢區 439,213（皆 2025-12）。

## county_indicators_yearly（新表，前端可用）
- 逐縣市人口指標：`sex_ratio`(性比例) / `household_size`(戶量) / `pop_density`(人口密度) / `dependency_ratio`(扶養比) / `child_dependency_ratio`(扶幼比) / `old_dependency_ratio`(扶老比) / `aging_index`(老化指數)。
- PK `(county_id, stat_year)`，`county_id` = `reference.counties.id_moi`（單字母 A/F/H…）。
- 讀法：`GET /rest/v1/county_indicators_yearly?stat_year=eq.2025` + header `Accept-Profile: demographics`。
- 用途：縣市人口結構比較 / 縣市儀表板。範例：老化指數最高=嘉義縣 291.69；人口密度最高=臺北市 8,975.39。
- 全國級彙總仍在 `reference.national_basics_monthly/_yearly`（本表是逐縣市維度的補強）。

---

## 期別標記
- 三表都用既有欄位帶期別：`stat_year`（age_sex / county_indicators）、`year_month`（township）。前端可直接讀欄位判斷資料年月。
- 能更的都更到 2025；無 schema 缺口，3 份 SEGIS 完整覆蓋三表需求。

## Step 4（agent-browser 探索 SEGIS）— 跳過
- 3 份下載資料已完整滿足三張表，依「有最新就用最新、沒有也沒關係、別卡住」原則**未額外探索**。
- 若日後要更細（鄉鎮級 5 歲組、村里級指標），SEGIS QueryInterface 有提供，但須**人工網頁下載**（同本次流程）→ 屆時沿用 `pipelines/demographics/*/0X_segis_*.py` 改 CSV 路徑即可。

## 稽核
- `data-catalog-audit --check-all-v2`：本次改動的所有檔案（3 catalog + registry + 3 manifest）**0 ERROR / 0 WARN**。
- 全庫尚有 99 個 fatal 屬**既有問題**（water/environment/_update_log 等其他進行中工作流，與本任務無關，未觸碰）。

=== DONE etl_demog_114 ===
