/**
 * Home basics history + per-county query — Supabase fetch + mock fallback
 *
 * 對應後端：gis-platform/migrations/144_reference_national_basics_history.sql
 *   - reference.national_basics_yearly          (33 列 1994-2026 全國歷年)
 *   - reference.national_basics_by_county_yearly (44 列 22 縣市 × 2024-2025)
 *
 * 設計：
 *   - Supabase 失敗時，回退到 ../mock-home.ts 的 AGING_HISTORY/BIRTH_DEATH_HISTORY/HOME_BY_COUNTY mock
 *   - county_id (Supabase 1-letter A/F/...) 對映到 CountyCode3 (3-letter TPE/NTP/...)
 *     經由 counties SSOT 的 byIdMoi 完成
 */
import { supabase } from "../supabase";
import { byIdMoi } from "../counties";
import type { CountyCode3, CountyIdMoi } from "../types";
import {
  AGING_HISTORY as MOCK_AGING_HISTORY,
  BIRTH_DEATH_HISTORY as MOCK_BIRTH_DEATH_HISTORY,
  HOME_BY_COUNTY as MOCK_HOME_BY_COUNTY,
  type HomeCountyDemographic,
} from "../mock-home";

/* ────────────────────────────────────────────────
   Types — match what views consume
─────────────────────────────────────────────── */

export interface AgingHistoryPoint {
  year: number;
  value: number;
}

export interface BirthDeathHistoryPoint {
  year: number;
  birth: number;        // ‰
  death: number;        // ‰
  birth_abs?: number | null;   // 出生絕對數（次要）
  death_abs?: number | null;   // 死亡絕對數
}

export interface HomeByCountyRecord {
  // 與既有 mock 介面對齊（mock-home.ts.HomeCountyDemographic）
  agingIndex: number;
  birthRate: number;
  deathRate: number;
  natural: number;
  townCount: number;
  growth: number;
  // 額外真實欄位（可用於更精準渲染，view 漸進採用）
  popTotal?: number;
  popDensity?: number;
  isFallback?: boolean;
}

/* ────────────────────────────────────────────────
   Raw row types — reference.national_basics_yearly
─────────────────────────────────────────────── */

interface NationalYearlyRow {
  year: number;
  aging_index: number | null;
  birth_rate: number | null;
  death_rate: number | null;
  births: number | null;
  deaths: number | null;
}

interface ByCountyYearlyRow {
  county_id: string;     // 1-letter A/F/...
  year: number;
  aging_index: number | null;
  birth_rate: number | null;
  death_rate: number | null;
  natural_increase_rate: number | null;
  total_population: number | null;
  pop_density: number | null;
}

/* ────────────────────────────────────────────────
   Static helpers — townCount per county (hardcode，
   來自 mock-home.ts 既有值；ETL 未含此欄位)
─────────────────────────────────────────────── */
const TOWN_COUNT_BY_CODE3: Partial<Record<CountyCode3, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(MOCK_HOME_BY_COUNTY).map(([code3, hd]) => [code3, hd.townCount])
  )
) as Partial<Record<CountyCode3, number>>;

/* ────────────────────────────────────────────────
   Fetchers
─────────────────────────────────────────────── */

/** 全國歷年老化指數（AGING_HISTORY）— 對應 mock 的 { year, value } 形狀 */
export async function fetchAgingHistory(): Promise<AgingHistoryPoint[]> {
  try {
    const { data, error } = await supabase
      .schema("reference")
      .from("national_basics_yearly")
      .select("year, aging_index")
      .order("year", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("[home-basics] aging_history fetch failed, using mock:", error?.message);
      return MOCK_AGING_HISTORY;
    }

    return (data as NationalYearlyRow[])
      .filter((r) => r.aging_index != null)
      .map((r) => ({ year: r.year, value: r.aging_index as number }));
  } catch (e) {
    console.warn("[home-basics] aging_history exception, using mock:", e);
    return MOCK_AGING_HISTORY;
  }
}

/** 全國歷年出生 / 死亡率（BIRTH_DEATH_HISTORY）— 對應 mock 的 { year, birth, death } 形狀 */
export async function fetchBirthDeathHistory(): Promise<BirthDeathHistoryPoint[]> {
  try {
    const { data, error } = await supabase
      .schema("reference")
      .from("national_basics_yearly")
      .select("year, birth_rate, death_rate, births, deaths")
      .order("year", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("[home-basics] birth_death_history fetch failed, using mock:", error?.message);
      return MOCK_BIRTH_DEATH_HISTORY;
    }

    return (data as NationalYearlyRow[])
      .filter((r) => r.birth_rate != null && r.death_rate != null)
      .map((r) => ({
        year: r.year,
        birth: r.birth_rate as number,
        death: r.death_rate as number,
        birth_abs: r.births,
        death_abs: r.deaths,
      }));
  } catch (e) {
    console.warn("[home-basics] birth_death_history exception, using mock:", e);
    return MOCK_BIRTH_DEATH_HISTORY;
  }
}

/** 22 縣市最新一年指標（HOME_BY_COUNTY）— 對應 mock 的 Record<code3, HomeCountyDemographic> 形狀
 *
 * 對映：
 *   - county_id (1-letter) → code3 (3-letter) by counties.byIdMoi
 *   - townCount 來自 mock 靜態值（ETL 未含此欄位）
 *   - growth 暫無 ETL 對應，用 natural 的 1/10 近似（mock 慣例同向）
 */
export async function fetchHomeByCounty(): Promise<Record<CountyCode3, HomeCountyDemographic>> {
  try {
    const { data, error } = await supabase
      .schema("reference")
      .from("national_basics_by_county_yearly")
      .select("county_id, year, aging_index, birth_rate, death_rate, natural_increase_rate, total_population, pop_density")
      .order("year", { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn("[home-basics] home_by_county fetch failed, using mock:", error?.message);
      return MOCK_HOME_BY_COUNTY as Record<CountyCode3, HomeCountyDemographic>;
    }

    // 取每個 county_id 最新一年（list 已 desc by year，所以第一筆即最新）
    const latestByCounty = new Map<string, ByCountyYearlyRow>();
    for (const row of data as ByCountyYearlyRow[]) {
      if (!latestByCounty.has(row.county_id)) {
        latestByCounty.set(row.county_id, row);
      }
    }

    const result: Partial<Record<CountyCode3, HomeCountyDemographic>> = {};
    for (const [countyId, row] of latestByCounty.entries()) {
      const county = byIdMoi[countyId as CountyIdMoi];
      if (!county) continue;
      const code3 = county.code3;
      result[code3] = {
        agingIndex:  row.aging_index           ?? MOCK_HOME_BY_COUNTY[code3]?.agingIndex  ?? 0,
        birthRate:   row.birth_rate            ?? MOCK_HOME_BY_COUNTY[code3]?.birthRate   ?? 0,
        deathRate:   row.death_rate            ?? MOCK_HOME_BY_COUNTY[code3]?.deathRate   ?? 0,
        natural:     row.natural_increase_rate ?? MOCK_HOME_BY_COUNTY[code3]?.natural     ?? 0,
        townCount:   TOWN_COUNT_BY_CODE3[code3] ?? MOCK_HOME_BY_COUNTY[code3]?.townCount  ?? 0,
        // growth 無 ETL 對應，用 natural / 10 近似（mock 慣例：兩者同向、量級相近）
        growth:      row.natural_increase_rate != null
                      ? +(row.natural_increase_rate / 10).toFixed(2)
                      : MOCK_HOME_BY_COUNTY[code3]?.growth ?? 0,
      };
    }

    // 任何缺漏縣市（22 / 22 應齊全）由 mock 補
    for (const code3 of Object.keys(MOCK_HOME_BY_COUNTY) as CountyCode3[]) {
      if (!result[code3]) {
        result[code3] = MOCK_HOME_BY_COUNTY[code3];
      }
    }

    return result as Record<CountyCode3, HomeCountyDemographic>;
  } catch (e) {
    console.warn("[home-basics] home_by_county exception, using mock:", e);
    return MOCK_HOME_BY_COUNTY as Record<CountyCode3, HomeCountyDemographic>;
  }
}
