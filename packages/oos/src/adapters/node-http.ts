/**
 * Plain node:http Adapter
 *
 * Adapts an OosHandler to a node:http request handler.
 */

import type { OosHandler } from '../serve.js';

interface IncomingMessage {
    headers: Record<string, string | string[] | undefined>;
    url?: string;
}

interface ServerResponse {
    writeHead( statusCode: number, headers?: Record<string, string> ): void;
    end( data: string ): void;
}

interface NodeHttpAdapterOptions {
    /** Only handle requests matching this path.  Other requests pass through. */
    path?: string;
}

/**
 * Wraps an OosHandler as a plain node:http request handler.
 *
 * ```ts
 * http.createServer( nodeHttpAdapter( handler, { path: '/health' } ) );
 * ```
 */
export function nodeHttpAdapter(
    handler: OosHandler,
    options?: NodeHttpAdapterOptions,
): ( req: IncomingMessage, res: ServerResponse ) => void {
    const targetPath = options?.path;

    return ( req, res ) => {
        // Path filtering
        if ( targetPath && req.url !== targetPath ) {
            res.writeHead( 404, { 'Content-Type': 'text/plain' } );
            res.end( 'Not Found' );
            return;
        }

        // Map node:http headers → OosRequest
        const headers: Record<string, string | undefined> = {};
        for ( const [ key, value ] of Object.entries( req.headers ) ) {
            headers[key] = Array.isArray( value ) ? value[0] : value;
        }

        handler( { headers, url: req.url } )
            .then( ( result ) => {
                res.writeHead( result.status, result.headers );
                res.end( JSON.stringify( result.body ) );
            } )
            .catch( () => {
                // Never leak internal errors — controlled unknown response
                res.writeHead( 503, { 'Content-Type': 'application/health+json' } );
                res.end( JSON.stringify( { condition: 'unknown' } ) );
            } );
    };
}
