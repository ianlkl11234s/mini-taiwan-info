# front_compare_about — 移除比較模式 + 新增 about 分頁

> 執行：2026-05-30 · 兩任務同 session 序列做（都動 ThemeSwitcher/App 路由）。
> typecheck 過 · agent-browser 多寬度(1440/900)驗證過。

---

## 任務 1 — 移除「比較模式」(View D / compare)

「比較模式」原本是**半成品**：有 TopBar 切換鈕 + breadcrumb「比較模式」label + 各 ViewB Hero 的「+加入比較」鈕 + `comparing` state，但**從未實作真正的 ViewD 元件**（`view==='D'` 落到「Phase 0b 尚未實作」分支）。全數移除入口與 state。

### 移除的入口 / 路由 / state（檔案 × 改動）
| 檔 | 移除內容 |
|---|---|
| `App.tsx` | `comparing` state、`onCompare` handler、breadcrumb「比較模式」push（含 dep array）、goHome/goCity 的 `setComparing(false)`、TopBar 的 `comparing`/`onCompare` props、URL parse 的 `v==='D'`、`showReservoirs` 的 `view!=='D'` → `true`、6 處傳給 ViewB* 的 `onAddCompare={() => setComparing(true)}`、ThemeSwitcher onThemeChange 的 `setComparing(false)` |
| `chrome/TopBar.tsx` | `comparing`/`onCompare` props + `tb-compare-btn` 比較模式按鈕 + 未用的 `Scale` import |
| `lib/types.ts` | `AppView` 由 `"A"\|"B"\|"C"\|"D"` → `"A"\|"B"\|"C"`；`AppState` 移除 `comparing` / `selectedForCompare` 欄位（該介面未被使用，順手清） |
| `views/ViewBFire.tsx` | `onAddCompare` prop/destructure + 加入比較鈕 + 未用 `Plus` import |
| `views/ViewBDemographics.tsx` | 同上（prop/destructure/Hero pass/HeroProps/Hero destructure/鈕/Plus import） |
| `views/ViewBMaritime.tsx` | 同上（含 Hero inline type + destructure）+ Plus import |
| `views/ViewBRail.tsx` | 同上 — **但保留 `Plus` import**（L279 `am-ico` 仍用 Plus） |
| `views/ViewB.tsx`（水） | prop/destructure/鈕 + Plus import |
| `views/ViewBHomeBasics.tsx` | prop/destructure + 「比較」鈕 + Plus import |

### 沒刪的東西（刻意）
- **`themes/*.yaml` 的 `compare:` 區塊**：依任務要求保留，前端不讀即可（manifest type `CompareConfig`/`ComparableMetric` 也留著，未消費）。
- **`globals.css` 的 compare 死樣式**（`.tb-compare-btn` / `.compare-chips` / `.compare-chip*` / `compare mode table`）：純死 CSS、無入口，留著降低 churn，可後續 sweep。
- **無 ViewD/ViewCompare 元件檔**可刪（本來就不存在）。

### 驗證
- TopBar 只剩「說明 / 設定」icon，**無「比較模式」鈕**。
- 各 ViewB Hero action 只剩「下載 CSV / 分享」（home-basics 為「分享 / 匯出」），**無「加入比較」死鈕**。

---

## 任務 2 — 新增 about 分頁（樸實，無 Hero）

### 架構決策
- **路由**：採 **overlay 方案**（仿 Pulse InfoModal）。`App.tsx` 加 `aboutOpen` boolean state；`{aboutOpen && <AboutView/>}` 以 `position:fixed`（`top:64px / bottom:72px`，對齊 `.app` grid 3-row）蓋在 `.main` 區。**不破壞 grid、保留地圖 WebGL state**（不重 mount MapView）。比「加進 A/B/C state machine」更貼近現有架構（About 是全幅頁，不吃左圖右板 split layout）。
- **SSOT**：專案清單抽成 `frontend/src/lib/aboutProjects.ts` 常數陣列（`ABOUT_PROFILE` + `ABOUT_PROJECTS` + `ABOUT_ECOSYSTEM`），不寫死 JSX。
- **入口**：`ThemeSwitcher.tsx` 在主題列**最左**加「關於」pill（neutral slate 色 + 右側分隔線，非主題），點擊開 about；切任何主題 pill 自動關 about。原 footer `href="#"` 的死 About 連結**移除**（已實裝為最左 pill，避免重複入口）。

### 新增 / 改的檔
| 檔 | 內容 |
|---|---|
| `lib/aboutProjects.ts`（新） | 8 專案 SSOT：`name/desc/github/site?/screenshot?/tier/current?`。`tier:"app"`(應用前端,前) / `"infra"`(後端分析,後) |
| `components/views/AboutView.tsx`（新） | 關於作者(頭貼+Migu+頭銜+GitHub/Threads) → 一行生態定位 → 兩區作品集卡片格線(app / infra)。卡片：截圖或字母 fallback + 名稱 + 簡介 + Live(有 site 才顯示) + GitHub |
| `chrome/ThemeSwitcher.tsx` | 最左「關於」pill + `aboutActive`/`onAbout` props；移 footer 死 About |
| `App.tsx` | `aboutOpen` state + AboutView render + ThemeSwitcher 接線 |
| `styles/globals.css` | `.about-pill*` + `.about-page` / `.about-profile` / `.about-gallery`(auto-fill minmax(260px,1fr)) / `.about-card*` 全套，響應式 `@media(max-width:640px)` |
| `frontend/public/about/`（新,4 圖） | avatar.jpg / pulse-all-taiwan-overview.png / flightarc-capture-all-taiwan.png / analytics-youbike-umap.png |

### 作品集內容（抄 about_content.md）
**應用前端（有線上版排前）**：Mini Taiwan Info(本站) / Mini Taiwan Pulse / Taiwan Flight Arc / Mini-Taiwan 軌道運輸模擬 / Taiwan Weather Timelapse
**生態系基礎建設（後）**：Ship GIS / Taipei GIS Analytics / Data Collectors

### ⚠️ 鐵則 1 注意點（誠實處置）
- **Mini Taiwan Pulse 無 Live 鈕**：任務列它為「有線上版」，但跨 repo grep（README/package/全 repo）查無公開 URL，**不編造連結**（鐵則 1）。Pulse 卡只放 GitHub（仍排在 app 區前段）。`aboutProjects.ts` 已留註解，user 確認 URL 後填 `site` 即可自動長出 Live 鈕。
- **無截圖的專案用字母 fallback**（M/T/S/D 漸層底），不放假圖。
- **圖片放對位置**：截圖原在 **repo-root `public/about/`**，但 Vite 服務的是 **`frontend/public/`** → 原樣 SPA fallback 回 index.html，`<img>` 解碼失敗顯示 alt。已把**實際引用的 4 張**複製進 `frontend/public/about/`（其餘 3 張未引用不複製，省 repo 體積）。**新 public 子目錄需重啟 dev server** 才被 Vite 認到。

### Backlog
- Flight Arc 截圖 `flightarc-capture-all-taiwan.png` = **3.3MB**，上線前建議壓成 WebP（已加 `loading="lazy"` 緩解）。
- 補 Mini Taiwan Info / 軌道模擬 / Weather Timelapse / Ship GIS / Data Collectors 的真實截圖（目前字母 fallback）。
- repo-root `public/`（pulse agent 的素材落點）仍 untracked，可後續清理。

---

## 驗證
- `cd frontend && pnpm typecheck` ✅ 過（0 error）。
- agent-browser：
  - 比較模式入口消失、KPI/Hero 無「加入比較」死鈕 ✅
  - 「關於」pill 在 theme-switcher 最左、點開顯示 profile + 8 卡 + 真實截圖/字母 fallback、GitHub/Threads 連結正確、Live 條件渲染正確 ✅
  - 多寬度 1440(3欄) / 900(3欄) 無爆版 ✅
  - 「返回儀錶板」關閉 about 正常（`ABOUT_CLOSED`）✅
- 截圖：`/tmp/about_shots/about_1440.png` / `about_900.png` / `about_1440_infra.png`

## commit
- message：`feat: 移除比較模式 + 新增 about 分頁(作者介紹+作品集)`（hash 見本 commit / git log）
- 明確 staging（無 `git add -A`）：11 改檔 + AboutView.tsx + aboutProjects.ts + frontend/public/about/(4圖) + 本 board 檔。
- 不 push。

=== DONE front_compare_about ===
