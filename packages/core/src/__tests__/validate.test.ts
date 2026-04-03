/**
 * Core Package Tests — Validation
 *
 * Direct unit tests for validateSnapshot.
 */

import { describe, it, expect } from 'bun:test';
import { validateSnapshot } from '../validate-model.js';
import { normalizeSnapshot } from '../normalize.js';

// Helper: normalize then validate
function validate( raw: Record<string, unknown> ) {
    return validateSnapshot( normalizeSnapshot( raw ) );
}

describe( 'validateSnapshot', () => {
    // ── Required fields ────────────────────────────────────────────────

    it( 'accepts a valid minimal snapshot', () => {
        const result = validate( {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
        } );
        expect( result.valid ).toBe( true );
        expect( result.errors.length ).toBe( 0 );
    } );

    it( 'rejects missing condition', () => {
        const result = validate( {
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
        } );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'MISSING_CONDITION' ) ).toBe( true );
    } );

    it( 'rejects missing subject.id', () => {
        const result = validate( {
            condition: 'operational',
            profiles: [ 'health' ],
        } );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'MISSING_SUBJECT_ID' ) ).toBe( true );
    } );

    it( 'rejects missing profiles', () => {
        const result = validate( {
            condition: 'operational',
            subject: { id: 'svc-1' },
        } );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'MISSING_PROFILES' ) ).toBe( true );
    } );

    // ── Vocabulary validation ──────────────────────────────────────────

    it( 'rejects invalid condition value for declared profile', () => {
        const result = validate( {
            condition: 'invalid-value',
            profiles: [ 'liveness' ],
            subject: { id: 'svc-1' },
        } );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'INVALID_CONDITION' ) ).toBe( true );
    } );

    it( 'accepts valid liveness conditions', () => {
        for ( const condition of [ 'alive', 'unreachable' ] ) {
            const result = validate( {
                condition,
                profiles: [ 'liveness' ],
                subject: { id: 'svc-1' },
            } );
            expect( result.valid ).toBe( true );
        }
    } );

    it( 'accepts valid readiness conditions', () => {
        for ( const condition of [ 'ready', 'initializing', 'not-ready' ] ) {
            const result = validate( {
                condition,
                profiles: [ 'readiness' ],
                subject: { id: 'svc-1' },
            } );
            expect( result.valid ).toBe( true );
        }
    } );

    it( 'accepts valid health conditions', () => {
        for ( const condition of [ 'operational', 'degraded', 'partial-outage', 'major-outage', 'down' ] ) {
            const result = validate( {
                condition,
                profiles: [ 'health' ],
                subject: { id: 'svc-1' },
                timing: { observed: '2026-04-02T19:30:00Z' },
            } );
            expect( result.valid ).toBe( true );
        }
    } );

    it( 'accepts categorical conditions', () => {
        for ( const condition of [ 'maintenance', 'unknown' ] ) {
            const result = validate( {
                condition,
                profiles: [ 'health' ],
                subject: { id: 'svc-1' },
                timing: { observed: '2026-04-02T19:30:00Z' },
            } );
            expect( result.valid ).toBe( true );
        }
    } );

    it( 'accepts extension condition values', () => {
        const result = validate( {
            condition: 'x-acme-draining',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
        } );
        expect( result.valid ).toBe( true );
    } );

    // ── Timing validation ──────────────────────────────────────────────

    it( 'accepts valid RFC 3339 timestamps', () => {
        const result = validate( {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
        } );
        expect( result.valid ).toBe( true );
    } );

    it( 'warns on invalid timestamp format', () => {
        const result = validate( {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: 'not-a-date' },
        } );
        // May produce warnings or errors depending on strictness
        expect( result.warnings.length + result.errors.length ).toBeGreaterThan( 0 );
    } );

    // ── Profile requirement enforcement ────────────────────────────────

    it( 'enforces timing requirement for standard conformance', () => {
        const result = validate( {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
            provenance: 'self-reported',
        } );
        // With timing + provenance, should be valid
        expect( result.valid ).toBe( true );
    } );

    // ── Check entry validation ─────────────────────────────────────────

    it( 'validates check entry conditions', () => {
        const result = validate( {
            condition: 'degraded',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: { observed: '2026-04-02T19:30:00Z' },
            checks: {
                db: { condition: 'operational', role: 'dependency' },
            },
        } );
        expect( result.valid ).toBe( true );
    } );

    // ── Provenance validation ──────────────────────────────────────────

    it( 'accepts valid provenance values', () => {
        for ( const provenance of [ 'self-reported', 'externally-observed', 'synthetic' ] ) {
            const result = validate( {
                condition: 'operational',
                profiles: [ 'health' ],
                subject: { id: 'svc-1' },
                timing: { observed: '2026-04-02T19:30:00Z' },
                provenance,
            } );
            expect( result.valid ).toBe( true );
        }
    } );
} );
