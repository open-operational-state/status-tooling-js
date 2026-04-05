# Future Work

> Deferred features and planned enhancements for `@open-operational-state/oos` and the `status-tooling-js` monorepo. Items are grouped by category and roughly ordered by expected impact.

---

## Producer SDK (`@open-operational-state/oos`)

### Testing Utilities

A `testHandler()` utility for verifying health endpoint output in test suites. Currently deferred — the inline pattern (`validateSnapshot` + `checkConformanceLevel`) is only a few lines, making a dedicated subpath export (`oos/testing`) insufficient value for the packaging overhead.

### Benchmarks

Automated benchmark suite measuring:

- Handler creation time (cold start)
- Response generation time (hot path, no checks)
- Response generation time with N checks (1, 5, 10, 50)
- Memory overhead per handler instance
- Overhead vs. raw `JSON.stringify`

Target: **< 1ms overhead** on hot path. Health endpoints are polled every 5–10 seconds; latency matters.

Benchmark results would be published in the README and run in CI to catch regressions.

---

## CLI & Developer Experience

### `oos init` — Interactive Scaffolding

```bash
npx @open-operational-state/oos init
```

Detects the project's framework (by inspecting `package.json` dependencies), asks 2–3 questions, and generates a health endpoint file in the correct framework idiom.

| Dependency detected | Framework | Generated file |
|---|---|---|
| `next` | Next.js | `app/health/route.ts` |
| `express` | Express | `routes/health.ts` |
| `fastify` | Fastify | `routes/health.ts` |
| `hono` | Hono | `src/health.ts` |
| `h3` or `nuxt` | h3 / Nuxt | `server/routes/health.ts` |
| `koa` | Koa2 | `routes/health.ts` |
| (none) | node:http | `health.ts` |

**Files:** `src/init.ts`, `src/__tests__/init.test.ts`, CLI integration in `src/cli.ts`

### `oos check` — Conformance Validation

A CLI command that validates a running endpoint against the conformance suite:

```bash
oos check http://localhost:3000/health
```

Would report conformance level (Basic / Standard / Extended) and list any violations with spec references.

---

## Documentation & Adoption

### Migration Guides

Content documents (not code) helping teams adopt OOS from existing health check patterns:

| Guide | Audience |
|---|---|
| `from-spring-boot.md` | Java/Spring teams with Actuator endpoints |
| `from-plain-http.md` | Teams with bare `GET /health → 200` endpoints |
| `from-health-check-draft.md` | Teams using `draft-inadarei-api-health-check` |

Each guide shows before/after, maps field names, and provides a copy-paste migration path. The `parser` package already handles all three input formats.

### Conformance Badge

A shield badge for project READMEs:

```markdown
[![OOS Conformant](https://img.shields.io/badge/OOS-Basic-00C853)](https://github.com/open-operational-state)
```

Variants: `OOS Basic`, `OOS Standard`, `OOS Extended`.

### Integration Example

An end-to-end example showing `serve()` + `createCheckRegistry()` + `createLifecycle()` working together in a single file — demonstrating dynamic health checks with graceful shutdown.

---

## Ecosystem & Platform

### GitHub Action for CI Conformance

A GitHub Action that validates health endpoint responses against the conformance suite as part of CI/CD:

```yaml
- uses: open-operational-state/conformance-check@v1
  with:
    endpoint: http://localhost:3000/health
    level: standard
```

### VS Code Extension

- Condition value autocomplete
- Inline validation of serve() configuration
- Hover documentation for OOS constants

### h3 v2 Dedicated Adapter

The current `h3` adapter targets h3 v1 (the `H3Event` model). h3 v2 moves to the Web Standard Request/Response API, which is covered by the `web` adapter. If gaps emerge, a dedicated h3 v2 adapter may be warranted.

### Language-Specific SDKs

Reference implementations beyond TypeScript/JavaScript for other server ecosystems:

- Go
- Python
- Rust
- Java/Kotlin (complementing the Spring Boot parser adapter)

### Status Page Integration Guides

Integration guides for popular status page services:

- Statuspage.io (Atlassian)
- Instatus
- Cachet
- Upptime

### Logo and Visual Branding

Visual identity for the Open Operational State project — logo, color palette, and brand guidelines for use in documentation, badges, and community materials.

---

## Specification (`status-spec`)

The following are anticipated future specification work, not currently in scope for v1:

### Extension Registry

Formal registration mechanism for custom condition values and vocabularies using the `x-{vendor}-{value}` prefix convention.

### Formal Standards Consideration

Potential Internet-Draft or RFC path if adoption warrants. The specification is structured to be compatible with IETF conventions (RFC 2119 language, prior art references to existing drafts).

### Non-Web Systems

v1 is locked to **machine-readable operational state of web services only**. The architecture is extensible to non-web systems (IoT devices, CLI tools, background workers) in future versions, but v1 does not target them.

---

## Explicitly Out of Scope

These items have been considered and explicitly excluded:

- **Synthetic transaction coordination** — externally-executed user-like workflows are a separate concern
- **Metrics or tracing standard** — complementary to OpenMetrics/OpenTelemetry, not a replacement
- **Universal service discovery** — OOS defines discovery for operational-state resources specifically
- **Authentication implementation** — OOS provides the `isAuthenticated` callback boundary, not the auth mechanism
- **Streaming / WebSocket** — v1 scope is request/response only

