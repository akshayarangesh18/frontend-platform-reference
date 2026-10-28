import { describe, it, expect } from "vitest";
import { validateTokens } from "../compiler/validator.js";
import type { RawParsedToken } from "../compiler/parser.js";

describe("Token Governance & Validation Rules", () => {
  const validGlobal: RawParsedToken[] = [
    {
      path: "color.blue.500",
      cssVar: "--fp-color-blue-500",
      token: { $value: "#3b82f6", $type: "color" }
    },
    {
      path: "color.gray.900",
      cssVar: "--fp-color-gray-900",
      token: { $value: "#111827", $type: "color" }
    }
  ];

  it("passes when tokens adhere to all governance rules", () => {
    const validSemantic: RawParsedToken[] = [
      {
        path: "color.background.surface.default",
        cssVar: "--fp-color-background-surface-default",
        token: { $value: "{color.blue.500}", $type: "color" }
      }
    ];

    const validDark: RawParsedToken[] = [
      {
        path: "color.background.surface.default",
        cssVar: "--fp-color-background-surface-default",
        token: { $value: "{color.gray.900}", $type: "color" }
      }
    ];

    const report = validateTokens(validGlobal, validSemantic, validDark);
    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("flags semantic tokens containing raw hex color literals", () => {
    const invalidSemantic: RawParsedToken[] = [
      {
        path: "color.background.surface.default",
        cssVar: "--fp-color-background-surface-default",
        token: { $value: "#ff0000", $type: "color" } // ❌ VIOLATION
      }
    ];

    const report = validateTokens(validGlobal, invalidSemantic, []);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.rule === "semantic-layer-discipline")).toBe(true);
    expect(report.errors[0].message).toContain("contains raw color literal");
  });

  it("flags semantic tokens that do not reference a primitive alias", () => {
    const invalidSemantic: RawParsedToken[] = [
      {
        path: "spacing.inset.sm",
        cssVar: "--fp-spacing-inset-sm",
        token: { $value: "16px", $type: "dimension" } // ❌ VIOLATION: Should be {spacing.4}
      }
    ];

    const report = validateTokens(validGlobal, invalidSemantic, []);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.rule === "semantic-layer-must-reference-primitive")).toBe(
      true
    );
  });

  it("flags dark theme overrides that do not exist in the base semantic token set", () => {
    const validSemantic: RawParsedToken[] = [
      {
        path: "color.background.surface.default",
        cssVar: "--fp-color-background-surface-default",
        token: { $value: "{color.blue.500}", $type: "color" }
      }
    ];

    const orphanDark: RawParsedToken[] = [
      {
        path: "color.background.surface.nonexistent", // ❌ VIOLATION: Not in semantic set
        cssVar: "--fp-color-background-surface-nonexistent",
        token: { $value: "{color.gray.900}", $type: "color" }
      }
    ];

    const report = validateTokens(validGlobal, validSemantic, orphanDark);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.rule === "theme-parity")).toBe(true);
  });

  it("flags broken alias references pointing to non-existent tokens", () => {
    const brokenSemantic: RawParsedToken[] = [
      {
        path: "color.background.surface.default",
        cssVar: "--fp-color-background-surface-default",
        token: { $value: "{color.ghost.primitive}", $type: "color" } // ❌ VIOLATION: Does not exist
      }
    ];

    const report = validateTokens(validGlobal, brokenSemantic, []);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.rule === "reference-integrity")).toBe(true);
    expect(report.errors[0].message).toContain('references "color.ghost.primitive"');
  });
});
