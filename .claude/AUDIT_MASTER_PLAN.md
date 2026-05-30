# 全主題稽核 · 主修復計畫（2026-05-30）

> 來源：3 份 agent-browser 稽核（`.claude/board/audit_*.md`）+ 主 agent 彙整/修正。
> 分類：(a)純前端 (b)spawn ETL session (c)SSOT/manifest 對齊 (d)響應式。依鐵則。

## ⚠️ 主 agent 對稽核的修正
- **maritime 燈塔/漁權**：稽核說「未接通要建表」→ **實際後端 etl_maritime 早建好 public.lighthouse/fishery_rights 並 REST 200**，只是**前端沒接線**。改歸 **(a) 純前端接線**，非 (b) 建表。manifest「已上線」其實是真的。

---

## 🔴 P0（最傷對外信任，優先）

| # | 主題 | 問題 | 分類 | 位置 |
|---|---|---|---|---|
| X-1 | rail+maritime | **22 縣市 choropleth 著色完全無效（永遠灰底）**＝產品核心「選主題→著色」壞掉 | (a) | App.tsx:197-291 只實作 water/fire/demo；rail/maritime 無分支 → null |
| D-1 | demographics | **出生/死亡絕對值錯一個數量級**（全國12,496/17,445、新北1,573、連江10/3，約真實1/10，疑 ETL 存單月當年度）且標「(實)/戶政司年度」偽裝真 | (b)+(a) | spatial.national_population_trend；ViewA S3+ViewB 動態 全縣市 |
| H-1 | home-basics | **mock per-county 人口/性別/年齡掛「月度·2026-04」+ badgeTone=live 綠 LIVE**，偽裝成真 | (a)+(b) | ViewBHomeBasics:386,480；county-stats:59-67 |
| H-2 | home-basics | 全國自然增加率**假等式 4.26−8.36=−2.87**（實−4.10，月度/年度混用） | (a)+(c) | ViewAHome:530；national-basics:104 |
| H-3 | home-basics | 縣市總人口 mock(13,000) vs 真實鄉鎮加總(13,621) 矛盾（離島最明顯） | (c)+(b) | ViewB；對 township_rank |
| F-1 | fire | **月度/時段分布「三年累計」標「單年」**（台北月度3,957≠全年1,137） | (b)+(c) | MV fire_incidents_by_hour_month 缺 year；fire.ts:135 |
| F-2 | fire | 消防栓三值打架（高雄91,691/39,395、台北43,724疑污染） | (b)+(c) | S2Response:39；ViewBFire:153 |
| F-3 | fire | service buffer **硬編碼魔術係數 0.7/0.4**（台北「全村里3km內」卻顯示70%） | (a) | ViewBFire:1107,1114 |
| F-4 | fire | 連江「圈外5.5%(712人)」vs「無圈外村里」同畫面矛盾 | (c) | 服務圈 tab，兩 MV 口徑 |
| W-1 | water | LPCD 排名**兩 tab 方向相反**（台北 1/22 vs 22/22） | (a) | ViewB 概覽 vs 排名 |
| W-2 | water | **LIVE 誤標 6 處**（年度/靜態掛 LIVE badge，違反 LIVE 嚴守） | (a) | ViewB:288,304,1011,1079,1128,1455 |
| M-1 | maritime | 燈塔(36)/漁權(19) **前端沒接**（後端已 ready） | (a) | useMaritimeData 沒拉 lighthouse/fishery_rights |
| M-2 | maritime | port_traffic top5 第5名「(CMA)」**航商名污染** | (b)清理+(a)防衛 | port_traffic_yearly；deriveTopCommPorts |
| R-1 | rail | 排名 tab 無資料縣市顯「0.00」非「—」（鐵則1邊界） | (a) | rail.ts:554,563 `?? 0` |

## ⚠️ P1

| # | 主題 | 問題 | 分類 |
|---|---|---|---|
| H-4 | home-basics | 壯年比**寫死 68%** → 22 縣市扶養比恆等 47.06% | (b) per-county |
| D-2 | demographics | 「statistical_areas county mojibake」**開發術語洩漏給使用者** | (a)文案+(b) |
| D-3 | demographics | 自然增加 Top5 排序/footer 矛盾 | (a) |
| F-5 | fire | 救護全國 KPI=1.8萬 實為**台南單縣** | (a) |
| F-6 | fire | 同指標跨 tab「待ETL」vs「已接通」矛盾 | (a) |
| W-3 | water | 滯洪池 17 座但容量 0.0萬m³（NULL 偽裝 0） | (b) |
| W-4 | water | 水庫總數 37/34/32 三套不一 | (c) |
| M-3 | maritime | 商港數 UI 14 vs manifest 11 / manifest 73筆舊注 / 燈塔漁權 manifest | (c) |
| M-4 | maritime | ViewB 內陸 NAN/CYC copy 自我指涉 | (a) |
| M-5 | maritime | color-metric 含 coverage_note 切換無警示 badge | (a) |

## P2 響應式（鐵則4，建議統一 sweep）
- dashboard pane 固定 500px / split min 1080px → 改 viewport 比例(40vw) + <1080 stacking 斷點（globals.css:169）
- 各主題 KPI grid / tab 列 / 跨縣市 badge 窄寬截斷
- ⚠️ maritime 部分響應式 + 所有地圖 choropleth 著色，需**正常 WebGL 環境複驗**（headless 測不到）

---

## 執行批次（用工作流一個個修）

### Batch 1 — 純前端 (a)（最高 CP，無後端依賴，可 1-2 commit）
X-1 著色 / M-1 燈塔漁權接線 / F-3 魔術係數 / F-5 / F-6 / W-1 / W-2 LIVE / H-2 等式 / H-1(a部分:拔LIVE tone+標推估) / D-2 文案 / D-3 / R-1 / M-2(a) / M-4

### Batch 2 — SSOT/manifest (c)
W-4 / F-4 / M-3 / H-3 / manifest 對齊

### Batch 3 — spawn ETL session (b)（去 taipei-gis-analytics）
**D-1 出生死亡口徑（影響最廣，先）** / F-1 MV加year / F-2 消防栓清理 / H-1(b)+H-4 per-county真實人口年齡 / W-3 滯洪池 / M-2(b) port_traffic清理

### Batch 4 — 響應式 sweep (d)（需正常 WebGL 複驗後）
pane 寬度策略統一 + 各截斷修

---
## 截圖
audit screenshots：`/tmp/audit_*`、`.claude/board/shots/{demo,home}/`
