#!/usr/bin/env python3
"""把「已搬出 Supabase 的靜態表」在刪除前凍結成 public/data/frozen/*.json（2026-11-09，WA-3 §C 乙組）。

背景：ADR-0026「不會變的資料不放 Supabase」。下列表的資料都不再更新，Supabase 端要刪表，
前端改讀這裡產生的靜態檔（src/lib/queries/frozen.ts）。每個檔的內容＝原本前端查詢的結果，
JSON 格式照 PostgREST（json_agg，TimeZone=UTC），所以 query 函式回傳值與改前相同。

| 檔 | 原本的查詢 | 來源表（已刪或待刪；原始資料正本在 S3 supabase-export/<schema>.<table>/full-20261109.csv.gz）|
|---|---|---|
| storm_drain_counts.json | storm_drainage_manholes／_pipes 依 county 計數 | public.storm_drainage_manholes、public.storm_drainage_pipes |
| disaster_incidents_latest.json | fire_disaster_incidents 依 occurred_date 新到舊：全國前 2000 筆、各縣市前 50 筆 | fire.disaster_incidents |
| forest_fire_risk_summary.json | fire_forest_fire_risk_snapshot 風險等級分布 | fire.forest_fire_risk_snapshot |
| water_quality_county_summary.json | get_water_quality_county_summary(param, 365, type)：10 參數 × 4 種測站類型 | public.water_quality_readings |
| water_quality_stations_latest.json | get_water_quality_station_latest(NULL, NULL)：全部測站＋最新一筆，前端再篩類型與縣市 | public.water_quality_readings |

水質「近 365 天」凍結的是 2026-11-09 當天的結果；資料本身已停更（最新 2026-08-24），
原本的即時查詢會隨時間逐漸變空。

用法（只在來源表還在時能跑；唯讀交易）：
    SUPABASE_DB_URL=... python3 frontend/scripts/freeze-supabase-snapshots.py [檔名 ...]
"""
import json
import os
import sys
from pathlib import Path

import psycopg2

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "frozen"

DIS_COLS = ("incident_id,disaster_name,occurred_at,occurred_date,county_id,county_name_raw,"
            "town,incident_type,deaths,injuries,data_source")
# 與原 PostgREST 查詢相同只依 occurred_date 排序（同日多筆的先後沿用資料庫回傳順序，與改前一致）
DIS_ORDER = "occurred_date DESC"
WQ_PARAMS = ["DO", "BOD", "pH", "COD", "TOC", "EC", "SS", "NH3N", "RPI", "CTSI"]
WQ_TYPES = ["river", "reservoir", "groundwater", None]

JOBS = {
    "storm_drain_counts": """
        SELECT json_object_agg(county, json_build_object('manholes', mh, 'pipes', pp) ORDER BY county)
        FROM (SELECT county, sum(mh)::int AS mh, sum(pp)::int AS pp FROM (
                SELECT county, count(*) AS mh, 0 AS pp FROM public.storm_drainage_manholes GROUP BY county
                UNION ALL
                SELECT county, 0, count(*) FROM public.storm_drainage_pipes GROUP BY county) u
              WHERE county IS NOT NULL GROUP BY county) t""",
    "forest_fire_risk_summary": """
        SELECT json_build_object(
          'total', (SELECT count(*) FROM public.fire_forest_fire_risk_snapshot),
          'by_level', (SELECT json_object_agg(lvl, n ORDER BY lvl) FROM (
              SELECT coalesce(risk_level_chinese, '未知') AS lvl, count(*) AS n
              FROM public.fire_forest_fire_risk_snapshot GROUP BY 1) l),
          'high_risk_count', (SELECT count(*) FROM public.fire_forest_fire_risk_snapshot WHERE risk_level >= 3))""",
    "water_quality_stations_latest": """
        SELECT coalesce(json_agg(t), '[]'::json) FROM public.get_water_quality_station_latest(NULL, NULL) t""",
}


def disaster_latest(cur):
    cur.execute(f"SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT {DIS_COLS} FROM public.fire_disaster_incidents "
                f"ORDER BY {DIS_ORDER} LIMIT 2000) t")
    national = cur.fetchone()[0]
    cur.execute("SELECT DISTINCT county_id FROM public.fire_disaster_incidents WHERE county_id IS NOT NULL ORDER BY 1")
    by_county = {}
    for (cid,) in cur.fetchall():
        cur.execute(f"SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT {DIS_COLS} FROM public.fire_disaster_incidents "
                    f"WHERE county_id = %s ORDER BY {DIS_ORDER} LIMIT 50) t", (cid,))
        by_county[cid] = cur.fetchone()[0]
    return {"national": national, "by_county": by_county}


def wq_summary(cur):
    out = {}
    for p in WQ_PARAMS:
        for ty in WQ_TYPES:
            cur.execute("SELECT coalesce(json_agg(t), '[]'::json) FROM public.get_water_quality_county_summary(%s, 365, %s) t",
                        (p, ty))
            out[f"{p}:{ty or 'all'}"] = cur.fetchone()[0]
    return out


def main():
    want = set(sys.argv[1:])
    conn = psycopg2.connect(os.environ["SUPABASE_DB_URL"], connect_timeout=15)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("BEGIN READ ONLY")
    cur.execute("SET LOCAL statement_timeout = '120s'")
    cur.execute("SET LOCAL TimeZone = 'UTC'")
    OUT.mkdir(parents=True, exist_ok=True)
    names = list(JOBS) + ["disaster_incidents_latest", "water_quality_county_summary"]
    for name in names:
        if want and name not in want:
            continue
        if name == "water_quality_county_summary":
            data = wq_summary(cur)
        elif name == "disaster_incidents_latest":
            data = disaster_latest(cur)
        else:
            cur.execute(JOBS[name])
            data = cur.fetchone()[0]
        path = OUT / f"{name}.json"
        path.write_text(json.dumps({"generated_at": "2026-11-09", "data": data}, ensure_ascii=False,
                                   separators=(",", ":")) + "\n")
        print(f"{name}: {path.stat().st_size / 1024:.0f} KB")
    cur.execute("ROLLBACK")


if __name__ == "__main__":
    main()
