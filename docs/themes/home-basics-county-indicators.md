# 縣市鑽取（ViewB · 基礎統計）· 指標清單與設計規劃

> **目的**：定義 ViewA「全台概覽」點任一縣市後，ViewB 應顯示什麼。給設計師重新設計用。
> **配套**：[`home-basics-indicators.md`](./home-basics-indicators.md) 是 ViewA 全國 23 指標。本檔是 per-county 版。
> **資料時間**：2026-05-22 規劃

---

## 一、設計脈絡

ViewA Home 已完成 5 章節（行政區 / 國土地理 / 人口總量 / 年齡結構 / 人口動態）。
ViewB Home 是「**單一縣市深度頁**」— 切換到該縣市視角，重點是：

1. **這個縣市長什麼樣**（自我介紹級事實）
2. **它跟全國 / 其他縣市差在哪**（比較級洞察）
3. **它內部怎麼分布**（鄉鎮市區 drill-in）
4. **它的軌跡走向哪**（歷年趨勢）

---

## 二、章節結構（兩個版型給設計師挑）

### 版型 A — 對齊 ViewA 的 5 章節（推薦）⭐

優點：與首頁敘事一致，使用者不會在切換 ViewA/B 時迷路。

| 編號 | 章節 | per-county 改寫 |
|---|---|---|
| 00 | **縣市 Hero** | 縣市標誌 + 區域標籤 + 一句話定位 + 4 顆 fact tile（人口/面積/密度/老化） |
| 01 | **行政區結構** | 該縣市有幾個鄉鎮市區 / 村里 / 鄰 + 鄉鎮人口排名 |
| 02 | **地理位置** | 該縣市在台灣的位置 + 鄰接縣市 + 海岸線/最高峰（如有） |
| 03 | **人口總量** | 該縣市人口 + 男女 + 戶數 + 跟全國密度比 |
| 04 | **年齡結構**（主視覺） | 該縣市三段金字塔 + 老化指數 + 跟全國比 + 22 縣市排名 |
| 05 | **人口動態** | 出生/死亡率 + 自然增加 + 跟全國比 + 歷年軌跡 |

### 版型 B — 4 tabs（既有 `home-basics.yaml` 規劃）

依目前 manifest，分頁籤切換：人口 / 行政區 / 人口動態 / POI 分布。
優點：分頁清晰、適合資料量大的縣市。
缺點：與 ViewA 敘事不對齊；POI tab 需要額外資料源（目前無）。

> **推薦版型 A**：對齊主視覺、設計師工作量小（5 章節 component 大部分可從 ViewAHome 抄）、未來 POI 可變成第 06 章 補上。

---

## 三、per-county 版本必有的「縣市特有」元素

這是 ViewB **比 ViewA 多**的東西，設計師應該選 3-5 個重點放：

| 元素 | 說明 | 視覺建議 |
|---|---|---|
| **Hero · 縣市名片** | 標誌 / 區域（北中南東離島）/ 是否直轄市 / 升格年 / 英文名 | 大字標題 + 一行 chip 標籤 |
| **跟全國比** | 「老化指數比全國高 22 點」「密度是全國 0.45 倍」 | 雙條對照 / +/- delta 標籤 |
| **22 縣市排名** | 「老化第 6 / 出生率第 19 / 人口第 8」 | 排名 chip + 全國分位 sparkline |
| **同區域比較** | 北部 4 縣市的相對位置（vs 雙北桃竹） | 5 條 grouped bar 或小型雷達 |
| **內部 drill-in** | 該縣市鄉鎮市區人口分布 ranking | top 5 / bottom 5 横條 |
| **特色 callout** | 自動生成標籤如「全國最年輕」「老化最快縣市」 | hero 旁的 badge tile |
| **歷年軌跡** | 該縣市自己 10-20 年趨勢 | sparkline 群組 |
| **返回 / 切換** | 「返回全國」「切到鄰縣」「加入比較」 | 頂部 breadcrumb + action |

---

## 四、指標清單（共 18 項，per-county）

### 縣市 Hero（4-6 項）
- **縣市名** + 英文名（已有：`reference.counties`）
- **區域**（北中南東離島）+ **是否直轄市** + 升格年（已有）
- **人口** vs 22 縣市排名（如：「283 萬人，排第 4」）
- **面積** vs 22 縣市排名
- **人口密度** vs 22 縣市排名
- **一句話定位**（自動文案：直轄市/離島/老化最快等）

### 01 行政區結構（3 項）
- **鄉鎮市區數**（已有 mock：HOME_BY_COUNTY.townCount）
- **村里數**（待 ETL：`reference.national_basics_by_county_yearly`）
- **鄰數**（待 ETL）
- **鄉鎮市區人口 ranking**（drill-in 鄉鎮層級，待 ETL）

### 02 地理位置（3 項）
- **位置 minimap**（22 縣市地圖 highlight 該縣市）
- **鄰接縣市**（從 polygon geometry 推導，預先 hardcode 也行）
- **面積占全國比**
- **海岸線長**（如非內陸縣，可選）

### 03 人口總量（4 項）
- **總人口**（待 ETL）
- **男女拆分**（待 ETL）
- **戶數 + 戶量**（待 ETL）
- **人口密度** + 全國第幾名

### 04 年齡結構（5 項，主視覺）
- **三段金字塔** 0-14 / 15-64 / 65+（待 ETL）
- **老化指數**（已有 mock）+ vs 全國 178.57 對照
- **扶養比**（待 ETL）
- **超高齡分類**（已達 / 接近 / 未達 20% 門檻）
- **22 縣市老化指數排名**（已可從 mock 算）

### 05 人口動態（4 項）
- **粗出生率 / 粗死亡率**（已有 mock）
- **自然增加率**（已有 mock）
- **跟全國對比條**
- **歷年趨勢**（待 ETL，目前 mock）

---

## 五、視覺 device 建議（沿用 ViewA + 新增）

### 可直接沿用 ViewAHome 既有 CSS（已在 globals.css）
- `cat-block` / `cat-head` 章節 header
- `pyramid-card` 人口金字塔
- `dyn-card` 出生死亡雙條
- `ranking` 排名 list

### 需要新增的 device（設計時要考慮）
- **`county-hero`** — Hero 帶縣市名片 + 4 fact tile（CSS class 新）
- **`vs-national-bar`** — 雙條對照（縣市 vs 全國） + delta 標籤
- **`rank-chip`** — 「第 6 / 22」徽章 + 分位條
- **`mini-taiwan`** — 22 縣市縮圖 highlight 該縣市（可重用既有 mapbox MapView）
- **`adjacent-counties`** — 鄰接縣市快切 chip

---

## 六、資料來源 Tier（什麼能直接用 / 什麼要 ETL）

### Tier 1 · 立即可用（無需新工作）
| 來源 | 給哪些指標 |
|---|---|
| `reference.counties` (Supabase) | 縣市名、面積、人口（年級數）、區域、直轄市標記、升格年、centroid |
| `mock-home.ts: HOME_BY_COUNTY` | 22 縣市老化指數、出生死亡率、自然增加、鄉鎮數（暫用） |
| `reference.national_basics_latest` | 全國對照基準（已 apply） |

### Tier 2 · 需要 ETL 才能上真資料
| 來源 | 給哪些指標 | 工作量 |
|---|---|---|
| 戶政司「鄉鎮市區人口統計」月報（XLS） | per-county 月度人口 / 男女 / 戶數 / 年齡分組 / 出生死亡 | 1-2 天，pipeline 已有骨架 |
| SEGIS「行政區人口指標」年度 | per-county 老化指數 / 扶養比歷年 | 1 天 |
| 戶政司「鄉鎮市區村里鄰數」 | 每縣市村里 / 鄰數（細到鄉鎮層） | 0.5 天 |

### Tier 3 · 可選擴充（未來）
- 內政部「現住人口遷徙統計」— 縣市淨遷入 / 遷出
- 戶政司「結婚 / 離婚率」— 動態章節擴充
- SEGIS「人口金字塔細齡組」— 五齡組金字塔（取代三段）

---

## 七、B 階段 Supabase schema 規劃

> 對齊 ViewA 既有 `reference.national_basics_monthly/yearly`，per-county 維度。

```sql
-- 月度 per-county
CREATE TABLE reference.national_basics_by_county_monthly (
  year_month        TEXT,
  county_id         VARCHAR(2) REFERENCES reference.counties(id_moi),
  -- 人口
  pop_total         BIGINT NOT NULL,
  pop_male          BIGINT NOT NULL,
  pop_female        BIGINT NOT NULL,
  sex_ratio         NUMERIC(5,2),
  pop_density       NUMERIC(7,2),
  households        BIGINT,
  household_size    NUMERIC(5,4),
  -- 年齡
  pop_0_14          BIGINT,
  pop_15_64         BIGINT,
  pop_65_plus       BIGINT,
  aging_index       NUMERIC(6,2),
  dependency_ratio  NUMERIC(5,2),
  -- 動態
  birth_rate        NUMERIC(5,2),
  death_rate        NUMERIC(5,2),
  -- meta
  source            TEXT,
  fetched_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (year_month, county_id)
);

-- 年度 per-county（村里、鄰、自然增加、平均壽命）
CREATE TABLE reference.national_basics_by_county_yearly (
  year                  INTEGER,
  county_id             VARCHAR(2) REFERENCES reference.counties(id_moi),
  townships_total       INTEGER,
  villages_total        INTEGER,
  neighborhoods_total   INTEGER,
  natural_increase_rate NUMERIC(5,2),
  life_expectancy       NUMERIC(5,2),
  PRIMARY KEY (year, county_id)
);

-- 一站讀取 view（最新月度 + 全國比 + 排名）
CREATE OR REPLACE VIEW reference.county_basics_with_rank AS
WITH latest_m AS (
  SELECT * FROM reference.national_basics_by_county_monthly
  WHERE year_month = (SELECT MAX(year_month) FROM reference.national_basics_by_county_monthly)
),
nat AS (SELECT * FROM reference.national_basics_latest)
SELECT
  m.*,
  c.name_zh, c.region, c.is_special_municipality, c.area_km2,
  RANK() OVER (ORDER BY m.pop_total DESC)        AS rank_pop,
  RANK() OVER (ORDER BY m.aging_index DESC)      AS rank_aging,
  RANK() OVER (ORDER BY m.birth_rate DESC)       AS rank_birth,
  RANK() OVER (ORDER BY m.pop_density DESC)      AS rank_density,
  (m.pop_total::numeric / NULLIF(nat.pop_total,0) * 100)        AS pct_of_national,
  (m.aging_index - nat.aging_index)                              AS delta_aging_vs_nat,
  (m.birth_rate  - nat.birth_rate)                               AS delta_birth_vs_nat,
  (m.death_rate  - nat.death_rate)                               AS delta_death_vs_nat
FROM latest_m m
JOIN reference.counties c ON c.id_moi = m.county_id
CROSS JOIN nat;
```

前端只 `SELECT * FROM reference.county_basics_with_rank WHERE county_id = ?` 即可一次拿到 縣市指標 + 排名 + vs 全國 delta。

---

## 八、版面 layout 草案（給設計師參考）

```
┌──────────────────────────────────────────────┐
│ ← 全台概覽 / 切到 鄰縣 ▾  / + 加入比較      │  ← Breadcrumb + actions
├──────────────────────────────────────────────┤
│                                              │
│   臺南市 · Tainan City                       │  ← Hero 標題
│   南部・直轄市・2010 升格・台灣第 6 都        │  ← 一行 chip
│                                              │
│   ┌──────┬──────┬──────┬──────┐              │
│   │ 人口 │ 面積 │ 密度 │ 老化 │              │  ← 4 fact tile
│   │ 185 萬│2,191 │ 842  │ 168  │              │
│   │ #6 / 22  │ #5 / 22 │ #7 / 22 │ #6 / 22 │  ← 全國排名
│   └──────┴──────┴──────┴──────┘              │
│                                              │
├── 01 行政區結構 ───────────────────────────── │
│   37 鄉鎮市區 · 750 村里 · 14,200 鄰          │
│   [鄉鎮 ranking top 5 / bottom 5]            │
├── 02 地理位置 ─────────────────────────────── │
│   [22 縣市縮圖] · 鄰接：嘉義縣 / 高雄市       │
├── 03 人口總量 ─────────────────────────────── │
│   1,846,019 人 · 男女條 · vs 全國密度        │
├── 04 年齡結構 ─────────────────────────────── │
│   [三段金字塔] + 老化 168 ◀▶ 全國 178        │
│   [22 縣市排名]                              │
├── 05 人口動態 ─────────────────────────────── │
│   出生 5.10‰ · 死亡 8.95‰ · 自然 -3.85‰      │
│   [vs 全國對照雙條] + [歷年軌跡 sparkline]   │
├──────────────────────────────────────────────┤
│ 資料來源：戶政司 / 統計處 · 2026-04           │
└──────────────────────────────────────────────┘
```

---

## 九、開發節奏（給工程參考，不必給設計師）

| Phase | 工作 | 估時 |
|---|---|---|
| **0 placeholder** | App.tsx 加 `theme === "home-basics"` → ViewBHomeBasics 路由 + 顯示 Hero + 4 fact tile（用 COUNTIES SSOT 已有資料） | 30 min ✅ 本次先做 |
| **1 視覺 design** | 設計師依本文件畫定稿、確認 5 章節 vs 4 tabs | 設計師排程 |
| **2 ViewBHomeBasics full** | 寫 5 章節 component，先用 mock-home + COUNTIES，再切 Supabase | 1.5-2 天 |
| **3 ETL per-county 月度** | 戶政司月報 → `reference.national_basics_by_county_monthly` + migration 115 | 1-2 天 |
| **4 ETL per-county 年度** | SEGIS + 村里數 → `reference.national_basics_by_county_yearly` | 1 天 |
| **5 county_basics_with_rank VIEW** | apply migration 116 + 前端切換成真資料 | 0.5 天 |
| **6 鄉鎮 drill-in（可選）** | 鄉鎮層級 ranking + drill 進 township | 2-3 天 |

**總工期**：MVP 約 4-5 天（Phase 0-2，sticky 用 mock）；完整真資料 +3 天（Phase 3-5）。

---

## 十、設計師需回答的問題（送設計檔前）

1. **章節 vs Tab**：選版型 A（5 章節）或版型 B（4 tabs）？
2. **比較對象**：「跟全國比」「跟同區域比」「跟相似縣市比（按人口級距）」要哪幾個？
3. **特色 callout**：要不要自動生成「全國最年輕」之類的 badge？怎麼選詞？
4. **內部 drill-in**：鄉鎮市區 ranking 要不要做？做的話排序鍵是什麼（人口 / 老化 / 面積）？
5. **歷年趨勢**：sparkline 要做幾條（出生死亡 / 老化 / 人口）？
6. **動作**：「加入比較」「分享」「匯出」「切到鄰縣」哪幾個要保留？

---

## 修改紀錄

| 日期 | 改動 |
|---|---|
| 2026-05-22 | 初版 — 5 章節 vs 4 tabs 兩版型、18 指標、Supabase schema、layout 草案 |
