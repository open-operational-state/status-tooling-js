/**
 * @open-operational-state/parser
 *
 * Response parsers and adapters for operational-state formats.
 *
 * Depends on @open-operational-state/types and @open-operational-state/core.
 */

export { parse, safeParse } from './parse.js';
export type { ParseInput } from './parse.js';

export { detectFormat } from './detect.js';
export type { AdapterType } from './detect.js';

export { parsePlainHttp } from './plain-http.js';
export type { PlainHttpInput } from './plain-http.js';

export { parseHealthCheckDraft } from './health-check-draft.js';
export type { HealthCheckDraftOptions } from './health-check-draft.js';

export { parseHealthResponse } from './health-response.js';

export { parseSpringBoot, isSpringBootFormat } from './spring-boot.js';
export type { SpringBootOptions } from './spring-boot.js';
