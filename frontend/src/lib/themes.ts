/**
 * Theme manifest loader
 *
 * 從 `../../../../themes/*.yaml` 載入 manifest，回傳型別安全的 ThemeManifest。
 * 用 Vite glob import + js-yaml。
 */

import yaml from "js-yaml";
import { validateManifest } from "./manifest-validator";
import type { ThemeManifest } from "./types";

// Vite import.meta.glob: 取所有 themes/*.yaml 為 raw string
const yamlModules = import.meta.glob<string>(
  "../../../themes/*.yaml",
  { query: "?raw", import: "default", eager: true }
);

/**
 * 從檔名解出 theme id
 * "../../../themes/water.yaml" → "water"
 */
function extractThemeId(path: string): string {
  const m = path.match(/themes\/([^/]+)\.yaml$/);
  return m ? m[1] : "";
}

/**
 * 載入所有主題 manifest
 */
export function loadAllManifests(): Record<string, ThemeManifest> {
  const out: Record<string, ThemeManifest> = {};
  for (const [path, raw] of Object.entries(yamlModules)) {
    const themeId = extractThemeId(path);
    if (themeId.startsWith("_")) continue; // skip _template.yaml / _schema.json
    let parsed: ThemeManifest;
    try {
      parsed = yaml.load(raw) as ThemeManifest;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[themes] 解析 ${path} 失敗`, err);
      continue;
    }

    // runtime schema 驗證：DEV fail loud，production 只警告不擋渲染
    const validationErrors = validateManifest(parsed, `${themeId}.yaml`);
    if (validationErrors.length > 0) {
      const msg =
        `[themes] ${themeId}.yaml manifest 驗證失敗（${validationErrors.length} 項）:\n` +
        validationErrors.join("\n");
      if (import.meta.env.DEV) {
        throw new Error(msg);
      }
      // eslint-disable-next-line no-console
      console.warn(msg);
    }

    if (parsed?.theme?.id) {
      out[parsed.theme.id] = applyManifestDefaults(parsed);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[themes] ${path} 缺 theme.id，跳過`);
    }
  }
  return out;
}

/**
 * 給舊版 manifest（v1.0，缺 color_metrics / format / response_shape）補上預設值，
 * 讓 UI 不會因為缺欄位而 crash。
 *
 * 對應 _STATUS.md Backlog「home-basics / socioeconomic / fire 升級到 v1.1」。
 * 等那三個 yaml 升級後此 fallback 變成 no-op。
 */
function applyManifestDefaults(m: ThemeManifest): ThemeManifest {
  const overview = m.overview ?? ({} as ThemeManifest["overview"]);

  // color_metrics fallback
  if (!overview.color_metrics || !Array.isArray(overview.color_metrics)) {
    const fallbackId = overview.default_choropleth_metric || "value";
    overview.color_metrics = [
      {
        id: fallbackId,
        label: fallbackId,
        unit: "",
        ramp_direction: "default",
        domain: [0, 100],
      },
    ];
    // eslint-disable-next-line no-console
    console.warn(
      `[themes] ${m.theme.id} 缺 overview.color_metrics（v1.0 manifest？）— 用 fallback`
    );
  }

  // KPI 預設：每個 kpi 補 format/group/response_shape
  if (!overview.kpis || !Array.isArray(overview.kpis)) overview.kpis = [];
  overview.kpis = overview.kpis.map((k) => ({
    ...k,
    group: k.group ?? "structural",
    format: {
      precision: k.format?.precision ?? 1,
      compare_to: k.format?.compare_to ?? "none",
      sentiment_when_up: k.format?.sentiment_when_up ?? "neutral",
    },
    response_shape: k.response_shape ?? { value: "number", delta: "number" },
  }));

  // point_profile 預設禁用
  if (!overview.point_profile) {
    overview.point_profile = undefined;
  }

  // ranking 預設
  if (!overview.ranking) {
    overview.ranking = undefined;
  }

  return { ...m, overview };
}

/**
 * 主題清單（給 ThemeSwitcher 排序用）
 */
export interface ThemeListItem {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  color_accent: string;
  priority: number;
  status: "production" | "beta" | "draft" | "archived";
  disabled: boolean;
}

export function getThemeList(manifests: Record<string, ThemeManifest>): ThemeListItem[] {
  return Object.values(manifests)
    .filter((m) => m.theme.status !== "archived")
    .map((m) => ({
      id: m.theme.id,
      name: m.theme.name,
      emoji: m.theme.emoji,
      icon: m.theme.icon,
      color_accent: m.theme.color_accent,
      priority: m.theme.priority,
      status: m.theme.status,
      disabled: m.theme.status !== "production" && m.theme.status !== "beta",
    }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 取得單一主題 manifest（找不到回 null）
 */
export function getManifest(
  manifests: Record<string, ThemeManifest>,
  themeId: string
): ThemeManifest | null {
  return manifests[themeId] ?? null;
}
