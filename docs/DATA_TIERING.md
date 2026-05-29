# 資料分級與固化策略（Data Tiering）

> Mini Taiwan Info frontend 的資料來源分級 SSOT。
> 目的：決定哪些資料 **runtime 必須打 API**、哪些可以 **build 時固化成 JSON snapshot**，
> 以降低 Supabase egress、加快首屏、並在 API 暫時不可用時有 fallback。

對應腳本：[`frontend/scripts/snapshot-static-data.ts`](../frontend/scripts/snapshot-static-data.ts)

---

## 三級分類總則

| 級別 | 名稱 | 更新頻率 | 處理方式 | runtime 行為 |
|---|---|---|---|---|
| **A** | 真 LIVE | 分鐘 / 即時 | **不固化** | 永遠打 API |
| **B** | 半靜態 | 月度 / 季度 | 可 cache、可定期固化（`--include-b-tier`） | 先讀 snapshot，過期再打 API |
| **C** | 純靜態 | 幾乎不變（名錄 / 常數 / 年度快照） | **build 時固化** | 直接讀 snapshot，原則上不打 API |

掃描範圍：8 個主要 query 檔案 —
`maritime` / `river` / `water-overview` / `national-basics` / `fire` / `demographics` / `water` / `rail`。

---

## A 級（真 LIVE — runtime 必須打 API）

固化 LIVE 資料 = 對外提供過期數字的假象，**嚴禁**。這些永遠 runtime fetch。

| 資料 | 來源 query | 更新頻率 | 理由 |
|---|---|---|---|
| 河川水位 | river | 每 10 分鐘 | collector cron 高頻抓取 |
| 水庫蓄水率 | water / water-overview | 高頻 | 旱災期決策依據 |
| 雨量 | water-overview | 高頻 | 即時防災 |
| 地下水位 | water | 高頻 | collector cron |
| 水情燈號 | water-overview | 隨上游變動 | 警戒狀態不能過期 |
| 火災個案 | fire | 即時 | 個案進來即顯示 |
| EMS 救護 | fire | 即時 | 派遣即時性 |
| 山林火災風險 | fire | 每日 / 即時 | 風險等級 |

> 「LIVE」用詞嚴守見專案 CLAUDE.md。本表只有「資料本身是 LIVE」的才列 A 級。

---

## B 級（半靜態 — 可 cache 或定期固化）

月度 / 季度更新。預設 **不**固化（避免 snapshot 過期誤導），但可用
`--include-b-tier` 在每月 build 時固化一份，runtime 以「snapshot 優先、過期 fallback API」消費。

| snapshot key | 資料 | 來源 query | 更新頻率 |
|---|---|---|---|
| `maritime-port-throughput` | 港埠運量 | maritime | 月度 |
| `maritime-fishery-stats` | 漁業統計 | maritime | 季度 / 年度 |
| `water-pipeline-trend` | 管線趨勢 | water | 月度 |
| `water-treatment-plants` | 淨水場 | water | 月度 |
| `water-detention-basins` | 滯洪池 | water | 半靜態 |
| `water-quality-summary` | 水質彙整 | water-overview | 月度 |
| `fire-stats-mv` | 火災統計 MVs | fire | 月度 refresh |
| `demographics-dynamics` | 人口動態 | demographics | 月度 |

---

## C 級（純靜態 — build 時固化）

名錄 / 常數 / 年度快照。幾乎不變，**一律 build 時固化**，runtime 直接讀 JSON。

| snapshot key | 資料 | 來源 query | 規模 |
|---|---|---|---|
| `national-territory` | 全國基本常數 / TERRITORY / 22 縣市疆域 | national-basics | 常數 |
| `ports-directory` | 港口名錄 | maritime | ~277 筆 |
| `rail-stations` | 車站名錄 | rail | ~503 筆 |
| `fire-stations` | 消防據點 / 消防栓 / 避難收容 | fire | 716 + 39k + 5.9k |
| `fire-ignition-categories` | 起火原因分類 | fire | lookup |
| `river-stations` | 河川測站名錄（位置 metadata） | river | 站點清單 |
| `demographics-pyramid` | 人口金字塔 | demographics | 年度快照 |

> 註：河川**測站位置**是 C 級（靜態），但**水位讀數**是 A 級（每 10 分鐘）。
> 同一主題不同欄位可能分屬不同級別，固化時只固化靜態部分。

---

## Snapshot 輸出格式

腳本輸出至 `frontend/public/data/snapshots/`：

```
snapshots/
├── _manifest.json            # 本次 run 總表（ok/error/時戳/旗標）
├── ports-directory.json
├── rail-stations.json
└── ...（每個 key 一檔，--gzip 時另產 *.json.gz）
```

每個 snapshot 檔結構：

```jsonc
{
  "__meta": {
    "key": "ports-directory",
    "tier": "C",
    "description": "港口名錄（約 277 筆）",
    "generated_at": "2026-05-29T12:00:00.000Z",  // ISO 8601
    "row_count": 277,
    "source": "supabase"
  },
  "data": [ /* ...實際資料... */ ]
}
```

`_manifest.json` 記錄每個 job 的 `status: ok | error`，CI 可據此判讀整批是否健康。

---

## 執行

```bash
# 在 repo root 或 frontend/ 下執行皆可（腳本自行解析路徑）

# 只固化 C 級（預設）
npx tsx frontend/scripts/snapshot-static-data.ts

# 連 B 級一起固化（建議每月 build 跑一次）
npx tsx frontend/scripts/snapshot-static-data.ts --include-b-tier

# 額外產 gzip
npx tsx frontend/scripts/snapshot-static-data.ts --include-b-tier --gzip

# 自訂輸出目錄
npx tsx frontend/scripts/snapshot-static-data.ts --out public/data/snapshots
```

讀取 `frontend/.env` / `frontend/.env.local` 的
`VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`（anon key 即可，RLS 已開 anon SELECT）。

建議在 `package.json` 加（**本次不修改 package.json**，僅建議）：

```jsonc
"scripts": {
  "snapshot": "tsx scripts/snapshot-static-data.ts",
  "prebuild": "tsx scripts/snapshot-static-data.ts"   // build 前自動固化 C 級
}
```

---

## 把某個 query 切到「讀 snapshot」的逐步檢查清單

當你決定把一個 C 級（或固化後的 B 級）query 從 runtime fetch 改成讀 snapshot：

1. **確認已固化**
   - 跑 `snapshot-static-data.ts`，確認 `public/data/snapshots/<key>.json` 存在。
   - 檢查 `_manifest.json` 中該 key `status: ok` 且 `row_count` 合理。

2. **驗證舊 snapshot 時戳**
   - 讀檔 `__meta.generated_at`，確認不是過期殘檔。
   - C 級可放寬；B 級若 `generated_at` 距今 **> 7 天**，視為過期（見過期策略）。

3. **在 hook 加入「snapshot 優先」邏輯**（不改現有 query function 本身，改 hook）
   - 優先序：`讀 snapshot → 命中且未過期則用 → 否則 fetch API`。
   - 範例骨架：
     ```ts
     async function loadPortsDirectory() {
       const snap = await fetch("/data/snapshots/ports-directory.json")
         .then((r) => (r.ok ? r.json() : null))
         .catch(() => null);
       if (snap && !isStale(snap.__meta.generated_at)) return snap.data;
       return fetchPortsFromSupabase(); // 既有 runtime query 當 fallback
     }
     ```

4. **測試 fallback 邏輯**
   - 故意刪掉 / 改壞 snapshot 檔，確認 hook 仍能退回 API、頁面不爆。
   - 故意斷網（或擋掉 Supabase domain），確認有 snapshot 時頁面照常渲染。

5. **更新 TanStack Query cache 策略**
   - C 級：`staleTime: Infinity`（或極長）、`gcTime` 拉長 —— 反正不變。
   - B 級：`staleTime` 設為「下次固化前的合理區間」（如 1 天），過期才 refetch。
   - snapshot 命中時用 `initialData` / `placeholderData` 餵給 query，避免首屏空白。

6. **修改 hooks 優先度（snapshot → fetch）**
   - 確保每個被切換的 hook 都遵循同一優先序，並集中 `isStale()` 工具避免散落。

7. **過期策略（staleness policy）**
   - `generated_at` 距今 **> 7 天** 的 B 級 snapshot：降級為「警告」——
     UI 以 `<DataAgeBadge>` 標「採樣 X 天前」（橘 / 灰），並在背景觸發一次 API refetch。
   - C 級原則上不過期；但若 schema 變動導致欄位對不上，仍應 fallback API 並記錄。
   - 永遠不要把過期 snapshot 當 LIVE 呈現（違反專案 LIVE 用詞規範）。

8. **驗收**
   - `pnpm typecheck` 通過。
   - 多寬度 agent-browser 截圖（>1500 / 1100-1500 / 900-1100 / <900）確認無爆版。
   - 觀察 network panel：切換後該 query 在「snapshot 命中」情境下不再打 Supabase。

---

## 注意事項

- **A 級永不固化**：固化 LIVE = 對外承諾即時卻給舊數字，傷信任。
- **不改現有 runtime query**：snapshot 是「前置快取層」，現有 query 永遠是 fallback。
- **跨 schema**：非 public schema 的 table/MV 需先有 `public.{schema}_*` wrapper
  才抓得到（PostgREST 只 expose public，見 PRINCIPLES 2026-05-15）。
  wrapper 不存在時該 job 會在 `_manifest.json` 標 error，不影響其他 job。
- **anon key 可公開**：snapshot 腳本只用 anon key + RLS anon SELECT，不碰 service_role。
