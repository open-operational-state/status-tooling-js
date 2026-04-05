/**
 * Exposure Tier Filtering
 *
 * Strips a Snapshot to only include fields permitted by the given
 * exposure tier, per the security-considerations spec (§2).
 *
 * IMPORTANT: This filter is applied BEFORE serialization — we never
 * serialize fields only to strip them afterward.  This is both a
 * performance and security concern.
 */

import type { Snapshot, CheckEntry } from '@open-operational-state/types';
import type { ExposureValue } from './constants.js';
import { Exposure } from './constants.js';

/**
 * Returns a new Snapshot containing only the fields permitted by
 * the given exposure tier.  The input snapshot is never mutated.
 */
export function filterByExposure(
    snapshot: Snapshot,
    tier: ExposureValue,
): Snapshot {
    switch ( tier ) {
        case Exposure.CONDITION_ONLY:
            return filterConditionOnly( snapshot );
        case Exposure.CONDITION_METADATA:
            return filterConditionMetadata( snapshot );
        case Exposure.COMPONENT_LEVEL:
            return filterComponentLevel( snapshot );
        case Exposure.FULL_DIAGNOSTIC:
            // No filtering — return the original snapshot as-is
            return snapshot;
        default:
            // Unrecognised tier falls back to the most restrictive
            return filterConditionOnly( snapshot );
    }
}

// ---------------------------------------------------------------------------
// condition-only: condition, profiles, subject.id
// ---------------------------------------------------------------------------

function filterConditionOnly( snapshot: Snapshot ): Snapshot {
    return {
        condition: snapshot.condition,
        profiles: [ ...snapshot.profiles ],
        subject: { id: snapshot.subject.id },
    };
}

// ---------------------------------------------------------------------------
// condition-metadata: + timing, subject.description, provenance
// ---------------------------------------------------------------------------

function filterConditionMetadata( snapshot: Snapshot ): Snapshot {
    const result: Snapshot = {
        condition: snapshot.condition,
        profiles: [ ...snapshot.profiles ],
        subject: {
            id: snapshot.subject.id,
            ...( snapshot.subject.description
                ? { description: snapshot.subject.description }
                : {} ),
        },
    };

    if ( snapshot.timing ) {
        result.timing = { ...snapshot.timing };
    }
    if ( snapshot.provenance ) {
        result.provenance = snapshot.provenance;
    }

    return result;
}

// ---------------------------------------------------------------------------
// component-level: + checks/components conditions only (no evidence)
// ---------------------------------------------------------------------------

function filterComponentLevel( snapshot: Snapshot ): Snapshot {
    const result = filterConditionMetadata( snapshot );

    // Flat checks — include condition and role only, strip evidence
    if ( snapshot.checks ) {
        const filtered: Record<string, CheckEntry> = {};
        for ( const [ key, check ] of Object.entries( snapshot.checks ) ) {
            filtered[key] = {
                condition: check.condition,
                ...( check.role ? { role: check.role } : {} ),
            };
        }
        result.checks = filtered;
    }

    // Nested components — condition only
    if ( snapshot.components ) {
        result.components = snapshot.components.map( ( comp ) => ( {
            id: comp.id,
            condition: comp.condition,
            ...( comp.criticality ? { criticality: comp.criticality } : {} ),
        } ) );
    }

    // Nested dependencies — condition only
    if ( snapshot.dependencies ) {
        result.dependencies = snapshot.dependencies.map( ( dep ) => ( {
            id: dep.id,
            condition: dep.condition,
            ...( dep.criticality ? { criticality: dep.criticality } : {} ),
        } ) );
    }

    return result;
}
