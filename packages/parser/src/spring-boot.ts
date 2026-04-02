/**
 * Spring Boot Actuator Adapter
 *
 * Maps Spring Boot Actuator /actuator/health responses → core model.
 *
 * Spring Boot status values:
 *   UP → operational
 *   DOWN → down
 *   OUT_OF_SERVICE → down
 *   UNKNOWN → unknown
 */

import type { Snapshot, CheckEntry, Evidence } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Status value mapping
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, string> = {
    up: 'operational',
    down: 'down',
    out_of_service: 'down',
    unknown: 'unknown',
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SpringBootOptions {
    /** Fallback URL for subject identity */
    url?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a Spring Boot Actuator health response into a Snapshot.
 */
export function parseSpringBoot(
    body: unknown,
    options?: SpringBootOptions,
): Snapshot {
    if ( !body || typeof body !== 'object' || Array.isArray( body ) ) {
        throw new Error( 'Spring Boot body must be a non-null object' );
    }

    const obj = body as Record<string, unknown>;

    // ── Top-level condition ────────────────────────────────────────────
    const rawStatus = typeof obj.status === 'string' ? obj.status.toLowerCase() : '';
    const condition = STATUS_MAP[rawStatus];

    if ( !condition ) {
        throw new Error( `Unrecognized Spring Boot status: '${obj.status}'` );
    }

    // ── Subject ────────────────────────────────────────────────────────
    const subjectId = options?.url || '';

    // ── Components ─────────────────────────────────────────────────────
    const checks = parseComponents( obj.components );

    // ── Build snapshot ─────────────────────────────────────────────────
    const snapshot: Snapshot = {
        condition,
        profiles: [ 'health' ],
        subject: { id: subjectId },
        provenance: 'self-reported',
    };

    if ( checks && Object.keys( checks ).length > 0 ) {
        snapshot.checks = checks;
    }

    return snapshot;
}

// ---------------------------------------------------------------------------
// Component parsing
//
// Spring Boot components are keyed objects with `status` and optional `details`.
// ---------------------------------------------------------------------------

function parseComponents( raw: unknown ): Record<string, CheckEntry> | undefined {
    if ( !raw || typeof raw !== 'object' || Array.isArray( raw ) ) { return undefined; }

    const obj = raw as Record<string, unknown>;
    const result: Record<string, CheckEntry> = {};

    for ( const [ key, value ] of Object.entries( obj ) ) {
        if ( !value || typeof value !== 'object' || Array.isArray( value ) ) { continue; }

        const comp = value as Record<string, unknown>;
        const rawStatus = typeof comp.status === 'string' ? comp.status.toLowerCase() : '';
        const condition = STATUS_MAP[rawStatus] || rawStatus || 'unknown';

        const check: CheckEntry = {
            condition,
            role: 'component',
        };

        // Extract evidence from details
        if ( comp.details && typeof comp.details === 'object' ) {
            const details = comp.details as Record<string, unknown>;
            const evidence: Evidence = { type: 'details' };

            // Common Spring Boot detail patterns
            if ( typeof details.database === 'string' ) {
                evidence.detail = `database: ${details.database}`;
            } else if ( typeof details.error === 'string' ) {
                evidence.detail = details.error;
            } else {
                // Generic stringification of details
                const entries = Object.entries( details ).slice( 0, 3 );
                if ( entries.length > 0 ) {
                    evidence.detail = entries.map( ( [ k, v ] ) => `${k}: ${v}` ).join( ', ' );
                }
            }

            check.evidence = evidence;
        }

        result[key] = check;
    }

    return Object.keys( result ).length > 0 ? result : undefined;
}

// ---------------------------------------------------------------------------
// Structural detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the body looks like a Spring Boot Actuator response.
 *
 * Distinguished from draft-inadarei by status values:
 * Spring Boot uses UP/DOWN/OUT_OF_SERVICE/UNKNOWN (case-insensitive)
 * while the draft uses pass/fail/warn.
 */
export function isSpringBootFormat( body: unknown ): boolean {
    if ( !body || typeof body !== 'object' || Array.isArray( body ) ) { return false; }
    const obj = body as Record<string, unknown>;
    if ( typeof obj.status !== 'string' ) { return false; }
    const status = obj.status.toLowerCase();
    return status === 'up' || status === 'down' || status === 'out_of_service' || status === 'unknown';
}
