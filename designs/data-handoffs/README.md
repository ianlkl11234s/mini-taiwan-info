# Data Handoffs · 資料規格書（給設計師）

> **方向**：工程 → 設計師。每個主題一份，告訴設計師「有哪些資料、數值範圍多少、可以怎麼設計」。
> **SSOT**：原檔在 `taipei-gis-analytics/docs/topic-research/{topic}/mini-taiwan-info_handoff.md`，這裡是副本。

---

## 文件清單

| 主題 | 檔案 | 狀態 | 涵蓋內容 |
|------|------|------|---------|
| 醫療 | [medical.md](medical.md) | ✅ 完成 | 4 Tab 系統 + 22 縣市實際數據 + 互動邏輯 + 色階建議 |
| 飛航 | [aviation.md](aviation.md) | ✅ 完成 | 3 Tab（營運/航線/空域）+ 機場實際數據 + 70 年趨勢 |
| 農業 | [agriculture.md](agriculture.md) | ✅ 完成 | 農業主題資料規格 |
| 水資源 | 待建 | — | 參考 `designs/v04-water-county-design-brief-2026-05-16/` |
| 消防 | 待建 | — | 參考 `designs/v03-fire-design-brief-2026-05-15/` |
| 垃圾清運 | 待建 | — | taipei-gis-analytics 已有完整 Phase 1-11 資料 |

---

## 每份 Handoff 應包含

1. **系統分區**（Tab 劃分）— 設計師知道有幾個切換頁
2. **全國一覽數據表**（22 縣市實際值）— 設計師校正 Y 軸 / 色階 / 排版
3. **數值範圍速查**（最大/最小/中位數）— 避免色階壓縮或溢出
4. **縣市詳情互動**（點入後看什麼）— 卡片/圖表/地圖/表格
5. **跨 Tab 交互**（crosslink 規則）— 何時顯示關聯提示
6. **與其他分頁關聯**— 跨主題聯動邏輯
7. **資料檔案對照表**— 工程接通時的路徑參考

---

## 同步規則

- 原檔更新後，需手動複製到這裡（或未來做 symlink）
- 設計師的回饋 / 問題記在各 handoff 末尾「設計師反饋」區塊
