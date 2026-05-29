/**
 * snapshot-static-data.ts
 * ---------------------------------------------------------------------------
 * Build-time 固化腳本：把「純靜態（C 級）」與（可選）「半靜態（B 級）」的
 * Supabase query 結果抓下來，存成 public/data/snapshots/*.json，附 generated_at
 * ISO 時戳，讓前端 runtime 可以「先讀 snapshot、再決定要不要打 API」。
 *
 * 設計原則
 * ---------------------------------------------------------------------------
 * - 不修改任何現有 runtime query。本腳本是「離線抓取器」，自帶查詢定義，
 *   query 定義刻意與 src/lib/queries/* 鬆耦合（複製 SQL/table 意圖，不 import），
 *   避免把 build script 綁進 Vite 的 module graph。
 * - 只讀 anon key（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY），RLS 已開
 *   anon SELECT，不需要 service_role。
 * - 失敗可重試（指數退避），單一 query 失敗不會中斷整批 —— 寫入 _manifest.json
 *   記錄成功 / 失敗，供 CI 判讀。
 *
 * 執行方式
 * ---------------------------------------------------------------------------
 *   # 只抓 C 級（純靜態），預設行為
 *   npx tsx frontend/scripts/snapshot-static-data.ts
 *
 *   # 連 B 級（月度/季度）一起抓
 *   npx tsx frontend/scripts/snapshot-static-data.ts --include-b-tier
 *
 *   # 額外 gzip 壓縮（產生 *.json.gz）
 *   npx tsx frontend/scripts/snapshot-static-data.ts --gzip
 *
 *   # 指定輸出目錄
 *   npx tsx frontend/scripts/snapshot-static-data.ts --out public/data/snapshots
 *
 * 不引入新 runtime dependency：只用 @supabase/supabase-js（已是專案 dep）
 * 與 Node 內建模組（fs / path / zlib / url）。
 *
 * 注意：A 級（真 LIVE）資料故意不收，因為固化 = 提供過期資料的假象。
 *   A 級永遠 runtime 打 API。詳見 docs/DATA_TIERING.md。
 * ---------------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// 型別
// ---------------------------------------------------------------------------

type Tier = "B" | "C"; // A 級不收

interface SnapshotJob {
  /** 輸出檔名（不含副檔名），同時是 snapshot key */
  key: string;
  /** 分級：C = 純靜態（永遠抓），B = 半靜態（--include-b-tier 才抓） */
  tier: Tier;
  /** 人類可讀說明，會寫進 meta */
  description: string;
  /** 實際抓資料的函式，回傳要序列化的 payload */
  run: (sb: SupabaseClient) => Promise<unknown>;
}

interface SnapshotMeta {
  key: string;
  tier: Tier;
  description: string;
  generated_at: string; // ISO 8601
  row_count: number | null;
  source: string; // 'supabase'
}

interface SnapshotFile {
  __meta: SnapshotMeta;
  data: unknown;
}

interface ManifestEntry {
  key: string;
  tier: Tier;
  file: string;
  generated_at: string;
  row_count: number | null;
  status: "ok" | "error";
  error?: string;
}

// ---------------------------------------------------------------------------
// CLI 旗標
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const includeBTier = argv.includes("--include-b-tier");
  const gzip = argv.includes("--gzip");
  const outIdx = argv.indexOf("--out");
  const outArg = outIdx >= 0 ? argv[outIdx + 1] : undefined;
  return { includeBTier, gzip, outArg };
}

// ---------------------------------------------------------------------------
// .env 載入（不依賴 dotenv）
// 依序找：frontend/.env.local → frontend/.env → process.env
// ---------------------------------------------------------------------------

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // 去掉前後引號
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

async function loadEnv(frontendDir: string): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};
  const candidates = [".env", ".env.local"]; // .env.local 後讀 = 優先
  for (const name of candidates) {
    const file = path.join(frontendDir, name);
    try {
      const content = await fs.readFile(file, "utf8");
      Object.assign(merged, parseEnvFile(content));
    } catch {
      // 檔案不存在，略過
    }
  }
  // process.env 最高優先（CI 注入）
  for (const k of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
    if (process.env[k]) merged[k] = process.env[k] as string;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// 重試
// ---------------------------------------------------------------------------

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 600,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = baseDelayMs * 2 ** i;
      // eslint-disable-next-line no-console
      console.warn(
        `  ↻ ${label} 第 ${i + 1}/${attempts} 次失敗，${wait}ms 後重試：${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/** 小工具：把 supabase 回傳的 { data, error } 攤平、error 直接 throw */
async function sel<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
  return data;
}

// ---------------------------------------------------------------------------
// Snapshot 任務定義
// ---------------------------------------------------------------------------
// 命名與分級依 docs/DATA_TIERING.md。每個 job 的 run() 自帶查詢意圖，
// 與 src/lib/queries/* 鬆耦合（不 import runtime query，避免循環/打包問題）。
//
// table / RPC 名稱以「public wrapper」為準（PostgREST 只 expose public，
// 非 public schema 需走 public.{schema}_* wrapper，見 PRINCIPLES 2026-05-15）。
// 若某 wrapper 尚未存在，該 job 會在 manifest 標 error，不影響其他 job。
// ---------------------------------------------------------------------------

function buildJobs(): SnapshotJob[] {
  return [
    // ===================== C 級：純靜態 =====================
    {
      key: "national-territory",
      tier: "C",
      description: "全國基本常數（22 縣市疆域 / 面積 / TERRITORY 常數）",
      run: (sb) => sel(sb.from("reference_counties").select("*")),
    },
    {
      key: "ports-directory",
      tier: "C",
      description: "港口名錄（約 277 筆，靜態地理點位）",
      run: (sb) => sel(sb.from("maritime_ports").select("*")),
    },
    {
      key: "rail-stations",
      tier: "C",
      description: "車站名錄（約 503 筆，台鐵/高鐵/捷運站點）",
      run: (sb) => sel(sb.from("rail_stations").select("*")),
    },
    {
      key: "fire-stations",
      tier: "C",
      description: "消防據點 / 消防栓 / 避難收容（716 + 39k + 5.9k 靜態設施）",
      run: (sb) => sel(sb.from("fire_facilities").select("*")),
    },
    {
      key: "fire-ignition-categories",
      tier: "C",
      description: "起火原因分類常數（lookup table）",
      run: (sb) => sel(sb.from("fire_ignition_categories").select("*")),
    },
    {
      key: "river-stations",
      tier: "C",
      description: "河川測站名錄（站點 metadata，本身位置不變）",
      run: (sb) => sel(sb.from("river_stations").select("*")),
    },
    {
      key: "demographics-pyramid",
      tier: "C",
      description: "人口金字塔（年齡 x 性別結構，年度快照當靜態用）",
      run: (sb) => sel(sb.from("demographics_pyramid").select("*")),
    },

    // ===================== B 級：半靜態（月度/季度） =====================
    {
      key: "maritime-port-throughput",
      tier: "B",
      description: "港埠運量（月度更新，可定期固化）",
      run: (sb) => sel(sb.from("maritime_port_throughput").select("*")),
    },
    {
      key: "maritime-fishery-stats",
      tier: "B",
      description: "漁業統計（季度/年度更新）",
      run: (sb) => sel(sb.from("maritime_fishery_stats").select("*")),
    },
    {
      key: "water-pipeline-trend",
      tier: "B",
      description: "管線（自來水）趨勢（月度彙整）",
      run: (sb) => sel(sb.from("water_pipeline_trend").select("*")),
    },
    {
      key: "water-treatment-plants",
      tier: "B",
      description: "淨水場（設施清單 + 月度產能彙整）",
      run: (sb) => sel(sb.from("water_treatment_plants").select("*")),
    },
    {
      key: "water-detention-basins",
      tier: "B",
      description: "滯洪池（設施 + 容量，半靜態）",
      run: (sb) => sel(sb.from("water_detention_basins").select("*")),
    },
    {
      key: "water-quality-summary",
      tier: "B",
      description: "水質彙整（月度更新）",
      run: (sb) => sel(sb.from("water_quality_summary").select("*")),
    },
    {
      key: "fire-stats-mv",
      tier: "B",
      description: "火災統計 MVs（月度 refresh 的物化視圖）",
      run: (sb) => sel(sb.from("fire_stats_monthly").select("*")),
    },
    {
      key: "demographics-dynamics",
      tier: "B",
      description: "人口動態（出生/死亡/遷徙，月度彙整）",
      run: (sb) => sel(sb.from("demographics_dynamics").select("*")),
    },
  ];
}

// ---------------------------------------------------------------------------
// row_count 推估
// ---------------------------------------------------------------------------

function countRows(payload: unknown): number | null {
  if (Array.isArray(payload)) return payload.length;
  return null;
}

// ---------------------------------------------------------------------------
// 寫檔
// ---------------------------------------------------------------------------

async function writeSnapshot(
  outDir: string,
  job: SnapshotJob,
  payload: unknown,
  gzipEnabled: boolean,
  generatedAt: string,
): Promise<{ file: string; rowCount: number | null }> {
  const rowCount = countRows(payload);
  const fileObj: SnapshotFile = {
    __meta: {
      key: job.key,
      tier: job.tier,
      description: job.description,
      generated_at: generatedAt,
      row_count: rowCount,
      source: "supabase",
    },
    data: payload,
  };
  const json = JSON.stringify(fileObj);
  const jsonPath = path.join(outDir, `${job.key}.json`);
  await fs.writeFile(jsonPath, json, "utf8");

  if (gzipEnabled) {
    const gz = zlib.gzipSync(Buffer.from(json, "utf8"));
    await fs.writeFile(`${jsonPath}.gz`, gz);
  }
  return { file: `${job.key}.json`, rowCount };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const { includeBTier, gzip, outArg } = parseArgs(process.argv.slice(2));

  // 解析路徑：腳本位於 frontend/scripts/，frontend = 上一層
  const here = path.dirname(fileURLToPath(import.meta.url));
  const frontendDir = path.resolve(here, "..");
  const outDir = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.join(frontendDir, "public", "data", "snapshots");

  const env = await loadEnv(frontendDir);
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // eslint-disable-next-line no-console
    console.error(
      "✗ 缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY。\n" +
        "  請在 frontend/.env 或 frontend/.env.local 設定，或用環境變數注入。",
    );
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await fs.mkdir(outDir, { recursive: true });

  const allJobs = buildJobs();
  const jobs = includeBTier ? allJobs : allJobs.filter((j) => j.tier === "C");

  // eslint-disable-next-line no-console
  console.log(
    `▶ snapshot-static-data：抓 ${jobs.length} 個 query` +
      `（${includeBTier ? "C + B 級" : "僅 C 級"}）→ ${outDir}`,
  );

  const generatedAt = new Date().toISOString();
  const manifest: ManifestEntry[] = [];
  let okCount = 0;
  let errCount = 0;

  for (const job of jobs) {
    try {
      const payload = await withRetry(job.key, () => job.run(sb));
      const { file, rowCount } = await writeSnapshot(
        outDir,
        job,
        payload,
        gzip,
        generatedAt,
      );
      manifest.push({
        key: job.key,
        tier: job.tier,
        file,
        generated_at: generatedAt,
        row_count: rowCount,
        status: "ok",
      });
      okCount++;
      // eslint-disable-next-line no-console
      console.log(
        `  ✓ ${job.key} (${job.tier}) → ${file}` +
          (rowCount != null ? ` [${rowCount} rows]` : ""),
      );
    } catch (err) {
      errCount++;
      const msg = err instanceof Error ? err.message : String(err);
      manifest.push({
        key: job.key,
        tier: job.tier,
        file: `${job.key}.json`,
        generated_at: generatedAt,
        row_count: null,
        status: "error",
        error: msg,
      });
      // eslint-disable-next-line no-console
      console.error(`  ✗ ${job.key} (${job.tier}) 失敗：${msg}`);
    }
  }

  // 寫入 _manifest.json
  const manifestPath = path.join(outDir, "_manifest.json");
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        generated_at: generatedAt,
        include_b_tier: includeBTier,
        gzip,
        ok: okCount,
        error: errCount,
        entries: manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  // eslint-disable-next-line no-console
  console.log(
    `\n■ 完成：${okCount} ok / ${errCount} error。manifest → ${manifestPath}`,
  );

  // 有任何成功就視為 build 可繼續；全失敗才以非零碼結束
  if (okCount === 0 && jobs.length > 0) process.exit(2);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("✗ snapshot-static-data 未預期錯誤：", err);
  process.exit(1);
});
