/**
 * Supabase client
 *
 * 走 anon key + RLS（gis-platform/migrations/008 已設 anon SELECT all）。
 * 寫入只能透過後端 wrapper（service_role 不放前端）。
 *
 * 決策見 _STATUS.md Decision Log (2026-05-14)。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 沒設 env 時不要 throw（dev 啟動先讓 UI 看得到），但 console.warn 提醒
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 未設定，所有查詢會失敗。" +
      "複製 .env.example 到 .env.local 並填入金鑰。"
  );
}

export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder",
  {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  }
);

/**
 * 切換到 reference / realtime / metadata schema 取資料
 */
export type SupabaseSchema =
  | "public"
  | "realtime"
  | "reference"
  | "metadata"
  | "spatial"
  | "opendata"
  | "fire"
  | "demographics"
  | "rail"
  | "maritime";

export function withSchema(schema: SupabaseSchema) {
  return createClient(
    url ?? "https://placeholder.supabase.co",
    anonKey ?? "placeholder",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema },
    }
  );
}

export const supabaseRealtime = withSchema("realtime");
export const supabaseReference = withSchema("reference");
