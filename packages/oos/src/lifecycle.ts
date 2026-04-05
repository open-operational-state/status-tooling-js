/**
 * Lifecycle Manager
 *
 * Tracks application lifecycle phases (initializing → ready → shutting down)
 * and exposes a condition provider that reflects the current phase.
 *
 * Handles SIGTERM/SIGINT for graceful shutdown — responds with
 * not-ready during drain so Kubernetes readiness probes fail and
 * the load balancer stops sending traffic.
 *
 * Design:
 *   - Phase transitions are explicit — no magic detection
 *   - Integrates with serve() via conditionProvider callback
 *   - Shutdown can run async cleanup (close DB, flush logs)
 *   - Safe to call markReady() multiple times (idempotent)
 */

import { Condition } from './constants.js';
import type { ConditionValue } from './constants.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LifecyclePhase = 'initializing' | 'ready' | 'shutting-down';

export interface LifecycleConfig {
    /**
     * Async cleanup function called during shutdown.
     * The lifecycle will wait for this to resolve before exiting.
     * Default: no-op.
     */
    onShutdown?: () => Promise<void> | void;

    /**
     * Delay in milliseconds between entering shutdown and calling
     * onShutdown.  This gives the load balancer time to stop sending
     * traffic after the readiness probe fails.
     * Default: 5000 (5 seconds).
     */
    drainDelayMs?: number;

    /**
     * Whether to register SIGTERM/SIGINT handlers automatically.
     * Set to false if you want to manage signals yourself.
     * Default: true.
     */
    handleSignals?: boolean;

    /**
     * Process exit code after shutdown completes.
     * Set to null to skip process.exit() (useful in tests).
     * Default: 0.
     */
    exitCode?: number | null;
}

export interface Lifecycle {
    /** Current lifecycle phase. */
    readonly phase: LifecyclePhase;

    /**
     * Mark the service as ready.  Should be called after startup
     * tasks complete (DB connected, caches warm, etc.).
     */
    markReady(): void;

    /**
     * Initiate graceful shutdown.  Returns a promise that resolves
     * after the drain delay and onShutdown callback complete.
     */
    shutdown(): Promise<void>;

    /**
     * Condition provider for serve().
     * Returns the condition corresponding to the current phase.
     */
    conditionProvider(): string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_DRAIN_DELAY_MS = 5000;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a lifecycle manager.
 *
 * ```ts
 * const lifecycle = createLifecycle( {
 *     onShutdown: async () => {
 *         await db.close();
 *         await cache.close();
 *     },
 * } );
 *
 * // After startup tasks complete:
 * lifecycle.markReady();
 *
 * const handler = serve( {
 *     subject: { id: 'my-api' },
 *     condition: lifecycle.conditionProvider,
 * } );
 * ```
 */
export function createLifecycle( config?: LifecycleConfig ): Lifecycle {
    let phase: LifecyclePhase = 'initializing';
    let shutdownPromise: Promise<void> | null = null;

    const onShutdown = config?.onShutdown;
    const drainDelayMs = config?.drainDelayMs ?? DEFAULT_DRAIN_DELAY_MS;
    const exitCode = config?.exitCode !== undefined ? config.exitCode : 0;
    const handleSignals = config?.handleSignals ?? true;

    function markReady(): void {
        if ( phase === 'initializing' ) {
            phase = 'ready';
        }
    }

    async function shutdown(): Promise<void> {
        // Idempotent — only run once
        if ( shutdownPromise ) {
            return shutdownPromise;
        }

        phase = 'shutting-down';

        shutdownPromise = ( async () => {
            // Drain delay — let LB stop sending traffic
            if ( drainDelayMs > 0 ) {
                await new Promise<void>( ( resolve ) => setTimeout( resolve, drainDelayMs ) );
            }

            // Run cleanup
            if ( onShutdown ) {
                try {
                    await onShutdown();
                } catch ( err ) {
                    console.error( '[oos] Shutdown cleanup error:', err );
                }
            }

            // Exit process
            if ( exitCode !== null && typeof process !== 'undefined' ) {
                process.exit( exitCode );
            }
        } )();

        return shutdownPromise;
    }

    function conditionProvider(): string {
        switch ( phase ) {
            case 'initializing':
                return Condition.INITIALIZING;
            case 'ready':
                return Condition.OPERATIONAL;
            case 'shutting-down':
                return Condition.NOT_READY;
        }
    }

    // Register signal handlers
    if ( handleSignals && typeof process !== 'undefined' ) {
        const handler = () => { shutdown(); };
        process.once( 'SIGTERM', handler );
        process.once( 'SIGINT', handler );
    }

    return {
        get phase() { return phase; },
        markReady,
        shutdown,
        conditionProvider,
    };
}
