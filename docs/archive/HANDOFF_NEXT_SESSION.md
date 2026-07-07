# 🚀 Next Session Handoff — 從這裡開始

> **2026-05-15 晚** 寫。Session 5（消防 ViewA Phase 1）+ Session 6（harness 升級）結束後的接續書。
>
> 3 repo 全 push 完成、harness 全面升級、memory 9 檔同步。
> 下個 session 讀本檔 + `.claude/memory/STATUS.md` 即可接手。

---

## 🎯 主目標

**把消防主題所有 mock 都換成真實資料。**

Session 5 把 fire ViewA 4 區塊全上線，但只有區塊 1（火災發生）約 70% 真實，其他 3 區塊大量 mock placeholder。

下個 session 要做的就是逐項把 placeholder 換成真實資料。

---

## 📊 現況 — 真實 vs Mock 對映

### 區塊 1：火災發生（70% 真實）

| 元件 | 狀態 |
|---|---|
| 年度件數 / 死亡 / 受傷 KPI | ✅ 真實（48,626 件 / 民 113）|
| 主因佔比 KPI | ✅ 真實（用火不慎 36.4%）|
| 時間長條 年/月/日/時段 4 切片 | ✅ 真實（全 from MV）|
| 5 維度佔比（早中晚/5大類/縣市/傷亡）| ✅ 真實 |
| 縣市排名表 | ✅ 真實 |
| 起火原因 5+22 表 | ✅ 真實 |
| **火災財損 KPI** | 🔶 mock（待 MOI ETL）|
| **起火處所 維度 + 表** | 🔶 mock（待 MOI ETL）|

### 區塊 2：火災救災（全 mock）

| 元件 | 狀態 |
|---|---|
| 消防分隊數 KPI | 🔶 mock 629 個（待 Sprint 2 ETL）|
| 消防栓 KPI | 🔶 mock 101,100 個（待 Sprint 2 ETL）|
| 4 都消防栓統計表 | 🔶 mock（待 Sprint 2 ETL）|
| **地圖層：分隊紅 dot** | ⬜ 未實作（SPEC 要求「始終 on」）|
| **地圖層：火災 heatmap** | ⬜ 未實作（SPEC 要求「始終 on」）|

### 區塊 3：火災交叉量能（半真實）

| 元件 | 狀態 |
|---|---|
| 分隊密度 KPI 3 個 | 🔶 mock（等 Sprint 3 PostGIS）|
| 散布圖 x 軸（火災密度）| ✅ 真實 |
| 散布圖 y 軸（分隊密度）| 🔶 mock（等 Sprint 2）|
| 22 縣市量能對照表 | 🔶 mock（等 Sprint 3 PostGIS）|

### 區塊 4：其他救護山林火山（全 mock）

| 元件 | 狀態 |
|---|---|
| 救護出勤 / 急救醫院 / 山林風險 KPI | 🔶 mock（等 Sprint 4 ETL）|
| 22 縣市救護表 | 🔶 mock（等 Sprint 4 ETL）|
| 災變時間軸 | 🔶 mock（等 Sprint 4 ETL）|

### ViewB Fire 縣市儀錶板

| 項目 | 狀態 |
|---|---|
| 整個 ViewB Fire | ⬜ **未實作** — 點縣市目前只在地圖上 highlight，不跳 ViewB |
| 5 tabs 結構 | 設計圖在 `/tmp/fire_design/.../view-b-fire.jsx`（design bundle）|
| 雷達圖 6 指標 vs 全國平均 | 設計圖有 |
| 服務圈 3km/6km buffer | 設計圖有（依賴 Sprint 3 stations）|

---

## 🎬 下個 Session 三條優先路徑

### 路徑 A：地圖層快速勝利（推薦先做 1-2 hr）

**為什麼**：用現有 fire.incidents 48,626 lat/lng **立即可做** 火災 heatmap，視覺效果立竿見影。分隊用 mock 過渡。

**步驟**：
1. 在 `MapView.tsx` 加 fire-specific layers：
   - `fire-incidents-heatmap`（type: heatmap，source: fire.incidents 抓 lat/lng）
   - `fire-stations-pt`（type: circle，mock data 暫用，Sprint 2 後 swap 真實）
2. App.tsx 對 fire 主題傳 `showFireBaseLayers={theme === "fire"}`
3. Choropleth + heatmap 同時顯示測色彩衝突
4. `/theme-loop` Mode V（視覺重做）跑

**對應 BACKLOG**：B045

```
觸發詞範例：
> /theme-loop 加 fire 地圖層 dot + heatmap
```

### 路徑 B：跑 TODO-3 MOI 5 表 ETL（3-4 天）

**為什麼**：解區塊 1 兩個 placeholder（火災財損 KPI + 起火處所表）— 區塊 1 從 70% 真實 → 100% 真實。

**步驟**：
1. 切到 `../taipei-gis-analytics`，寫 `pipelines/environment/fire/07_fetch_moi_stats.py`
2. 寫 `../gis-platform/migrations/100_fire_moi_stats_tables.sql`（5 張表 + RPC）
3. 5 個 dataset：
   - 行政區火災統計
   - 行政區火災死傷財損 ⭐（user 拍板 4 要做）
   - 行政區火災起火原因
   - 行政區火災起火處所
   - 行政區火災類別
4. Apply + 跑 pipeline `--full`
5. 寫 wrapper migration 101（依 PostgREST 限制）
6. mini-taiwan-info 寫 query + hook + 改 component import
7. mock-fire.ts 對應項拿掉「待ETL」label

**對應 BACKLOG**：B041

```
觸發詞範例：
> /theme-loop 跑 fire S1 mock-swap (Mode S)
> /theme-loop 啟動 TODO-3 MOI ETL (Mode D)
```

### 路徑 C：ViewB Fire 縣市儀錶板（1-2 天）

**為什麼**：user 點縣市目前卡住（只 highlight），ViewB 完成後可以 drilldown 看單縣市細節 + 雷達圖比全國。

**步驟**：
1. 仿 ViewB（水主題）建 ViewBFire.tsx
2. 5 tabs：overview / incidents / response / service / others
3. 頂端雷達圖（6 指標 vs 全國平均）
4. 服務圈 buffer（依賴 Sprint 3 stations，先 placeholder）
5. App.tsx 把 fire 點縣市改為進 ViewBFire（拿掉 highlight-only 邏輯）

**對應 BACKLOG**：B046

```
觸發詞範例：
> /theme-loop 開 fire ViewB 縣市儀錶板
```

---

## 🛠️ 你現在有的 Harness（Session 6 新建，請優先利用）

### 主流程 Skills
- `/theme-loop` — 通用主題 cycle（5 階段 + 4 checkpoint，支援 P/D/V/**S** 4 個 Mode）
- `/wrap-up` — Session 收尾 + 9 memory + **Stage 6 Harness Audit**

### 輔助 Skills（自動配套，也可獨立呼叫）
- `/check-schema-exposed` — Supabase 新 schema 預檢（防 Invalid schema rework）
- `/scaffold-rpc-wrapper` — 自動產 wrapper migration + TS query（必先 psql 拿確切簽名）
- `/cross-repo-status` — 3 repo divergence 一鍵盤點

### Agent
- `schema-drift-auditor` — migrations vs frontend queries 3 類 drift 比對

### Hook
- `PostToolUse on Edit/Write/MultiEdit` → 自動跑 typecheck（只 surface error）

### Permission allow（settings.json）
~40 條 read-only Bash 已 allow（git status / pnpm typecheck / psql SELECT / agent-browser screenshot / etc）
~4 條 deny 危險操作（force push / DROP / TRUNCATE / rm -rf）

---

## 📍 跨 3 Repo 狀態（Session 6 結束時）

| Repo | Branch | Ahead | Behind | 狀態 |
|---|---|---:|---:|---|
| **mini-taiwan-info** | main | 0 | 0 | 🟢 **已 push（含 harness 6 commit）** |
| **gis-platform** | main | 0 | 0 | 🟢 已 push（Session 5 migration 104）|
| **taipei-gis-analytics** | master | 0 | 0 | 🟢 已 push（Session 5 fire upload script）|

下個 session 開始時，3 repo 全 clean，無 pending。

---

## 🔥 PostgREST 重要提醒（Session 5 撞牆學到）

**新 schema 不會自動 expose！** 寫 query 前必須：

1. 呼叫 `/check-schema-exposed` 確認該 schema 是否暴露
2. 若沒暴露 → 呼叫 `/scaffold-rpc-wrapper` 產 `public.{schema}_*` wrapper migration
3. Apply 後前端走預設 `supabase` client（不要 `withSchema()`）

Fire 已有 wrapper（migration 104）。其他主題（demographics / safety 等）上線時都要做這步。

---

## 🚫 還沒做的事 + 已知限制（不阻塞但需知道）

| 項目 | 狀態 | 對下個 session 的影響 |
|---|---|---|
| TODO-2 13764 batch_003 上 TGOS web | 需 user 手動，1-3 天回應期 | 不阻塞 ViewA，可選擇等 |
| ViewC Fire（水庫詳情頁等的火災版）| 不規劃，無對應業務需求 | — |
| 火災 KPI 爆炸視圖（B047）| P2 | 等 ViewB 完成後再說 |
| 火山潛勢圖層（21 layer）| ❌ Backlog（2026-05-15 拍板砍）| 不做 |
| `home-basics.yaml` / `socioeconomic.yaml` 仍 v1.0 spec | 主題未啟用，fallback 撐住 | 等真要開那兩主題再升級 |
| Mapbox WebGL 在 agent-browser headless 失敗 | 視覺驗證限制 | 地圖類改動最終 user 真實瀏覽器驗 |

---

## 🚦 開新 Session 的建議第一步

複製以下 prompt：

```
讀 .claude/memory/STATUS.md 跟 HANDOFF_NEXT_SESSION.md 看接什麼。

目標：把 fire 主題 mock 換真實。

跑 /theme-loop fire — 從建議路徑 A（地圖層快速勝利 1-2 hr）開始
```

Theme-loop Stage 1 會自動派 4 個 discovery agent（含截圖 + schema 預檢 + 多寬度響應式 + 資料候選 + gap 分析）。
Stage 2 給你拍板選 A/B/C 路徑（或新方向）。

---

## 📚 參考文件路徑

- 本 session 進度詳細：`.claude/memory/STATUS.md`
- Harness 完整索引：`CLAUDE.md` Skills 段
- BACKLOG（B041-B047 fire 後續 + 其他主題 backlog）：`.claude/memory/BACKLOG.md`
- 設計 SPEC：`designs/v03-fire-design-brief-2026-05-15/SPEC.md`
- Anthropic 設計 bundle：`/tmp/fire_design/mini-taiwan-info/project/` （含 view-a-fire.jsx + view-b-fire.jsx 完整 TS-able 結構）
- Backend ETL 進度：`../taipei-gis-analytics/docs/memos/fire_session_handoff.md`
- Schema SSOT：`../gis-platform/migrations/099_fire_schema.sql` + `104_fire_public_wrappers.sql`

---

**最後更新**：2026-05-15 晚 · Session 5 + 6 收尾 · 撰：migu + Claude Opus 4.7（1M context）
