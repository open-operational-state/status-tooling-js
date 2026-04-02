# Status Tooling

Vendor-neutral reference tooling for the [Open Operational State](https://github.com/open-operational-state) standard.

## Overview

This monorepo contains shared packages for parsing, emitting, validating, and discovering operational-state resources. All packages are written in TypeScript, use ESM, and are managed with Bun workspaces.

## Packages

| Package | Purpose | Status |
|---|---|---|
| [`@open-operational-state/types`](packages/types/) | Canonical TypeScript types for the core model | Stub — Phase 4 priority 2 |
| [`@open-operational-state/core`](packages/core/) | Core model logic and normalization | Stub — Phase 4 priority 2 |
| [`@open-operational-state/parser`](packages/parser/) | Response parsers for supported serializations | Stub — Phase 4 priority 3 |
| [`@open-operational-state/emitter`](packages/emitter/) | Response emitters/generators | Stub — Phase 4 priority 4 |
| [`@open-operational-state/validator`](packages/validator/) | Conformance validator | Stub — Phase 4 priority 1 |
| [`@open-operational-state/discovery`](packages/discovery/) | Discovery client | Stub — Phase 4 priority 5 |

## Getting Started

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun run test
```

## Architecture

This tooling implements the six-layer architecture defined in the [status-spec](https://github.com/open-operational-state/status-spec/blob/main/ARCHITECTURE.md):

- **`types`** — TypeScript interfaces for the core model (Layer 1)
- **`core`** — normalization and manipulation of core model instances
- **`parser`** — deserialization from wire formats to core model (Layer 3)
- **`emitter`** — serialization from core model to wire formats (Layer 3)
- **`validator`** — conformance validation against profiles and serializations (cross-cutting)
- **`discovery`** — discovery client for locating operational-state resources (Layer 5)

## Dependencies Between Packages

```
types ← core ← parser
                emitter
                validator
                discovery
```

All packages depend on `types`. Most depend on `core`. Parser, emitter, validator, and discovery are siblings.

## Related Repositories

| Repository | Purpose |
|---|---|
| [status-spec](https://github.com/open-operational-state/status-spec) | Technical specification (what tooling implements) |
| [status-conformance](https://github.com/open-operational-state/status-conformance) | Conformance fixtures and test taxonomy |
| [governance](https://github.com/open-operational-state/governance) | Charter, terminology, roadmap |

## Project Rules

See [PROJECT_RULES.md](PROJECT_RULES.md) for repo-specific constraints. Key points:

- **ESM only** — no CommonJS
- **Bun** package manager
- **Node.js + TypeScript** only — no other runtimes in v1
- The specification in `status-spec` is now stable (Phase 3 complete) — substantive implementation may proceed

## License

Licensed under [Apache 2.0](LICENSE).
