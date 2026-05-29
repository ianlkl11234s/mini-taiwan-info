# PLAYBOOKS — 固定流程 SOP

> 同一操作做過 **≥ 2 次**才寫進來。
> 編號 PB-01 / PB-02 / ...，方便 commit 訊息引用「依 PB-03 走」。

---

## PB-01: 開新主題（含對應 ETL）

對應的事：把 disabled 主題（home-basics / fire / ...）升級到 v1.1 production。

```
1. 升級 themes/{theme}.yaml v1.0 → v1.1
   - 加 overview.color_metrics
   - 每個 kpi 加 response_shape + format.sentiment_when_up + group
   - 若有點位，加 overview.point_profile
   - meta.coverage_notes 改為結構化（affected_counties[id_moi]）

2. 對應 ETL pipeline（若需新資料）
   - 開 taipei-gis-analytics/pipelines/{theme}/{source}.py
   - 對應 migration: gis-platform/migrations/0XX_{table}.sql
   - 跑 dry-run → --full 灌入

3. Frontend queries
   - frontend/src/lib/queries/{theme}.ts（仿 water.ts 結構）
   - frontend/src/hooks/use{Theme}Kpis.ts
   - frontend/src/components/views/ViewA 接收 props

4. 開啟主題（去掉 disabled）
   - 在 themes/{theme}.yaml 改 status: draft → production

5. 驗證
   - pnpm typecheck
   - agent-browser 截圖
   - atomic commit per scope
```

## PB-02: 接新 Supabase RPC 到前端

```
1. 確認 RPC 存在
   grep -l "CREATE OR REPLACE FUNCTION public.{rpc_name}" ../gis-platform/migrations/

2. 加 query function
   frontend/src/lib/queries/{theme}.ts 加 fetchXxx(args)
   - 用 supabase.rpc('xxx', { p_arg: value })
   - 失敗 fallback 空陣列（不 throw）

3. 加 hook（多個 query 聚合時）
   frontend/src/hooks/useXxx.ts

4. 接到 component
   useEffect 或 hook 直接 destructure

5. typecheck + agent-browser eval 直接呼叫 RPC 驗證有資料
```

## PB-03: agent-browser 截圖驗證視覺改動

對應的事：改 layout / overlap / spacing 後不知道對不對。

```
1. 啟動 dev server（若沒啟動）
   cd frontend && pnpm dev   # http://localhost:5173

2. 開 agent-browser
   agent-browser --session-name miniti open http://localhost:5173

3. 設好 viewport（標準 1440x900 / 1440x1100）
   agent-browser --session-name miniti set viewport 1440 1100

4. 截圖
   agent-browser --session-name miniti screenshot /tmp/audit-xxx.png

5. Read 截圖
   Read /tmp/audit-xxx.png

6. 若視覺有問題：修 → 重複 4-5（不要 close session）
```

## PB-04: Apply migration + 跑 pipeline 流程

對應的事：寫好新 migration + 對應 pipeline，要安全 apply。

```
1. Apply migration（冪等檢查）
   grep -E "CREATE TABLE IF NOT EXISTS|DROP|TRUNCATE" .../0XX_*.sql
   ⚠️ 看到 DROP / TRUNCATE 要警惕

2. 預檢查 DB（表是否已存在、影響範圍）
   psql "$DATABASE_URL" -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='xxx');"

3. Apply
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f .../0XX_*.sql

4. Verify
   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM public.xxx;"

5. Pipeline dry-run
   cd ../taipei-gis-analytics && source venv/bin/activate
   python3 pipelines/{theme}/{source}.py --dry-run

6. Pipeline --full
   python3 pipelines/{theme}/{source}.py --full

7. Verify pipeline 結果
   psql "$DATABASE_URL" -c "SELECT COUNT(*), MIN(year), MAX(year) FROM public.xxx;"

8. 三 repo 個別 atomic commit
   - gis-platform: feat(migration): 0XX xxx
   - taipei-gis-analytics: feat(pipeline): datagov_xxx_yyy
   - mini-taiwan-info: feat(frontend): wire xxx to LIVE
```

## PB-05: Atomic commit 跨 repo

對應的事：一個邏輯改動跨多個 repo（如 092 + ViewC 接 timeseries），要分開 commit。

```
1. 每個 repo 各別 cd 進去
   cd /path/to/repo && git status

2. 用具體檔名 git add（避免誤觸用戶其他變動）
   git add specific/file.sql specific/file2.py
   ⚠️ 不要 git add -A 或 git add .

3. Commit with HEREDOC 多行訊息 + Co-Authored-By
   git commit -m "$(cat <<'EOF'
   feat(scope): xxx

   詳細說明...

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   EOF
   )"

4. 不自動 push（user 必須有 review 機會）

5. 完成後 git log --oneline -5 看一下
```

## PB-06: 縣市 SSOT 變動 cascade

對應的事：改 `data/counties.yaml`（加新縣市別名 / 修 centroid / 改 region 分組）。

```
1. 改 data/counties.yaml

2. 同步 frontend/src/lib/counties.ts（手寫對齊）
   - 三個 indices: byIdMoi / byCode3 / bySlug
   - NAME_ALIASES 補

3. 若改了 region 分組
   - PointProfile region-mode 會自動跟著（依 county.region）
   - reserveGeocode.ts 用 centroid，不影響

4. 若改了 area_km2
   - flood_hazard_pct_by_county MV 要 REFRESH
   - REFRESH MATERIALIZED VIEW public.flood_hazard_pct_by_county;

5. 對應 Supabase migration: 093_reference_counties.sql
   - 用 ON CONFLICT DO UPDATE 重跑
   - psql -f .../093_reference_counties.sql

6. typecheck + agent-browser 驗證
```

## PB-07: 用 git filter-repo 從歷史移除 secret

對應的事：commit 進歷史的 token / API key 被 GitHub secret scanning 擋 push。

```
1. Backup 整個 repo（filter-repo 不可逆）
   cp -r {repo} /tmp/{repo}.bak-pre-filterrepo
   du -sh /tmp/{repo}.bak-pre-filterrepo

2. grep 找出所有出現位置
   grep -rn "pk\.eyJ\|sk_\|AKIA\|ghp_\|gho_" \
     --include="*.{js,jsx,ts,tsx,md,yaml,json}" .

3. 修 working tree：把 token 改成 placeholder
   - JS 常數：改成 process.env.X || "__TOKEN_PLACEHOLDER__"
   - markdown：改成「__TOKEN_PLACEHOLDER__（實際 token 設於 .env）」

4. Commit working tree 改動
   git add <files> && git commit -m "chore(secrets): 用 placeholder 取代 ..."

5. 寫 replace.txt（一行一條 rule）
   <full_token>==><placeholder>
   存到 /tmp/replace.txt

6. Run filter-repo
   git filter-repo --replace-text /tmp/replace.txt --force
   → 所有 commit hash 改變
   → remote 自動被 remove（要重 add）

7. 重 add remote
   git remote add origin git@github.com:{org}/{repo}.git

8. Force push（這是 history rewrite 必須的）
   git push -u origin main --force

9. 驗證 token 真的清乾淨
   git log --all --full-history -p -S '<full_token_substring>' | head -5
   # 應該完全空輸出
```

**前置安裝**：`brew install git-filter-repo`

**注意**：
- filter-repo 預設禁止 fresh clone 之外的 repo（怕誤用），加 `--force` 跳過檢查
- co-authored commit 的 secondary author 不變
- 所有人重 clone 才會拿到 rewritten history，已有 local clone 的 collaborator 要 force reset
- 此操作不可逆，所以 step 1 backup 必跑

## PB-08: Atomic commit 拆 hunk（Bash 工具下）

對應的事：一輪改動跨 N 個邏輯單元（如 cycle 1 三個 P0 fix 都在 ViewA.tsx），要拆 N 個 atomic commit。

**為什麼不用 `git add -p`**：Bash 工具非互動式，跑 `git add -p` 會 hang。

```
1. backup 整 patch
   git diff > /tmp/cycle-full.patch

2. 看 hunks 確認可拆分
   git diff <file> | head -100
   → 確認 hunks 邏輯不重疊（同 region 改動只能合 commit）

3. Restore 涉及檔案到 HEAD
   git restore <file1> <file2> ...
   → working tree 變 clean

4. 用 Edit 工具 redo 第一個邏輯單元的改動
   → 只 apply 屬於 commit 1 的 hunks
   → typecheck（若 mode 要求）
   → git add <file> && git commit -m "..."

5. 重複 step 4 for commit 2, 3, ...

6. 最後 git status 確認 tree clean，git log --oneline 確認 N 個 commit
```

**Cycle 1 實例**：ViewA.tsx 有 5 hunks（interface / destructure / hookText / PointProfile callback / SimpleExplode label+slice），分屬 P0-1 (1,2,4)、P0-3 (3)、P0-4 (5)。restore + redo 三輪 Edit + 三次 commit。

**陷阱**：
- redo Edit 時若搞錯哪個 hunk 屬於哪個 commit，typecheck 會失敗 → 直接 git restore 重來，不要勉強
- 寫 commit message 時可參考 patch 上方 hunk 標頭 `@@ -X,Y +X,Y @@` 對應位置

## PB-10: ViewB IA 重組（Mode V Cycle）

對應的事：發現現有 7 tabs 結構名實不符 / 想依新觀念（如水循環層）重組。

```
1. user 拍板新 tab list（用 AskUserQuestion preview 配 ASCII layout）
   - 拍板每個原 tab 的內容歸宿（無 catch-all「基礎設施」）
   - 拍板新 tab 數（推薦 7，桌機可承受 8）

2. 改 themes/{theme}.yaml manifest（SSOT 先動）
   - county_dashboard.tabs[] 整批重編
   - 每 tab 加 coverage_notes 結構化警告
   - charts.query_args 對齊新 RPC

3. 改 ViewB.tsx code
   a. imports（換 icons）
   b. TabId type union 改
   c. TAB_DEFS array 改
   d. tab content routing 改
   e. 共用 helper extract（如 WaterQualitySection by stationType prop）
   f. 各 tab component 改/新建

4. 刪 unused code
   - 不再用的 helper function（如 PlaceholderTab）
   - unused imports

5. typecheck（每 1-2 個大改後跑）
   - manifest 改完 → 跑
   - ViewB 結構改完 → 跑
   - unused import 報錯 → 立刻刪

6. agent-browser 截每個新 tab
   - 至少 N 張（每 tab 一張）
   - 命名 /tmp/water-cycleX-tab-{id}.png

7. atomic commit 拆 2-3 個
   - commit 1: manifest 改
   - commit 2: ViewB 結構改 + 新 component
   - commit 3 (optional): unused code 清理
```

**Cycle B 實例**：water_quality / infrastructure 兩 tab 拆解到對應水體（reservoir/river/groundwater）+ supplies；新建 RiverTab/GroundwaterTab/FloodTab/SuppliesTab；WaterQualityTab → WaterQualitySection 共用 helper 由 stationType prop 鎖定。25 min 完成（含 typecheck loop + 截圖）。

**陷阱**：
- icon 別重複（lucide-react: rivers=Activity / groundwater=Layers / supplies=Recycle）
- function declaration 順序不重要（JS hoist），但保持邏輯順序便於閱讀
- 跨 tab 共用 component（如 WaterQualitySection）prop 設計要乾淨：stationType 必傳、param 內部 state



對應的事：本 session 跨 mini-taiwan-info + gis-platform + taipei-gis-analytics 都有改動，要全 push。

```
1. 各 repo 內個別跑 git fetch + 看 divergence
   for repo in mini-taiwan-info gis-platform taipei-gis-analytics; do
     cd /path/to/$repo && git fetch origin
     git rev-list --left-right --count origin/{main|master}...HEAD
   done

2. 依 divergence 決定方式：
   | 狀況 | 動作 |
   |---|---|
   | local ahead, remote 0 ahead | git push origin {branch} 直接 push |
   | local ahead, remote N ahead | git pull --rebase origin {branch} → 解 conflict（若有）→ push |
   | rejected by secret scanning | 走 PB-07 history rewrite + force push |
   | rejected by branch protection | 改開 PR / 找 admin |

3. mini-taiwan-info 預期最常見 secret-scanning 擋（designs/ 裡有 prototype）
4. gis-platform 預期最常見 fetch-first 擋（user 在其他 session 有 auto-sync commit）
5. taipei-gis-analytics 預期最 smooth（pipelines 工作零碎不易 conflict）

6. 全部 push 完跑各 repo `git status` 確認 tree clean
```

## PB-10: 開新主題完整 SOP（跨 3 repo，水→消防 第二輪驗證 2026-05-15）

對應的事：把 disabled 主題（home-basics / safety / demographics / ...）上到 ViewA production。

```
階段 0：規劃對齊
- 讀設計 brief（designs/v0X-{theme}-design-brief-YYYY-MM-DD/SPEC.md）
- 找對應後端 SSOT（taipei-gis-analytics/docs/systems/{theme}_tic.md）
- 確認 backend ready vs not-ready 清單 → 哪些 KPI 真實 / 哪些要 mock

階段 1：Backend wrapper（若 schema 非 public）
- 在 gis-platform 寫 wrapper migration 1XX_{theme}_public_wrappers.sql
  * View 加 WITH (security_invoker = true)
  * RPC wrapper 命名 public.{theme}_{function}
  * 對齊原 schema function 的 RETURNS TABLE 簽名（column 數量 + type 完全一致）
- psql apply + 驗證
  SELECT COUNT(*) FROM public.{theme}_xxx;

階段 2：Frontend manifest
- 升級 themes/{theme}.yaml 到 v2 對齊設計 SPEC.md 4 區塊
- color_metrics 4 個（choropleth 候選）
- kpis 含 4 區塊全部，placeholder 用 coverage_note 標 Sprint X
- layers_catalog 4 個圖層
- meta.version 2.0.0 + coverage_notes 結構化
- 備份 v1：themes/{theme}.yaml.v1.bak（commit 後刪）

階段 3：Data layer
- lib/queries/{theme}.ts
  * 從 supabase（public schema）拉 wrapper views/RPCs
  * bigint/numeric → number 強制轉
  * derivation helpers (national / county / cause / 時間切片 / ...)
- hooks/use{Theme}Data.ts
  * Promise.all 並行 fetch
  * { enabled } 旗標控制（只在對應主題啟用）
- lib/mock-{theme}.ts
  * 所有 placeholder 數據明標「待 Sprint X ETL」

階段 4：Components（11 個慣性）
- components/{theme}/
  * {Theme}CatHeader (numbered section header)
  * {Theme}BarRow (bar/line 自動切換)
  * {Theme}Donut + Legend
  * {Theme}Scatter (若主題有量能落差類別)
  * {Theme}Tables (1-2 個慣性 table component)
  * sections/S1{Topic}.tsx 區塊 1（真實）
  * sections/S2/S3/S4.tsx 區塊 2-4（mock / 半真實）
- components/views/ViewA{Theme}.tsx 主入口
  * loading / error / Hero（顯實際 DB count）
  * 4 區塊組裝

階段 5：CSS
- styles/globals.css append 區塊樣式
  * .cat-block / .cat-head / .cat-badge.tone-*
  * .{theme}-bar-row / donut / scatter / table 系列
  * S4 grid 用單欄（避免擠垮）

階段 6：App routing
- App.tsx 加 THEME_ACCENT_VARS.{theme}
- view === "A" 時 conditional render ViewA / ViewA{Theme}
- useFireData 等 hook 用 { enabled: theme === '{theme}' } 省 RPC quota
- TwoSectionLayers 對非水主題傳 pointLayers={[]}（避免誤顯水主題層）
- goCity 對未實作 ViewB 的主題改 highlight-only

階段 7：驗證
- pnpm typecheck pass
- pnpm dev 啟動，agent-browser 截圖 4 區塊
- Dispatch codex review（critical 必修，improvement 可待）
- 視覺驗證後再 commit

階段 8：Atomic commits（順序）
1. feat({theme}-schema): wrapper migration（gis-platform）
2. feat({theme}-etl): 對應 pipeline / upload script（taipei-gis-analytics，若有）
3. feat({theme}-manifest): themes/{theme}.yaml v2
4. feat({theme}-frontend): queries + hook + mock
5. feat({theme}-frontend): components
6. feat({theme}-frontend): CSS + App routing
7. docs({theme}): impl-status memo
```

**陷阱**（從 fire 學到）：
- PostgREST `withSchema("xxx")` 報 "Invalid schema" → 改走 public wrapper
- Wrapper RPC 簽名要跟原 RPC `pg_get_function_result` 完全一致（fire.list_incidents 第一次寫錯 column 數，rework）
- MapView 寫死的水主題層（river-basins, river-lines）→ 對其他主題加 `show{Theme}BaseLayers` prop
- KPI 4 欄在 40% dashboard pane 太擠 → cols-4 響應式必加 @media (max-width: 1500px) → 2x2

**配套 PB**：PB-01 升級 v1.1（單檔 yaml）/ PB-02 接 RPC（單 RPC）/ PB-10 整個主題上線

---

## PB-12: 移植 design bundle 元件 4 步 SOP（防純文字 fallback）

對應的事：從 `/tmp/{theme}_design/.../js/{view}.jsx` 移植元件到 `frontend/src/components/`。

**問題出現**：B046 ViewBFire.tsx 寫完 typecheck 過、dev server 看起來「跟 word 沒兩樣」一片純文字。grid / background / border 全 fallback 預設，因為 JSX className 對應的 styles.css section 沒移植過來。

**4 步流程**：

```bash
# 1. Read 完整 jsx file（不是只 grep 結構）
Read /tmp/{theme}_design/.../js/{view}.jsx

# 2. Grep 對應 styles.css 的所有 className 區段
grep -n "className=\"[^\"]*\"" /tmp/.../{view}.jsx | \
  sed -E 's/.*className="([^"]*)".*/\1/' | tr ' ' '\n' | sort -u
# 取得 className list，再 grep:
grep -n "^\.{class1}\|^\.{class2}\|..." /tmp/.../styles.css

# 3. TS strict 化 JSX 寫到 frontend/src/components/views/{ViewName}.tsx
#    - 把 window.* 全域 → import
#    - 把 mock data 替換成真實 fetch（migration 對應的）
#    - 加 TypeScript Props interface + null handling

# 4. Append CSS 到 globals.css 對應主題段
Read 對應 styles.css 區段（line A-B）
# Append 到 globals.css 末尾的 "/* ============ {theme} 主題 ============ */" 段

# 5. 確認 design 用的 CSS 變數在 globals.css :root 已定義
grep "var(--accent-{theme}" /tmp/.../styles.css | sort -u
grep "^  --accent-{theme}" frontend/src/styles/globals.css
# 缺的補進 :root

# 6. 加響應式 media query 防 dashboard pane 窄時擠垮
# 多欄 grid 元件加：
@media (max-width: 1200px) {
  .{component}-card { grid-template-columns: 1fr; }
}
```

**陷阱**（從 Session 5 + 6 學到）：
- Session 5 移植 fire ViewA 時只 append 用到的 fire-* CSS → ViewB 加新元件爆。**一勞永逸**做法：跑步驟 2 取完整 className list 後，把整套主題 CSS 一次 append（即使本 cycle 只用到部分）
- design bundle 的 CSS 變數命名可能跟 globals 不一致（如 `--accent-fire-deep` vs `--accent-deep`）→ 步驟 5 一定要驗
- `dashboard-pane` 內 fixed-px column 在 < 1200px 會擠垮 → 響應式 media 必加

**自驗指令**：
```bash
# 寫完 component 後，grep 全部用到的 fire-* className 有沒對應 CSS rule:
for cls in $(grep -oE 'className="[^"]*"' frontend/src/components/views/ViewBFire.tsx | \
             grep -oE '[a-z]+-[a-z0-9-]+' | sort -u); do
  count=$(grep -c "\.$cls" frontend/src/styles/globals.css)
  echo "$cls: $count"
done
# 0 表示該 className 沒 CSS rule → 必補
```

**配套 PB**：PB-10 開新主題（含設計階段）+ PB-12 移植 component（執行階段）

---

## PB-13: Design bundle handoff → per-theme ViewA rewrite SOP（fire S5 + water S8 二次驗證）

對應的事：user 收到 design bundle handoff URL（claude.ai/design 匯出的 HTML/CSS/JS prototype），要重構某主題的 ViewA。和 PB-10 不同：**PB-10 是「初次上 production」**（schema 從零接），**PB-13 是「重做既有 production 主題的 ViewA」**（資料端通常已 ready 90%+，重點是版型革新 + 接通新增資料元素）。

```
階段 1：解開 + 讀懂 design bundle（30-60min）
- curl -sL <URL> -o /tmp/design.bin && gunzip → tar -xf 到 /tmp/{theme}_design/extracted/
- Read 必讀 4 個：
  * README.md（handoff 指引）
  * chats/chatN.md（user 跟設計助手的最後共識；通常 final design 在最後幾條）
  * project/{Theme} Info.html（看 import 順序）
  * project/js/view-X.jsx 對應主檔（jsx 結構 = 最終設計骨架）
- 額外掃：styles.css 對應 className 區段 / data.js mock data shape / kpi.jsx + charts.jsx 元件 API

階段 2：Discovery 4 agent 並行（10-15min real time）
- A. Baseline 截圖：dev server + agent-browser 截現有 ViewA 4 寬度（1920/1280/1100/800）→ /tmp/{theme}_design/baseline/
- B. 後端資料 audit：跨 3 repo 確認 migrations 已 apply / pipelines 跑過 / 表內容（psql `\d` + COUNT）
  ⚠️ 「規劃 doc 不等於實際 deploy」— 必須 psql 直查實際 schema，不只信 docs/data-catalog/*.md
- C. 設計 → 資料 mapping：對齊每章每元素 vs 後端能否提供，產 ✅/🟡/❌ 三分類
- D. Frontend 現況掃描：lib/queries / hooks / components 現有 export shape + 缺哪些 query/hook/section

階段 3：Mini-audit（5-10min）
- discovery C 列出的 🟡 「能算」項，psql 跑一次 sample 確認資料密度足
- 典型撞牆：(a) snapshot 表只保留 30 天，跨年比對「vs 歷年同期」算不出 (b) 月表只有 1 個月，畫 12 月 trend 算不出 (c) sector 欄位設計上沒 → mock + badge
- mini-audit 完成後 list spec 改 / mock / 接真實 三類

階段 4：Plan checkpoint（user 拍板）
- AskUserQuestion 拍 3 件事：每章接真實 vs mock 策略 / 缺資料章節處置 / hook 架構（單一大 hook vs 多 hook）
- 拍完進 TaskList 拆 sub-task

階段 5：Execute（順序很重要）
1. **搬 CSS**：sed -n 對應 line range，append 到 globals.css 末段
   ⚠️ 跳過已存在的共用 class（如 .cat-block 從 fire 已搬，水主題不重複）
2. **寫 new queries**：lib/queries/{theme}-overview.ts 新檔，含 fetch + 聚合 helper
   ⚠️ psql `\d table_name` 確認實際 schema（規劃 doc 命名可能錯：PK / column / suffix）
3. **擴充對應主題 hook**：useXxxKpis 改 Promise.allSettled + helper get<T>，state 加新欄位
4. **建 ViewX{Theme}.tsx + section 子元件**：仿既有 fire 結構，含 hero loading/error early return + S1...S6
5. **改 App.tsx 加 theme 分派**：theme === "X" ? <ViewX{Theme}/> : ...

階段 6：Verify 三閘
1. typecheck：每寫完一個檔自動 PostToolUse hook 跑，全部完成後 final pnpm typecheck
2. 截圖 agent：dev server + agent-browser 截 4 寬度，與 baseline 對比，看新版 6 章顯示 + console error
3. codex review：對 8 新檔 + 2 改檔做 critical bug 抓。**focus: Promise.all/allSettled 模式 / null safety / React key / 事件流 / PostgREST select 寫法**
   ⚠️ codex 對 schema mismatch 是盲區（看不到實際 DB）— 截圖 agent 的 console 才能抓到「column does not exist」400 error

階段 7：Atomic commits 5 個（順序）
1. style({theme}-ui): 搬 N 章敘事 CSS 到 globals.css
2. feat({theme}): 新增 ViewA N 章敘事的 query 集
3. refactor({theme}): 擴充 useXxxKpis 為單一大 hook + Promise.allSettled
4. feat({theme}-ui): ViewX{Theme} N 章敘事 + App 主題分派
5. docs(memory): {theme} ViewA rewrite cycle status + N backlog 項

階段 8：Cross-repo push（user 拍板）
- 通常 design bundle handoff = 純前端，無 gis-platform / taipei-gis 變動
- /cross-repo-status 看其他 repo dirty（不在本 cycle scope，user 拍板獨立處理）
```

**fire vs water 案例對照**：

| 階段 | fire (Session 5) | water (Session 8) |
|---|---|---|
| design bundle 規模 | 4 區塊 | 6 章 |
| 後端就緒度 | 跨 schema wrapper 待做（migration 104） | 90% ready（migration 098-102 已 apply） |
| Mini-audit 觸發 | 無（schema 待擴）| 有，校正 3 個 spec |
| 重大撞牆 | PostgREST 不 expose fire schema | 規劃 doc 表名 ≠ 實際 schema 表名 |
| commit 顆粒度 | 6（含 schema + 多階段） | 5（純前端） |

**配套 PB**：
- PB-10：第一次上 production（schema 待擴）
- PB-12：移植 design component（防純文字 fallback）
- PB-13：本檔（既有主題 ViewA 重寫）

---

## PB-15: Supabase count-only fetch（避免下載大表）

對應的事：要顯示全國某 KPI 的 COUNT（如「全國消防栓 39,395」），但表很大（39k+ 列）不想 download 全部 row。

```ts
const { count, error } = await db
  .from("table_name")
  .select("primary_key_col", { count: "exact", head: true });
if (error) throw error;
return count ?? 0;
```

關鍵：
1. `head: true` — 只回 metadata + count，不回 row data
2. `count: "exact"` — 精確值（vs `estimated` 快但近似）
3. `.select("某欄位")` 必須給一個欄位（通常 PK），即使 head=true 也要
4. 回傳是 `{ count, error, data: null }`，typecheck 注意 `count` 是 `number | null`

何時用：
- KPI 卡只顯示 COUNT，不需要明細
- 表 > 1000 row（< 1000 直接 fetch all 也 OK 反正不慢）
- 要 by-county count 仍要 fetch 全表 + 前端 reduce（PostgREST 沒原生 GROUP BY），這時 count-only 不適用

例：`fetchFireHydrantNationalCount` / `fetchShelterNationalCount` / `fetchFireStationsNationalCount`（Session 9）。

---

## PB-16: Batch wrapper migration（一次包多個 public.X view）

對應的事：一次新增 N 張 schema 表（fire / safety / ems）都要曝光到 public 給 PostgREST，逐張寫 migration 太碎。

**模式**（取自 `gis-platform/migrations/109_fire_safety_public_wrappers_batch.sql`）：

```sql
BEGIN;

-- 1) 分組註解（點位 / 統計 / EMS / 災變）
DROP VIEW IF EXISTS public.fire_xxx;
CREATE VIEW public.fire_xxx WITH (security_invoker = true) AS
  SELECT col1, col2, ... FROM fire.xxx;
-- (重複 N 個)

-- 2) GRANT 集中收尾
GRANT SELECT ON public.fire_xxx TO anon, authenticated;
-- ...

-- 3) COMMENT 集中收尾
COMMENT ON VIEW public.fire_xxx IS 'public-schema wrapper of fire.xxx (N rows, ...)';
-- ...

COMMIT;
```

關鍵：
1. `DROP VIEW IF EXISTS + CREATE VIEW` 冪等（重跑無副作用）
2. `security_invoker = true` 讓 RLS 跟著呼叫者（底層表已 anon SELECT policy）
3. `BEGIN/COMMIT` 包整段 — 任一失敗全 rollback（資料一致）
4. COMMENT 寫實際 row count 跟覆蓋率 footnote（如「2020 only」「KHH-only」）給未來 audit 看
5. Apply 後立即 `SELECT * FROM public.X LIMIT 1` 驗 14/14

何時用：
- 一次 ≥ 3 個新 schema 表要曝光
- 同主題系列（fire 系列 / safety 系列）一起做

**陷阱**：批次跑失敗，整段全 rollback。所以**寫完先 psql `\d xxx`**驗每張表欄位確實存在，不憑記憶。

例：Session 9 migration 109 一次 14 view。

---

## PB-17: County-granularity event-table dedup-by-name

對應的事：fetch event 類 table（如 `fire.disaster_incidents` 55,798 county-level row），用於 timeline UI 顯示「最近 N 個事件」。row 數很大但 unique disaster 才 ~15 — 直接 ORDER BY date DESC LIMIT 6 拿到的全是同名颱風重複。

**現象**：UI 顯示「天兔颱風 / 天兔颱風 / 天兔颱風 / 天兔颱風 / 天兔颱風 / 天兔颱風」（全是同一颱風在不同縣市的 record）。

**對策 — 前端 dedup**：

```ts
const acc = new Map<string, AggRow>();
for (const d of fetched) {
  const prev = acc.get(d.disaster_name);
  if (!prev) acc.set(d.disaster_name, { ...d });
  else {
    prev.deaths = (prev.deaths ?? 0) + (d.deaths ?? 0);
    prev.injuries = (prev.injuries ?? 0) + (d.injuries ?? 0);
    if (d.occurred_date > prev.occurred_date) prev.occurred_date = d.occurred_date;
  }
}
return [...acc.values()].sort((a, b) => a.occurred_date > b.occurred_date ? -1 : 1).slice(0, N);
```

關鍵：
1. **fetch limit 要 bump**：N=6 dedup 結果需要拿到 ≥ 6 unique disaster_name，所以 fetch `limit: 2000` 確保涵蓋（fetch 200 不夠）
2. **SUM deaths/injuries** 跨縣市加總 — 表 county-level，總和才是事件全面影響
3. **保留較新 date** — 同名事件可能跨日，timeline 取最新

何時用：
- Event-type table（disaster / incident / report 類），row granularity = county or town
- UI 是 timeline / news-card 不該重複的場景

**反模式**：用 `.select('disaster_name', { count: 'exact' })` 試圖 server-side distinct — PostgREST 不支援 DISTINCT。要 server-side 唯一就寫 RPC：

```sql
CREATE FUNCTION public.fire_disaster_unique_recent(p_limit INT)
RETURNS TABLE(disaster_name TEXT, latest_date DATE, total_deaths BIGINT, ...)
LANGUAGE sql STABLE AS $$
  SELECT disaster_name, MAX(occurred_date), SUM(deaths), ...
  FROM fire.disaster_incidents
  GROUP BY disaster_name
  ORDER BY MAX(occurred_date) DESC
  LIMIT p_limit;
$$;
```

但 11 row 結果用 RPC 過度（前端 dedup 也 OK）— Trade-off：< 5000 row 前端 dedup 簡單可控；> 5000 走 RPC 省 bandwidth。

例：Session 9 `S4Others.tsx` `disasterTimeline` + `ViewBFire.tsx OthersTab events`。

---

## PB-18: monorepo 子目錄 app 的 Zeabur GitHub 部署（root Dockerfile 法）

**情境**：app 在 `frontend/` 子目錄，要走 Zeabur GitHub 自動部署（push 觸發重建）。直接連 repo 會讓 zbpack 從根掃描 → 誤判 static → serve 空根 → 404。

**SOP**：
1. **repo 根放 `Dockerfile`**（不是只放 frontend/）：zbpack 偵測到根 Dockerfile → 必選 docker plan。內容以 repo 根為 build context，保留 build 必需的跨目錄相對結構，從子目錄 build：
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
   COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
   RUN cd frontend && pnpm install --frozen-lockfile
   ARG VITE_... ; ENV VITE_...=$VITE_...
   COPY frontend/ ./frontend/
   COPY themes/ ./themes/          # build glob ../../../themes 需要 sibling
   RUN cd frontend && pnpm build
   FROM nginx:alpine AS runner
   COPY frontend/nginx.conf /etc/nginx/nginx.conf
   COPY --from=builder /app/frontend/dist /usr/share/nginx/html
   EXPOSE 8080
   ```
2. **root `.dockerignore`**：保留 build 必需的跨目錄依賴（此專案 `themes/`），排除 data/designs/docs/samples + frontend/node_modules 縮小 context。
3. **VITE_ 變數**設為 Zeabur build-arg（service variables）；build 前確認 `@types/node` 等 tsc 範圍依賴在 lockfile。
4. **本機驗證**（Docker daemon 開著時）：`docker build -t test .`；否則至少 `cd frontend && pnpm build` 確認。
5. push → Zeabur 自動 build。確認 `deployment list` 的 **PLANTYPE=docker**（非 static）。
6. **build 成功但 deploy 卡 FAILED**：`npx zeabur@latest service restart --id <svc>` 強制切到新 image。
7. 驗證：`curl -o /dev/null -w "%{http_code}" https://<domain>/` = 200 + 含 `/assets/index-*.js`。

**不要用**：`zbpack.json app_dir` / `ZBPACK_APP_DIR` env — 實測無法把 static plan 導回子目錄（2026-05-29 S11 踩過）。

完整事件：INCIDENTS 2026-05-29、DEPLOYMENT.md §九。
