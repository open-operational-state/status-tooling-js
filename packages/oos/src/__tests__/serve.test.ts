/**
 * serve() handler factory tests
 */

import { describe, expect, test } from 'bun:test';
import { serve } from '../serve.js';
import { Condition, Profile, Exposure, ProvenanceType } from '../constants.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function minimalRequest() {
    return { headers: {} as Record<string, string | undefined> };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe( 'serve() configuration', () => {
    test( 'throws if subject.id is missing', () => {
        expect( () => serve( {} as any ) ).toThrow( 'subject.id is required' );
    } );

    test( 'throws if subject is missing', () => {
        expect( () => serve( { subject: { id: '' } } as any ) ).toThrow( 'subject.id is required' );
    } );
} );

// ---------------------------------------------------------------------------
// Default behaviour
// ---------------------------------------------------------------------------

describe( 'default handler', () => {
    test( 'produces a valid response with defaults', async () => {
        const handler = serve( { subject: { id: 'test-api' } } );
        const result = await handler( minimalRequest() );

        expect( result.status ).toBe( 200 );
        expect( result.headers['Content-Type'] ).toBe( 'application/health+json' );
        expect( result.body ).toBeDefined();

        const body = result.body as Record<string, unknown>;
        expect( body.condition ).toBe( Condition.OPERATIONAL );
        expect( body.profiles ).toEqual( [ Profile.HEALTH ] );
        expect( ( body.subject as Record<string, unknown> ).id ).toBe( 'test-api' );
    } );

    test( 'uses condition-only exposure by default', async () => {
        const handler = serve( { subject: { id: 'test-api' } } );
        const result = await handler( minimalRequest() );
        const body = result.body as Record<string, unknown>;

        // condition-only strips timing and provenance
        expect( body.timing ).toBeUndefined();
        expect( body.provenance ).toBeUndefined();
    } );
} );

// ---------------------------------------------------------------------------
// Condition
// ---------------------------------------------------------------------------

describe( 'condition', () => {
    test( 'accepts a static string condition', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            condition: Condition.DEGRADED,
        } );
        const result = await handler( minimalRequest() );
        const body = result.body as Record<string, unknown>;

        expect( body.condition ).toBe( 'degraded' );
    } );

    test( 'accepts an async callback condition', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            condition: async () => Condition.DOWN,
        } );
        const result = await handler( minimalRequest() );

        expect( result.status ).toBe( 503 );
        expect( ( result.body as Record<string, unknown> ).condition ).toBe( 'down' );
    } );

    test( 'accepts a sync callback condition', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            condition: () => Condition.MAINTENANCE,
        } );
        const result = await handler( minimalRequest() );

        expect( result.status ).toBe( 503 );
        expect( ( result.body as Record<string, unknown> ).condition ).toBe( 'maintenance' );
    } );
} );

// ---------------------------------------------------------------------------
// Exposure tiers
// ---------------------------------------------------------------------------

describe( 'exposure tiers', () => {
    test( 'condition-metadata includes timing and provenance', async () => {
        const handler = serve( {
            subject: { id: 'test-api', description: 'My Service' },
            exposure: Exposure.CONDITION_METADATA,
        } );
        const result = await handler( minimalRequest() );
        const body = result.body as Record<string, unknown>;

        expect( body.timing ).toBeDefined();
        expect( body.provenance ).toBe( 'self-reported' );
        expect( ( body.subject as Record<string, unknown> ).description ).toBe( 'My Service' );
    } );

    test( 'full-diagnostic includes all fields', async () => {
        const handler = serve( {
            subject: { id: 'test-api', description: 'Full' },
            exposure: Exposure.FULL_DIAGNOSTIC,
        } );
        const result = await handler( minimalRequest() );
        const body = result.body as Record<string, unknown>;

        expect( body.timing ).toBeDefined();
        expect( body.provenance ).toBe( 'self-reported' );
    } );
} );

// ---------------------------------------------------------------------------
// Authentication-based exposure
// ---------------------------------------------------------------------------

describe( 'authenticated exposure', () => {
    test( 'uses default tier when not authenticated', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            exposure: Exposure.CONDITION_ONLY,
            authenticatedExposure: Exposure.FULL_DIAGNOSTIC,
            isAuthenticated: ( req ) => !!req.headers['authorization'],
        } );

        const result = await handler( minimalRequest() );
        const body = result.body as Record<string, unknown>;

        // No auth header → condition-only
        expect( body.timing ).toBeUndefined();
        expect( body.provenance ).toBeUndefined();
    } );

    test( 'uses authenticated tier when authenticated', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            exposure: Exposure.CONDITION_ONLY,
            authenticatedExposure: Exposure.FULL_DIAGNOSTIC,
            isAuthenticated: ( req ) => !!req.headers['authorization'],
        } );

        const result = await handler( {
            headers: { authorization: 'Bearer xxx' },
        } );
        const body = result.body as Record<string, unknown>;

        // Auth header present → full-diagnostic
        expect( body.timing ).toBeDefined();
        expect( body.provenance ).toBe( 'self-reported' );
    } );

    test( 'supports async isAuthenticated', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            exposure: Exposure.CONDITION_ONLY,
            authenticatedExposure: Exposure.CONDITION_METADATA,
            isAuthenticated: async ( req ) => req.headers['x-api-key'] === 'secret',
        } );

        const result = await handler( {
            headers: { 'x-api-key': 'secret' },
        } );
        const body = result.body as Record<string, unknown>;

        expect( body.provenance ).toBe( 'self-reported' );
    } );
} );

// ---------------------------------------------------------------------------
// HTTP status codes
// ---------------------------------------------------------------------------

describe( 'HTTP status codes', () => {
    test( 'returns 200 for operational', async () => {
        const handler = serve( { subject: { id: 'x' }, condition: Condition.OPERATIONAL } );
        const result = await handler( minimalRequest() );
        expect( result.status ).toBe( 200 );
    } );

    test( 'returns 503 for down', async () => {
        const handler = serve( { subject: { id: 'x' }, condition: Condition.DOWN } );
        const result = await handler( minimalRequest() );
        expect( result.status ).toBe( 503 );
    } );

    test( 'returns 503 for not-ready', async () => {
        const handler = serve( { subject: { id: 'x' }, condition: Condition.NOT_READY } );
        const result = await handler( minimalRequest() );
        expect( result.status ).toBe( 503 );
    } );

    test( 'returns 200 for degraded', async () => {
        const handler = serve( { subject: { id: 'x' }, condition: Condition.DEGRADED } );
        const result = await handler( minimalRequest() );
        expect( result.status ).toBe( 200 );
    } );
} );

// ---------------------------------------------------------------------------
// Profiles and provenance
// ---------------------------------------------------------------------------

describe( 'profiles and provenance', () => {
    test( 'uses custom profiles', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            profiles: [ Profile.READINESS ],
            exposure: Exposure.CONDITION_METADATA,
        } );
        const result = await handler( minimalRequest() );
        const body = result.body as Record<string, unknown>;

        expect( body.profiles ).toEqual( [ 'readiness' ] );
    } );

    test( 'uses custom provenance', async () => {
        const handler = serve( {
            subject: { id: 'test-api' },
            provenance: ProvenanceType.DERIVED,
            exposure: Exposure.CONDITION_METADATA,
        } );
        const result = await handler( minimalRequest() );
        const body = result.body as Record<string, unknown>;

        expect( body.provenance ).toBe( 'derived' );
    } );
} );
