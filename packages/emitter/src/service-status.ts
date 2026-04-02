/**
 * Service Status Emitter
 *
 * Converts a Snapshot → application/status+json wire format.
 */

import type { Snapshot, ComponentEntry, DependencyEntry } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ServiceStatusPayload {
    condition: string;
    profiles: string[];
    subject: {
        id: string;
        description?: string;
        version?: string;
        contact?: string;
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
    scope?: {
        type: string;
        identifier?: string;
    };
    components?: ComponentEntry[];
    dependencies?: DependencyEntry[];
    incidents?: unknown[];
    links?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit a Snapshot as an application/status+json payload.
 */
export function emitServiceStatus( snapshot: Snapshot ): ServiceStatusPayload {
    const payload: ServiceStatusPayload = {
        condition: snapshot.condition,
        profiles: [ ...snapshot.profiles ],
        subject: {
            id: snapshot.subject.id,
            ...( snapshot.subject.description ? { description: snapshot.subject.description } : {} ),
            ...( snapshot.subject.version ? { version: snapshot.subject.version } : {} ),
            ...( snapshot.subject.contact ? { contact: snapshot.subject.contact } : {} ),
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
        payload.evidence = {
            type: snapshot.evidence.type,
            ...( snapshot.evidence.detail ? { detail: snapshot.evidence.detail } : {} ),
        };
    }

    // Scope
    if ( snapshot.scope ) {
        payload.scope = { ...snapshot.scope };
    }

    // Components — from nested array or convert from flat checks
    if ( snapshot.components ) {
        payload.components = snapshot.components.map( cloneComponent );
    } else if ( snapshot.checks ) {
        payload.components = [];
        payload.dependencies = [];
        for ( const [ key, check ] of Object.entries( snapshot.checks ) ) {
            if ( check.role === 'dependency' ) {
                payload.dependencies.push( {
                    id: key,
                    condition: check.condition,
                    ...( check.timing ? { timing: check.timing } : {} ),
                    ...( check.provenance ? { provenance: check.provenance } : {} ),
                    ...( check.evidence ? { evidence: check.evidence } : {} ),
                } );
            } else {
                payload.components.push( {
                    id: key,
                    condition: check.condition,
                    ...( check.timing ? { timing: check.timing } : {} ),
                    ...( check.provenance ? { provenance: check.provenance } : {} ),
                    ...( check.evidence ? { evidence: check.evidence } : {} ),
                } );
            }
        }
    }

    // Dependencies (from nested array)
    if ( snapshot.dependencies ) {
        payload.dependencies = snapshot.dependencies.map( ( dep ) => ( { ...dep } ) );
    }

    // Incidents
    if ( snapshot.incidents && snapshot.incidents.length > 0 ) {
        payload.incidents = snapshot.incidents;
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

function cloneComponent( comp: ComponentEntry ): ComponentEntry {
    const clone: ComponentEntry = {
        id: comp.id,
        condition: comp.condition,
    };
    if ( comp.description ) { clone.description = comp.description; }
    if ( comp.criticality ) { clone.criticality = comp.criticality; }
    if ( comp.timing ) { clone.timing = { ...comp.timing }; }
    if ( comp.provenance ) { clone.provenance = comp.provenance; }
    if ( comp.evidence ) { clone.evidence = { ...comp.evidence }; }
    if ( comp.components ) {
        clone.components = comp.components.map( cloneComponent );
    }
    return clone;
}
