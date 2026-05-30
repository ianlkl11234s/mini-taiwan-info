# Mini Taiwan Info · Claude 專案指引

## 專案定位

**各縣市開放資料儀錶板**。左地圖右儀錶板的縣市開放資料百科：用戶選主題（水資源/人口/...），22 縣市依該主題著色，點縣市進專屬儀錶板，點 KPI 可「爆炸展開」看細節。

工作代號 `mini-taiwan-info`，目前主題 MVP = 水資源。

## 🔒 專案鐵則（不可違反，慢慢補上，全主題一致）

> 這是「原則性 + 架構性」底線，每個主題/分頁/KPI 都必須遵守。違反即 bug。

### 鐵則 1 — 不能有 mock 偽裝成真
- **預設禁止 mock。** 需要展示但無真實資料時，三選一：
  1. **明顯標示**：該區塊用 `PendingDataCard` / coverage badge / 灰字 / 「估」/「待 ETL」標記為待補，**絕不偽裝成真實數字**。
  2. **保留區塊但標 placeholder**：版位留著、清楚標註資料缺口。
  3. **去搜集真資料**：啟動 tmux spawn 一個 session 到 `taipei-gis-analytics`，走 `/gis-data-onboard` + `.claude/guidelines/cross-repo-data-onboard-spawn.md` SOP **盤點 → 搜集 → 清理** 資料，接通真實 RPC/表。
- 任何 mock/估計值**一律可辨識**（badge/灰字/口徑標註），使用者不可能誤以為是真實官方數字。

### 鐵則 2 — 遵循 SSOT，資料不能不同
- 同一指標**只能有一個權威來源**。多處顯示同一指標必須來自同一表/RPC、數值一致。
- 不同口徑/年份的數字**不可混用**；若必須並存（如全國人口：戶籍月度 vs 現住年度），**明確標註口徑 + 年份**，並說明差異非 bug。
- 跨主題共用的維度（縣市人口/面積/代碼）**鎖同一版本 SSOT**（`data/counties.yaml`）。

### 鐵則 3 — 有最新資料用最新
- 接資料時取來源**可得的最新期別**；來源只有舊的也 OK，但**必須標清期別**（`stat_year` / `year_month` / `as_of`）。
- 每個對外數字都要能讓使用者知道「**這是哪年/哪月**」。

### 鐵則 4 — 響應式設計
- dashboard pane = viewport × 40%；任何 KPI/grid 改動**必測 4 寬度**（>1500 / 1100–1500 / 900–1100 / <900）。
- pane 內 grid 一律 **fluid 欄寬**（`1fr` / `1fr 1fr`），不用固定 px；窄 pane **不爆版、不擠垮**。
- 驗收用 agent-browser 多寬度截圖。

## GIS 三部曲（跨 repo 強綁定）

本專案是 GIS 基礎設施的**應用層 / 展示層**：

```
taipei-gis-analytics  →  gis-platform  ←  mini-taiwan-info（本專案）
  探索 & 開發 pipeline   儲存 & RPC       前端展示
```

| Repo | 路徑 | 職責 |
|---|---|---|
| **mini-taiwan-info**（本專案） | `.` | 主題 manifest + frontend SPA + designs SSOT |
| **gis-platform** | `../gis-platform/` | Supabase 表、migrations、PostGIS、RPC |
| **taipei-gis-analytics** | `../taipei-gis-analytics/` | ETL pipelines（datagov 8316/26815 等）+ data-catalog |

跨 repo 變動規則見 `.claude/memory/CROSS_REPO.md`。

## 技術棧

| 層 | 選擇 |
|---|---|
| Frontend | **Vite 6 + React 18.3 + TypeScript 5.7** |
| Map | **Mapbox GL JS 3.9** |
| DB | **Supabase（直連 anon key）**，project `utcmcikhvxnohbxchbrs` |
| Backend wrapper | **FastAPI**（Phase 1+，TGOS / explode engine 用） |
| Icons | lucide-react |
| YAML | js-yaml |
| Pipelines | Python 3 + psycopg2 |

**重要**：不引入 Tailwind / shadcn（CSS 變數已足夠；prototype CSS verbatim 移植）。

## 目錄結構

```
mini-taiwan-info/
├── README.md                 專案說明
├── HANDOFF.md                跨團隊銜接書（設計→實作的 handoff）
├── _STATUS.md                ⭐ 進度追蹤 living doc（user-facing）
├── CLAUDE.md                 本檔（Claude 規則）
├── .claude/                  Claude memory + skills
│   ├── FRAMEWORK.md          可移植 framework 說明
│   ├── memory/               9 個檔的狀態層（見 .claude/memory/README.md）
│   ├── skills/wrap-up/       /wrap-up 收尾 skill
│   └── pitfalls/             長篇 incident archive
├── data/
│   └── counties.yaml         ⭐ 22 縣市 SSOT
├── docs/                     規劃 SSOT（00-10 + themes + wireframes）
├── themes/                   主題 manifest YAML（_template + water + ...）
├── samples/                  範例資料（給設計師看 shape）
├── designs/                  ⭐ 設計師 mockup 入庫區
│   └── v02-claude-design-2026-05-14/   prototype HTML/CSS/JSX
└── frontend/                 Vite SPA
    ├── src/
    │   ├── App.tsx           state machine (view/theme/county/compare)
    │   ├── lib/              types, counties, supabase, mapbox, format, themes, queries
    │   ├── hooks/            useWaterKpis / useCountyData / useReservoirDetail
    │   ├── components/
    │   │   ├── chrome/       TopBar / Breadcrumb / ThemeSwitcher
    │   │   ├── kpi/          KPICard
    │   │   ├── charts/       Sparkline / TrendChart / Donut
    │   │   ├── map/          MapView / MapLegend / TwoSectionLayers
    │   │   ├── point-profile/ PointProfile
    │   │   └── views/        ViewA / ViewB / ViewC
    │   └── styles/globals.css   prototype 1504 行 verbatim
    ├── public/data/tw-counties.geo.json    460KB 簡化邊界
    └── package.json
```

## 核心設計決策（不用再溝通）

詳見 `.claude/memory/PRINCIPLES.md`。摘要：

1. **manifest-driven**：所有 view 從 `themes/{theme}.yaml` 渲染，不寫死特定主題
2. **縣市代碼三軌**：`id_moi`（A-Z，內政部 / Supabase PK）+ `code3`（TPE/KHH，前端 state）+ `slug`（taipei，URL）。SSOT 在 `data/counties.yaml`
3. **資料取用**：前端直連 Supabase anon key（RLS 已 anon SELECT），TGOS 走後端 wrapper
4. **回應語言**：繁體中文（技術詞可留英）
5. **真實資料優先**：所有可接 Supabase 的 KPI 都接，fallback 才 mock；用 `LIVE` badge 標記

## 開發 must-check（Session 5 學到的牆，避免再撞）

**動手前**：
1. **跨 schema query 前**：寫完第一個 query **立即 dev server fetch 驗證**，不只信 typecheck。PostgREST 預設只 expose `public`，新 schema（fire / demographics ...）會報 `Invalid schema`，必須走 `public.{schema}_*` wrapper migration（見 `.claude/memory/PRINCIPLES.md` 2026-05-15 條）。可呼叫 `/check-schema-exposed`。
2. **寫 wrapper RPC 前**：psql 跑 `SELECT pg_get_function_result('schema.func'::regprocedure)` 拿確切 RETURNS TABLE 簽名 — 用記憶或文件描述會 apply 報 "return type mismatch"。可呼叫 `/scaffold-rpc-wrapper`。
3. **新主題加進 ViewA 前**：grep `MapView.tsx` 找所有 `map.addLayer` / `map.addSource`，列出水主題寫死層（如 `river-basins-line` / `river-lines-line`），加 `showXxxBaseLayers` prop 避免污染他主題。

**改完前**：
4. **任何 dashboard pane 內 KPI / grid 改動**：拖視窗測 4 寬度（>1500 / 1100-1500 / 900-1100 / <900）。Pane = viewport × 40%，1500px 是 cols-4 → 2x2 斷點（見 `.claude/memory/PRINCIPLES.md` KPI grid 響應式條）。
5. **pane 內 grid 永遠用 fluid 欄寬**（`1fr` / `1fr 1fr`），不用固定 px（如 `1fr 320px`）— 窄 pane 會擠垮 1fr。
6. **大改動完成**：派 codex review 抓 critical bug（PB-08 driver 已驗證有效）。

---

## 開發流程

### 開新 view / theme / KPI 流程（建議走 `/theme-loop` skill 自動跑）

```
1. 改 themes/{theme}.yaml         加 manifest 定義 + response_shape
2. 改 docs/themes/{theme}.md      （可選）詳規
3. 確認 schema 已 expose          PostgREST 限制，新 schema 要 wrapper migration
4. 改 gis-platform/migrations/   wrapper views/RPCs（若 schema 非 public）
5. 改 frontend/src/lib/queries/   加 Supabase query
6. 改 frontend/src/hooks/         加 hook
7. 改 components/views/           接 hook
8. pnpm typecheck                 confirm（PostToolUse hook 已自動跑）
9. agent-browser 截圖驗證         多寬度（>1500/1100-1500/900-1100/<900）
10. codex review                  大改動必派
11. atomic commit                 feat(scope): xxx
```

### Phase 進度看哪邊

- **Phase 戰場 dashboard**：`_STATUS.md` （Phase 0a/0b/0c/0d 進度 + Backlog + Decision Log）
- **TaskList tool**：in-session 即時 task tracking
- **Session handoff**：`.claude/memory/STATUS.md`（給下一個 Claude session 接續）

## Skills + Agents + Hooks

### 主流程 Skills

| Skill | 觸發詞 | 用途 |
|---|---|---|
| `/theme-loop` | `/theme-loop` / `/water-loop`（alias）/ 跑下一輪 / 迭代 / 接下個資料 / 下個 cycle / 修一輪 P0 / **補 mock 換真實** | 通用主題（水/消防/未來新主題）資料-視覺迭代循環 SOP。5 階段 + 4 checkpoint：Discovery（並行 4 agent，含 schema 預檢 + 多寬度截圖）→ Plan（user 拍板 + 資料缺口處置）→ Execute（4 Mode：P/D/V/S）→ Verify（typecheck + multi-viewport + codex review 三閘）→ Commit/Push（atomic + secret scanning fallback）|
| `/wrap-up` | `/wrap-up`、收工、收尾、session 結束 | 收尾 + 更新 9 個 memory 檔 + atomic commit + **Stage 6 harness audit**（skill 使用率 / hook 健康度 / permission 增量 / memory 健康 / 新模式提取）|

### 輔助 Skills（被 theme-loop 與 wrap-up 自動呼叫，也可獨立）

| Skill | 觸發詞 | 用途 |
|---|---|---|
| `/check-schema-exposed` | 寫新主題 query 前 / 撞 "Invalid schema: xxx" 錯誤 | Supabase PostgREST exposed-schemas 預檢 — 偵測該 schema 是否暴露，沒暴露就提示寫 public wrapper migration |
| `/scaffold-rpc-wrapper` | 「幫我寫 wrapper migration」「scaffold RPC」 | 自動產生 `public.{schema}_*` wrapper migration + 對應 TS query function。psql 拿確切 RPC 簽名避免 `return type mismatch` rework |
| `/cross-repo-status` | 「3 repo 同步了嗎」「該不該 push」「跨 repo 看一下」 | GIS 三部曲（mini / gis-platform / taipei-gis-analytics）跨 repo divergence + dirty + untracked 盤點，純 read-only |

### Agents（自動 dispatch 場景）

| Agent | 何時用 | 用途 |
|---|---|---|
| `schema-drift-auditor` | 主題上線後 / push 前 / 新 session onboarding | 比對 migrations vs frontend queries，找 3 類 drift：orphan RPC / rotten reference / wrapper signature mismatch |

### Hooks（settings.json）

| Event | 行為 |
|---|---|
| PostToolUse on Edit/Write/MultiEdit | 若改 `frontend/src/*.{ts,tsx}` → 自動 `pnpm typecheck`，只有 error 才輸出 |

詳見 `.claude/skills/{theme-loop,wrap-up,check-schema-exposed,scaffold-rpc-wrapper,cross-repo-status}/SKILL.md` + `.claude/agents/schema-drift-auditor.md` + `.claude/settings.json` + `.claude/hooks/`。

## 重要規範

1. **語言**：繁體中文回應
2. **Python**：用 `python3`、`pip3`（非 python / pip）
3. **前端**：cd 到 `frontend/` 再跑 `pnpm install` / `pnpm dev` / `pnpm typecheck`
4. **commit**：atomic、`feat:` / `fix:` / `docs:` / `memory:` prefix、`Co-Authored-By: Claude Opus 4.7 ...`
5. **gitignore exception**：`data/*.yaml` 是 SSOT 要 commit（其他 `data/` 內容 ignore）
6. **Supabase**：anon key 可公開；service_role 只在後端（pipeline）使用
7. **agent-browser**：截圖驗證視覺改動，特別是 layout / overlap 類問題

## 「LIVE」用詞嚴守（2026-05-14 拍板，違反即錯）

**LIVE** 只能形容「**data collector 設 cron 自動持續抓 + 上游 realtime/高頻**」的資料，雙條件都符合才能用。

❌ 禁止用法：
- 「LIVE 接好」「KPI 全 LIVE」「跑完自動 LIVE」「接通 LIVE」
- 任何「實作進度 / 從 mock 改 DB / 從 placeholder 變有東西」場景用 LIVE

✅ 替代用詞：「**接通真實資料**」「**接通真實 RPC**」「**接通 DB**」「**從 mock 改 DB**」

✅ 仍可用 LIVE 的場景：
- 描述「資料本身是 LIVE 的」（蓄水率 / 雨量 / 河川水位 / 地下水位 — collector cron 真跑）
- UI 上 `<DataAgeBadge>` 自動分類，僅 cron 持續抓的標綠 LIVE，其他標「採樣 X 天前」橘 / 灰

**為什麼**：mini-taiwan-info 是公開縣市儀錶板，標 LIVE 等於對外承諾即時性。LPCD（年度）/ 水質（月度）/ 淹水（靜態）標 LIVE 名實不符會傷對外信任。詳見 `.claude/memory/PRINCIPLES.md`。

## Phase 0 已完成（2026-05-14）

| Phase | 內容 |
|---|---|
| 0a | data SSOT + manifest spec v2 + water.yaml v1.1 + reference.counties migration |
| 0b | Vite SPA scaffold（27 檔，~2,250 行 TS + 1,504 行 CSS） |
| 0c | 6/6 KPI LIVE（蓄水率 / 雨量 / 警戒 / 淹水 / LPCD / 接管率） |
| 0c-C | 22 縣市 ranking + choropleth + explode 全 LIVE |
| 0d | flood_hazard_pct_by_county MV |
| 0b+ A-1 | PointProfile 三模式（bucket / region / scatter） |
| 0b+ A-2 | TwoSectionLayers 收合控制 |
| 0b+ A-3 | View B 縣市儀錶板 7 tabs |
| 0b+ A-4 | View C 水庫詳情頁（1 年 trend） |

剩餘：A-5 View D 比較模式（使用者要求延後）、月雨量 MV（Backlog）。

## 相關文件

- [_STATUS.md](_STATUS.md) — Phase 進度 + Backlog + Decision Log
- [HANDOFF.md](HANDOFF.md) — 設計→實作 banding
- [docs/](docs/) — 規劃文件 10 份 + theme 詳規 + wireframes
- [themes/water.yaml](themes/water.yaml) — 水主題 manifest v1.1
- [data/counties.yaml](data/counties.yaml) — 22 縣市 SSOT
- [.claude/FRAMEWORK.md](.claude/FRAMEWORK.md) — Self-evolving memory framework
- [.claude/memory/README.md](.claude/memory/README.md) — 9 個 memory 檔索引
