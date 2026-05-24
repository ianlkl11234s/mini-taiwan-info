# INCIDENTS — 踩坑紀錄（append-only）

> **絕對不刪舊條目**。收錄門檻：至少造成一次 rework 或靜默錯誤。
> 長文存 `.claude/pitfalls/` 後此處只放摘要 + link。

---

## 2026-05-24 主題 accent key mismatch + ramp 沒 rebind → 基礎統計整片變水藍

**現象**：home-basics（基礎統計）主題的 KPI 卡、章節標題、行政區層級 bar、人口金字塔全變水藍，跟水資源撞色。user 從設計稿記得基礎該是中性 slate 灰。地圖 choropleth 卻是對的（灰）。socioeconomic 同樣中招（該紫變水藍）。

**根因**：兩個 bug 疊加。(1) `App.tsx` `THEME_ACCENT_VARS` 的 key 寫 `"home"`，但 `theme` state 值是 manifest id `"home-basics"` → `THEME_ACCENT_VARS[theme]` miss → 舊 code `?? THEME_ACCENT_VARS.water` fallback 成水藍（accent/deep/soft）。(2) 切 theme 只 rebind `--accent/-deep/-soft`，沒 rebind `--accent-ramp-0..6` → 儀錶板圖表（`.pyr-bar` / `.ranking-row .bar` / `.vs-bar`）殘留 `:root` 預設水藍 ramp。地圖沒事是因為它讀 `manifest.theme.color_ramp → COLOR_RAMPS`（另一套資料源）。

**對策**：App.tsx 改成從 manifest 推導三色 + ramp（見 PRINCIPLES 2026-05-24「主題配色單一 SSOT」），`THEME_ACCENT_VARS` key 修成 `home-basics`，並迴圈寫 7 階 `--accent-ramp-${i}`。socioeconomic 因走 manifest 推導自動修好。typecheck pass + 4 主題截圖驗證（home 灰 / socio 紫 / water 藍無 regression）。

**教訓**：同一件事（主題色）有兩套資料源（manifest+COLOR_RAMPS 給地圖；THEME_ACCENT_VARS+CSS ramp 給儀錶板）必然 drift。debug 配色時別只看地圖 — 地圖對不代表儀錶板對。

---

## 2026-05-16 Fire heatmap addLayer 沒加 beforeId → 蓋掉縣市標籤

**現象**：B045 fire 主題切過去，火災 heatmap 渲染在 county-fill / county-border / county-labels 之上，深紅熱區把縣市名 + 邊線都壓掉。

**根因**：`map.addLayer({ id: "fire-hotspots-heat", ... })` 沒帶第二參數 `beforeId`，Mapbox 預設 append 到 layer stack 最頂，後加的在最上面。

**對策**：`addLayer(..., "counties-border")` 把 heatmap 插在 counties-fill 之上、counties-border 之下，邊線 + 標籤 + station dot 保持在熱力圖之上。

**Codex review 抓到**（PB-08 driver 第 3 次抓 critical bug）。

---

## 2026-05-16 雷達圖 norm() 對 lower-better 軸方向錯 → 視覺意義反向

**現象**：B046 ViewB Fire 縣市雷達圖混 5 軸（火災密度 / 致死率 / 分隊密度 / 5min 圈外 / 栓 km²），其中 3 個 lower-better、2 個 higher-better。直接抄 view-b-fire.jsx 用 `v / max` 公式 → 高雄火災密度 14/萬人 → 外圈 = 「最危險」，但同圖內分隊密度 14/萬人 → 外圈 = 「最好」。同一個 polygon 外圈代表的意義矛盾，user 看不出整體體質。

**根因**：直接 copy design bundle 公式沒思考混軸視覺一致性。

**對策**：統一 score 系統 — `lower-better: 1 - v/max` 反轉。外圈永遠 = 表現好，整體 polygon 大 = 體質好。Verdict 簡化 `diff > 0 = better`，goodDir 變數不再需要。

寫進 PRINCIPLES 2026-05-16「雷達 score-unified」條目。Codex review 抓到。

---

## 2026-05-16 hydrants=0 對 18 縣市被當真實密度 → verdict 永遠誤判

**現象**：mock-fire.ts 對非 4 都（北中南高）縣市 hydrants = 0（沒這個 dataset），雷達圖直接拿 hydrants / area_km2 = 0 當 density，higher-better 軸下 → 18 縣市永遠是「比全國差」，整 polygon 在該軸塌陷。

**根因**：mock 用 0 表示「無資料」，跟「真實密度=0」混淆。

**對策**：hydrants > 0 才算 density，否則設 null；雷達 city polygon 對 null 軸 fallback 到 avg 位置（不塌陷）；avg 計算過濾 null（4 都樣本平均）；verdict 排除 null 軸。

寫進 PRINCIPLES 2026-05-16「mock 0 vs 真實 0 區分」條目。Codex review 抓到。

---

## 2026-05-16 移植 design bundle 元件沒同步 CSS → 看起來只是文字 list

**現象**：B046 ViewBFire.tsx 寫完 1170 行 typecheck 過，dev server 看起來「跟 word 沒兩樣」一片純文字。User 截圖回報「設計稿應該有設計過的」。

**根因**：JSX className（`.fire-radar-card` / `.frc-svg` / `.fcm-row` / `.fire-station-grid` / `.fire-buffer-legend` / `.fire-risk-bar` / `.fbl-sw` 等 9 組）對應的 styles.css 段在 design bundle 內，但 globals.css 沒這些 rule → fallback 成預設 div block layout（無 grid / 無 background / 無 border）。

**對策**：grep `/tmp/fire_design/.../styles.css` 找對應段（line 2629-2810，184 行）→ append 到 globals.css 對應主題段 + 加 `--accent-fire-deep` / `--accent-fire-soft` CSS 變數（design 用了 globals 沒）+ 加 dashboard pane 窄時 fire-radar-card 單欄 stack media query。

**根本對策**：寫進 PRINCIPLES 2026-05-16「design bundle 必含 CSS」+ 寫進 PLAYBOOK PB-12「移植 design bundle 元件 SOP」4 步。

**反省**：Session 5 移植 fire ViewA 時就該一勞永逸把整套 fire-* CSS append 到 globals，當時只移植了 fire-bar-row / fire-table / fire-timeline / S4 grid 等 ViewA 用到的，等 ViewB 加雷達 / station grid / buffer / risk bar 才爆。

---

## 2026-05-14 LPCD pipeline 把「空表」誤判成「表不存在」

**現象**
Apply 094 migration 後 water_usage_yearly 是空表，跑 `python3 datagov_8316_lpcd.py --full` 立刻 abort 報 "table_missing"，但表明明剛建好。

**根因**
`get_max_year_in_db()` 內：
```python
cur.execute("SELECT to_regclass(%s)", (TARGET_TABLE,))
if cur.fetchone()[0] is None: return None
cur.execute(f"SELECT MAX(year) FROM {TARGET_TABLE}")
return cur.fetchone()[0]
```
然後 main 看 `if max_year is None: error("table missing")`。
問題：表存在但是空 → `MAX(year) = NULL` → 也是 None → 誤判成「表不存在」。

**對策**
拆出 `table_exists()` 獨立函數先 to_regclass 判斷。`get_max_year_in_db()` 只回 MAX(year)（空表回 None 表示「沒資料但表在」）。main 改成兩階段：
```python
if not table_exists(conn): error("table missing")
max_year = get_max_year_in_db(conn)  # None means empty
```

**教訓**
- DB 存在性判斷跟資料判斷要拆開
- 空表跟不存在是兩種狀態，不能合併
- sewage pipeline 也檢查了，沒同 bug（不同寫法）

**Sibling 同類風險**
- 任何 ETL 寫「依 max 增量更新」邏輯都要先 table_exists 判斷

---

## 2026-05-14 .gitignore 把 SSOT 也 ignore 掉

**現象**
`git add data/counties.yaml` 失敗，提示 ignored。

**根因**
.gitignore line 67: `data/` 整個目錄 ignore（防下載資料 commit 進來）。但 `data/counties.yaml` 是 SSOT 必須 commit。

**對策**
加 exception：
```
data/*
!data/*.yaml
!data/.gitkeep
```
（單寫 `data/` 結尾的 `/` 會把整目錄 ignore，exception 無效；改 `data/*` 才能讓 `!data/*.yaml` 生效。）

**教訓**
- .gitignore 跟 SSOT 衝突時，用 exception pattern
- 一律先 `git check-ignore -v <file>` 驗證

---

## 2026-05-14 Vite import.meta.glob 跨資料夾被 fs.allow 擋

**現象**
`themes/water.yaml` 在 `frontend/` 之外（`../themes/`），`import.meta.glob('../../../themes/*.yaml', { query: '?raw' })` 在 build 時看似 OK 但 runtime 用 anon raw import 走 `@fs/` 端點，被 Vite 預設 `server.fs.allow` 阻擋。

**根因**
Vite 6 預設 `server.fs.allow` 限制在 project root（`frontend/`），父資料夾被擋。

**對策**
vite.config.ts 加：
```ts
server: {
  fs: {
    allow: [path.resolve(__dirname, ".."), path.resolve(__dirname)],
  },
},
```

**教訓**
- 跨資料夾共用 SSOT（themes / data）一定要設 fs.allow
- monorepo / sibling 結構共用 yaml 時，這是 Phase 0 第一個會遇到的坑

---

## 2026-05-14 Donut label CSS selector 沒生效

**現象**
ViewB Donut 「11/22」label 沒對齊圓圈中央，跟下方描述文字重疊。

**根因**
prototype CSS：`.donut-card .donut-label { position: absolute; inset: 0 }`，需要 `.donut-card` 父層。
我用 `.donut` wrapper（不是 `.donut-card`），label 拿不到 absolute → fall back 到 normal flow → 落到 SVG 下方。

**對策**
Donut.tsx 把 absolute/inset/placeItems 寫成 inline style，不依賴外層 selector。

**教訓**
- 移植 prototype CSS 時，**descendant selector** 容易在 component 拆解時失效
- 重要的 positioning 應該寫 inline style 確保 robust
- 移植過程跑 agent-browser 截圖驗證

---

## 2026-05-14 `.section-subtitle { margin-top: -8px }` 全局造成 title/subtitle 緊貼

**現象**
View A 多個 section（POINTS、RANKING）的 title 跟 subtitle 緊貼，看起來像疊在一起。

**根因**
prototype globals.css line 614 設 `.section-subtitle { margin-top: -8px }`，是設計師用負 margin 把 subtitle 拉近 title 的視覺手法。但 line-height 不夠時就疊到 title 上。

**對策**
改成 `margin-top: 4px` + `line-height: 1.45`，保留呼吸。

**教訓**
- 移植別人的 CSS 時，**負 margin 是高危區域**，下游用法不同就會出問題
- agent-browser 系統性截圖檢核能抓到這類問題（單看 typecheck 抓不到）

---

## 2026-05-14 `.between` flex layout 在 left-block 變兩行時 right-badge 疊到 desc

**現象**
View B Ranking section 內「值 84.5%」desc 文字疊到右側「越高越好」綠 badge 上。

**根因**
`.between` 預設 `align-items: center`，當 left block 變兩行（title + desc）+ right badge 一行時，badge 對齊到 left block 兩行中間，desc 第二行的文字往右溢出時就疊到了 badge。

**對策**
1. globals.css `.between` 加 `min-width: 0` + first-child `flex: 1 1 auto`、last-child `flex-shrink: 0`（防溢出）
2. ViewB ranking layout 重寫：title row（title + badge 同一行）+ desc row（獨占一行），完全避開 align-items center 問題

**教訓**
- 通用 utility class（`.between`）要謹慎，預設行為對某些 layout 反而是 anti-pattern
- 「title + badge」屬於同 conceptual row，「desc」屬於另一 row，不要硬塞進同一個 flex 容器

---

## 2026-05-14 Mapbox token 已 commit 進 history → GitHub secret scanning 擋 push

**現象**
首次 `git push -u origin main` 到 mini-taiwan-info 新 remote 被拒：
```
remote: ...push declined due to repository rule violations
remote: ...secret-scanning/unblock-secret/...
```
偵測到 `designs/v02-claude-design-2026-05-14/js/map.jsx:7` 內含完整 Mapbox public token。

**根因**
Phase 0a 設計階段 prototype（`designs/v02-claude-design-2026-05-14/`）直接把 dev token 寫死成 JS 常數，後續沒處理就 commit 進 git。GitHub Push Protection 自動掃描 push 內容含 secret pattern 直接擋。

**對策**
1. 用 placeholder 取代 working tree token（map.jsx 改讀 `window.MAPBOX_TOKEN`；chat1.md 改說明文字；_STATUS.md 範例改 `__MAPBOX_TOKEN_PLACEHOLDER__`）+ commit
2. `git filter-repo --replace-text /tmp/replace.txt --force` 把所有歷史 commit 內 token 替換成 placeholder（27 commits 全 rewrite，hash 改變）
3. filter-repo 自動 remove remote，重 `git remote add` 後 `git push --force`
4. 過程中 backup 整個 repo 到 `/tmp/{repo}.bak-pre-filterrepo`

**教訓**
- Mapbox / 任何 token 都當作 secret 看待，**永遠走 .env / .env.local**，不放 prototype / mockup / chat log
- commit 前若不確定，跑 `grep -rn "pk\\.eyJ\\|sk_\\|AKIA\\|ghp_\\|gho_" --include="*.{js,jsx,ts,tsx,md,yaml,json}" .`
- GitHub Push Protection 看的是 commit history，不是 working tree — 改現行檔 + 新 commit 救不了
- `git filter-repo` 比 `git filter-branch` 快很多，built-in tool（brew install）
- 三 repo 同步時 mini-taiwan-info 第一次 push 才會踩到（其他兩 repo 已有 push 記錄）

詳見 PLAYBOOKS PB-07。

---

## 2026-05-14 agent-browser headless fetch 時序假象造成 P0-2 誤判

**現象**
Cycle 1 Discovery 階段，screenshot agent 截桃園 ViewB 後回報「水庫 = 0 座、LPCD ━、接管率 ━ 全 None」，列為 P0 bug（reservoirs nearest-centroid 匹配失敗）。實際手動驗證 + 加長 `agent-browser wait` 後：桃園真實顯示「1 座石門 / 平均 72.6% / LPCD 274L LIVE / 接管率 63.8% LIVE」全 LIVE。

**根因**
agent-browser headless Chrome 截圖時 SPA 還沒 hydrate 完：
- `useWaterKpis` 拉 Supabase RPC + `useCountyData` 拉 LPCD/sewage 都還在 async loading
- KPI value 顯示 `━` 或 0（初始 state）
- agent 截圖 + 看 textContent 抓到 placeholder 值就下結論「真實 0」

**對策**
- 截圖前 `agent-browser wait 3500-4500ms`（不要只 wait 1500ms）
- 用 `agent-browser eval` 看 `.kpi-card .kpi-value` text 非 `━` 才視為有效樣本
- 不確定就拉用戶實機驗證，不把假象當 bug 修
- `/water-loop` SKILL.md Stage 1 已寫進「fetch 時序假象偵測」

**教訓**
- agent 截圖 == 拍照，不代表 page 已就緒
- Discovery agent 回報的「N=0」「顯示 ━」要交叉驗證才下結論
- Cycle 1 險些花 30min 修一個不存在的 bug — 半自動 loop **必須有 sanity-check 環節**（手動 click 驗證一次，比 agent 截圖可靠）

---

## 2026-05-14 epa_river 站表存在但 reading 0 筆 — Discovery agent 報告失準

**現象**
Cycle A Discovery 階段，agent 回報「water_quality_stations 2449 站 + readings 8775 筆」，據此規劃 Cycle A 接 ViewB「河川水質」tab。實際 drill schema 才發現：
- epa_river: stations 446 站，readings **0 筆**（pipeline 漏抓河川 source）
- 真正有 reading 的是 epa_reservoir (399) + wra_gw (8357) + epa_gw (19)

險些花時間做「河川水質 tab」但實際看到的是水庫水質。

**根因**
- pipeline `03_load_water_quality.py` 抓了 epa_reservoir / epa_gw / wra_gw 但**漏 epa_river**
- Discovery agent 只看 station 表，沒 join reading 看真實覆蓋
- pipeline 過去某時點手動跑 + 沒 cron 持續，狀況不易發現

**對策**
- Cycle A scope 調整：水庫水質為主（13 縣市覆蓋）+ 河川 placeholder
- 並行 spawn agent 寫 epa_river pipeline 補抓（Cycle A2，commit 88353ae 但未 run）
- ViewB IA 重組（Cycle B）：水質拆解到對應水體 tab，河川 tab 警告「reading pipeline 待補」

**教訓**
- Discovery 階段對「資料就緒」的 agent 報告**必須 drill SQL 驗證**（select count + sample），不只看表存在
- 「pipeline 已存在」不等於「資料已完整」— 要看 ingested_at + reading 行數
- 跨層查 schema：station 表 + reading 表 by source 都查清楚
- /water-loop SKILL Stage 1 Discovery 已加「by source freshness 驗證」步驟

---

## 2026-05-14 「LIVE」用詞濫用 — commit message + UI 名實不符

**現象**
Cycle A 我寫 commit「ViewB 水質 tab LIVE 接好」+ UI 加 LIVE badge。但水質 collector 沒設、月度採樣 — user 抓包：「水質 tab 有 live 資料嗎？什麼叫做他的 live 接好，但是我的 collector 又沒有？」

**根因**
我把「LIVE」當「接通真實資料 / 從 mock 改 DB」代名詞，忽略 LIVE 在本專案的嚴格定義（PRINCIPLES）= collector cron + 上游 realtime。
- commit message 5075b87 / 95bc30e 等 title 都犯
- ViewB WaterQualityTab 內 3 處 LIVE badge 標水質資料（月度採樣，非 LIVE）
- _STATUS / BACKLOG / STATUS 內充斥「6/6 KPI 全 LIVE」濫用

**對策**
- 立刻定義「LIVE」嚴格規範（commit ac44c72 PRINCIPLES）
- 用詞嚴守（commit 84c417c PRINCIPLES + CLAUDE.md）
- 建 DataAgeBadge component（commit 1864a61）取代名實不符的 LIVE badge
- patch living docs LIVE 錯字（commit 47d61e4）
- 舊 commit message immutable 不動

**教訓**
- 對外公開儀錶板，「LIVE」是承諾即時性的字 — 名實不符傷信任
- mini-taiwan-info 給 22 縣市公開觀眾看，**對外用詞必須跟上游真實 freshness 對齊**
- 規範要寫進 PRINCIPLES + CLAUDE.md 雙保險（CLAUDE.md 是全域可見）
- ViewA 6 KPI / ViewB OverviewTab 既有 LIVE badge 也要 audit（B029 task）

---

## 2026-05-14 vite dev server 中途死掉，agent-browser 截全白

**現象**
Cycle A 改完 frontend 跑 typecheck pass，agent-browser reload 截圖卻全白。lsof :5173 沒 listening process — dev server 死了，但 typecheck pass 沒提示。

**根因**
之前 cycle 1 一直跑著的 dev server 不知何時退出（可能 background hang up）。typecheck 是獨立 process 不受影響。截圖前沒 verify server alive。

**對策**
- 重啟 `pnpm dev > /tmp/vite-dev.log 2>&1 &`
- 截圖前用 `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173` 確認 200

**教訓**
- agent-browser 截全白 → 第一直覺懷疑 dev server，不是 React render bug
- 長時間 background process 不可信，cycle 間驗證一次
- /water-loop SKILL Stage 4 Verify 前加「dev server alive check」

---

## 2026-05-15 PostgREST 拒絕 fire schema — "Invalid schema: fire"

**現象**：
Session 5 寫 fire theme，用 `withSchema("fire")` 連 fire.cause_taxonomy 等表，前端 console 顯示
`PostgrestError: Invalid schema: fire`，整個 ViewAFire 顯示 "消防資料載入失敗"。

**根因**：
Supabase Cloud 的 PostgREST 預設只 expose `public` schema。其他 schema（reference / fire / ...）
需要在 Dashboard → Settings → API → "Exposed schemas" 手動加入。這個設定不能用 SQL 改
（嘗試 `ALTER ROLE authenticator SET pgrst.db_schemas` 失敗 — 該參數無法用 SET 設定）。
Migration 099 雖然 `GRANT USAGE ON SCHEMA fire TO anon` 給了 schema 權限，但 PostgREST 層仍不 expose。

**對策**：
寫 migration 104 在 public schema 建 wrapper views + RPC：
- 5 個 wrapper view (用 `WITH (security_invoker = true)` 保 RLS pass-through)
- 2 個 wrapper RPC (用 `LANGUAGE sql STABLE SECURITY INVOKER` 包原 RPC)
- 命名慣例 `public.fire_*`
- Frontend 改用預設 `supabase` client（public schema）抓 `public.fire_*`

**教訓**：
- 開新 schema 主題（demographics / safety / ...）前先測 `withSchema("xxx")` 能不能實際 fetch（不只 typecheck）
- 直接走「public schema wrapper」設計模式（已寫進 PRINCIPLES 2026-05-15 + PB-10）
- Wrapper RPC 簽名必須跟原 RPC `pg_get_function_result(oid)` 完全一致 — 第一次寫錯 column 數量（多了 street/cause_22_name 等不存在欄位）apply 報 "return type mismatch"，rework 1 次

**Sibling 同類風險**：
- 任何主題用非 `public` schema 的 RPC（如 `withSchema("realtime")` 取 groundwater）都會撞同問題
- Migration 103 之前 reference / realtime 之所以「能用」是因為 supabase.ts 雖定義了 `withSchema(...)` exports，但實際前端 query 沒呼叫它（都走 public）→ 沒撞牆而已

---

## 2026-05-15 MapView 寫死河川基底層 — fire 主題地圖有河川

**現象**：
User 切到 fire 主題後回報「消防圖層有河川」。檢查 MapView.tsx 發現 init 時無條件
`map.addLayer({ id: 'river-basins-line', ... })` + `'river-lines-line'`，
跟 theme 無關，所有主題都會顯示這兩個基底層。

**根因**：
Cycle E（2026-05-14）加河川流域線 + 河網作為水主題「地圖地理 reference」，
寫死在 init `useEffect`，沒設計成可 toggle。Session 5 開 fire 主題時忘了這兩層也屬於水主題範圍。

**對策**：
MapView 加 `showWaterBaseLayers?: boolean` prop（預設 true 不破壞水主題），
新 useEffect 在 prop 變動時 `setLayoutProperty("visibility", "none")` 切兩層。
App.tsx 傳 `showWaterBaseLayers={theme === "water"}`。

**教訓**：
- 新主題不只看 component 的 data layer，**所有寫死在 MapView init 的基底層**都要 audit
- 跨主題 component reuse（MapView 同時服務 water/fire）→ 用 prop 控制水主題專屬元素
- agent-browser headless 測不到（WebGL 起不來），是 user 真實瀏覽器才會抓到

**Sibling 同類風險**：
- 未來再開新主題（demographics 等）也會被河川基底層污染 — 都要傳 `showWaterBaseLayers={false}`
- 將來若加 fire 專屬基底層（如鄉鎮邊界），也要走同 prop 控制模式

---

## 2026-05-15 KPI cols-4 在 dashboard pane 太擠 — 「年度火災件數」label 被截斷

**現象**：
User 截圖顯示 fire 主題 4 個 KPI 卡在某個視窗寬度下：
- 「年度火災件數」label 變成「年度火災件」
- 「175 / 405」value 強制斷行成兩行
- trend baseline 「較去年」變「較」
- 「等 MOI 統計處 ETL」變「等」

**根因**：
1. `.kpi-grid.cols-4` 是寫死 `repeat(4, minmax(0, 1fr))` 沒做響應式
2. dashboard pane 只占 viewport 40%（左地圖 60% / 右儀錶板 40%），所以 viewport 1186px 時 pane 約 474px，
   4 個 card + gap + padding 後每張只有 ~98px 內容寬度，32px 字級 value 必爆
3. 沒設 overflow / text-overflow 處理超出文字
4. `.dashboard-pane` 沒設 `overflow-x: hidden`，內部超寬時整個 pane 可橫向捲

**對策**：
- `.kpi-grid.cols-4` 加 `@media (max-width: 1500px) { repeat(2, minmax(0,1fr)) }` 4 → 2x2
- `@media (max-width: 900px) { 1fr }` 全變單欄
- `.kpi-value` 字級用 `clamp(22px, 2.4vw, 32px)` 自動縮放
- `.kpi-label` + `.kpi-trend` 加 `overflow:hidden + text-overflow:ellipsis`
- `.dashboard-pane` 加 `overflow-x:hidden + min-width:0`
- `.fire-s4-grid` 從 `1fr 320px` 改 `1fr`（單欄 stacked），避免 320px 固定欄擠垮 1fr 表格欄

**教訓**：
- KPI 卡的響應式不能用「viewport > 1280」當斷點 — dashboard pane 是 viewport 的 40%，斷點要相應提高
- 固定 px 欄寬（如 `1fr 320px`）在容器只有 400-500px 時必擠垮 1fr 那欄 → 避免在 pane 內用
- `.dashboard-pane` 必加 `overflow-x:hidden + min-width:0`（min-width:0 是 grid child 收縮的關鍵，預設 auto 會撐爆）

**Sibling 同類風險**：
- 將來任何 fire-s5 / s6 / 其他主題 section 用 grid 都要避開固定 px 欄寬
- 將來新加 KPI cols-5 / cols-6 也要規劃響應式斷點（已寫進 PRINCIPLES 響應式斷點規格）

---

## 2026-05-16 (Session 7): KPICard onClick bubble — 內部 toggle 點擊誤收回卡片

**現象**：B047 寫完 FireKpiExplode，agent-browser 測試時點時間 scale 按鈕「月」後，`.kpi-card.expanded` 計數從 1 變 0 — 卡片自己收回去了。連點「收起」button 也雙重觸發：先 onClose 設 null，再 bubble onExpand 從 null toggle 回 "incidents"，相互抵消又開回來。

**根因**：`KPICard.tsx` root `<div className="kpi-card" onClick={onExpand}>` 整張卡綁 toggle，內部 interactive child（toggle-group / 收起 button）onClick 都會 bubble 到 root 觸發 onExpand。

**對策**：FireKpiExplode root div 包 `onClick={(e) => e.stopPropagation()}` 罩整個展開區；「收起」button onClick 也加 `e.stopPropagation()` 雙保險。

**教訓**：
1. **codex review 對 DOM 事件流有盲區**：codex 讀靜態程式碼，看不出「父層綁 onClick 子層點擊會 bubble」這類 runtime behavior。本次 codex 抓 1 blocker（data aggregation） + 2 nice-to-have，但**漏掉這個 bubble bug** — 是 agent-browser 互動 + `document.querySelectorAll('.kpi-card.expanded').length` 才測到的。
2. **任何「整張卡點擊 toggle」設計都該預設 stopPropagation 內部 children**（已寫進 PRINCIPLES）。
3. Verify 階段不能只靠 codex + typecheck — 必須 agent-browser 真的點看看互動行為，特別是 expand/collapse / modal / drawer / drag-drop 這類事件流密集的元件。

Reference: FireKpiExplode.tsx:91, KPICard.tsx:42。

---

## 2026-05-16 (S8): useWaterKpis Promise.all 任一 throw → 整個 hook 掛 → ViewAWater 全炸

**現象**：water S8 6 章敘事重寫時，useWaterKpis 從 4 fetch 擴成 16 fetch。codex review 抓到：若 `fetchReservoirStatusLatest` 或 `fetchRainGaugeLatest`（向下相容 ViewA/ViewB 仍 throw）失敗，整個 `await Promise.all([...])` reject → hook 進 catch → state 設 EMPTY_STATE + error → ViewAWater 顯示「水資源資料載入失敗」即使其他 14 個 fetch 都成功。

**根因**：Promise.all 是「all-or-nothing」語意。每個 query 函數內部雖然有 fallback（return []），但兩個「不向下相容到 try/catch」的還會 throw，把整個 hook 拖下水。

**對策**：改用 `Promise.allSettled` + type-safe helper `get<T>(idx, fallback)` 從 settled results 取 fulfilled value，rejected 走 console.warn。每個失敗的 query 名稱印出來給 dev 看，不阻塞 UI。

**教訓**：
1. **多 fetch hook 並行 ≥ 3 個 query 一律用 allSettled**（已寫進 PRINCIPLES 2026-05-16）
2. **codex review 抓 hook 級的 throw 傳播 bug** 第 4 次驗證（PB-08 driver），是靜態碼分析能抓的範圍
3. 「query 內部已有 fallback」≠「整個 hook 安全」— 向下相容某些 query 仍 throw 時，hook 層級必須再加一層 allSettled 安全網

Reference: useWaterKpis.ts Session 8 改造；codex review BLOCKER。

---

## 2026-05-16 (S8): 規劃 doc vs 實際 schema 不同步 → query 欄名錯 → 兩個 KPI 用 fallback 而非真實

**現象**：water S8 寫 `fetchTreatmentPlantsLarge` 跟 `fetchWaterLossRate` query 時參考規劃 doc `taipei-gis-analytics/docs/topic-research/water-overview/kpi-data-status.md`：
- 規劃寫 `water_treatment_plants_large` schema 含 `id` / `name` / `capacity_cmd`
- 規劃寫 `water_loss_rate_yearly` schema 含 `area` + `year` + `loss_rate_pct`

實際 deploy schema（5/15 commit d06ae9f migration 100 apply 完）跟 doc 不同：
- 實際 `water_treatment_plants_large` PK=`plant_name`，**沒 `id` 也沒 `name`** 欄
- 實際 `water_loss_rate_yearly` 是**全國單表** PK=`year`，**沒 `area`** 欄，欄位是 `loss_pct` 不是 `loss_rate_pct`

dev server console 報 2 個 Supabase 400 error（`column does not exist`），ViewAWater 章 4 淨水場數值是 fallback、章 5 漏水率整塊空白。typecheck 看不出來。

**根因**：
1. 規劃 doc 是 2026-05-15 提前寫的「打算建這些表」，實際 migration apply 時欄位設計改了沒回頭同步 doc
2. Claude 寫 query 時參考 doc 而非實際 schema（沒 psql 驗）
3. typecheck + codex review 都看不到實際 DB schema，截圖 agent 的 console 才抓到

**對策**：psql `\d water_treatment_plants_large` + `\d water_loss_rate_yearly` 確認實際 schema → 修 query：
- `select("plant_name, capacity_cmd, county")` 不是 `id, name, capacity_cmd`
- `select("year, loss_pct")` 不加 area filter，直接取全國最新年

**教訓**：
1. **Discovery 階段 Agent B 必須 psql 直查實際 schema**，不只信 docs/topic-research/*.md 等規劃檔（已寫進 PB-13 階段 2 ⚠️ 註）
2. **寫 new query 時 psql `\d table_name` 確認實際 schema** 是寫對的成本最低的方法（30 秒）
3. **codex review 對 schema mismatch 是盲區** — codex 讀靜態程式碼，看不到實際 DB 表結構。截圖 agent 的 dev server console 才能抓到「column does not exist」400 error
4. **Verify 三閘缺一不可**：typecheck（過）+ codex（過）+ 截圖 agent（**唯一抓到的**）

Reference: water-overview.ts Session 8 寫 query 時誤用規劃 doc 欄名；截圖 agent console 抓 2 個 P0 400 error。

---

## 2026-05-16 (S8): user 認知「資料已處理完」vs 實際後端 90% 狀態 → 我過度懷疑

**現象**：water S8 開場 user 說「水資源資料應該都已處理完成了」，要重構 ViewA。我看到 `taipei-gis-analytics/docs/topic-research/water-overview/kpi-data-status.md` 是 2026-05-15 才建的「規劃清單」列了 7 個動作項，**誤判 user 認知錯**，準備在 plan 階段告訴 user「實際後端只是規劃，沒做」。

派 Discovery Agent B 實際 query Supabase 才發現：5/15 commit `d06ae9f` 一次推完 migration 098-102 + 14 RPC，pipelines 全跑、collector 上線、water_facts_official 7 列、twc 7 表全有資料。**後端實際完成度 ~90%**，user 認知對的是我錯。

**根因**：
1. 規劃 doc 沒同步「已完成」狀態（kpi-data-status.md 仍是「規劃」格式，沒勾「已 apply」）
2. user 在另一個 session 跑完 migration 但沒回頭更新規劃 doc
3. Claude 看 doc 找 ground truth，沒 psql 直查

**對策**：Discovery Agent B 用 psql 實際驗 migrations 已 apply / pipelines 跑過 / 表內容 COUNT，跟 doc 對齊。Audit 結論「實際完成度 ~90%」校正了 user 認知 vs 我認知的衝突。

**教訓**：
1. **user 對自家專案後端狀態的認知通常比 doc 準** — 因為他知道哪些 commit 已 apply / 哪些 pipeline 已跑
2. **規劃 doc（topic-research/*.md / kpi-data-status.md / data-shopping-list.md）跟實際狀態可能脫鉤** — 寫規劃 doc 是「要做什麼」，更新「做完什麼」常被遺漏
3. **Discovery 階段優先信「實際 query」> 規劃 doc**：
   - psql `\d` + COUNT > 看 docs/*.md
   - git log gis-platform/migrations/ > 看 docs/data-inventory.md
   - 兩者衝突時以實際為準
4. 對 user 認知 vs doc 衝突的場景，**默認信 user 然後派 agent 驗**，不要先預設 user 錯

Reference: water S8 Discovery Agent B 報告「重大修正 user 認知：5/15 commit d06ae9f 一次推 4 migration，完成度 ~90%，不是『規劃中』」。

---

## 2026-05-16: 比較視覺（雷達 / scatter）avg vs city 不同 source 造成假差距

**現象**：fire ViewBFire FireRadarCard 顯示高雄 vs 全國平均「致死率 76% ↑、分隊/萬人 41% ↓」，user 直覺異常 — 高雄不應比全國平均差這麼多。Session 9 接通真實後 verdict 變「火災密度 42%」單一軸，其他軸差距變小（合理）。

**根因**：原雷達圖 avg 從 FIRE_MOCK_BY_COUNTY 抓（mock 值 stationsPerWan ~3 / outOf5MinPct ~10）+ 兩條軸 (fireDensity=7.0, deathRate=1.2) hardcoded；city 那側用真實 countyAggregates derive（fireDensity ~9.85 / deathRate ~19）— **avg 跟 city 來自不同尺度的資料 source**，norm 後拉開的差距不是真實縣市表現差，是 source 錯位 artifact。

**對策**：
1. 任何「比較類視覺」（雷達 / scatter / 對照表）的 avg 跟 city **必須從同一個 source derive**
2. 雷達圖 4/5 軸已改真實：fireDensity / deathRate / stationDensity 從 countyAggregates 算全國 mean、hydrantDensity 從 fire.stations + COUNTIES 算
3. 5min 圈外仍 mock（等 Sprint 3 PostGIS）— 這軸 city/avg 都是同源 mock 所以差距還可信

**教訓**：
1. 比較視覺的 avg 不可圖方便 hardcode — 假數字會造成假洞察、誤導 user
2. 雷達圖 / scatter 設計時要明確：兩條 series 必須同 source
3. 改 mock → 真實時，**比較軸的 avg 也必須一起換**，不然會 mixed-source 比較

Reference: ViewBFire.tsx `FireRadarCard` Session 9 改寫；commit `0009ca0`。

---

## 2026-05-16: Cross-session schema drift 第二次撞牆（其他 session 已建 ETL/MV，本 session 不知）

**現象**：Session 9 結尾 wrap-up Stage 1 跨 repo audit 才發現：
- taipei-gis-analytics master 已有 commit `6e10015 / 70b4cf5` Sprint G 衛福部全國急救醫院 ETL（252 家 / 22 縣市齊全）
- gis-platform main 已有 migration 110/111/112（admin.villages 7975 polygon + fire density MV + safety.emergency_hospitals 表）

但本 session 修 ViewA S4 時，急救責任醫院 KPI 仍標「待ETL · 衛福部名冊缺」、ViewBFire OthersTab 5min 圈外仍標「Sprint 3 placeholder」— **資料源已在另一個 session 跑完，前端不知**。

**根因**：
1. Session 8 INCIDENTS 已記過一次「規劃 doc vs 實際 schema drift」（5/16）— 但那次解法只是「Discovery 階段 psql 驗 schema」，沒涵蓋「跨 repo 其他 session 進度可能改變待辦定義」
2. 本 session 進入時沒跑 cross-repo audit（user 直接給 task），所以本 session 「fire 主題去 mock」的範圍沒包含 110-112 對接
3. STATUS.md「Skill 使用率」表 `/cross-repo-status` 累積 2 次使用 — 本該由它在 cycle 開頭跑掉的，但沒主動派

**對策**：
1. **每次 cycle 開頭強制跑跨 repo + DB schema audit**（不只前端 typecheck），即使 user 直接給 task
2. 把這個 audit 加入 `/theme-loop` Stage 1 Discovery 強制動作（4 agent 改 5 — Agent E = cross-session/cross-repo audit）
3. wrap-up Stage 1 已有跨 repo log 比對機制，把這 pattern「發現後 → 寫新 BACKLOG」明文化進 wrap-up SKILL.md

**教訓**：
1. 「待 ETL」這類 placeholder badge 是 **時間敏感**的 — 可能跑完 mid-cycle 就過期
2. 不能 trust 自家 memory「最後狀態快照」是當前真相 — 必須跨 repo grep + psql 雙驗
3. 每跑大 cycle（如「fire 主題去 mock」）開頭 audit 30 秒 vs Cycle 結束才發現遺漏的成本，前者明顯 ROI 高

Reference: Session 9 wrap-up Stage 1 跨 repo audit；taipei-gis-analytics commits `6e10015 / 70b4cf5`；gis-platform commits `19f01a3 / e5ddad0 / 3f146bc`。

---

## (template, 之後用)

## YYYY-MM-DD 標題

**現象**：

**根因**：

**對策**：

**教訓**：
