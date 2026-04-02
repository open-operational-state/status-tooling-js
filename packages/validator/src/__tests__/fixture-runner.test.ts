/**
 * Fixture Runner Tests
 *
 * Runs all conformance fixtures from the status-conformance repository.
 * Fixtures are read directly from the sibling repo — no copying.
 */

import { describe, it, expect } from 'bun:test';
import { resolve, join, basename } from 'node:path';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { loadFixture, runFixture } from '../fixture-runner.js';
import type { FixtureResult } from '../fixture-runner.js';

// ---------------------------------------------------------------------------
// Fixture root resolution
// ---------------------------------------------------------------------------

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

function runAndReport( fixturePath: string ): FixtureResult {
    const fixture = loadFixture( fixturePath );
    return runFixture( fixture );
}

// ---------------------------------------------------------------------------
// Core fixtures
// ---------------------------------------------------------------------------

describe( 'core fixtures', () => {
    const dir = join( FIXTURE_ROOT, 'fixtures', 'core' );
    const files = findFixtures( dir );

    if ( files.length === 0 ) {
        it.skip( 'no core fixtures found', () => {} );
        return;
    }

    for ( const filePath of files ) {
        it( basename( filePath ), () => {
            const result = runAndReport( filePath );
            expect( result.passed ).toBe( true );
            if ( !result.passed ) {
                console.error( 'Diagnostics:', result.diagnostics );
            }
        } );
    }
} );

// ---------------------------------------------------------------------------
// Profile fixtures
// ---------------------------------------------------------------------------

describe( 'profile fixtures', () => {
    const dir = join( FIXTURE_ROOT, 'fixtures', 'profiles' );
    const files = findFixtures( dir );

    if ( files.length === 0 ) {
        it.skip( 'no profile fixtures found', () => {} );
        return;
    }

    for ( const filePath of files ) {
        it( basename( filePath ), () => {
            const result = runAndReport( filePath );
            expect( result.passed ).toBe( true );
            if ( !result.passed ) {
                console.error( 'Diagnostics:', result.diagnostics );
            }
        } );
    }
} );

// ---------------------------------------------------------------------------
// Serialization fixtures
// ---------------------------------------------------------------------------

describe( 'serialization fixtures', () => {
    const dir = join( FIXTURE_ROOT, 'fixtures', 'serializations' );
    const files = findFixtures( dir );

    if ( files.length === 0 ) {
        it.skip( 'no serialization fixtures found', () => {} );
        return;
    }

    for ( const filePath of files ) {
        it( basename( filePath ), () => {
            const result = runAndReport( filePath );
            expect( result.passed ).toBe( true );
            if ( !result.passed ) {
                console.error( 'Diagnostics:', result.diagnostics );
            }
        } );
    }
} );
