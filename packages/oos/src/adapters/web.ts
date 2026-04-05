/**
 * Web Standard Adapter
 *
 * Adapts an OosHandler to the Web Standard Request → Response API.
 * Covers: Next.js App Router, Bun.serve, Deno.serve,
 * Cloudflare Workers, Remix, SvelteKit, Astro, Elysia, h3 v2.
 */

import type { OosHandler } from '../serve.js';

interface WebAdapterOptions {
    /** Optional path filter — only handle requests matching this path. */
    path?: string;
}

/**
 * Wraps an OosHandler as a Web Standard fetch handler.
 *
 * ```ts
 * // Next.js App Router — app/health/route.ts
 * export const GET = webAdapter( handler );
 *
 * // Bun.serve
 * Bun.serve( { fetch: webAdapter( handler, { path: '/health' } ) } );
 * ```
 */
export function webAdapter(
    handler: OosHandler,
    options?: WebAdapterOptions,
): ( request: Request ) => Promise<Response> {
    const targetPath = options?.path;

    return async ( request: Request ): Promise<Response> => {
        // Path filtering (when used as a full server fetch handler)
        if ( targetPath ) {
            const url = new URL( request.url );
            if ( url.pathname !== targetPath ) {
                return new Response( 'Not Found', { status: 404 } );
            }
        }

        // Map Web Standard Request → OosRequest
        const headers: Record<string, string | undefined> = {};
        request.headers.forEach( ( value, key ) => {
            headers[key] = value;
        } );

        const result = await handler( { headers, url: request.url } );

        return new Response(
            JSON.stringify( result.body ),
            {
                status: result.status,
                headers: result.headers,
            },
        );
    };
}
