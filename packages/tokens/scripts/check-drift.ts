import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTokens } from "../src/compiler/index.js";
import type { DesignTokenGroup } from "../src/compiler/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

function readJsonFiles(dirPath: string): DesignTokenGroup[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const groups: DesignTokenGroup[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      const fullPath = path.join(dirPath, entry.name);
      const content = fs.readFileSync(fullPath, "utf-8");
      groups.push(JSON.parse(content) as DesignTokenGroup);
    }
  }

  return groups;
}

export function checkDrift(): boolean {
  console.log("🔍 Checking for token drift between source JSON definitions and generated artifacts...");

  const globalDir = path.join(packageRoot, "src/tokens/global");
  const semanticDir = path.join(packageRoot, "src/tokens/semantic");
  const darkThemePath = path.join(packageRoot, "src/tokens/themes/dark.json");

  const globalGroups = readJsonFiles(globalDir);
  const semanticGroups = readJsonFiles(semanticDir);
  const darkThemeGroups = fs.existsSync(darkThemePath)
    ? [JSON.parse(fs.readFileSync(darkThemePath, "utf-8")) as DesignTokenGroup]
    : [];

  const expected = compileTokens({
    globalGroups,
    semanticGroups,
    darkThemeGroups,
    prefix: "--fp"
  });

  const cssPath = path.join(packageRoot, "dist/css/tokens.css");
  const tsPath = path.join(packageRoot, "src/generated/tokens.ts");

  let hasDrift = false;

  // 1. Check CSS output
  if (!fs.existsSync(cssPath)) {
    console.error(`❌ Drift detected: Missing CSS artifact at "${path.relative(packageRoot, cssPath)}".`);
    hasDrift = true;
  } else {
    const diskCss = fs.readFileSync(cssPath, "utf-8");
    if (diskCss !== expected.css) {
      console.error(`❌ Drift detected: "${path.relative(packageRoot, cssPath)}" does not match source token compilation.`);
      hasDrift = true;
    }
  }

  // 2. Check TypeScript output
  if (!fs.existsSync(tsPath)) {
    console.error(`❌ Drift detected: Missing TypeScript artifact at "${path.relative(packageRoot, tsPath)}".`);
    hasDrift = true;
  } else {
    const diskTs = fs.readFileSync(tsPath, "utf-8");
    if (diskTs !== expected.tsCode) {
      console.error(`❌ Drift detected: "${path.relative(packageRoot, tsPath)}" does not match source token compilation.`);
      hasDrift = true;
    }
  }

  if (hasDrift) {
    console.error("\n💥 Token drift check failed!");
    console.error("👉 Solution: Run 'pnpm --filter @frontend-platform/tokens build' and commit the resulting artifacts.\n");
    return false;
  }

  console.log("✅ No token drift detected. Generated CSS and TypeScript artifacts perfectly match source token definitions.");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const clean = checkDrift();
  process.exit(clean ? 0 : 1);
}
