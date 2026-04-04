# @open-operational-state/oos

The developer-facing package for [Open Operational State](https://github.com/open-operational-state). Install this one package to get the CLI and the programmatic API.

[![npm](https://img.shields.io/npm/v/@open-operational-state/oos)](https://www.npmjs.com/package/@open-operational-state/oos)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../../LICENSE)

## Install

```bash
npm install @open-operational-state/oos
```

## CLI

After local install, the `oos` binary is available:

```bash
npx oos probe https://api.example.com/health
npx oos validate snapshot.json
npx oos fixtures ./conformance-fixtures --format=table
npx oos inspect snapshot.json
```

Or run without installing:

```bash
npx @open-operational-state/oos probe https://api.example.com/health
```

Or install globally:

```bash
npm i -g @open-operational-state/oos
oos probe https://api.example.com/health
```

### Commands

| Command | Description |
|---|---|
| `probe <url>` | Fetch a URL, auto-detect format, parse to core model |
| `validate <file>` | Validate a JSON file against conformance levels |
| `fixtures <dir>` | Run all conformance fixtures in a directory |
| `inspect <file>` | Parse a JSON file, pretty-print core model |

### Options

| Option | Description |
|---|---|
| `--format=json\|table` | Output format (default: json) |
| `--help` | Show help |

## Programmatic API

```js
import { probe } from '@open-operational-state/oos';

const result = await probe( 'https://api.example.com/health' );

console.log( result.snapshot.condition );  // 'operational'
console.log( result.httpStatus );          // 200
console.log( result.validation.valid );    // true
```

## What this package includes

`@open-operational-state/oos` is an umbrella package that bundles:

- **`probe`** — programmatic endpoint probing
- **`validator`** — conformance validation, fixture runner, CLI implementation

You don't need to install the lower-level packages separately.

## License

Licensed under [Apache 2.0](../../LICENSE).
