# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
- All packages bumped to 0.1.0 with `"type": "module"` (ESM-only)
- Developer documentation (README) for all 6 packages
- Root README overhaul with CLI docs, format table, dependency graph
