/**
 * Core Package Tests — Normalization
 *
 * Direct unit tests for normalizeSnapshot.
 * These must not rely on parser/validator/emitter to exercise core logic.
 */

import { describe, it, expect } from 'bun:test';
import { normalizeSnapshot } from '../normalize.js';

describe( 'normalizeSnapshot', () => {
    it( 'normalizes a minimal valid input', () => {
        const result = normalizeSnapshot( {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
        } );

        expect( result.condition ).toBe( 'operational' );
        expect( result.profiles ).toEqual( [ 'health' ] );
        expect( result.subject.id ).toBe( 'svc-1' );
    } );

    it( 'defaults profiles to empty array if missing', () => {
        const result = normalizeSnapshot( {
            condition: 'operational',
            subject: { id: 'svc-1' },
        } );

        expect( result.profiles ).toEqual( [] );
    } );

    it( 'defaults subject to empty id if missing', () => {
        const result = normalizeSnapshot( {
            condition: 'operational',
            profiles: [ 'health' ],
        } );

        expect( result.subject.id ).toBe( '' );
    } );

    it( 'defaults condition to empty string if missing', () => {
        const result = normalizeSnapshot( {
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
        } );

        expect( result.condition ).toBe( '' );
    } );

    it( 'preserves timing fields', () => {
        const result = normalizeSnapshot( {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            timing: {
                observed: '2026-04-02T19:30:00Z',
                reported: '2026-04-02T19:30:01Z',
                stateChanged: '2026-04-02T19:00:00Z',
            },
        } );

        expect( result.timing?.observed ).toBe( '2026-04-02T19:30:00Z' );
        expect( result.timing?.reported ).toBe( '2026-04-02T19:30:01Z' );
        expect( result.timing?.stateChanged ).toBe( '2026-04-02T19:00:00Z' );
    } );

    it( 'preserves provenance', () => {
        const result = normalizeSnapshot( {
            condition: 'alive',
            profiles: [ 'liveness' ],
            subject: { id: 'svc-1' },
            provenance: 'externally-observed',
        } );

        expect( result.provenance ).toBe( 'externally-observed' );
    } );

    it( 'preserves evidence', () => {
        const result = normalizeSnapshot( {
            condition: 'degraded',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            evidence: { type: 'error-rate', detail: '7.2%' },
        } );

        expect( result.evidence?.type ).toBe( 'error-rate' );
        expect( result.evidence?.detail ).toBe( '7.2%' );
    } );

    it( 'preserves flat checks', () => {
        const result = normalizeSnapshot( {
            condition: 'degraded',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            checks: {
                db: { condition: 'operational', role: 'dependency' },
                cache: { condition: 'down', role: 'component' },
            },
        } );

        expect( result.checks ).toBeDefined();
        expect( result.checks!['db'].condition ).toBe( 'operational' );
        expect( result.checks!['db'].role ).toBe( 'dependency' );
        expect( result.checks!['cache'].condition ).toBe( 'down' );
    } );

    it( 'preserves nested components', () => {
        const result = normalizeSnapshot( {
            condition: 'degraded',
            profiles: [ 'status' ],
            subject: { id: 'svc-1' },
            components: [
                { id: 'api', condition: 'operational' },
                { id: 'cache', condition: 'down' },
            ],
        } );

        expect( result.components?.length ).toBe( 2 );
        expect( result.components![0].id ).toBe( 'api' );
        expect( result.components![1].condition ).toBe( 'down' );
    } );

    it( 'preserves nested dependencies', () => {
        const result = normalizeSnapshot( {
            condition: 'operational',
            profiles: [ 'status' ],
            subject: { id: 'svc-1' },
            dependencies: [
                { id: 'pg', condition: 'operational' },
            ],
        } );

        expect( result.dependencies?.length ).toBe( 1 );
        expect( result.dependencies![0].id ).toBe( 'pg' );
    } );

    it( 'preserves scope', () => {
        const result = normalizeSnapshot( {
            condition: 'operational',
            profiles: [ 'status' ],
            subject: { id: 'svc-1' },
            scope: { type: 'region', identifier: 'us-east-1' },
        } );

        expect( result.scope?.type ).toBe( 'region' );
        expect( result.scope?.identifier ).toBe( 'us-east-1' );
    } );

    it( 'preserves links', () => {
        const result = normalizeSnapshot( {
            condition: 'operational',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
            links: { self: 'https://example.com/health' },
        } );

        expect( result.links?.self ).toBe( 'https://example.com/health' );
    } );

    it( 'preserves extension condition values', () => {
        const result = normalizeSnapshot( {
            condition: 'x-acme-draining',
            profiles: [ 'health' ],
            subject: { id: 'svc-1' },
        } );

        expect( result.condition ).toBe( 'x-acme-draining' );
    } );

    it( 'handles empty object input', () => {
        const result = normalizeSnapshot( {} );

        expect( result.condition ).toBe( '' );
        expect( result.profiles ).toEqual( [] );
        expect( result.subject.id ).toBe( '' );
    } );
} );
