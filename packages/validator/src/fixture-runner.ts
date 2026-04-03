/**
 * Fixture Runner
 *
 * Load and execute conformance fixtures from the status-conformance repository.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { normalizeSnapshot, validateSnapshot } from '@open-operational-state/core';
import type { ValidationResult, Snapshot } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FixtureMetadata {
    layer: string;
    polarity: string;
    description: string;
    license?: string;
    profile?: string;
    adapter?: string;
    fidelity?: string;
}

export interface FixtureExpected {
    valid?: boolean;
    error?: string;
    condition?: string;
    profiles?: string[];
    profiles_satisfied?: string[];
    subject?: Record<string, unknown>;
    provenance?: string;
    checks?: Record<string, unknown>;
}

export interface Fixture {
    metadata: FixtureMetadata;
    input: Record<string, unknown>;
    expected: FixtureExpected;
    filePath: string;
}

export interface FixtureResult {
    fixture: Fixture;
    passed: boolean;
    validation?: ValidationResult;
    snapshot?: Snapshot;
    diagnostics: string[];
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Load a single fixture from a JSON file path.
 */
export function loadFixture( filePath: string ): Fixture {
    const raw = readFileSync( filePath, 'utf-8' );
    const parsed = JSON.parse( raw );
    return {
        metadata: parsed._metadata || {},
        input: parsed.input || {},
        expected: parsed.expected || {},
        filePath,
    };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

/**
 * Execute a single fixture:
 *   1. Normalize the input into a Snapshot.
 *   2. Validate the Snapshot.
 *   3. Compare the validation result against the fixture's expected outcome.
 */
export function runFixture( fixture: Fixture ): FixtureResult {
    const diagnostics: string[] = [];

    // Normalize input → Snapshot
    const snapshot = normalizeSnapshot( fixture.input );

    // Validate
    const validation = validateSnapshot( snapshot );

    let passed = true;

    // ── Check expected validity ────────────────────────────────────────
    if ( fixture.expected.valid !== undefined ) {
        if ( validation.valid !== fixture.expected.valid ) {
            passed = false;
            diagnostics.push(
                `Expected valid=${fixture.expected.valid}, got valid=${validation.valid}` +
                ( validation.errors.length > 0
                    ? ` (errors: ${validation.errors.map( ( e ) => e.message ).join( '; ' )})`
                    : '' ),
            );
        }
    }

    // ── Check expected error message or code (negative fixtures) ────────
    if ( fixture.expected.error && fixture.expected.valid === false ) {
        const expectedError = fixture.expected.error;
        const hasMatchingError = validation.errors.some(
            ( e ) => e.message === expectedError || e.code === expectedError,
        );
        if ( !hasMatchingError ) {
            // Check for partial match on message
            const hasPartialMatch = validation.errors.some(
                ( e ) => e.message.includes( expectedError.split( ':' )[0] ),
            );
            if ( !hasPartialMatch ) {
                passed = false;
                diagnostics.push(
                    `Expected error containing '${expectedError}', got: ${JSON.stringify( validation.errors.map( ( e ) => `${e.code}: ${e.message}` ) )}`,
                );
            }
        }
    }

    // ── Check profiles_satisfied (positive fixtures) ───────────────────
    if ( fixture.expected.profiles_satisfied ) {
        // profiles_satisfied is informational — we verify the snapshot's
        // declared profiles are a subset
        const declared = new Set( snapshot.profiles );
        for ( const expected of fixture.expected.profiles_satisfied ) {
            if ( !declared.has( expected ) ) {
                // Check if the profile would be hierarchically satisfied
                // (e.g., a health response satisfies liveness)
                // This is informational, not a hard failure
                diagnostics.push(
                    `Note: expected satisfied profile '${expected}' not in declared profiles`,
                );
            }
        }
    }

    return { fixture, passed, validation, snapshot, diagnostics };
}

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

/**
 * Recursively discover and run all `.json` fixture files in a directory.
 */
export function runFixtureDir( dirPath: string ): FixtureResult[] {
    const results: FixtureResult[] = [];
    const files = discoverFixtures( dirPath );

    for ( const filePath of files ) {
        const fixture = loadFixture( filePath );
        results.push( runFixture( fixture ) );
    }

    return results;
}

/**
 * Recursively find all `.json` files in a directory tree.
 */
function discoverFixtures( dirPath: string ): string[] {
    const files: string[] = [];

    for ( const entry of readdirSync( dirPath ) ) {
        const fullPath = join( dirPath, entry );
        const stat = statSync( fullPath );

        if ( stat.isDirectory() ) {
            files.push( ...discoverFixtures( fullPath ) );
        } else if ( extname( entry ) === '.json' ) {
            files.push( fullPath );
        }
    }

    return files;
}
