/**
 * Discovery Tests
 *
 * Tests Link header parsing and discovery document validation.
 * (Network-dependent tests like fetch are skipped in unit testing.)
 */

import { describe, it, expect } from 'bun:test';
import { parseLinkHeaders } from '../link-header.js';
import { validateDiscoveryDocument } from '../well-known.js';

// ---------------------------------------------------------------------------
// Link header parsing
// ---------------------------------------------------------------------------

describe( 'parseLinkHeaders', () => {
    it( 'parses a simple operational-state link', () => {
        const links = parseLinkHeaders(
            '<https://api.example.com/health>; rel="operational-state"',
        );
        expect( links.length ).toBe( 1 );
        expect( links[0].href ).toBe( 'https://api.example.com/health' );
        expect( links[0].profile ).toBeUndefined();
    } );

    it( 'parses a link with profile parameter', () => {
        const links = parseLinkHeaders(
            '<https://api.example.com/health>; rel="operational-state"; profile="health"',
        );
        expect( links.length ).toBe( 1 );
        expect( links[0].href ).toBe( 'https://api.example.com/health' );
        expect( links[0].profile ).toBe( 'health' );
    } );

    it( 'parses multiple links', () => {
        const links = parseLinkHeaders(
            '<https://api.example.com/health>; rel="operational-state"; profile="health", ' +
            '<https://api.example.com/status>; rel="operational-state"; profile="status"',
        );
        expect( links.length ).toBe( 2 );
        expect( links[0].profile ).toBe( 'health' );
        expect( links[1].profile ).toBe( 'status' );
    } );

    it( 'filters non-operational-state links', () => {
        const links = parseLinkHeaders(
            '<https://example.com>; rel="self", ' +
            '<https://api.example.com/health>; rel="operational-state"',
        );
        expect( links.length ).toBe( 1 );
        expect( links[0].href ).toBe( 'https://api.example.com/health' );
    } );

    it( 'handles header object', () => {
        const links = parseLinkHeaders( {
            'Link': '<https://api.example.com/health>; rel="operational-state"',
            'Content-Type': 'application/json',
        } );
        expect( links.length ).toBe( 1 );
    } );

    it( 'returns empty for no link header', () => {
        const links = parseLinkHeaders( { 'Content-Type': 'application/json' } );
        expect( links.length ).toBe( 0 );
    } );
} );

// ---------------------------------------------------------------------------
// Discovery document validation
// ---------------------------------------------------------------------------

describe( 'validateDiscoveryDocument', () => {
    it( 'validates a correct document', () => {
        const doc = {
            version: '1.0',
            subject: {
                id: 'payment-platform',
                description: 'Payment Processing Platform',
            },
            resources: [
                {
                    href: 'https://api.example.com/health',
                    profiles: [ 'liveness', 'readiness', 'health' ],
                    serialization: 'application/health+json',
                    auth: 'none',
                },
            ],
        };

        const result = validateDiscoveryDocument( doc );
        expect( result.valid ).toBe( true );
        expect( result.errors.length ).toBe( 0 );
    } );

    it( 'rejects missing version', () => {
        const doc = {
            subject: { id: 'test' },
            resources: [],
        };
        const result = validateDiscoveryDocument( doc );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'DISCOVERY_INVALID_VERSION' ) ).toBe( true );
    } );

    it( 'rejects missing subject', () => {
        const doc = {
            version: '1.0',
            resources: [],
        };
        const result = validateDiscoveryDocument( doc );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'DISCOVERY_MISSING_SUBJECT' ) ).toBe( true );
    } );

    it( 'rejects missing resources', () => {
        const doc = {
            version: '1.0',
            subject: { id: 'test' },
        };
        const result = validateDiscoveryDocument( doc );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'DISCOVERY_MISSING_RESOURCES' ) ).toBe( true );
    } );

    it( 'validates resource entries', () => {
        const doc = {
            version: '1.0',
            subject: { id: 'test' },
            resources: [
                { profiles: [ 'health' ], serialization: 'application/health+json' },
            ],
        };
        const result = validateDiscoveryDocument( doc );
        expect( result.valid ).toBe( false );
        expect( result.errors.some( ( e ) => e.code === 'DISCOVERY_MISSING_HREF' ) ).toBe( true );
    } );

    it( 'rejects non-object input', () => {
        const result = validateDiscoveryDocument( null );
        expect( result.valid ).toBe( false );
    } );
} );
