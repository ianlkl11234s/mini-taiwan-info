# Mini Taiwan Info · Claude 專案指引

## 專案定位

**各縣市開放資料儀錶板**。左地圖右儀錶板的縣市開放資料百科：用戶選主題（水資源/人口/...），22 縣市依該主題著色，點縣市進專屬儀錶板，點 KPI 可「爆炸展開」看細節。

工作代號 `mini-taiwan-info`，目前主題 MVP = 水資源。

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

## 開發流程

### 開新 view / theme / KPI 流程

```
1. 改 themes/{theme}.yaml         加 manifest 定義 + response_shape
2. 改 docs/themes/{theme}.md      （可選）詳規
3. 改 frontend/src/lib/queries/   加 Supabase query
4. 改 frontend/src/hooks/         加 hook
5. 改 components/views/           接 hook
6. pnpm typecheck                確認
7. agent-browser 截圖驗證         必跑（user 喜好）
8. atomic commit                  feat(scope): xxx
```

### Phase 進度看哪邊

- **Phase 戰場 dashboard**：`_STATUS.md` （Phase 0a/0b/0c/0d 進度 + Backlog + Decision Log）
- **TaskList tool**：in-session 即時 task tracking
- **Session handoff**：`.claude/memory/STATUS.md`（給下一個 Claude session 接續）

## Skills

| Skill | 觸發詞 | 用途 |
|---|---|---|
| `/wrap-up` | `/wrap-up`、收工、收尾、session 結束 | 收尾 + 更新 9 個 memory 檔 + atomic commit |

詳見 `.claude/skills/wrap-up/SKILL.md`。

## 重要規範

1. **語言**：繁體中文回應
2. **Python**：用 `python3`、`pip3`（非 python / pip）
3. **前端**：cd 到 `frontend/` 再跑 `pnpm install` / `pnpm dev` / `pnpm typecheck`
4. **commit**：atomic、`feat:` / `fix:` / `docs:` / `memory:` prefix、`Co-Authored-By: Claude Opus 4.7 ...`
5. **gitignore exception**：`data/*.yaml` 是 SSOT 要 commit（其他 `data/` 內容 ignore）
6. **Supabase**：anon key 可公開；service_role 只在後端（pipeline）使用
7. **agent-browser**：截圖驗證視覺改動，特別是 layout / overlap 類問題

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
