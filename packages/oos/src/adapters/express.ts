/**
 * Express Adapter
 *
 * Adapts an OosHandler to Express middleware signature.
 */

import type { OosHandler } from '../serve.js';

interface ExpressRequest {
    headers: Record<string, string | string[] | undefined>;
    url?: string;
}

interface ExpressResponse {
    status( code: number ): ExpressResponse;
    set( headers: Record<string, string> ): ExpressResponse;
    json( body: unknown ): void;
}

/**
 * Wraps an OosHandler as Express middleware.
 *
 * ```ts
 * app.get( '/health', expressAdapter( handler ) );
 * ```
 */
export function expressAdapter(
    handler: OosHandler,
): ( req: ExpressRequest, res: ExpressResponse ) => Promise<void> {
    return async ( req, res ) => {
        const headers: Record<string, string | undefined> = {};
        for ( const [ key, value ] of Object.entries( req.headers ) ) {
            headers[key] = Array.isArray( value ) ? value[0] : value;
        }

        const result = await handler( { headers, url: req.url } );

        res.status( result.status ).set( result.headers ).json( result.body );
    };
}
