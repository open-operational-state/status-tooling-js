/**
 * createCheckRegistry() tests
 */

import { describe, expect, test } from 'bun:test';
import { createCheckRegistry } from '../check-registry.js';
import { Condition, Role } from '../constants.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe( 'registration', () => {
    test( 'throws if check name is missing', () => {
        const registry = createCheckRegistry();
        expect( () => registry.register( { name: '', role: Role.COMPONENT, check: () => ( { condition: Condition.OPERATIONAL } ) } ) )
            .toThrow( 'Check name is required' );
    } );

    test( 'throws if check function is missing', () => {
        const registry = createCheckRegistry();
        expect( () => registry.register( { name: 'db', role: Role.DEPENDENCY, check: undefined as any } ) )
            .toThrow( 'requires a check function' );
    } );

    test( 'accepts a valid check', () => {
        const registry = createCheckRegistry();
        expect( () => registry.register( {
            name: 'db',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.OPERATIONAL } ),
        } ) ).not.toThrow();
    } );
} );

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

describe( 'runAll', () => {
    test( 'returns operational when all checks pass', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'database',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.OPERATIONAL } ),
        } );
        registry.register( {
            name: 'cache',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.OPERATIONAL } ),
        } );

        const result = await registry.runAll();

        expect( result.condition ).toBe( 'operational' );
        expect( Object.keys( result.checks ) ).toEqual( [ 'database', 'cache' ] );
        expect( result.checks.database.condition ).toBe( 'operational' );
        expect( result.checks.cache.condition ).toBe( 'operational' );
        expect( result.durationMs ).toBeGreaterThanOrEqual( 0 );
        expect( result.observedAt ).toBeTruthy();
    } );

    test( 'returns worst condition across checks', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'api',
            role: Role.COMPONENT,
            check: () => ( { condition: Condition.OPERATIONAL } ),
        } );
        registry.register( {
            name: 'db',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.DEGRADED } ),
        } );

        const result = await registry.runAll();

        expect( result.condition ).toBe( 'degraded' );
    } );

    test( 'supports async checks', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'external-api',
            role: Role.DEPENDENCY,
            check: async () => {
                await new Promise( ( r ) => setTimeout( r, 10 ) );
                return { condition: Condition.OPERATIONAL };
            },
        } );

        const result = await registry.runAll();

        expect( result.condition ).toBe( 'operational' );
        expect( result.checks['external-api'].condition ).toBe( 'operational' );
    } );

    test( 'includes evidence when provided', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'db',
            role: Role.DEPENDENCY,
            check: () => ( {
                condition: Condition.OPERATIONAL,
                evidence: {
                    type: 'latency',
                    observedValue: 12,
                    observedUnit: 'ms',
                },
            } ),
        } );

        const result = await registry.runAll();

        expect( result.checks.db.evidence ).toEqual( {
            type: 'latency',
            observedValue: 12,
            observedUnit: 'ms',
        } );
    } );

    test( 'returns operational with no registered checks', async () => {
        const registry = createCheckRegistry();
        const result = await registry.runAll();

        expect( result.condition ).toBe( 'operational' );
        expect( Object.keys( result.checks ) ).toEqual( [] );
    } );
} );

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe( 'error handling', () => {
    test( 'handles sync throws gracefully', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'db',
            role: Role.DEPENDENCY,
            check: () => { throw new Error( 'connection refused' ); },
        } );

        const result = await registry.runAll();

        expect( result.condition ).toBe( 'unknown' );
        expect( result.checks.db.condition ).toBe( 'unknown' );
        expect( result.checks.db.evidence?.type ).toBe( 'error' );
        expect( result.checks.db.evidence?.detail ).toContain( 'connection refused' );
    } );

    test( 'handles async rejection gracefully', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'api',
            role: Role.DEPENDENCY,
            check: async () => { throw new Error( 'timeout' ); },
        } );

        const result = await registry.runAll();

        expect( result.condition ).toBe( 'unknown' );
        expect( result.checks.api.evidence?.detail ).toContain( 'timeout' );
    } );

    test( 'times out slow checks', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'slow-db',
            role: Role.DEPENDENCY,
            timeoutMs: 50,
            check: async () => {
                await new Promise( ( r ) => setTimeout( r, 200 ) );
                return { condition: Condition.OPERATIONAL };
            },
        } );

        const result = await registry.runAll();

        expect( result.condition ).toBe( 'unknown' );
        expect( result.checks['slow-db'].condition ).toBe( 'unknown' );
        expect( result.checks['slow-db'].evidence?.type ).toBe( 'timeout' );
    } );
} );

// ---------------------------------------------------------------------------
// Criticality
// ---------------------------------------------------------------------------

describe( 'criticality', () => {
    test( 'informational checks do not affect parent condition', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'critical-db',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.OPERATIONAL } ),
        } );
        registry.register( {
            name: 'optional-cache',
            role: Role.DEPENDENCY,
            criticality: 'informational',
            check: () => ( { condition: Condition.DOWN } ),
        } );

        const result = await registry.runAll();

        // Parent condition should be operational (down cache is informational)
        expect( result.condition ).toBe( 'operational' );
        // But the cache check is still reported
        expect( result.checks['optional-cache'].condition ).toBe( 'down' );
    } );

    test( 'critical checks affect parent condition (default)', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'db',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.DOWN } ),
        } );

        const result = await registry.runAll();

        expect( result.condition ).toBe( 'down' );
    } );
} );

// ---------------------------------------------------------------------------
// conditionProvider
// ---------------------------------------------------------------------------

describe( 'conditionProvider', () => {
    test( 'returns aggregated condition string', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'db',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.DEGRADED } ),
        } );

        const condition = await registry.conditionProvider();

        expect( condition ).toBe( 'degraded' );
    } );
} );

// ---------------------------------------------------------------------------
// enrichSnapshot
// ---------------------------------------------------------------------------

describe( 'enrichSnapshot', () => {
    test( 'merges checks into snapshot', async () => {
        const registry = createCheckRegistry();
        registry.register( {
            name: 'db',
            role: Role.DEPENDENCY,
            check: () => ( { condition: Condition.OPERATIONAL } ),
        } );

        const result = await registry.runAll();
        const snapshot = {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'test' },
        };

        const enriched = registry.enrichSnapshot( snapshot, result );

        expect( enriched.condition ).toBe( result.condition );
        expect( enriched.checks ).toEqual( result.checks );
        expect( enriched.timing?.observed ).toBe( result.observedAt );
    } );
} );
