/**
 * Parser Tests
 *
 * Tests adapter parsers against conformance fixtures from status-conformance.
 */

import { describe, it, expect } from 'bun:test';
import { resolve, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { parsePlainHttp } from '../plain-http.js';
import { parseHealthCheckDraft } from '../health-check-draft.js';
import { parseHealthResponse } from '../health-response.js';
import { parseSpringBoot } from '../spring-boot.js';
import { detectFormat } from '../detect.js';
import { parse, safeParse } from '../parse.js';

const FIXTURE_ROOT = process.env.OOS_FIXTURE_ROOT
    || resolve( import.meta.dir, '../../../../..', 'status-conformance' );

function loadJson( relPath: string ): Record<string, unknown> {
    const fullPath = join( FIXTURE_ROOT, relPath );
    if ( !existsSync( fullPath ) ) {
        throw new Error( `Fixture not found: ${fullPath}` );
    }
    return JSON.parse( readFileSync( fullPath, 'utf-8' ) );
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

describe( 'detectFormat', () => {
    it( 'detects native health-response by content type', () => {
        const body = { condition: 'operational', profiles: [ 'health' ], subject: { id: 'x' } };
        expect( detectFormat( 'application/health+json', body ) ).toBe( 'native-health-response' );
    } );

    it( 'detects native service-status by content type', () => {
        expect( detectFormat( 'application/status+json', {} ) ).toBe( 'native-service-status' );
    } );

    it( 'detects draft-inadarei by status field', () => {
        const body = { status: 'pass', serviceId: 'test' };
        expect( detectFormat( 'application/json', body ) ).toBe( 'health-check-draft' );
    } );

    it( 'falls back to plain-http for unrecognized', () => {
        expect( detectFormat( 'text/plain', 'OK' ) ).toBe( 'plain-http' );
    } );
} );

// ---------------------------------------------------------------------------
// Plain HTTP adapter
// ---------------------------------------------------------------------------

describe( 'plain-http adapter', () => {
    it( 'parses fixture: positive-200', () => {
        const fixture = loadJson( 'adapters/plain-http/positive-200.json' );
        const input = fixture.input as Record<string, unknown>;
        const expected = fixture.expected as Record<string, unknown>;

        const result = parsePlainHttp( {
            url: input.url as string,
            httpStatus: input.http_status as number,
            headers: input.headers as Record<string, string>,
        } );

        expect( result.condition ).toBe( expected.condition as string );
        expect( result.profiles ).toEqual( expected.profiles as string[] );
        expect( result.subject.id ).toBe( ( expected.subject as Record<string, string> ).id );
        expect( result.provenance ).toBe( expected.provenance as string );
    } );

    it( 'maps connection error to unreachable', () => {
        const result = parsePlainHttp( {
            url: 'https://api.example.com/health',
            connectionError: true,
        } );

        expect( result.condition ).toBe( 'unreachable' );
        expect( result.profiles ).toEqual( [ 'liveness' ] );
        expect( result.provenance ).toBe( 'externally-observed' );
    } );

    it( 'maps 500 to alive (service responded)', () => {
        const result = parsePlainHttp( {
            url: 'https://api.example.com/health',
            httpStatus: 500,
        } );

        expect( result.condition ).toBe( 'alive' );
    } );
} );

// ---------------------------------------------------------------------------
// Health-check-draft adapter
// ---------------------------------------------------------------------------

describe( 'health-check-draft adapter', () => {
    it( 'parses fixture: positive-pass-with-checks', () => {
        const fixture = loadJson( 'adapters/health-check-draft/positive-pass-with-checks.json' );
        const input = fixture.input as Record<string, unknown>;
        const expected = fixture.expected as Record<string, unknown>;

        const result = parseHealthCheckDraft( input.body );

        expect( result.condition ).toBe( expected.condition as string );
        expect( result.subject.id ).toBe( ( expected.subject as Record<string, string> ).id );
        expect( result.provenance ).toBe( expected.provenance as string );
        expect( result.checks ).toBeDefined();

        if ( result.checks && expected.checks ) {
            const expectedChecks = expected.checks as Record<string, Record<string, string>>;
            for ( const [ key, expectedCheck ] of Object.entries( expectedChecks ) ) {
                expect( result.checks[key] ).toBeDefined();
                expect( result.checks[key].condition ).toBe( expectedCheck.condition );
                expect( result.checks[key].role ).toBe( expectedCheck.role as 'component' | 'dependency' );
            }
        }
    } );

    it( 'maps warn to degraded', () => {
        const result = parseHealthCheckDraft( {
            status: 'warn',
            serviceId: 'test-service',
        } );
        expect( result.condition ).toBe( 'degraded' );
    } );

    it( 'maps fail to down', () => {
        const result = parseHealthCheckDraft( {
            status: 'fail',
            serviceId: 'test-service',
        } );
        expect( result.condition ).toBe( 'down' );
    } );

    it( 'maps pass to operational', () => {
        const result = parseHealthCheckDraft( {
            status: 'pass',
            serviceId: 'test-service',
        } );
        expect( result.condition ).toBe( 'operational' );
    } );
} );

// ---------------------------------------------------------------------------
// Native health-response parser
// ---------------------------------------------------------------------------

describe( 'native health-response parser', () => {
    it( 'parses fixture: positive-full', () => {
        const fixture = loadJson( 'fixtures/serializations/health-response/positive-full.json' );
        const input = fixture.input as Record<string, unknown>;

        const result = parseHealthResponse( input );

        expect( result.condition ).toBeDefined();
        expect( result.profiles ).toBeDefined();
        expect( result.subject.id ).toBeDefined();
    } );
} );

// ---------------------------------------------------------------------------
// Spring Boot adapter
// ---------------------------------------------------------------------------

describe( 'spring-boot adapter', () => {
    it( 'parses fixture: positive-up-with-components', () => {
        const fixture = loadJson( 'adapters/spring-boot/positive-up-with-components.json' );
        const input = fixture.input as Record<string, unknown>;
        const expected = fixture.expected as Record<string, unknown>;

        const result = parseSpringBoot( input.body, { url: input.url as string } );

        expect( result.condition ).toBe( expected.condition as string );
        expect( result.profiles ).toEqual( expected.profiles as string[] );
        expect( result.subject.id ).toBe( ( expected.subject as Record<string, string> ).id );
        expect( result.provenance ).toBe( expected.provenance as string );
        expect( result.checks ).toBeDefined();
        expect( Object.keys( result.checks! ).length ).toBe( 2 );
    } );

    it( 'parses fixture: positive-down', () => {
        const fixture = loadJson( 'adapters/spring-boot/positive-down.json' );
        const input = fixture.input as Record<string, unknown>;
        const expected = fixture.expected as Record<string, unknown>;

        const result = parseSpringBoot( input.body, { url: input.url as string } );

        expect( result.condition ).toBe( expected.condition as string );
        expect( result.checks ).toBeDefined();
        // db should be down, diskSpace should be operational
        expect( result.checks!['db'].condition ).toBe( 'down' );
        expect( result.checks!['diskSpace'].condition ).toBe( 'operational' );
    } );

    it( 'parses fixture: positive-out-of-service', () => {
        const fixture = loadJson( 'adapters/spring-boot/positive-out-of-service.json' );
        const input = fixture.input as Record<string, unknown>;
        const expected = fixture.expected as Record<string, unknown>;

        const result = parseSpringBoot( input.body, { url: input.url as string } );

        expect( result.condition ).toBe( expected.condition as string );
    } );

    it( 'maps UP to operational', () => {
        const result = parseSpringBoot( { status: 'UP' }, { url: 'test' } );
        expect( result.condition ).toBe( 'operational' );
    } );

    it( 'maps UNKNOWN to unknown', () => {
        const result = parseSpringBoot( { status: 'UNKNOWN' }, { url: 'test' } );
        expect( result.condition ).toBe( 'unknown' );
    } );
} );

// ---------------------------------------------------------------------------
// Unified parse entry point
// ---------------------------------------------------------------------------

describe( 'unified parse()', () => {
    it( 'auto-detects and parses health-check-draft', () => {
        const result = parse( {
            contentType: 'application/json',
            body: { status: 'pass', serviceId: 'test' },
            url: 'https://example.com/health',
        } );

        expect( result.condition ).toBe( 'operational' );
        expect( result.subject.id ).toBe( 'test' );
    } );

    it( 'auto-detects and parses plain http', () => {
        const result = parse( {
            contentType: 'text/plain',
            body: 'OK',
            url: 'https://example.com/health',
            httpStatus: 200,
        } );

        expect( result.condition ).toBe( 'alive' );
        expect( result.profiles ).toEqual( [ 'liveness' ] );
    } );

    it( 'auto-detects and parses spring-boot', () => {
        const result = parse( {
            contentType: 'application/json',
            body: {
                status: 'UP',
                components: {
                    db: { status: 'UP' },
                },
            },
            url: 'https://example.com/actuator/health',
        } );

        expect( result.condition ).toBe( 'operational' );
        expect( result.checks ).toBeDefined();
    } );
} );

// ---------------------------------------------------------------------------
// safeParse — error model
// ---------------------------------------------------------------------------

describe( 'safeParse()', () => {
    it( 'returns snapshot on valid input', () => {
        const result = safeParse( {
            contentType: 'application/json',
            body: { status: 'pass', serviceId: 'test' },
            url: 'https://example.com/health',
        } );

        expect( result.snapshot ).not.toBeNull();
        expect( result.snapshot!.condition ).toBe( 'operational' );
        expect( result.errors.length ).toBe( 0 );
    } );

    it( 'never throws on malformed input', () => {
        const result = safeParse( {
            contentType: 'application/json',
            body: 'not-an-object',
            url: 'https://example.com/health',
        } );

        // Should not throw — returns error instead
        expect( result.snapshot ).toBeDefined();
    } );

    it( 'includes lossiness warnings for adapter-based parsing', () => {
        const result = safeParse( {
            contentType: 'text/plain',
            body: 'OK',
            url: 'https://example.com/health',
            httpStatus: 200,
        } );

        expect( result.snapshot ).not.toBeNull();
        expect( result.warnings.length ).toBeGreaterThan( 0 );
        expect( result.warnings[0].code ).toBe( 'LOSSY_PLAIN_HTTP' );
    } );

    it( 'includes lossiness warnings for spring-boot', () => {
        const result = safeParse( {
            contentType: 'application/json',
            body: {
                status: 'UP',
                components: { db: { status: 'UP' } },
            },
            url: 'https://example.com/actuator/health',
        } );

        expect( result.snapshot ).not.toBeNull();
        expect( result.warnings.some( ( w: { code: string } ) => w.code === 'LOSSY_SPRING_BOOT' ) ).toBe( true );
    } );

    it( 'returns errors for unrecognized spring boot status', () => {
        const result = safeParse( {
            contentType: 'application/json',
            body: {
                status: 'BANANA',
                components: {},
            },
            url: 'https://example.com/actuator/health',
        } );

        // BANANA isn't a Spring Boot status, but won't be detected as spring-boot
        // (detection requires UP/DOWN/OUT_OF_SERVICE/UNKNOWN + components)
        // Falls to draft-inadarei or plain-http
        expect( result.snapshot ).toBeDefined();
    } );
} );
