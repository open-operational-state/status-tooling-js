#!/usr/bin/env node

/**
 * Release script for @open-operational-state packages.
 *
 * Usage:
 *   node scripts/release.js <patch|minor|major>
 *   node scripts/release.js 0.2.0
 *
 * What it does:
 *   1. Validates the working tree is clean
 *   2. Bumps all packages to the same version
 *   3. Updates internal dependency references
 *   4. Builds all packages
 *   5. Runs all tests
 *   6. Publishes to npm (with --dry-run unless --publish is passed)
 *   7. Commits and tags
 *
 * All packages always share the same version number.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve( import.meta.dir, '..' );

const PACKAGES = [
    'types',
    'core',
    'parser',
    'emitter',
    'validator',
    'discovery',
];

const SCOPE = '@open-operational-state';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run( cmd, opts = {} ) {
    console.log( `  $ ${cmd}` );
    return execSync( cmd, { cwd: ROOT, stdio: 'inherit', ...opts } );
}

function readPkg( name ) {
    const path = join( ROOT, 'packages', name, 'package.json' );
    return { path, data: JSON.parse( readFileSync( path, 'utf-8' ) ) };
}

function writePkg( path, data ) {
    writeFileSync( path, JSON.stringify( data, null, 2 ) + '\n' );
}

function bumpVersion( current, bump ) {
    const [ major, minor, patch ] = current.split( '.' ).map( Number );
    switch ( bump ) {
        case 'patch': return `${major}.${minor}.${patch + 1}`;
        case 'minor': return `${major}.${minor + 1}.0`;
        case 'major': return `${major + 1}.0.0`;
        default:
            // Treat as explicit version
            if ( /^\d+\.\d+\.\d+$/.test( bump ) ) { return bump; }
            throw new Error( `Invalid version or bump type: ${bump}` );
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice( 2 );
const bump = args[0];
const doPublish = args.includes( '--publish' );

if ( !bump || bump === '--help' ) {
    console.log( 'Usage: node scripts/release.js <patch|minor|major|x.y.z> [--publish]' );
    console.log( '' );
    console.log( 'Without --publish, runs npm publish --dry-run.' );
    process.exit( 0 );
}

// 1. Check clean working tree
try {
    const status = execSync( 'git status --porcelain', { cwd: ROOT, encoding: 'utf-8' } ).trim();
    if ( status ) {
        console.error( '❌ Working tree is not clean. Commit or stash changes first.' );
        console.error( status );
        process.exit( 1 );
    }
} catch {
    console.error( '❌ Failed to check git status' );
    process.exit( 1 );
}

// 2. Determine new version
const currentVersion = readPkg( 'types' ).data.version;
const newVersion = bumpVersion( currentVersion, bump );
console.log( `\n📦 Releasing: ${currentVersion} → ${newVersion}\n` );

// 3. Bump all package.json files
for ( const name of PACKAGES ) {
    const { path, data } = readPkg( name );
    data.version = newVersion;

    // Update internal dependency references
    if ( data.dependencies ) {
        for ( const dep of Object.keys( data.dependencies ) ) {
            if ( dep.startsWith( SCOPE + '/' ) ) {
                data.dependencies[dep] = `^${newVersion}`;
            }
        }
    }
    if ( data.devDependencies ) {
        for ( const dep of Object.keys( data.devDependencies ) ) {
            if ( dep.startsWith( SCOPE + '/' ) ) {
                data.devDependencies[dep] = `^${newVersion}`;
            }
        }
    }

    writePkg( path, data );
    console.log( `  ✓ ${SCOPE}/${name} → ${newVersion}` );
}

// 4. Build
console.log( '\n🔨 Building...\n' );
run( 'bun run build' );

// 5. Test
console.log( '\n🧪 Testing...\n' );
run( 'bun run test' );

// 6. Publish
console.log( `\n📤 Publishing${doPublish ? '' : ' (dry-run)'}...\n` );
const publishFlag = doPublish ? '' : ' --dry-run';
for ( const name of PACKAGES ) {
    const pkgDir = join( ROOT, 'packages', name );
    console.log( `  → ${SCOPE}/${name}` );
    run( `npm publish --auth-type=legacy${publishFlag}`, { cwd: pkgDir } );
}

// 7. Commit and tag (only if actually publishing)
if ( doPublish ) {
    console.log( '\n🏷️  Committing and tagging...\n' );
    run( 'git add packages/*/package.json' );
    run( `git commit -m "chore(release): v${newVersion}"` );
    run( `git tag -a v${newVersion} -m "v${newVersion}"` );
    run( 'git push && git push --tags' );
    console.log( `\n✅ Released v${newVersion}\n` );
} else {
    console.log( `\n✅ Dry run complete. To publish for real:\n` );
    console.log( `  node scripts/release.js ${bump} --publish\n` );
}
