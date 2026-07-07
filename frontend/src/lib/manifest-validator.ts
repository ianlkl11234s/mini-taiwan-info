/**
 * Theme manifest 手刻 runtime validator（零依賴，不引 zod/ajv）
 *
 * 目標：擋「欄位打錯字 / enum 非法 / 結構跑掉」三類錯，
 * 不是重新發明 JSON Schema。v1.0 manifest 缺的欄位（color_metrics /
 * kpi.format / group ...）由 themes.ts applyManifestDefaults 補，
 * 這裡不重複要求 — 只驗「有寫就要寫對」。
 *
 * enum 清單用 `satisfies` 綁 types.ts 的 union：types.ts 改值時
 * 這裡打錯字會 typecheck 失敗（漏列新值不會，加值時記得同步）。
 */
import type {
  ColorRamp,
  CompareTo,
  CoverageMode,
  CoverageUiTreatment,
  ExplodeMode,
  HookSeverity,
  KpiGroup,
  LayerType,
  RampDirection,
  RankingBetter,
  RefreshCadence,
  Sentiment,
  TabType,
  ThemeStatus,
} from "./types";

// ── enum 合法值（來源：types.ts；color_ramp 同時對齊 mapbox.ts COLOR_RAMPS keys）──
const COLOR_RAMPS = ["blues", "reds", "greens", "purples", "oranges", "grays", "teal"] as const satisfies readonly ColorRamp[];
const THEME_STATUSES = ["production", "beta", "draft", "archived"] as const satisfies readonly ThemeStatus[];
const RAMP_DIRECTIONS = ["default", "reverse"] as const satisfies readonly RampDirection[];
const KPI_GROUPS = ["realtime", "governance", "safety", "structural"] as const satisfies readonly KpiGroup[];
const COMPARE_TOS = ["previous_day", "previous_week", "previous_year", "none"] as const satisfies readonly CompareTo[];
const SENTIMENTS = ["positive", "negative", "neutral"] as const satisfies readonly Sentiment[];
const EXPLODE_MODES = ["dimension", "time", "geo"] as const satisfies readonly ExplodeMode[];
const HOOK_SEVERITIES = ["info", "warn", "danger"] as const satisfies readonly HookSeverity[];
const TAB_TYPES = ["charts", "ranking_panel", "map_only", "custom"] as const satisfies readonly TabType[];
const RANKING_BETTERS = ["higher", "lower", "neutral"] as const satisfies readonly RankingBetter[];
const LAYER_TYPES = ["polygon", "line", "point"] as const satisfies readonly LayerType[];
const REFRESH_CADENCES = ["realtime", "hourly", "daily", "monthly", "yearly", "static"] as const satisfies readonly RefreshCadence[];
const COVERAGE_MODES = ["only_in", "excluded", "partial", "pending_geocode"] as const satisfies readonly CoverageMode[];
const COVERAGE_UI_TREATMENTS = ["warning_badge", "placeholder", "hide"] as const satisfies readonly CoverageUiTreatment[];

// ── 小工具 ──
type ErrFn = (path: string, msg: string) => void;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** YAML 的 `~`（null）視同缺值，spec 允許（如 coverage_note: ~） */
function absent(v: unknown): boolean {
  return v === undefined || v === null;
}

function reqStr(o: Record<string, unknown>, key: string, path: string, err: ErrFn): void {
  const v = o[key];
  if (absent(v)) err(`${path}.${key}`, "必填（string）但缺少");
  else if (typeof v !== "string" || v === "") err(`${path}.${key}`, `應為非空 string，得到 ${JSON.stringify(v)}`);
}

function optStr(o: Record<string, unknown>, key: string, path: string, err: ErrFn): void {
  const v = o[key];
  if (!absent(v) && typeof v !== "string") err(`${path}.${key}`, `應為 string，得到 ${JSON.stringify(v)}`);
}

function optNum(o: Record<string, unknown>, key: string, path: string, err: ErrFn): void {
  const v = o[key];
  if (!absent(v) && typeof v !== "number") err(`${path}.${key}`, `應為 number，得到 ${JSON.stringify(v)}`);
}

function optBool(o: Record<string, unknown>, key: string, path: string, err: ErrFn): void {
  const v = o[key];
  if (!absent(v) && typeof v !== "boolean") err(`${path}.${key}`, `應為 boolean，得到 ${JSON.stringify(v)}`);
}

function checkEnum(
  o: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly string[],
  err: ErrFn,
  required = false
): void {
  const v = o[key];
  if (absent(v)) {
    if (required) err(`${path}.${key}`, `必填，合法值 [${allowed.join(", ")}]`);
    return;
  }
  if (typeof v !== "string" || !allowed.includes(v)) {
    err(`${path}.${key}`, `"${String(v)}" 不在合法值 [${allowed.join(", ")}]`);
  }
}

/** 若存在必須是 array；回傳 array（不存在或型別錯回 null，錯誤已記） */
function optArray(o: Record<string, unknown>, key: string, path: string, err: ErrFn): unknown[] | null {
  const v = o[key];
  if (absent(v)) return null;
  if (!Array.isArray(v)) {
    err(`${path}.${key}`, `應為 array，得到 ${JSON.stringify(v)}`);
    return null;
  }
  return v;
}

function checkStrArray(o: Record<string, unknown>, key: string, path: string, err: ErrFn): void {
  const arr = optArray(o, key, path, err);
  if (!arr) return;
  arr.forEach((v, i) => {
    if (typeof v !== "string") err(`${path}.${key}[${i}]`, `應為 string，得到 ${JSON.stringify(v)}`);
  });
}

// ── 區塊驗證 ──

function validateTheme(theme: unknown, err: ErrFn): void {
  if (!isRecord(theme)) {
    err("theme", "必填區塊缺少或不是 object");
    return;
  }
  reqStr(theme, "id", "theme", err);
  if (typeof theme.id === "string" && !/^[a-z][a-z0-9-]+$/.test(theme.id)) {
    err("theme.id", `"${theme.id}" 不符 ^[a-z][a-z0-9-]+$`);
  }
  reqStr(theme, "name", "theme", err);
  reqStr(theme, "emoji", "theme", err);
  reqStr(theme, "color_accent", "theme", err);
  if (typeof theme.color_accent === "string" && !/^#[0-9A-Fa-f]{6}$/.test(theme.color_accent)) {
    err("theme.color_accent", `"${theme.color_accent}" 不是合法 hex #RRGGBB`);
  }
  checkEnum(theme, "status", "theme", THEME_STATUSES, err, true);
  checkEnum(theme, "color_ramp", "theme", COLOR_RAMPS, err); // 缺 → mapbox.ts fallback blues
  optStr(theme, "name_en", "theme", err);
  optStr(theme, "icon", "theme", err);
  optStr(theme, "description", "theme", err);
  optStr(theme, "tagline", "theme", err);
  optNum(theme, "priority", "theme", err);
}

function validateColorMetrics(overview: Record<string, unknown>, err: ErrFn): void {
  const metrics = optArray(overview, "color_metrics", "overview", err);
  // 完全沒寫 color_metrics = v1.0 manifest，applyManifestDefaults 會 fallback，不報錯
  if (!metrics) return;

  const ids = new Set<string>();
  metrics.forEach((m, i) => {
    const path = `overview.color_metrics[${i}]`;
    if (!isRecord(m)) {
      err(path, `應為 object，得到 ${JSON.stringify(m)}`);
      return;
    }
    reqStr(m, "id", path, err);
    reqStr(m, "label", path, err);
    if (typeof m.id === "string") {
      if (ids.has(m.id)) err(`${path}.id`, `"${m.id}" 重複`);
      ids.add(m.id);
    }
    optStr(m, "unit", path, err);
    checkEnum(m, "ramp_direction", path, RAMP_DIRECTIONS, err);
    if (!absent(m.domain)) {
      const d = m.domain;
      if (!Array.isArray(d) || d.length !== 2 || d.some((n) => typeof n !== "number")) {
        err(`${path}.domain`, `應為 [min, max] 兩個 number，得到 ${JSON.stringify(d)}`);
      }
    }
    optStr(m, "coverage_note", path, err);
  });

  const metric = overview.default_choropleth_metric;
  if (typeof metric === "string" && metrics.length > 0 && !ids.has(metric)) {
    err(
      "overview.default_choropleth_metric",
      `"${metric}" 不在 color_metrics ids [${[...ids].join(", ")}]`
    );
  }
}

function validateKpis(overview: Record<string, unknown>, err: ErrFn): void {
  const kpis = optArray(overview, "kpis", "overview", err);
  if (!kpis) return;

  const ids = new Set<string>();
  kpis.forEach((k, i) => {
    const path = `overview.kpis[${i}]`;
    if (!isRecord(k)) {
      err(path, `應為 object，得到 ${JSON.stringify(k)}`);
      return;
    }
    reqStr(k, "id", path, err);
    reqStr(k, "label", path, err);
    if (typeof k.id === "string") {
      if (ids.has(k.id)) err(`${path}.id`, `"${k.id}" 重複`);
      ids.add(k.id);
    }
    optStr(k, "unit", path, err);
    optStr(k, "source", path, err);
    optStr(k, "query", path, err); // 只驗型別，不驗 RPC 存在性（placeholder 允許）
    checkEnum(k, "group", path, KPI_GROUPS, err);

    if (!absent(k.format)) {
      if (!isRecord(k.format)) {
        err(`${path}.format`, `應為 object，得到 ${JSON.stringify(k.format)}`);
      } else {
        optNum(k.format, "precision", `${path}.format`, err);
        checkEnum(k.format, "compare_to", `${path}.format`, COMPARE_TOS, err);
        checkEnum(k.format, "sentiment_when_up", `${path}.format`, SENTIMENTS, err);
      }
    }

    const explode = optArray(k, "explode", path, err);
    explode?.forEach((e, j) => {
      const ePath = `${path}.explode[${j}]`;
      if (!isRecord(e)) {
        err(ePath, `應為 object，得到 ${JSON.stringify(e)}`);
        return;
      }
      checkEnum(e, "mode", ePath, EXPLODE_MODES, err, true);
      if (e.mode === "time") checkStrArray(e, "windows", ePath, err);
    });
  });
}

function validateOverview(overview: unknown, err: ErrFn): void {
  if (!isRecord(overview)) {
    err("overview", "必填區塊缺少或不是 object");
    return;
  }
  reqStr(overview, "default_choropleth_metric", "overview", err);
  validateColorMetrics(overview, err);
  validateKpis(overview, err);

  if (!absent(overview.point_profile)) {
    const pp = overview.point_profile;
    if (!isRecord(pp)) {
      err("overview.point_profile", "應為 object");
    } else {
      optBool(pp, "enabled", "overview.point_profile", err);
      optStr(pp, "title", "overview.point_profile", err);
      optStr(pp, "source", "overview.point_profile", err);
      optStr(pp, "query", "overview.point_profile", err);
      optStr(pp, "default_mode", "overview.point_profile", err);
      optArray(pp, "modes", "overview.point_profile", err);
    }
  }

  const hookRules = optArray(overview, "hook_rules", "overview", err);
  hookRules?.forEach((r, i) => {
    const path = `overview.hook_rules[${i}]`;
    if (!isRecord(r)) {
      err(path, `應為 object，得到 ${JSON.stringify(r)}`);
      return;
    }
    optStr(r, "condition", path, err);
    optStr(r, "template", path, err);
    checkEnum(r, "severity", path, HOOK_SEVERITIES, err);
  });

  if (!absent(overview.ranking)) {
    const r = overview.ranking;
    if (!isRecord(r)) {
      err("overview.ranking", "應為 object");
    } else {
      optStr(r, "primary_metric", "overview.ranking", err);
      checkStrArray(r, "available_metrics", "overview.ranking", err);
      optNum(r, "top_n", "overview.ranking", err);
      optNum(r, "bottom_n", "overview.ranking", err);
    }
  }
}

function validateCountyDashboard(cd: unknown, err: ErrFn): void {
  if (absent(cd)) return;
  if (!isRecord(cd)) {
    err("county_dashboard", "應為 object");
    return;
  }
  const tabs = optArray(cd, "tabs", "county_dashboard", err);
  const tabIds = new Set<string>();
  tabs?.forEach((t, i) => {
    const path = `county_dashboard.tabs[${i}]`;
    if (!isRecord(t)) {
      err(path, `應為 object，得到 ${JSON.stringify(t)}`);
      return;
    }
    reqStr(t, "id", path, err);
    reqStr(t, "label", path, err);
    if (typeof t.id === "string") {
      if (tabIds.has(t.id)) err(`${path}.id`, `"${t.id}" 重複`);
      tabIds.add(t.id);
    }
    checkEnum(t, "type", path, TAB_TYPES, err);
    checkStrArray(t, "layers", path, err);
    checkStrArray(t, "kpis", path, err);
    checkStrArray(t, "metrics", path, err);
    const charts = optArray(t, "charts", path, err);
    charts?.forEach((c, j) => {
      const cPath = `${path}.charts[${j}]`;
      if (!isRecord(c)) {
        err(cPath, `應為 object，得到 ${JSON.stringify(c)}`);
        return;
      }
      optStr(c, "id", cPath, err);
      optStr(c, "query", cPath, err);
    });
  });
  if (typeof cd.default_tab === "string" && tabs && tabs.length > 0 && !tabIds.has(cd.default_tab)) {
    err("county_dashboard.default_tab", `"${cd.default_tab}" 不在 tabs ids [${[...tabIds].join(", ")}]`);
  }
}

function validateDataSources(ds: unknown, err: ErrFn): void {
  if (absent(ds)) {
    err("data_sources", "必填區塊缺少");
    return;
  }
  if (!Array.isArray(ds)) {
    err("data_sources", `應為 array，得到 ${JSON.stringify(ds)}`);
    return;
  }
  const ids = new Set<string>();
  ds.forEach((s, i) => {
    const path = `data_sources[${i}]`;
    if (!isRecord(s)) {
      err(path, `應為 object，得到 ${JSON.stringify(s)}`);
      return;
    }
    reqStr(s, "id", path, err);
    if (typeof s.id === "string") {
      if (ids.has(s.id)) err(`${path}.id`, `"${s.id}" 重複`);
      ids.add(s.id);
    }
    if (!absent(s.name) && absent(s.title)) {
      err(`${path}.title`, `用了 "name" 欄位 — schema 是 "title"（types.ts DataSource），請改名`);
    } else {
      reqStr(s, "title", path, err);
    }
    optStr(s, "license", path, err);
    optStr(s, "url", path, err);
    optStr(s, "updated_field", path, err);
    optStr(s, "note", path, err);
    checkEnum(s, "refresh_cadence", path, REFRESH_CADENCES, err);
    checkStrArray(s, "supabase_tables", path, err);
  });
}

function validateMeta(meta: unknown, err: ErrFn): void {
  if (absent(meta)) return; // v1.0 manifest 可缺，暫不強制
  if (!isRecord(meta)) {
    err("meta", "應為 object");
    return;
  }
  optStr(meta, "version", "meta", err);
  const notes = optArray(meta, "coverage_notes", "meta", err);
  notes?.forEach((n, i) => {
    const path = `meta.coverage_notes[${i}]`;
    if (!isRecord(n)) {
      err(path, `應為 object，得到 ${JSON.stringify(n)}`);
      return;
    }
    checkEnum(n, "mode", path, COVERAGE_MODES, err);
    checkEnum(n, "ui_treatment", path, COVERAGE_UI_TREATMENTS, err);
    checkStrArray(n, "affected_counties", path, err);
  });
}

/** datasets / compare / crosslink / layers_catalog 粗驗（結構沒跑掉即可） */
function validateOptionalBlocks(m: Record<string, unknown>, err: ErrFn): void {
  const datasets = optArray(m, "datasets", "(root)", err);
  datasets?.forEach((d, i) => {
    const path = `datasets[${i}]`;
    if (!isRecord(d)) {
      err(path, `應為 object，得到 ${JSON.stringify(d)}`);
      return;
    }
    reqStr(d, "id", path, err);
    optStr(d, "label", path, err);
  });

  if (!absent(m.compare)) {
    if (!isRecord(m.compare)) {
      err("compare", "應為 object");
    } else {
      const cms = optArray(m.compare, "comparable_metrics", "compare", err);
      cms?.forEach((c, i) => {
        const path = `compare.comparable_metrics[${i}]`;
        if (!isRecord(c)) {
          err(path, `應為 object，得到 ${JSON.stringify(c)}`);
          return;
        }
        reqStr(c, "id", path, err);
        reqStr(c, "label", path, err);
        optStr(c, "unit", path, err);
        optStr(c, "source", path, err);
        optStr(c, "coverage_note", path, err);
        checkEnum(c, "ranking_better", path, RANKING_BETTERS, err);
      });
    }
  }

  const crosslinks = optArray(m, "crosslink", "(root)", err);
  crosslinks?.forEach((c, i) => {
    const path = `crosslink[${i}]`;
    if (!isRecord(c)) {
      err(path, `應為 object，得到 ${JSON.stringify(c)}`);
      return;
    }
    optStr(c, "with", path, err);
    optStr(c, "trigger", path, err);
    optStr(c, "template", path, err);
  });

  const layers = optArray(m, "layers_catalog", "(root)", err);
  layers?.forEach((l, i) => {
    const path = `layers_catalog[${i}]`;
    if (!isRecord(l)) {
      err(path, `應為 object，得到 ${JSON.stringify(l)}`);
      return;
    }
    reqStr(l, "id", path, err);
    optStr(l, "source", path, err);
    checkEnum(l, "type", path, LAYER_TYPES, err);
  });
}

/**
 * 驗證單一 theme manifest（yaml.load 後的物件）。
 *
 * @param raw    yaml.load 的結果
 * @param source 錯誤訊息前綴（如 "forestry.yaml"）
 * @returns 錯誤訊息陣列，空陣列 = 通過
 */
export function validateManifest(raw: unknown, source: string): string[] {
  const errors: string[] = [];
  const err: ErrFn = (path, msg) => errors.push(`${source}: ${path} ${msg}`);

  if (!isRecord(raw)) {
    errors.push(`${source}: manifest 不是 object（yaml 內容跑掉？）`);
    return errors;
  }

  validateTheme(raw.theme, err);
  validateOverview(raw.overview, err);
  validateCountyDashboard(raw.county_dashboard, err);
  validateDataSources(raw.data_sources, err);
  validateMeta(raw.meta, err);
  validateOptionalBlocks(raw, err);

  return errors;
}
