# Batch 4 — 響應式 sweep + 視覺 polish（稽核最後一批）

> 執行：2026-05-30 · 純 CSS（只動 `frontend/src/styles/globals.css`，未改任何 .tsx）
> 來源：3 份 audit 響應式段 + AUDIT_MASTER_PLAN Batch 4 + user 2026-05-30 親報 P-1
> 原則：每項先 agent-browser eval 量測現況 → 改 → typecheck → 多寬度複驗截圖。遵循鐵則4。
> dev server 用自己的 port **5188**（gis-up 6001-6005 未碰，只關自己）。未 push。

---

## ✅ P-1 人口金字塔標籤對齊（user 親報，最優先）

**問題**：`.ppy-num` 外側數值標籤（如「102.0 萬」）無 `nowrap` 又被 bar 擠壓 → **換行成兩行**，
該列變兩倍高 → 整體列高/間距不齊、左右不對稱。

**現況實測**（demographics ViewA @1440，pane 664px）：
- 換行標籤 = **8 個**（offsetHeight 30 = 兩行，正常 15）。
- 列高分布 = **[17, 30]**（不齊）。num 寬 36–43px（內容寬、不一致）。

**修**（globals.css，純 CSS）：
- `.ppy-cell.male/.female .ppy-num`：`white-space: nowrap` + `flex: 0 0 auto` + `min-width: 56px`
  （容得下最寬「102.0 萬」）+ 既有 `tabular-nums`。
- `.ppy-cell.male .ppy-num { text-align: right }`、`.female { text-align: left }`（數值貼近 bar 外緣、兩側鏡像對稱）。
- `.ppy-bar`：`min-width: 0`（bar 可縮、剩餘空間歸 bar、不再回擠 num）。
- `@container dash (max-width:500px)` 內 `.ppy-num` 一併 `min-width: 44px`（窄 pane 給 bar 更多空間）。

**複驗**（ViewA @1440 + ViewB 台北 年齡結構 @1440）：
- 換行 = **0**；列高 = **[17]**（全列等高）；num 寬 = **[56]**（兩側等寬 → bar 起點對齊 → 左右對稱）。
- 截圖：`shots/batch4/b4_after_pyramid_1440.png`（ViewA 全國）、`b4_after_pyramid_viewB_1440.png`（ViewB 台北）。
- 100+ 列仍顯原始數（ViewA「2,421/1,107」、ViewB「536/618」，因 <1萬 不縮成「X.X 萬」）：屬 `fmt.bigNum` 既有行為、字短不致換行、不影響對齊 → 本批不動（避免改 fmt 牽動他處）。

---

## ✅ 響應式 pane 寬度策略統一（鐵則4）

**問題**：viewport 變窄時 dashboard pane 右緣被裁（加入比較鈕/KPI卡/tab列被切）。
根因 `.main`（globals.css:169）兩欄 grid，在 `@media(max-width:1200px)` 解析成固定 **`460px 500px`**
（總需 460+500+gap12+padding24 = **996px**）→ viewport < 996 時整個兩欄撐爆 viewport，右側 pane 被 `.main` overflow 裁掉。
（AUDIT 寫的 1080 = base rule 520+560；實測 @1200 斷點已降成 460+500，真正裁切閾值是 996。）

**現況實測**（全主題一致）：@900 / @820 →
`mainCols = "460px 500px"`、pane right = **984** > viewport → `clipped: true`（demographics/water/fire 皆中）。

**修**（globals.css:178 後新增）：
```css
@media (max-width: 1080px) {
  .main { grid-template-columns: 1fr; grid-auto-rows: min-content;
          gap: 12px; overflow-y: auto; overflow-x: hidden; }
  .main > .map-cell { height: 56vh; min-height: 340px; }
  .dashboard-pane { overflow-y: visible; }   /* 改由 .main 捲動，避免巢狀捲軸 */
}
```
→ ≤1080：地圖與 dashboard pane **垂直堆疊**，pane 取全寬不被裁，整頁改 `.main` 捲動。
斷點設 1080（>996 留緩衝；996–1080 雖塞得下但 pane 僅 ~500px 偏擠，堆疊給全寬更好）。
**僅影響 ≤1080，未動既有 >1080 兩欄版面。**

附帶（窄 pane 防衛，純加性）：
- `.fire-tab-row`：加 `overflow-x: auto` + 隱藏捲軸；`.fire-mini-tab` 加 `flex-shrink:0; white-space:nowrap`
  （tab 過多時可橫滾、避免「其他救護」被切字）。

**複驗**（agent-browser eval `getComputedStyle(.main).gridTemplateColumns` + pane right vs viewport）：

| 寬度 | 主題/view | mainCols | paneW | clipped | hOverflow |
|---|---|---|---|---|---|
| 900 | demographics A | `876px`（單欄） | 876 | ❌ 否 | ❌ 否 |
| 820 | demographics B | `796px`（單欄） | 796 | ❌ 否 | ❌ 否 |
| 900 | water A | `876px`（單欄） | 876 | ❌ 否 | ❌ 否 |
| 820 | fire B | `796px`（單欄） | 796 | ❌ 否 | ❌ 否 |
| **1150** | water A | `579px 535px`（兩欄） | 535 | ❌ 否 | ❌ 否 |
| **1440** | demographics A | `720px 664px`（兩欄） | 664 | ❌ 否 | ❌ 否 |

- 截圖：`shots/batch4/b4_after_demoA_900_pane.png`（@900 堆疊全寬）、
  `b4_after_fireB_820_pane.png`（@820 fire ViewB：5 tab 含「其他救護」完整、KPI/排名/起火原因表全寬不裁）。

**未處理（記錄，非本批 pane 範圍）**：@820 全域 footer（資料來源/授權/GitHub）右側略擠 → 屬底部 chrome，非 dashboard pane 內容裁切，既有問題。

---

## 收尾

- `frontend pnpm typecheck` → **EXIT 0**。
- 多寬度 agent-browser 複驗（1440 / 1150 / 900 / 820）全過：金字塔對齊 + 各主題 pane 窄寬無截斷（`scrollWidth == clientWidth`、`paneRight ≤ viewport`）。
- ⚠️ 地圖 choropleth 著色 headless 測不到（WebGL 不可用，截圖顯「地圖載入失敗」）；本批為 CSS 版面，不涉著色邏輯。
- 改檔：**只 `frontend/src/styles/globals.css`**（+32 行）。未改 .tsx。
- commit：`fix(audit-batch4): 響應式pane斷點 + 金字塔標籤對齊`（明確路徑 add，未 -A，未 push）。
- `.claude/AUDIT_MASTER_PLAN.md` 的既有改動（session 前）**不在本 commit**，留給 user。

=== DONE batch4 ===
