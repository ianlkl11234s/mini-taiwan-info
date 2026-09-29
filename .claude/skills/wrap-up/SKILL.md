---
name: wrap-up
description: 在使用者明確要求 session 收尾、接手摘要或記憶更新時，整理本次範圍的可審查摘要與必要 memory 變更。
user_invocable: true
---

# /wrap-up — mini-taiwan-info 收尾

## 範圍

只處理本 session 有證據的工作：本次改動、已執行的驗證、已知失敗、需要接手的事項，以及因此需要更新的 `.claude/memory/` 檔案。一般「做完了」不會自動啟動跨 repo 稽核、hook 改造、permission 調整或 commit。

## 流程

1. 讀本 session 脈絡、`git status`、相關 git log 與必要的 memory 檔。只讀與本次事件有關的記憶；不以其他 session 的 dirty state 推斷本次工作。
2. 將有來源的結果分類到 STATUS、BACKLOG、PRINCIPLES、INCIDENTS、REFLECTIONS 或 CROSS_REPO。`INCIDENTS`、`REFLECTIONS` 只 append；數字先以可重現的指令或來源驗證。跨 repo 只記本次已證實的契約變動。
3. 提供簡短的可 review 總表：檔案、動作與原因。manifest、`data/counties.yaml`、`docs/04-*` 或前端契約變動時，跑 `cd frontend && pnpm typecheck`，或引用可核對的同版本結果。
4. 只有尚未獲授權的 memory 寫入、commit 或外部動作，才在目前可用的使用者輸入工具中請求確認。相同 task 已有的授權沿用；push、部署與跨 repo 寫入仍需各自的授權。
5. 已授權 commit 時，以可回復的 staged hunk 建立清楚的 commit；不處理其他 session 的 dirty 檔案，也不自行 push。

## 按需診斷

只有使用者要求、實際觀察到 hook 問題，或本次改動了 hook／設定時，才檢查相關設定、腳本與可觀察結果。設定檔存在不等於 hook 已觸發；沒有同版本結果時，補跑本次必要的 typecheck 或其他驗證。skill 使用率、permission allow-list、完整 memory 健康度與新模式萃取是獨立診斷工作，必須明確納入範圍後才執行。

## 保留的資料語意

跨 repo 事實要保留來源、期別、coverage 與資料狀態；缺資料、過期或錯誤不得在摘要中寫成 0、正常或已部署。視覺變更只有在本次確有 layout／互動改動時才做瀏覽器驗證，並分開記錄本地、runtime、browser 與發布證據。
