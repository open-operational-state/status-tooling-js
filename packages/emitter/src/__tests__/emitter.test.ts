/**
 * Emitter Tests
 *
 * Round-trip tests: parse → emit → parse, verify structural identity.
 */

import { describe, it, expect } from 'bun:test';
import { resolve, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { normalizeSnapshot } from '@open-operational-state/core';
import { emitHealthResponse } from '../health-response.js';
import { emitServiceStatus } from '../service-status.js';
import { suggestHttpStatus, suggestHeaders } from '../http.js';
import type { Snapshot } from '@open-operational-state/types';

const FIXTURE_ROOT = process.env.OOS_FIXTURE_ROOT
    || resolve( import.meta.dir, '../../../../..', 'status-conformance' );

function loadFixture( relPath: string ): Record<string, unknown> {
    const fullPath = join( FIXTURE_ROOT, relPath );
    if ( !existsSync( fullPath ) ) {
        throw new Error( `Fixture not found: ${fullPath}` );
    }
    return JSON.parse( readFileSync( fullPath, 'utf-8' ) );
}

// ---------------------------------------------------------------------------
// Health response round-trip
// ---------------------------------------------------------------------------

describe( 'emitHealthResponse', () => {
    it( 'emits a valid health response from a snapshot', () => {
        const snapshot: Snapshot = {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'test-service', description: 'Test Service' },
            timing: { observed: '2026-04-02T19:30:00Z' },
            provenance: 'self-reported',
        };

        const payload = emitHealthResponse( snapshot );

        expect( payload.condition ).toBe( 'operational' );
        expect( payload.profiles ).toEqual( [ 'health' ] );
        expect( payload.subject.id ).toBe( 'test-service' );
        expect( payload.timing?.observed ).toBe( '2026-04-02T19:30:00Z' );
        expect( payload.provenance ).toBe( 'self-reported' );
    } );

    it( 'round-trips a health fixture: emit → normalize', () => {
        const fixture = loadFixture( 'fixtures/profiles/health/positive-degraded-with-components.json' );
        const input = fixture.input as Record<string, unknown>;
        const snapshot = normalizeSnapshot( input );

        // Emit
        const payload = emitHealthResponse( snapshot );

        // Re-normalize
        const roundTripped = normalizeSnapshot( payload as unknown as Record<string, unknown> );

        expect( roundTripped.condition ).toBe( snapshot.condition );
        expect( roundTripped.subject.id ).toBe( snapshot.subject.id );
        expect( roundTripped.provenance ).toBe( snapshot.provenance );
    } );

    it( 'includes checks from snapshot', () => {
        const snapshot: Snapshot = {
            condition: 'degraded',
            profiles: [ 'health' ],
            subject: { id: 'test' },
            checks: {
                database: { condition: 'operational', role: 'dependency' },
                cache: { condition: 'down', role: 'component' },
            },
        };

        const payload = emitHealthResponse( snapshot );
        expect( payload.checks ).toBeDefined();
        expect( Object.keys( payload.checks! ) ).toEqual( [ 'database', 'cache' ] );
    } );
} );

// ---------------------------------------------------------------------------
// Service status round-trip
// ---------------------------------------------------------------------------

describe( 'emitServiceStatus', () => {
    it( 'emits a valid service-status payload', () => {
        const snapshot: Snapshot = {
            condition: 'degraded',
            profiles: [ 'status' ],
            subject: { id: 'payment-platform', description: 'Payment Platform' },
            timing: { observed: '2026-04-02T19:30:00Z' },
            provenance: 'self-reported',
            evidence: { type: 'error-rate', detail: '7.2% errors' },
            components: [
                { id: 'api', condition: 'operational' },
                { id: 'cache', condition: 'down' },
            ],
            dependencies: [
                { id: 'database', condition: 'operational' },
            ],
        };

        const payload = emitServiceStatus( snapshot );

        expect( payload.condition ).toBe( 'degraded' );
        expect( payload.components?.length ).toBe( 2 );
        expect( payload.dependencies?.length ).toBe( 1 );
        expect( payload.evidence?.type ).toBe( 'error-rate' );
    } );

    it( 'converts flat checks to components/dependencies', () => {
        const snapshot: Snapshot = {
            condition: 'operational',
            profiles: [ 'status' ],
            subject: { id: 'test' },
            checks: {
                db: { condition: 'operational', role: 'dependency' },
                worker: { condition: 'operational', role: 'component' },
            },
        };

        const payload = emitServiceStatus( snapshot );
        expect( payload.components?.length ).toBe( 1 );
        expect( payload.dependencies?.length ).toBe( 1 );
        expect( payload.components![0].id ).toBe( 'worker' );
        expect( payload.dependencies![0].id ).toBe( 'db' );
    } );
} );

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

describe( 'suggestHttpStatus', () => {
    it( 'returns 200 for operational', () => {
        expect( suggestHttpStatus( 'operational' ) ).toBe( 200 );
    } );

    it( 'returns 200 for degraded', () => {
        expect( suggestHttpStatus( 'degraded' ) ).toBe( 200 );
    } );

    it( 'returns 503 for down', () => {
        expect( suggestHttpStatus( 'down' ) ).toBe( 503 );
    } );

    it( 'returns 503 for maintenance', () => {
        expect( suggestHttpStatus( 'maintenance' ) ).toBe( 503 );
    } );

    it( 'returns 200 for alive', () => {
        expect( suggestHttpStatus( 'alive' ) ).toBe( 200 );
    } );
} );

describe( 'suggestHeaders', () => {
    it( 'returns correct content type', () => {
        const snapshot: Snapshot = {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'test' },
        };

        const headers = suggestHeaders( snapshot, 'application/health+json' );
        expect( headers['Content-Type'] ).toBe( 'application/health+json' );
        expect( headers['Cache-Control'] ).toContain( 'no-cache' );
    } );
} );
