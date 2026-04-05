/**
 * Koa2 Adapter
 *
 * Adapts an OosHandler to a Koa2 middleware.
 */

import type { OosHandler } from '../serve.js';

interface KoaContext {
    headers: Record<string, string | string[] | undefined>;
    url: string;
    status: number;
    set( headers: Record<string, string> ): void;
    body: unknown;
}

/**
 * Wraps an OosHandler as Koa2 middleware.
 *
 * ```ts
 * router.get( '/health', koaAdapter( handler ) );
 * ```
 */
export function koaAdapter(
    handler: OosHandler,
): ( ctx: KoaContext ) => Promise<void> {
    return async ( ctx ) => {
        const headers: Record<string, string | undefined> = {};
        for ( const [ key, value ] of Object.entries( ctx.headers ) ) {
            headers[key] = Array.isArray( value ) ? value[0] : value;
        }

        const result = await handler( { headers, url: ctx.url } );

        ctx.status = result.status;
        ctx.set( result.headers );
        ctx.body = result.body;
    };
}
