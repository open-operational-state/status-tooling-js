/**
 * Express Server Example
 *
 * Demonstrates OOS serve() with a basic HTTP server.
 *
 * Run:   bun run examples/express-server.ts
 * Probe: oos probe http://localhost:3000/health
 */

import { serve, Condition, Exposure } from '../src/index.js';

// In a real Express app:
//   import express from 'express';
//   import { expressAdapter } from '@open-operational-state/oos/express';
//   const app = express();
//   app.get( '/health', expressAdapter( handler ) );

// This example uses node:http to avoid requiring express as a dependency.
import { createServer } from 'node:http';

const handler = serve( {
    subject: { id: 'example-express-api', description: 'Express Example' },
    condition: Condition.OPERATIONAL,
    exposure: Exposure.CONDITION_METADATA,
} );

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
