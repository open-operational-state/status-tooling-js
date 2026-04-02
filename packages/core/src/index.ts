/**
 * @open-operational-state/core
 *
 * Core model logic: normalization, aggregation, and validation.
 *
 * Depends only on @open-operational-state/types.
 */

export { normalizeSnapshot } from './normalize.js';
export { worstOf, deriveParentConditionFromChecks, deriveParentConditionFromComponents } from './aggregate.js';
export { validateSnapshot } from './validate-model.js';
