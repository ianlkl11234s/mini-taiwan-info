# 🚒 Fire Theme Frontend Implementation — Status

**Session**: 2026-05-15
**Scope**: ViewA fire 全套 + 接所有現有真實資料 + 缺的全標 placeholder (user 拍板)
**Design source**:
- `designs/v03-fire-design-brief-2026-05-15/SPEC.md`
- Anthropic bundle: `/tmp/fire_design/mini-taiwan-info/project/`

## Backend ready (real data)

- ✅ `fire.incidents` (48,626 rows, 111-113 民國年)
- ✅ `fire.cause_taxonomy` (22 細項 + 5 大類 mapping)
- ✅ MV `fire.incidents_by_county_year` (66 rows)
- ✅ MV `fire.incidents_by_cause_year` (45 rows)
- ✅ MV `fire.incidents_by_hour_month` (5430 rows)
- ✅ MV `fire.incidents_by_day_of_year` (15275 rows)
- ✅ RPC `fire.aggregate_fire_count(p_year, p_county_id, p_group_by)`
- ✅ RPC `fire.list_incidents(...)` — for map heatmap drilldown

## Backend NOT ready (placeholder needed)

- ❌ `fire.stations` (Sprint 2)
- ❌ `fire.hydrants` (Sprint 2)
- ❌ `fire.casualty_property_by_county_year` 含財損 (Sprint 1 — TODO-3)
- ❌ `fire.incidents_by_location_type` (Sprint 1 — TODO-3)
- ❌ `fire.stations_density_by_county` (Sprint 3)
- ❌ `fire.service_coverage_by_county` (Sprint 3)
- ❌ `fire.ems_stats_*` / `emergency_hospitals` / `forest_fire_risk_snapshot` (Sprint 4)

## Task breakdown (sequential where dependency, parallel where independent)

| # | Task | Owner | Status |
|---|---|---|---|
| F0 | `themes/fire.yaml` v2 align design | main | ⬜ |
| F1 | `lib/queries/fire.ts` (queries + types) | main | ⬜ |
| F2 | `hooks/useFireData.ts` | main | ⬜ |
| F3 | View + 4 區塊 components + shared charts | main+agents | ⬜ |
| F4 | CSS additions for fire components | agent | ⬜ |
| F5 | `App.tsx` routing for fire theme | main | ⬜ |
| F6 | typecheck | main | ⬜ |
| F7 | codex review | codex agent | ⬜ |
| F8 | agent-browser screenshot verify | agent-browser | ⬜ |
| F9 | atomic commits | main | ⬜ |

## Real-data → component mapping

| Component | Data source | Real? |
|---|---|---|
| KPI 年度火災件數 | `incidents_by_county_year` SUM | ✅ |
| KPI 死亡/受傷 | `incidents_by_county_year` SUM | ✅ |
| KPI 火災財損 | mock | ❌ 待 TODO-3 |
| KPI 主因件數 % | `incidents_by_cause_year` JOIN taxonomy | ✅ |
| 時間長條 年 | `incidents_by_county_year` GROUP BY year | ✅（限 111-113）|
| 時間長條 月 | `incidents_by_hour_month` GROUP BY month | ✅ |
| 時間長條 日 | `incidents_by_day_of_year` | ✅ |
| 時間長條 時 | `incidents_by_hour_month` GROUP BY hour | ✅ |
| 佔比 早中晚 | `incidents_by_hour_month` 4-bucket | ✅ |
| 佔比 5 大類 | `incidents_by_cause_year` + taxonomy | ✅ |
| 佔比 縣市 | `incidents_by_county_year` | ✅ |
| 佔比 傷亡 | derive from incidents（deaths/injuries flag）| ✅ |
| 佔比 處所 | mock | ❌ 待 TODO-3 |
| 縣市排名表 | `incidents_by_county_year` JOIN counties | ✅ |
| 起火原因表 5+22 | `incidents_by_cause_year` + taxonomy | ✅ |
| 起火處所表 | mock | ❌ 待 TODO-3 |
| 區塊 2 分隊地圖 | mock + placeholder layer | ❌ Sprint 2 |
| 區塊 2 消防栓表 | mock + placeholder | ❌ Sprint 2 |
| 區塊 3 KPI 量能 | mock | ❌ Sprint 3 |
| 區塊 3 散布圖 | derive 火災密度 from real + mock 分隊密度 | 🟡 半真實 |
| 區塊 3 量能對照表 | mock | ❌ Sprint 3 |
| 區塊 4 全部 | mock + placeholder | ❌ Sprint 4 |

## Acceptance criteria

- [ ] typecheck pass
- [ ] dev server runs without console errors
- [ ] agent-browser screenshot shows all 4 區塊 rendered
- [ ] mock 區塊 visible 標記「待 ETL」/「Sprint X」
- [ ] codex review pass（critical issues fixed）
- [ ] git log shows atomic commits for each F-step
