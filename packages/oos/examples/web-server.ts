/**
 * Bun Server Example
 *
 * Demonstrates OOS serve() with Bun.serve using the Web Standard adapter.
 *
 * Run:   bun run examples/web-server.ts
 * Probe: oos probe http://localhost:3000/health
 *
 * The same webAdapter() works with Deno.serve and Cloudflare Workers —
 * replace the Bun.serve call with the equivalent for your runtime.
 */

import { serve, Condition, Exposure, Profile } from '../src/index.js';
import { webAdapter } from '../src/adapters/web.js';

const handler = serve( {
    subject: { id: 'example-bun-api', description: 'Bun Server Example' },
    condition: Condition.OPERATIONAL,
    exposure: Exposure.CONDITION_METADATA,
    profiles: [ Profile.HEALTH ],
} );

const fetch = webAdapter( handler, { path: '/health' } );

const server = Bun.serve( {
    port: 3000,
    fetch,
} );

console.log( `OOS health endpoint: http://localhost:${server.port}/health` );
console.log( 'Probe it:  oos probe http://localhost:3000/health' );
