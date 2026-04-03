/**
 * Profile Definitions
 *
 * Profile identifiers, requirement matrices, and hierarchy,
 * derived from status-spec/spec/profiles.md.
 */

// ---------------------------------------------------------------------------
// Profile identifiers
// ---------------------------------------------------------------------------

export const PROFILE_IDS = [ 'liveness', 'readiness', 'health', 'status' ] as const;
export type ProfileId = typeof PROFILE_IDS[number];

export function isProfileId( value: string ): value is ProfileId {
    return ( PROFILE_IDS as readonly string[] ).includes( value );
}

// ---------------------------------------------------------------------------
// Requirement levels (mirrors the normative table in profiles.md)
// ---------------------------------------------------------------------------

export type RequirementLevel = 'MUST' | 'SHOULD' | 'MAY' | 'NONE';

export interface ProfileRequirements {
    subject: RequirementLevel;
    condition: RequirementLevel;
    timing: RequirementLevel;
    evidence: RequirementLevel;
    components: RequirementLevel;
    dependencies: RequirementLevel;
    provenance: RequirementLevel;
    scope: RequirementLevel;
}

/**
 * Normative requirement matrix per profile.
 *
 * Maps directly to the table in profiles.md §Required and Optional Concepts.
 * "—" in the spec table is represented as 'NONE'.
 */
export const PROFILE_REQUIREMENTS: Record<ProfileId, ProfileRequirements> = {
    liveness: {
        subject: 'MUST',
        condition: 'MUST',
        timing: 'MAY',
        evidence: 'NONE',
        components: 'NONE',
        dependencies: 'NONE',
        provenance: 'NONE',
        scope: 'NONE',
    },
    readiness: {
        subject: 'MUST',
        condition: 'MUST',
        timing: 'MAY',
        evidence: 'NONE',
        components: 'NONE',
        dependencies: 'MAY',
        provenance: 'NONE',
        scope: 'NONE',
    },
    health: {
        subject: 'MUST',
        condition: 'MUST',
        timing: 'SHOULD',
        evidence: 'SHOULD',
        components: 'MAY',
        dependencies: 'MAY',
        provenance: 'SHOULD',
        scope: 'MAY',
    },
    status: {
        subject: 'MUST',
        condition: 'MUST',
        timing: 'MUST',
        evidence: 'MUST',
        components: 'MUST',
        dependencies: 'MUST',
        provenance: 'MUST',
        scope: 'MAY',
    },
};

// ---------------------------------------------------------------------------
// Profile hierarchy
//
// Status ⊃ Health ⊃ Readiness ⊃ Liveness
// Each profile's index in PROFILE_IDS is coincidentally its hierarchy level.
// ---------------------------------------------------------------------------

/**
 * Returns the profiles that this profile automatically satisfies,
 * based on the conceptual hierarchy.
 *
 * Example: 'health' → ['health', 'readiness', 'liveness']
 */
export function satisfiedProfiles( profile: ProfileId ): ProfileId[] {
    const idx = PROFILE_IDS.indexOf( profile );
    // Include the profile itself and all profiles below it in the hierarchy
    return PROFILE_IDS.slice( 0, idx + 1 ).reverse() as unknown as ProfileId[];
}
