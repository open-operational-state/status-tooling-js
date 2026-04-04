#!/usr/bin/env node

/**
 * OOS CLI entrypoint.
 *
 * This is the executable that `npx @open-operational-state/oos` resolves to.
 * All CLI implementation logic lives in @open-operational-state/validator —
 * this file is a thin delegation layer.
 */

import { runCli } from '@open-operational-state/validator';

runCli().catch( ( err: unknown ) => {
    console.error( err );
    process.exit( 1 );
} );
