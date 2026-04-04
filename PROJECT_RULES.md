# Status Tooling (JavaScript) — Project Rules

This document supplements the [canonical org-wide PROJECT_RULES.md](https://github.com/open-operational-state/.github/blob/main/PROJECT_RULES.md).

---

## Repo-Specific Constraints

- This is a monorepo managed with **Bun** workspaces.
- Runtime: **Node.js + TypeScript** only.
- **ESM only** — no CommonJS.
- All code is licensed under **Apache 2.0**.
- This repo is `status-tooling-js` — the JavaScript implementation. Future implementations in other languages (Go, PHP, etc.) will live in separate repos.
- Package stubs may now contain substantive implementation — the architecture and specification in `status-spec` are stable (Phase 3 complete).
- Tooling must remain vendor-neutral. No dependencies on commercial product APIs, no phone-home behavior, no commercial onboarding assumptions.
- Do not create packages beyond the established set (`types`, `core`, `parser`, `emitter`, `validator`, `discovery`, `probe`, `oos`) without explicit approval.
