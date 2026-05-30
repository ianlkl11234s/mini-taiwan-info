# Batch 3b — 前端接上 Batch3 後端根治（4 項）

> 執行：2026-05-30 · 純前端（無 migration）· 接 `.claude/board/batch3.md` 的「前端該怎麼接」
> 原則：每項先 anon REST 實測後端 live → 再改前端 → typecheck → agent-browser 抽驗（含窄寬度）。
> dev server 用自己的 port 5180（gis-up 6003 未碰）。未 push。

---

## ✅ F-1 火災月度/時段加 year filter（否則仍顯三年累計）

**後端 live 驗證**（anon REST）：`public.fire_incidents_by_hour_month` 已含 `data_year_minguo`。
台北A 113 加總 = **1,137**（276 列）；不加 year filter = 3,957（832 列，三年）。

**前端改**：
- `lib/queries/fire.ts`：`IncidentsByHourMonthRow` 加 `data_year_minguo: number`；
  `fetchIncidentsByHourMonth(yearMinguo = 113)` select 加該欄 + `.eq('data_year_minguo', yearMinguo)`。
- `hooks/useFireData.ts`：slot #4 改 `() => fetchIncidentsByHourMonth(113)`，cache key `fire:incidents_by_hour_month:113`（一併 cache-bust）。
- 下游 `deriveMonthlyTotals / deriveHourlyTotals / deriveDaypart` 全部吃同一單年陣列 → **自動單年**，無需逐一改 view（S1Incidents / FireKpiExplode）。
- `deriveMonthlyTotals` 註解更新（不再是 across years）。

**UI 抽驗**（fire view A）：時段 SPLIT 全國加總 = **15,384**（=KPI 單年），非舊 48,626（三年）。
年度長條 mode 仍正確並列 民111=15,848/112=17,394/113=15,384（來自 countyYear，本就非 hourMonth，未受影響）；
section header「48,626 件 · 民111-113」為三年總量、已標清期別，非 bug。

---

## ✅ F-2 消防栓改 per-county（後端去重，台北 21,848 非 43,724）

**後端 live 驗證**（anon REST count）：`fire_hydrants` 台北A=**21,848** / 高雄E=**39,392** / 新北F=**8,572** / 屏東T=**3**；全台和=69,815（已去 datagov:128639 台北重複，原 91,691）。

**前端改**（核心：移除 `hydrantNationalCount`「全台 SUM 當高雄」假設）：
- `lib/queries/fire.ts`：
  - 新增 `HYDRANT_COVERAGE`（A=full / E=full / F=partial / T=sparse）+ `HydrantCoverage` 型別。
  - `FireHydrantCountRow` 加 `coverage`。
  - 重寫 `fetchFireHydrantCountsByCounty()`：改用 **per-county HEAD count（4 個輕量 count 請求）**，不再下載全部點位（原 limit 100000）。
  - `fetchFireHydrantNationalCount` 保留但加註「全台和、勿當單一縣市」（已無 caller）。
- `hooks/useFireData.ts`：`FireDataState.hydrantNationalCount` → `hydrantCounts: FireHydrantCountRow[]`；slot #8 改 `fetchFireHydrantCountsByCounty`（cache key `:v2`）。
- `App.tsx`：choropleth `hydrant_density_per_km2` 改 per-county（排除 sparse 屏東不著色）；legend 點層 label「消防栓（限高雄）」→「消防栓（部分縣市）」、count 改全涵蓋和。
- `S2Response.tsx`：消防栓表改 per-county（台北/高雄完整、新北部分、屏東零星·視為無資料）；top KPI 改「N 縣市（per-county）」不顯全台和；tagline/insight/header 文案全部去「僅高雄」。
- `ViewBFire.tsx`：radar 全國平均 hydrantDensity 改用「有涵蓋縣市密度平均」（原用 hydrantNationalCount/高雄面積）；移除無用 `khh`；ResponseTab 「僅高雄完整接通(39,395)」stale 文案改 per-county。
  （ResponseTab 縣市消防栓 KPI 本就走 `useFireCountyData` per-county HEAD count，已正確，不動。）

**UI 抽驗**：表格台北 21,848(✓完整)/高雄 39,392(✓完整)/新北 8,572(△部分)/屏東 3(零星·視為無資料)，無 91,691、無全台和當單一縣市。

---

## ✅ W-3 滯洪池容量 NULL→「—（容量待補）」（缺值非真 0）

**後端 live 驗證**（anon REST）：`detention_basins.designed_volume_m3` 在 taipei(17座)/tainan(45)/taoyuan(11)/taichung(1) **全 NULL**；central_park/hsinchu_park/kaohsiung/south_park 有值。

**前端改**：
- `lib/queries/water-overview.ts` `fetchDetentionSummary`：accumulator 加 `hasVol`，**只 sum 非 NULL**；某縣市全 NULL → `total_vol_m3 = null`（原 `vol += Number(?? 0)` 把 NULL 當 0）。`total_volume_m3` 國家總和行為不變（NULL 本就加 0）。
- `components/views/ViewB.tsx` DETENTION KPICard「設計總容量」：null → value「—」、unit 清空、trend 標「容量待補 / 來源缺設計容量欄（缺值非 0）」；座數照常（台北 17 座）。

**UI 抽驗**（water view B 台北「防洪」tab）：滯洪池 **17 座**；設計總容量 **「—」+「容量待補」**，非 0.0 萬 m³。

---

## ✅ D-1 人口出生死亡跟進（後端 national_population_trend 修正且到民114）

**後端 live 驗證**（anon REST spatial）：民114 出生 107,812/死亡 200,268/自然增加 **-92,456**/老化 174.25；民113 出生 134,856/死亡 202,107/自然 -67,251/老化 270.91。

**前端改**：
- `lib/queries/demographics.ts`：
  - `deriveNationalSummary`：vitals（出生/死亡/自然增加）改取 **trend 可得最新年（114）**，原寫死 `LATEST_YEAR_MINGUO=113` → 會與下方 vitalsTrend 末點（V.at(-1).year=2025）label mismatch（顯 2025 但值是民113）。
  - `deriveAgingHistory`：**只取 ≤113（村里未加權平均口徑）**，排除民114（全國彙總口徑 174.25），避免 113→114 視覺斷崖混口徑（鐵則2）。
- `components/views/ViewADemographics.tsx`：老化歷年線下加註「村里平均口徑(104-113)；民114 全國彙總口徑另顯金字塔，故未併入連線」；S3 縣市別自然增加 Top5 footer 加註「縣市值為村里 12 月單月口徑（非年度），全國值見上方為戶政司年度」。
- `components/views/ViewBDemographics.tsx`（縣市別 births/deaths 仍村里 12 月單月、量級不可信 → 鐵則1 明確標）：
  - 出生/死亡 KPI label 改「出生/死亡（12 月單月）」、baseline「非年度·量級待補」（原「2024 出生 / 戶政司年度」偽裝年度）。
  - 人口動態 subtitle、FLOW footnote、Hero hook 自然增加 全部標「村里 12 月單月（非年度）」；FLOW 註明自然(12月單月)與社會(10年近似)口徑不同、「淨增減」僅示意。

**UI 抽驗**（demographics view A）：自然增加 **-92,456**（敘述「約 -9 萬」）、出生 107,812、年份 2025；非舊 -4,949 / -67,251。
（未發現任何「口徑存疑」短期 badge 需移除。）

---

## 未動 / 已知後續
- **M-2(b)**：根源已清，`deriveTopCommPorts` 的 `startsWith("(")` 防衛保留為雙保險，無需改（同 batch3 結論）。
- **ViewB / ViewA 縣市別 births/deaths**：仍村里 12 月單月（縣市年度源不可得，須程式化彙總戶政司村里 12 個月月報，另開任務）— 已全數明確標口徑，不裸奔。
- **老化指數 header(計算值) vs 歷年線(村里平均)口徑差**：pre-existing，本輪只處理 113→114 斷崖，整序列統一全國彙總口徑待歷年 age-band 資料（同 batch3 D-1 建議）。

## 收尾
- `pnpm typecheck` ✅ 通過（PostToolUse hook + 手動各一次）。
- agent-browser 多寬度抽驗 ✅ 4 項數字正確 + 窄寬度(880)無爆版。
- atomic commit（只 add 10 個 frontend 檔 + 本檔，**未用 -A**）：`fix(audit-batch3b): 前端接上後端根治(火災單年/消防栓per-county/滯洪池NULL/人口出生死亡)`。
- **未 push**（依指示）。

=== DONE batch3b ===
</content>
</invoke>
