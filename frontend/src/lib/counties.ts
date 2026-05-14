/**
 * 22 縣市 SSOT — TypeScript 衍生檔
 *
 * ⚠️ 此檔為衍生產物，從 `../../../data/counties.yaml` v1.0.0 生成
 * 不要手動編輯。若 YAML 變更，跑 `pnpm regen:counties` 重新生成。
 *
 * （Phase 0b：手寫對齊 YAML；regen 腳本將在後續加上）
 */

import type {
  County,
  CountyCode3,
  CountyIdMoi,
  CountySlug,
  Region,
  RegionDef,
} from "./types";

export const COUNTIES: readonly County[] = [
  // 直轄市
  // 直轄市 — 範圍大、polygon centroid 多偏山區，加 label_lng/lat 用行政中心作 anchor
  { id_moi: "A", code3: "TPE", slug: "taipei",         name_zh: "臺北市", name_zh_alt: "台北市", name_en: "Taipei City",     name_en_short: "Taipei",          region: "north",   is_special_municipality: true,  became_special_in: null, centroid_lng: 121.565, centroid_lat: 25.038, label_lng: 121.547, label_lat: 25.045, area_km2: 271,  pop_2024_wan: 248.8 },
  { id_moi: "F", code3: "NTP", slug: "new-taipei",     name_zh: "新北市", name_zh_alt: "新北市", name_en: "New Taipei City", name_en_short: "New Taipei",      region: "north",   is_special_municipality: true,  became_special_in: null, centroid_lng: 121.609, centroid_lat: 25.012, label_lng: 121.660, label_lat: 25.090, area_km2: 2052, pop_2024_wan: 403.2 },
  { id_moi: "H", code3: "TYC", slug: "taoyuan",        name_zh: "桃園市", name_zh_alt: "桃園市", name_en: "Taoyuan City",    name_en_short: "Taoyuan",         region: "north",   is_special_municipality: true,  became_special_in: 2014, centroid_lng: 121.220, centroid_lat: 24.953, label_lng: 121.300, label_lat: 24.985, area_km2: 1221, pop_2024_wan: 230.4 },
  { id_moi: "B", code3: "TCH", slug: "taichung",       name_zh: "臺中市", name_zh_alt: "台中市", name_en: "Taichung City",   name_en_short: "Taichung",        region: "central", is_special_municipality: true,  became_special_in: 2010, centroid_lng: 120.967, centroid_lat: 24.149, label_lng: 120.682, label_lat: 24.155, area_km2: 2215, pop_2024_wan: 283.0 },
  { id_moi: "D", code3: "TNN", slug: "tainan",         name_zh: "臺南市", name_zh_alt: "台南市", name_en: "Tainan City",     name_en_short: "Tainan",          region: "south",   is_special_municipality: true,  became_special_in: 2010, centroid_lng: 120.227, centroid_lat: 23.130, label_lng: 120.227, label_lat: 23.000, area_km2: 2191, pop_2024_wan: 184.6 },
  { id_moi: "E", code3: "KHH", slug: "kaohsiung",      name_zh: "高雄市", name_zh_alt: "高雄市", name_en: "Kaohsiung City",  name_en_short: "Kaohsiung",       region: "south",   is_special_municipality: true,  became_special_in: 2010, centroid_lng: 120.566, centroid_lat: 22.628, label_lng: 120.310, label_lat: 22.640, area_km2: 2952, pop_2024_wan: 273.4 },
  // 省轄市
  { id_moi: "C", code3: "KLC", slug: "keelung",        name_zh: "基隆市", name_zh_alt: "基隆市", name_en: "Keelung City",    name_en_short: "Keelung",         region: "north",   is_special_municipality: false, became_special_in: null, centroid_lng: 121.744, centroid_lat: 25.131, area_km2: 133,  pop_2024_wan:  36.0 },
  { id_moi: "O", code3: "HSC", slug: "hsinchu-city",   name_zh: "新竹市", name_zh_alt: "新竹市", name_en: "Hsinchu City",    name_en_short: "Hsinchu City",    region: "north",   is_special_municipality: false, became_special_in: null, centroid_lng: 120.969, centroid_lat: 24.807, area_km2: 104,  pop_2024_wan:  44.8 },
  { id_moi: "I", code3: "CYC", slug: "chiayi-city",    name_zh: "嘉義市", name_zh_alt: "嘉義市", name_en: "Chiayi City",     name_en_short: "Chiayi City",     region: "south",   is_special_municipality: false, became_special_in: null, centroid_lng: 120.452, centroid_lat: 23.481, area_km2: 60,   pop_2024_wan:  26.4 },
  // 縣
  { id_moi: "J", code3: "HSH", slug: "hsinchu-county", name_zh: "新竹縣", name_zh_alt: "新竹縣", name_en: "Hsinchu County",  name_en_short: "Hsinchu County",  region: "north",   is_special_municipality: false, became_special_in: null, centroid_lng: 121.130, centroid_lat: 24.683, area_km2: 1427, pop_2024_wan:  58.2 },
  { id_moi: "K", code3: "MIA", slug: "miaoli",         name_zh: "苗栗縣", name_zh_alt: "苗栗縣", name_en: "Miaoli County",   name_en_short: "Miaoli",          region: "central", is_special_municipality: false, became_special_in: null, centroid_lng: 120.943, centroid_lat: 24.488, area_km2: 1820, pop_2024_wan:  53.9 },
  { id_moi: "N", code3: "CHA", slug: "changhua",       name_zh: "彰化縣", name_zh_alt: "彰化縣", name_en: "Changhua County", name_en_short: "Changhua",        region: "central", is_special_municipality: false, became_special_in: null, centroid_lng: 120.541, centroid_lat: 23.999, area_km2: 1074, pop_2024_wan: 124.4 },
  { id_moi: "M", code3: "NAN", slug: "nantou",         name_zh: "南投縣", name_zh_alt: "南投縣", name_en: "Nantou County",   name_en_short: "Nantou",          region: "central", is_special_municipality: false, became_special_in: null, centroid_lng: 120.971, centroid_lat: 23.961, area_km2: 4106, pop_2024_wan:  48.5 },
  { id_moi: "P", code3: "YUN", slug: "yunlin",         name_zh: "雲林縣", name_zh_alt: "雲林縣", name_en: "Yunlin County",   name_en_short: "Yunlin",          region: "central", is_special_municipality: false, became_special_in: null, centroid_lng: 120.431, centroid_lat: 23.709, area_km2: 1290, pop_2024_wan:  66.1 },
  { id_moi: "Q", code3: "CYH", slug: "chiayi-county",  name_zh: "嘉義縣", name_zh_alt: "嘉義縣", name_en: "Chiayi County",   name_en_short: "Chiayi County",   region: "south",   is_special_municipality: false, became_special_in: null, centroid_lng: 120.574, centroid_lat: 23.450, area_km2: 1903, pop_2024_wan:  48.7 },
  { id_moi: "T", code3: "PIF", slug: "pingtung",       name_zh: "屏東縣", name_zh_alt: "屏東縣", name_en: "Pingtung County", name_en_short: "Pingtung",        region: "south",   is_special_municipality: false, became_special_in: null, centroid_lng: 120.620, centroid_lat: 22.555, area_km2: 2776, pop_2024_wan:  78.9 },
  { id_moi: "G", code3: "ILA", slug: "yilan",          name_zh: "宜蘭縣", name_zh_alt: "宜蘭縣", name_en: "Yilan County",    name_en_short: "Yilan",           region: "east",    is_special_municipality: false, became_special_in: null, centroid_lng: 121.633, centroid_lat: 24.703, area_km2: 2143, pop_2024_wan:  44.7 },
  { id_moi: "U", code3: "HUA", slug: "hualien",        name_zh: "花蓮縣", name_zh_alt: "花蓮縣", name_en: "Hualien County",  name_en_short: "Hualien",         region: "east",    is_special_municipality: false, became_special_in: null, centroid_lng: 121.382, centroid_lat: 23.737, area_km2: 4628, pop_2024_wan:  31.7 },
  { id_moi: "V", code3: "TTT", slug: "taitung",        name_zh: "臺東縣", name_zh_alt: "台東縣", name_en: "Taitung County",  name_en_short: "Taitung",         region: "east",    is_special_municipality: false, became_special_in: null, centroid_lng: 121.110, centroid_lat: 22.760, area_km2: 3515, pop_2024_wan:  21.3 },
  { id_moi: "X", code3: "PEH", slug: "penghu",         name_zh: "澎湖縣", name_zh_alt: "澎湖縣", name_en: "Penghu County",   name_en_short: "Penghu",          region: "island",  is_special_municipality: false, became_special_in: null, centroid_lng: 119.617, centroid_lat: 23.567, area_km2: 127,  pop_2024_wan:  10.7 },
  { id_moi: "W", code3: "KMN", slug: "kinmen",         name_zh: "金門縣", name_zh_alt: "金門縣", name_en: "Kinmen County",   name_en_short: "Kinmen",          region: "island",  is_special_municipality: false, became_special_in: null, centroid_lng: 118.317, centroid_lat: 24.450, area_km2: 152,  pop_2024_wan:  14.2 },
  { id_moi: "Z", code3: "LCC", slug: "lienchiang",     name_zh: "連江縣", name_zh_alt: "連江縣", name_en: "Lienchiang County", name_en_short: "Lienchiang",    region: "island",  is_special_municipality: false, became_special_in: null, centroid_lng: 119.953, centroid_lat: 26.160, area_km2: 29,   pop_2024_wan:   1.3 },
] as const;

// ─────────────────────────────────────────────────
// 索引 maps
// ─────────────────────────────────────────────────

export const byIdMoi: Readonly<Record<CountyIdMoi, County>> = Object.freeze(
  Object.fromEntries(COUNTIES.map((c) => [c.id_moi, c]))
);

export const byCode3: Readonly<Record<CountyCode3, County>> = Object.freeze(
  Object.fromEntries(COUNTIES.map((c) => [c.code3, c]))
);

export const bySlug: Readonly<Record<CountySlug, County>> = Object.freeze(
  Object.fromEntries(COUNTIES.map((c) => [c.slug, c]))
);

export const REGIONS: readonly RegionDef[] = [
  { id: "north",   name_zh: "北部",   name_en: "Northern Taiwan", counties: ["TPE", "NTP", "TYC", "HSC", "HSH", "KLC"] },
  { id: "central", name_zh: "中部",   name_en: "Central Taiwan",  counties: ["MIA", "TCH", "CHA", "NAN", "YUN"] },
  { id: "south",   name_zh: "南部",   name_en: "Southern Taiwan", counties: ["CYC", "CYH", "TNN", "KHH", "PIF"] },
  { id: "east",    name_zh: "東部",   name_en: "Eastern Taiwan",  counties: ["ILA", "HUA", "TTT"] },
  { id: "island",  name_zh: "離島",   name_en: "Outlying Islands", counties: ["PEH", "KMN", "LCC"] },
] as const;

// ─────────────────────────────────────────────────
// Name aliases: free-form 中／英文 → id_moi
// 包含「臺/台」混用 + 歷史名（臺北縣 → F）
// ─────────────────────────────────────────────────

const NAME_ALIASES_BASE: Readonly<Record<string, CountyIdMoi>> = {
  // 自動 derived from COUNTIES (zh + alt + en + en_short)
  ...Object.fromEntries(COUNTIES.flatMap((c) => [
    [c.name_zh, c.id_moi],
    [c.name_zh_alt, c.id_moi],
    [c.name_en, c.id_moi],
    [c.name_en_short, c.id_moi],
  ])),
  // 歷史名（合併前）
  "臺北縣": "F", "台北縣": "F",
  "桃園縣": "H",
  "臺中縣": "B", "台中縣": "B",
  "臺南縣": "D", "台南縣": "D",
  "高雄縣": "E",
  // 俗稱
  "馬祖": "Z", "Matsu": "Z",
};

export const NAME_ALIASES: Readonly<Record<string, CountyIdMoi>> = Object.freeze(NAME_ALIASES_BASE);

/**
 * 把任何寫法的縣市名 normalize 回 id_moi
 * @example normalizeCountyName('台北市') => 'A'
 * @example normalizeCountyName('臺北縣') => 'F' (歷史名)
 */
export function normalizeCountyName(name: string): CountyIdMoi | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return NAME_ALIASES[trimmed] ?? null;
}

/**
 * 從任何形式的縣市標識（id_moi / code3 / slug / 中文名）取回 County
 */
export function lookupCounty(identifier: string): County | null {
  if (!identifier) return null;
  if (byIdMoi[identifier]) return byIdMoi[identifier];
  if (byCode3[identifier]) return byCode3[identifier];
  if (bySlug[identifier]) return bySlug[identifier];
  const idMoi = normalizeCountyName(identifier);
  if (idMoi && byIdMoi[idMoi]) return byIdMoi[idMoi];
  return null;
}

/**
 * 縣市代碼互轉
 */
export const codeConvert = {
  idMoiToCode3: (id: CountyIdMoi): CountyCode3 | null => byIdMoi[id]?.code3 ?? null,
  code3ToIdMoi: (c: CountyCode3): CountyIdMoi | null => byCode3[c]?.id_moi ?? null,
  code3ToSlug:  (c: CountyCode3): CountySlug | null => byCode3[c]?.slug ?? null,
  slugToCode3:  (s: CountySlug): CountyCode3 | null => bySlug[s]?.code3 ?? null,
};

// ─────────────────────────────────────────────────
// 按 region 分組
// ─────────────────────────────────────────────────

export function countiesByRegion(region: Region): County[] {
  return COUNTIES.filter((c) => c.region === region);
}

export function regionOf(code3: CountyCode3): Region | null {
  return byCode3[code3]?.region ?? null;
}
