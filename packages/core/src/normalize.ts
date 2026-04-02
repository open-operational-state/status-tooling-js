/**
 * Snapshot Normalization
 *
 * Coerces raw JSON into a typed Snapshot, applying spec-defined defaults.
 */

import type { Snapshot, Timing, Evidence, Subject, CheckEntry, Scope } from '@open-operational-state/types';

/**
 * Normalize a raw (parsed-JSON) object into a typed Snapshot.
 *
 * This does NOT validate — it applies structural defaults so downstream
 * code can rely on consistent shapes.  Invalid data passes through;
 * use `validateSnapshot` for correctness checks.
 */
export function normalizeSnapshot( input: Record<string, unknown> ): Snapshot {
    const subject = normalizeSubject( input.subject );
    const timing = normalizeTiming( input.timing );
    const evidence = normalizeEvidence( input.evidence );
    const scope = normalizeScope( input.scope );
    const checks = normalizeChecks( input.checks );

    const snapshot: Snapshot = {
        condition: typeof input.condition === 'string' ? input.condition : '',
        profiles: normalizeProfiles( input.profiles ),
        subject,
    };

    if ( timing ) { snapshot.timing = timing; }
    if ( typeof input.provenance === 'string' ) { snapshot.provenance = input.provenance; }
    if ( evidence ) { snapshot.evidence = evidence; }
    if ( scope ) { snapshot.scope = scope; }
    if ( checks ) { snapshot.checks = checks; }
    if ( input.links && typeof input.links === 'object' ) {
        snapshot.links = input.links as Record<string, string>;
    }

    // service-status nested arrays
    if ( Array.isArray( input.components ) ) {
        snapshot.components = input.components;
    }
    if ( Array.isArray( input.dependencies ) ) {
        snapshot.dependencies = input.dependencies;
    }
    if ( Array.isArray( input.incidents ) ) {
        snapshot.incidents = input.incidents;
    }

    return snapshot;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeSubject( raw: unknown ): Subject {
    if ( raw && typeof raw === 'object' && !Array.isArray( raw ) ) {
        const obj = raw as Record<string, unknown>;
        return {
            id: typeof obj.id === 'string' ? obj.id : '',
            ...( typeof obj.description === 'string' ? { description: obj.description } : {} ),
            ...( typeof obj.version === 'string' ? { version: obj.version } : {} ),
            ...( typeof obj.contact === 'string' ? { contact: obj.contact } : {} ),
        };
    }
    return { id: '' };
}

function normalizeTiming( raw: unknown ): Timing | undefined {
    if ( !raw || typeof raw !== 'object' || Array.isArray( raw ) ) { return undefined; }
    const obj = raw as Record<string, unknown>;
    const timing: Timing = {};
    if ( typeof obj.observed === 'string' ) { timing.observed = obj.observed; }
    if ( typeof obj.reported === 'string' ) { timing.reported = obj.reported; }
    if ( typeof obj.stateChanged === 'string' ) { timing.stateChanged = obj.stateChanged; }
    return Object.keys( timing ).length > 0 ? timing : undefined;
}

function normalizeEvidence( raw: unknown ): Evidence | undefined {
    if ( !raw || typeof raw !== 'object' || Array.isArray( raw ) ) { return undefined; }
    const obj = raw as Record<string, unknown>;
    if ( typeof obj.type !== 'string' ) { return undefined; }
    const evidence: Evidence = { type: obj.type };
    if ( typeof obj.detail === 'string' ) { evidence.detail = obj.detail; }
    if ( obj.observedValue !== undefined ) { evidence.observedValue = obj.observedValue; }
    if ( typeof obj.observedUnit === 'string' ) { evidence.observedUnit = obj.observedUnit; }
    return evidence;
}

function normalizeScope( raw: unknown ): Scope | undefined {
    if ( !raw || typeof raw !== 'object' || Array.isArray( raw ) ) { return undefined; }
    const obj = raw as Record<string, unknown>;
    if ( typeof obj.type !== 'string' ) { return undefined; }
    const scope: Scope = { type: obj.type };
    if ( typeof obj.identifier === 'string' ) { scope.identifier = obj.identifier; }
    return scope;
}

function normalizeChecks( raw: unknown ): Record<string, CheckEntry> | undefined {
    if ( !raw || typeof raw !== 'object' || Array.isArray( raw ) ) { return undefined; }
    const obj = raw as Record<string, unknown>;
    const checks: Record<string, CheckEntry> = {};
    for ( const [ key, value ] of Object.entries( obj ) ) {
        if ( value && typeof value === 'object' && !Array.isArray( value ) ) {
            const entry = value as Record<string, unknown>;
            const check: CheckEntry = {
                condition: typeof entry.condition === 'string' ? entry.condition : '',
            };
            if ( entry.role === 'component' || entry.role === 'dependency' ) {
                check.role = entry.role;
            }
            const timing = normalizeTiming( entry.timing );
            if ( timing ) { check.timing = timing; }
            if ( typeof entry.provenance === 'string' ) {
                check.provenance = entry.provenance;
            }
            const evidence = normalizeEvidence( entry.evidence );
            if ( evidence ) { check.evidence = evidence; }
            checks[key] = check;
        }
    }
    return Object.keys( checks ).length > 0 ? checks : undefined;
}

function normalizeProfiles( raw: unknown ): string[] {
    if ( Array.isArray( raw ) ) {
        return raw.filter( ( v ): v is string => typeof v === 'string' );
    }
    return [];
}
