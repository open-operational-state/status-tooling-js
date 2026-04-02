/**
 * Core Package Tests — Aggregation
 *
 * Direct unit tests for worstOf and condition derivation helpers.
 */

import { describe, it, expect } from 'bun:test';
import { worstOf, deriveParentConditionFromChecks, deriveParentConditionFromComponents } from '../aggregate.js';

describe( 'worstOf', () => {
    it( 'returns the worst condition from an array', () => {
        expect( worstOf( [ 'operational', 'degraded', 'down' ] ) ).toBe( 'down' );
    } );

    it( 'returns operational when all are operational', () => {
        expect( worstOf( [ 'operational', 'operational' ] ) ).toBe( 'operational' );
    } );

    it( 'returns degraded when worst is degraded', () => {
        expect( worstOf( [ 'operational', 'degraded' ] ) ).toBe( 'degraded' );
    } );

    it( 'handles single-element arrays', () => {
        expect( worstOf( [ 'down' ] ) ).toBe( 'down' );
    } );

    it( 'returns unknown for empty arrays', () => {
        expect( worstOf( [] ) ).toBe( 'unknown' );
    } );

    it( 'orders partial-outage between degraded and major-outage', () => {
        expect( worstOf( [ 'degraded', 'partial-outage' ] ) ).toBe( 'partial-outage' );
        expect( worstOf( [ 'partial-outage', 'major-outage' ] ) ).toBe( 'major-outage' );
    } );

    it( 'treats unrecognized values as maximum severity', () => {
        expect( worstOf( [ 'operational', 'x-custom' ] ) ).toBe( 'x-custom' );
    } );

    it( 'handles liveness conditions', () => {
        expect( worstOf( [ 'alive', 'unreachable' ] ) ).toBe( 'unreachable' );
    } );

    it( 'handles readiness conditions', () => {
        expect( worstOf( [ 'ready', 'not-ready' ] ) ).toBe( 'not-ready' );
        expect( worstOf( [ 'ready', 'initializing' ] ) ).toBe( 'initializing' );
    } );
} );

describe( 'deriveParentConditionFromChecks', () => {
    it( 'derives from flat checks', () => {
        const result = deriveParentConditionFromChecks( {
            db: { condition: 'operational', role: 'dependency' },
            cache: { condition: 'down', role: 'component' },
        } );

        expect( result ).toBe( 'down' );
    } );

    it( 'returns operational when all checks are operational', () => {
        const result = deriveParentConditionFromChecks( {
            db: { condition: 'operational', role: 'dependency' },
            api: { condition: 'operational', role: 'component' },
        } );

        expect( result ).toBe( 'operational' );
    } );

    it( 'returns unknown for empty checks', () => {
        expect( deriveParentConditionFromChecks( {} ) ).toBe( 'unknown' );
    } );
} );

describe( 'deriveParentConditionFromComponents', () => {
    it( 'derives from nested components', () => {
        const result = deriveParentConditionFromComponents( [
            { id: 'api', condition: 'operational' },
            { id: 'cache', condition: 'degraded' },
        ] );

        expect( result ).toBe( 'degraded' );
    } );

    it( 'returns unknown for empty array', () => {
        expect( deriveParentConditionFromComponents( [] ) ).toBe( 'unknown' );
    } );
} );
