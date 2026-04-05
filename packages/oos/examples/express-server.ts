/**
 * Express Server Example
 *
 * Demonstrates OOS serve() with Express.
 *
 * Run:   bun run examples/express-server.ts
 * Probe: oos probe http://localhost:3000/health
 */

import { serve, Condition, Exposure } from '../src/index.js';
import { expressAdapter } from '../src/adapters/express.js';

// In a real project: import express from 'express';
// For this example, we use node:http to avoid requiring express as a dep.
import { createServer } from 'node:http';

const handler = serve( {
    subject: { id: 'example-express-api', description: 'Express Example' },
    condition: Condition.OPERATIONAL,
    exposure: Exposure.CONDITION_METADATA,
} );

// Express-style adapter — in a real app:
// app.get( '/health', expressAdapter( handler ) );

// Simulated Express-compatible handler via node:http
const server = createServer( async ( req, res ) => {
    if ( req.url === '/health' && req.method === 'GET' ) {
        const result = await handler( { headers: req.headers as Record<string, string> } );
        res.writeHead( result.status, result.headers );
        res.end( JSON.stringify( result.body, null, 2 ) );
    } else {
        res.writeHead( 404 );
        res.end( 'Not Found' );
    }
} );

server.listen( 3000, () => {
    console.log( 'OOS health endpoint: http://localhost:3000/health' );
    console.log( 'Probe it:  oos probe http://localhost:3000/health' );
} );
