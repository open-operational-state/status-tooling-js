/**
 * Hono Adapter
 *
 * Adapts an OosHandler to a Hono route handler.
 */

import type { OosHandler } from '../serve.js';

interface HonoContext {
    req: {
        header( name: string ): string | undefined;
        url: string;
        raw: Request;
    };
    json( body: unknown, status?: number, headers?: Record<string, string> ): Response;
}

/**
 * Wraps an OosHandler as a Hono route handler.
 *
 * ```ts
 * app.get( '/health', honoAdapter( handler ) );
 * ```
 */
export function honoAdapter(
    handler: OosHandler,
): ( c: HonoContext ) => Promise<Response> {
    return async ( c ) => {
        // Hono provides a Web Standard Request — extract headers
        const headers: Record<string, string | undefined> = {};
        c.req.raw.headers.forEach( ( value, key ) => {
            headers[key] = value;
        } );

        const result = await handler( { headers, url: c.req.url } );

        return c.json( result.body, result.status, result.headers );
    };
}
