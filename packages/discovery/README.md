# @open-operational-state/discovery

Discovery client for [Open Operational State](https://github.com/open-operational-state). Find and validate operational-state endpoints using HTTP Link headers and well-known paths.

## Installation

```bash
bun add @open-operational-state/discovery
```

## API

### `discover( baseUrl, options? )`

Discover operational-state resources following the priority hierarchy:

1. Link-based discovery (HTTP `Link` headers with `rel="operational-state"`)
2. Well-known path (`/.well-known/operational-state`)

```js
import { discover } from '@open-operational-state/discovery';

const result = await discover( 'https://api.example.com' );

switch ( result.method ) {
    case 'link-header':
        console.log( 'Found via Link header:', result.links );
        break;
    case 'well-known':
        console.log( 'Found via well-known:', result.document );
        break;
    case 'none':
        console.log( 'No operational-state resources found' );
        break;
}
```

### `parseLinkHeaders( headers )`

Parse HTTP `Link` headers and extract `rel="operational-state"` entries.

```js
import { parseLinkHeaders } from '@open-operational-state/discovery';

const links = parseLinkHeaders(
    '<https://api.example.com/health>; rel="operational-state"; profile="health"'
);
// [{ href: 'https://api.example.com/health', profile: 'health' }]
```

### `fetchDiscoveryDocument( baseUrl )`

Fetch and validate the discovery document from `/.well-known/operational-state`.

### `validateDiscoveryDocument( doc )`

Validate the structure of a discovery document.

```js
import { validateDiscoveryDocument } from '@open-operational-state/discovery';

const result = validateDiscoveryDocument( doc );
// { valid: true, errors: [], warnings: [] }
```

## Dependencies

- `@open-operational-state/types`
