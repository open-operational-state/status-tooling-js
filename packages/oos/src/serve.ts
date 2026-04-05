/**
 * serve — Producer-side OOS handler factory
 *
 * Creates a framework-agnostic handler that produces spec-conformant
 * operational state responses.  Compose with framework adapters
 * (e.g. @open-operational-state/oos/express) to mount on a route.
 *
 * Secure by default: condition-only exposure tier unless explicitly
 * configured otherwise.
 */

import type { Snapshot, Timing, ProfileId } from '@open-operational-state/types';
import { emitHealthResponse } from '@open-operational-state/emitter';
import { suggestHttpStatus, suggestHeaders } from '@open-operational-state/emitter';
import { Condition, Exposure, Profile, ProvenanceType, Serialization } from './constants.js';
import type { ExposureValue, ProfileValue, ConditionValue } from './constants.js';
import { filterByExposure } from './exposure.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimal request representation — adapters map framework-specific
 * request objects to this shape.
 */
export interface OosRequest {
    headers: Record<string, string | undefined>;
    url?: string;
}

/** The framework-agnostic response produced by the handler. */
export interface HandlerResult {
    status: number;
    headers: Record<string, string>;
    body: unknown;
}

/** Async handler function returned by serve(). */
export type OosHandler = ( request: OosRequest ) => Promise<HandlerResult>;

/** Static or dynamic condition provider. */
export type ConditionProvider = ConditionValue | string | ( () => string | Promise<string> );

/** Authentication predicate — receives the minimal OosRequest. */
export type AuthPredicate = ( request: OosRequest ) => boolean | Promise<boolean>;

/** Configuration for serve(). */
export interface ServeConfig {
    /** Subject identity — required. */
    subject: {
        id: string;
        description?: string;
        version?: string;
    };

    /** Profile(s) to advertise.  Default: [Profile.HEALTH] */
    profiles?: ProfileValue[] | string[];

    /**
     * Condition — static string, named constant, or async callback.
     * Default: Condition.OPERATIONAL.
     */
    condition?: ConditionProvider;

    /**
     * Exposure tier for unauthenticated requests.
     * Default: Exposure.CONDITION_ONLY (most restrictive).
     */
    exposure?: ExposureValue;

    /**
     * Exposure tier for authenticated requests.
     * Only applied when isAuthenticated is provided and returns true.
     */
    authenticatedExposure?: ExposureValue;

    /** Predicate to determine if a request is authenticated. */
    isAuthenticated?: AuthPredicate;

    /** Provenance type.  Default: 'self-reported'. */
    provenance?: string;

    /** Whether to validate output at startup.  Default: false. */
    validate?: boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a framework-agnostic health handler.
 *
 * ```ts
 * const handler = serve( { subject: { id: 'my-api' } } );
 * ```
 */
export function serve( config: ServeConfig ): OosHandler {
    // ── Validate required fields ──────────────────────────────────────
    if ( !config.subject || !config.subject.id ) {
        throw new Error(
            '[oos] Configuration error: subject.id is required.\n' +
            'Fix: serve( { subject: { id: \'my-service\' } } )\n' +
            'See: https://github.com/open-operational-state/status-spec/blob/main/spec/core-model.md',
        );
    }

    // ── Resolve defaults (upfront, not per-request) ───────────────────
    const profiles = config.profiles ?? [ Profile.HEALTH ];
    const defaultExposure = config.exposure ?? Exposure.CONDITION_ONLY;
    const authenticatedExposure = config.authenticatedExposure;
    const isAuthenticated = config.isAuthenticated;
    const provenance = config.provenance ?? ProvenanceType.SELF_REPORTED;
    const conditionProvider = config.condition ?? Condition.OPERATIONAL;

    // ── Pre-compute static subject ────────────────────────────────────
    const subject = {
        id: config.subject.id,
        ...( config.subject.description
            ? { description: config.subject.description }
            : {} ),
        ...( config.subject.version
            ? { version: config.subject.version }
            : {} ),
    };

    // ── Self-validation on first invocation ───────────────────────────
    let validated = !config.validate;

    // ── Handler ───────────────────────────────────────────────────────
    const handler: OosHandler = async ( request ) => {
        // Resolve condition
        const condition = typeof conditionProvider === 'function'
            ? await conditionProvider()
            : conditionProvider;

        // Build timing
        const now = new Date().toISOString();
        const timing: Timing = {
            observed: now,
            reported: now,
        };

        // Build snapshot (full, pre-filter)
        const snapshot: Snapshot = {
            condition,
            profiles: [ ...profiles ],
            subject,
            timing,
            provenance,
        };

        // Determine exposure tier
        let exposure = defaultExposure;
        if ( authenticatedExposure && isAuthenticated ) {
            const authed = await isAuthenticated( request );
            if ( authed ) {
                exposure = authenticatedExposure;
            }
        }

        // Filter by exposure tier (BEFORE serialization)
        const filtered = filterByExposure( snapshot, exposure );

        // Self-validation (once, on first request)
        if ( !validated ) {
            validated = true;
            selfValidate( filtered, profiles as string[] );
        }

        // Serialize
        const mediaType = Serialization.HEALTH_RESPONSE_MEDIA_TYPE as
            'application/health+json' | 'application/status+json';
        const body = emitHealthResponse( filtered );
        const status = suggestHttpStatus( filtered.condition );
        const headers = suggestHeaders( filtered, mediaType );

        return { status, headers, body };
    };

    return handler;
}

// ---------------------------------------------------------------------------
// Self-validation (dev mode)
// ---------------------------------------------------------------------------

function selfValidate( snapshot: Snapshot, profiles: string[] ): void {
    const warnings: string[] = [];

    // Health profile recommends timing
    if ( profiles.includes( Profile.HEALTH ) && !snapshot.timing ) {
        warnings.push(
            'Profile \'health\' recommends timing, but timing is not present after ' +
            'exposure filtering. This may be expected for the condition-only tier.',
        );
    }

    // Health profile recommends provenance
    if ( profiles.includes( Profile.HEALTH ) && !snapshot.provenance ) {
        warnings.push(
            'Profile \'health\' recommends provenance, but provenance is not present ' +
            'after exposure filtering. This may be expected for the condition-only tier.',
        );
    }

    for ( const w of warnings ) {
        console.warn( `[oos] Warning: ${w}` );
    }
}
