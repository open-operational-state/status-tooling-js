/**
 * @open-operational-state/validator
 *
 * Conformance validation, fixture execution, and conformance level checking.
 */

export { loadFixture, runFixture, runFixtureDir } from './fixture-runner.js';
export type { Fixture, FixtureResult, FixtureMetadata, FixtureExpected } from './fixture-runner.js';

export { checkConformanceLevel } from './conformance.js';

export { runCli } from './cli.js';
