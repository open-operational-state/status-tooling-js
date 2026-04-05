# @open-operational-state/oos

The developer-facing package for [Open Operational State](https://github.com/open-operational-state). Install this one package to get the CLI, the programmatic consumer API, and the full producer SDK.

[![npm](https://img.shields.io/npm/v/@open-operational-state/oos)](https://www.npmjs.com/package/@open-operational-state/oos)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../../LICENSE)

## Install

```bash
npm install @open-operational-state/oos
```

---

## Producer SDK

Expose spec-conformant operational state from any JavaScript service. Framework-agnostic core with adapters for every major runtime.

### Quick Start

```js
import { serve } from '@open-operational-state/oos';
import { toWebHandler } from '@open-operational-state/oos/web';

const handler = serve( {
    subject: { id: 'my-api', version: '1.2.0' },
} );

// Bun / Deno / Cloudflare Workers
export default { fetch: toWebHandler( handler ) };
```

### Framework Adapters

| Import | Frameworks |
|---|---|
| `oos/web` | Bun, Deno, Workers, Remix, SvelteKit, Astro |
| `oos/express` | Express |
| `oos/fastify` | Fastify |
| `oos/hono` | Hono |
| `oos/h3` | Nuxt / Nitro |
| `oos/koa` | Koa |
| `oos/node-http` | Node.js `http.createServer` |

### Condition Providers

```js
// Static
serve( { subject: { id: 'api' }, condition: Condition.OPERATIONAL } );

// Dynamic (async)
serve( {
    subject: { id: 'api' },
    condition: async () => db.isHealthy() ? 'operational' : 'degraded',
} );

// Check registry (automatic aggregation)
const registry = createCheckRegistry();
registry.register( {
    name: 'database',
    role: 'dependency',
    check: async () => ( { condition: await db.ping() ? 'operational' : 'down' } ),
} );

serve( { subject: { id: 'api' }, registry } );
```

### Exposure Tiers

Control what data is visible to unauthenticated vs. authenticated consumers:

```js
serve( {
    subject: { id: 'api' },
    exposure: Exposure.CONDITION_ONLY,              // public (default)
    authenticatedExposure: Exposure.FULL_DIAGNOSTIC, // internal
    isAuthenticated: ( req ) => req.headers.authorization === 'Bearer ...',
} );
```

| Tier | Fields |
|---|---|
| `CONDITION_ONLY` | `condition`, `profiles`, `subject.id` |
| `CONDITION_METADATA` | + `timing`, `provenance` |
| `COMPONENT_LEVEL` | + `checks`, `components` |
| `FULL_DIAGNOSTIC` | + `evidence`, `scope`, everything |

### Content Negotiation

Serve both `application/health+json` and `application/status+json` from a single endpoint:

```js
serve( {
    subject: { id: 'api' },
    serialization: [ 'health-response', 'service-status' ],
} );
// Accept: application/status+json → service-status format
// Accept: application/health+json → health-response (default)
```

### Observable Hooks

Monitor conditions, failures, and request metrics:

```js
const hooks = createHooks();

hooks.on( 'conditionChanged', ( e ) => {
    alert( `${e.previous} → ${e.current}` );
} );

hooks.on( 'checkFailed', ( e ) => {
    log.error( `Check ${e.name} failed`, { timedOut: e.timedOut } );
} );

hooks.on( 'requestHandled', ( e ) => {
    metrics.histogram( 'oos.duration', e.durationMs );
} );

serve( { subject: { id: 'api' }, hooks } );
```

### Discovery

Serve the `/.well-known/operational-state` discovery document:

```js
import { createDiscoveryHandler } from '@open-operational-state/oos';

const discovery = createDiscoveryHandler( {
    subject: { id: 'my-api' },
    resources: [
        { href: '/health', profiles: [ 'health' ], serialization: 'application/health+json' },
    ],
} );
```

Add discovery Link headers to health responses:

```js
serve( {
    subject: { id: 'api' },
    discoveryPath: '/.well-known/operational-state',
} );
// Responses include: Link: </.well-known/operational-state>; rel="operational-state"
```

### Lifecycle Management

Graceful startup/shutdown with Kubernetes probe support:

```js
import { createLifecycle } from '@open-operational-state/oos';

const lifecycle = createLifecycle( {
    onShutdown: async () => { await db.close(); },
} );

serve( {
    subject: { id: 'api' },
    condition: lifecycle.conditionProvider,
} );

lifecycle.markReady(); // condition: initializing → operational
// SIGTERM/SIGINT → condition: not-ready → onShutdown()
```

### Named Constants

All vocabulary as typed constants — no magic strings:

```js
import {
    Condition,       // OPERATIONAL, DEGRADED, DOWN, UNKNOWN, ...
    Profile,         // HEALTH, LIVENESS, READINESS, STATUS
    Exposure,        // CONDITION_ONLY, CONDITION_METADATA, COMPONENT_LEVEL, FULL_DIAGNOSTIC
    ProvenanceType,  // SELF_REPORTED, PROBE_DERIVED, AGGREGATED
    Role,            // COMPONENT, DEPENDENCY
} from '@open-operational-state/oos';
```

---

## CLI

After installing, the `oos` binary is available:

```bash
npx oos probe https://api.example.com/health
npx oos validate snapshot.json
npx oos fixtures ./conformance-fixtures --format=table
npx oos inspect snapshot.json
```

Or run without installing:

```bash
npx @open-operational-state/oos probe https://api.example.com/health
```

### Commands

| Command | Description |
|---|---|
| `probe <url>` | Fetch a URL, auto-detect format, parse to core model |
| `validate <file>` | Validate a JSON file against conformance levels |
| `fixtures <dir>` | Run all conformance fixtures in a directory |
| `inspect <file>` | Parse a JSON file, pretty-print core model |

### Options

| Option | Description |
|---|---|
| `--format=json\|table` | Output format (default: json) |
| `--help` | Show help |

---

## Consumer API

```js
import { probe } from '@open-operational-state/oos';

const result = await probe( 'https://api.example.com/health' );

console.log( result.snapshot.condition );  // 'operational'
console.log( result.httpStatus );          // 200
console.log( result.validation.valid );    // true
```

---

## What this package includes

`@open-operational-state/oos` is an umbrella package that bundles:

- **Producer SDK** — `serve()`, check registry, hooks, content negotiation, discovery, lifecycle, exposure filtering, framework adapters
- **Consumer API** — `probe()` for programmatic endpoint probing
- **CLI** — `oos` binary for validation, probing, and conformance testing

You don't need to install the lower-level packages separately.

## License

Licensed under [Apache 2.0](../../LICENSE).
