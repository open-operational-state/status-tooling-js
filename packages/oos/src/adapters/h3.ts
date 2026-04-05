/**
 * h3 Adapter
 *
 * Adapts an OosHandler to an h3 v1 event handler (Nuxt 3/4, Nitro v2).
 */

import type { OosHandler } from '../serve.js';

interface H3Event {
    node: {
        req: {
            headers: Record<string, string | string[] | undefined>;
            url?: string;
        };
        res: {
            statusCode: number;
            setHeader( name: string, value: string ): void;
            end( body: string ): void;
        };
    };
}

/**
 * Wraps an OosHandler as an h3 event handler.
 *
 * ```ts
 * // server/routes/health.ts (Nuxt)
 * export default h3Adapter( handler );
 * ```
 */
export function h3Adapter(
    handler: OosHandler,
): ( event: H3Event ) => Promise<unknown> {
    return async ( event ) => {
        const rawHeaders = event.node.req.headers;
        const headers: Record<string, string | undefined> = {};
        for ( const [ key, value ] of Object.entries( rawHeaders ) ) {
            headers[key] = Array.isArray( value ) ? value[0] : value;
        }

        try {
            const result = await handler( {
                headers,
                url: event.node.req.url,
            } );

            event.node.res.statusCode = result.status;
            for ( const [ key, value ] of Object.entries( result.headers ) ) {
                event.node.res.setHeader( key, value );
            }

            // Return JSON body — h3 auto-serializes objects
            return result.body;
        } catch {
            event.node.res.statusCode = 200;
            event.node.res.setHeader( 'Content-Type', 'application/health+json' );
            event.node.res.setHeader( 'Cache-Control', 'no-cache, no-store, must-revalidate' );

            return { condition: 'unknown' };
        }
    };
}
