# @open-operational-state/probe

Probe any operational-state endpoint — fetch, detect, parse, and normalize in a single call.

[![npm](https://img.shields.io/npm/v/@open-operational-state/probe)](https://www.npmjs.com/package/@open-operational-state/probe)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../../LICENSE)

## Install

```bash
npm install @open-operational-state/probe
```

## Usage

```js
import { probe } from '@open-operational-state/probe';

const result = await probe( 'https://api.example.com/health' );

console.log( result.snapshot.condition );  // 'operational'
console.log( result.httpStatus );          // 200
console.log( result.validation.valid );    // true
```

### With discovery

```js
const result = await probe( 'https://api.example.com', {
    followDiscovery: true,
} );

// Follows Link headers or /.well-known/operational-state
// before probing the discovered endpoint
```

## API

### `probe( url, options? )`

Returns a `ProbeResult`:

| Field | Type | Description |
|---|---|---|
| `url` | `string` | The URL that was probed |
| `httpStatus` | `number \| null` | HTTP status, or null on connection failure |
| `contentType` | `string \| null` | Content-Type header |
| `connectionError` | `boolean` | True if the connection itself failed |
| `snapshot` | `Snapshot` | Parsed and normalized core model |
| `validation` | `ValidationResult` | Core model validation result |
| `discovery` | `DiscoverResult \| null` | Discovery result (if enabled) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `followDiscovery` | `boolean` | `false` | Follow OOS discovery before probing |
| `headers` | `Record<string, string>` | — | Custom request headers |
| `signal` | `AbortSignal` | — | Cancellation signal |

## Architecture

`probe` sits above the lower-level packages and orchestrates them:

```
probe → parser → core → types
      → discovery → types
```

This package is used by the `oos` CLI and is the recommended programmatic entrypoint for probing endpoints.

## License

Licensed under [Apache 2.0](../../LICENSE).
