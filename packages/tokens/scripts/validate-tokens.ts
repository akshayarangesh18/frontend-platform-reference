import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkTokenGovernance } from "../src/compiler/index.js";
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

export function runValidation(): boolean {
  console.log("🔍 Validating design tokens against platform governance rules...");

  const globalDir = path.join(packageRoot, "src/tokens/global");
  const semanticDir = path.join(packageRoot, "src/tokens/semantic");
  const darkThemePath = path.join(packageRoot, "src/tokens/themes/dark.json");

  const globalGroups = readJsonFiles(globalDir);
  const semanticGroups = readJsonFiles(semanticDir);
  const darkThemeGroups = fs.existsSync(darkThemePath)
    ? [JSON.parse(fs.readFileSync(darkThemePath, "utf-8")) as DesignTokenGroup]
    : [];

  const report = checkTokenGovernance({
    globalGroups,
    semanticGroups,
    darkThemeGroups,
    prefix: "--fp"
  });

  if (!report.isValid) {
    console.error(`\n❌ Token Governance Check FAILED with ${report.errors.length} violation(s):\n`);
    for (const err of report.errors) {
      console.error(`  • [${err.rule}] on "${err.path}":`);
      console.error(`    ${err.message}\n`);
    }
    return false;
  }

  console.log("✅ Token governance validation passed with 0 violations.");
  console.log("   - Semantic layer discipline: enforced (no raw color literals)");
  console.log("   - Theme parity: verified (all dark theme tokens override valid semantic tokens)");
  console.log("   - Reference integrity: verified (all aliases point to existing tokens)");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const success = runValidation();
  process.exit(success ? 0 : 1);
}
