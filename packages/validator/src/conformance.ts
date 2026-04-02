/**
 * Conformance Level Checking
 *
 * Determines Basic / Standard / Extended conformance per
 * status-conformance/CONFORMANCE.md.
 */

import type {
    Snapshot,
    ConformanceResult,
    ValidationError,
    ValidationWarning,
} from '@open-operational-state/types';

import {
    isProfileId,
    isHealthCondition,
    isLivenessCondition,
    isReadinessCondition,
    isExtensionCondition,
    isProvenance,
    PROFILE_REQUIREMENTS,
} from '@open-operational-state/types';

import { validateSnapshot } from '@open-operational-state/core';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assess the conformance level of a Snapshot.
 *
 * Levels are cumulative: Standard implies Basic, Extended implies Standard.
 */
export function checkConformanceLevel( snapshot: Snapshot ): ConformanceResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const basicOk = checkBasic( snapshot, errors );
    const standardOk = basicOk && checkStandard( snapshot, errors, warnings );
    const extendedOk = standardOk && checkExtended( snapshot, errors, warnings );

    let level: ConformanceResult['level'] = null;
    if ( extendedOk ) { level = 'extended'; }
    else if ( standardOk ) { level = 'standard'; }
    else if ( basicOk ) { level = 'basic'; }

    return {
        level,
        basic: basicOk,
        standard: standardOk,
        extended: extendedOk,
        errors,
        warnings,
    };
}

// ---------------------------------------------------------------------------
// Basic
// ---------------------------------------------------------------------------

function checkBasic( snapshot: Snapshot, errors: ValidationError[] ): boolean {
    let ok = true;

    // Valid condition field
    if ( !snapshot.condition ) {
        errors.push( { path: 'condition', message: 'Basic: missing condition', code: 'BASIC_MISSING_CONDITION' } );
        ok = false;
    }

    // Subject with id
    if ( !snapshot.subject?.id ) {
        errors.push( { path: 'subject.id', message: 'Basic: missing subject.id', code: 'BASIC_MISSING_SUBJECT' } );
        ok = false;
    }

    // Profiles array with at least one valid profile
    if ( !Array.isArray( snapshot.profiles ) || snapshot.profiles.length === 0 ) {
        errors.push( { path: 'profiles', message: 'Basic: missing or empty profiles', code: 'BASIC_MISSING_PROFILES' } );
        ok = false;
    } else {
        const hasValidProfile = snapshot.profiles.some( isProfileId );
        if ( !hasValidProfile ) {
            errors.push( { path: 'profiles', message: 'Basic: no valid profile identifier', code: 'BASIC_NO_VALID_PROFILE' } );
            ok = false;
        }
    }

    // Condition value is in a recognized vocabulary
    if ( snapshot.condition ) {
        const inVocab =
            isLivenessCondition( snapshot.condition ) ||
            isReadinessCondition( snapshot.condition ) ||
            isHealthCondition( snapshot.condition ) ||
            isExtensionCondition( snapshot.condition );

        if ( !inVocab ) {
            errors.push( {
                path: 'condition',
                message: `Basic: condition '${snapshot.condition}' not in any vocabulary`,
                code: 'BASIC_INVALID_CONDITION',
            } );
            ok = false;
        }
    }

    return ok;
}

// ---------------------------------------------------------------------------
// Standard
// ---------------------------------------------------------------------------

function checkStandard(
    snapshot: Snapshot,
    errors: ValidationError[],
    warnings: ValidationWarning[],
): boolean {
    let ok = true;

    // Full model validation passes
    const modelResult = validateSnapshot( snapshot );
    if ( !modelResult.valid ) {
        for ( const e of modelResult.errors ) {
            errors.push( { ...e, code: `STANDARD_${e.code}` } );
        }
        ok = false;
    }
    warnings.push( ...modelResult.warnings );

    // Timing uses RFC 3339 (already covered by validateSnapshot)

    // All declared profiles' MUST-level requirements are satisfied
    // (already covered by validateSnapshot)

    return ok;
}

// ---------------------------------------------------------------------------
// Extended
// ---------------------------------------------------------------------------

function checkExtended(
    snapshot: Snapshot,
    errors: ValidationError[],
    warnings: ValidationWarning[],
): boolean {
    let ok = true;

    // Multiple profiles
    if ( !Array.isArray( snapshot.profiles ) || snapshot.profiles.length < 2 ) {
        errors.push( {
            path: 'profiles',
            message: 'Extended: requires multiple profiles',
            code: 'EXTENDED_SINGLE_PROFILE',
        } );
        ok = false;
    }

    // Explicit provenance
    if ( !snapshot.provenance ) {
        errors.push( {
            path: 'provenance',
            message: 'Extended: requires explicit provenance',
            code: 'EXTENDED_MISSING_PROVENANCE',
        } );
        ok = false;
    } else if ( !isProvenance( snapshot.provenance ) ) {
        errors.push( {
            path: 'provenance',
            message: `Extended: unrecognized provenance '${snapshot.provenance}'`,
            code: 'EXTENDED_INVALID_PROVENANCE',
        } );
        ok = false;
    }

    // Evidence for non-operational conditions
    if ( snapshot.condition && snapshot.condition !== 'operational' && snapshot.condition !== 'alive' && snapshot.condition !== 'ready' ) {
        if ( !snapshot.evidence ) {
            errors.push( {
                path: 'evidence',
                message: 'Extended: requires evidence for non-operational conditions',
                code: 'EXTENDED_MISSING_EVIDENCE',
            } );
            ok = false;
        }
    }

    return ok;
}
