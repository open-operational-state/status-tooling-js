/**
 * @open-operational-state/types
 *
 * Canonical TypeScript types for the Open Operational State core model.
 *
 * This package is the shared contract surface.  It contains only interfaces,
 * type aliases, constants, and type guards — no runtime logic beyond
 * trivial constant lookups.  Zero external dependencies.
 */

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
    type Condition,
    type LivenessCondition,
    type ReadinessCondition,
    type HealthOrderableCondition,
    type HealthCategoricalCondition,
    type HealthCondition,
    type StatusCondition,
    LIVENESS_CONDITIONS,
    READINESS_CONDITIONS,
    HEALTH_ORDERABLE_CONDITIONS,
    HEALTH_CATEGORICAL_CONDITIONS,
    HEALTH_CONDITIONS,
    isExtensionCondition,
    isLivenessCondition,
    isReadinessCondition,
    isHealthOrderableCondition,
    isHealthCategoricalCondition,
    isHealthCondition,
    isOrderableCondition,
    conditionSeverity,
} from './conditions.js';

export {
    type ProfileId,
    type RequirementLevel,
    type ProfileRequirements,
    PROFILE_IDS,
    isProfileId,
    PROFILE_REQUIREMENTS,
    satisfiedProfiles,
} from './profiles.js';

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export const PROVENANCE_TYPES = [
    'self-reported',
    'externally-observed',
    'derived',
    'manually-declared',
] as const;

export type Provenance = typeof PROVENANCE_TYPES[number];

export function isProvenance( value: string ): value is Provenance {
    return ( PROVENANCE_TYPES as readonly string[] ).includes( value );
}

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

export interface Subject {
    id: string;
    description?: string;
    /** Service version — used in service-status serialization */
    version?: string;
    /** Contact URI — used in service-status serialization */
    contact?: string;
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

export interface Timing {
    /** RFC 3339 — when the condition was observed */
    observed?: string;
    /** RFC 3339 — when the condition was communicated */
    reported?: string;
    /** RFC 3339 — when the condition last transitioned */
    stateChanged?: string;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export interface Evidence {
    /** Kind of check or observation */
    type: string;
    /** Supplementary information */
    detail?: string;
    /** Measured value */
    observedValue?: unknown;
    /** Unit of measurement */
    observedUnit?: string;
}

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export interface Scope {
    type: string;
    identifier?: string;
}

// ---------------------------------------------------------------------------
// Check entry (health-response flat checks object)
// ---------------------------------------------------------------------------

export interface CheckEntry {
    condition: string;
    role?: 'component' | 'dependency';
    timing?: Timing;
    provenance?: Provenance | string;
    evidence?: Evidence;
}

// ---------------------------------------------------------------------------
// Component / Dependency entries (service-status nested arrays)
// ---------------------------------------------------------------------------

export interface ComponentEntry {
    id: string;
    description?: string;
    condition: string;
    criticality?: 'critical' | 'important' | 'informational';
    timing?: Timing;
    provenance?: Provenance | string;
    evidence?: Evidence;
    /** Nested sub-components (multi-level hierarchy) */
    components?: ComponentEntry[];
}

export interface DependencyEntry {
    id: string;
    description?: string;
    condition: string;
    criticality?: 'critical' | 'important' | 'informational';
    timing?: Timing;
    provenance?: Provenance | string;
    evidence?: Evidence;
}

// ---------------------------------------------------------------------------
// Incident (service-status extension)
// ---------------------------------------------------------------------------

export interface IncidentUpdate {
    timestamp: string;
    message: string;
}

export interface Incident {
    id: string;
    title: string;
    condition: string;
    started: string;
    resolved?: string;
    affectedComponents?: string[];
    updates?: IncidentUpdate[];
}

// ---------------------------------------------------------------------------
// Snapshot — the canonical core model instance
// ---------------------------------------------------------------------------

export interface Snapshot {
    condition: string;
    profiles: string[];
    subject: Subject;
    timing?: Timing;
    provenance?: Provenance | string;
    evidence?: Evidence;
    scope?: Scope;

    /** health-response flat checks */
    checks?: Record<string, CheckEntry>;

    /** service-status nested components */
    components?: ComponentEntry[];
    /** service-status nested dependencies */
    dependencies?: DependencyEntry[];

    /** service-status incidents (informational extension) */
    incidents?: Incident[];

    /** Link relations */
    links?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Validation result (used by core and validator)
// ---------------------------------------------------------------------------

export interface ValidationError {
    path: string;
    message: string;
    code: string;
}

export interface ValidationWarning {
    path: string;
    message: string;
    code: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

// ---------------------------------------------------------------------------
// Discovery document
// ---------------------------------------------------------------------------

export interface ResourceEntry {
    href: string;
    profiles: string[];
    serialization: string;
    auth?: 'none' | 'required';
    description?: string;
}

export interface DiscoveryDocument {
    version: string;
    subject: Subject;
    resources: ResourceEntry[];
}

// ---------------------------------------------------------------------------
// Conformance level
// ---------------------------------------------------------------------------

export type ConformanceLevel = 'basic' | 'standard' | 'extended';

export interface ConformanceResult {
    level: ConformanceLevel | null;
    basic: boolean;
    standard: boolean;
    extended: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
