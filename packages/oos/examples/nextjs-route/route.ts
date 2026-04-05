/**
 * Next.js App Router Example
 *
 * Place this file at: app/health/route.ts
 *
 * Access: GET /health
 * Probe:  oos probe http://localhost:3000/health
 */

import { serve, Condition, Exposure, Profile } from '@open-operational-state/oos';
import { webAdapter } from '@open-operational-state/oos/web';

const handler = serve( {
    subject: { id: 'my-nextjs-app', description: 'My Next.js Application' },
    condition: Condition.OPERATIONAL,
    exposure: Exposure.CONDITION_METADATA,
    profiles: [ Profile.HEALTH ],
} );

export const GET = webAdapter( handler );
