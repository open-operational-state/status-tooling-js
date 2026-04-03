# Examples

Real-world usage patterns for `@open-operational-state` packages.

## Express Health Endpoint

```js
import express from 'express';
import { normalizeSnapshot } from '@open-operational-state/core';
import { emitHealthResponse, suggestHttpStatus, suggestHeaders } from '@open-operational-state/emitter';

const app = express();

app.get( '/health', ( req, res ) => {
    const snapshot = normalizeSnapshot( {
        condition: checkHealth(),
        profiles: [ 'health' ],
        subject: { id: 'my-api', description: 'My API Service' },
        timing: { observed: new Date().toISOString() },
        provenance: 'self-reported',
    } );

    const payload = emitHealthResponse( snapshot );
    const status = suggestHttpStatus( snapshot );
    const headers = suggestHeaders( snapshot );

    res.status( status ).set( headers ).json( payload );
} );

function checkHealth() {
    // Your actual health logic here
    return 'operational';
}
```

## Hono Middleware

```js
import { Hono } from 'hono';
import { normalizeSnapshot } from '@open-operational-state/core';
import { emitHealthResponse, suggestHttpStatus } from '@open-operational-state/emitter';

const app = new Hono();

app.get( '/health', ( c ) => {
    const snapshot = normalizeSnapshot( {
        condition: 'operational',
        profiles: [ 'health' ],
        subject: { id: 'hono-api' },
        timing: { observed: new Date().toISOString() },
        provenance: 'self-reported',
    } );

    return c.json( emitHealthResponse( snapshot ), suggestHttpStatus( snapshot ), {
        'Content-Type': 'application/health+json',
    } );
} );
```

## CLI: Validate a Running Service

```bash
# Install the CLI
npm install -g @open-operational-state/validator

# Check a health endpoint
curl -s https://example.com/health | oos validate --profile health

# Check conformance level
curl -s https://example.com/health | oos conformance
```

## Parse Any Health Format

```js
import { safeParse } from '@open-operational-state/parser';

// Automatically detects the format (health+json, Spring Boot, plain HTTP, etc.)
const result = safeParse( {
    contentType: 'application/json',
    body: responseBody,
    url: 'https://example.com/actuator/health',
} );

if ( result.ok ) {
    console.log( result.snapshot.condition );  // 'operational' | 'degraded' | 'down' | ...
    console.log( result.snapshot.subject.id ); // 'example.com'
} else {
    console.error( result.errors );
}
```

## Discover Operational State Resources

```js
import { discoverResources } from '@open-operational-state/discovery';

const resources = await discoverResources( 'https://example.com', {
    fetch: globalThis.fetch,
} );

// resources.health  → 'https://example.com/health'
// resources.status  → 'https://example.com/.well-known/operational-state'
```

## Aggregate Component Health

```js
import { normalizeSnapshot } from '@open-operational-state/core';
import { worstOf } from '@open-operational-state/core';

const components = [
    { id: 'api', condition: 'operational' },
    { id: 'cache', condition: 'degraded' },
    { id: 'database', condition: 'operational' },
];

// Derive overall condition from component conditions
const overall = worstOf( components.map( c => c.condition ) );
// → 'degraded'

const snapshot = normalizeSnapshot( {
    condition: overall,
    profiles: [ 'health' ],
    subject: { id: 'platform' },
    timing: { observed: new Date().toISOString() },
    components,
} );
```
