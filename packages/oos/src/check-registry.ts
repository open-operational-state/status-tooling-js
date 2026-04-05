/**
 * Check Registry
 *
 * Register named health checks that run in parallel with per-check
 * timeouts.  Integrates with serve() via the ConditionProvider
 * callback to produce dynamic conditions and populate checks/evidence.
 *
 * Design goals:
 *   - Zero-allocation on the happy path (pre-allocated result objects)
 *   - Parallel execution by default with configurable concurrency
 *   - Per-check timeouts prevent a single slow check from blocking
 *   - Failed/timed-out checks never crash the handler — they degrade
 *     to condition: unknown with evidence explaining the failure
 */

import type { Snapshot, CheckEntry, Timing, Evidence } from '@open-operational-state/types';
import { worstOf } from '@open-operational-state/core';
import { Condition, Role } from './constants.js';
import type { ConditionValue, RoleValue } from './constants.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result of a single health check execution. */
export interface CheckResult {
    /** The condition observed by this check. */
    condition: ConditionValue | string;
    /** Optional evidence from the check. */
    evidence?: Evidence;
}

/** Configuration for a single registered check. */
export interface CheckConfig {
    /** Human-readable name (used as the key in snapshot.checks). */
    name: string;
    /** Role: component or dependency. */
    role: RoleValue | string;
    /** The check function — must resolve within the timeout. */
    check: () => CheckResult | Promise<CheckResult>;
    /** Per-check timeout in milliseconds. Default: 5000. */
    timeoutMs?: number;
    /**
     * Criticality — controls whether this check affects the parent condition.
     * 'critical': failure degrades parent to worst-of (default)
     * 'informational': reported but does not affect parent condition
     */
    criticality?: 'critical' | 'informational';
}

/** The check registry instance. */
export interface CheckRegistry {
    /**
     * Run all registered checks in parallel.
     * Returns the aggregated condition and the checks map.
     */
    runAll(): Promise<CheckRegistryResult>;

    /**
     * Use as a ConditionProvider callback for serve().
     * Returns the aggregated condition string.
     */
    conditionProvider(): Promise<string>;

    /**
     * Snapshot enricher — call after runAll() to merge check results
     * into a Snapshot.  This is used by serve() when checks are
     * configured (Phase B integration).
     */
    enrichSnapshot( snapshot: Snapshot, result: CheckRegistryResult ): Snapshot;
}

/** Result from running all checks. */
export interface CheckRegistryResult {
    /** Aggregated condition (worst-of critical checks). */
    condition: string;
    /** Individual check results, keyed by name. */
    checks: Record<string, CheckEntry>;
    /** Timestamp when this run started. */
    observedAt: string;
    /** Total execution duration in milliseconds. */
    durationMs: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a check registry for dynamic health check execution.
 *
 * ```ts
 * const registry = createCheckRegistry();
 *
 * registry.register( {
 *     name: 'database',
 *     role: Role.DEPENDENCY,
 *     check: async () => {
 *         await db.ping();
 *         return { condition: Condition.OPERATIONAL };
 *     },
 * } );
 *
 * const handler = serve( {
 *     subject: { id: 'my-api' },
 *     condition: registry.conditionProvider,
 *     checks: registry,
 * } );
 * ```
 */
export function createCheckRegistry(): CheckRegistry & { register: ( config: CheckConfig ) => void } {
    const registeredChecks: CheckConfig[] = [];

    function register( config: CheckConfig ): void {
        if ( !config.name ) {
            throw new Error( '[oos] Check name is required.' );
        }
        if ( !config.check ) {
            throw new Error( `[oos] Check "${config.name}" requires a check function.` );
        }
        registeredChecks.push( config );
    }

    async function runAll(): Promise<CheckRegistryResult> {
        const observedAt = new Date().toISOString();
        const startTime = performance.now();

        const entries: Record<string, CheckEntry> = {};
        const criticalConditions: string[] = [];

        // Run all checks in parallel with individual timeouts
        const results = await Promise.allSettled(
            registeredChecks.map( async ( cfg ) => {
                const timeout = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
                const result = await runWithTimeout( cfg.check, timeout, cfg.name );
                return { cfg, result };
            } ),
        );

        for ( const settled of results ) {
            if ( settled.status === 'fulfilled' ) {
                const { cfg, result } = settled.value;
                const now = new Date().toISOString();

                entries[cfg.name] = {
                    condition: result.condition,
                    role: cfg.role as 'component' | 'dependency',
                    timing: { observed: now },
                    ...( result.evidence ? { evidence: result.evidence } : {} ),
                };

                // Only critical checks affect the parent condition
                if ( cfg.criticality !== 'informational' ) {
                    criticalConditions.push( result.condition );
                }
            } else {
                // Promise.allSettled rejection — should not happen since
                // runWithTimeout catches, but defensive
                const cfg = registeredChecks[results.indexOf( settled )];
                const name = cfg?.name ?? 'unknown';
                entries[name] = {
                    condition: Condition.UNKNOWN,
                    role: ( cfg?.role ?? Role.COMPONENT ) as 'component' | 'dependency',
                    evidence: {
                        type: 'error',
                        detail: 'Check execution failed unexpectedly',
                    },
                };
                criticalConditions.push( Condition.UNKNOWN );
            }
        }

        // If no checks registered or all informational, default to operational
        const condition = criticalConditions.length > 0
            ? worstOf( criticalConditions )
            : Condition.OPERATIONAL;

        const durationMs = Math.round( performance.now() - startTime );

        return { condition, checks: entries, observedAt, durationMs };
    }

    async function conditionProvider(): Promise<string> {
        const result = await runAll();
        return result.condition;
    }

    function enrichSnapshot( snapshot: Snapshot, result: CheckRegistryResult ): Snapshot {
        return {
            ...snapshot,
            condition: result.condition,
            checks: result.checks,
            timing: {
                ...snapshot.timing,
                observed: result.observedAt,
            },
        };
    }

    return {
        register,
        runAll,
        conditionProvider,
        enrichSnapshot,
    };
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

/**
 * Run a check function with a timeout.  If the check exceeds the
 * timeout or throws, returns a controlled unknown result.
 */
async function runWithTimeout(
    checkFn: () => CheckResult | Promise<CheckResult>,
    timeoutMs: number,
    name: string,
): Promise<CheckResult> {
    return new Promise<CheckResult>( ( resolve ) => {
        let settled = false;

        const timer = setTimeout( () => {
            if ( !settled ) {
                settled = true;
                resolve( {
                    condition: Condition.UNKNOWN,
                    evidence: {
                        type: 'timeout',
                        detail: `Check "${name}" timed out after ${timeoutMs}ms`,
                    },
                } );
            }
        }, timeoutMs );

        try {
            const result = checkFn();

            if ( result && typeof ( result as Promise<CheckResult> ).then === 'function' ) {
                // Async check
                ( result as Promise<CheckResult> )
                    .then( ( r ) => {
                        if ( !settled ) {
                            settled = true;
                            clearTimeout( timer );
                            resolve( r );
                        }
                    } )
                    .catch( ( err ) => {
                        if ( !settled ) {
                            settled = true;
                            clearTimeout( timer );
                            resolve( {
                                condition: Condition.UNKNOWN,
                                evidence: {
                                    type: 'error',
                                    detail: `Check "${name}" threw: ${err instanceof Error ? err.message : String( err )}`,
                                },
                            } );
                        }
                    } );
            } else {
                // Sync check
                if ( !settled ) {
                    settled = true;
                    clearTimeout( timer );
                    resolve( result as CheckResult );
                }
            }
        } catch ( err ) {
            // Sync throw
            if ( !settled ) {
                settled = true;
                clearTimeout( timer );
                resolve( {
                    condition: Condition.UNKNOWN,
                    evidence: {
                        type: 'error',
                        detail: `Check "${name}" threw: ${err instanceof Error ? err.message : String( err )}`,
                    },
                } );
            }
        }
    } );
}
