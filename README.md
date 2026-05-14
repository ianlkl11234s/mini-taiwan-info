# Mini Taiwan Info

> **各縣市開放資料儀錶板** — 從全台俯瞰到縣市深入，從數字到地圖的互動敘事。

工作代號暫定 `mini-taiwan-info`，正式品名待設計師命名。本 repo 是**設計與規劃階段**的 SSOT，包含產品定位、資訊架構、版面、主題詳規、資料來源、roadmap。實作 repo 將另開。

---

## 一句話

「左邊地圖、右邊儀錶板」的縣市開放資料百科：用戶選一個主題（人口 / 水資源 / 火災 / 醫療…），全台 22 縣市依該主題著色，點選任一縣市進入專屬儀錶板，再點任一指標可「**爆炸展開**」看細節。

---

## 與 mini-taiwan-* 家族區隔

| Repo | 定位 |
|---|---|
| **mini-taiwan-pos** | 即時 / 動態 / 點位（餐廳店家視角） |
| **mini-taiwan-pulse** | 即時 / 動態 / 氣象雷達雲圖 |
| **mini-taiwan-info**（本 repo） | **統計 / 半動態 / 行政區單位**（縣市開放資料小百科） |

---

## 導讀（從哪裡開始看）

1. [docs/00-vision-and-positioning.md](docs/00-vision-and-positioning.md) — 產品定位 / 目標用戶
2. [docs/01-information-architecture.md](docs/01-information-architecture.md) — 四個 view 架構
3. [docs/02-layout-and-wireframes.md](docs/02-layout-and-wireframes.md) — 版面 + wireframe ⭐
4. [docs/03-exploded-view-pattern.md](docs/03-exploded-view-pattern.md) — 爆炸圖敘事模式 ⭐⭐
5. [docs/04-theme-manifest-spec.md](docs/04-theme-manifest-spec.md) — 主題 YAML 規格
6. [docs/05-storytelling-framework.md](docs/05-storytelling-framework.md) — 敘事框架
7. [docs/06-components-library.md](docs/06-components-library.md) — 元件庫
8. [docs/07-data-sources-overview.md](docs/07-data-sources-overview.md) — 資料來源全景
9. [docs/08-roadmap-12weeks.md](docs/08-roadmap-12weeks.md) — 12 週路線圖
10. [docs/09-phase0-infrastructure-tasklist.md](docs/09-phase0-infrastructure-tasklist.md) — Phase 0 共用基礎設施工作清單 ⭐ 開工前必讀

### 主題詳規

- [docs/themes/home-basics.md](docs/themes/home-basics.md) — 🏠 首頁基礎統計（TGOS 內政主題 API）
- [docs/themes/water.md](docs/themes/water.md) — 💧 水資源（Phase 1 MVP）
- [docs/themes/socioeconomic.md](docs/themes/socioeconomic.md) — 💼 社會經濟（Phase 2）
- [docs/themes/fire.md](docs/themes/fire.md) — 🚒 消防 / 公共安全（Phase 3）

### 配套

- `themes/*.yaml` — Theme manifest（前端用）
- `samples/*/` — 範例資料（給設計師示意）

---

## 目錄結構

```
mini-taiwan-info/
├── README.md                    本檔
├── docs/
│   ├── 00..09-*.md              核心規劃文件（10 份）
│   ├── themes/                  各主題詳細規劃（home-basics, water, socioeconomic, fire）
│   └── wireframes/              wireframe 細部圖（補充）
├── themes/                      Theme manifest YAML（_template + 4 主題）
├── samples/                     範例資料（每主題一資料夾）
└── designs/                     視覺概念補充
```

---

## 狀態

- 階段：**設計與規劃**（不含實作程式碼）
- 目標：交付給設計師繪製 hi-fi mockup + 給工程啟動 Phase 0
- 預估上線：Phase 1 水資源 MVP 約 12 週

---

## 三大核心特色

1. **主題切換正交化** — 同一份 layout 跑所有主題，靠 `themes/*.yaml` manifest 驅動
2. **爆炸圖（Exploded View）** — KPI / 圖表可一鍵展開「按維度 / 按時間 / 按空間」三類爆炸
3. **誠實揭露資料覆蓋** — 「資料未開放」狀態優雅顯示，不假裝有資料
