# 過夜執行報告 — mini-taiwan-info 上架前資料真實化

> 給早上醒來的 user。每個 Wave 做了什麼、commit 了什麼、卡在哪。
> 主 agent 過夜自動填。詳細計畫見 `SESSION_BOARD.md` / `tmp/evening_plan.md`。
> **policy**：fresh session per task → 自己 commit → 主 agent 關 session → 開下一個；每波不 push。

開始：2026-05-29 23:5x ｜ 結束：2026-05-30 ~02:xx ｜ **狀態：佇列 7/7 全完成，0 卡關**

---

# 🌅 整夜總結（先看這段）

## 每個 Wave 一句話
| Wave | session | 做了什麼 | 結果 |
|---|---|---|---|
| 0 | recon_demog | demographics 鄉鎮/村里 VIEW + 排名表（發現本來就 exposed）| ✅ |
| 1a | front_demographics | 接金字塔/村里數/鄉鎮排名 + 修金字塔上色 bug | ✅ |
| 1b | front_rail | 接各系統縣市別車次（取代 placeholder）| ✅ |
| 1c | front_ssot | 人口口徑標註(原 caption 標反)+老化指數 unit 修正 | ✅ |
| 2a | etl_fire | 修財損401+起火處所雙重計算bug+2全國view | ✅ |
| 2b | etl_maritime | 燈塔36/漁權19 上 Supabase + public wrapper | ✅ |
| 2c | etl_water | LPCD+接管率全國 RPC | ✅ |

## 全部 commit（未 push，待你 review）
- **mini-taiwan-info**：`06e552e`(workflow docs) `fd75e38`(cmux helper) `17ffd76`(front demographics) `bf4b73b`(front rail) `45f9198`(ssot)
- **gis-platform**：`295a546`(demographics) `7980ea3`(fire) `7d7d4a9`(maritime) `c8aeb41`(water)
- **taipei-gis-analytics**：`cfc5730`(demographics) `068655a`(fire) `27b7270`(maritime) `45f5c88`(water)

## 🔑 跨輪最大教訓（已寫進 spawn-orchestration-lessons.md）
- **「驗證 > 信文件」反覆應驗**：demographics「需 expose」是 stale（早 exposed）；fire「財損 mock」其實 infra 在只是 GRANT/雙重計算 bug；maritime「漁權燈塔表已存在」是稽核幻覺（其實本地有 geojson 沒上 DB）；water RPC 是 spec-only 前端沒呼叫。
- **三 repo 很髒** → 全程 `git add 明確路徑`，無 `add -A` 事故。
- **cmux 動態 tab 不可用**（send/new-surface 壞）→ 改 per-session 命名 workspace（限制已記錄）。

## ☀️ 早上待辦（ETL 只做了後端，前端接線留給你/下輪）
1. **fire 前端**：fire.yaml `yearly_damage_million`→`fire_damage_national_yearly.damage_yi`(2020=3.9億)；mock-fire.ts `FIRE_LOCATIONS_MOCK`→`fire_location_type_national_yearly`（⚠️無 fatalityRate、無獨立「山林」類）
2. **maritime 前端**：`public.lighthouse`(36)/`public.fishery_rights`(19)/`port_traffic_yearly` 接 KPI+圖層；附帶 `fishery_stats_by_county`(632) 也可接
3. **water 前端**：water.yaml lpcd/sewage KPI→2 RPC（取代 WATER_NATIONAL_MOCK；⚠️接管率52.8%是縣市平均非戶數加權，需標註）
4. **隱患排查**：fire 11953起火原因/severity normalizer 可能有同款雙重計算 bug，上線前比對
5. **cmux 清理**：手動 GUI 關掉過夜累積的 workspace（21-26，無 close cli）
6. **socioeconomic**：仍完全空，另開計畫（今晚未碰）
7. **push**：三 repo review 後統一 push

---

## ✅ Wave 0 — demographics 鄉鎮/村里資料（session recon_demog，已關閉）

**做了什麼**
- demographics schema：發現**本來就已 exposed**（全部文件記 406 是 stale，實測 anon REST 200），更正 4 處文件
- 新 `township_village_count` VIEW（368 鄉鎮 / 村里 7,975）— gis-platform mig 126
- 新 `population_by_township_monthly` 表 + `township_rank` VIEW（368 鄉鎮 2024-12，總人口 23,400,220）— mig 127 + analytics pipeline
- 修正資料源：ODRP005（有人口數）非 ODRP010（僅人口動態）

**commit**（未 push）
- gis-platform `295a546` feat(demographics): 村里數 VIEW + 人口排名表/VIEW（mig 126/127）
- analytics `cfc5730` feat(demographics): 鄉鎮人口排名 + 村里數 pipeline + catalog

**連帶發現（影響後續 wave）**
- ⚠️ maritime / rail / demographics **全部已 exposed**（data-inventory 證實）→ 後續「expose」工作多半不需要，先實測 REST 再說
- ⚠️ 稽核 Explore agent 多處幻覺（maritime 漁權/燈塔表「已存在」實為不存在）→ 建表類一律對 migrations 驗證
- 鄰數無全國機器可讀源 → 前端標「估計」，村里數用真實

**前端待接（Wave 3 我做）**：金字塔/村里數/鄉鎮排名 3 端點皆需 header `Accept-Profile: demographics`

---
## ✅ Wave 1a — 人口主題前端接通（session front_demographics，已關閉）

**做了什麼**
- 驗證發現：金字塔早已接真實；township 兩 VIEW 前端**完全沒用**（村里數是估算、鄉鎮排名是 PendingDataCard+mock 名稱）
- 接 `township_village_count` + `township_rank`：新 `hooks/useTownshipData.ts` + queries
- 基礎統計縣市儀錶板：村里數改真實（去「估」）、鄉鎮排名改真實 ranking bars（取代 mock）
- **修 bug**：金字塔 `isOld` 原假設 5 歲一組，真實資料 0-14 為合計組導致 65-74 段未上色 → 改依 age_band 下界判定
- 移除 `COUNTY_TOWNSHIPS_MOCK`
- 鄰數無真實源 → 保留「估」但改用真實村里數推估（更準）

**驗證**：typecheck ✅；agent-browser（KHH）村里=901 真實、鄉鎮排名 top16/38 真實（鳳山 355,175…）數字與 DB 對得上
**commit**（未 push）：mini `17ffd76` feat(demographics): 接通金字塔/村里數/鄉鎮排名真實資料

---
## ✅ Wave 1b — rail 縣市別車次前端接通（session front_rail，已關閉）

**做了什麼**
- 驗證：rail schema 已 exposed；station_daily_trips(528)+stations(535,含 county_id) → 概覽 tab「各系統縣市別車次」原為 PendingDataCard placeholder
- 新 `deriveCountySystemTrips`：縣市×系統 日均停靠車次橫條 breakdown，取代 placeholder
- 臺鐵 2024 月度仍缺（ETL Wave 2，未碰，RidershipTab 維持 missing-data-card 標註）

**驗證**：typecheck ✅；agent-browser 多寬度（TPE 捷運 44,464/96%、KHH 20,370 加總與 ground-truth 完全吻合）；發現右側數字切邊是**既有 page-level min-width overflow**（非本次造成）
**commit**（未 push）：mini `bf4b73b` feat(rail): 接通各系統縣市別車次真實資料

---
## ✅ Wave 1c — SSOT 三修（session front_ssot，已關閉）

**做了什麼**
- 人口主題全國總人口加口徑標註：**發現原 caption 標反了**（把現住人口誤標成戶籍）→ 修正為「現住人口·2024，與首頁戶籍口徑不同」
- 老化指數 unit：home-basics.yaml 誤標 `%`（老化指數是比值非百分比，可破100）→ 改 `""` 與 demographics.yaml 一致；crosslink text 同步。未刪 demographics 的 aging_index（是 default choropleth）
- maritime 漁業產值單位：驗證 ViewA/ViewB 轉換已一致（÷1e5 toFixed2），無需改

**驗證**：typecheck ✅；agent-browser（人口概覽口徑標註 + 嘉義縣老化指數 239.3 無 %）
**commit**（未 push）：mini `45f9198` fix(ssot): 人口口徑標註 + 老化指數 unit 一致 + maritime 產值單位（2 檔 +5-5）

---
**前端 3 任務全部完成（demographics/rail/ssot）。以下進入 ETL 階段（taipei-gis-analytics，較高風險）。**

---
## ✅ Wave 2a — fire 財損 + 起火處所（session etl_fire，已關閉）

**做了什麼**（發現 infra 早已存在 mig107/109+pipeline，真正缺口是 bug）
- 修 **anon GRANT 401 bug**：fire.casualty_property_by_county_year 漏 anon GRANT → 前端讀不到
- 修 **起火處所雙重計算 bug**：raw 同含年度總計列+月別列 → 修正後全國2022=15,811（官方15,890，差0.5%）
- 新增 2 全國年度 view（mig 128/129）：`fire_damage_national_yearly`、`fire_location_type_national_yearly`

**⚠️ 資料覆蓋限制**：財損只有 2020、起火處所只有 2022（datagov 只發最新單年快照，多年回填需手爬，本輪不做）
**驗證**：主 agent 獨立 anon REST 200（財損2020=3.9億 / 起火處所 其他40.6%住宅23.9%車輛21.6%）✅
**commit**（未 push）：gis-platform `7980ea3` + analytics `068655a`
**前端待接（早上/下輪）**：fire.yaml yearly_damage_million → fire_damage_national_yearly.damage_yi；mock-fire.ts FIRE_LOCATIONS_MOCK → fire_location_type_national_yearly（注意：無 fatalityRate、無獨立「山林」類）
**⚠️ 隱患**：11953起火原因/severity normalizer 可能有同款雙重計算 bug，上線前須比對

---
## ✅ Wave 2b — maritime 燈塔/漁權/港埠運量（session etl_maritime，已關閉）

**做了什麼**（本地成品早有，缺口只在沒上 Supabase）
- 燈塔：本地 geojson 36 點 → 建 `maritime.lighthouses`(mig130) + `public.lighthouse`(mig132 wrapper)
- 漁業權：本地 19 polygon → 建 `maritime.fishery_rights`(mig131) + `public.fishery_rights`(mig132)，county_id 19/19 對上
- 港埠運量：`maritime.port_traffic_yearly`(48筆) 後端早 ready，純前端接線問題
- **沒重蹈 fire 的 401**：table-level anon GRANT + NOTIFY pgrst reload 都做了

**驗證**：主 agent 獨立 REST 200（public.lighthouse=太平島/漁翁島燈塔；fishery_rights=中壢區漁會124km²/雲林97km²）✅
**commit**（未 push）：gis-platform `7d7d4a9` + analytics `27b7270`
**前端待接（早上/下輪）**：lighthouse_count→public.lighthouse(36)；fishery_rights→public.fishery_rights(19,SUM area_km2)；port_calls→maritime.port_traffic_yearly(帶 Accept-Profile)。**附帶**：fishery_stats_by_county(632筆)也早 ready 可一起接

---
## ✅ Wave 2c — water LPCD + 接管率 全國 RPC（session etl_water，已關閉）

**做了什麼**（底表 094/095 + pipeline 早在，缺全國彙整 RPC）
- 新 RPC `aggregate_national_lpcd`(mig133)：value 272.6 / 加權 289.1 / 16年 spark / delta 1.9
- 新 RPC `aggregate_national_sewage_coverage`(mig134)：value 52.8% / 單年 2024
- 發現：前端 yaml 宣告這兩 RPC 名但**實際用 .from(table) 直查**（RPC 是 spec-only），本輪依 spec 補齊供前端遷移

**⚠️ 限制**：接管率只有 2024（delta null、spark 長度1，待回填歷年）；52.8% 是**縣市算術平均非戶數加權**（前端 mock 寫 87% 是別的口徑，接線時須註明「縣市平均」）
**驗證**：主 agent 獨立 REST 200（LPCD 272.6/16年spark；接管率 52.8%）✅
**commit**（未 push）：gis-platform `c8aeb41` + analytics `45f5c88`
**前端待接（早上/下輪）**：water.yaml lpcd/sewage_coverage KPI → 兩 RPC（取代 mock-data.ts WATER_NATIONAL_MOCK isReal:false）

---
## ✅ Wave 3 — SEGIS 民國114(2025) 人口更新（session etl_demog_114，已 /exit）

**做了什麼**（user 從 SEGIS 下載 3 份 114年12月資料 → 更新三表到 2025）
- `population_by_age_sex_county` → 加 **stat_year=2025（21 完整 5 歲組）**，2024 仍 19 組並存（mig135 放寬 CHECK）
- `population_by_township_monthly` → 加 **2025-12**（township_rank VIEW 自動切最新：板橋 549,762）
- **新表** `county_indicators_yearly`（mig136）→ 2025 逐縣市 老化/扶養/密度/性比/戶量（嘉義縣 Q 老化291.69）
- 2025 全國總人口 23,299,132（兩源吻合）；無 401（GRANT/RLS/NOTIFY 都做）

**驗證**：主 agent 獨立 REST 200（2024=19組/2025=21組、鄉鎮2025-12、新表2025）✅
**commit**（未 push）：gis-platform `536821c` + analytics `bb8e05f`
**⚠️ 前端必看**：金字塔 age_band **混粒度**（2024=19組含0-14合計 / 2025=21組細）→ 前端要 **依 stat_year 篩選後再畫**，預設 2025(21組)，別寫死 0-14 band
**前端待接**：人口分頁顯示 2025 + 標期別（下個任務）

---
## ✅ Wave 4a — 人口分頁接通 2025 + 標期別（session front_demog114，已 /exit 保留分頁）

**做了什麼**（gis_work 單 space 模型首發）
- 接 2025：金字塔(21組,「2025年度」)、鄉鎮排名(2025-12)、新表 county_indicators_yearly(台北老化202.1 官方值)
- **修嚴重 bug**：原 `fetchPopulationByAgeSex` 抓全部年份跨年加總 → **全國人口翻倍(~46M)** → 加 statYear 篩選修正 = 23,299,132
- 混粒度：不寫死 band/組數，依各年實際 age_band 動態 bucket（2024=19組/2025=21組皆可畫）
- 期別標註齊全；遵守 LIVE 規則（年度資料 badge 改 historical）

**驗證**：typecheck ✅；agent-browser 9 項全過（全國 23,299,132 不翻倍、金字塔21組2025、台北老化202.1、窄寬無爆版）
**commit**（未 push）：mini `1785bfa`（6 檔 +176/-65）
**機制驗證**：首次用 gis_work 單 space new-window 模型 + `/exit` → 記憶體釋放、**分頁畫面保留**（還可 `claude --resume`）
**備註**：基礎統計(首頁)主題台北人口章節仍月度 MOCK 口徑（與人口主題年度口徑不同，刻意未動）

---
## ✅ Wave 4b — rail 班次與車種 4 bug 修復（session front_rail_fix，已 /exit，與 4a 平行跑）

**user 回報的 4 bug 全修**
- 24hr 分布：原線性縮放 → 改 systemFilter **重算**（證明非縮放：高鐵尖峰103≠縮放預測113）
- 車種組成：單一非台鐵系統 → 顯示該系統 **100% 單條**（台鐵維持多車種細分）
- TOP10：加 systemFilter → 選高鐵全 THSR、不再出貓纜站
- 貓纜 962 假資料：**排除**（是全國 TOP1-4 會擠掉真站）；**多抓潛在 bug**：舊邏輯用站名 match「動物園」誤標到真實文湖線 BR01 → 改 line_id=='MK' 精準辨識

**驗證**：typecheck ✅；agent-browser 全部/台鐵/高鐵/捷運 四分類實測（24hr 形狀各異、高鐵車種100%、TOP10 per-system）
**commit**（未 push）：mini `0a06b33`（3 檔 +81/-36）
**⚠️ 後端 follow-up**：貓纜 962 根治在後端（analytics 07_derive_station_daily_trips.py 加 `if MK line: continue`，或加 transport_type='gondola' 欄）——本輪只前端止血，根治待後續 ETL session

---
**gis_work 平行雙任務(4a人口2025 + 4b rail修)皆完成並 /exit，分頁畫面保留可回顧。**

---
## ✅ Wave 4c — 貓纜班次污染後端根治（session etl_cable_fix，已 /exit）

**做了什麼**（rail bug 4 的後端根治，前端止血升級為根治）
- `07_derive_station_daily_trips.py` 加 `if trtc & MK線: continue` → 貓纜移出 station_daily_trips（528→524 列）
- **關鍵**：明確 DELETE Supabase 既有 4 筆 MK stale rows（rowcount=4，UPSERT 不會刪）
- migration 137（冪等 DELETE）+ catalog/registry/inventory 同步 528→524
- rail.stations 保留 139 站含 MK（實體車站存在，僅班次不計索道）

**驗證**：主 agent 獨立 REST（line_id=MK → 0 筆；全國 TOP1 = 北投 748，無 962）✅
**commit**（未 push）：analytics `1d563c5` + gis-platform `fe30294`
**前端**：不用動，isCableBackfill 變無害安全網（MK 已不存在，永遠匹配不到）

---
## ✅ Wave 5 — 移除比較模式 + 新增 about 分頁（session front_compare_about）

- 移除比較模式半成品（TopBar鈕/各ViewB「加入比較」鈕/comparing state/view D；themes yaml compare 區塊保留不讀）
- about overlay：ThemeSwitcher 最左「關於」pill → AboutView（Migu profile + 8 專案作品集卡片）；aboutProjects.ts SSOT
- 誠實處置：Pulse 無公開 URL 不編造（只放 GitHub）、無截圖用字母 fallback；4 張圖複製到 frontend/public/about
- **commit**（未 push）：mini `57a3f1c`（18 檔 +518/-80）
- ⚠️ backlog：Flight Arc 截圖 3.3MB 待壓 WebP；補其餘專案真實截圖；repo-root public/ 殘留(untracked)待清

---
## 🔧 Batch 修復（依 AUDIT_MASTER_PLAN）
### ✅ Batch 1 — 純前端 15 項（session batch1，已 /exit）commit `2650d3e`
- X-1 rail/maritime 22縣市著色（App.tsx 加兩主題 metric 分支）⚠️ **著色需真實瀏覽器複驗**(headless WebGL 測不到)
- M-1 燈塔36/漁權19(2823km²) 前端接線 · M-2(a) (CMA)航商名防衛 · M-4 內陸copy · M-5 coverage badge
- R-1 排名 0.00→「—」 · F-3 移除魔術係數0.7/0.4 · F-5 救護標「僅台南」 · F-6 跨tab badge
- W-1 LPCD排名語意 · W-2 LIVE誤標6處改中性badge · H-2 自然增加假等式改月度−4.10 · H-1(a) mock去LIVE綠tone · D-2 mojibake文案 · D-3 Top5只列正值
- typecheck ✅ + agent-browser DOM 抽驗多項 ✅

<!-- Batch 進度在此 append -->
