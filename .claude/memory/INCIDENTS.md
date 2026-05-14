# INCIDENTS — 踩坑紀錄（append-only）

> **絕對不刪舊條目**。收錄門檻：至少造成一次 rework 或靜默錯誤。
> 長文存 `.claude/pitfalls/` 後此處只放摘要 + link。

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

## (template, 之後用)

## YYYY-MM-DD 標題

**現象**：

**根因**：

**對策**：

**教訓**：
