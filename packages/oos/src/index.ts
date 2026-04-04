/**
 * @open-operational-state/oos
 *
 * The developer-facing package for Open Operational State.
 *
 * Curated re-exports — small, opinionated, stable.
 */

// ── Probe (primary API) ───────────────────────────────────────────────
export { probe } from '@open-operational-state/probe';
export type { ProbeResult, ProbeOptions } from '@open-operational-state/probe';

// ── Types (commonly needed by consumers) ──────────────────────────────
export type {
    Snapshot,
    Subject,
    Evidence,
    Timing,
    CheckEntry,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    DiscoveryDocument,
} from '@open-operational-state/types';
