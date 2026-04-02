# @open-operational-state/parser

Response parsers and format adapters for [Open Operational State](https://github.com/open-operational-state). Auto-detects response formats and converts them to the canonical core model.

## Installation

```bash
bun add @open-operational-state/parser
```

## API

### `parse( input )`

Auto-detect format and parse an HTTP response into a `Snapshot`.

```js
import { parse } from '@open-operational-state/parser';

const snapshot = parse({
    contentType: 'application/json',
    body: { status: 'pass', serviceId: 'my-api' },
    url: 'https://api.example.com/health',
    httpStatus: 200,
    headers: { 'content-type': 'application/json' },
});
```

### `detectFormat( contentType, body )`

Identify which adapter to apply based on content-type and structural markers.

```js
import { detectFormat } from '@open-operational-state/parser';

detectFormat( 'application/health+json', body ); // 'native-health-response'
detectFormat( 'application/status+json', body ); // 'native-service-status'
detectFormat( 'application/json', { status: 'pass' } ); // 'health-check-draft'
detectFormat( 'application/json', { status: 'UP', components: {} } ); // 'spring-boot'
detectFormat( 'text/plain', 'OK' ); // 'plain-http'
```

### Individual Adapters

| Adapter | Function | Input |
|---|---|---|
| **Plain HTTP** | `parsePlainHttp( input )` | HTTP status code + connection result |
| **Health Check Draft** | `parseHealthCheckDraft( body, options? )` | [draft-inadarei](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check) response |
| **Spring Boot** | `parseSpringBoot( body, options? )` | Spring Boot Actuator `/actuator/health` response |
| **Native** | `parseHealthResponse( body )` | OOS `application/health+json` response |

### Format Detection Priority

1. Content-type header (`application/status+json`, `application/health+json`)
2. Structural markers (OOS native: `profiles` + `condition`)
3. Structural markers (Spring Boot: `status` ∈ {UP,DOWN,OUT_OF_SERVICE} + `components`)
4. Structural markers (draft-inadarei: `status` ∈ {pass,fail,warn})
5. Fallback to plain-http

## Dependencies

- `@open-operational-state/types`
- `@open-operational-state/core`
