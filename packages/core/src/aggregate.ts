/**
 * Condition Aggregation
 *
 * Worst-of and derived-parent logic per the core model and profiles spec.
 */

import {
    conditionSeverity,
    isOrderableCondition,
    HEALTH_ORDERABLE_CONDITIONS,
} from '@open-operational-state/types';
import type { CheckEntry, ComponentEntry } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Reverse-lookup: severity number → condition string
// ---------------------------------------------------------------------------

const SEVERITY_TO_CONDITION: Record<number, string> = {};
for ( const c of HEALTH_ORDERABLE_CONDITIONS ) {
    const sev = conditionSeverity( c );
    if ( sev !== undefined ) {
        SEVERITY_TO_CONDITION[sev] = c;
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the worst (highest severity) orderable condition from a list.
 *
 * Categorical and extension values are skipped — they do not participate
 * in worst-of calculations per the spec.
 *
 * Returns `undefined` if no orderable values are present.
 */
export function worstOf( conditions: string[] ): string | undefined {
    let worstSeverity = -1;
    let worstCondition: string | undefined;

    for ( const c of conditions ) {
        if ( !isOrderableCondition( c ) ) { continue; }
        const sev = conditionSeverity( c )!;
        if ( sev > worstSeverity ) {
            worstSeverity = sev;
            worstCondition = c;
        }
    }

    return worstCondition;
}

/**
 * Derive a parent condition from flat check entries (health-response style).
 *
 * Uses worst-of aggregation across orderable condition values.
 * Categorical values are reported but do not participate.
 */
export function deriveParentConditionFromChecks(
    checks: Record<string, CheckEntry>,
): string | undefined {
    const conditions = Object.values( checks ).map( ( c ) => c.condition );
    return worstOf( conditions );
}

/**
 * Derive a parent condition from nested component entries (service-status style).
 *
 * Uses worst-of aggregation across orderable condition values.
 */
export function deriveParentConditionFromComponents(
    components: ComponentEntry[],
): string | undefined {
    const conditions = components.map( ( c ) => c.condition );
    return worstOf( conditions );
}
