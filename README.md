# Mini Taiwan Info

> **台灣縣市開放資料互動儀錶板** — 左邊地圖、右邊儀錶板，從全台俯瞰到縣市深入，把政府開放資料變成看得懂的故事。

🔗 **線上版**：https://mini-tw-info.itsmigu.com

---

## 這是什麼

Mini Taiwan Info 把分散在各政府網站、格式各異的**開放資料**，整合成一個「選主題 → 看全台 → 點縣市 → 展指標」的互動百科。

選一個主題（基礎統計 / 人口 / 軌道運輸 / 航運 / 消防 / 水資源），全台 22 縣市的地圖會依該主題著色；點任一縣市進入專屬儀錶板，再點任一指標可「**爆炸展開**」看更細的維度、時序與空間分解。

資料能接真實來源就接（標 `LIVE`），暫時沒有來源的欄位誠實標示「待後續階段補上」，不用假數字充版面。

---

## 六大主題

| 主題 | 內容 | 狀態 |
|---|---|---|
| 🏠 **基礎統計** | 行政區劃分、國土地理、人口總量、年齡結構、人口動態 | 上線 |
| 👥 **人口** | 性別金字塔、老化指數、城鄉密度、社會 / 自然增減 | Beta |
| 🚆 **軌道運輸** | 9 系統 535 站、班次與車種、運量、縣市排名 | Beta |
| ⚓ **航運** | 港口 / 漁港、漁業產值、航線 | Beta |
| 🚒 **消防** | 火災熱點、消防分隊、消防栓、災變時序、避難收容 | 上線 |
| 💧 **水資源** | 水庫蓄水、雨量、河川水位、用水與漏水率、淹水潛勢 | 上線 |

---

## 三大核心特色

1. **主題切換正交化** — 同一套版面跑所有主題，靠 `themes/*.yaml` manifest 驅動，新增主題不改版面程式。
2. **三層下鑽** — View A 全台概覽（地圖著色）→ View B 縣市儀錶板 → View C 專項詳情（如單一水庫）。
3. **誠實揭露資料覆蓋** — 真實資料標 `LIVE` badge；缺口資料優雅顯示「待後續階段補上」/ 🔴 缺口卡，不假裝有資料。

---

## 技術棧

- **前端**：Vite 6 + React 18.3 + TypeScript + Mapbox GL JS v3（地圖著色 / 點位 / SPA）
- **資料**：Supabase（PostgREST 前端直連 anon key，政府開放資料全公開）+ 前端 sessionStorage 快取層（TTL 分級 + in-flight dedupe）
- **部署**：Zeabur GitHub 自動部署（root Dockerfile → Vite build → nginx；`git push` 觸發重建）
- **資料管線**：見下方關聯 repo

### 本機開發

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # tsc -b + vite build
```

環境變數（`.env.local`，範本見 `frontend/.env.production.example`）：
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_MAPBOX_TOKEN` / `VITE_DEFAULT_THEME`。

部署 SOP 與踩坑見 [`DEPLOYMENT.md`](DEPLOYMENT.md)。

---

## mini-taiwan-* 家族

| Repo | 定位 |
|---|---|
| **mini-taiwan-pulse** | 即時 / 動態 / 多運具脈動（船舶、航班、公車…） |
| **mini-taiwan-info**（本 repo） | **統計 / 半動態 / 行政區單位**（縣市開放資料小百科） |

### 資料三部曲（後端管線）

```
taipei-gis-analytics（ETL / data-catalog）
   ↓ 寫入
gis-platform（Supabase schema / migrations / RPC）
   ↓ 前端直連
mini-taiwan-info（本 repo，視覺化）
```

---

## 目錄結構

```
mini-taiwan-info/
├── frontend/                    React + Vite 應用（實作）
│   ├── src/
│   │   ├── components/views/    ViewA*/ViewB* 各主題分頁
│   │   ├── components/map/      Mapbox 地圖 + 圖例 + 圖層控制
│   │   ├── lib/queries/         各主題 Supabase query
│   │   ├── hooks/               use*Data 資料 hook
│   │   └── lib/cache.ts         前端快取層
│   ├── Dockerfile / nginx.conf  部署
│   └── ...
├── themes/                      Theme manifest YAML（6 主題 + _template）
├── docs/                        規劃文件 + 主題詳規 + 資料來源
├── DEPLOYMENT.md                Zeabur 部署指南 + 事件報告
└── README.md                    本檔
```

---

## 深入了解

- [docs/00-vision-and-positioning.md](docs/00-vision-and-positioning.md) — 產品定位 / 目標用戶
- [docs/01-information-architecture.md](docs/01-information-architecture.md) — 四個 view 架構
- [docs/03-exploded-view-pattern.md](docs/03-exploded-view-pattern.md) — 爆炸圖敘事模式
- [docs/04-theme-manifest-spec.md](docs/04-theme-manifest-spec.md) — 主題 YAML 規格
- [docs/07-data-sources-overview.md](docs/07-data-sources-overview.md) — 資料來源全景
- `themes/*.yaml` — 各主題 manifest（前端 metadata 來源）

---

## 資料來源

內政部戶政司 / 統計處、交通部（臺鐵 / 高鐵 / 各捷運）、消防署、經濟部水利署、國土測繪中心等政府開放資料，經 `taipei-gis-analytics` 清洗、`gis-platform` 入庫後對外。

授權：資料依各來源之開放資料授權；程式碼見本 GitHub repo。
