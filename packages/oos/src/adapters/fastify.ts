/**
 * Fastify Adapter
 *
 * Adapts an OosHandler to a Fastify route handler.
 */

import type { OosHandler } from '../serve.js';

interface FastifyRequest {
    headers: Record<string, string | string[] | undefined>;
    url?: string;
}

interface FastifyReply {
    status( code: number ): FastifyReply;
    headers( headers: Record<string, string> ): FastifyReply;
    send( body: unknown ): FastifyReply;
}

/**
 * Wraps an OosHandler as a Fastify route handler.
 *
 * ```ts
 * fastify.get( '/health', fastifyAdapter( handler ) );
 * ```
 */
export function fastifyAdapter(
    handler: OosHandler,
): ( request: FastifyRequest, reply: FastifyReply ) => Promise<void> {
    return async ( request, reply ) => {
        const headers: Record<string, string | undefined> = {};
        for ( const [ key, value ] of Object.entries( request.headers ) ) {
            headers[key] = Array.isArray( value ) ? value[0] : value;
        }

        try {
            const result = await handler( { headers, url: request.url } );

            reply.status( result.status ).headers( result.headers ).send( result.body );
        } catch {
            reply
                .status( 200 )
                .headers( {
                    'Content-Type': 'application/health+json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                } )
                .send( { condition: 'unknown' } );
        }
    };
}
