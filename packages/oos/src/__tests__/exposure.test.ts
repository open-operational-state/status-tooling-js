/**
 * Exposure tier filtering tests
 */

import { describe, expect, test } from 'bun:test';
import type { Snapshot } from '@open-operational-state/types';
import { filterByExposure } from '../exposure.js';
import { Exposure } from '../constants.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function fullSnapshot(): Snapshot {
    return {
        condition: 'operational',
        profiles: [ 'health' ],
        subject: {
            id: 'test-api',
            description: 'A test service',
        },
        timing: {
            observed: '2026-01-01T00:00:00Z',
            reported: '2026-01-01T00:00:01Z',
        },
        provenance: 'self-reported',
        evidence: {
            type: 'connectivity',
            detail: 'All TCP checks passed',
        },
        checks: {
            database: {
                condition: 'operational',
                role: 'dependency',
                evidence: { type: 'response-time', detail: '12ms' },
            },
            cache: {
                condition: 'degraded',
                role: 'component',
                evidence: { type: 'response-time', detail: '450ms' },
            },
        },
        components: [
            {
                id: 'web-server',
                description: 'Nginx frontend',
                condition: 'operational',
                criticality: 'critical',
                timing: { observed: '2026-01-01T00:00:00Z' },
                evidence: { type: 'http-status', detail: '200 OK' },
            },
        ],
        dependencies: [
            {
                id: 'payment-gateway',
                description: 'Stripe',
                condition: 'operational',
                criticality: 'critical',
                timing: { observed: '2026-01-01T00:00:00Z' },
                evidence: { type: 'connectivity', detail: 'TCP OK' },
            },
        ],
    };
}

// ---------------------------------------------------------------------------
// condition-only
// ---------------------------------------------------------------------------

describe( 'condition-only tier', () => {
    test( 'includes only condition, profiles, and subject.id', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.CONDITION_ONLY );

        expect( result.condition ).toBe( 'operational' );
        expect( result.profiles ).toEqual( [ 'health' ] );
        expect( result.subject.id ).toBe( 'test-api' );
    } );

    test( 'strips description, timing, provenance, evidence, checks', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.CONDITION_ONLY );

        expect( result.subject.description ).toBeUndefined();
        expect( result.timing ).toBeUndefined();
        expect( result.provenance ).toBeUndefined();
        expect( result.evidence ).toBeUndefined();
        expect( result.checks ).toBeUndefined();
        expect( result.components ).toBeUndefined();
        expect( result.dependencies ).toBeUndefined();
    } );

    test( 'does not mutate the original snapshot', () => {
        const original = fullSnapshot();
        filterByExposure( original, Exposure.CONDITION_ONLY );

        expect( original.timing ).toBeDefined();
        expect( original.provenance ).toBeDefined();
        expect( original.evidence ).toBeDefined();
        expect( original.checks ).toBeDefined();
    } );
} );

// ---------------------------------------------------------------------------
// condition-metadata
// ---------------------------------------------------------------------------

describe( 'condition-metadata tier', () => {
    test( 'includes timing, description, and provenance', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.CONDITION_METADATA );

        expect( result.condition ).toBe( 'operational' );
        expect( result.subject.description ).toBe( 'A test service' );
        expect( result.timing ).toBeDefined();
        expect( result.provenance ).toBe( 'self-reported' );
    } );

    test( 'strips evidence, checks, components, dependencies', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.CONDITION_METADATA );

        expect( result.evidence ).toBeUndefined();
        expect( result.checks ).toBeUndefined();
        expect( result.components ).toBeUndefined();
        expect( result.dependencies ).toBeUndefined();
    } );
} );

// ---------------------------------------------------------------------------
// component-level
// ---------------------------------------------------------------------------

describe( 'component-level tier', () => {
    test( 'includes checks with condition and role only', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.COMPONENT_LEVEL );

        expect( result.checks ).toBeDefined();
        expect( result.checks!['database'].condition ).toBe( 'operational' );
        expect( result.checks!['database'].role ).toBe( 'dependency' );
        expect( result.checks!['database'].evidence ).toBeUndefined();
    } );

    test( 'includes components with condition only, no evidence', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.COMPONENT_LEVEL );

        expect( result.components ).toHaveLength( 1 );
        expect( result.components![0].condition ).toBe( 'operational' );
        expect( result.components![0].criticality ).toBe( 'critical' );
        expect( ( result.components![0] as unknown as Record<string, unknown> ).evidence ).toBeUndefined();
        expect( ( result.components![0] as unknown as Record<string, unknown> ).description ).toBeUndefined();
    } );

    test( 'includes dependencies with condition only, no evidence', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.COMPONENT_LEVEL );

        expect( result.dependencies ).toHaveLength( 1 );
        expect( result.dependencies![0].condition ).toBe( 'operational' );
        expect( ( result.dependencies![0] as unknown as Record<string, unknown> ).evidence ).toBeUndefined();
    } );
} );

// ---------------------------------------------------------------------------
// full-diagnostic
// ---------------------------------------------------------------------------

describe( 'full-diagnostic tier', () => {
    test( 'includes all fields', () => {
        const result = filterByExposure( fullSnapshot(), Exposure.FULL_DIAGNOSTIC );

        expect( result.condition ).toBe( 'operational' );
        expect( result.subject.description ).toBe( 'A test service' );
        expect( result.timing ).toBeDefined();
        expect( result.provenance ).toBe( 'self-reported' );
        expect( result.evidence ).toBeDefined();
        expect( result.checks ).toBeDefined();
        expect( result.checks!['database'].evidence ).toBeDefined();
        expect( result.components ).toBeDefined();
        expect( result.dependencies ).toBeDefined();
    } );
} );

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe( 'edge cases', () => {
    test( 'unrecognised tier falls back to condition-only', () => {
        const result = filterByExposure( fullSnapshot(), 'invalid-tier' as any );

        expect( result.timing ).toBeUndefined();
        expect( result.evidence ).toBeUndefined();
        expect( result.checks ).toBeUndefined();
    } );

    test( 'snapshot without optional fields does not error', () => {
        const minimal: Snapshot = {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'minimal' },
        };

        const result = filterByExposure( minimal, Exposure.FULL_DIAGNOSTIC );
        expect( result.condition ).toBe( 'operational' );
        expect( result.checks ).toBeUndefined();
    } );
} );
