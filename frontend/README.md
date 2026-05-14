# frontend — Mini Taiwan Info

Vite + React 18 + TypeScript SPA。manifest-driven 縣市開放資料儀錶板。

## 快速啟動

```bash
cd frontend
pnpm install
cp .env.example .env.local
# 編輯 .env.local 填入 Supabase + Mapbox token
pnpm dev    # http://localhost:5173
```

## 技術棧

| 層 | 選擇 | 版本 |
|---|---|---|
| Framework | React | 18.3 |
| Build | Vite | 6 |
| Lang | TypeScript | 5.7 |
| Map | Mapbox GL JS | 3.9 |
| DB | Supabase (PostgREST + RPC) | @supabase/supabase-js 2 |
| Icons | lucide-react | latest |
| YAML | js-yaml | 4 |

樣式採用 Vanilla CSS + CSS Variables（來自 prototype `designs/v02/styles.css`），未引入 Tailwind/shadcn（避免無謂依賴；之後若需要 shadcn 可再加）。

## 目錄結構

```
frontend/
├── public/
│   ├── data/
│   │   └── tw-counties.geo.json    22 縣市簡化邊界（~460KB）
│   └── icons/                       靜態圖示
├── src/
│   ├── main.tsx                     entry
│   ├── App.tsx                      app shell + 路由 state machine
│   ├── lib/
│   │   ├── counties.ts              22 縣市 SSOT（從 data/counties.yaml 衍生）
│   │   ├── supabase.ts              Supabase client
│   │   ├── mapbox.ts                Mapbox config + helpers
│   │   ├── themes.ts                Theme manifest loader
│   │   ├── format.ts                數字 / 日期格式化
│   │   └── types.ts                 Theme manifest TypeScript types
│   ├── styles/
│   │   ├── globals.css              移植自 prototype，design tokens
│   │   └── ...
│   ├── components/
│   │   ├── chrome/                  TopBar / ThemeSwitcher / Breadcrumb
│   │   ├── map/                     MapView / MapLayers / MapLegend
│   │   ├── kpi/                     KPICard / explode views
│   │   ├── charts/                  Sparkline / TrendChart / Donut / Scatter
│   │   ├── point-profile/           PointProfile（bucket/region/scatter）
│   │   └── views/                   ViewA / ViewB / ViewC / ViewD
│   └── hooks/
│       └── (custom hooks)
├── scripts/
│   └── regen-counties.ts            從 data/counties.yaml 重生 src/lib/counties.ts
├── .env.example
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## 資料取用策略

走 **Supabase 前端直連**（anon key + RLS）：

- 縣市靜態查詢 → `supabase.from('reference.counties').select(...)`
- 水資源 RPC → `supabase.rpc('get_reservoir_status_latest')`
- TGOS（有 apikey 不能裸露）→ 走 `VITE_API_BASE_URL` 後端 wrapper

決策理由見 `../_STATUS.md` Decision Log。

## Manifest-driven 渲染

ViewA / ViewB / ViewC / ViewD 都是「**讀 themes/{theme}.yaml 渲染**」的 generic component，不再針對某主題 hardcode。manifest 規格 SSOT 是 `../docs/04-theme-manifest-spec.md` v1.1。

## 與 prototype 的差異

來源 prototype 在 `../designs/v02-claude-design-2026-05-14/`。本專案：

1. babel/standalone in-browser JSX → Vite + TS native
2. window.* globals → ES module imports
3. mock data.js → Supabase queries
4. `theme === "water" ? ViewA_Water : ViewA_Home` → manifest-driven `<ViewA theme={...} manifest={...} />`

設計視覺保持 1:1，盡量不改 CSS class 名。

## TODO（依 `../_STATUS.md`）

當前在 Phase 0b（骨架）。下一個里程碑：跑通 6 個 KPI mock data 渲染 + 22 縣市 choropleth。
