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

export function runBuild() {
  const globalDir = path.join(packageRoot, "src/tokens/global");
  const semanticDir = path.join(packageRoot, "src/tokens/semantic");
  const darkThemePath = path.join(packageRoot, "src/tokens/themes/dark.json");

  const globalGroups = readJsonFiles(globalDir);
  const semanticGroups = readJsonFiles(semanticDir);
  const darkThemeGroups = fs.existsSync(darkThemePath)
    ? [JSON.parse(fs.readFileSync(darkThemePath, "utf-8")) as DesignTokenGroup]
    : [];

  const result = compileTokens({
    globalGroups,
    semanticGroups,
    darkThemeGroups,
    prefix: "--fp"
  });

  // Ensure output directories exist
  const distCssDir = path.join(packageRoot, "dist/css");
  const generatedDir = path.join(packageRoot, "src/generated");
  fs.mkdirSync(distCssDir, { recursive: true });
  fs.mkdirSync(generatedDir, { recursive: true });

  // Write outputs (both committed source generated and dist/ consumer paths)
  const distCssPath = path.join(distCssDir, "tokens.css");
  const srcCssPath = path.join(generatedDir, "tokens.css");
  const tsPath = path.join(generatedDir, "tokens.ts");

  fs.writeFileSync(distCssPath, result.css, "utf-8");
  fs.writeFileSync(srcCssPath, result.css, "utf-8");
  fs.writeFileSync(tsPath, result.tsCode, "utf-8");

  console.log(`✅ Design Tokens compiled successfully:`);
  console.log(`   - Global tokens:   ${result.globalTokens.length}`);
  console.log(`   - Semantic tokens: ${result.semanticTokens.length}`);
  console.log(`   - Dark overrides:  ${result.darkThemeTokens.length}`);
  console.log(`   -> Dist CSS output: ${path.relative(packageRoot, distCssPath)}`);
  console.log(`   -> Src CSS output:  ${path.relative(packageRoot, srcCssPath)}`);
  console.log(`   -> TS definitions:  ${path.relative(packageRoot, tsPath)}`);

  return result;
}

// Execute when invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBuild();
}
