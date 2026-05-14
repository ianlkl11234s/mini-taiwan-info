# 主題詳規 · 💼 社會經濟（socioeconomic）

> Phase 2 主題（W7-9）。**承接 home-basics 的人口基礎**，往「所得 / 住宅 / 經濟力 / 福利」延伸。
> 本主題的核心難題 = **縣市 GDP 不存在**，必須用 proxy 指標重建縣市經濟畫像。

---

## 主題定位

「**縣市的生活與口袋**」—— 不只看「有多少人」（home-basics 已負責），更看「他們的口袋多深、住在什麼樣的房子、是不是有社會福利接住」。

**敘事三大支柱**：
1. **所得落差**：六都 vs 非六都、縣市內五等分位
2. **住宅市場**：實價登錄縣市均價 + 量、自有率、補貼
3. **福利涵蓋**：長照覆蓋率、托育、低收入

---

## ⚠️ 與 home-basics 的分工

| home-basics（首頁） | socioeconomic（本主題） |
|---|---|
| 總人口 / 縣市數 / 鄉鎮數 / 村里數 | 平均所得 / 公司家數 / 房價 / 長照 |
| 老化指數 / 出生死亡率 / 移入移出 | 失業率 / 教育程度 / 低收入 |
| 人口金字塔 / 行政區邊界 | 五等分位所得 / 實價登錄分布 |

簡單說：home-basics = **誰住在這裡**；socioeconomic = **他們過得怎樣**。

---

## View A · 全台概覽

### 全國 KPI 卡片（6 個）

```
┌─ 所得（紫卡）──────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ 882,000  │ │ 6.18 倍  │ │ 2.9%     │            │
│ │ 戶可支配 │ │ 五等分位 │ │ 低收入戶 │            │
│ │ 中位數元 │ │ 倍數     │ │ 比例     │            │
│ └──────────┘ └──────────┘ └──────────┘            │
└────────────────────────────────────────────────────┘

┌─ 住宅 & 經濟（橙卡）────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 38.5 萬  │ │ 81.6%    │ │ 1.86 萬  │ │
│ │ 房屋實價 │ │ 自有住宅 │ │ 公司家數 │ │
│ │ 中位/坪  │ │ 率       │ │ /萬人    │ │
│ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

| # | 指標 | 單位 | 來源 | 爆炸模式 |
|---|---|---|---|---|
| 1 | 戶可支配所得中位數 | 元 | datagov:144527 綜稅 | dim(22 縣市) + time |
| 2 | 五等分位倍數 | 倍 | datagov:132285 家庭收支 | dim(縣市) |
| 3 | 低收入戶比例 | % | datagov:160963 | dim(縣市) + time |
| 4 | 房屋實價中位/坪 | 萬元 | 本專案實價登錄 grid | dim(縣市) + geo(grid) + time |
| 5 | 自有住宅率 | % | 主計總處家戶 | dim(縣市) |
| 6 | 公司家數 /萬人 | 家 | datagov:173818 GCIS | dim(縣市) + time |

### Choropleth 預設 = 戶可支配所得中位數

落差視覺強、政策意涵明確。可下拉切換：
- 房屋實價中位/坪
- 公司家數 per 萬人
- 低收入戶比例（反向著色）
- 長照覆蓋率

### 自動產出 hook

```yaml
hook_rules:
  - condition: "max_county_income / min_county_income > 2"
    text: "縣市所得中位數差 {ratio} 倍 — {max_county} {max}元 vs {min_county} {min}元"
  - condition: "national_low_income_share_yoy > 0.3"
    text: "全國低收入戶比例近 {n} 年上升 {pct}%"
  - condition: "max_county_housing_price / min_county_housing_price > 4"
    text: "房價區域落差 {ratio} 倍 — 都會 vs 鄉村結構性分裂"
  - default:
    text: "全國戶所得中位數 {income} 元 · 自有住宅率 {own}% · 公司 {firms} /萬人"
```

---

## View B · 縣市儀錶板 Tab 結構

7 個 Tab：

```
高雄市 / 💼 社會經濟
├── [所得分配] ⭐  五等分位 + 平均/中位數 + 低收入戶
├── [住宅市場] ⭐  實價登錄分布 + 自有率 + 補貼
├── [經濟活力]     公司家數 + 失業率 + 產業結構
├── [教育]         教育程度組成 + 學校 + 補習
├── [社會福利]     長照覆蓋 + 托育 + 身障
├── [物價]         CPI（限六都，部分縣市無資料）
└── [排名]         該縣市在 22 縣市的位次
```

### Tab 1「所得分配」⭐

```
KPI: 戶可支配所得中位數 / 平均 / 五等分位倍數

[長條] 該縣市五等分位（最低 20% / 21-40% / ... / 最高 20%）
[時序] 近 10 年所得中位數變化（疊全國平均）
[排名] 該縣市在 22 縣市的中位數位次

⚠️ 「家庭收支調查」縣市別只有六都樣本大，非六都品質差
```

### Tab 2「住宅市場」⭐

```
KPI: 實價登錄中位 /坪 · 交易量（季） · 自有率 · 補貼戶次

[地圖] 實價登錄 150m grid 熱圖（用本專案已有 pipeline）
[時序] 該縣市房價指數歷年
[長條] 該縣市各鄉鎮均價排名
[爆炸] 點某 grid → 該 grid 詳細交易筆數 + 平均成交價
```

### Tab 3「經濟活力」

```
KPI: 公司登記累計家數 /萬人 · 新增公司 · 失業率

[長條] 該縣市公司家數按行業分（金融 / 製造 / 服務 / ...）
[時序] 月度新增公司數
[KPI] 失業率（⚠️ 需外接主計總處統計資料庫 API）
```

### Tab 4「教育」

```
KPI: 大學以上比例 · 各級學校總數 · 補習班數 /萬人

[長條] 該縣市教育程度組成（國小、國中、高中、大學、碩博）
[地圖] 各級學校點位（datagov:174605/606）
```

### Tab 5「社會福利」

```
KPI: 長照覆蓋率 · 照服員 /萬老人 · 托育機構數

[長條] 該縣市長照2.0 服務量（datagov:173368）
[地圖] 安養機構點位 / 托嬰中心點位
[計算] 長照需求人口（65+ 失能率）vs 供給（照服員 + 機構）

⚠️ 托嬰中心只有部分縣市有結構化資料
```

### Tab 6「物價」

```
KPI: 該縣市 CPI 月指數 · 食物類 / 居住類 / 交通類

[時序] 該縣市 CPI 月度變化

⚠️ CPI 只有六都 + 部分縣市，非六都顯示「資料未開放（主計處只發都會區）」
```

### Tab 7「排名」

該縣市在以下指標的全台位次：
- 戶所得中位數
- 五等分位倍數（越小越平均）
- 房屋實價中位
- 公司家數 per 萬人
- 長照覆蓋率
- 低收入戶比例（越低越好）

---

## View C · 資料集深入 — 三個 wow demo

### Demo 1 · 「縣市所得階梯：五等分位疊圖」

```
[長條] 22 縣市的五等分位（堆疊條形）
  - 最低 20% / 21-40% / 41-60% / 61-80% / 最高 20%
  - 各縣市排成階梯狀

[互動] 點某縣市某分位 → 展開「該分位的近 10 年變化」

[敘事] 「台北最高 20% vs 台東最低 20% 倍數達 11 倍 — 國內貧富差距遠大於縣內」
```

### Demo 2 · 「實價登錄 150m grid 熱圖」⭐

```
[地圖] 該縣市 150m grid + 過去 1 年成交均價著色
       熱圖型，淺到深表低到高

[時序] 該縣市季度均價時序
[爆炸] 點某 grid → 顯示該 grid 全部交易（去識別化）

本專案實價登錄 pipeline 已就緒，零開發成本
```

### Demo 3 · 「長照需求 vs 供給比對」

```
[地圖] 該縣市鄉鎮 choropleth
       色階 = (65+ 人口 × 失能率推估) / (照服員數 + 機構容量)
       紅色 = 缺口大 / 綠色 = 充足

[長條] 22 縣市的需求 / 供給比

[敘事] 「{X 縣}長照缺口比 {Y 縣}大 N 倍 — 政策資源錯配」
```

---

## View D · 跨縣市比較指標

```yaml
comparable_metrics:
  - id: median_disposable_income
    label: 戶可支配所得中位數
    unit: 元
    ranking_better: higher
  - id: gini_quintile_ratio
    label: 五等分位倍數
    unit: 倍
    ranking_better: lower
  - id: housing_median_per_ping
    label: 房屋實價中位 /坪
    unit: 萬元
    ranking_better: neutral
  - id: home_ownership_rate
    label: 自有住宅率
    unit: "%"
    ranking_better: higher
  - id: companies_per_10k
    label: 公司家數 /萬人
    unit: 家
    ranking_better: higher
  - id: long_term_care_coverage
    label: 長照覆蓋率
    unit: "%"
    ranking_better: higher
  - id: low_income_share
    label: 低收入戶比例
    unit: "%"
    ranking_better: lower
```

---

## 爆炸圖實例

### Case 1 · 戶所得 882,000 元 → 維度爆炸（22 縣市）

```
[KPI: 全國戶可支配中位數 882,000 元]
   ⤴ 按縣市
┌────────────────────────────────────────┐
│ 22 縣市 · 戶所得中位數排行              │
│ ────────────────────────────────────── │
│ 台北 1,254,000 ▮▮▮▮▮▮▮▮▮▮▮            │
│ 新竹市 1,108,000 ▮▮▮▮▮▮▮▮▮▮          │
│ 新竹縣 1,068,000 ▮▮▮▮▮▮▮▮▮            │
│ ...                                    │
│ 台東   642,000 ▮▮▮▮▮▮                 │
│ 連江   587,000 ▮▮▮▮▮                  │
└────────────────────────────────────────┘
[切] [按時間 10 年] [按五等分位]
```

### Case 2 · 五等分位 6.18 倍 → 維度爆炸（五等分各自）

```
[KPI: 全國五等分位倍數 6.18]
   ⤴ 按分位
┌────────────────────────────────────────┐
│ 全國 vs 各縣市五等分位                  │
│ ────────────────────────────────────── │
│ 最低 20%：215,000 元                    │
│ 21-40%：545,000 元                      │
│ 41-60%：835,000 元                      │
│ 61-80%：1,256,000 元                    │
│ 最高 20%：1,329,000 元（×6.18）         │
│                                        │
│ 點任一分位 → 22 縣市該分位排行         │
└────────────────────────────────────────┘
```

### Case 3 · 公司家數 1.86 萬 → 時間爆炸 + 維度爆炸

```
[KPI: 全國公司家數 /萬人 = 1.86 萬]
   ⤴ 按行業類別
┌────────────────────────────────────────┐
│ 公司家數組成（依行業大類）              │
│ ────────────────────────────────────── │
│ 批發及零售業    ▮▮▮▮▮▮▮▮▮▮ 32%       │
│ 製造業         ▮▮▮▮▮       16%       │
│ 不動產業       ▮▮▮▮        12%       │
│ 餐飲業         ▮▮▮         9%        │
│ ...                                    │
└────────────────────────────────────────┘
[切] [按時間月度] [按縣市]
```

---

## 跨主題聯動

```yaml
crosslink:
  - with: home-basics
    metric_pair: [median_disposable_income, aging_index]
    trigger: always
    text: "{county} 老化 {aging}% · 戶所得中位 {income} — 高齡縣市所得結構"

  - with: water
    metric_pair: [median_disposable_income, lpcd]
    trigger: "abs(corr) > 0.3"
    text: "所得 vs 用水：富裕縣市 LPCD {pattern}"

  - with: water
    metric_pair: [companies_per_10k, water_pollution_fines]
    trigger: always
    text: "{county} 公司密度 {firms}/萬人 · 水污染裁罰 {fines} — 工業密集 vs 污染外溢"

  - with: fire
    metric_pair: [low_income_share, fire_per_10k]
    trigger: "abs(corr) > 0.3"
    text: "貧困 vs 火警相關性 {corr} — 老舊居住空間風險"

  - with: real_estate
    metric_pair: [median_disposable_income, housing_median_per_ping]
    trigger: always
    text: "{county} 戶所得 {income} · 房價 /坪 {price} · 房價所得比 {ratio} 年"
```

---

## ⚠️ 縣市覆蓋警告

| 資料 | 限制 |
|---|---|
| **CPI 物價** | 主計處只發都會區（北/中/南），22 縣市對齊不可能 |
| **失業率** | catalog 內只有桃園 / 苗栗等碎片，需外接主計處統計資料庫 |
| **縣市 GDP** | 不存在（主計處不發），要 proxy（公司家數、就業薪資推估）|
| **家庭收支調查** | 縣市別只有六都樣本大，非六都樣本不足 |
| **教育跨縣市對齊** | 5 年一次普查，平時無細粒度 |
| **托嬰中心** | 部分縣市結構化資料缺 |
| **長照2.0 服務量** | 縣市格式不一，需 ETL 對映 |
| **房價指數** | 只六都 + 部分縣市，非六都顯示「資料未開放」 |

UI 處理：CPI / 失業率 / 房價指數有「**只六都**」標籤；其他 16 縣市顯示「該指標主計處未發佈縣市拆分」。

---

## 資料源完整清單

### Layer 1 (Supabase) — 待 Phase 2 W7 建表

| 表 | 來源 | 頻率 |
|---|---|---|
| `socioeconomic.income_tax_county_yearly` | datagov:144527 綜稅 | 年 |
| `socioeconomic.quintile_county_yearly` | datagov:132285 家戶 | 年 |
| `socioeconomic.low_income_quarterly` | datagov:160963 | 季 |
| `socioeconomic.companies_by_county_monthly` | datagov:173818/175574 GCIS | 月 |
| `real_estate.transactions_grid` | **本專案已有** | 季 |
| `welfare.long_term_care_personnel` | datagov:173368 | 年 |
| `welfare.senior_care_facilities` | datagov:161624 | 年 |
| `housing.subsidy_by_county` | datagov:73250/169800 | 年 |
| `education.school_locations` | datagov:174605 | 不定期 |

### 主要 dataset IDs

| 來源 | id | 內容 |
|---|---|---|
| datagov | 144527 | 綜稅總所得各縣市申報統計 ⭐ |
| datagov | 132285 | 家庭收支－每人可支配所得五等分位 |
| datagov | 160963 | 低收入戶及中低收入戶之戶數及人數 |
| datagov | 173818 | 六都公司登記資料（按行業） |
| datagov | 175574 | 商業登記 |
| datagov | 174605 / 174606 | 各級學校範圍圖 GIS |
| datagov | 161624 / 161625 / 161626 | 老人長照、安養機構 |
| datagov | 173368 | 長照2.0-照服員人數 |
| datagov | 73250 / 169800 | 住宅補貼辦理概況 |
| 內部 pipeline | — | 實價登錄 150m grid（已落地） |
| 外部 | 主計總處 stat.gov.tw | 失業率（需另接 API） |

---

## MVP 範圍（Phase 2 · W7-9）

### Phase 2 MVP（**只做 Tab 1 + Tab 2**）

✅ Tab 1「所得分配」：綜稅 + 五等分位 + 低收入
✅ Tab 2「住宅市場」：實價登錄 grid（本專案已有，無 ETL 成本）
✅ View A 6 KPI
✅ View D 比較 5 個指標
✅ 維度爆炸 + 時間爆炸

### Phase 2.5（隨後加碼）

⏳ Tab 3「經濟活力」（GCIS 公司家數 + 失業率外接）
⏳ Tab 5「社會福利」（長照、托育、身障）
⏳ Tab 4「教育」
⏳ Tab 6「物價」（六都限定）

### 短期不碰

❌ 縣市 GDP（不存在）
❌ 跨縣市教育對齊（5 年一次普查）
❌ 非六都 CPI（主計處本身不發）

---

## 預估工時

- W7 後端 ETL（綜稅 + 五等分位 + 低收入 + 實價登錄重用）：1 週
- W8 前端套 view + 五等分位疊圖 demo + 實價熱圖：1 週
- W9 整合 + polish + 跨主題 InsightCard（with home-basics + water）：1 週

**3 週** MVP，加碼 Tab 排到 Phase 2.5。

---

## 參考檔案

- Manifest: `themes/socioeconomic.yaml`
- 範例資料: `samples/socioeconomic/`
  - `income-tax-county-sample.json` — 綜稅縣市
  - `housing-price-grid-sample.json` — 實價登錄 grid
  - `long-term-care-sample.json` — 長照
