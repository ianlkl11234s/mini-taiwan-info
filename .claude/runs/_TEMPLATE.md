# RUN <YYYY-MM-DD> · <主題/目標>

> 一句話目標：<這批要達成什麼>
> 執行模式：<自動跨項/每項確認> ｜ 並行上限：<N> ｜ commit：<每項/每批/不commit>

## 清單

| # | 項目 | 執行方式 | 狀態 | 結果(commit/board/🔴原因) |
|---|---|---|---|---|
| 1 | <要做的事> | 純前端 / spawn-ETL / SSOT / 響應式 / 盤點 | ⬜ | |
| 2 | | | ⬜ | |
| 3 | | | ⬜ | |

執行方式分類（決定誰來做）：
- **純前端**：主 agent 直接改 or spawn mini cwd session（query/hook/view/CSS）
- **spawn-ETL**：spawn taipei-gis-analytics session（搜集/建表/migration，序列化避免撞號）
- **SSOT**：對齊重複指標/口徑/manifest
- **盤點**：read-only 調查（Explore agent 或 spawn recon session）

## 排序原則（大批量時）
1. 盤點/驗證先（確認哪些是真缺、哪些只是文件 stale）
2. 純前端 + SSOT（CP 高、無後端依賴）
3. spawn-ETL（序列跑，預分配 migration 編號）
4. 響應式 / 視覺 polish（最後，需真實瀏覽器複驗的標註）

## 收尾
- [ ] 每項過 typecheck（前端）/ REST 200（資料）
- [ ] 摘要寫進 ../WAVE_REPORT.md
- [ ] 需長期記的進 ../memory/
- [ ] commit（依模式）；push 等 user 拍板
