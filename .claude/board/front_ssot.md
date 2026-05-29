# front_ssot — SSOT/一致性 3 修

**範圍**：純前端 + yaml manifest，不碰後端。每項先驗證現況再改。

---

## 任務 1：人口主題全國總人口加口徑標註 ✅

**驗證現況**：`ViewADemographics.tsx` 全國概覽 big-callout 顯示 `deriveNationalSummary` 的
`totalPop` = **23,400,220 人**（demographics.ts L375，age_sex 性別×年齡加總 → 現住人口）。
原本 L74 已有小字註解，但**標反了**：寫「※ 此處為年度戶籍統計（2024 底）；基礎統計頁顯示最新月度登記人口」
—— 把現住人口誤標成戶籍統計（SSOT 背景：戶籍登記 23,262,544 才是首頁那個）。

**改了什麼**：`frontend/src/components/views/ViewADemographics.tsx`
- L65 bc-label：`2024 年底 全國總人口` → `2024 年底 全國總人口（現住人口）`（口徑貼數字旁）
- L74 小字：改成 `※ 口徑：現住人口 · 2024（年底，性別×年齡加總）。與首頁「戶籍登記」口徑不同，故總數略有差異`
- **不改資料來源**，僅修正/補強標註。

**agent-browser**：`?theme=demographics&view=A` 截圖 → label 顯示「（現住人口）」、數字 23,400,220、口徑小字到位。✓

---

## 任務 2：老化指數 manifest unit 一致（注意陷阱）✅

**驗證現況**：
- `themes/home-basics.yaml` aging_index 出現 4 處；其中 KPI(L100) 與 ranking(L237) 標 `unit: "%"`，
  crosslink text(L259) 寫 `高齡 {aging}%` —— 全錯（老化指數＝65+/0-14×100，比值，可破 100，非百分比）。
- `themes/demographics.yaml` 對應 aging_index 全標 `unit: ""`（正確）。
- 前端消費路徑：`ViewA.tsx` 確實讀 `kpi.unit` 並接後綴（L120/234/268），unit="%" 會渲染成「178%」。
  **但** home-basics 主題實際路由到 `ViewAHome` / `ViewBHomeBasics`（自訂視圖，App.tsx L615），
  該視圖硬寫 `agingIndex.toFixed(1)` **不讀 manifest unit**，故目前畫面本來就沒有錯誤 `%`。
  → 此修為 **manifest SSOT 正確性 + 與 demographics 一致**，並防止未來改走 ViewA 通用路徑時冒出「178%」。

**改了什麼**：`themes/home-basics.yaml`（3 處，皆 `"%"`/`%` → `""`/移除）
- L100 KPI aging_index：`unit: "%"` → `unit: ""`（加註：比值非百分比）
- L237 ranking aging_index：`unit: "%"` → `unit: ""`（加註：與 demographics.yaml 一致）
- L259 crosslink text：`高齡 {aging}%` → `高齡 {aging}`（與 demographics 對應 text 一致）

**陷阱遵守**：⚠️ **未刪 demographics.yaml 的 aging_index**（它是 default_choropleth_metric）。只做 unit/顯示一致性。

**agent-browser**：`?theme=home-basics&view=B&county=CYH`（嘉義縣，最老）截圖 →
老化指數顯示 **239.3**（無 `%`，值破 100 正確）。✓

---

## 任務 3：maritime 漁業產值單位統一 ✅（已驗證一致，無需改）

**驗證現況**：`frontend/src/lib/queries/maritime.ts`
- `deriveMaritimeSummary`（全國，ViewA）L294：`fisheryValueY = Number((fyValThousand / 1e5).toFixed(2))`
- `deriveCountyAggregates`（縣市，ViewB）L390：`value = Number(((fishery_value_thousand) / 1e5).toFixed(2))`
- **兩處除數一致（÷1e5）、四捨五入一致（toFixed(2)）**。來源表 `fishery_stats_by_county`
  為 county 聚合表（型別/查詢一列一縣市一年）。
- 結論：千元→億元轉換點一致，ViewA 全國 = ViewB 各縣市加總（同年），無需改。

**唯一觀察（非 bug，未動）**：全國端為「先加總再 ÷1e5 取 2 位」，縣市端為「逐縣市 ÷1e5 取 2 位」，
加總順序不同最多差 ~0.01×N 億的捨入噪音；仍滿足「同除數、同精度」，不違反一致性要求。
（另：`deriveFisheryTrend` L317 用 `Math.round(÷1e5)` 取整數億，屬趨勢圖口徑，不在本次比對範圍。）

---

## 收尾

- **typecheck**：`cd frontend && pnpm typecheck` → 通過（無輸出）✓
- **agent-browser**：2 張截圖驗證（人口概覽口徑 + 縣市老化指數無 %）✓
  - `.claude/tmp/ssot_demo_overview.png`、`.claude/tmp/ssot_county_aging.png`
  - 註：headless 下 Mapbox WebGL「地圖載入失敗」屬環境限制，與本次改動無關；`--full` 截圖會卡 canvas，改用 viewport 截圖。
- **commit**：`45f9198` — `fix(ssot): 人口口徑標註 + 老化指數 unit 一致 + maritime 產值單位`
  - 只 `git add` 兩個明確路徑（themes/home-basics.yaml + ViewADemographics.tsx），未 `git add -A`。
  - `git diff --cached --stat` 確認：2 files, +5 −5。**未 push**。

=== DONE front_ssot ===
