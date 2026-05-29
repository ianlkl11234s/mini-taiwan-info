# front_demographics · 進度板

## 2026-05-29 — 金字塔 / 村里數 / 鄉鎮排名接通真實 Supabase

### 做了什麼
1. **現況驗證**（不信文件/註解）：grep + REST 實測 demographics schema 三表（anon 200）：
   - `population_by_age_sex_county`：19 age_band（**0-14 為合計**，非 5 歲一組）、sex='男'/'女'、836 列 → 金字塔**早已接真實**（`fetchPopulationByAgeSex` + `deriveNationalPyramid` / `buildCountyPyramid`）。
   - `township_village_count`（VIEW，368 列）、`township_rank`（VIEW，368 列，含 county_id/county_rank/population/households，2024-12）→ **前端原本完全沒用**。
   - 原本狀態：村里數＝`county-stats.deriveHomeStats` 估算（townCount×21.05）；鄉鎮排名＝ViewBHomeBasics H1Admin 的 `PendingDataCard` + `COUNTY_TOWNSHIPS_MOCK` 鄉鎮名稱 mock（placeholder）。

2. **接線**：
   - `lib/queries/demographics.ts`：+ `fetchTownshipVillageCount` / `fetchTownshipRank` + 型別。
   - `hooks/useTownshipData.ts`（新）：並行拉兩 VIEW，按 id_moi 建 `villageCountByCountyId` / `townCountByCountyId` / `ranksByCountyId`（county_rank asc），TTL_LONG 快取。
   - `ViewBHomeBasics.tsx`：村里數改真實（去「估」、meta 改「真實 · 內政部村里數」）；H1Admin 鄉鎮排名改 `township_rank` ranking bars（top 16 + 「顯示前 16 / N 名」揭露），取代 PendingDataCard + mock 名稱清單；**鄰數無真實源 → 保留「估」**（改以真實村里數 ×18.69 推估，估得更準）。
   - `ViewA/ViewBDemographics.tsx`：金字塔 `isOld` 由固定 `idx >= 13`（假設 5 歲一組 0-4 起）改為**依 age_band 下界 ≥65 判定** — 修正真實資料（0-14 合計→合併後 65+ 落在 idx 11）下 65-74 段未上色 bug。

3. **移除 mock**：`mock-home.ts` 刪除已被取代的 `COUNTY_TOWNSHIPS_MOCK`（確認無其他引用）。

### 改了哪些檔
- `frontend/src/lib/queries/demographics.ts`（+61）
- `frontend/src/hooks/useTownshipData.ts`（新，+92）
- `frontend/src/components/views/ViewBHomeBasics.tsx`（村里數 + 鄉鎮排名）
- `frontend/src/components/views/ViewADemographics.tsx`（金字塔 isOld）
- `frontend/src/components/views/ViewBDemographics.tsx`（金字塔 isOld）
- `frontend/src/lib/mock-home.ts`（移除 COUNTY_TOWNSHIPS_MOCK）

### typecheck
✅ `pnpm typecheck` 綠燈（tsc --noEmit 無錯）

### 視覺驗證（dev server :5179 + agent-browser）
✅ KHH home-basics 縣市儀錶板：
- 村里 = **901 個 · 真實 · 內政部村里數**（chip + H1 cell 皆去「估」）
- 鄉鎮排名：真實 top 16 / 38（鳳山區 355,175 / 三民區 330,287 / 左營區 197,784 / 楠梓區 194,404 / 前鎮區 178,290 …），badge「真實 · 內政部戶政司」
- 鄰 = 16,840 個（估）· 標「無真實源 · 由村里數推估」

### commit
`17ffd76` feat(demographics): 接通金字塔/村里數/鄉鎮排名真實資料（未 push）

=== DONE front_demographics ===
