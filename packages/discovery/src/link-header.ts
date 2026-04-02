/**
 * Link Header Parsing
 *
 * Parses HTTP Link headers per RFC 8288, extracting
 * rel="operational-state" entries with optional profile parameter.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OperationalStateLink {
    href: string;
    profile?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse HTTP Link headers and extract operational-state links.
 *
 * Input may be a single header string or an object with header key/values.
 * Multiple Link headers are joined by comma (per HTTP spec).
 */
export function parseLinkHeaders(
    headers: Record<string, string> | string,
): OperationalStateLink[] {
    let raw: string;

    if ( typeof headers === 'string' ) {
        raw = headers;
    } else {
        // Find the Link header (case-insensitive)
        raw = '';
        for ( const [ key, value ] of Object.entries( headers ) ) {
            if ( key.toLowerCase() === 'link' ) {
                raw = value;
                break;
            }
        }
    }

    if ( !raw ) { return []; }

    const links: OperationalStateLink[] = [];

    // Split by comma (respecting angle brackets)
    const entries = splitLinkEntries( raw );

    for ( const entry of entries ) {
        const parsed = parseLinkEntry( entry );
        if ( parsed && parsed.rel === 'operational-state' ) {
            const link: OperationalStateLink = { href: parsed.href };
            if ( parsed.profile ) { link.profile = parsed.profile; }
            links.push( link );
        }
    }

    return links;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

interface ParsedLink {
    href: string;
    rel: string;
    profile?: string;
}

/**
 * Split a Link header into individual entries, respecting angle brackets.
 */
function splitLinkEntries( raw: string ): string[] {
    const entries: string[] = [];
    let depth = 0;
    let start = 0;

    for ( let i = 0; i < raw.length; i++ ) {
        if ( raw[i] === '<' ) { depth++; }
        else if ( raw[i] === '>' ) { depth--; }
        else if ( raw[i] === ',' && depth === 0 ) {
            entries.push( raw.slice( start, i ).trim() );
            start = i + 1;
        }
    }

    const last = raw.slice( start ).trim();
    if ( last ) { entries.push( last ); }

    return entries;
}

/**
 * Parse a single Link entry: `<url>; rel="..."; profile="..."`
 */
function parseLinkEntry( entry: string ): ParsedLink | null {
    // Extract URL from angle brackets
    const hrefMatch = entry.match( /^<([^>]+)>(.*)$/ );
    if ( !hrefMatch ) { return null; }

    const href = hrefMatch[1];
    const params = hrefMatch[2];

    // Extract parameters
    let rel = '';
    let profile: string | undefined;

    const relMatch = params.match( /;\s*rel\s*=\s*"([^"]+)"/ );
    if ( relMatch ) { rel = relMatch[1]; }

    const profileMatch = params.match( /;\s*profile\s*=\s*"([^"]+)"/ );
    if ( profileMatch ) { profile = profileMatch[1]; }

    return { href, rel, profile };
}
