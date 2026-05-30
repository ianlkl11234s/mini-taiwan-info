# front_rail_fix — 軌道(rail) S2「班次與車種」4 bug 修復

**範圍**：ViewA Rail 全國概覽「班次與車種(S2)」頁，頂部系統切換鈕（全部/台鐵/高鐵/捷運+輕軌）。
**commit**：`0a06b33` fix(rail): 班次與車種面板隨系統切換重算(24hr/TOP10/車種組成)+貓纜回填標註（未 push）
**狀態**：🟢 全部完成，4 group 狀態 agent-browser 實測通過

---

## 根因（自驗確認）

`deriveHourlyProfile(trips)` / `deriveTopStations(trips,stations)` 原本在 `useRailData.ts:100/102` 只算一次、吃全系統、無 systemFilter。S2Service 對 24hr 只做「全國 profile × 系統佔比」線性縮放（`Hscaled = H.map(value*scale)`），TOP10 直接用全域結果不隨系統變。

**修法主軸**：兩函式加 `systemFilter?` 參數；S2Service 改用 `useMemo` 依 `group.systems` **重算**（非縮放），useRailData 不再預算這兩個（移除死碼，避免重複計算）。

---

## 各 bug 怎麼修

### Bug 1 · 24hr 班次分布不隨系統變（線性縮放→重算）
- `rail.ts deriveHourlyProfile(trips, systemFilter?)`：先 `sysSet` filter trips 再累加 hourly_distribution。
- `ViewARail.tsx S2Service`：`const H = useMemo(()=>deriveHourlyProfile(data.trips, group.systems), [group.id, data.trips])`；移除 `Hscaled`，24hr bars / labels / 尖峰最大值全改用重算的 `H`。
- **驗證形狀真的變（非縮放）**：全部 尖峰最大/全日 = 8893/119467 = 7.44%；高鐵 = 103/1521 = 6.77%；台鐵 = 1289/20684 = 6.23% — 比例不同。若純縮放，高鐵尖峰最大應 = 8893×(1521/119467)=113，實際 **103≠113**；台鐵應 =1540，實際 **1289≠1540** → 確實依各系統自身資料重算。

### Bug 2 · 單一系統車種顯示降級文字 → 改 100% 單條
- `ViewARail.tsx`：`!hasTra` 分支移除「※ 車種佔比僅適用於臺鐵路段…」文字，改渲染 `sysTrips` 一條 bar（與「各系統停靠車次佔比」同款），單一系統(高鐵)=滿格 100%。
- 標題動態：含 tra→「臺鐵車種佔比」(`deriveTRABreakdown` 多車種細分維持不動)；非 tra→「車種組成（自有車組）」。副標：單系統→「{系統} 為單一車組 — 佔本分類 100%」；多系統(捷運+輕軌)→「各系統自有車組，無臺鐵式車種細分」。
- **已知取捨**：捷運+輕軌(7 系統)的車種 bar 與上方「各系統停靠車次佔比」bar 同數據（皆 sysTrips），視覺相似。此為 user 明確要求「像各系統停靠車次佔比那樣一條 bar」的直接結果；副標以「自有車組」重新框定語意（車種視角 vs 服務量視角）。若日後不要這層 redundancy，可把 metro 收斂成單一「捷運+輕軌列車 100%」一條。

### Bug 3 · 切高鐵 TOP10 仍出貓纜站
- `rail.ts deriveTopStations(trips, stations, systemFilter?, limit=10)`：加 `sysSet` filter trips。
- `ViewARail.tsx`：`const TOP = useMemo(()=>deriveTopStations(data.trips, data.stations, group.systems), [...])`。切高鐵只出 thsr 站。

### Bug 4 · 貓纜假資料 962（前端排除）
- **決策：排除（非標 badge）**。理由：貓纜 MK01-04 各寫死 962，是**全國 daily_stop_count TOP1-4**（贏過所有真站：R22北投748/G03七張623/BL590…）。若只標 badge，TOP10 第 1-4 名全是假占位、且把 4 個真實大站擠出榜外 → 極誤導。排除後排名只剩真實停靠車次。
- 實作：`rail.ts isCableBackfill(t) = (t.system_id==='trtc' && t.line_id==='MK')`，在 deriveTopStations 一律 filter 掉。
- **⚠ 精準辨識用 line_id 不用站名**：文湖線有**真實**「動物園」(`BR01`, line BR)，貓纜叫「動物園站」(`MK01`, line MK)。**舊 note 邏輯用站名 match `"動物園"` 其實誤標到真實 BR01、且漏標真貓纜（貓纜帶「站」字）** — 已一併修正（移除站名 note，改 line_id 排除）。臺北車站 trtc 雙線 note 保留。
- TOP10 副標改為「{分類} · 已排除貓纜 4 站（962 回填占位，非真實停靠班次）」。

---

## 貓纜後端來源（供日後根治，本輪只做前端）

- **來源**：mini-taiwan-pulse `public/rail/trtc/schedules/MK-1-0.json`(481) + `MK-1-1.json`(481) = 962（兩方向靜態快照，非真實停靠次數）。
- **ETL**：`taipei-gis-analytics/pipelines/transportation/rail/07_derive_station_daily_trips.py`（逐 track 聚合，無回填邏輯，直通）→ `08_upsert_station_daily_trips_supabase.py` UPSERT。
- **DB**：`gis-platform/migrations/123_rail_station_daily_trips.sql`，PK=(system_id, station_id, line_id)，貓纜 = (trtc, MK0x, MK)。
- **根治建議（後端）**：07 pipeline 在 `key=(real_sys,stid,lid)` 前加 `if real_sys=='trtc' and lid=='MK': continue`，把貓纜移出 station_daily_trips；或新增 `transport_type`('gondola') 欄位標記，前端依此另行渲染。前端排除為臨時止血，根治在後端。

---

## 收尾驗證

- **typecheck**：`pnpm typecheck` ✅ 過（順帶清掉 useRailData 的 hourly/topStations 死碼欄位+import）。
- **agent-browser 三系統(+捷運)實測**（dev server localhost:5173/?theme=rail）：

| 分類 | 24hr 全日 / 尖峰最大 | 車種組成 | TOP10 |
|---|---|---|---|
| 全部 | 119,467 班 / 8,893 班/時 | 臺鐵車種佔比 區間車77.7% | 北投748/七張623/江子翠590…新埔588，**無貓纜** |
| 台鐵 | 20,684 班 / 1,289 班/時 | 臺鐵車種佔比 區間車77.7%/莒光8%/自強6.4%…（多車種細分維持）| 臺北344/板橋344/松山339…臺南227，全 TRA |
| 高鐵 | **1,521 班 / 103 班/時**（形狀明顯異於全部）| **THSR 車種組成（自有車組）· 高鐵 100% 單條**，無降級文字 | 台中187/台北185/南港180…苗栗56，**全 THSR、零貓纜** |
| 捷運+輕軌 | （重算）| 車種組成（自有車組）臺北捷運64.1%/高雄捷運12.5%…安坑輕軌1.6% 多段 | 已排除貓纜 |

  - 截圖：/tmp/rail_all.png（全部 KPI 119,467）、/tmp/rail_hsr_24hr.png（高鐵 KPI 1,521）、/tmp/rail_hsr_top10.png（高鐵 TOP10 全 THSR）。
  - headless WebGL 不可用 → 左側地圖 pane 顯「地圖載入失敗」，與本次 S2 修復無關。

- **commit**：`0a06b33`，3 檔（rail.ts / useRailData.ts / ViewARail.tsx），81+ / 36-。明確路徑 add，無 git add -A，未 push。

=== DONE front_rail_fix ===
