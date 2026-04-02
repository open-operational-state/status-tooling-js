/**
 * Health Check Draft Adapter
 *
 * Implements the health-check-draft adapter spec:
 *   status-spec/spec/adapters/health-check-draft.md
 *
 * Maps draft-inadarei-api-health-check responses → core model.
 */

import type { Snapshot, CheckEntry, Evidence, Timing } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Status value mapping (spec §Mapping Table)
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, string> = {
    pass: 'operational',
    ok: 'operational',
    up: 'operational',
    warn: 'degraded',
    fail: 'down',
    error: 'down',
    down: 'down',
};

// ComponentType → role inference (spec §Mapping Table)
const COMPONENT_TYPE_ROLE: Record<string, 'component' | 'dependency'> = {
    system: 'dependency',
    datastore: 'dependency',
    component: 'component',
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface HealthCheckDraftOptions {
    /** Fallback URL for subject identity if serviceId is absent */
    url?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a draft-inadarei health check response into a Snapshot.
 */
export function parseHealthCheckDraft(
    body: unknown,
    options?: HealthCheckDraftOptions,
): Snapshot {
    if ( !body || typeof body !== 'object' || Array.isArray( body ) ) {
        throw new Error( 'Health check draft body must be a non-null object' );
    }

    const obj = body as Record<string, unknown>;

    // ── Top-level condition ────────────────────────────────────────────
    const rawStatus = typeof obj.status === 'string' ? obj.status.toLowerCase() : '';
    const condition = STATUS_MAP[rawStatus] || rawStatus;

    if ( !condition ) {
        throw new Error( `Invalid status value: '${obj.status}'` );
    }

    // ── Subject ────────────────────────────────────────────────────────
    const subjectId = typeof obj.serviceId === 'string'
        ? obj.serviceId
        : ( options?.url || '' );

    const description = typeof obj.description === 'string'
        ? obj.description
        : undefined;

    // ── Top-level evidence from output ─────────────────────────────────
    let evidence: Evidence | undefined;
    if ( typeof obj.output === 'string' ) {
        evidence = { type: 'output', detail: obj.output };
    }

    // ── Checks ─────────────────────────────────────────────────────────
    const checks = parseChecks( obj.checks );

    // ── Build snapshot ─────────────────────────────────────────────────
    const snapshot: Snapshot = {
        condition,
        profiles: [ 'health' ],
        subject: {
            id: subjectId,
            ...( description ? { description } : {} ),
        },
        provenance: 'self-reported',
    };

    if ( evidence ) { snapshot.evidence = evidence; }
    if ( checks && Object.keys( checks ).length > 0 ) { snapshot.checks = checks; }
    if ( obj.links && typeof obj.links === 'object' ) {
        snapshot.links = obj.links as Record<string, string>;
    }

    return snapshot;
}

// ---------------------------------------------------------------------------
// Checks parsing
//
// draft-inadarei checks are keyed as "componentName:measurementName"
// and each value is an array of check entries.
// ---------------------------------------------------------------------------

function parseChecks( raw: unknown ): Record<string, CheckEntry> | undefined {
    if ( !raw || typeof raw !== 'object' || Array.isArray( raw ) ) { return undefined; }

    const obj = raw as Record<string, unknown>;
    const result: Record<string, CheckEntry> = {};

    for ( const [ key, entries ] of Object.entries( obj ) ) {
        if ( !Array.isArray( entries ) ) { continue; }

        // Parse "componentName:measurementName"
        const colonIdx = key.indexOf( ':' );
        const componentName = colonIdx > 0 ? key.substring( 0, colonIdx ) : key;
        const measurementName = colonIdx > 0 ? key.substring( colonIdx + 1 ) : undefined;

        // Take the first entry (spec says group multiple under same component)
        const entry = entries[0] as Record<string, unknown> | undefined;
        if ( !entry ) { continue; }

        // Condition
        const rawStatus = typeof entry.status === 'string' ? entry.status.toLowerCase() : '';
        const condition = STATUS_MAP[rawStatus] || rawStatus || 'unknown';

        // Role
        const componentType = typeof entry.componentType === 'string'
            ? entry.componentType.toLowerCase()
            : '';
        const role = COMPONENT_TYPE_ROLE[componentType] || 'component';

        // Evidence
        const evidence: Evidence | undefined = buildEvidence( entry, measurementName );

        // Timing
        const timing: Timing | undefined = typeof entry.time === 'string'
            ? { observed: entry.time }
            : undefined;

        const check: CheckEntry = { condition, role };
        if ( evidence ) { check.evidence = evidence; }
        if ( timing ) { check.timing = timing; }

        result[componentName] = check;
    }

    return Object.keys( result ).length > 0 ? result : undefined;
}

function buildEvidence(
    entry: Record<string, unknown>,
    measurementName?: string,
): Evidence | undefined {
    const hasValue = entry.observedValue !== undefined;
    const hasUnit = typeof entry.observedUnit === 'string';
    const hasOutput = typeof entry.output === 'string';

    if ( !hasValue && !hasUnit && !hasOutput && !measurementName ) {
        return undefined;
    }

    const evidence: Evidence = {
        type: measurementName || 'check',
    };
    if ( hasValue ) { evidence.observedValue = entry.observedValue; }
    if ( hasUnit ) { evidence.observedUnit = entry.observedUnit as string; }
    if ( hasOutput ) { evidence.detail = entry.output as string; }

    return evidence;
}
