# @open-operational-state/types

Canonical TypeScript interfaces for the [Open Operational State](https://github.com/open-operational-state) core model.

This package is the shared contract surface for all tooling packages. It contains zero runtime logic — only type declarations, constants, and type guards.

## Installation

```bash
bun add @open-operational-state/types
```

## API

### Core Interfaces

| Interface | Description |
|---|---|
| `Snapshot` | Root operational-state document |
| `Subject` | Identity and metadata for the observed service |
| `Timing` | Observation, reporting, and state-change timestamps |
| `Evidence` | Supporting data for a condition assessment |
| `Scope` | Geographic or environmental scope |
| `CheckEntry` | Flat check (used in `health-response` format) |
| `ComponentEntry` | Nested component (used in `service-status` format) |
| `DependencyEntry` | Nested dependency (used in `service-status` format) |
| `DiscoveryDocument` | `/.well-known/operational-state` document |
| `ResourceEntry` | Single resource in a discovery document |
| `ValidationResult` | Validation output with errors and warnings |
| `ConformanceResult` | Conformance level assessment |

### Condition Vocabulary

```js
import { LIVENESS_CONDITIONS, READINESS_CONDITIONS, HEALTH_CONDITIONS } from '@open-operational-state/types';
import { isConditionValue, isExtensionValue, severityOf } from '@open-operational-state/types';

isConditionValue( 'operational' );  // true
isConditionValue( 'x-acme-drain' ); // true (extension values accepted)
isExtensionValue( 'x-acme-drain' ); // true

severityOf( 'down' );         // 4 (highest)
severityOf( 'operational' );  // 0 (lowest)
```

### Profile Helpers

```js
import { PROFILE_REQUIREMENTS, isProfileId, profileHierarchy } from '@open-operational-state/types';

isProfileId( 'health' );  // true
isProfileId( 'custom' );  // false

profileHierarchy( 'status' );  // ['liveness', 'readiness', 'health', 'status']
```

## Dependencies

None. This package has zero external dependencies.
