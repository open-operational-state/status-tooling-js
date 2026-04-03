#!/usr/bin/env node

/**
 * OOS CLI — Open Operational State command-line tool
 *
 * Commands:
 *   oos validate <file>    Validate a JSON file against conformance levels
 *   oos probe <url>        Fetch a URL, auto-detect format, parse to core model
 *   oos fixtures <dir>     Run all conformance fixtures in a directory
 *   oos inspect <file>     Parse a JSON file, pretty-print core model
 *
 * Options:
 *   --format=json|table    Output format (default: json)
 *   --help                 Show help
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeSnapshot, validateSnapshot } from '@open-operational-state/core';
import { parse } from '@open-operational-state/parser';
import { checkConformanceLevel } from './conformance.js';
import { runFixtureDir } from './fixture-runner.js';

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice( 2 );
const flags: Record<string, string> = {};
const positional: string[] = [];

for ( const arg of args ) {
    if ( arg.startsWith( '--' ) ) {
        const [ key, value ] = arg.slice( 2 ).split( '=' );
        flags[key] = value || 'true';
    } else {
        positional.push( arg );
    }
}

const command = positional[0];
const target = positional[1];
const format = flags.format || 'json';

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function output( data: unknown ): void {
    if ( format === 'table' && typeof data === 'object' && data !== null ) {
        console.table( data );
    } else {
        console.log( JSON.stringify( data, null, 2 ) );
    }
}

function exitError( message: string ): never {
    console.error( `Error: ${message}` );
    process.exit( 1 );
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function showHelp(): void {
    console.log( `
OOS — Open Operational State CLI

Usage:
  oos validate <file>        Validate a JSON file against conformance levels
  oos probe <url>            Fetch a URL, auto-detect format, parse to core model
  oos fixtures <dir>         Run all conformance fixtures in a directory
  oos inspect <file>         Parse a JSON file, pretty-print core model

Options:
  --format=json|table        Output format (default: json)
  --help                     Show this help
`.trim() );
}

async function cmdValidate( filePath: string ): Promise<void> {
    const absPath = resolve( filePath );
    if ( !existsSync( absPath ) ) {
        exitError( `File not found: ${absPath}` );
    }

    const raw = JSON.parse( readFileSync( absPath, 'utf-8' ) );
    const snapshot = normalizeSnapshot( raw );
    const validation = validateSnapshot( snapshot );
    const conformance = checkConformanceLevel( snapshot );

    output( {
        file: absPath,
        validation,
        conformance: {
            level: conformance.level,
            basic: conformance.basic,
            standard: conformance.standard,
            extended: conformance.extended,
        },
    } );

    if ( !validation.valid ) { process.exit( 1 ); }
}

async function cmdProbe( url: string ): Promise<void> {
    try {
        const response = await fetch( url );
        const contentType = response.headers.get( 'content-type' ) || '';
        let body: unknown;

        try {
            body = await response.json();
        } catch {
            body = await response.text();
        }

        const headers: Record<string, string> = {};
        response.headers.forEach( ( value, key ) => {
            headers[key] = value;
        } );

        const snapshot = parse( {
            contentType,
            body,
            url,
            httpStatus: response.status,
            headers,
        } );

        const validation = validateSnapshot( snapshot );
        const conformance = checkConformanceLevel( snapshot );

        output( {
            url,
            httpStatus: response.status,
            contentType,
            snapshot,
            validation: {
                valid: validation.valid,
                errorCount: validation.errors.length,
                warningCount: validation.warnings.length,
            },
            conformance: { level: conformance.level },
        } );
    } catch ( err ) {
        // Connection failure
        const snapshot = parse( {
            url,
            connectionError: true,
        } );

        output( {
            url,
            connectionError: true,
            snapshot,
        } );
    }
}

function cmdFixtures( dirPath: string ): void {
    const absPath = resolve( dirPath );
    if ( !existsSync( absPath ) ) {
        exitError( `Directory not found: ${absPath}` );
    }

    const results = runFixtureDir( absPath );

    const passed = results.filter( ( r ) => r.passed ).length;
    const failed = results.filter( ( r ) => !r.passed ).length;

    if ( format === 'table' ) {
        for ( const r of results ) {
            const status = r.passed ? '✓' : '✗';
            const name = r.fixture.filePath.replace( absPath, '' );
            console.log( `  ${status} ${name}` );
            if ( !r.passed ) {
                for ( const d of r.diagnostics ) {
                    console.log( `    → ${d}` );
                }
            }
        }
        console.log( `\n  ${passed} passed, ${failed} failed` );
    } else {
        output( {
            total: results.length,
            passed,
            failed,
            results: results.map( ( r ) => ( {
                file: r.fixture.filePath,
                passed: r.passed,
                diagnostics: r.diagnostics,
            } ) ),
        } );
    }

    if ( failed > 0 ) { process.exit( 1 ); }
}

function cmdInspect( filePath: string ): void {
    const absPath = resolve( filePath );
    if ( !existsSync( absPath ) ) {
        exitError( `File not found: ${absPath}` );
    }

    const raw = JSON.parse( readFileSync( absPath, 'utf-8' ) );
    const snapshot = normalizeSnapshot( raw );

    output( snapshot );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    if ( flags.help || !command ) {
        showHelp();
        process.exit( 0 );
    }

    switch ( command ) {
        case 'validate':
            if ( !target ) { exitError( 'validate requires a file path' ); }
            await cmdValidate( target );
            break;

        case 'probe':
            if ( !target ) { exitError( 'probe requires a URL' ); }
            await cmdProbe( target );
            break;

        case 'fixtures':
            if ( !target ) { exitError( 'fixtures requires a directory path' ); }
            cmdFixtures( target );
            break;

        case 'inspect':
            if ( !target ) { exitError( 'inspect requires a file path' ); }
            cmdInspect( target );
            break;

        default:
            exitError( `Unknown command: ${command}` );
    }
}

main().catch( ( err ) => {
    console.error( err );
    process.exit( 1 );
} );
