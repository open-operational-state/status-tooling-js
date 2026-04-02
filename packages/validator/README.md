# @open-operational-state/validator

Conformance validation and CLI for [Open Operational State](https://github.com/open-operational-state).

## Installation

```bash
bun add @open-operational-state/validator
```

## CLI

The `oos` CLI is included in this package.

### Commands

```bash
# Validate a JSON file against conformance levels
oos validate <file>

# Fetch a URL, auto-detect format, parse to core model
oos probe <url>

# Run all conformance fixtures in a directory
oos fixtures <dir>

# Parse a JSON file, pretty-print core model
oos inspect <file>
```

### Options

```bash
--format=json|table    Output format (default: json)
--help                 Show help
```

### Examples

```bash
# Validate a health response
oos validate response.json

# Probe a live endpoint
oos probe https://api.example.com/health

# Run conformance test suite
oos fixtures ../status-conformance/fixtures/core --format=table
#   ✓ /positive-minimal-snapshot.json
#   ✓ /negative-missing-condition.json
#   ✓ /negative-invalid-condition.json
#   3 passed, 0 failed
```

## Programmatic API

### `checkConformanceLevel( snapshot )`

Assess which conformance tier a `Snapshot` satisfies.

```js
import { checkConformanceLevel } from '@open-operational-state/validator';

const result = checkConformanceLevel( snapshot );
// { level: 'standard', basic: true, standard: true, extended: false }
```

### `loadFixture( path )` / `runFixture( fixture )`

Load and execute conformance fixtures.

```js
import { loadFixture, runFixture } from '@open-operational-state/validator';

const fixture = loadFixture( './fixtures/core/positive-minimal-snapshot.json' );
const result = runFixture( fixture );
// { passed: true, diagnostics: [] }
```

### `runFixtureDir( dirPath )`

Recursively find and execute all fixtures in a directory.

## Dependencies

- `@open-operational-state/types`
- `@open-operational-state/core`
- `@open-operational-state/parser`
