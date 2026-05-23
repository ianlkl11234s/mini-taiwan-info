/**
 * 全國基礎統計 SSOT — TypeScript 衍生檔
 *
 * ⚠️ 此檔為衍生產物，從 `../../../data/national-basics.yaml` v1.0 生成
 * 不要手動編輯。若 YAML 變更，跑 regen script 或手動同步。
 *
 * 用於：首頁 ViewA「全台概覽」KPI 卡片 + 文案區
 * Tier：static（固定）/ yearly（年）/ monthly（月，B 階段接 Supabase）
 */

export type IndicatorTier = "static" | "yearly" | "monthly";
export type Confidence = "high" | "medium" | "low";

export interface Indicator<T = number> {
  value: T;
  label: string;
  unit?: string;
  source: string;
  source_url?: string;
  tier: IndicatorTier;
  as_of?: string;        // "YYYY-MM" / "YYYY"
  confidence?: Confidence;
  note?: string;
}

// ─────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────
export const NATIONAL_BASICS_META = {
  version: "1.0",
  lastUpdated: "2026-05-20",
  nextReview: "2026-08-20",
  authority: "中華民國內政部",
  sourceYaml: "data/national-basics.yaml",
} as const;

// ─────────────────────────────────────────────────
// Section A · 行政區
// ─────────────────────────────────────────────────
export const ADMINISTRATIVE = {
  cities: {
    total: 22,
    municipality: 6,      // 直轄市
    provincial_city: 3,   // 市
    county: 13,           // 縣
  },
  townships: {
    total: 368,
    district: 170,
    county_city: 14,
    town: 38,
    township: 122,
    mountain_township: 24,
  },
  villages: 7748,
  neighborhoods: 144820,
} as const;

// ─────────────────────────────────────────────────
// Section B · 國土面積
// ─────────────────────────────────────────────────
export const TERRITORY = {
  total_area_km2: 36197.06,
  main_island_km2: 35808.0,
  offshore_islands_km2: 389.06,
  inland_water_km2: 74.6,
  coastline_km: 1988,
  highest_elevation_m: 3952.43,    // 玉山
  largest_lake_km2: 8.0,           // 日月潭
} as const;

// ─────────────────────────────────────────────────
// Section C · 人口
// ─────────────────────────────────────────────────
export const POPULATION = {
  total: 23262544,
  male: 11439382,
  female: 11823162,
  sex_ratio: 96.75,                // 男/女 × 100
  density: 642.66,                 // 人/km²
  households: 9894000,
  household_size: 2.3509,
  as_of: "2026-04",
} as const;

// ─────────────────────────────────────────────────
// Section D · 年齡結構
// ─────────────────────────────────────────────────
export const AGE_STRUCTURE = {
  pop_0_14: { value: 2652508, pct: 11.40 },
  pop_15_64: { value: 15873366, pct: 68.24 },
  pop_65_plus: { value: 4736670, pct: 20.36 },
  aging_index: 178.57,             // 老化指數
  dependency_ratio: 46.55,         // 扶養比
  as_of: "2026-04",
} as const;

// ─────────────────────────────────────────────────
// Section E · 人口動態
// ─────────────────────────────────────────────────
export const VITAL_STATISTICS = {
  birth_rate: 4.26,                // 粗出生率 ‰
  death_rate: 8.36,                // 粗死亡率 ‰
  natural_increase_rate: -2.87,    // 自然增加率 ‰ (2024)
  as_of_monthly: "2026-04",
  as_of_yearly: "2024",
} as const;

// ─────────────────────────────────────────────────
// Section F · 文案
// ─────────────────────────────────────────────────
export const NARRATIVE = {
  tagline: "認識你的台灣 vital signs",
  oneLiner: "2,326 萬人，6 都 16 縣市，368 鄉鎮市區，7,748 村里 — 36,197 km² 上的台灣",
  highlights: [
    "已進入「超高齡社會」（65+ 佔 20.36%）",
    "人口連續負成長（自然增加率 -2.87‰）",
    "老化指數 178.57%，65+ 是 0-14 歲人口的 1.8 倍",
    "本島 35,808 km² + 離島 389 km²，海岸線近 1,988 km",
  ],
} as const;

// ─────────────────────────────────────────────────
// Indicator descriptor 集合（給 ViewA KPI 卡用，含完整 metadata）
// ─────────────────────────────────────────────────
export const INDICATORS: Record<string, Indicator> = {
  cities_total: {
    value: ADMINISTRATIVE.cities.total,
    label: "縣市數",
    unit: "個",
    source: "內政部「直轄市縣市行政區劃」",
    tier: "static",
    note: "6 直轄市 + 3 市 + 13 縣",
  },
  townships_total: {
    value: ADMINISTRATIVE.townships.total,
    label: "鄉鎮市區數",
    unit: "個",
    source: "內政部統計處 SEGIS",
    tier: "static",
  },
  villages_total: {
    value: ADMINISTRATIVE.villages,
    label: "村里數",
    unit: "個",
    source: "內政部戶政司",
    tier: "yearly",
    as_of: "2024-12",
  },
  total_area: {
    value: TERRITORY.total_area_km2,
    label: "國土總面積",
    unit: "km²",
    source: "內政部統計年報",
    tier: "static",
  },
  inland_water: {
    value: TERRITORY.inland_water_km2,
    label: "內陸水域面積",
    unit: "km²",
    source: "內政部國土利用調查",
    tier: "static",
    confidence: "medium",
  },
  coastline: {
    value: TERRITORY.coastline_km,
    label: "海岸線總長",
    unit: "km",
    source: "內政部國土測繪中心",
    tier: "static",
  },
  national_population: {
    value: POPULATION.total,
    label: "全國人口",
    unit: "人",
    source: "內政部戶政司",
    source_url: "https://www.ris.gov.tw/app/portal/346",
    tier: "monthly",
    as_of: POPULATION.as_of,
  },
  population_density: {
    value: POPULATION.density,
    label: "人口密度",
    unit: "人/km²",
    source: "戶政司 / 內政部",
    tier: "monthly",
    as_of: POPULATION.as_of,
  },
  birth_rate: {
    value: VITAL_STATISTICS.birth_rate,
    label: "粗出生率",
    unit: "‰",
    source: "內政部戶政司",
    tier: "monthly",
    as_of: VITAL_STATISTICS.as_of_monthly,
  },
  death_rate: {
    value: VITAL_STATISTICS.death_rate,
    label: "粗死亡率",
    unit: "‰",
    source: "內政部戶政司",
    tier: "monthly",
    as_of: VITAL_STATISTICS.as_of_monthly,
  },
  natural_increase_rate: {
    value: VITAL_STATISTICS.natural_increase_rate,
    label: "自然增加率",
    unit: "‰",
    source: "內政部戶政司",
    tier: "yearly",
    as_of: VITAL_STATISTICS.as_of_yearly,
    note: "連續多年負成長",
  },
  aging_index: {
    value: AGE_STRUCTURE.aging_index,
    label: "老化指數",
    unit: "%",
    source: "內政部戶政司 / SEGIS",
    tier: "monthly",
    as_of: AGE_STRUCTURE.as_of,
  },
  dependency_ratio: {
    value: AGE_STRUCTURE.dependency_ratio,
    label: "扶養比",
    unit: "%",
    source: "內政部戶政司",
    tier: "monthly",
    as_of: AGE_STRUCTURE.as_of,
  },
  pop_65_plus_pct: {
    value: AGE_STRUCTURE.pop_65_plus.pct,
    label: "高齡人口佔比",
    unit: "%",
    source: "內政部戶政司",
    tier: "monthly",
    as_of: AGE_STRUCTURE.as_of,
    note: "超過 20%，達 WHO「超高齡社會」標準",
  },
  sex_ratio: {
    value: POPULATION.sex_ratio,
    label: "性比例",
    unit: "%",
    source: "內政部戶政司",
    tier: "monthly",
    as_of: POPULATION.as_of,
  },
} as const;

// Helper：依 tier 過濾
export const getIndicatorsByTier = (tier: IndicatorTier) =>
  Object.entries(INDICATORS).filter(([, v]) => v.tier === tier);
