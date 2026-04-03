# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


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

