import { flattenTokens } from "./parser.js";
import { resolveTokens } from "./resolver.js";
import { generateCss, generateTypeScript } from "./generators.js";
import { validateTokens } from "./validator.js";
import type { DesignTokenGroup, CompilerResult } from "./types.js";
import type { RawParsedToken } from "./parser.js";
import type { ValidationReport } from "./validator.js";

export * from "./types.js";
export * from "./parser.js";
export * from "./resolver.js";
export * from "./generators.js";
export * from "./validator.js";

export interface CompileOptions {
  globalGroups: DesignTokenGroup[];
  semanticGroups: DesignTokenGroup[];
  darkThemeGroups: DesignTokenGroup[];
  prefix?: string;
}

/**
 * Validates token groups against governance rules.
 */
export function checkTokenGovernance({
  globalGroups,
  semanticGroups,
  darkThemeGroups,
  prefix = "--fp"
}: CompileOptions): ValidationReport {
  const rawGlobal = globalGroups.flatMap((g) => flattenTokens(g, "", prefix));
  const rawSemantic = semanticGroups.flatMap((g) => flattenTokens(g, "", prefix));
  const rawDark = darkThemeGroups.flatMap((g) => flattenTokens(g, "", prefix));

  return validateTokens(rawGlobal, rawSemantic, rawDark);
}

/**
 * Compiles W3C DTCG token groups into CSS Custom Properties and TypeScript definitions.
 */
export function compileTokens({
  globalGroups,
  semanticGroups,
  darkThemeGroups,
  prefix = "--fp"
}: CompileOptions): CompilerResult {
  // 1. Flatten all groups
  const rawGlobal = globalGroups.flatMap((g) => flattenTokens(g, "", prefix));
  const rawSemantic = semanticGroups.flatMap((g) => flattenTokens(g, "", prefix));
  const rawDark = darkThemeGroups.flatMap((g) => flattenTokens(g, "", prefix));

  // 2. Validate governance rules before compilation
  const validation = validateTokens(rawGlobal, rawSemantic, rawDark);
  if (!validation.isValid) {
    const errorDetails = validation.errors
      .map((e) => `   - [${e.rule}] ${e.message}`)
      .join("\n");
    throw new Error(`Token governance validation failed:\n${errorDetails}`);
  }

  // 3. Build complete registry for global & light semantic resolution
  const registry = new Map<string, RawParsedToken>();
  for (const t of [...rawGlobal, ...rawSemantic]) {
    registry.set(t.path, t);
  }

  // 4. Resolve global and semantic tokens
  const globalTokens = resolveTokens(rawGlobal, registry, prefix);
  const semanticTokens = resolveTokens(rawSemantic, registry, prefix);

  // 5. Build dark registry (global primitives + dark overrides)
  const darkRegistry = new Map<string, RawParsedToken>(registry);
  for (const t of rawDark) {
    darkRegistry.set(t.path, t);
  }
  const darkThemeTokens = resolveTokens(rawDark, darkRegistry, prefix);

  // 6. Generate outputs
  const css = generateCss(globalTokens, semanticTokens, darkThemeTokens);
  const tsCode = generateTypeScript(globalTokens, semanticTokens);

  return {
    globalTokens,
    semanticTokens,
    darkThemeTokens,
    css,
    tsCode
  };
}
