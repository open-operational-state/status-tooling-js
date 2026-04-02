/**
 * Unified Parse Entry Point
 *
 * Auto-detects format and dispatches to the correct parser.
 */

import type { Snapshot, ParseResult, ParseWarning } from '@open-operational-state/types';
import { detectFormat } from './detect.js';
import { parsePlainHttp } from './plain-http.js';
import type { PlainHttpInput } from './plain-http.js';
import { parseHealthCheckDraft } from './health-check-draft.js';
import { parseHealthResponse } from './health-response.js';
import { parseSpringBoot } from './spring-boot.js';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface ParseInput {
    /** HTTP Content-Type header */
    contentType?: string;
    /** Parsed response body (JSON object) */
    body?: unknown;
    /** Request URL */
    url?: string;
    /** HTTP status code */
    httpStatus?: number;
    /** Response headers */
    headers?: Record<string, string>;
    /** True if the connection failed entirely */
    connectionError?: boolean;
}

// ---------------------------------------------------------------------------
// Lossiness warnings per adapter
// ---------------------------------------------------------------------------

const ADAPTER_WARNINGS: Record<string, ParseWarning[]> = {
    'plain-http': [
        { message: 'Plain HTTP yields liveness only (alive/unreachable). No condition detail is available.', code: 'LOSSY_PLAIN_HTTP' },
    ],
    'health-check-draft': [
        { message: 'draft-inadarei status values mapped to OOS conditions. Some semantic nuance may be lost.', code: 'LOSSY_HEALTH_CHECK_DRAFT' },
    ],
    'spring-boot': [
        { message: 'Spring Boot Actuator status values mapped to OOS conditions. OUT_OF_SERVICE and DOWN both map to down.', code: 'LOSSY_SPRING_BOOT' },
    ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an HTTP response into a Snapshot.
 *
 * Auto-detects the format from content-type and body structure,
 * then dispatches to the appropriate parser.
 *
 * **Throws** on malformed input. For production use, prefer `safeParse()`.
 */
export function parse( input: ParseInput ): Snapshot {
    const format = detectFormat( input.contentType, input.body );

    switch ( format ) {
        case 'native-health-response':
            return parseHealthResponse( input.body );

        case 'native-service-status':
            return parseHealthResponse( input.body );

        case 'health-check-draft':
            return parseHealthCheckDraft( input.body, { url: input.url } );

        case 'spring-boot':
            return parseSpringBoot( input.body, { url: input.url } );

        case 'plain-http':
            return parsePlainHttp( {
                url: input.url || '',
                httpStatus: input.httpStatus,
                headers: input.headers,
                connectionError: input.connectionError,
            } );

        default:
            return parsePlainHttp( {
                url: input.url || '',
                httpStatus: input.httpStatus,
                headers: input.headers,
                connectionError: input.connectionError,
            } );
    }
}

/**
 * Parse an HTTP response into a ParseResult.
 *
 * Returns `{ snapshot, errors, warnings }` — never throws.
 * Use this in production code, CLIs, and anywhere you handle
 * untrusted input.
 */
export function safeParse( input: ParseInput ): ParseResult {
    const format = detectFormat( input.contentType, input.body );
    const warnings = ADAPTER_WARNINGS[format] ? [ ...ADAPTER_WARNINGS[format] ] : [];

    try {
        const snapshot = parse( input );
        return { snapshot, errors: [], warnings };
    } catch ( err ) {
        const message = err instanceof Error ? err.message : String( err );
        return {
            snapshot: null,
            errors: [ { message, code: 'PARSE_ERROR' } ],
            warnings,
        };
    }
}
