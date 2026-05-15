# 多寬度截圖 SOP

> Stage 4 Verify 強制流程。Session 5 fire 主題撞響應式破版（KPI cols-4 在窄頁壓垮）才補強的。

## 為什麼要 4 寬度

mini-taiwan-info 是「左地圖 60% / 右 dashboard 40%」split-view，所以 **dashboard pane = viewport × 40%**。

| Viewport | Pane 寬約 | 觀察重點 |
|---|---|---|
| **1920px** 桌面寬螢幕 | ~768px | KPI cols-4 完整 4 欄、表格全寬、scatter 點位散得開 |
| **1280px** 典型 13" laptop | ~512px | cols-4 已壓到 ~98px/card，**爆版斷點臨界** |
| **1100px** 小視窗 / 窄外接 | ~440px | 響應式必須切到 cols-2，否則炸 |
| **800px** mobile-ish | ~320px | 全部 single column，文字 / 表格不能 overflow |

只截 1 寬度（headless agent-browser 預設 1186px）會漏掉 **爆版 + 響應式破洞 + mobile 顧不到** 三類問題。

## 標準 4 步驟

### Step 1: 確認 dev server 起來

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5174/
# 期望 200
# 若 connection refused → 提示 user 跑 `cd frontend && pnpm dev`
```

### Step 2: 設定 4 viewport 依序截

agent-browser 預設用 1186px 寬。改寬度透過 CDP API 或 launch flag。**簡化版**：用 `eval` 改 `window.resizeTo(w, h)`：

```bash
SESSION="theme-loop-verify"
OUTPUT_DIR="/tmp/theme-loop-shots-$(date +%s)"
mkdir -p "$OUTPUT_DIR"

# Open + nav to target view
agent-browser --session-name $SESSION open "http://localhost:5174/"
sleep 3
# Switch theme if needed
agent-browser --session-name $SESSION eval "(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>(x.textContent||'').includes('${THEME_NAME}')); if(b)b.click(); return 'ok';})()"
sleep 4

# 4 widths
for W in 1920 1280 1100 800; do
  agent-browser --session-name $SESSION eval "window.resizeTo($W, 900)"
  sleep 1
  agent-browser --session-name $SESSION screenshot "$OUTPUT_DIR/w${W}.png"
done
```

**或更可靠的方式**：用 playwright 直接 launch with viewport size（agent-browser 底層是 playwright）。

### Step 3: 並行 Read 4 張 + 比對

Read 全部 4 張截圖（同一訊息 4 個 Read 平行），目視檢查：

| 寬度 | 必查 |
|---|---|
| 1920 | 全部正常顯示（baseline） |
| 1280 | KPI cols-4 是否仍可讀 / 文字無截斷 / scatter 點位無重疊 |
| 1100 | KPI 是否已切到 cols-2 / 表格欄位是否擠 / 區塊 grid 是否壞 |
| 800 | 全 single column 否 / 元件能否 stack 不互相覆蓋 |

### Step 4: 若有破版

列具體問題給 user 看（例如「1100px 下 fire-s4-grid 的 320px 固定欄擠垮表格欄」）+ 提建議：
- 加 `@media (max-width: NNNN)` 斷點
- 改 fluid 欄寬（`1fr 1fr` 或單欄）
- 字級用 `clamp(min, vw, max)` 自動縮放
- 加 `text-overflow:ellipsis` 防字串爆

對應的響應式設計規則見 `.claude/memory/PRINCIPLES.md` 2026-05-15 KPI grid 響應式斷點條。

## 預期看到的問題型態

| 型態 | 寬度 | 典型 symptom |
|---|---|---|
| KPI 4 欄太擠 | 1100-1280 | label「年度火災件數」被截「年度火災件」/ value「175 / 405」斷行 / trend baseline「較去年」變「較」 |
| 表格欄位直排 | 1100 以下 | 「新北市」變「新/北/市」直書 |
| 固定 px 欄寬擠垮 fluid 欄 | 1100 以下 | 1fr 那欄被 320px 擠到剩 100px |
| Donut + Legend 重疊 | 1280 以下 | grid-template 沒響應式 |
| Hero hook 文字溢出 | 800 | 太長中文沒換行 |

## 不做的事

- ❌ 不在 headless 環境驗證 WebGL（agent-browser 起不來 mapbox）
- ❌ 不對舊 view 反覆截（focus 本 cycle 改動的 view 即可）
- ❌ 不期望 headless 完全等於真實瀏覽器（最終 user 真實瀏覽器拍板）

## 已知限制

- agent-browser headless `window.resizeTo()` 在某些版本不生效，需用 `--viewport-size` flag 或先 close 再開
- WebGL 永遠 fail（地圖不能驗證，只能驗證 dashboard pane 內容）
- Mapbox token 缺失時整個 map pane 顯示 fallback，不影響 dashboard 驗證

## 何時更新本檔

- agent-browser 出新版能 viewport 切換 → 更新 Step 2 指令
- 新增更多響應式斷點到 globals.css → 對應加 viewport 寬度
- 撞到新破版型態 → 「預期看到的問題型態」表追加
