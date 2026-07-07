---
name: theme-bootstrap
description: mini-taiwan-info 新主題設計討論 SOP（/theme-loop 的上游）。當使用者說 /theme-bootstrap、「開新主題」「設計 {主題} 主題」「汙染主題怎麼開」「下個主題要做什麼」「新主題需要哪些表 / KPI / 圖表」「幫我規劃 {主題}」時觸發。5 階段 + 1 checkpoint：資料盤點（範圍界定 + 候選資料源 + DATA_TIERING 分級 + 缺口標記接 cross-repo onboard）→ 指標設計（候選 KPI 表：定義 / 分子分母口徑 / SSOT 來源 / 期別欄位 / 與既有主題重疊檢查）→ 視覺化選型（references/data-shape-viz-patterns.md 對照表逐 KPI 選 pattern + 地圖互動設計）→ IA 拍板（checkpoint：tabs 結構 / ViewA ViewB 佈局 / 第一版 vs backlog / 待補資料 PendingDataCard 處置）→ 產出交棒（manifest 草稿過 pnpm validate:themes + docs/themes/{theme}.md 詳規模板終結覆蓋斷崖 + 交棒 /theme-loop）。內建專案鐵則檢查（mock 標示 / SSOT 重疊 / 期別標註 / LIVE 用詞 / 響應式預想）。主動更新時機：前端長出新視覺化 pattern（新 chart 元件 / 新地圖層型態）→ 更新 references/data-shape-viz-patterns.md；docs/04 manifest spec 升版 → 對齊 Stage 5 草稿欄位；新主題 bootstrap 跑完一輪 → 檢視 5 階段是否漏抓。
user_invocable: true
---

# /theme-bootstrap — 新主題設計討論 SOP（/theme-loop 上游）

## 核心原則

每跑一次 `/theme-bootstrap` 完成 **一個新主題的設計定案**：從「想做 {主題}」到「manifest 草稿 + 詳規文件 + backlog 清單」，然後交棒 `/theme-loop` 執行。

| 原則 | 為什麼 | 對比 |
|---|---|---|
| **設計先於實作** | 過去每個新主題的「要哪些表 / KPI / 圖表」都從零重新溝通；本 skill 把討論固化成流程 | ❌ 邊寫邊想 → 中途翻案 ✅ 拍板後才動手 |
| **復用優先** | 專案已有 30+ 視覺化 pattern（見 references/），逐 KPI 對照選型；新元件是例外要明標成本 | ❌ 每主題發明新圖表 ✅ pattern 對照表選現貨 |
| **重疊檢查強制** | 同一指標多來源不一致（急救醫院雙軌前車之鑑）違反鐵則 2 SSOT | ❌ 各主題自己抓 ✅ 先 grep 既有 themes/*.yaml |
| **缺口誠實** | 沒資料的 KPI 在設計期就決定處置（PendingDataCard / 砍掉 / 去搜集），不是上線才發現 | ❌ 上線才知 9/12 是 placeholder ✅ 設計期分流 |
| **詳規必產出** | docs/themes/ 覆蓋斷崖（medical / forestry / fishery 沒詳規、設計決策只活在 yaml 註解）不再擴大 | ❌ 決策散落對話 ✅ 固定模板落檔 |

## 觸發詞 / 與 /theme-loop 分工

### 觸發詞

- `/theme-bootstrap`
- 「開新主題」「設計 {主題} 主題」「{主題}主題怎麼開」（例：「汙染主題怎麼開」）
- 「下個主題要做什麼」「新主題需要哪些表 / KPI / 圖表」「幫我規劃 {主題}」

### 分工邊界

| | `/theme-bootstrap`（本 skill） | `/theme-loop` |
|---|---|---|
| 時機 | 主題還不存在 / 只有想法 | `themes/{theme}.yaml` 已存在 |
| 產出 | manifest 草稿 + 詳規 + backlog | 程式碼 + migration + commit |
| 問題 | 要哪些表？哪些 KPI？什麼圖？哪些分析必要？ | 這個 KPI 怎麼接真實資料？這個爆版怎麼修？ |

已有 manifest 但要「補 KPI / 換真實資料 / 修視覺」→ 走 `/theme-loop`，不要重跑本 skill。

## 5 階段流程

### Stage 1: 資料盤點（自動，可並行 agent）

1. **主題範圍界定**：跟 user 確認主題一句話定位 + 2-3 個敘事支柱假說（參考 water「南北分裂的島嶼水帳」、fire「5 分鐘命運線」）。範圍太大先切（例：「汙染」= 空氣 / 水 / 土壤 / 噪音 / 廢棄物，第一版收哪幾塊？）。
2. **候選資料源搜集**（三路並行，可派 Task agent）：
   - **政府開放資料**：data.gov.tw + 主管部會 open data 平台（環境部 / 衛福部 / ...）
   - **Supabase 既有表**：含 `public.{schema}_*` wrapper；可派 `schema-drift-auditor` 列 coverage
   - **既有 pipeline**：`../taipei-gis-analytics/pipelines/` 有沒有已寫好只是沒上的
3. **每個資料源記 5 件事**：期別（最新到哪年/月）、更新頻率（realtime / monthly / yearly / static）、縣市覆蓋（全 22？只有幾都？）、license（OGDL-Taiwan-1.0？）、資料形狀（縣市單值 / 點位 / 時序 / ...）
4. **DATA_TIERING 分級**：每源標 A（真 LIVE，需 collector cron）/ B（半靜態，月季度）/ C（純靜態，build 時固化）— 規則見 `docs/DATA_TIERING.md`。**只有 A 級 + collector cron 真跑的才有資格在任何文案用「LIVE」**（鐵則 1a）。
5. **缺口標記**：想要但沒有的資料，走 `../theme-loop/references/data-gap-triage.md` 決策樹分流 — B1（pipeline 已存在沒 run）/ B2（無 pipeline 無公開資料）。B2 需要搜集 → 指路 cross-repo onboard SOP：tmux spawn 到 `taipei-gis-analytics` 走 `/gis-data-onboard` + `.claude/guidelines/cross-repo-data-onboard-spawn.md`。
6. **schema 預檢預告**：候選表若在非 public schema（如 pollution / env），記一筆「需 wrapper」— 交棒後由 `/check-schema-exposed` + `/scaffold-rpc-wrapper` 處理。

**產出物**：資料源盤點表（markdown table：來源 / 期別 / 頻率 / 覆蓋 / license / Tier / 缺口處置）。

### Stage 2: 指標設計

逐一設計候選 KPI，每個 KPI 一列填齊：

| 欄位 | 說明 | 鐵則 |
|---|---|---|
| id / label / unit | manifest 用的 slug + 顯示名 + 單位 | — |
| **定義 + 分子分母口徑** | 例：「每萬人 X」分母用哪版人口（戶籍月度 vs 現住年度）？分母一律鎖既有 SSOT（`data/counties.yaml` / demographics 表），不另起爐灶 | 鐵則 2 |
| **SSOT 來源表 / RPC** | 唯一權威來源；一個指標只能有一個 | 鐵則 2 |
| **期別欄位** | `stat_year` / `year_month` / `as_of` 哪個？每個對外數字都要能標「哪年/哪月」 | 鐵則 3 |
| Tier | 承 Stage 1 分級 | 鐵則 1a |
| 縣市覆蓋 | 全 22 或部分（部分 → 預填 `coverage_notes`，用 `id_moi`） | 鐵則 1 |
| **重疊檢查** | `grep -rn "{候選指標關鍵字}" themes/*.yaml` 掃既有 kpis[].id / color_metrics[].id / compare metrics。已有 → **引用同一 query/RPC**，禁止第二來源（防急救醫院雙軌那種多來源不一致） | 鐵則 2 |
| response_shape 草稿 | 對齊 `docs/04-theme-manifest-spec.md` API 契約（value+delta / items / series） | — |

**產出物**：候選 KPI 表（含上述全欄位），每個 KPI 標「資料就緒 / 待 ETL / 永久缺口」。

### Stage 3: 視覺化選型

1. **逐 KPI 查對照表**：開 `references/data-shape-viz-patterns.md`，按「資料形狀 → 建議 pattern → 既有實作檔案」選型。**優先復用現貨**（零新元件 = 交棒後 theme-loop 跑最快）；對照表沒有的 pattern（hexbin / flow map / sankey ...）= 新元件成本，明標給 Stage 4 拍板。
2. **地圖互動設計**：
   - `color_metrics`：選 2-5 個著色指標，每個定 domain + ramp_direction（「低=好」的指標用 reverse，如 LPCD / 汙染濃度）+ `theme.color_ramp` 色系（**別留 blues，會整片變水藍**）
   - 點位層：幾種點位？可學 medical「同一 source 用 filter 切 3 種點位」pattern；密度型資料考慮 heatmap（fire 已有現貨）
   - 鑽取：county click → ViewB（全主題標配）；點位 click → PointProfile / ViewC？
3. **響應式預想**：dashboard pane = viewport × 40%；選 pattern 時想窄 pane（<900px）表現，grid 一律 fluid 欄寬（鐵則 4）。設計期就避開「天生需要寬版」的選型。

**產出物**：KPI × pattern 選型表 + 地圖層清單（`layers_catalog` 草稿）。

### Stage 4: IA 拍板（Checkpoint：user 決策）

彙整 Stage 1-3 → `AskUserQuestion` 給 user 拍板四件事：

1. **tabs 結構**：ViewB 的 tab 清單（每 tab：id / label / kpis / charts / layers），default_tab 是哪個
2. **ViewA 佈局**：KPI 卡分組（`group: realtime|governance|safety|structural`）、point_profile 要不要開、ranking metrics 選哪些、hook_rules 敘事方向
3. **第一版 vs backlog 切分**：每個 KPI / tab / chart 標 `v1` / `backlog` / `pending-data`；新元件成本項在這裡砍或留
4. **待補資料 UI 處置**：每個 pending-data 項指定 — `PendingDataCard`（等 ETL，版位留著）/ `MissingDataCard`（永久缺口）/ `coverage_notes` 的 `ui_treatment`（warning_badge / placeholder / hide）。**任何無真實資料的版位都必須有明確標示處置，絕不偽裝成真數字**（鐵則 1）。

User 拍板後把決策寫進 Stage 5 的詳規文件（MVP 範圍段），才進 Stage 5。

### Stage 5: 產出交棒

1. **manifest 草稿**：複製 `themes/_template.yaml` → `themes/{theme}.yaml`，填入 Stage 2-4 結果，對齊 `docs/04-theme-manifest-spec.md` v2 欄位（color_metrics / response_shape / layers_catalog / coverage_notes / data_sources），`status: draft`。
   - **驗證閘**：`cd frontend && pnpm validate:themes` 必須過（此閘門若尚未建置完成，fallback：`python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" themes/{theme}.yaml` lint + 手動對照 docs/04「驗證規則」章節逐條查）。
2. **詳規文件**：用 `references/theme-doc-template.md` 產出 `docs/themes/{theme}.md` — **每個新主題必產出，終結覆蓋斷崖**（medical / forestry / fishery 沒詳規的教訓：設計決策只活在 yaml 註解和歷史對話）。
3. **缺口入庫**：每個 pending-data / backlog 項寫進 `.claude/memory/BACKLOG.md`（標等 ETL / 等資料端 / 新元件）。
4. **交棒 `/theme-loop`**：提示 user 下一步跑 `/theme-loop`（其 Stage 1 Discovery 會接手 manifest）；若有非 public schema → 先跑 `/check-schema-exposed`，缺 wrapper 再 `/scaffold-rpc-wrapper`。

**本 skill 不 commit** — manifest 草稿 + 詳規留 working tree，commit 顆粒度交給 `/theme-loop` Stage 5 或 user 決定。

## 專案鐵則內建檢查（不可跳過）

| 鐵則 | 在哪個 Stage 落實 |
|---|---|
| 1 — 不能有 mock 偽裝成真 | Stage 4 每個無資料版位必指定 PendingDataCard / MissingDataCard / coverage_notes 處置 |
| 1a — LIVE 用詞嚴守 | Stage 1 Tier 分級：只有 A 級 + collector cron 真跑才可用「LIVE」；B/C 級文案一律「月度 / 年度 / 靜態」 |
| 2 — SSOT | Stage 2 重疊檢查（grep themes/*.yaml）+ 分母鎖既有 SSOT |
| 3 — 有最新用最新 + 標期別 | Stage 1 記每源最新期別；Stage 2 每 KPI 必填期別欄位 |
| 4 — 響應式 | Stage 3 選型預想窄 pane；實際 4 寬度驗收交棒給 /theme-loop Stage 4 |

## 注意事項

- **範圍先收斂再展開**：主題太大（如「汙染」）先問 user 第一版收哪幾塊，不要 22 個 KPI 全開
- **不發明不存在的 pattern**：對照表（references/）是專案現貨清單；表外選型 = 新元件，必須在 Stage 4 明標成本讓 user 拍板
- **不動 frontend 程式碼**：本 skill 只產 yaml + md；寫 code 是 /theme-loop 的事
- **counties 覆蓋一律用 id_moi**：coverage_notes 的 affected_counties 用 A-Z 代碼，不用中文或 slug
- **可重入**：討論跨 session 中斷，憑資料源盤點表 + KPI 候選表接續，不重跑 Stage 1

## Skill 自身演進

每次 bootstrap 一個新主題跑完，回 REFLECTIONS 記：

- 哪個 Stage 資訊不夠 user 拍不了板？
- 對照表漏了哪種資料形狀 / 新長出的 pattern？→ 更新 `references/data-shape-viz-patterns.md`
- 詳規模板哪段沒人填 / 哪段不夠用？→ 更新 `references/theme-doc-template.md`
- manifest spec 升版（docs/04）→ 對齊 Stage 5 草稿欄位

## 參考資源

- **資料形狀 × 視覺化 pattern 對照表**：`references/data-shape-viz-patterns.md`
- **詳規固定模板**：`references/theme-doc-template.md`
- **manifest 規格**：`docs/04-theme-manifest-spec.md` + `themes/_template.yaml`（範本）+ `themes/water.yaml`（691 行 v1.1 全欄位實例）
- **資料分級**：`docs/DATA_TIERING.md`
- **資料缺口決策樹**：`../theme-loop/references/data-gap-triage.md`
- **跨 repo 資料搜集 SOP**：`.claude/guidelines/cross-repo-data-onboard-spawn.md`（spawn 到 taipei-gis-analytics 走 `/gis-data-onboard`）
- **下游 skill**：`/theme-loop`（執行）/ `/check-schema-exposed` / `/scaffold-rpc-wrapper`
- **配套 agent**：`schema-drift-auditor`（Stage 1 列 Supabase coverage）
