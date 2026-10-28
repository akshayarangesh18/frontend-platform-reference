/**
 * Design Token Compiler Type Definitions
 * Aligned with W3C Design Tokens Community Group (DTCG) specification.
 */

export type TokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "lineHeight"
  | "shadow"
  | "duration"
  | "cubicBezier";

export interface DesignToken {
  $value: string;
  $type?: TokenType;
  $description?: string;
  [key: string]: unknown;
}

export interface DesignTokenGroup {
  [key: string]: DesignToken | DesignTokenGroup;
}

export interface FlatToken {
  /** Dot-separated token path, e.g. "color.background.surface.default" */
  path: string;
  /** CSS custom property name, e.g. "--fp-color-background-surface-default" */
  cssVar: string;
  /** Raw unparsed value, e.g. "{color.white}" or "#ffffff" */
  rawValue: string;
  /** Resolved concrete value, e.g. "#ffffff" */
  resolvedValue: string;
  /** CSS representation, e.g. "var(--fp-color-white)" or "#ffffff" */
  cssValue: string;
  type?: TokenType;
  description?: string;
}

export interface CompilerResult {
  globalTokens: FlatToken[];
  semanticTokens: FlatToken[];
  darkThemeTokens: FlatToken[];
  css: string;
  tsCode: string;
}
