/**
 * @open-operational-state/emitter
 *
 * Serialization emitters — convert core model Snapshots to wire formats.
 *
 * Depends on @open-operational-state/types and @open-operational-state/core.
 */

export { emitHealthResponse } from './health-response.js';
export type { HealthResponsePayload, EmitHealthResponseOptions } from './health-response.js';

export { emitServiceStatus } from './service-status.js';
export type { ServiceStatusPayload } from './service-status.js';

export { suggestHttpStatus, suggestHeaders } from './http.js';
