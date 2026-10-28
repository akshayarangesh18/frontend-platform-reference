# Frontend Platform Reference

> A production-grade frontend platform and design systems architecture reference demonstrating monorepo engineering, W3C design tokens, zero-runtime theming, CI drift detection, and accessible component primitives.

---

## 🏛 Architecture Overview

```
frontend-platform/
├── apps/
│   └── docs/                     # Interactive documentation & showcase portal (upcoming)
├── packages/
│   ├── tokens/                   # Single source of truth for design tokens (DTCG standard)
│   ├── ui/                       # Reusable accessible component library (upcoming)
│   └── tsconfig/                 # Shared TypeScript configurations across the workspace
├── tooling/
│   └── token-compiler/           # Token compiler & validation logic (upcoming)
├── .github/
│   └── workflows/ci.yml          # CI pipeline: Lint, Typecheck, Test, and Token Drift Detection
├── pnpm-workspace.yaml           # pnpm workspace definition
├── turbo.json                    # Turborepo task pipeline configuration
└── package.json                  # Root scripts & dev dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20+` (or `v24+`)
- **pnpm**: `v9.15+` (managed via [Corepack](https://nodejs.org/api/corepack.html) or [pnpm standalone installer](https://pnpm.io/installation))

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build All Packages

```bash
pnpm build
```

Turborepo orchestrates the build graph. The first run executes tasks; subsequent runs return `>>> FULL TURBO` (instant cache hits).

### 3. Type Checking

```bash
pnpm typecheck
```

Runs `tsc --noEmit` across all workspace packages according to topological dependency order.

### 4. Token Governance & Drift Detection

```bash
# Validate token rules (no raw hex in semantic tokens, theme parity, valid references)
pnpm validate

# Check that committed dist artifacts match source JSON definitions
pnpm test:drift
```

### 5. Clean Artifacts

```bash
pnpm clean
```

Purges all generated `dist/` directories across packages.

---

## 🧩 Workspace Packages

| Package | Path | Purpose |
| :--- | :--- | :--- |
| `@frontend-platform/tsconfig` | `packages/tsconfig` | Shared base and React TS configurations (`moduleResolution: Bundler`) |
| `@frontend-platform/tokens` | `packages/tokens` | W3C design tokens, CSS custom properties, and typed constants |

---

## 🗺 Implementation Roadmap

- [x] **Phase 1: Foundation & Tooling Scaffolding** — pnpm workspaces, Turborepo caching, shared tsconfig, runnable smoke test.
- [x] **Phase 2: Design Token Pipeline** — W3C DTCG multi-tier tokens (Global, Semantic, Theme), token compiler, CSS custom properties & TS types.
- [x] **Phase 3: Token Governance & CI Drift Detection** — Automated drift verification in CI (`git diff --exit-code`), architectural governance rules (semantic discipline, theme parity).
- [ ] **Phase 4: Component Library Architecture** — Zero-runtime CSS Modules + CVA, `@radix-ui/react-slot` (`asChild` pattern), WAI-ARIA accessibility primitives (`Button`, `Text`, `Stack`).
- [ ] **Phase 5: Documentation & Showcase** — Live interactive playground, theme switcher, token visualizer.
- [ ] **Phase 6: Release Engineering & Consumer Contract** — Subpath exports (`package.json#exports`), tree-shaking validation, Changesets release flow.

