import type { FlatToken } from "./types.js";
import type { RawParsedToken } from "./parser.js";

export interface ValidationError {
  path: string;
  rule: string;
  message: string;
}

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_REGEX = /^rgba?\(.+\)$/i;
const HSL_COLOR_REGEX = /^hsla?\(.+\)$/i;

/**
 * Validates design tokens against architecture and governance rules:
 * 1. Semantic Layer Discipline: Semantic tokens must NOT contain raw hex/rgb/hsl literals.
 *    They MUST reference a global primitive via `{alias}`.
 * 2. Theme Parity: Theme override tokens must map to an existing semantic token path.
 * 3. Reference Integrity: All `{alias}` references must point to existing tokens.
 */
export function validateTokens(
  globalTokens: RawParsedToken[],
  semanticTokens: RawParsedToken[],
  darkThemeTokens: RawParsedToken[]
): ValidationReport {
  const errors: ValidationError[] = [];

  // 1. Build registry of all known paths
  const allKnownPaths = new Set<string>([
    ...globalTokens.map((t) => t.path),
    ...semanticTokens.map((t) => t.path)
  ]);
  const semanticPaths = new Set<string>(semanticTokens.map((t) => t.path));

  // 2. Validate Semantic Layer Discipline
  for (const token of semanticTokens) {
    const raw = token.token.$value.trim();

    if (
      HEX_COLOR_REGEX.test(raw) ||
      RGB_COLOR_REGEX.test(raw) ||
      HSL_COLOR_REGEX.test(raw)
    ) {
      errors.push({
        path: token.path,
        rule: "semantic-layer-discipline",
        message: `Semantic token "${token.path}" contains raw color literal "${raw}". Semantic tokens must reference a global primitive (e.g. "{color.gray.900}").`
      });
    }

    if (!raw.includes("{")) {
      errors.push({
        path: token.path,
        rule: "semantic-layer-must-reference-primitive",
        message: `Semantic token "${token.path}" does not reference a primitive alias. Found literal: "${raw}".`
      });
    }
  }

  // 3. Validate Theme Parity (Dark theme tokens must override existing semantic tokens)
  for (const darkToken of darkThemeTokens) {
    if (!semanticPaths.has(darkToken.path)) {
      errors.push({
        path: darkToken.path,
        rule: "theme-parity",
        message: `Theme override "${darkToken.path}" does not exist in the base semantic token set. Themes may only override existing semantic tokens.`
      });
    }
  }

  // 4. Validate Reference Integrity
  const allTokens = [...globalTokens, ...semanticTokens, ...darkThemeTokens];
  const ALIAS_REGEX = /\{([^}]+)\}/g;

  for (const token of allTokens) {
    const raw = token.token.$value;
    let match: RegExpExecArray | null;

    while ((match = ALIAS_REGEX.exec(raw)) !== null) {
      const targetPath = match[1].trim();
      if (!allKnownPaths.has(targetPath)) {
        errors.push({
          path: token.path,
          rule: "reference-integrity",
          message: `Token "${token.path}" references "${targetPath}", which does not exist in the token registry.`
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
