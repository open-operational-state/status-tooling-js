/**
 * Unified Discovery Flow
 *
 * Implements the discovery priority hierarchy:
 * 1. Link-based discovery (primary)
 * 2. Well-known path (baseline fallback)
 */

import type { DiscoveryDocument } from '@open-operational-state/types';
import { parseLinkHeaders } from './link-header.js';
import type { OperationalStateLink } from './link-header.js';
import { fetchDiscoveryDocument } from './well-known.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoverOptions {
    /** Skip Link header discovery */
    skipLinkHeaders?: boolean;
    /** Skip well-known path discovery */
    skipWellKnown?: boolean;
    /** Custom headers to send with requests */
    headers?: Record<string, string>;
}

export interface DiscoverResult {
    /** How the resources were discovered */
    method: 'link-header' | 'well-known' | 'none';
    /** Operational state links found via Link headers */
    links: OperationalStateLink[];
    /** Discovery document from well-known path (if found) */
    document: DiscoveryDocument | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover operational-state resources for a given base URL.
 *
 * Follows the discovery priority hierarchy:
 * 1. Check Link headers from a probe of the base URL
 * 2. Fall back to /.well-known/operational-state
 */
export async function discover(
    baseUrl: string,
    options?: DiscoverOptions,
): Promise<DiscoverResult> {
    // ── 1. Link header discovery ───────────────────────────────────────
    if ( !options?.skipLinkHeaders ) {
        try {
            const response = await fetch( baseUrl, {
                method: 'HEAD',
                headers: options?.headers,
            } );

            const linkHeader = response.headers.get( 'link' );
            if ( linkHeader ) {
                const links = parseLinkHeaders( linkHeader );
                if ( links.length > 0 ) {
                    return {
                        method: 'link-header',
                        links,
                        document: null,
                    };
                }
            }
        } catch {
            // Link header discovery failed, fall through to well-known
        }
    }

    // ── 2. Well-known path fallback ────────────────────────────────────
    if ( !options?.skipWellKnown ) {
        const doc = await fetchDiscoveryDocument( baseUrl );
        if ( doc ) {
            return {
                method: 'well-known',
                links: [],
                document: doc,
            };
        }
    }

    // ── No discovery available ─────────────────────────────────────────
    return {
        method: 'none',
        links: [],
        document: null,
    };
}
