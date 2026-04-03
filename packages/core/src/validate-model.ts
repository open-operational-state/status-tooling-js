/**
 * Snapshot Validation
 *
 * Structural and semantic validation of a Snapshot against the core model
 * and declared profiles.
 */

import type {
    Snapshot,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    ProfileId,
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

// ---------------------------------------------------------------------------
// RFC 3339 timestamp pattern (basic, not exhaustive)
// ---------------------------------------------------------------------------

const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isRfc3339( value: string ): boolean {
    return RFC3339_PATTERN.test( value );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a Snapshot for structural correctness and semantic compliance
 * against the core model and declared profiles.
 */
export function validateSnapshot( snapshot: Snapshot ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // ── Required fields ────────────────────────────────────────────────
    if ( !snapshot.condition || typeof snapshot.condition !== 'string' ) {
        errors.push( {
            path: 'condition',
            message: 'Missing required field: condition',
            code: 'MISSING_CONDITION',
        } );
    }

    if ( !snapshot.subject || typeof snapshot.subject.id !== 'string' || !snapshot.subject.id ) {
        errors.push( {
            path: 'subject.id',
            message: 'Missing required field: subject.id',
            code: 'MISSING_SUBJECT_ID',
        } );
    }

    if ( !Array.isArray( snapshot.profiles ) || snapshot.profiles.length === 0 ) {
        errors.push( {
            path: 'profiles',
            message: 'Missing required field: profiles (must be non-empty array)',
            code: 'MISSING_PROFILES',
        } );
    }

    // ── Profile identifiers ────────────────────────────────────────────
    const validProfiles: ProfileId[] = [];
    if ( Array.isArray( snapshot.profiles ) ) {
        for ( const p of snapshot.profiles ) {
            if ( isProfileId( p ) ) {
                validProfiles.push( p );
            } else {
                errors.push( {
                    path: 'profiles',
                    message: `Invalid profile identifier: '${p}'`,
                    code: 'INVALID_PROFILE',
                } );
            }
        }
    }

    // ── Condition value vs declared profiles ────────────────────────────
    if ( snapshot.condition ) {
        validateConditionForProfiles( snapshot.condition, validProfiles, errors );
    }

    // ── Provenance ─────────────────────────────────────────────────────
    if ( snapshot.provenance !== undefined ) {
        if ( typeof snapshot.provenance !== 'string' ) {
            errors.push( {
                path: 'provenance',
                message: 'Provenance must be a string',
                code: 'INVALID_PROVENANCE_TYPE',
            } );
        } else if ( !isProvenance( snapshot.provenance ) && !isExtensionCondition( snapshot.provenance ) ) {
            warnings.push( {
                path: 'provenance',
                message: `Unrecognized provenance type: '${snapshot.provenance}'`,
                code: 'UNKNOWN_PROVENANCE',
            } );
        }
    }

    // ── Timing format ──────────────────────────────────────────────────
    if ( snapshot.timing ) {
        for ( const field of [ 'observed', 'reported', 'stateChanged' ] as const ) {
            const value = snapshot.timing[field];
            if ( value !== undefined && !isRfc3339( value ) ) {
                errors.push( {
                    path: `timing.${field}`,
                    message: `Timing field '${field}' is not valid RFC 3339: '${value}'`,
                    code: 'INVALID_TIMESTAMP',
                } );
            }
        }
    }

    // ── Profile-level MUST requirements ─────────────────────────────────
    for ( const profileId of validProfiles ) {
        validateProfileRequirements( snapshot, profileId, errors, warnings );
    }

    // ── Check entry conditions ─────────────────────────────────────────
    if ( snapshot.checks ) {
        for ( const [ key, entry ] of Object.entries( snapshot.checks ) ) {
            if ( !entry.condition ) {
                errors.push( {
                    path: `checks.${key}.condition`,
                    message: `Check '${key}' is missing required field: condition`,
                    code: 'MISSING_CHECK_CONDITION',
                } );
            } else if (
                !isHealthCondition( entry.condition ) &&
                !isLivenessCondition( entry.condition ) &&
                !isReadinessCondition( entry.condition ) &&
                !isExtensionCondition( entry.condition )
            ) {
                errors.push( {
                    path: `checks.${key}.condition`,
                    message: `Invalid condition value in check '${key}': '${entry.condition}'`,
                    code: 'INVALID_CHECK_CONDITION',
                } );
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateConditionForProfiles(
    condition: string,
    profiles: ProfileId[],
    errors: ValidationError[],
): void {
    for ( const profile of profiles ) {
        let valid = false;

        switch ( profile ) {
            case 'liveness':
                valid = isLivenessCondition( condition );
                break;
            case 'readiness':
                valid = isReadinessCondition( condition );
                break;
            case 'health':
            case 'status':
                valid = isHealthCondition( condition ) || isExtensionCondition( condition );
                break;
        }

        // If multiple profiles are declared, the condition must be valid
        // in ALL declared vocabularies — OR the implementation uses a
        // Health/Status value that subsumes the simpler profiles.
        // For practical single-vocab cases, we check each profile.
        // A Health value like 'operational' isn't in liveness vocab ('alive'),
        // but per the profile hierarchy, a Health response satisfies Liveness.
        // We only flag if the condition isn't valid in ANY profile's vocabulary.
        if ( !valid && !isExtensionCondition( condition ) ) {
            // Check if valid in a higher profile's vocabulary
            const validInAnyVocab =
                isLivenessCondition( condition ) ||
                isReadinessCondition( condition ) ||
                isHealthCondition( condition );

            if ( !validInAnyVocab ) {
                errors.push( {
                    path: 'condition',
                    message: `Invalid condition value: '${condition}' is not in the ${profile} vocabulary and does not use x-{vendor}-{value} extension format`,
                    code: 'INVALID_CONDITION',
                } );
                return; // One error is enough
            }
        }
    }
}

function validateProfileRequirements(
    snapshot: Snapshot,
    profileId: ProfileId,
    errors: ValidationError[],
    warnings: ValidationWarning[],
): void {
    const reqs = PROFILE_REQUIREMENTS[profileId];

    // Timing
    if ( reqs.timing === 'MUST' && !snapshot.timing ) {
        errors.push( {
            path: 'timing',
            message: `Profile '${profileId}' requires timing`,
            code: 'PROFILE_MISSING_TIMING',
        } );
    } else if ( reqs.timing === 'SHOULD' && !snapshot.timing ) {
        warnings.push( {
            path: 'timing',
            message: `Profile '${profileId}' recommends timing`,
            code: 'PROFILE_RECOMMEND_TIMING',
        } );
    }

    // Evidence
    if ( reqs.evidence === 'MUST' && !snapshot.evidence ) {
        errors.push( {
            path: 'evidence',
            message: `Profile '${profileId}' requires evidence`,
            code: 'PROFILE_MISSING_EVIDENCE',
        } );
    } else if ( reqs.evidence === 'SHOULD' && !snapshot.evidence ) {
        warnings.push( {
            path: 'evidence',
            message: `Profile '${profileId}' recommends evidence`,
            code: 'PROFILE_RECOMMEND_EVIDENCE',
        } );
    }

    // Components
    if ( reqs.components === 'MUST' && !snapshot.checks && !snapshot.components ) {
        errors.push( {
            path: 'components',
            message: `Profile '${profileId}' requires components`,
            code: 'PROFILE_MISSING_COMPONENTS',
        } );
    }

    // Dependencies
    if ( reqs.dependencies === 'MUST' && !snapshot.checks && !snapshot.dependencies ) {
        errors.push( {
            path: 'dependencies',
            message: `Profile '${profileId}' requires dependencies`,
            code: 'PROFILE_MISSING_DEPENDENCIES',
        } );
    }

    // Provenance
    if ( reqs.provenance === 'MUST' && !snapshot.provenance ) {
        errors.push( {
            path: 'provenance',
            message: `Profile '${profileId}' requires provenance`,
            code: 'PROFILE_MISSING_PROVENANCE',
        } );
    } else if ( reqs.provenance === 'SHOULD' && !snapshot.provenance ) {
        warnings.push( {
            path: 'provenance',
            message: `Profile '${profileId}' recommends provenance`,
            code: 'PROFILE_RECOMMEND_PROVENANCE',
        } );
    }
}
