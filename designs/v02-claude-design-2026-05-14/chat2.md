# 返回按鈕設計

_Started 2026-05-14 00:26 UTC_

---

## User

當點入到縣市後，會需要有能夠回去整體的按鈕與設計，然後可能這裡的設計不能被遮擋

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: view_image]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

I see the issue. Two changes needed:

1. **Back button when in city view** — currently only the breadcrumb. I'll add a clear back button in the hero.
2. **"Phase 2+ 主題" tooltip is the browser-native `title` attribute** — it floats unpredictably near the cursor and obscures the map legend / KPI cards. I'll replace it with an inline badge that sits inside the pill itself.

Let me look at the disabled theme pill structure and view-b hero:

_[tool: str_replace_edit]_

Now I'll make the fixes:Now add the back button to View B hero, and update styles:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now wire onBack through app.jsx, and also for ViewC. Let me check view-c:

_[tool: grep]_

_[tool: str_replace_edit]_

Now add CSS for the back-link button and the phase badge, and fix the disabled pill styling:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

Let me check the chev icon to make sure rotation works correctly:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

已修正兩處：

**1. 「Phase 2+ 主題」不再遮擋設計**
原本是瀏覽器原生 `title` tooltip，會浮在游標附近，蓋住地圖圖例、KPI 卡。改為在禁用的主題 pill 內顯示一個小型 **`P2+`** 內聯徽章 — 永遠固定在底部主題列裡，不會延伸出去蓋到任何東西。

**2. 縣市檢視加上「返回全台概覽」按鈕**
在 City Hero 標題上方加了 `‹ 返回全台概覽` 連結式按鈕（水資源與基礎兩個 theme 都有）。配合既有的麵包屑「首頁 › 💧 水資源 › 高雄市」，現在離開縣市檢視更直覺。

點 Tweaks 內「View B · 高雄市」可快速驗證返回按鈕；hover 底部禁用的主題（火災安全、人口⋯）可確認不再有浮動 tooltip。

_[tool: fork_verifier_agent]_

已完成修正並交付驗證。

## User

請幫我依據此文件來進行水資源的修正，並且確認狀態

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: update_todos]_

Excellent spec. Let me plan and implement focused changes to View A (water) and the map.

_[tool: str_replace_edit]_

**Step 1: Enrich data — coords, capacity, layer metadata**

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

**Step 2: Add `TwoSectionLayers` component (replaces `MapLayers` on View A water)**

_[tool: read_file]_

**Step 3: Add a Scatter chart primitive**

_[tool: str_replace_edit]_

**Step 4: Create PointProfile component (新「點位概況」面板)**

_[tool: write_file]_

Now register the new script file and wire it up:

_[tool: str_replace_edit]_

**Step 5: Update view-a.jsx — embed PointProfile between KPI and Ranking**

_[tool: str_replace_edit]_

**Step 6: Wire app.jsx for new layer state + use TwoSectionLayers on View A water; pass reservoir points to map**

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now pass the View A reservoir points and other point layers to the map. Update the MapView props in app.jsx:

_[tool: str_replace_edit]_

## Assistant

Now wire reservoirs through to map for View A and add cluster behavior + popup:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

**Step 7: Update map.jsx — color reservoir points by 蓄水率 (red/yellow/green) on View A, popup on click**

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now add reservoir hover/click and update the data feed:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

**Step 8: Add CSS for new components**

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now add CSS for PointProfile and Scatter components:

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now append PointProfile + Scatter CSS at the end of styles.css:

_[tool: read_file]_

_[tool: str_replace_edit]_

Let me verify the page loads and check for issues:

_[tool: show_html]_

_[tool: done]_

_[tool: grep]_

TDZ — `pointOn` used at line 159 but declared at line 223. Let me move it up:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

已依文件補強水資源 View A，主要交付：

**1. 圖層 UI 兩段拆分** — 把原本混在一起的 4 個 toggle 拆成「著色指標」（5 個 radio：LPCD / 蓄水率 / 接管率 / 24hr 雨量 / 淹水高潛勢）+「點位圖層」（6 個 checkbox，每項顯示**顏色 dot + 點數** 40 / 242 / 1,201 / 188 / 8,420 / 82）

**2. 點位上地圖** — 全國 40 座水庫的座標、容量、所屬縣市補進 data.js；地圖上以紅/黃/綠依蓄水率著色，zoom < 7.6 時隱藏 label，hover 顯示帶顏色的浮層 tooltip，點擊跳到該縣市儀錶板

**3. 「點位概況」新面板** — 在 KPI 卡片下方、Ranking 上方插入 PointProfile，三個模式分頁：
- **蓄水率分布**（桶）：充足 ≥60% / 警示 30–60% / 紅線 <30%，點任一桶展開該桶水庫清單 chips
- **按地理區**：北 / 中 / 南 / 東 / 離島 五區聚合，顯示座數 + 平均蓄水率
- **容量 × 蓄水率**：散布圖（容量為對數軸），背景三色帶區分紅黃綠區段，hover 浮層顯示數值

**4. Scatter chart primitive** 加入 charts.jsx，可重用給之後的火災 / 醫療等主題

**未做（仍是 Phase 2+ 範圍）**：點位 cluster 圓圈數字、heatmap 底色、其他 5 個點位圖層的實際座標、手機版 bottom sheet popup — 這些屬於資料密度極高的後續整合。

## User

Verifier agent check completed

## Assistant

驗證通過 ✅

- 圖層雙段 UI、6 個點位圖層 + 點數 badge 全部就位
- 40 座水庫資料完整，紅/黃/綠依蓄水率著色運作正常
- 「點位概況」三個分頁齊全（桶 25/13/2、南北落差敘事南部 45.5% vs 北部 84.3%、散布圖 40 點對數軸 + 三色帶）
- 無 console error

