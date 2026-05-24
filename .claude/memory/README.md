# .claude/memory/

Mini Taiwan Info 專案記憶系統。Session 開頭讀這裡，結束時透過 `/wrap-up` 更新。

## 檔案總覽

| 檔案 | 用途 | 更新時機 |
|---|---|---|
| [STATUS.md](STATUS.md) | 當下 session 結束時的快照、下個 session 接什麼 | 每次 `/wrap-up` rewrite |
| [BACKLOG.md](BACKLOG.md) | 待辦清單（P0/P1/P2/P3） | 新 idea / 完成項目 |
| [CROSS_REPO.md](CROSS_REPO.md) | GIS 三部曲跨 repo 同步矩陣 | 跨 repo 變動時 |
| [PRINCIPLES.md](PRINCIPLES.md) | 不用再溝通的預設 / 架構決策 | 新共識產生時 |
| [PLAYBOOKS.md](PLAYBOOKS.md) | 固定流程 SOP（做過 ≥2 次才寫） | 流程定型時 |
| [GLOSSARY.md](GLOSSARY.md) | 術語與代碼對照 | 遇到新術語時 |
| [INCIDENTS.md](INCIDENTS.md) | 至少造成一次 rework 的踩坑（append-only） | 遇到問題並解決後 |
| [REFLECTIONS.md](REFLECTIONS.md) | Session 反省（append-only） | 每次 `/wrap-up` |

## Session 開頭 SOP（給未來的 Claude）

1. 讀 `STATUS.md` → 知道現況、上次結束點
2. 掃 `BACKLOG.md` → 知道待辦優先級
3. 查 `PRINCIPLES.md` → 避免重開溝通已定案的事
4. 必要時查 `CROSS_REPO` / `PLAYBOOKS` / `GLOSSARY` / `INCIDENTS`
5. user-facing 進度看 root `_STATUS.md`（Phase 0a~0d）
6. 規劃 SSOT 看 `docs/00-10*.md`
7. 主題詳規看 `docs/themes/*.md` + `themes/*.yaml`

## Session 結束 SOP

使用者喊 `/wrap-up` 時觸發同名 skill，詳見 `../skills/wrap-up/SKILL.md`：

1. Gather：讀本 session 對話 + git log + 現有 memory
2. Analyze：分類事件到對應檔（含跨 3 repo / manifest 變動 / 全域同步三條客製規則）
3. Draft：產 diff 給用戶 review
4. Confirm：等用戶 OK
5. Atomic Commit：每檔獨立 commit，prefix `memory:`

## 記憶腐化檢查

- `INCIDENTS` / `REFLECTIONS` 只 append，不刪除
- `STATUS` 每次重寫，只保留當下狀態
- `PRINCIPLES` 衝突時：新原則覆蓋舊，舊的搬去 `INCIDENTS` 記錄演進
- `/wrap-up` 跑完第 10 次後，回頭掃 `PLAYBOOKS` 是否過期

## 分層

| 層級 | 位置 | 性質 | 每次 session 自動載入？ |
|---|---|---|---|
| 全域 / 偏好 | `~/.claude/projects/.../memory/` | 跨 session 偏好 + 跨專案事實 + **指向本層的薄索引** | ✅ 開場進 context |
| 規則 | `mini-taiwan-info/CLAUDE.md` | 不變規則（架構、技術棧、技術選擇） | ✅ |
| **狀態** ⭐ | `mini-taiwan-info/.claude/memory/`（本資料夾） | **變動狀態 + 決策 + 踩坑 + 反省 + backlog** | ❌ skill / 主動讀才進 |
| user-facing | `mini-taiwan-info/_STATUS.md` | Phase 進度 + Decision Log + Backlog (給 user 看的版本) | ❌ |
| 規劃 SSOT | `mini-taiwan-info/docs/00-10*.md` | 設計階段規劃文件 | ❌ |
| 主題 SSOT | `mini-taiwan-info/themes/*.yaml` | 主題 manifest | ❌ |
| 縣市 SSOT | `mini-taiwan-info/data/counties.yaml` | 22 縣市對照 | ❌ |
| 長文 | `mini-taiwan-info/.claude/pitfalls/` | 事件 long-form archive | ❌ |

## 什麼寫哪（路由表）⭐ 避免「兩份真相」

兩套記憶分工的關鍵：**自動載入的（harness 全域）保持薄；深的知識放 git 版本控制的本層。**

| 你想記的東西 | 寫進 | 理由 |
|---|---|---|
| 不變規則（語言、Python3、build、目錄、技術選擇） | `CLAUDE.md` | 永遠載入、極少改 |
| 專案決策 / 不用再溝通的預設（配色 SSOT、LIVE 用詞、響應式斷點） | `PRINCIPLES.md` | 團隊共享、進 git、有演進史 |
| 踩過的坑（≥1 次 rework 或靜默錯誤） | `INCIDENTS.md` | append-only、不刪、保留學習軌跡 |
| Session 反省 / 下次規則 | `REFLECTIONS.md` | append-only |
| 固定 SOP（做過 ≥2 次） | `PLAYBOOKS.md` | 定型才寫 |
| 跨 session 要自動記得的「**怎麼跟這個 user 協作 / 偏好**」 | harness 全域（薄、一檔一事 + `MEMORY.md` 索引） | 每次開場進 context |
| 深度知識（踩坑全文、決策細節） | 本層 `.claude/memory/`，harness 只放**指路牌**指過來 | 不重複、單一真相 |

**反模式**：把同一件事同時寫進 harness 全域 + `.claude/memory/`（= 兩份真相，會 drift）。harness 那邊遇到深的東西只寫一句 + 「詳見 `.claude/memory/INCIDENTS.md 某條`」。

完整說明見 [../FRAMEWORK.md](../FRAMEWORK.md)
