# @open-operational-state/emitter

Serialization emitters for [Open Operational State](https://github.com/open-operational-state). Convert core model `Snapshot` objects to spec-conformant wire formats.

## Installation

```bash
bun add @open-operational-state/emitter
```

## API

### `emitHealthResponse( snapshot )`

Convert a `Snapshot` to an `application/health+json` payload.

```js
import { emitHealthResponse } from '@open-operational-state/emitter';

const payload = emitHealthResponse( snapshot );
// Serve as: Content-Type: application/health+json
```

### `emitServiceStatus( snapshot )`

Convert a `Snapshot` to an `application/status+json` payload.

```js
import { emitServiceStatus } from '@open-operational-state/emitter';

const payload = emitServiceStatus( snapshot );
// Serve as: Content-Type: application/status+json
```

### `suggestHttpStatus( condition )`

Get the recommended HTTP status code for a condition value.

```js
import { suggestHttpStatus } from '@open-operational-state/emitter';

suggestHttpStatus( 'operational' ); // 200
suggestHttpStatus( 'degraded' );    // 200
suggestHttpStatus( 'down' );        // 503
suggestHttpStatus( 'maintenance' ); // 503
```

### `suggestHeaders( snapshot, serialization )`

Get recommended HTTP headers for a response.

```js
import { suggestHeaders } from '@open-operational-state/emitter';

const headers = suggestHeaders( snapshot, 'application/health+json' );
// { 'Content-Type': 'application/health+json', 'Cache-Control': 'no-cache, ...' }
```

### Round-Trip Guarantee

The emitter maintains the round-trip invariant:

```
parse → normalize → emit → parse → normalize
```

No semantic drift, no loss of required data, no illegal state introduced. This is enforced by golden round-trip tests.

## Dependencies

- `@open-operational-state/types`
- `@open-operational-state/core`
