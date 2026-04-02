/**
 * Plain HTTP Adapter
 *
 * Implements the plain-http adapter spec:
 *   status-spec/spec/adapters/plain-http.md
 *
 * Maps HTTP status code / connection result → Liveness profile.
 */

import type { Snapshot, Timing } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface PlainHttpInput {
    /** The URL that was probed */
    url: string;
    /** HTTP status code (undefined if connection failed) */
    httpStatus?: number;
    /** Response headers */
    headers?: Record<string, string>;
    /** True if the connection failed entirely (refused, DNS, timeout) */
    connectionError?: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a plain HTTP probe result into a Liveness Snapshot.
 */
export function parsePlainHttp( input: PlainHttpInput ): Snapshot {
    const isReachable = !input.connectionError && input.httpStatus !== undefined;

    const timing: Timing = {
        observed: new Date().toISOString(),
    };

    // Map HTTP Date header to report time
    if ( input.headers ) {
        const dateHeader = findHeader( input.headers, 'date' );
        if ( dateHeader ) {
            try {
                timing.reported = new Date( dateHeader ).toISOString();
            } catch {
                // Ignore invalid Date header
            }
        }
    }

    return {
        condition: isReachable ? 'alive' : 'unreachable',
        profiles: [ 'liveness' ],
        subject: {
            id: input.url,
        },
        timing,
        provenance: 'externally-observed',
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findHeader( headers: Record<string, string>, name: string ): string | undefined {
    const lower = name.toLowerCase();
    for ( const [ key, value ] of Object.entries( headers ) ) {
        if ( key.toLowerCase() === lower ) { return value; }
    }
    return undefined;
}
