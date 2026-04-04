import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { probe } from '../probe.js';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function mockFetchResponse( body: unknown, status = 200, contentType = 'application/json' ) {
    const headers = new Headers( { 'content-type': contentType } );
    return new Response( JSON.stringify( body ), { status, headers } );
}

afterEach( () => {
    globalThis.fetch = originalFetch;
} );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe( 'probe', () => {
    it( 'probes a healthy endpoint and returns a normalized snapshot', async () => {
        const body = {
            status: 'pass',
            checks: {
                'db': [ { status: 'pass' } ],
            },
        };

        globalThis.fetch = async () => mockFetchResponse( body );

        const result = await probe( 'https://api.example.com/health' );

        expect( result.connectionError ).toBe( false );
        expect( result.httpStatus ).toBe( 200 );
        expect( result.snapshot ).toBeDefined();
        expect( result.snapshot.condition ).toBe( 'operational' );
        expect( result.validation ).toBeDefined();
        expect( result.validation.valid ).toBeDefined();
    } );

    it( 'handles connection errors gracefully', async () => {
        globalThis.fetch = async () => {
            throw new Error( 'ECONNREFUSED' );
        };

        const result = await probe( 'https://unreachable.example.com/health' );

        expect( result.connectionError ).toBe( true );
        expect( result.httpStatus ).toBeNull();
        expect( result.snapshot ).toBeDefined();
        expect( result.snapshot.condition ).toBe( 'unreachable' );
    } );

    it( 'probes a plain HTTP 200 endpoint', async () => {
        globalThis.fetch = async () => new Response( 'OK', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
        } );

        const result = await probe( 'https://api.example.com/ping' );

        expect( result.connectionError ).toBe( false );
        expect( result.httpStatus ).toBe( 200 );
        expect( result.snapshot.condition ).toBe( 'alive' );
        expect( result.snapshot.profiles ).toContain( 'liveness' );
    } );

    it( 'probes a 500 endpoint', async () => {
        globalThis.fetch = async () => new Response( 'Internal Server Error', {
            status: 500,
            headers: { 'content-type': 'text/plain' },
        } );

        const result = await probe( 'https://api.example.com/health' );

        expect( result.connectionError ).toBe( false );
        expect( result.httpStatus ).toBe( 500 );
        expect( result.snapshot.condition ).toBe( 'alive' );
    } );

    it( 'returns discovery: null when followDiscovery is not set', async () => {
        globalThis.fetch = async () => mockFetchResponse( { status: 'pass' } );

        const result = await probe( 'https://api.example.com/health' );

        expect( result.discovery ).toBeNull();
    } );

    it( 're-throws AbortError on cancellation', async () => {
        const controller = new AbortController();
        controller.abort();

        globalThis.fetch = async ( _url: string | URL | Request, init?: RequestInit ) => {
            if ( init?.signal?.aborted ) {
                throw new DOMException( 'The operation was aborted.', 'AbortError' );
            }
            return mockFetchResponse( { status: 'pass' } );
        };

        await expect( probe( 'https://api.example.com/health', { signal: controller.signal } ) )
            .rejects.toThrow( 'The operation was aborted.' );
    } );

    // ── New fields: headers, durationMs, rawBody ──────────────────────

    it( 'exposes response headers on success', async () => {
        globalThis.fetch = async () => new Response( JSON.stringify( { status: 'pass' } ), {
            status: 200,
            headers: {
                'content-type': 'application/json',
                'x-request-id': 'abc-123',
                'cf-ray': '12345-ATL',
            },
        } );

        const result = await probe( 'https://api.example.com/health' );

        expect( result.headers ).toBeDefined();
        expect( result.headers!['x-request-id'] ).toBe( 'abc-123' );
        expect( result.headers!['cf-ray'] ).toBe( '12345-ATL' );
        expect( result.headers!['content-type'] ).toContain( 'application/json' );
    } );

    it( 'returns null headers on connection error', async () => {
        globalThis.fetch = async () => { throw new Error( 'ECONNREFUSED' ); };

        const result = await probe( 'https://unreachable.example.com' );

        expect( result.headers ).toBeNull();
    } );

    it( 'returns durationMs as a non-negative number on success', async () => {
        globalThis.fetch = async () => mockFetchResponse( { status: 'pass' } );

        const result = await probe( 'https://api.example.com/health' );

        expect( typeof result.durationMs ).toBe( 'number' );
        expect( result.durationMs ).toBeGreaterThanOrEqual( 0 );
    } );

    it( 'returns durationMs on connection error', async () => {
        globalThis.fetch = async () => { throw new Error( 'ECONNREFUSED' ); };

        const result = await probe( 'https://unreachable.example.com' );

        expect( typeof result.durationMs ).toBe( 'number' );
        expect( result.durationMs ).toBeGreaterThanOrEqual( 0 );
    } );

    it( 'exposes rawBody matching the response text', async () => {
        const body = { status: 'pass', output: 'all clear' };

        globalThis.fetch = async () => mockFetchResponse( body );

        const result = await probe( 'https://api.example.com/health' );

        expect( result.rawBody ).toBe( JSON.stringify( body ) );
    } );

    it( 'returns null rawBody on connection error', async () => {
        globalThis.fetch = async () => { throw new Error( 'ECONNREFUSED' ); };

        const result = await probe( 'https://unreachable.example.com' );

        expect( result.rawBody ).toBeNull();
    } );
} );
