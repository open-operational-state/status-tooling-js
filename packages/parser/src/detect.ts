/**
 * Format Detection
 *
 * Identify which parser/adapter to apply based on content-type and
 * structural markers in the response body.
 */

// ---------------------------------------------------------------------------
// Adapter types
// ---------------------------------------------------------------------------

export type AdapterType =
    | 'native-health-response'
    | 'native-service-status'
    | 'health-check-draft'
    | 'spring-boot'
    | 'plain-http'
    | 'unknown';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect which adapter to apply to a parsed response body.
 *
 * Priority order:
 * 1. Content-type match
 * 2. Structural markers (native OOS format with `profiles` field)
 * 3. Structural markers (draft-inadarei with `status` = pass/fail/warn)
 * 4. Fall back to plain-http
 */
export function detectFormat(
    contentType: string | undefined,
    body: unknown,
): AdapterType {
    const ct = ( contentType || '' ).toLowerCase().split( ';' )[0].trim();

    // ── Content-type primary detection ─────────────────────────────────
    if ( ct === 'application/status+json' ) {
        return 'native-service-status';
    }

    // application/health+json could be native OOS or draft-inadarei
    if ( ct === 'application/health+json' ) {
        if ( isOosNativeFormat( body ) ) {
            return 'native-health-response';
        }
        if ( isDraftInadarei( body ) ) {
            return 'health-check-draft';
        }
        // Default for this content type
        return 'native-health-response';
    }

    // ── Structural detection for application/json ──────────────────────
    if ( ct === 'application/json' || ct === '' ) {
        if ( isOosNativeFormat( body ) ) {
            return 'native-health-response';
        }
        if ( isSpringBoot( body ) ) {
            return 'spring-boot';
        }
        if ( isDraftInadarei( body ) ) {
            return 'health-check-draft';
        }
    }

    // ── Fallback ───────────────────────────────────────────────────────
    return 'plain-http';
}

// ---------------------------------------------------------------------------
// Structural markers
// ---------------------------------------------------------------------------

function isOosNativeFormat( body: unknown ): boolean {
    if ( !body || typeof body !== 'object' || Array.isArray( body ) ) { return false; }
    const obj = body as Record<string, unknown>;
    // OOS native format has `profiles` array and `condition` field
    return Array.isArray( obj.profiles ) && typeof obj.condition === 'string';
}

const DRAFT_STATUS_VALUES = new Set( [
    'pass', 'fail', 'warn',
    'ok', 'error',
] );

// Values shared between Spring Boot and draft-inadarei
const AMBIGUOUS_STATUS_VALUES = new Set( [ 'up', 'down' ] );

const SPRING_BOOT_STATUS_VALUES = new Set( [
    'up', 'down', 'out_of_service', 'unknown',
] );

function isDraftInadarei( body: unknown ): boolean {
    if ( !body || typeof body !== 'object' || Array.isArray( body ) ) { return false; }
    const obj = body as Record<string, unknown>;
    if ( typeof obj.status !== 'string' ) { return false; }
    const status = obj.status.toLowerCase();

    // Unambiguous draft-inadarei values
    if ( DRAFT_STATUS_VALUES.has( status ) ) { return true; }

    // Ambiguous values — disambiguate by structure
    if ( AMBIGUOUS_STATUS_VALUES.has( status ) ) {
        // draft-inadarei uses `checks` (object of arrays)
        if ( obj.checks && typeof obj.checks === 'object' ) { return true; }
        // If neither checks nor components, default to draft-inadarei
        // (more common in the wild)
        if ( !obj.components ) { return true; }
    }

    return false;
}

function isSpringBoot( body: unknown ): boolean {
    if ( !body || typeof body !== 'object' || Array.isArray( body ) ) { return false; }
    const obj = body as Record<string, unknown>;
    if ( typeof obj.status !== 'string' ) { return false; }
    const status = obj.status.toLowerCase();

    // Unambiguous Spring Boot values
    if ( status === 'out_of_service' ) { return true; }

    // Ambiguous values — disambiguate by structure
    if ( AMBIGUOUS_STATUS_VALUES.has( status ) || status === 'unknown' ) {
        // Spring Boot uses `components` (object of objects with `status`)
        if ( obj.components && typeof obj.components === 'object' && !Array.isArray( obj.components ) ) {
            return true;
        }
    }

    return false;
}
