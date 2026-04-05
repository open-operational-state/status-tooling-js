# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


## [0.3.0] — 2026-04-05

### Added
- **oos**: `createHooks()` — typed event emitter for observable hooks. Events: `conditionChanged`, `checkFailed`, `requestHandled`. Zero dependencies, synchronous dispatch, listener error isolation (including async rejection handling).
- **oos**: `serve()` hooks integration — optional `hooks` config field for lifecycle event emission with condition transition tracking.
- **oos**: `negotiateFormat()` and `mediaTypeFor()` — content negotiation module. Parses `Accept` header, selects between `application/health+json` and `application/status+json`. `serve()` gains `serialization` config for single or dual-format serving.
- **oos**: `createDiscoveryHandler()` — serves the `/.well-known/operational-state` discovery document as a pre-built static response with cache-control and Link headers.
- **oos**: `discoveryLinkHeader()` — framework-agnostic Link header string builder for OOS discovery. `serve()` gains `discoveryPath` config to auto-add Link headers.
- **oos**: `serve()` + check registry integration — optional `registry` config field. When set, runs `registry.runAll()` per request, uses aggregated condition, merges check results via `enrichSnapshot()`, and emits `checkFailed` hooks for errored/timed-out checks.
- **oos**: `serve()` handler factory — producer-side API that creates spec-conformant `application/health+json` responses. Accepts static or async condition providers with authentication-based exposure tier switching.
- **oos**: Named constants (`Condition`, `Profile`, `Exposure`, `Serialization`, `ProvenanceType`, `Role`) — eliminate magic strings, provide autocomplete and typo protection.
- **oos**: `filterByExposure()` — security-tier filtering with 4 levels: condition-only (secure default), condition-metadata, component-level, full-diagnostic. Applied before serialization.
- **oos**: 7 framework adapters via subpath exports: `oos/web` (Next.js, Bun, Deno, Workers, Remix, SvelteKit, Astro), `oos/express`, `oos/fastify`, `oos/hono`, `oos/h3` (Nuxt/Nitro), `oos/koa`, `oos/node-http`.
- **oos**: 38 new tests covering constants, exposure filtering, and serve handler behaviour.
- **oos**: Runnable examples for Express, Bun/Web Standard, Next.js App Router, and Kubernetes probe integration.
- **probe**: `headers` field on `ProbeResult` — response headers as `Record<string, string>`, or `null` on connection failure.
- **probe**: `durationMs` field on `ProbeResult` — round-trip timing (fetch start → response body read).
- **probe**: `rawBody` field on `ProbeResult` — unparsed response text for debugging, or `null` on connection failure.
- **probe**: 6 new tests covering success and connection-error paths for all three fields.

## [0.2.0] — 2026-04-04

### Added
- **probe**: New package (`@open-operational-state/probe`) — programmatic endpoint probing with `probe()` API. Fetch, auto-detect, parse, normalize in a single call. Supports discovery follow and cancellation via AbortSignal.
- **oos**: New package (`@open-operational-state/oos`) — the developer-facing umbrella package. Owns the `oos` binary. Install this one package for both the CLI and programmatic API.

### Changed
- **Repo renamed** from `status-tooling` to `status-tooling-js` — preparing for future implementations in other languages (Go, PHP, etc.). npm package names unchanged.
- **CLI ownership**: The `oos` binary is now owned by `@open-operational-state/oos` instead of `@open-operational-state/validator`. Install `@open-operational-state/oos` for CLI access.
- **validator**: CLI probe command now delegates to `probe()` from the probe package — single implementation, no drift.
- **validator**: Exports `runCli()` for delegation from the oos package.
- **validator**: Removed unused direct dependency on `@open-operational-state/parser` (transitive via probe).
- **release script**: PACKAGES array reordered to be topologically sorted by internal dependencies.

### Fixed
- **probe**: Relative Link header URIs from discovery are now resolved against the base URL.
- **probe**: Parse/normalize errors are no longer misclassified as connection failures — `connectionError` is now strictly reserved for fetch-layer failures (DNS, timeout, refused).
- **probe**: AbortSignal cancellation re-throws `AbortError` instead of returning `connectionError: true`.
- **validator**: `JSON.parse` errors in `validate` and `inspect` commands now produce user-friendly error messages instead of unhandled exceptions.
- **validator**: Removed stale shebang from `cli.ts` (no longer a direct entrypoint).

### Removed
- **probe**: Removed `detectedFormat` field from `ProbeResult` (was always `null`). Will be reintroduced when the parser exposes detected format metadata.

### Breaking
- **validator**: Removed `bin` field. Users who installed `@open-operational-state/validator` for the `oos` binary should switch to `@open-operational-state/oos`.

## [0.1.1] — 2026-04-03

### Changed
- **Health profile timing**: requirement level relaxed from `MUST` to `SHOULD`. Missing timing now produces a warning instead of a validation error. Real-world health endpoints (which rarely include timing) now validate as valid.
- **CLI probe output**: now includes `warningCount` alongside `errorCount`, so warnings are visible without appearing as failures.

### Fixed
- Release script dry-run no longer mutates `package.json` files — originals are restored after the run.

### Added
- `examples/README.md` with real-world usage patterns (Express, Hono, CLI, parser, discovery, aggregation).
- `scripts/release.js` for coordinated version bumps, builds, tests, and publishing across all packages.
- Examples section linked from root README.

## [0.1.0] — 2026-04-02

### Added

- **types**: Canonical TypeScript interfaces for the core model (Snapshot, Subject, Evidence, Timing, Scope, CheckEntry, ComponentEntry, DependencyEntry, DiscoveryDocument)
- **types**: Condition vocabulary constants with severity ordering and type guards for all profiles (liveness, readiness, health, status)
- **types**: Profile requirements matrix and hierarchy helpers
- **types**: ParseResult, ParseError, and ParseWarning types for safe parser error model
- **core**: `normalizeSnapshot()` for coercing raw JSON to typed Snapshot
- **core**: `worstOf()` and parent condition derivation helpers for aggregation
- **core**: `validateSnapshot()` for required fields, vocabulary, profiles, RFC 3339 timestamps
- **core**: 86 direct unit tests for normalize, aggregate, and validate
- **parser**: Plain HTTP adapter (alive/unreachable from connection result)
- **parser**: Health Check Draft adapter (pass/warn/fail → operational/degraded/down)
- **parser**: Spring Boot Actuator adapter (UP/DOWN/OUT_OF_SERVICE/UNKNOWN with component parsing)
- **parser**: Native health-response parser
- **parser**: Format auto-detection with Spring Boot vs draft-inadarei disambiguation
- **parser**: `safeParse()` returning `ParseResult` — never throws, includes per-adapter lossiness warnings
- **validator**: Fixture runner for executing conformance tests from `status-conformance`
- **validator**: Basic/Standard/Extended conformance level checker
- **validator**: `oos` CLI with validate, probe, fixtures, and inspect commands
- **emitter**: `emitHealthResponse()` for `application/health+json`
- **emitter**: `emitServiceStatus()` for `application/status+json`
- **emitter**: `suggestHttpStatus()` and `suggestHeaders()` HTTP helpers
- **emitter**: Golden round-trip invariant tests enforcing semantic equivalence
- **discovery**: RFC 8288 Link header parser for `rel="operational-state"`
- **discovery**: Well-known path (`/.well-known/operational-state`) fetch and validation
- **discovery**: Unified discovery flow with Link header → well-known fallback
- All packages published to npm under `@open-operational-state` scope
- Developer documentation (README) for all 6 packages
- Root README with CLI docs, format table, dependency graph
