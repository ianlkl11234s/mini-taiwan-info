# docs/themes/{theme}.md 詳規固定模板

> `/theme-bootstrap` Stage 5 用。複製「模板本體」到 `docs/themes/{theme}.md` 後逐段填。
> 段落結構對齊既有詳規（`docs/themes/water.md` / `fire.md`），**每段都要填**；真的不適用寫「N/A + 原因」，不要整段刪 —— 這樣才看得出是「討論過不需要」還是「漏了」。
> `{placeholder}` 全部替換；`<!-- 填寫說明 -->` 註解填完即刪。

---

## 模板本體（從下一行開始複製）

# 主題詳規 · {emoji} {主題中文名}（{theme-id}）

> {Phase / 時程}。{一句話資料特性，例：點位類齊全、統計類粒度粗}。本主題的最強敘事 = **{殺手級敘事}**。

---

## 主題定位

「**{tagline}**」—— {為什麼這個主題值得一個儀錶板，2-3 句}。

**三大敘事支柱**：
1. **{支柱一}**：{一句話}
2. **{支柱二}**：{一句話}
3. **{支柱三}**：{一句話}

---

## View A · 全台概覽

### 全國 KPI 卡片（{N} 個）

<!-- ASCII 卡片示意（分組框：group 對應 realtime/governance/safety/structural），參考 fire.md 畫法 -->

| # | 指標 | 單位 | 定義 / 分子分母口徑 | SSOT 來源（表/RPC） | 期別欄位 | Tier | 爆炸模式 |
|---|---|---|---|---|---|---|---|
| 1 | {label} | {unit} | {口徑，分母鎖哪個 SSOT} | {query / RPC 名} | {stat_year / year_month / as_of} | {A/B/C} | {dim(縣市) / time / geo} |

<!-- 每個 KPI 一列。與既有主題重疊的指標在「SSOT 來源」註明「同 {theme} 主題，引用同一 RPC」 -->

### Choropleth 預設 = {default_choropleth_metric}

{為什麼這個當預設，一句敘事}。可切換為：
- {color_metric 2}（{ramp_direction 理由，如「越低越好 → reverse」}）
- {color_metric 3}

### 自動產出 hook

```yaml
hook_rules:
  - condition: "{條件}"
    text: "{模板含 {var}}"
  - default:
    text: "{預設文案}"
```

---

## View B · 縣市儀錶板 Tab 結構

{N} 個 Tab：

```
{縣市} / {emoji} {主題}
├── [{tab1 label}]        {一句話內容}
├── [{tab2 label}] ⭐     {主視覺標 ⭐}
└── [排名]                該縣市在 22 縣市的位次
```

### Tab 1「{label}」

<!-- 每個 tab 一段：KPI 清單 + 圖表（標 pattern 對照表選型 + 實作參照檔案）+ 地圖 layers -->

```
KPI: {…}
[{圖表類型}] {內容}（pattern：{對照表 pattern 名} → {實作檔案}）
[地圖] layers: {layers_catalog ids}
```

---

## View C · 資料集深入 — wow demo

### Demo 1 · 「{標題}」⭐

{資料 × 視覺 × 敘事，各一句。沒規劃 View C 寫 N/A + 原因}

---

## View D · 跨縣市比較指標

| id | label | 單位 | ranking_better | coverage_note |
|---|---|---|---|---|
| {id} | {label} | {unit} | {higher/lower/neutral} | {null 或「限 X 縣市」} |

---

## 爆炸圖實例

### Case 1 · {KPI 值} → {維度/時間/空間}爆炸（{by}）

<!-- 2-3 個代表性 case，寫預期畫面與資料形狀，參考 water.md/fire.md 寫法 -->

---

## 跨主題聯動

<!-- crosslink：與哪個既有 theme.id、metric_pair、觸發條件。沒有寫 N/A -->

---

## ⚠️ 縣市覆蓋警告

| dataset / metric | affected_counties（id_moi） | mode | ui_treatment | 原因 |
|---|---|---|---|---|
| {dataset} | {[A, H, ...]} | {only_in / excluded / partial} | {warning_badge / placeholder / hide} | {一句} |

<!-- 鐵則 1：全 22 縣市都有資料才可留空；否則每個缺口都要有 UI 處置 -->

---

## 資料源完整清單

### Layer 1 (Supabase) — 已上線

| 表 / RPC | 內容 | 期別 | 更新頻率 | Tier |
|---|---|---|---|---|

### Layer 1 (Supabase) — 待建表

<!-- 含 schema 歸屬；非 public schema 註明「需 public wrapper（/check-schema-exposed）」 -->

### 主要資料源 ID（manifest data_sources）

| id | title | license | url | updated_field | refresh_cadence |
|---|---|---|---|---|---|

---

## MVP 範圍（Stage 4 拍板結果）

### 第一版（v1）

- [ ] {項目}（{Mode P/D/V/S 預估}）

### Backlog（含新元件成本項）

- {項目} — {為什麼延後 / 新元件成本}

### Pending data（等 ETL / 等資料端）

- {項目} — UI 處置：{PendingDataCard / MissingDataCard / coverage_notes}，已入 `.claude/memory/BACKLOG.md`

---

## 預估工時

| 區塊 | 工時 | 備註 |
|---|---|---|

---

## 參考檔案

- `themes/{theme-id}.yaml` — manifest（本詳規的機器可讀版）
- {盤點時參考的 pipeline / 既有主題實作}
