# Batch 2 — SSOT / manifest 對齊稽核修復（2026-05-30）

> 來源：`.claude/AUDIT_MASTER_PLAN.md` Batch 2（SSOT/manifest (c)）+ 三份 `audit_*.md`。
> 原則：每項先 grep/查 DB 驗現況再改；遵循 CLAUDE.md 4 鐵則（尤其鐵則 2 SSOT）。
> 驗證：`pnpm typecheck` 通過 + agent-browser 連江/maritime 抽驗（3 項全 PASS）。

---

## 逐項結果

### W-4 ⚠️ 水庫總數 37/34/32 三套不一 — ✅ 修復
- **DB 查證**（`get_reservoir_status_latest`）：全部 **37 筆**主要水庫、37 筆有 lat/lng、僅 **34 筆**有 `storage_ratio_pct`（3 座無即時水情：鹿寮溪/尖山埤/谷關）。region 欄含「臺灣南區」「澎湖地區」變體。
- **三數解碼**：
  - **37** = 主要水庫總數（`reservoirs.length`）→ S1 KPI「主要水庫」/ ViewAWater hero「全國水庫 X 座」/ S2「全國 X 座中」**三處本就一致權威**。
  - **34** = 有即時蓄水率者（PointProfile `valid.length`，依蓄水率分桶/散布）。
  - **32** = region 聚合 **bug**：`normalizeReservoirRegion` 未收「臺灣南區→south」「澎湖地區→island」→ 2 座 fall through 成 null 被丟（34−2=32）。
- **改檔**：
  - `lib/queries/water.ts`：`REGION_NORMALIZE` 補臺灣南/北/中/東區、澎湖/澎湖地區、金門/馬祖/連江等 island 變體 → region 聚合回 **34**（= PointProfile total，消除 32 orphan）。
  - `components/point-profile/PointProfile.tsx`：算 `allCount`(37)/`missingData`(3)，subtitle 加「共 37 座主要水庫，34 座有即時水情（3 座當期無水情快照）」→ 明確標清 37 vs 34 口徑差異（鐵則 2）。
- **驗證**：typecheck 通過；region 變體映射數學自洽（北9+中6+南14+島5=34）。

### F-4 🔴 連江「圈外5.5%」vs「無圈外村里」同畫面矛盾 — ✅ 修復
- **DB 查證**（`fire_service_coverage_by_county` 連江 Z）：total_villages **156** / uncovered_villages **74** / uncovered_pop **764** / uncovered_pop_pct **5.48%**。`fire_uncovered_villages_top` 是**全國 Top 100**（連江村里人口太小未上榜）。
- **真因**：兩數**同源同口徑**（皆 service_coverage_by_county 的 3km buffer），連江**確實有 74 個圈外村里**；村里表空只因 Top-100 截斷 → 舊空狀態謊稱「全村里在 3km 內」是**假陳述**，與 5.5% 圈外自相矛盾。
- **改檔**：`components/views/ViewBFire.tsx`（+ import `ServiceCoverageRow`）
  - 傳 `coverageRow` 進 `ServiceTab`，取真實 `uncovered_pop`(764)/`uncovered_pop_pct`(5.5%)/`uncovered_villages`(74)/`total_villages`(156)。
  - KPI 重標：「5min 圈外人口」→「**3km 圈外人口**」(764/5.5%)、新增「**3km 圈外村里**」(74 里/共156)；分隊數 delta「3km buffer = 5min」→「服務圈 = 3km · ≈5 分鐘車程」。
  - buffer 圖例圈外列「距最近分隊 **> 6 km**」→ 修正為「**> 3 km**」(與 MV 口徑一致) + 顯「764 人 · 74 村里」。
  - 加口徑註：圈外總量來自 service_coverage_by_county、明細來自 uncovered_villages_top(全國 Top100)。
  - 空狀態三態化：`uncovered_villages>0` → 真實「本縣有 74 個 3km 圈外村里…未進全國 Top100 明細」；`=0` → 才顯「全村里在 3km 內」。
- **驗證**：agent-browser 連江服務圈 tab 確認 3 KPI + buffer >3km + 明細真實 74 村里、無假陳述。

### M-3 ⚠️ maritime manifest 過時 3 處 — ✅ 修復（純 themes/maritime.yaml）
- **DB 查證**（`maritime.ports`）：總 **277** 筆；`port_class_group`：漁港239/渡輪觀光18/國際商港7/國內商港7/null6。`port_class` 細分：國際商港7+國內商港4+客運港3 = 商港 14。fishery_rights 19 / lighthouse 36（Batch1 已接通前端，後端表存在）。
- **改檔**：`themes/maritime.yaml`
  - 商港 `coverage_note`：「國際 7 + 國內 4 = 11」→「國際商港 7 + 國內商港 7 = **14**（port_class_group 口徑，與前端一致；國內商港 7 = 細分類國內商港 4 + 客運港 3）」。
  - data_sources `maritime.ports` note：「線上 ports 表僅 73 筆 TDX 子集，Sprint 0 全量同步 277 筆」→「**已完成 277 筆全量同步**（含 port_class/port_class_group/county）；商港 14、漁港 239、渡輪觀光 18」。
  - fishery_rights「19 筆已上線」/ lighthouse「36 座已上線」**確認屬實**（Batch1 M-1 接通 + DB 表存在）→ 無需改，KPI 亦無殘留 placeholder。
- **驗證**：agent-browser maritime ViewA S1「商港 14（國際7+國內7）」no regression。

### H-3 🔴 home-basics 縣市總人口 mock vs 真實鄉鎮加總矛盾 — ✅ 修復
- **DB 查證**（`township_rank` 連江 Z）：4 鄉鎮 南竿7,629+北竿2,930+莒光1,537+東引1,525 = **13,621**（2025-12）、戶數加總 **4,063**。舊 `pop_2024_wan×10000` = 13,000 → 差 621。`TownshipRankRow` 含 `population`+`households`，VIEW 含全部 368 鄉鎮（無 limit）→ `ranksByCountyId[id]` 為該縣全鄉鎮。
- **改檔**：
  - `lib/county-stats.ts`：`deriveHomeStats` 加第 3 參數 `real?: { popTotal?, households? }`；real 在手時 popTotal/households 改用真實鄉鎮加總（男女/年齡仍按 mock 比例「按真實總量重新分配」、戶量改 popTotal/households 真實）；`HomeCountyStats` 加 `popIsReal`/`householdsIsReal` flag。
  - `components/views/ViewBHomeBasics.tsx`：townRanks 上移，算 `realPopTotal`/`realHouseholds` 傳入 deriveHomeStats。Hero 人口 tile + H3 大數字 + 密度 + 戶數全部對齊真實鄉鎮加總（連江 13,621/4,063）。H3 badge：真實時「2025-12 鄉鎮加總」**static tone**（非綠 LIVE pulse，守 LIVE 嚴守）/ fallback「2024 推估」placeholder；男女拆分標「按性比例推估」；戶數標「2025-12 戶政司鄉鎮加總」；底部 disclaimer 改「人口/戶數=鄉鎮加總(真實) · 年齡/性別/老化/動態仍推估」。
- **驗證**：agent-browser 連江 home-basics ViewB — Hero/H3 總人口=13,621、與 H1 鄉鎮 drill 加總一致、badge「2025-12 鄉鎮加總」無 LIVE pulse、戶數 4,063、男女標推估。

---

## 收尾
- `pnpm typecheck` ✅ 通過（無 error）。
- agent-browser 抽驗（session batch2，localhost:5173）：**3 項全 PASS**（home-basics 連江 13,621 對齊 / fire 服務圈 3km 口徑 + 真實 74 村里 / maritime 商港 14）。地圖區 headless WebGL ErrorBoundary（已知限制非 bug），驗證點皆取自右側 dashboard pane DOM。

## commit
- 一個 atomic commit，僅 `git add` **6 個明確路徑**（未 `-A`；排除先前 session 遺留的 `.claude/AUDIT_MASTER_PLAN.md`、`spawn-orchestration-lessons.md` 與 untracked）：
  - `frontend/src/lib/queries/water.ts`
  - `frontend/src/components/point-profile/PointProfile.tsx`
  - `frontend/src/components/views/ViewBFire.tsx`
  - `themes/maritime.yaml`
  - `frontend/src/lib/county-stats.ts`
  - `frontend/src/components/views/ViewBHomeBasics.tsx`
- message：`fix(audit-batch2): SSOT/manifest 對齊(水庫總數/圈外口徑/商港數/縣市人口)`
- hash：**1d5381c**（6 files changed, +134 −44）。
- **未 push**。

## 卡住/跳過
- 無 🔴 卡關項；4 項（W-4/F-4/M-3/H-3）全完成。
- 備註：F-4 原 audit 假設兩數為「5min 車程 vs 3km 直線」不同口徑；DB 查證實為**同源 3km buffer**，村里表空是全國 Top-100 截斷所致 → 採「修正假空狀態 + 顯真實 74 村里」比單純改文案更徹底。

=== DONE batch2 ===
