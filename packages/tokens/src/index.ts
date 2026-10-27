/**
 * Design Tokens Entry Point
 * Initial smoke-test definition validating monorepo compilation & type safety.
 */

export const platformMeta = {
  name: "@frontend-platform/tokens",
  version: "0.1.0",
  tier: "design-system-foundation"
} as const;

export type PlatformMeta = typeof platformMeta;
