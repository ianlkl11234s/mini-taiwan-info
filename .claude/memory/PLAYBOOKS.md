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
