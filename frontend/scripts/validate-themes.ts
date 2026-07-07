/**
 * CLI 閘門：掃 themes/*.yaml 全部跑 manifest validator
 *
 * 用法：pnpm validate:themes（tsx scripts/validate-themes.ts）
 * 有任何錯誤 → 列出全部 + exit 1（可掛 CI / pre-commit）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { validateManifest } from "../src/lib/manifest-validator";

const themesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../themes");

const files = fs
  .readdirSync(themesDir)
  .filter((f) => f.endsWith(".yaml") && !f.startsWith("_")) // 跳過 _template.yaml，同 themes.ts loader
  .sort();

const allErrors: string[] = [];
const seenThemeIds = new Map<string, string>(); // theme.id → 檔名（跨檔唯一性）

for (const file of files) {
  const raw = fs.readFileSync(path.join(themesDir, file), "utf-8");
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    allErrors.push(`${file}: YAML 解析失敗 — ${(e as Error).message}`);
    continue;
  }

  allErrors.push(...validateManifest(parsed, file));

  const themeId = (parsed as { theme?: { id?: unknown } })?.theme?.id;
  if (typeof themeId === "string") {
    const dup = seenThemeIds.get(themeId);
    if (dup) allErrors.push(`${file}: theme.id "${themeId}" 與 ${dup} 重複`);
    else seenThemeIds.set(themeId, file);
  }
}

if (allErrors.length > 0) {
  console.error(`✗ manifest 驗證失敗（${allErrors.length} 項錯誤）:\n`);
  for (const e of allErrors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(`✓ ${files.length} 個 theme manifest 驗證通過（${[...seenThemeIds.keys()].join(", ")}）`);
