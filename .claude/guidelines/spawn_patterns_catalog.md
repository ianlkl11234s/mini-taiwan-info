# Spawn Patterns Catalog（L2 變形目錄）

7 種 cmux + tmux spawn 變形，對應 iChef 分析場景。**新場景發生時挑變形 + 用 L1 原語拼**，5 分鐘原型；穩定後再升級 L3 SKILL。

L1 原語：[`cmux_tmux_spawn_primer.md`](./cmux_tmux_spawn_primer.md)

---

## Pattern 1: Spawn-and-Wait（並行獨立任務）

**定義**：N 個彼此無關的任務同時跑，全部完成才收尾。

**何時用**：任務之間沒有資料依賴、結果可獨立評估、希望總時長 ≈ 最慢一個。

**何時不用**：任務有時序依賴（A 完才能做 B）→ 用 Pattern 3。

**iChef 場景**：
- 跨 BU 同時跑週報（OMO weekly / POS weekly / QLR weekly / 2C weekly）
- 多 dashboard refresh（91app / ai_market_report / ai_subsidy 同時跑）
- 跨年月對比（2024 / 2025 / 2026 同主題分析並行）

**範本**：
```bash
SESSIONS=(wk_omo wk_pos wk_qlr wk_2c)
PROMPTS=("/omo weekly" "/pos weekly" "/qlr weekly" "/2c weekly")
OUT=/tmp/weekly_$(date +%Y%m%d)
mkdir -p "$OUT"

for i in "${!SESSIONS[@]}"; do
  .claude/scripts/spawn_tmux_claude.sh "${SESSIONS[$i]}" "$REPO"
done
for i in "${!SESSIONS[@]}"; do
  .claude/scripts/tmux_send_prompt.sh "${SESSIONS[$i]}" \
    "${PROMPTS[$i]}，產物寫到 $OUT/${SESSIONS[$i]}.md"
done
.claude/scripts/cmux_view_tabs.sh "WeeklyAll" tabs "${SESSIONS[@]}"
.claude/scripts/tmux_monitor_files.sh 1800 200 "$OUT"/*.md
```

---

## Pattern 2: Spawn-and-Stream（多輪互動）

**定義**：spawn N 個 sub 後，主 agent 持續對它們 send-keys 追加追問，sub 保留 context。

**何時用**：需要 deep dive、追加追問、需要 sub 記得前文。

**何時不用**：任務在第一輪就能完成 → 用 Pattern 1。

**iChef 場景**：
- 流失店家深度調查（一輪 spawn 多店家，每店家分別深問）
- Customer voice 跨主題深問（spawn 4 個業務聲音 sub，每個追問不同產品）
- Dashboard debug（spawn 一個 sub 跑 SQL、主 agent 追加 hypothesis）

**範本**：
```bash
# 第一輪 dispatch（同 Pattern 1）
.claude/scripts/spawn_tmux_claude.sh ap_X "$REPO"
.claude/scripts/tmux_send_prompt.sh ap_X "查 store_id=123 的流失原因，寫初步發現到 /tmp/store_123.md"
.claude/scripts/tmux_monitor_files.sh 300 100 /tmp/store_123.md

# 主 agent 讀檔思考後追加
BASE_SIZE=$(stat -f%z /tmp/store_123.md)
.claude/scripts/tmux_send_prompt.sh ap_X "根據剛才的發現，再 deep dive 該店 90 天訂單變化，append 到同一個檔"

# polling 等 size 增長
while [ "$(stat -f%z /tmp/store_123.md)" -le "$((BASE_SIZE + 100))" ]; do sleep 5; done
```

**注意**：sub-claude TUI 還活著、context 還在，可一直追問。

---

## Pattern 3: Cascade（pipeline 接力）

**定義**：A 完成 → 自動 spawn B 接手 → B 完成 → spawn C。

**何時用**：任務有明確時序依賴，每段產物餵下一段。

**何時不用**：每段可獨立做 → 用 Pattern 1（並行更快）。

**iChef 場景**：
- 「資料 refresh → SQL 算 → 寫 Notion」3 段（refresh 必先完才能算）
- 「QLR 取資料 → 計算流失 → 圖表生成」
- 「scrape 競品 → 比對主資料 → 寫週報」

**範本**：
```bash
# Step 1
.claude/scripts/spawn_tmux_claude.sh step_refresh "$REPO"
.claude/scripts/tmux_send_prompt.sh step_refresh "refresh dashboard X 的 raw data 到 /tmp/raw/"
.claude/scripts/tmux_monitor_files.sh 600 1000 /tmp/raw/done.marker

# Step 2 接力
.claude/scripts/spawn_tmux_claude.sh step_calc "$REPO"
.claude/scripts/tmux_send_prompt.sh step_calc "讀 /tmp/raw/*.csv 計算指標到 /tmp/metrics.json"
.claude/scripts/tmux_monitor_files.sh 300 200 /tmp/metrics.json

# Step 3 接力
.claude/scripts/spawn_tmux_claude.sh step_notion "$REPO"
.claude/scripts/tmux_send_prompt.sh step_notion "讀 /tmp/metrics.json 寫 Notion 報告"
```

---

## Pattern 4: Master-Worker Pool（持續派票）

**定義**：1 個 master tmux session 跑 dispatcher 邏輯，N 個 worker tmux session 等任務；master 從 queue 派任務給 idle worker。

**何時用**：有大量同質任務 backlog（每個 worker 用一樣 spec）、想限制並發數。

**何時不用**：任務數固定 < 5 → 用 Pattern 1 簡單。

**iChef 場景**：
- 批次 deep dive 100 家流失店家（5 workers，每個 worker 依序處理 20 家）
- 批次跑 N 個店家的 Customer voice 分析
- 批次 SQL pipeline refresh（限制 3 個並發避開 DB 壓力）

**範本**（簡化版）：
```bash
# tasks.txt 一行一個 store_id
QUEUE=/tmp/queue.txt
WORKERS=3

# spawn workers
for i in $(seq 1 $WORKERS); do
  .claude/scripts/spawn_tmux_claude.sh "worker_$i" "$REPO"
done

# dispatcher loop（主 agent 或一個 master session）
while read -r STORE; do
  # 等 idle worker（這裡簡化，正式版需狀態檔）
  for i in $(seq 1 $WORKERS); do
    OUT="/tmp/store_${STORE}.md"
    if [ ! -f "$OUT" ]; then
      .claude/scripts/tmux_send_prompt.sh "worker_$i" \
        "deep dive store $STORE 寫到 $OUT，完成回 IDLE_$i"
      break
    fi
  done
done < "$QUEUE"
```

**進階**：用 `cmux events --category agent --reconnect` 訂閱 Stop hook 知道哪個 worker idle。

---

## Pattern 5: Voting（多 agent 同題比答案）

**定義**：N 個 sub 跑「**同一問題**」（可能用不同 prompt 變體 / 不同 model），主 agent 比較答案找一致 / 找分歧。

**何時用**：結論影響重大、想避免單一 agent 的偏誤、想做 ensemble。

**何時不用**：簡單明確任務 → 過度設計。

**iChef 場景**：
- 流失原因歸因（不同切角 sub 各算一遍，看一致還是分歧）
- 「這家店是哪個業態」分類（3 個 sub 用不同特徵集投票）
- 跨 BU 報告草稿（2 個 sub 各寫一版，主 agent 取最佳）

**範本**：
```bash
QUESTION="店 X 流失主因是什麼？分析 90 天訂單資料"
for v in v1_sql v2_voice v3_timeline; do
  .claude/scripts/spawn_tmux_claude.sh "vote_$v" "$REPO"
  .claude/scripts/tmux_send_prompt.sh "vote_$v" \
    "$QUESTION（用 $v 切角分析）寫到 /tmp/vote_$v.md"
done

.claude/scripts/tmux_monitor_files.sh 600 200 \
  /tmp/vote_v1_sql.md /tmp/vote_v2_voice.md /tmp/vote_v3_timeline.md

# 主 agent 讀 3 份比較
diff <(jq -r .conclusion /tmp/vote_*.md) ...
```

---

## Pattern 6: Chain Wakeup Spawn（cron 觸發 master）

**定義**：launchd / cron 排程定時喚醒一個 master script，master spawn N sub 跑週度任務，完成後通知。**完全無人值守**。

**何時用**：規律性任務（週日報告、每日 dashboard refresh）。

**何時不用**：一次性 ad-hoc → 手動 Pattern 1。

**iChef 場景**（**這是你想要的週日報告場景**）：
- 週日 18:00 launchd → master.sh → spawn 4 weekly（OMO/POS/QLR/2C）→ 彙整 → notify
- 每日 06:30 launchd → master.sh → spawn 3 dashboard refresh → 上傳 Google Sheet
- 月初 cron → spawn 全 BU 月報

**範本**：

```bash
# /Users/migu/.local/scripts/sunday_reports_master.sh
#!/bin/bash
set -e
BASE=/Users/migu/Desktop/.../ichef_analys_place
OUT=/tmp/weekly_$(date +%Y%m%d)
mkdir -p "$OUT"

cd "$BASE"
SESSIONS=(wk_omo wk_pos wk_qlr wk_2c)
PROMPTS=(
  "/omo weekly-full-report，產物寫 $OUT/omo.md"
  "/pos weekly，產物寫 $OUT/pos.md"
  "/qlr weekly，產物寫 $OUT/qlr.md"
  "/2c weekly，產物寫 $OUT/2c.md"
)

for i in "${!SESSIONS[@]}"; do
  .claude/scripts/spawn_tmux_claude.sh "${SESSIONS[$i]}" "$BASE"
done
for i in "${!SESSIONS[@]}"; do
  .claude/scripts/tmux_send_prompt.sh "${SESSIONS[$i]}" "${PROMPTS[$i]}"
done
.claude/scripts/cmux_view_tabs.sh "WeeklyAuto-$(date +%m%d)" tabs "${SESSIONS[@]}"

# 等最久 90 分鐘
.claude/scripts/tmux_monitor_files.sh 5400 500 \
  "$OUT/omo.md" "$OUT/pos.md" "$OUT/qlr.md" "$OUT/2c.md"

# 彙整
cat "$OUT"/*.md > "$OUT/all_weekly_combined.md"

# 通知
cmux notify --title "Weekly all done" --body "see $OUT/" \
  || osascript -e "display notification \"weekly done\" with title \"AP\""
```

對應 launchd plist 排程詳見 `reference_launchd_claude_setup.md`。

**比你現在做法的優勢**：
- 一個指令觸發整套（vs 你之前手動開 3-4 個 chain）
- 並行（vs chain 是順序）
- 統一監控 + 統一通知 + master 可做最後跨 BU 彙整

---

## Pattern 7: Hybrid（spawn 子 spawn 孫）

**定義**：主 agent spawn 中層 dispatcher，dispatcher 再 spawn 工人。多層拆解。

**何時用**：任務複雜到單層拆不開、需要不同層級 context（戰略 vs 戰術）。

**何時不用**：層級 ≤ 2 → 直接 Pattern 4 master-worker 更簡單。

**iChef 場景**：
- 「全 BU 流失分析」→ spawn 4 BU dispatcher → 各 BU dispatcher spawn N 店家 sub
- 「整年回顧報告」→ spawn 季度 sub → 季度 sub spawn 月度 sub
- 大型專案 wave 拆解（AEP 的 story map 風格）

**注意**：層數越多越難 debug，每層加錯誤率。**先嘗試攤平成 Pattern 4**。

---

## 變形選擇樹

```
任務是 1 次性 ad-hoc?
├─ YES: 任務之間有時序依賴?
│   ├─ YES: 用 Pattern 3 (Cascade)
│   └─ NO:  任務需要多輪追問?
│       ├─ YES: Pattern 2 (Stream)
│       └─ NO:  Pattern 1 (Wait)
└─ NO (規律性): Pattern 6 (Chain Wakeup)
    └─ 任務數 > 5 且同質高?
        └─ Pattern 4 (Master-Worker)

特殊：
- 結論影響大 → Pattern 5 (Voting) 加在主流程之上
- 任務複雜需多層 → Pattern 7 (Hybrid) 慎用
```

---

## 升 L3 SKILL 的判準

何時把「Pattern X + iChef 場景 Y」升級成具體 SKILL（如 `skills/sunday-reports-spawn/`）：

1. **重複度 ≥ 3 次**：同樣的 Pattern + 場景已經跑過 3 次以上
2. **流程穩定**：5 個邊界都驗證過、不會每次改腳本
3. **參數固定**：sessions 名、prompts、out paths 都已定型
4. **想要快速觸發**：希望「一句話 / 一個指令」啟動

不符合上述 = 還在原型階段，**留在 L1+L2 用範本拼**就好。
