/**
 * Condition Vocabularies
 *
 * Normative condition values per profile, derived from
 * status-spec/spec/condition-vocabularies.md.
 */

// ---------------------------------------------------------------------------
// Liveness vocabulary (orderable)
// ---------------------------------------------------------------------------

export const LIVENESS_CONDITIONS = [ 'alive', 'unreachable' ] as const;
export type LivenessCondition = typeof LIVENESS_CONDITIONS[number];

// ---------------------------------------------------------------------------
// Readiness vocabulary (orderable)
// ---------------------------------------------------------------------------

export const READINESS_CONDITIONS = [ 'ready', 'initializing', 'not-ready' ] as const;
export type ReadinessCondition = typeof READINESS_CONDITIONS[number];

// ---------------------------------------------------------------------------
// Health vocabulary — orderable core + categorical extensions
// ---------------------------------------------------------------------------

export const HEALTH_ORDERABLE_CONDITIONS = [
    'operational',
    'degraded',
    'partial-outage',
    'major-outage',
    'down',
] as const;
export type HealthOrderableCondition = typeof HEALTH_ORDERABLE_CONDITIONS[number];

export const HEALTH_CATEGORICAL_CONDITIONS = [ 'maintenance', 'unknown' ] as const;
export type HealthCategoricalCondition = typeof HEALTH_CATEGORICAL_CONDITIONS[number];

export const HEALTH_CONDITIONS = [
    ...HEALTH_ORDERABLE_CONDITIONS,
    ...HEALTH_CATEGORICAL_CONDITIONS,
] as const;
export type HealthCondition = HealthOrderableCondition | HealthCategoricalCondition;

// ---------------------------------------------------------------------------
// Status vocabulary (inherits Health)
// ---------------------------------------------------------------------------

export type StatusCondition = HealthCondition;

// ---------------------------------------------------------------------------
// Extension value pattern
// ---------------------------------------------------------------------------

const EXTENSION_PATTERN = /^x-[a-z][a-z0-9]*-[a-z][a-z0-9-]*$/;

export function isExtensionCondition( value: string ): boolean {
    return EXTENSION_PATTERN.test( value );
}

// ---------------------------------------------------------------------------
// Union type for any valid condition value
// ---------------------------------------------------------------------------

export type Condition = LivenessCondition | ReadinessCondition | HealthCondition | string;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isLivenessCondition( value: string ): value is LivenessCondition {
    return ( LIVENESS_CONDITIONS as readonly string[] ).includes( value );
}

export function isReadinessCondition( value: string ): value is ReadinessCondition {
    return ( READINESS_CONDITIONS as readonly string[] ).includes( value );
}

export function isHealthOrderableCondition( value: string ): value is HealthOrderableCondition {
    return ( HEALTH_ORDERABLE_CONDITIONS as readonly string[] ).includes( value );
}

export function isHealthCategoricalCondition( value: string ): value is HealthCategoricalCondition {
    return ( HEALTH_CATEGORICAL_CONDITIONS as readonly string[] ).includes( value );
}

export function isHealthCondition( value: string ): value is HealthCondition {
    return isHealthOrderableCondition( value ) || isHealthCategoricalCondition( value );
}

// ---------------------------------------------------------------------------
// Severity ordering (lower = better)
//
// Only orderable values have a defined severity.  Categorical and extension
// values return `undefined`.
// ---------------------------------------------------------------------------

const ORDERABLE_SEVERITY: Record<string, number> = {
    // Liveness (1–2)
    alive: 1,
    unreachable: 2,
    // Readiness (1–3)
    ready: 1,
    initializing: 2,
    'not-ready': 3,
    // Health orderable (1–5)
    operational: 1,
    degraded: 2,
    'partial-outage': 3,
    'major-outage': 4,
    down: 5,
};

/**
 * Returns the numeric severity of an orderable condition value.
 * Lower numbers indicate better operational state.
 *
 * Returns `undefined` for categorical or extension values.
 */
export function conditionSeverity( value: string ): number | undefined {
    return ORDERABLE_SEVERITY[value];
}

/**
 * Returns true if the condition value is orderable (has defined severity).
 */
export function isOrderableCondition( value: string ): boolean {
    return ORDERABLE_SEVERITY[value] !== undefined;
}
