/**
 * Native Health Response Parser
 *
 * Deserializes application/health+json (our own format) into a Snapshot.
 * This is NOT an adapter — it's native format deserialization.
 */

import { normalizeSnapshot } from '@open-operational-state/core';
import type { Snapshot } from '@open-operational-state/types';

/**
 * Parse a native health-response body into a Snapshot.
 */
export function parseHealthResponse( body: unknown ): Snapshot {
    if ( !body || typeof body !== 'object' || Array.isArray( body ) ) {
        throw new Error( 'Health response body must be a non-null object' );
    }

    return normalizeSnapshot( body as Record<string, unknown> );
}
