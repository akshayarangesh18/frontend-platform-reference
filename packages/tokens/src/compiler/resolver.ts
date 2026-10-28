import { pathToCssVar } from "./parser.js";
import type { FlatToken } from "./types.js";
import type { RawParsedToken } from "./parser.js";

const ALIAS_REGEX = /\{([^}]+)\}/g;

/**
 * Resolves a token value to its concrete primitive value by recursively dereferencing aliases.
 * Detects circular references and missing token definitions.
 */
export function resolveConcreteValue(
  path: string,
  tokenMap: Map<string, RawParsedToken>,
  visited: Set<string> = new Set()
): string {
  if (visited.has(path)) {
    const cycle = [...visited, path].join(" -> ");
    throw new Error(`Circular token reference detected: ${cycle}`);
  }

  const tokenEntry = tokenMap.get(path);
  if (!tokenEntry) {
    throw new Error(`Token reference "${path}" was not found in token registry.`);
  }

  const raw = tokenEntry.token.$value;
  if (!raw.includes("{")) {
    return raw;
  }

  visited.add(path);

  // Replace all {alias} occurrences with their resolved values
  const resolved = raw.replace(ALIAS_REGEX, (_, targetPath: string) => {
    return resolveConcreteValue(targetPath.trim(), tokenMap, new Set(visited));
  });

  visited.delete(path);
  return resolved;
}

/**
 * Resolves a token value to its CSS representation.
 * Translates DTCG aliases like "{color.blue.500}" to "var(--fp-color-blue-500)".
 */
export function resolveCssValue(
  raw: string,
  tokenMap: Map<string, RawParsedToken>,
  prefix = "--fp"
): string {
  if (!raw.includes("{")) {
    return raw;
  }

  return raw.replace(ALIAS_REGEX, (_, targetPath: string) => {
    const trimmed = targetPath.trim();
    if (!tokenMap.has(trimmed)) {
      throw new Error(`Referenced token "${trimmed}" not found in token registry.`);
    }
    return `var(${pathToCssVar(trimmed, prefix)})`;
  });
}

/**
 * Resolves an array of parsed tokens against the complete token registry.
 */
export function resolveTokens(
  tokens: RawParsedToken[],
  registry: Map<string, RawParsedToken>,
  prefix = "--fp"
): FlatToken[] {
  return tokens.map(({ path, cssVar, token }) => {
    const rawValue = token.$value;
    const resolvedValue = resolveConcreteValue(path, registry);
    const cssValue = resolveCssValue(rawValue, registry, prefix);

    return {
      path,
      cssVar,
      rawValue,
      resolvedValue,
      cssValue,
      type: token.$type,
      description: token.$description
    };
  });
}

