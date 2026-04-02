/**
 * HTTP Response Helpers
 *
 * Suggest HTTP status codes and headers for operational-state responses
 * per the serialization spec rules.
 */

import type { Snapshot } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// HTTP status code suggestion
// ---------------------------------------------------------------------------

/**
 * Returns the recommended HTTP status code for a given condition value,
 * per the serialization spec HTTP Response Requirements.
 */
export function suggestHttpStatus( condition: string ): number {
    switch ( condition ) {
        // Good states → 200
        case 'operational':
        case 'alive':
        case 'ready':
        case 'degraded':
        case 'partial-outage':
        case 'major-outage':
        case 'initializing':
            return 200;

        // Down / unreachable / not-ready → 503
        case 'down':
        case 'unreachable':
        case 'not-ready':
        case 'maintenance':
            return 503;

        // Unknown → 200 (service is responding)
        case 'unknown':
            return 200;

        default:
            // Extension values → 200 (service is responding)
            return 200;
    }
}

// ---------------------------------------------------------------------------
// Header suggestion
// ---------------------------------------------------------------------------

/**
 * Returns recommended HTTP headers for an operational-state response.
 */
export function suggestHeaders(
    snapshot: Snapshot,
    serialization: 'application/health+json' | 'application/status+json',
): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': serialization,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    // Retry-After for maintenance
    if ( snapshot.condition === 'maintenance' && snapshot.timing?.stateChanged ) {
        // If we know when maintenance started, suggest checking back in 5 minutes
        headers['Retry-After'] = '300';
    }

    return headers;
}
