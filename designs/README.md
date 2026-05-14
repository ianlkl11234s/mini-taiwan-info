# Designs · 設計師 Mockup 收件區

> 設計師交付的 mockup / 視覺資產統一進這個資料夾。

---

## 命名規範

```
v{NN}-{theme}-{view}-{platform}.{ext}
```

範例：
- `v01-water-view-a-desktop.png`
- `v02-water-view-b-desktop.png`
- `v02-water-view-a-mobile.png`
- `v02-popup-reservoir.png`

## 版本

| 版本 | 日期 | 狀態 | 備註 |
|---|---|---|---|
| v01 | 2026-05-14 | ⚠️ 需改 | 初版，點位資料偏弱，已給補充規範（見 `../docs/10-point-data-pattern.md`） |
| v02 | 待收 | — | 對應 doc 10 的設計交付清單 |

---

## v02 設計交付清單（給設計師）

對應 `../docs/10-point-data-pattern.md` 第 12 段：

- [ ] **桌機 View A** × 2 主題（水 / 火），含拆段圖層 + 點位概況面板
- [ ] **桌機 View B** × 1 主題（水），含縣市點位 + 點位概況變化
- [ ] **桌機 View C** × 1 demo（阿公店水庫）
- [ ] **桌機 View D** × 1（比較模式）
- [ ] **點位 Popup** × 3 種（水庫 / 消防分隊 / 學校）
- [ ] **點位散布圖** 樣式（含 hover state）
- [ ] **Cluster 圓圈** 三級樣式
- [ ] **點位爆炸圖** 展開動畫示意
- [ ] **手機版** × 2（View A / View B with sheet）
- [ ] **空狀態** mockup（「該縣市無此資料」）
- [ ] **顏色 + 符號規範**附錄頁

---

## Figma / Penpot 連結

（待設計師補上 share link）

設計工具：__________________

Share URL：__________________

---

## 設計 tokens

來源 SSOT：`../docs/06-components-library.md` 末段「設計 Tokens」。

設計師可從那裡拿：
- 字體大小（14-32px 階層）
- 顏色（7 主題 accent + 中性色 + 暗色模式）
- 間距（4px 基礎單位）
- 圓角（card 8px / button 6px）
- 陰影（card / modal 三級）

---

## 圖層 / 符號規範

來源 SSOT：`../docs/10-point-data-pattern.md` 第 11 段「顏色與符號規範」。

點位符號（icon shape）必須跨主題統一：
- ⚫ 實心圓 = 一般點位
- 🔘 環形圓 = 重點點位
- ▲ 三角 = 風險警示
- ⬛ 方形 = 行政設施
- ◆ 菱形 = 緊急設施
- 🏥 lucide-react icon = 特定主題

---

## Review checklist

設計師交稿後，工程跑這個 checklist 才接受：

- [ ] 對照 `docs/10-point-data-pattern.md` 第 14 段 self-check 5 題全 ✅
- [ ] 桌機最小寬度 1280px
- [ ] 手機斷點 ≤ 480px 有單獨設計
- [ ] 暗色模式版本（可選但建議預留）
- [ ] 所有元件命名對應 `docs/06-components-library.md`
- [ ] 顏色用 design tokens 不用隨意 hex

---

## 不要做的事

- ❌ 直接傳 PSD / Sketch 原檔（請輸出 PNG 或 Figma link）
- ❌ 不同主題用不同 layout 結構（layout 共用、只變色 + 內容）
- ❌ 加入規劃外的元件（先溝通再加）
- ❌ 3D 視覺 / 視差動畫 / confetti
