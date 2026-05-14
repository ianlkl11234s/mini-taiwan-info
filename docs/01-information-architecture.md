# 01 · 資訊架構（IA）

## 結構：4 個 view + 1 個 home

```
[Home 首頁]  TGOS 內政主題 API —— 人口 / 鄉鎮數 / 戶數基礎統計
    │
    ├──→ [主題切換器] 💧水 🚗交通 🚒火災 👥人口 🚑醫療 🏠不動產 🌿環境 ...
    │
    ▼
[View A]  全台概覽
    地圖 choropleth（依主題著色） + 全國 KPI + TOP/BOTTOM 排名
    │
    ├── 點選縣市 ───→ [View B]  縣市儀錶板
    │                    │
    │                    ├── 多個 Tab（主題內子分項）
    │                    ├── 鄉鎮 zoom（縣市內細粒度）
    │                    │
    │                    └── 點選某 KPI/圖表 ───→ [View C]  資料集深入
    │                                                │
    │                                                ├── 時序圖（30天/1年/歷年）
    │                                                ├── 詳細欄位表
    │                                                └── 來源 + 下載 CSV
    │
    └── 「比較模式」按鈕 ───→ [View D]  跨縣市比較
                                ├── 多選 2-5 縣市
                                ├── 排行榜
                                └── 多縣市疊圖時序

[爆炸圖 Exploded View] 跨 view 都可觸發（見 03-exploded-view-pattern.md）
    任一 KPI / 圖表 → 一鍵展開維度/時間/空間細節
```

## 階層性原則

**三個正交維度**，任一維度可獨立切換：

| 維度 | 值域 | 切換器位置 |
|---|---|---|
| **主題（Theme）** | 人口 / 水 / 火 / 醫療 / ... | 底部主題列 |
| **空間（Geo）** | 全台 / 縣市 / 鄉鎮 / 村里 / 點位 | 地圖縮放 + 麵包屑 |
| **時間（Time）** | 即時 / 月 / 年 / 歷年 | 右上 timeRange / yearSelector |

切換**任一維度**不應強制重置其他維度（例如切主題不該把選中的縣市清掉）。

## URL 結構建議

```
/                           Home (首頁 home-basics 主題)
/t/water                    View A，主題=水資源
/t/water/c/64               View B，主題=水資源，縣市=高雄(64)
/t/water/c/64/tab/reservoir View B 切到「水庫」Tab
/t/water/d/reservoir/3      View C，資料集=水庫 id=3 (阿公店水庫)
/compare?t=water&m=lpcd&c=64,67,63   View D 比較模式
```

縣市代碼用內政部統計處 CountyId（A=台北、B=台中、...）或國際慣例 ISO TW-TPE。建議用**易讀英文 slug**：`/c/kaohsiung` 而非 `/c/E` —— 設計階段先定 slug 表。

## State Management 原則

| State | 持久化方式 | 範圍 |
|---|---|---|
| 主題、選中縣市、Tab、時間範圍 | URL query / path | 跨 session（可分享連結） |
| 比較模式選中的縣市 | URL `?c=64,67,63` | 跨 session |
| 爆炸圖展開狀態 | local state | 單一 session |
| 圖層 toggle（顯示水庫點 / 隱藏汙水廠點） | localStorage | 跨 session 個人偏好 |
| 視覺設定（暗色模式、字級） | localStorage | 跨 session |

**核心原則**：複製貼上 URL 給朋友，他看到的東西要跟你看到的**幾乎一致**（除了個人偏好的視覺設定）。

## Theme Switcher 的兩種模式

- **預設 (Theme Tab Bar)**：底部一排主題 emoji+文字，點任一即重新著色地圖、換右側 dashboard
- **進階 (Theme Combine)**：未來可選同時著色兩個主題（例：水污染 × 製造業）—— Phase 4+ 再考慮

## 麵包屑（Breadcrumb）

```
首頁  /  💧 水資源  /  高雄市  /  水庫  /  阿公店水庫
```

每段都可點。當前頁面那段加粗不可點。

## 行動裝置（Mobile）IA 變化

PC 版的「左地圖 / 右儀錶板」在手機上**上下堆疊**：
- 上半：地圖（縮短，~40vh）
- 下半：儀錶板（可上滑全屏）

詳見 02-layout-and-wireframes.md 響應式段落。
