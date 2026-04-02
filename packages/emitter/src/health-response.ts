/**
 * Health Response Emitter
 *
 * Converts a Snapshot → application/health+json wire format.
 */

import type { Snapshot, CheckEntry, Evidence, Timing } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface HealthResponsePayload {
    condition: string;
    profiles: string[];
    subject: {
        id: string;
        description?: string;
    };
    timing?: {
        observed?: string;
        reported?: string;
        stateChanged?: string;
    };
    provenance?: string;
    evidence?: {
        type: string;
        detail?: string;
    };
    checks?: Record<string, unknown>;
    links?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface EmitHealthResponseOptions {
    /** Include optional fields even if empty */
    includeOptional?: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit a Snapshot as an application/health+json payload.
 */
export function emitHealthResponse(
    snapshot: Snapshot,
    options?: EmitHealthResponseOptions,
): HealthResponsePayload {
    const payload: HealthResponsePayload = {
        condition: snapshot.condition,
        profiles: [ ...snapshot.profiles ],
        subject: {
            id: snapshot.subject.id,
            ...( snapshot.subject.description ? { description: snapshot.subject.description } : {} ),
        },
    };

    // Timing
    if ( snapshot.timing ) {
        payload.timing = { ...snapshot.timing };
    }

    // Provenance
    if ( snapshot.provenance ) {
        payload.provenance = snapshot.provenance;
    }

    // Evidence
    if ( snapshot.evidence ) {
        const evidence: HealthResponsePayload['evidence'] = { type: snapshot.evidence.type };
        if ( snapshot.evidence.detail ) { evidence!.detail = snapshot.evidence.detail; }
        payload.evidence = evidence;
    }

    // Checks — merge from flat checks or convert from nested arrays
    const checks = buildChecks( snapshot );
    if ( checks && Object.keys( checks ).length > 0 ) {
        payload.checks = checks;
    }

    // Links
    if ( snapshot.links && Object.keys( snapshot.links ).length > 0 ) {
        payload.links = { ...snapshot.links };
    }

    return payload;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function buildChecks( snapshot: Snapshot ): Record<string, unknown> | undefined {
    const result: Record<string, unknown> = {};

    // Flat checks (native health-response format)
    if ( snapshot.checks ) {
        for ( const [ key, check ] of Object.entries( snapshot.checks ) ) {
            result[key] = buildCheckEntry( check );
        }
    }

    // Nested components → flat checks
    if ( snapshot.components ) {
        for ( const comp of snapshot.components ) {
            const entry: Record<string, unknown> = {
                condition: comp.condition,
                role: 'component',
            };
            if ( comp.timing ) { entry.timing = comp.timing; }
            if ( comp.provenance ) { entry.provenance = comp.provenance; }
            if ( comp.evidence ) { entry.evidence = comp.evidence; }
            result[comp.id] = entry;
        }
    }

    // Nested dependencies → flat checks
    if ( snapshot.dependencies ) {
        for ( const dep of snapshot.dependencies ) {
            const entry: Record<string, unknown> = {
                condition: dep.condition,
                role: 'dependency',
            };
            if ( dep.timing ) { entry.timing = dep.timing; }
            if ( dep.provenance ) { entry.provenance = dep.provenance; }
            if ( dep.evidence ) { entry.evidence = dep.evidence; }
            result[dep.id] = entry;
        }
    }

    return Object.keys( result ).length > 0 ? result : undefined;
}

function buildCheckEntry( check: CheckEntry ): Record<string, unknown> {
    const entry: Record<string, unknown> = {
        condition: check.condition,
    };
    if ( check.role ) { entry.role = check.role; }
    if ( check.timing ) { entry.timing = check.timing; }
    if ( check.provenance ) { entry.provenance = check.provenance; }
    if ( check.evidence ) { entry.evidence = check.evidence; }
    return entry;
}
