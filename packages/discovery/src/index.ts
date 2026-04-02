/**
 * @open-operational-state/discovery
 *
 * Discovery client — well-known paths, Link header parsing,
 * discovery document consumption.
 *
 * Depends on @open-operational-state/types.
 */

export { parseLinkHeaders } from './link-header.js';
export type { OperationalStateLink } from './link-header.js';

export { fetchDiscoveryDocument, validateDiscoveryDocument } from './well-known.js';

export { discover } from './discover.js';
export type { DiscoverOptions, DiscoverResult } from './discover.js';
