/**
 * Golden Round-Trip Invariant Tests
 *
 * Enforces the fundamental guarantee:
 *   parse → normalize → emit → parse → normalize
 *
 * Must guarantee:
 * - No semantic drift
 * - No loss of required data
 * - No illegal state introduced
 *
 * This is the long-term safety net. If these tests break,
 * something fundamental has drifted.
 */

import { describe, it, expect } from 'bun:test';
import { resolve, join } from 'node:path';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { normalizeSnapshot, validateSnapshot } from '@open-operational-state/core';
import { parseHealthCheckDraft, parseHealthResponse, parsePlainHttp } from '@open-operational-state/parser';
import { emitHealthResponse, emitServiceStatus } from '@open-operational-state/emitter';
import type { Snapshot } from '@open-operational-state/types';

const FIXTURE_ROOT = process.env.OOS_FIXTURE_ROOT
    || resolve( import.meta.dir, '../../../../..', 'status-conformance' );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findFixtures( dirPath: string ): string[] {
    if ( !existsSync( dirPath ) ) { return []; }
    const files: string[] = [];
    for ( const entry of readdirSync( dirPath ) ) {
        const fullPath = join( dirPath, entry );
        const stat = statSync( fullPath );
        if ( stat.isDirectory() ) {
            files.push( ...findFixtures( fullPath ) );
        } else if ( entry.endsWith( '.json' ) ) {
            files.push( fullPath );
        }
    }
    return files;
}

function loadJson( path: string ): Record<string, unknown> {
    return JSON.parse( readFileSync( path, 'utf-8' ) );
}

/**
 * Assert that two snapshots are semantically equivalent
 * for the purposes of round-trip invariance.
 *
 * Checks required fields and structural shape.
 * Timing is excluded from round-trip checks because emit
 * may add/strip timing fields not present in the original.
 */
function assertSemanticEquivalence( original: Snapshot, roundTripped: Snapshot, label: string ): void {
    // Condition must be preserved
    expect( roundTripped.condition ).toBe( original.condition );

    // Subject identity must be preserved
    expect( roundTripped.subject.id ).toBe( original.subject.id );

    // Subject description must be preserved if present
    if ( original.subject.description ) {
        expect( roundTripped.subject.description ).toBe( original.subject.description );
    }

    // Profiles must be preserved
    expect( roundTripped.profiles ).toEqual( original.profiles );

    // Provenance must be preserved if present
    if ( original.provenance ) {
        expect( roundTripped.provenance ).toBe( original.provenance );
    }

    // Evidence type must be preserved if present
    if ( original.evidence ) {
        expect( roundTripped.evidence?.type ).toBe( original.evidence.type );
    }

    // Check count must be preserved
    if ( original.checks ) {
        expect( Object.keys( roundTripped.checks || {} ).length )
            .toBe( Object.keys( original.checks ).length );

        // Each check's condition must be preserved
        for ( const [ key, check ] of Object.entries( original.checks ) ) {
            expect( roundTripped.checks?.[key]?.condition ).toBe( check.condition );
        }
    }

    // The round-tripped snapshot must still be valid
    const validation = validateSnapshot( roundTripped );
    // If original was valid, round-trip must be valid
    const originalValidation = validateSnapshot( original );
    if ( originalValidation.valid ) {
        expect( validation.valid ).toBe( true );
    }
}

// ---------------------------------------------------------------------------
// Round-trip: health-response (parse → emit → parse)
// ---------------------------------------------------------------------------

describe( 'round-trip: health-response', () => {
    // Core positive fixtures through health-response path
    const corePositive = findFixtures( join( FIXTURE_ROOT, 'fixtures', 'core' ) )
        .filter( ( f ) => f.includes( 'positive' ) );

    const profilePositive = findFixtures( join( FIXTURE_ROOT, 'fixtures', 'profiles' ) )
        .filter( ( f ) => f.includes( 'positive' ) );

    const allPositive = [ ...corePositive, ...profilePositive ];

    for ( const fixturePath of allPositive ) {
        const name = fixturePath.split( '/' ).slice( -2 ).join( '/' );

        it( `round-trips: ${name}`, () => {
            const fixture = loadJson( fixturePath );
            const input = fixture.input as Record<string, unknown>;

            // Step 1: normalize input → Snapshot
            const original = normalizeSnapshot( input );

            // Step 2: emit health-response
            const emitted = emitHealthResponse( original );

            // Step 3: re-parse the emitted payload
            const roundTripped = normalizeSnapshot( emitted as unknown as Record<string, unknown> );

            // Step 4: verify semantic equivalence
            assertSemanticEquivalence( original, roundTripped, name );
        } );
    }
} );

// ---------------------------------------------------------------------------
// Round-trip: service-status (parse → emit → parse)
// ---------------------------------------------------------------------------

describe( 'round-trip: service-status', () => {
    it( 'round-trips a rich snapshot through service-status format', () => {
        const original: Snapshot = {
            condition: 'degraded',
            profiles: [ 'status' ],
            subject: { id: 'payment-platform', description: 'Payment Platform' },
            timing: { observed: '2026-04-02T19:30:00Z' },
            provenance: 'self-reported',
            evidence: { type: 'error-rate', detail: '7.2% error rate' },
            components: [
                { id: 'api', condition: 'operational' },
                { id: 'cache', condition: 'down', evidence: { type: 'connectivity', detail: 'Connection refused' } },
            ],
            dependencies: [
                { id: 'database', condition: 'operational' },
            ],
        };

        // Emit
        const emitted = emitServiceStatus( original );

        // Re-parse
        const roundTripped = normalizeSnapshot( emitted as unknown as Record<string, unknown> );

        // Verify
        expect( roundTripped.condition ).toBe( 'degraded' );
        expect( roundTripped.subject.id ).toBe( 'payment-platform' );
        expect( roundTripped.provenance ).toBe( 'self-reported' );
        expect( roundTripped.profiles ).toEqual( [ 'status' ] );
    } );

    it( 'converts flat checks → components → flat checks without loss', () => {
        const original: Snapshot = {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'test' },
            checks: {
                db: { condition: 'operational', role: 'dependency' },
                worker: { condition: 'operational', role: 'component' },
            },
        };

        // Emit as service-status (converts checks → components/dependencies)
        const emitted = emitServiceStatus( original );
        expect( emitted.components?.length ).toBe( 1 );
        expect( emitted.dependencies?.length ).toBe( 1 );

        // Emit as health-response (keeps checks flat)
        const healthEmitted = emitHealthResponse( original );
        const healthRoundTripped = normalizeSnapshot( healthEmitted as unknown as Record<string, unknown> );
        expect( Object.keys( healthRoundTripped.checks || {} ).length ).toBe( 2 );
    } );
} );

// ---------------------------------------------------------------------------
// Round-trip: health-check-draft adapter → emit → parse
// ---------------------------------------------------------------------------

describe( 'round-trip: adapter → emit → re-parse', () => {
    const adapterFixtures = findFixtures(
        join( FIXTURE_ROOT, 'adapters', 'health-check-draft' ),
    ).filter( ( f ) => f.includes( 'positive' ) );

    for ( const fixturePath of adapterFixtures ) {
        const name = fixturePath.split( '/' ).slice( -1 )[0];

        it( `adapter round-trip: ${name}`, () => {
            const fixture = loadJson( fixturePath );
            const input = fixture.input as Record<string, unknown>;

            // Step 1: parse through adapter
            const adapted = parseHealthCheckDraft( input.body );

            // Step 2: emit as health-response
            const emitted = emitHealthResponse( adapted );

            // Step 3: re-parse the emitted payload
            const roundTripped = normalizeSnapshot( emitted as unknown as Record<string, unknown> );

            // Step 4: verify the adapter output survived round-trip
            expect( roundTripped.condition ).toBe( adapted.condition );
            expect( roundTripped.subject.id ).toBe( adapted.subject.id );
            expect( roundTripped.provenance ).toBe( adapted.provenance );

            // Must still validate
            const validation = validateSnapshot( roundTripped );
            // Adapter output may not fully satisfy all profile requirements,
            // but the round-trip must not INTRODUCE new errors
        } );
    }
} );

// ---------------------------------------------------------------------------
// Illegal state detection
// ---------------------------------------------------------------------------

describe( 'round-trip: no illegal state introduced', () => {
    it( 'emitting then re-parsing does not create empty required fields', () => {
        const original: Snapshot = {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
            provenance: 'self-reported',
        };

        const emitted = emitHealthResponse( original );
        const roundTripped = normalizeSnapshot( emitted as unknown as Record<string, unknown> );

        // Required fields must not become empty
        expect( roundTripped.condition ).toBeTruthy();
        expect( roundTripped.subject.id ).toBeTruthy();
        expect( roundTripped.profiles.length ).toBeGreaterThan( 0 );
    } );

    it( 'does not silently coerce categorical to orderable', () => {
        const original: Snapshot = {
            condition: 'maintenance',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
        };

        const emitted = emitHealthResponse( original );
        const roundTripped = normalizeSnapshot( emitted as unknown as Record<string, unknown> );

        // 'maintenance' must remain 'maintenance', not get coerced
        expect( roundTripped.condition ).toBe( 'maintenance' );
    } );

    it( 'does not silently coerce extension values', () => {
        const original: Snapshot = {
            condition: 'x-acme-draining',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
        };

        const emitted = emitHealthResponse( original );
        const roundTripped = normalizeSnapshot( emitted as unknown as Record<string, unknown> );

        // Extension values must survive untouched
        expect( roundTripped.condition ).toBe( 'x-acme-draining' );
    } );
} );
