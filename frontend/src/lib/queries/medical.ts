/**
 * Medical theme · Supabase queries
 *
 * 呼叫 public.medical_county_stats() RPC — wrapper over medical.county_medical_full view。
 * PostgREST 不 expose medical schema，所以走 public wrapper pattern。
 *
 * 資料來源：
 *   - medical.county_stats (22)              — 縣市醫療彙總（醫院/診所/藥局/AED/長照/護理/EMS/flu）
 *   - medical.emergency_hospitals_by_county   — 急救責任醫院縣市計數
 *   - medical.epidemic_surveillance           — 4 種傳染病縣市×年度
 */

import { supabase } from "../supabase";
import { COUNTIES } from "../counties";
import type { CountyCode3 } from "../types";

// ─────────────────────────────────────────────────
// Raw row shape from public.medical_county_stats() RPC
// ─────────────────────────────────────────────────
export interface MedicalCountyRow {
  county_name: string;
  hospitals: number;
  clinics: number;
  pharmacies: number;
  aed_count: number;
  ltc_count: number;
  ltc_a: number;
  ltc_b: number;
  ltc_c: number;
  nursing_homes: number;
  nursing_beds: number;
  ems_dispatch: number;
  flu_visits: number;
  emergency_hospitals: number;
  enterovirus_visits: number;
  diarrhea_visits: number;
  conjunctivitis_visits: number;
}

// ─────────────────────────────────────────────────
// Fetch county medical stats via public RPC
// ─────────────────────────────────────────────────
export async function fetchMedicalCountyStats(): Promise<MedicalCountyRow[]> {
  const { data, error } = await supabase.rpc("medical_county_stats");
  if (error) {
    console.error("[medical] medical_county_stats failed:", error);
    throw error;
  }
  return (data ?? []) as MedicalCountyRow[];
}

// ─────────────────────────────────────────────────
// county_name → code3 mapping (county_name 用中文名)
// ─────────────────────────────────────────────────
const NAME_TO_CODE3: Record<string, CountyCode3> = {};
for (const c of COUNTIES) {
  NAME_TO_CODE3[c.name_zh] = c.code3 as CountyCode3;
}

// ─────────────────────────────────────────────────
// Derived: per-county aggregate for frontend use
// ─────────────────────────────────────────────────
export interface CountyMedicalAggregate {
  code3: CountyCode3;
  name: string;
  hosp: number;
  clinic: number;
  pharm: number;
  aed: number;
  ltc: number;
  ltcA: number;
  ltcB: number;
  ltcC: number;
  nfac: number;
  nbed: number;
  eHosp: number;
  ems: number;
  flu: number;
  ev: number;
  diar: number;
  red: number;
}

export function deriveCountyAggregates(rows: MedicalCountyRow[]): CountyMedicalAggregate[] {
  return rows
    .map((r) => {
      const code3 = NAME_TO_CODE3[r.county_name];
      if (!code3) return null;
      return {
        code3,
        name: r.county_name,
        hosp: r.hospitals,
        clinic: r.clinics,
        pharm: r.pharmacies,
        aed: r.aed_count,
        ltc: r.ltc_count,
        ltcA: r.ltc_a,
        ltcB: r.ltc_b,
        ltcC: r.ltc_c,
        nfac: r.nursing_homes,
        nbed: r.nursing_beds,
        eHosp: r.emergency_hospitals,
        ems: r.ems_dispatch,
        flu: r.flu_visits,
        ev: r.enterovirus_visits,
        diar: r.diarrhea_visits,
        red: r.conjunctivitis_visits,
      };
    })
    .filter((x): x is CountyMedicalAggregate => x != null);
}

// ─────────────────────────────────────────────────
// Derived: national summary
// ─────────────────────────────────────────────────
export interface MedicalNationalSummary {
  hospitals: number;
  clinics: number;
  pharmacies: number;
  aed: number;
  emergencyHosp: number;
  nursingFacility: number;
  nursingBeds: number;
  ltcSites: number;
  ltcA: number;
  ltcB: number;
  ltcC: number;
  ems: number;
  influenza: number;
  enterovirus: number;
  diarrhea: number;
  redEye: number;
}

// ─────────────────────────────────────────────────
// Point data fetchers (for map layers)
// ─────────────────────────────────────────────────
export interface AedPointRow {
  place_id: string;
  place_name: string;
  county: string;
  lat: number;
  lng: number;
}

export async function fetchAedPoints(): Promise<AedPointRow[]> {
  const { data, error } = await supabase.rpc("medical_aed_points");
  if (error) { console.error("[medical] aed_points failed:", error); throw error; }
  return (data ?? []) as AedPointRow[];
}

export interface LtcPointRow {
  org_code: string;
  name: string;
  county: string;
  abc_type: string;
  lat: number;
  lng: number;
}

export async function fetchLtcPoints(): Promise<LtcPointRow[]> {
  const { data, error } = await supabase.rpc("medical_ltc_points");
  if (error) { console.error("[medical] ltc_points failed:", error); throw error; }
  return (data ?? []) as LtcPointRow[];
}

export interface EmergencyHospitalPointRow {
  hospital_id: string;
  name: string;
  county_id: string;
  level: string;
  lat: number;
  lng: number;
}

export async function fetchEmergencyHospitalPoints(): Promise<EmergencyHospitalPointRow[]> {
  const { data, error } = await supabase.rpc("medical_emergency_hospital_points");
  if (error) { console.error("[medical] emergency_hospital_points failed:", error); throw error; }
  return (data ?? []) as EmergencyHospitalPointRow[];
}

export function deriveNationalSummary(aggs: CountyMedicalAggregate[]): MedicalNationalSummary {
  const sum = (key: keyof CountyMedicalAggregate) =>
    aggs.reduce((s, a) => s + (Number(a[key]) || 0), 0);

  return {
    hospitals: sum("hosp"),
    clinics: sum("clinic"),
    pharmacies: sum("pharm"),
    aed: sum("aed"),
    emergencyHosp: sum("eHosp"),
    nursingFacility: sum("nfac"),
    nursingBeds: sum("nbed"),
    ltcSites: sum("ltc"),
    ltcA: sum("ltcA"),
    ltcB: sum("ltcB"),
    ltcC: sum("ltcC"),
    ems: sum("ems"),
    influenza: sum("flu"),
    enterovirus: sum("ev"),
    diarrhea: sum("diar"),
    redEye: sum("red"),
  };
}
