# Status Tooling (JavaScript)

Vendor-neutral reference tooling for the [Open Operational State](https://github.com/open-operational-state) standard.

[![npm](https://img.shields.io/npm/v/@open-operational-state/core)](https://www.npmjs.com/org/open-operational-state)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

## Install

```bash
npm install @open-operational-state/oos
```

Probe any endpoint:

```bash
npx @open-operational-state/oos probe https://api.example.com/health
```

Or after local install:

```bash
npx oos probe https://api.example.com/health
```

## Programmatic Usage

### Producer SDK — expose operational state

```js
// Express
import { serve } from '@open-operational-state/oos';
import { toExpressHandler } from '@open-operational-state/oos/express';

const handler = serve( { subject: { id: 'my-api', version: '1.2.0' } } );
app.get( '/health', toExpressHandler( handler ) );
```

```js
// Next.js App Router (app/health/route.js)
import { serve } from '@open-operational-state/oos';
import { toWebHandler } from '@open-operational-state/oos/web';

const handler = serve( { subject: { id: 'my-api' } } );
export const GET = toWebHandler( handler );
```

Adapters available for Express, Next.js, Fastify, Hono, Koa, Nuxt/Nitro, and Node `http`. See the [oos README](packages/oos/README.md) for check registries, hooks, content negotiation, discovery, and all 7 framework adapters.

### Consumer SDK — probe any endpoint

```js
import { probe } from '@open-operational-state/oos';

const result = await probe( 'https://api.example.com/health' );
console.log( result.snapshot.condition ); // 'operational'
```

### Lower-level packages

```js
import { normalizeSnapshot } from '@open-operational-state/core';
import { emitHealthResponse, suggestHttpStatus } from '@open-operational-state/emitter';

app.get( '/health', ( req, res ) => {
    const snapshot = normalizeSnapshot( {
        condition: 'operational',
        profiles: [ 'health' ],
        subject: { id: 'my-api' },
        timing: { observed: new Date().toISOString() },
    } );

    res.status( suggestHttpStatus( snapshot ) ).json( emitHealthResponse( snapshot ) );
} );
```

## Overview

This monorepo is the JavaScript implementation of the `@open-operational-state` npm packages — a complete toolkit for probing, parsing, emitting, validating, and discovering operational-state resources. All packages are published to npm, written in TypeScript, and use ESM.

Future implementations in other languages (Go, PHP, etc.) will live in separate repos under the same organization.

## Packages

| Package | Purpose | Version |
|---|---|---|
| [`@open-operational-state/oos`](packages/oos/) | Developer-facing package — producer SDK, CLI, programmatic API | 0.3.0 |
| [`@open-operational-state/probe`](packages/probe/) | Endpoint probing — fetch, detect, parse, normalize | 0.3.0 |
| [`@open-operational-state/types`](packages/types/) | Canonical TypeScript types for the core model | 0.3.0 |
| [`@open-operational-state/core`](packages/core/) | Core model logic, normalization, validation | 0.3.0 |
| [`@open-operational-state/parser`](packages/parser/) | Response parsers and format adapters | 0.3.0 |
| [`@open-operational-state/emitter`](packages/emitter/) | Wire format emitters | 0.3.0 |
| [`@open-operational-state/validator`](packages/validator/) | Conformance validation and fixture runner | 0.3.0 |
| [`@open-operational-state/discovery`](packages/discovery/) | Discovery client (Link headers, well-known) | 0.3.0 |

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run all tests
bun run test

# Probe a live endpoint
node packages/oos/dist/cli.js probe https://api.example.com/health

# Run conformance fixtures
node packages/oos/dist/cli.js fixtures ../status-conformance/fixtures/core --format=table
```

## CLI

The `oos` CLI is included in the `@open-operational-state/oos` package:

```bash
oos probe <url>          # Fetch a URL, auto-detect format, parse to core model
oos validate <file>      # Validate a JSON file against conformance levels
oos fixtures <dir>       # Run all conformance fixtures in a directory
oos inspect <file>       # Parse a JSON file, pretty-print core model
```

See the [oos README](packages/oos/README.md) for full CLI documentation.

## Examples

See [examples/](examples/) for real-world usage patterns — Express, Hono, `safeParse()`, discovery, and component aggregation in ~10 lines each.

## Supported Formats

| Format | Content-Type | Adapter |
|---|---|---|
| OOS Native (health) | `application/health+json` | `parseHealthResponse` |
| OOS Native (status) | `application/status+json` | `parseHealthResponse` |
| Health Check Draft | `application/json` | `parseHealthCheckDraft` |
| Spring Boot Actuator | `application/json` | `parseSpringBoot` |
| Plain HTTP | any | `parsePlainHttp` |

Format detection is automatic — the `parse()` function inspects content-type and body structure to select the correct adapter.

## Architecture

This tooling implements the six-layer architecture defined in the [status-spec](https://github.com/open-operational-state/status-spec/blob/main/ARCHITECTURE.md):

- **`types`** — TypeScript interfaces for the core model (Layer 1)
- **`core`** — normalization and manipulation of core model instances
- **`parser`** — deserialization from wire formats to core model (Layers 3–4)
- **`emitter`** — serialization from core model to wire formats (Layer 3)
- **`discovery`** — discovery client for locating operational-state resources (Layer 5)
- **`probe`** — end-to-end endpoint probing (orchestrates parser, core, discovery)
- **`validator`** — conformance validation against profiles and serializations (cross-cutting)
- **`oos`** — developer-facing umbrella: producer SDK (`serve()`, hooks, check registry, content negotiation, discovery, lifecycle), CLI, and programmatic consumer API

## Dependency Graph

```
types         ← (no deps)
core          ← types
parser        ← core, types
emitter       ← core, types
discovery     ← types
probe         ← types, core, parser, discovery
validator     ← types, core, parser, probe
oos           ← types, core, emitter, probe, validator
```

## Testing

Tests are fixture-driven where applicable. Conformance fixtures are read directly from the sibling `status-conformance` repository:

```bash
# Run all tests
bun run test

# Run tests for a specific package
bun run --filter '@open-operational-state/parser' test
```

### Round-Trip Invariants

The emitter package includes golden round-trip tests that enforce:

```
parse → normalize → emit → parse → normalize
```

No semantic drift, no loss of required data, no illegal state introduced.

## Related Repositories

| Repository | Purpose |
|---|---|
| [status-spec](https://github.com/open-operational-state/status-spec) | Technical specification (what tooling implements) |
| [status-conformance](https://github.com/open-operational-state/status-conformance) | Conformance fixtures and test taxonomy |
| [governance](https://github.com/open-operational-state/governance) | Charter, terminology, roadmap |

## Project Rules

See [PROJECT_RULES.md](PROJECT_RULES.md) for repo-specific constraints. Key points:

- **ESM only** — no CommonJS
- **Bun** package manager and test runner
- **Node.js + TypeScript** — compiled output targets ES2022
- All behavior must be represented in fixtures or spec

## License

Licensed under [Apache 2.0](LICENSE).
