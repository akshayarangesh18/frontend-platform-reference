import type { DesignToken, DesignTokenGroup } from "./types.js";

/**
 * Converts a camelCase or PascalCase string to kebab-case.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Converts a dot-separated token path to a CSS Custom Property name.
 * e.g. "color.background.surface.default" -> "--fp-color-background-surface-default"
 * e.g. "typography.fontSize.sm" -> "--fp-typography-font-size-sm"
 */
export function pathToCssVar(path: string, prefix = "--fp"): string {
  const segments = path.split(".").map(toKebabCase);
  return `${prefix}-${segments.join("-")}`;
}

export interface RawParsedToken {
  path: string;
  cssVar: string;
  token: DesignToken;
}

/**
 * Recursively traverses a DTCG token group and returns a flat list of tokens.
 */
export function flattenTokens(
  group: DesignTokenGroup,
  parentPath = "",
  prefix = "--fp"
): RawParsedToken[] {
  const result: RawParsedToken[] = [];

  for (const [key, value] of Object.entries(group)) {
    if (!value || typeof value !== "object") continue;

    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    if ("$value" in value && typeof value.$value === "string") {
      result.push({
        path: currentPath,
        cssVar: pathToCssVar(currentPath, prefix),
        token: value as DesignToken
      });
    } else {
      result.push(
        ...flattenTokens(value as DesignTokenGroup, currentPath, prefix)
      );
    }
  }

  return result;
}

