
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
 *
 * NOTE: The oos binary is owned by @open-operational-state/oos.
 * This module exports runCli() for delegation.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeSnapshot, validateSnapshot } from '@open-operational-state/core';
import { probe } from '@open-operational-state/probe';
import { checkConformanceLevel } from './conformance.js';
import { runFixtureDir } from './fixture-runner.js';

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs( argv: string[] ) {
    const flags: Record<string, string> = {};
    const positional: string[] = [];

    for ( const arg of argv ) {
        if ( arg.startsWith( '--' ) ) {
            const [ key, value ] = arg.slice( 2 ).split( '=' );
            flags[key] = value || 'true';
        } else {
            positional.push( arg );
        }
    }

    return { flags, positional };
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function output( data: unknown, format: string ): void {
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

async function cmdValidate( filePath: string, format: string ): Promise<void> {
    const absPath = resolve( filePath );
    if ( !existsSync( absPath ) ) {
        exitError( `File not found: ${absPath}` );
    }

    let raw: Record<string, unknown>;
    try {
        raw = JSON.parse( readFileSync( absPath, 'utf-8' ) );
    } catch {
        exitError( `Invalid JSON in file: ${absPath}` );
    }
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
    }, format );

    if ( !validation.valid ) { process.exit( 1 ); }
}

async function cmdProbe( url: string, format: string ): Promise<void> {
    const result = await probe( url );

    if ( result.connectionError ) {
        output( {
            url: result.url,
            connectionError: true,
            snapshot: result.snapshot,
        }, format );
    } else {
        const conformance = checkConformanceLevel( result.snapshot );

        output( {
            url: result.url,
            httpStatus: result.httpStatus,
            contentType: result.contentType,
            snapshot: result.snapshot,
            validation: {
                valid: result.validation.valid,
                errorCount: result.validation.errors.length,
                warningCount: result.validation.warnings.length,
            },
            conformance: { level: conformance.level },
        }, format );
    }
}

function cmdFixtures( dirPath: string, format: string ): void {
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
        }, format );
    }

    if ( failed > 0 ) { process.exit( 1 ); }
}

function cmdInspect( filePath: string, format: string ): void {
    const absPath = resolve( filePath );
    if ( !existsSync( absPath ) ) {
        exitError( `File not found: ${absPath}` );
    }
    let raw: Record<string, unknown>;
    try {
        raw = JSON.parse( readFileSync( absPath, 'utf-8' ) );
    } catch {
        exitError( `Invalid JSON in file: ${absPath}` );
    }
    const snapshot = normalizeSnapshot( raw );

    output( snapshot, format );
}

// ---------------------------------------------------------------------------
// Public API — runCli
// ---------------------------------------------------------------------------

/**
 * Run the OOS CLI.
 *
 * Called by @open-operational-state/oos's thin entrypoint.
 * Parses process.argv and dispatches to the appropriate command.
 */
export async function runCli(): Promise<void> {
    const { flags, positional } = parseArgs( process.argv.slice( 2 ) );

    const command = positional[0];
    const target = positional[1];
    const format = flags.format || 'json';

    if ( flags.help || !command ) {
        showHelp();
        process.exit( 0 );
    }

    switch ( command ) {
        case 'validate':
            if ( !target ) { exitError( 'validate requires a file path' ); }
            await cmdValidate( target, format );
            break;

        case 'probe':
            if ( !target ) { exitError( 'probe requires a URL' ); }
            await cmdProbe( target, format );
            break;

        case 'fixtures':
            if ( !target ) { exitError( 'fixtures requires a directory path' ); }
            cmdFixtures( target, format );
            break;

        case 'inspect':
            if ( !target ) { exitError( 'inspect requires a file path' ); }
            cmdInspect( target, format );
            break;

        default:
            exitError( `Unknown command: ${command}` );
    }
}
