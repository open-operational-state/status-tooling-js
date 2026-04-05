/**
 * Web Standard Server Example (Bun / Deno / Next.js)
 *
 * Demonstrates OOS serve() with the Web Standard adapter.
 *
 * Run:   bun run examples/web-server.ts
 * Probe: oos probe http://localhost:3000/health
 */

import { serve, Condition, Exposure, Profile } from '../src/index.js';
import { webAdapter } from '../src/adapters/web.js';

const handler = serve( {
    subject: { id: 'example-web-api', description: 'Web Standard Example' },
    condition: Condition.OPERATIONAL,
    exposure: Exposure.CONDITION_METADATA,
    profiles: [ Profile.HEALTH ],
} );

const fetch = webAdapter( handler, { path: '/health' } );

// Works with Bun.serve, Deno.serve, or Cloudflare Workers
const server = Bun.serve( {
    port: 3000,
    fetch,
} );

console.log( `OOS health endpoint: http://localhost:${server.port}/health` );
console.log( 'Probe it:  oos probe http://localhost:3000/health' );
