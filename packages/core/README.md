# @open-operational-state/core

Core model logic for [Open Operational State](https://github.com/open-operational-state). Depends only on `@open-operational-state/types`.

## Installation

```bash
bun add @open-operational-state/core
```

## API

### `normalizeSnapshot( raw )`

Coerce a raw JSON object into a typed `Snapshot` with spec defaults applied.

```js
import { normalizeSnapshot } from '@open-operational-state/core';

const snapshot = normalizeSnapshot({
    condition: 'operational',
    profiles: ['health'],
    subject: { id: 'my-service' },
});
```

### `validateSnapshot( snapshot )`

Validate a `Snapshot` against required fields, vocabulary rules, and profile constraints. Returns `{ valid, errors, warnings }`.

```js
import { validateSnapshot } from '@open-operational-state/core';

const result = validateSnapshot( snapshot );
if ( !result.valid ) {
    console.error( result.errors );
}
```

### `worstOf( conditions )`

Return the worst (highest severity) condition from an array, using the orderable severity ranking.

```js
import { worstOf } from '@open-operational-state/core';

worstOf([ 'operational', 'degraded', 'down' ]); // 'down'
```

### `deriveParentConditionFromChecks( checks )`

Derive a parent condition from flat check entries using worst-of aggregation.

### `deriveParentConditionFromComponents( components )`

Derive a parent condition from nested component entries using worst-of aggregation.

## Dependencies

- `@open-operational-state/types`
