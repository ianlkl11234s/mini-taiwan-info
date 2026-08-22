# Mini Taiwan Info · Claude 專案指引

## 專案定位

**各縣市開放資料儀錶板**。左地圖右儀錶板的縣市開放資料百科：用戶選主題（水資源/人口/...），22 縣市依該主題著色，點縣市進專屬儀錶板，點 KPI 可「爆炸展開」看細節。

工作代號 `mini-taiwan-info`。主題進度現況見 `_STATUS.md`。

## 🔒 專案鐵則（不可違反，慢慢補上，全主題一致）

> 這是「原則性 + 架構性」底線，每個主題/分頁/KPI 都必須遵守。違反即 bug。

### 鐵則 1 — 不能有 mock 偽裝成真
- 禁止 mock 資料偽裝成真實資料——標示清楚 / `PendingDataCard` placeholder（專案要求的必要元件，不屬過度設計）/ 去搜集真資料，三選一；展開見 `.claude/memory/PRINCIPLES.md` 與 theme-bootstrap skill 的鐵則落實表。

### 鐵則 1a — 「LIVE」用詞嚴守
- 「LIVE」一詞只能在 collector cron 運作中＋上游為 realtime 雙條件同時成立時使用；用詞定義與反例見 `.claude/memory/PRINCIPLES.md`。

### 鐵則 2 — 遵循 SSOT，資料不能不同
- 同一指標單一 SSOT、口徑/年份不混用、共用維度鎖 `data/counties.yaml`；細節見 `.claude/memory/PRINCIPLES.md`。

### 鐵則 3 — 有最新資料用最新
- 一律取來源可得的最新期別，並標註期別欄位（`stat_year` / `year_month` / `as_of`）。

### 鐵則 4 — 響應式設計
- 響應式 4 寬度必測；斷點 SSOT 見 `.claude/memory/PRINCIPLES.md`（含為什麼是 1500 的推導）。

## GIS 三部曲（跨 repo 強綁定）

本專案是 GIS 基礎設施的**應用層 / 展示層**（taipei-gis-analytics 探索 → gis-platform 儲存/RPC → 本專案展示）。跨 repo 變動規則見 `.claude/memory/CROSS_REPO.md`。

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

## 環境 / 啟動

- **套件管理**：強制 `pnpm`，**禁用 npm**（避免 lock 衝突）
- **啟動**：`cd frontend/ && pnpm install && pnpm dev`
- **驗證**：`pnpm typecheck`（PostToolUse hook 已自動跑）
- **Supabase URL / anon key**：`frontend/.env.local`（範本見 `.env.example`）
- **Mapbox token**：同上 `.env.local`，`VITE_MAPBOX_TOKEN`
- **Python pipelines**：用 `python3` / `pip3`

## 目錄結構

Top-level（frontend/src/ 細節見 `README.md`）：

```
mini-taiwan-info/
├── _STATUS.md         ⭐ 進度追蹤 living doc（Phase / Backlog / Decision Log）
├── HANDOFF.md         跨團隊銜接書（設計→實作）
├── data/counties.yaml ⭐ 22 縣市 SSOT（id_moi / code3 / slug 三軌）
├── themes/            ⭐ 主題 manifest YAML（_template + water + ...）
├── designs/           ⭐ 設計師 mockup 入庫區（prototype HTML/CSS/JSX）
├── docs/              規劃 SSOT（00-10 + themes + wireframes）
├── samples/           範例資料（給設計師看 shape）
├── .claude/           memory（9 檔） + skills
└── frontend/          Vite SPA — App.tsx state machine / lib / hooks / components / styles
```

## 核心設計決策（不用再溝通）

詳見 `.claude/memory/PRINCIPLES.md`。摘要：

1. **manifest-driven**：所有 view 從 `themes/{theme}.yaml` 渲染，不寫死特定主題
2. **縣市代碼三軌**：`id_moi`（A-Z，內政部 / Supabase PK）+ `code3`（TPE/KHH，前端 state）+ `slug`（taipei，URL）。SSOT 在 `data/counties.yaml`
3. **資料取用**：前端直連 Supabase anon key（RLS 已 anon SELECT），TGOS 走後端 wrapper
4. **回應語言**：繁體中文（技術詞可留英）
5. **真實資料優先**：所有可接 Supabase 的 KPI 都接，fallback 才 mock（標示準則見鐵則 1 / 1a）

## 開發 must-check

1. 跨 schema query 先跑 `/check-schema-exposed`。
2. 寫 wrapper 前用 `/scaffold-rpc-wrapper`（會先 psql 拿簽名）。
3. 新主題加地圖層前先 grep `MapView.tsx` 找寫死的基底層、加 `showXxxBaseLayers` prop（事故：`.claude/memory/INCIDENTS.md` 2026-05-15）。
4. 大改動派 codex review（門檻見 theme-loop Stage 4）。

---

## 開發流程

開新 view / theme / KPI → 走 `/theme-loop`；線性 11 步檢核表見其 `references/stages.md`。

### Phase 進度看哪邊

- **Phase 戰場 dashboard**：`_STATUS.md` （Phase 0a/0b/0c/0d 進度 + Backlog + Decision Log）
- **TaskList tool**：in-session 即時 task tracking
- **Session handoff**：`.claude/memory/STATUS.md`（給下一個 Claude session 接續）

## Skills + Agents + Hooks

### 主流程 Skills

| Skill | 一句話 |
|---|---|
| `/theme-bootstrap` | 新主題設計討論 SOP（theme-loop 上游）：資料盤點 → 指標設計 → 視覺化選型 → IA 拍板 → manifest 交棒 |
| `/theme-loop` | 通用主題資料-視覺迭代循環：5 階段 + 4 checkpoint，Execute 分 4 Mode（P/D/V/S） |
| `/wrap-up` | session 收尾：更新 memory 檔 + atomic commit + harness audit |

### 輔助 Skills（被 theme-loop 與 wrap-up 自動呼叫，也可獨立）

| Skill | 一句話 |
|---|---|
| `/check-schema-exposed` | PostgREST exposed-schemas 預檢，沒暴露就提示寫 public wrapper migration |
| `/scaffold-rpc-wrapper` | 自動產生 wrapper migration + TS query（psql 拿確切簽名防 return type mismatch） |
| `/cross-repo-status` | GIS 三部曲跨 repo divergence / dirty 盤點，純 read-only |

### Agents（自動 dispatch 場景）

| Agent | 何時用 | 用途 |
|---|---|---|
| `schema-drift-auditor` | 主題上線後 / push 前 / 新 session onboarding | 比對 migrations vs frontend queries，找 3 類 drift：orphan RPC / rotten reference / wrapper signature mismatch |

### Hooks（settings.json）

| Event | 行為 |
|---|---|
| PostToolUse on Edit/Write/MultiEdit | 若改 `frontend/src/*.{ts,tsx}` → 自動 `pnpm typecheck`，只有 error 才輸出 |

詳見 `.claude/skills/{theme-bootstrap,theme-loop,wrap-up,check-schema-exposed,scaffold-rpc-wrapper,cross-repo-status}/SKILL.md` + `.claude/agents/schema-drift-auditor.md` + `.claude/settings.json` + `.claude/hooks/`。

## 重要規範

1. **語言**：繁體中文回應
2. **Python**：用 `python3`、`pip3`（非 python / pip）
3. **前端**：cd 到 `frontend/` 再跑 `pnpm install` / `pnpm dev` / `pnpm typecheck`
4. **commit**：atomic、`feat:` / `fix:` / `docs:` / `memory:` prefix、`Co-Authored-By: Claude Opus 4.7 ...`
5. **gitignore exception**：`data/*.yaml` 是 SSOT 要 commit（其他 `data/` 內容 ignore）
6. **Supabase**：anon key 可公開；service_role 只在後端（pipeline）使用
7. **agent-browser**：截圖驗證視覺改動，特別是 layout / overlap 類問題

## 相關文件

- [_STATUS.md](_STATUS.md) — Phase 進度 + Backlog + Decision Log
- [HANDOFF.md](HANDOFF.md) — 設計→實作 banding
- [docs/](docs/) — 規劃文件 10 份 + theme 詳規 + wireframes
- [themes/water.yaml](themes/water.yaml) — 水主題 manifest v1.1
- [data/counties.yaml](data/counties.yaml) — 22 縣市 SSOT
- [.claude/FRAMEWORK.md](.claude/FRAMEWORK.md) — Self-evolving memory framework
- [.claude/memory/README.md](.claude/memory/README.md) — 9 個 memory 檔索引
