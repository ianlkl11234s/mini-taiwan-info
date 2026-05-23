# 全台概覽 · 指標清單（給設計師）

> **目的**：列出「基礎統計」首頁可選用的所有指標，讓設計師重新規劃卡片配置與視覺。
> **SSOT**：[`data/national-basics.yaml`](../../data/national-basics.yaml) · TS 衍生 [`frontend/src/lib/national-basics.ts`](../../frontend/src/lib/national-basics.ts)
> **資料時間**：截至 2026-04 · 最後驗證 2026-05-20

---

## 📦 指標總覽（共 23 項，分 5 組）

### A · 行政區（5 項，靜態）

| # | 指標 | 數字 | 單位 | 來源 |
|---|---|---:|---|---|
| A1 | **縣市總數** | 22 | 個 | 內政部 |
| A2 | 直轄市數 | 6 | 個 | 內政部 |
| A3 | **鄉鎮市區總數** | 368 | 個 | 內政部 SEGIS |
| A4 | **村里總數** | 7,748 | 個 | 戶政司 |
| A5 | 鄰總數 | 144,820 | 個 | 戶政司 |

### B · 國土地理（7 項，靜態）

| # | 指標 | 數字 | 單位 | 備註 |
|---|---|---:|---|---|
| B1 | **國土總面積** | 36,197.06 | km² | 含本島+離島 |
| B2 | 臺灣本島面積 | 35,808 | km² | |
| B3 | 離島總面積 | 389.06 | km² | 澎金馬 + 蘭嶼綠島等 |
| B4 | **內陸水域面積** | ~74.6 | km² | 信心度中（國土利用調查） |
| B5 | **海岸線總長** | 1,988 | km | 含主要離島 |
| B6 | 最高峰（玉山） | 3,952.43 | m | |
| B7 | 最大天然湖泊（日月潭） | ~8.0 | km² | |

### C · 人口總量（5 項，月度）

| # | 指標 | 數字 | 單位 | 備註 |
|---|---|---:|---|---|
| C1 | **全國總人口** | 23,262,544 | 人 | 2026-04 月底 |
| C2 | 男性人口 | 11,439,382 | 人 | |
| C3 | 女性人口 | 11,823,162 | 人 | |
| C4 | 性比例 | 96.75 | % | 男/女×100，女多於男 |
| C5 | **人口密度** | 642.66 | 人/km² | 全球前段班 |

### D · 年齡結構（5 項，月度）— **本頁最有故事性**

| # | 指標 | 數字 | 單位 | 備註 |
|---|---|---:|---|---|
| D1 | 0–14 歲（幼年） | 2,652,508 / 11.40% | 人/% | |
| D2 | 15–64 歲（壯年） | 15,873,366 / 68.24% | 人/% | |
| D3 | **65+ 歲（高齡）** | 4,736,670 / 20.36% | 人/% | 🚨 超高齡社會 |
| D4 | **老化指數** | 178.57 | % | 65+ ÷ 0-14 |
| D5 | **扶養比** | 46.55 | % | (0-14 + 65+) / 15-64 |

### E · 人口動態（3 項，月度+年度）

| # | 指標 | 數字 | 單位 | 備註 |
|---|---|---:|---|---|
| E1 | **粗出生率** | 4.26 | ‰ | 2026-04 |
| E2 | **粗死亡率** | 8.36 | ‰ | 2026-04 |
| E3 | **自然增加率** | -2.87 | ‰ | 2024，連續負成長 |

---

## 🎨 設計建議（給設計師參考，可整盤推翻）

### 故事線優先順序（資料看起來最有戲的角度）

1. 🏆 **「超高齡社會」議題**：D3 + D4 + E3 三項組合，台灣 2025 已正式跨過 20% 門檻
2. 🌍 **「擁擠的小島」**：B1 + C5（密度 642），全球前段
3. 📉 **「人口拐點」**：E1 vs E2（出生率 < 死亡率），E3 自然減少
4. 🗾 **「行政區概覽」**：A1–A5 + B1，輪廓型介紹

### 卡片組合建議（4 種版型可選一）

**版型 V1 — 維持 6 卡（現況）**
```
[全國人口] [縣市數]    [鄉鎮市區]
[村里數]   [出生死亡率] [老化指數]
```
優：對齊現有 manifest，最少改動  ·  缺：忽略面積，弱化故事

**版型 V2 — 9 卡矩陣（3×3）**
```
[總面積]   [人口]     [密度]
[縣市數]   [鄉鎮市區]  [村里]
[出生率]   [死亡率]   [老化指數]
```
優：完整輪廓 + 動態指標  ·  缺：訊息量大

**版型 V3 — 「Hero + 副指標」**
```
┌────────────────────────────┐
│  23,262,544 人              │
│  全國人口 · 2026-04         │
│  ▼ 連續負成長              │
└────────────────────────────┘
[36,197 km²] [22 縣市] [368 鄉鎮]
[超高齡 20.4%] [密度 643] [老化 178%]
```
優：強調主數字 + 副指標支援故事  ·  缺：需更多版面

**版型 V4 — 「分組標籤頁」**
頁籤切換：人口 / 地理 / 行政 / 動態
每頁籤 3-4 卡，避免一次太多

---

## 📍 必要 vs 可選

| 級別 | 指標 | 理由 |
|---|---|---|
| ⭐⭐⭐ 必有 | C1 全國人口 · A1 縣市數 · A3 鄉鎮市區數 · B1 總面積 | 概覽必備四角 |
| ⭐⭐ 建議 | D4 老化指數 · E1+E2 出生死亡率 · C5 人口密度 | 有故事性，吸睛 |
| ⭐ 可選 | A4 村里數 · A5 鄰數 · B5 海岸線 · D3 高齡佔比 · D5 扶養比 | 看版面決定 |
| ◯ 細節 | B6 玉山 · B7 日月潭 · C2/C3 男女 · C4 性比例 · B2/B3 本島離島 | 點擊展開細節時用 |

---

## 🧱 資料 Tier 與接入方式（給工程參考）

| Tier | 數量 | 指標 | 處理方式 |
|---|---|---|---|
| **static** | 12 | A1-A3 / A5 / B1-B7 | 已 hard-code 在 `national-basics.ts`，年度人工檢視 |
| **yearly** | 2 | A4 (村里) / E3 (自然增加率年度值) | 已 hard-code；B 階段改讀 Supabase `reference.national_basics_yearly` |
| **monthly** | 9 | C1-C5 / D1-D5 / E1-E2 | 已 hard-code 為 baseline（2026-04）；B 階段改讀 Supabase `reference.national_basics_monthly`，每月 import |

---

## ✅ B 階段（Supabase 接入）— 已完成（2026-05-20）

> 目的：把 monthly tier 從 hard-code 變成 reusable Supabase 表，未來 mini-taiwan-pulse / plan-art / gis-platform 也能查同一張表。

**狀態**：✅ migration / pipeline 骨架 / catalog / 前端 hook 全部到位，等用戶 apply migration 即上線。

### 落地產出清單

| 路徑 | 角色 |
|---|---|
| `gis-platform/migrations/114_reference_national_basics.sql` | Schema + 2026-04 baseline INSERT + latest VIEW + RLS |
| `taipei-gis-analytics/docs/data-catalog/demographics/national_basics.md` | catalog (v2 frontmatter, status=production) |
| `taipei-gis-analytics/docs/data-registry.yaml` | 新 entry `demographics.national_basics` |
| `taipei-gis-analytics/pipelines/demographics/national_basics/` | README + 01 fetch 骨架 + 12 upsert |
| `mini-taiwan-info/frontend/src/lib/queries/national-basics.ts` | Supabase fetch + 文案 helper |
| `mini-taiwan-info/frontend/src/hooks/useNationalBasics.ts` | React hook（含 hardcode INITIAL） |

### Apply 指令（用戶手動跑）

```bash
# 1) Apply migration（含 baseline，apply 完即可讀真實資料）
psql $DATABASE_URL -f /Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/gis-platform/migrations/114_reference_national_basics.sql

# 2) 驗證
psql $DATABASE_URL -c "SELECT pop_total, aging_index, birth_rate, death_rate FROM reference.national_basics_latest;"
# 期望：23262544 | 178.57 | 4.26 | 8.36
```

Pipeline `01_fetch_moi_monthly.py` 是 **下次戶政司公布 2026-05 月報後**才需要跑（用 `--explore` dry-run 驗 XLS schema）。

---

## 📐 Supabase Schema（已實作於 114）

```sql
-- gis-platform/migrations/0XX_reference_national_basics.sql

-- 月度動態指標（C / D / E 共 9 項）
CREATE TABLE IF NOT EXISTS reference.national_basics_monthly (
  year_month       text PRIMARY KEY,    -- "YYYY-MM"
  -- 人口
  pop_total        bigint NOT NULL,
  pop_male         bigint NOT NULL,
  pop_female       bigint NOT NULL,
  sex_ratio        numeric(5,2),
  pop_density      numeric(7,2),
  households       bigint,
  household_size   numeric(5,4),
  -- 年齡結構
  pop_0_14         bigint NOT NULL,
  pop_15_64        bigint NOT NULL,
  pop_65_plus      bigint NOT NULL,
  aging_index      numeric(6,2),
  dependency_ratio numeric(5,2),
  -- 動態
  birth_rate       numeric(5,2),   -- ‰
  death_rate       numeric(5,2),   -- ‰
  -- 元資料
  source_url       text,
  fetched_at       timestamptz DEFAULT now()
);

-- 年度補充指標（村里、自然增加率…）
CREATE TABLE IF NOT EXISTS reference.national_basics_yearly (
  year             integer PRIMARY KEY,
  villages_total   integer,
  neighborhoods_total integer,
  natural_increase_rate numeric(5,2),  -- ‰ 年度
  life_expectancy_total numeric(5,2),  -- 預留
  life_expectancy_male  numeric(5,2),
  life_expectancy_female numeric(5,2),
  source_url       text,
  fetched_at       timestamptz DEFAULT now()
);

-- 靜態指標（A / B）— 不變動，view 而非表，從 yaml 衍生
-- 由前端直接讀 national-basics.ts，DB 不必存
```

### ETL Pipeline 規劃

```
taipei-gis-analytics/pipelines/demographics/national_basics/
├── 01_fetch_moi_household_monthly.py   # 戶政司月報 XLS → CSV
├── 02_parse_age_aging.py               # 解析年齡分組 + 算老化指數
├── 03_upsert_supabase.py               # → reference.national_basics_monthly
└── 04_fetch_yearly_supplement.py       # 年度村里、自然增加率
```

### 前端切換點

`national-basics.ts` 增加 `fetchLatestMonthly()` hook，預設讀 Supabase，
失敗時 fallback 到 hard-code，確保畫面不會空。

```ts
// frontend/src/lib/queries/national-basics.ts (B 階段新增)
export async function fetchLatestMonthly() {
  const { data } = await supabase
    .from('national_basics_monthly')
    .select('*')
    .order('year_month', { ascending: false })
    .limit(1)
    .single();
  return data ?? FALLBACK_FROM_TS;
}
```

### 更新節奏

- 月度資料：戶政司每月 10-15 日公布上月數據 → cron 一次
- 年度資料：每年 4 月內政部統計通報出爐 → 人工 trigger 一次

---

## 📑 來源權威性說明（給設計師判斷信心度）

| 數字類型 | 權威來源 | URL | 更新節奏 |
|---|---|---|---|
| 全國/縣市人口 | 內政部戶政司「人口統計資料月報」 | https://www.ris.gov.tw/app/portal/346 | 月 |
| 行政區劃 | 內政部「直轄市縣市行政區劃」 | https://www.moi.gov.tw | 變動極少 |
| 村里鄰戶數 | 戶政司「鄉鎮市區村里鄰數」 | 同上 | 年 |
| 土地面積 | 內政部統計年報 + 國土測繪中心 | https://www.nlsc.gov.tw | 變動極少 |
| 老化指數/扶養比 | 戶政司「人口年齡結構統計」 + SEGIS | https://segis.moi.gov.tw | 月 / 年 |
| 出生/死亡率 | 戶政司「人口動態統計」 | 同上 | 月 |
| 自然增加率 | 戶政司年度統計 | 同上 | 年 |

---

## ✏️ 修改紀錄

| 日期 | 版本 | 改動 |
|---|---|---|
| 2026-05-20 | 1.0 | 初版 — 23 項指標 + 4 版型建議 + B 階段 Supabase 規劃 |
