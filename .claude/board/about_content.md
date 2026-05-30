# mini-taiwan-info — About 分頁素材盤點

> 由 mini-taiwan-pulse 主 agent 跨 7 個 GIS 專案 read-only 盤點產出。
> 蒐集日期：2026-05-30

---

## 個人介紹（原文 + 出處檔案路徑）

### ⭐ 最完整來源：mini-taiwan-pulse 的 ProfilePage

**出處**：`/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/mini-taiwan-pulse/src/components/InfoModal.tsx`（`ProfilePage`，L850–918）

這是 user 既有、可直接沿用的「個人介紹」設計，內含頭貼、頭銜、社群連結、其他專案卡片：

| 欄位 | 原文（逐字） |
|---|---|
| 姓名 | **Migu** |
| 頭銜 | **Senior Data Analyst / GIS** |
| 頭貼 | `./screenshots/頭貼.jpg` |
| GitHub | https://github.com/ianlkl11234s |
| Threads | https://www.threads.com/@ianlkl1314 |
| Email（commit author） | ianlk11234s@gmail.com |

ProfilePage 內「其他專案」卡片（原文資料）：
```
1. Mini-Taiwan 軌道運輸模擬 / Mini-Taiwan Rail Simulation
   desc: 台灣軌道運輸即時模擬視覺化
   site: https://mini-taiwan-learning-project.zeabur.app/
   github: https://github.com/ianlkl11234s/mini-taiwan-learning-project

2. Taiwan Flight Arc
   desc: 台灣航班弧線 3D 視覺化
   site: https://flight-arc.zeabur.app/
   github: https://github.com/ianlkl11234s/flight-arc-graph

3. Taiwan Weather Timelapse 台灣氣象模擬
   desc: 台灣氣象時序動畫視覺化
   site: https://taiwan-weather-timelapse.zeabur.app/
   github: https://github.com/ianlkl11234s/taiwan-weather-timelapse

4. Ship GIS — 台灣海域船舶動態
   desc: 台灣海域船舶動態視覺化平台
   github: https://github.com/ianlkl11234s/tw-ship-viz
```

### 次要來源：plan-art (Flight Arc) 的 InfoModal

**出處**：`/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/plan-art/src/components/InfoModal.tsx`（L435–441）— 同一張頭貼 + 同樣頭銜，較精簡版：

```
頭貼: ./screenshots/頭貼.jpg
姓名: Migu
頭銜: Senior Data Analyst / GIS
```

### 「關於專案」理念文字（可借用為 about 開場文案）

**出處**：mini-taiwan-pulse `InfoModal.tsx` 的 `AboutPage`（L735–814），文案質感最好，可作為整個 GIS 生態的開場白範本：

> 用開放資料，感受台灣的脈動。
>
> 天空中的航班劃出弧線、海面上的船舶穿梭往返、軌道上的列車準時奔馳 — 這座島嶼每一刻都在呼吸。Mini Taiwan Pulse 將這些交通運輸的即時動態，以 3D 光球、光軌、拖尾線呈現在同一張地圖上，讓你看見台灣的脈搏。

英文版（同檔）：
> Feel Taiwan's pulse through open data. Flights tracing arcs across the sky, ships navigating coastal waters, trains running on time along their tracks — this island breathes every moment...

### 重點結論

- **沒有獨立的 about / portfolio 頁面或個人網站**；最接近的「個人介紹」就是 mini-taiwan-pulse 的 InfoModal ProfilePage（雙語 zh/en，含社群 + 作品集卡片）。可直接搬到 mini-taiwan-info 的 about 分頁。
- 統一身分：**Migu / Senior Data Analyst / GIS**；所有 repo 都在 GitHub 帳號 `ianlkl11234s` 底下。
- 其餘專案的 README 只有專案說明，無個人簡介；docs 裡出現的 "Author: Claude Code" 是 AI 助手註記，**非** user 個人介紹。

---

## 專案清單

> 一句簡介 / 線上連結 / GitHub / 截圖。GitHub 帳號統一為 `ianlkl11234s`。

### 1. Mini Taiwan Info（本專案，about 分頁的家）
- **簡介**：台灣縣市開放資料互動儀錶板 — 選主題→看全台→點縣市→展指標，把政府開放資料變成看得懂的故事。
- **線上**：https://mini-tw-info.itsmigu.com
- **GitHub**：https://github.com/ianlkl11234s/mini-taiwan-info
- **截圖**：README 有提及但本次未抓（屬本專案自己）

### 2. Mini Taiwan Pulse
- **簡介**：用開放資料感受台灣脈動 — 航班、船舶、軌道、氣象即時動態，以 3D 光球/光軌/拖尾線呈現在同一張地圖。
- **線上**：使用 Zeabur 部署（README 有部署章節，但 repo 內未硬編線上 URL；本機 dev port 3721）
- **GitHub**：https://github.com/ianlkl11234s/mini-taiwan-pulse
- **截圖**：✅ 有（`docs/images/`，已複製 3 張）

### 3. Taiwan Flight Arc（plan-art 目錄）
- **簡介**：航班軌跡生成式藝術 — 把東亞 138 座機場、32,616 筆航班起降軌跡轉成發光弧線與光軌（Mapbox + Three.js）。
- **線上**：https://flight-arc.zeabur.app/
- **GitHub**：https://github.com/ianlkl11234s/flight-arc-graph
- **截圖**：✅ 有（`screenshots/`，已複製 2 張；另有頭貼）

### 4. Mini-Taiwan 軌道運輸模擬（mini-taipei-v3 目錄）
- **簡介**：台灣交通運輸即時模擬 — 真實時刻表驅動，2D/3D 呈現台北/高雄/台中捷運、高鐵、台鐵全路網（992 班列車）運行。
- **線上**：https://mini-taiwan-learning-project.zeabur.app/
- **GitHub**：https://github.com/ianlkl11234s/mini-taiwan-learning-project
- **截圖**：❌ 無（repo 內無圖片檔）

### 5. Ship GIS（ship-gis 目錄，repo 名 tw-ship-viz）
- **簡介**：台灣海域 AIS 船舶動態視覺化 — deck.gl + MapLibre + Apache Arrow，軌跡動畫/密度熱區/六角網格/熱力圖五種模式 + 277 座港口。
- **線上**：無公開部署（Docker / Zeabur 設定但無預設域名；本機 port 3000）
- **GitHub**：https://github.com/ianlkl11234s/tw-ship-viz
- **截圖**：❌ 無（僅有調色盤 HTML 預覽，無 app 截圖 → 需手動跑起來截）

### 6. Taipei GIS Analytics（taipei-gis-analytics 目錄）
- **簡介**：台灣七大城市地理空間資料整合與分析 — 交通/POI/人口/不動產/氣象/觀光多源開放資料，做聚類、時序、網格聚合分析。
- **線上**：無線上版（本地分析專案）
- **GitHub**：https://github.com/ianlkl11234s/taipei-gis-analytics
- **截圖**：✅ 有分析圖表（`output/.../youbike_typology/`，已複製 1 張代表）

### 7. Data Collectors（data-collectors 目錄，repo 名 gis-data-collectors）
- **簡介**：32 個台灣開放資料即時收集器（TDX/CWA/水利署/航港局…），部署 Zeabur 24hr 自動採集→歸檔 S3 + PostgreSQL，是整個生態的資料後端。
- **線上**：無前端（純後端微服務）
- **GitHub**：https://github.com/ianlkl11234s/gis-data-collectors
- **截圖**：❌ 無

### 補充：Taiwan Weather Timelapse（ProfilePage 列出但本次未掛載目錄）
- **簡介**：台灣氣象時序動畫視覺化。
- **線上**：https://taiwan-weather-timelapse.zeabur.app/
- **GitHub**：https://github.com/ianlkl11234s/taiwan-weather-timelapse
- **截圖**：未盤點（目錄未掛載）

---

## 已複製的截圖（複製到 public/about/）

目的地：`/Users/migu/Desktop/資料庫/gen_ai_try/ichef_工作用/GIS/mini-taiwan-info/public/about/`

| 新檔名 | 大小 | 來源 | 內容 |
|---|---|---|---|
| `avatar.jpg` | 259K | mini-taiwan-pulse `public/screenshots/頭貼.jpg` | Migu 個人頭貼 |
| `pulse-all-taiwan-overview.png` | 509K | mini-taiwan-pulse `docs/images/all-taiwan-overview.png` | 全台總覽（航班+船舶+軌道+燈塔+風場） |
| `pulse-northern-3d-rail.png` | 1.2M | mini-taiwan-pulse `docs/images/northern-taiwan-3d-rail.png` | 北台灣近景 3D 軌道+列車光球 |
| `pulse-southern-h3-population.png` | 1.6M | mini-taiwan-pulse `docs/images/southern-taiwan-h3-population-3d.png` | 南台灣 H3 人口密度 3D 柱狀 |
| `flightarc-capture-all-taiwan.png` | 3.3M | plan-art `screenshots/capture-all-taiwan.png` | Flight Arc 全台航班俯瞰 |
| `flightarc-settings-panel.png` | 2.4M | plan-art `screenshots/settings-panel.png` | Flight Arc 控制面板+光軌特效 |
| `analytics-youbike-umap.png` | 155K | taipei-gis-analytics `output/transportation/youbike_typology/umap_spatial.png` | YouBike 站點空間聚類 UMAP |

**無截圖（跳過）的專案**：Ship GIS（無 app 截圖）、mini-taipei-v3（無圖片）、data-collectors（純後端無圖）。
→ 若要補：Ship GIS / mini-taipei-v3 需在本機跑起來手動截圖。

⚠️ Flight Arc 兩張為 2–3MB，上線前建議壓縮（WebP / tinypng）再用。

---

## 建議的 about 分頁結構

mini-taiwan-info 是 **manifest-driven SPA**（view state machine `A/B/C/D`，主題來自 `themes/*.yaml`），且 `ThemeSwitcher.tsx` 已有一個 `href="#"` 的 **About 佔位連結**（尚未實裝）。建議如下：

### 呈現順序（單頁滾動式 About）

1. **Hero / 開場**
   - 借用 Pulse AboutPage 文案精神改寫成「整個 GIS 生態」的開場：一句 tagline（如「用開放資料，看懂台灣」）+ 1 段理念。
   - 背景可用 `pulse-all-taiwan-overview.png`。

2. **關於作者（Profile）** — 直接移植 Pulse ProfilePage 結構
   - 頭貼 `avatar.jpg` + **Migu** + **Senior Data Analyst / GIS**。
   - 社群連結：GitHub (`ianlkl11234s`)、Threads (`@ianlkl1314`)。

3. **作品集（Project Gallery）** — 卡片格線，每張卡：截圖 + 名稱 + 一句簡介 + Live/GitHub 按鈕
   - 有線上版的擺前面（Mini Taiwan Info 本身、Mini Taiwan Pulse、Flight Arc、Mini-Taiwan 軌道模擬、Weather Timelapse）。
   - 純後端/分析型擺後面（Ship GIS、Taipei GIS Analytics、Data Collectors）作為「生態系基礎建設」一區。
   - 卡片沿用 Pulse `ProjectCard` 設計（site 有才顯示 Live，github 必顯示）。

4. **生態系定位圖（可選）**
   - 一張簡單分層圖：資料收集（data-collectors）→ 分析（taipei-gis-analytics）→ 應用前端（pulse / info / flight-arc / mini-taiwan / ship-gis）。強調「同一人從資料管線到視覺化全包」。

### 實裝建議
- **路由**：mini-taiwan-info 用 view state machine，最省事是在 `App.tsx` 加一個 about view 或 modal（仿 Pulse 用 InfoModal overlay 而非獨立頁，較貼近既有架構）。`ThemeSwitcher.tsx` 的 `href="#"` 改成觸發該 view。
- **靜態圖**：放 `public/about/`（已備好 7 張）。
- **資料抽 SSOT**：把專案清單做成一份 `aboutProjects.ts` 常數陣列（name / desc / site / github / screenshot），直接抄本報告「專案清單」即可，省得寫死在 JSX。
- **雙語**：Pulse 既有 zh/en 切換，若 info 也要雙語可一併沿用。

=== DONE about_content ===
