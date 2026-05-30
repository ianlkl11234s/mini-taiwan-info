# RUN 2026-05-30 · S12 carryover（待下批執行）

> 一句話目標：把 S12 稽核/資料真實化後仍掛著的項目排成下一批。
> 執行模式：待 user 拍板 ｜ 並行上限：2-3 ｜ commit：每項驗證過 atomic、不 push

## 清單

| # | 項目 | 執行方式 | 狀態 | 結果(commit/board/🔴原因) |
|---|---|---|---|---|
| 1 | rail/maritime 22 縣市著色目視確認（X-1） | 盤點(真實瀏覽器) | ⏸ 等 user | headless 測不到，需 gis-up + 硬刷新切 rail/maritime 目視 |
| 2 | socioeconomic 第 7 主題（從零建：資料+後端+前端） | spawn-ETL + 純前端 | ⬜ | 大工程，先盤點→搜集→建表→接前端 |
| 3 | 縣市別年度出生死亡（彙總村里 12 月月報成年度） | spawn-ETL | ⬜ | 無現成來源；現前端標「12 月單月」 |
| 4 | 老化指數歷年口徑統一（村里平均→全國彙總） | spawn-ETL | ⬜ | 需歷年 age-band；trend 113→114 斷崖 |
| 5 | fire 11953 起火原因 / severity normalizer 雙重計算排查 | spawn-ETL | ⬜ | 疑同 etl_fire 起火處所 bug |
| 6 | rail 台鐵 2024 月度運量 | spawn-ETL | ⬜ | collector 2026-Q2 後穩；現 missing-data-card |
| 7 | about 截圖優化（Flight Arc 壓 WebP / Pulse URL / 補圖） | 純前端 | ⬜ | |
| 8 | water 地方級資料（漏水/工業/雨水/滯洪容量） | 盤點 + spawn-ETL | ⬜ | 部分無公開源 → topic-research |
| 9 | S1Incidents「下載 CSV」鈕移除（若要） | 純前端 | ⬜ | |
| 10 | 清理 repo-root public/ 殘留 + .claude/guidelines/read.md 空檔 | 雜項 | ⬜ | rm（需 user 或授權）|

## 排序建議
盤點(#1)→ 純前端(#7,#9)→ ETL 序列(#5,#6,#3,#4)→ 大主題(#2 socioeconomic)→ 雜項(#10)。
#2 socioeconomic 是獨立大工程，建議單獨開一個 run。

## 收尾
- [ ] 摘要寫進 ../WAVE_REPORT.md
- [ ] 需長期記的進 ../memory/（STATUS / BACKLOG）
