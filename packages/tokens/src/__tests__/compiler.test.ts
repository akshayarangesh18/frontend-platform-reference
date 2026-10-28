import { describe, it, expect } from "vitest";
import {
  toKebabCase,
  pathToCssVar,
  flattenTokens,
  resolveConcreteValue,
  resolveCssValue,
  compileTokens
} from "../compiler/index.js";
import type { DesignTokenGroup } from "../compiler/types.js";
import type { RawParsedToken } from "../compiler/parser.js";

describe("Token Compiler: Parser", () => {
  it("converts camelCase and PascalCase strings to kebab-case", () => {
    expect(toKebabCase("fontSize")).toBe("font-size");
    expect(toKebabCase("successSubtle")).toBe("success-subtle");
    expect(toKebabCase("backgroundColor")).toBe("background-color");
    expect(toKebabCase("simple")).toBe("simple");
  });

  it("converts token dot paths to CSS custom property names", () => {
    expect(pathToCssVar("color.blue.500")).toBe("--fp-color-blue-500");
    expect(pathToCssVar("typography.fontSize.sm")).toBe("--fp-typography-font-size-sm");
    expect(pathToCssVar("color.background.surface.default")).toBe(
      "--fp-color-background-surface-default"
    );
  });

  it("recursively flattens nested DTCG token groups", () => {
    const group: DesignTokenGroup = {
      color: {
        brand: {
          primary: { $value: "#2563eb", "$type": "color" },
          secondary: { $value: "#3b82f6", "$type": "color" }
        }
      }
    };

    const flat = flattenTokens(group);
    expect(flat).toHaveLength(2);
    expect(flat[0]).toEqual({
      path: "color.brand.primary",
      cssVar: "--fp-color-brand-primary",
      token: { $value: "#2563eb", "$type": "color" }
    });
    expect(flat[1]).toEqual({
      path: "color.brand.secondary",
      cssVar: "--fp-color-brand-secondary",
      token: { $value: "#3b82f6", "$type": "color" }
    });
  });
});

describe("Token Compiler: Resolver", () => {
  const sampleRegistry = new Map<string, RawParsedToken>([
    [
      "color.blue.500",
      {
        path: "color.blue.500",
        cssVar: "--fp-color-blue-500",
        token: { $value: "#3b82f6", "$type": "color" }
      }
    ],
    [
      "color.interactive.default",
      {
        path: "color.interactive.default",
        cssVar: "--fp-color-interactive-default",
        token: { $value: "{color.blue.500}", "$type": "color" }
      }
    ],
    [
      "button.primary.bg",
      {
        path: "button.primary.bg",
        cssVar: "--fp-button-primary-bg",
        token: { $value: "{color.interactive.default}", "$type": "color" }
      }
    ]
  ]);

  it("resolves direct values", () => {
    expect(resolveConcreteValue("color.blue.500", sampleRegistry)).toBe("#3b82f6");
  });

  it("resolves single and chained aliases to the ultimate primitive value", () => {
    expect(resolveConcreteValue("color.interactive.default", sampleRegistry)).toBe("#3b82f6");
    expect(resolveConcreteValue("button.primary.bg", sampleRegistry)).toBe("#3b82f6");
  });

  it("translates aliases to CSS var() references", () => {
    expect(resolveCssValue("{color.blue.500}", sampleRegistry)).toBe("var(--fp-color-blue-500)");
    expect(resolveCssValue("{color.interactive.default}", sampleRegistry)).toBe(
      "var(--fp-color-interactive-default)"
    );
  });

  it("throws on circular token references", () => {
    const cyclicRegistry = new Map<string, RawParsedToken>([
      [
        "token.a",
        {
          path: "token.a",
          cssVar: "--fp-token-a",
          token: { $value: "{token.b}" }
        }
      ],
      [
        "token.b",
        {
          path: "token.b",
          cssVar: "--fp-token-b",
          token: { $value: "{token.a}" }
        }
      ]
    ]);

    expect(() => resolveConcreteValue("token.a", cyclicRegistry)).toThrowError(
      /Circular token reference detected/
    );
  });

  it("throws when referencing a non-existent token", () => {
    expect(() => resolveConcreteValue("color.does.not.exist", sampleRegistry)).toThrowError(
      /was not found in token registry/
    );
  });
});

describe("Token Compiler: End-to-End Compilation", () => {
  it("compiles global, semantic, and dark theme groups into CSS and TS", () => {
    const globalGroup: DesignTokenGroup = {
      color: {
        white: { $value: "#ffffff", "$type": "color" },
        gray: {
          900: { $value: "#111827", "$type": "color" }
        }
      }
    };

    const semanticGroup: DesignTokenGroup = {
      color: {
        background: {
          surface: { $value: "{color.white}", "$type": "color" }
        }
      }
    };

    const darkGroup: DesignTokenGroup = {
      color: {
        background: {
          surface: { $value: "{color.gray.900}", "$type": "color" }
        }
      }
    };

    const result = compileTokens({
      globalGroups: [globalGroup],
      semanticGroups: [semanticGroup],
      darkThemeGroups: [darkGroup],
      prefix: "--fp"
    });

    expect(result.css).toContain(":root {");
    expect(result.css).toContain("--fp-color-white: #ffffff;");
    expect(result.css).toContain("--fp-color-background-surface: var(--fp-color-white);");
    expect(result.css).toContain('[data-theme="dark"] {');
    expect(result.css).toContain(
      "--fp-color-background-surface: var(--fp-color-gray-900);"
    );

    expect(result.tsCode).toContain('export const tokens = {');
    expect(result.tsCode).toContain('"color.background.surface": "#ffffff"');
    expect(result.tsCode).toContain('export const cssVariables = {');
    expect(result.tsCode).toContain(
      '"color.background.surface": "--fp-color-background-surface"'
    );
  });
});

