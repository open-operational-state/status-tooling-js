/**
 * Named Constants
 *
 * Typed constant objects for all OOS spec vocabulary.
 * Eliminates magic strings, provides autocomplete and typo protection.
 *
 * Raw string values still work everywhere — these constants are the
 * recommended path for better developer experience.
 */

// ---------------------------------------------------------------------------
// Condition vocabulary
// ---------------------------------------------------------------------------

export const Condition = {
    // Health (orderable)
    OPERATIONAL: 'operational',
    DEGRADED: 'degraded',
    PARTIAL_OUTAGE: 'partial-outage',
    MAJOR_OUTAGE: 'major-outage',
    DOWN: 'down',

    // Health (categorical)
    MAINTENANCE: 'maintenance',
    UNKNOWN: 'unknown',

    // Liveness
    ALIVE: 'alive',
    UNREACHABLE: 'unreachable',

    // Readiness
    READY: 'ready',
    INITIALIZING: 'initializing',
    NOT_READY: 'not-ready',
} as const;

export type ConditionValue = typeof Condition[keyof typeof Condition];

// ---------------------------------------------------------------------------
// Profile identifiers
// ---------------------------------------------------------------------------

export const Profile = {
    LIVENESS: 'liveness',
    READINESS: 'readiness',
    HEALTH: 'health',
    STATUS: 'status',
} as const;

export type ProfileValue = typeof Profile[keyof typeof Profile];

// ---------------------------------------------------------------------------
// Exposure tiers
// ---------------------------------------------------------------------------

export const Exposure = {
    /** Condition, profiles, subject.id only — secure default */
    CONDITION_ONLY: 'condition-only',
    /** + timing, subject.description, provenance */
    CONDITION_METADATA: 'condition-metadata',
    /** + checks/components (conditions only, no evidence) */
    COMPONENT_LEVEL: 'component-level',
    /** All fields including evidence, dependency names */
    FULL_DIAGNOSTIC: 'full-diagnostic',
} as const;

export type ExposureValue = typeof Exposure[keyof typeof Exposure];

// ---------------------------------------------------------------------------
// Serialization formats
// ---------------------------------------------------------------------------

export const Serialization = {
    HEALTH_RESPONSE: 'health-response',
    SERVICE_STATUS: 'service-status',
    /** Media type for health-response */
    HEALTH_RESPONSE_MEDIA_TYPE: 'application/health+json',
    /** Media type for service-status */
    SERVICE_STATUS_MEDIA_TYPE: 'application/status+json',
} as const;

export type SerializationValue = typeof Serialization[keyof typeof Serialization];

// ---------------------------------------------------------------------------
// Provenance types
// ---------------------------------------------------------------------------

export const ProvenanceType = {
    SELF_REPORTED: 'self-reported',
    EXTERNALLY_OBSERVED: 'externally-observed',
    DERIVED: 'derived',
    MANUALLY_DECLARED: 'manually-declared',
} as const;

export type ProvenanceTypeValue = typeof ProvenanceType[keyof typeof ProvenanceType];

// ---------------------------------------------------------------------------
// Check roles
// ---------------------------------------------------------------------------

export const Role = {
    COMPONENT: 'component',
    DEPENDENCY: 'dependency',
} as const;

export type RoleValue = typeof Role[keyof typeof Role];
