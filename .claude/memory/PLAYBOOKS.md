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
