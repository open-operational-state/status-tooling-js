/**
 * createLifecycle() tests
 */

import { describe, expect, test } from 'bun:test';
import { createLifecycle } from '../lifecycle.js';

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

describe( 'phase transitions', () => {
    test( 'starts in initializing phase', () => {
        const lifecycle = createLifecycle( { handleSignals: false, exitCode: null } );
        expect( lifecycle.phase ).toBe( 'initializing' );
    } );

    test( 'transitions to ready on markReady()', () => {
        const lifecycle = createLifecycle( { handleSignals: false, exitCode: null } );
        lifecycle.markReady();
        expect( lifecycle.phase ).toBe( 'ready' );
    } );

    test( 'markReady is idempotent', () => {
        const lifecycle = createLifecycle( { handleSignals: false, exitCode: null } );
        lifecycle.markReady();
        lifecycle.markReady();
        expect( lifecycle.phase ).toBe( 'ready' );
    } );

    test( 'transitions to shutting-down on shutdown()', async () => {
        const lifecycle = createLifecycle( {
            handleSignals: false,
            exitCode: null,
            drainDelayMs: 0,
        } );
        lifecycle.markReady();

        // Don't await — just trigger the transition
        const promise = lifecycle.shutdown();
        expect( lifecycle.phase ).toBe( 'shutting-down' );
        await promise;
    } );

    test( 'markReady does not transition back from shutting-down', async () => {
        const lifecycle = createLifecycle( {
            handleSignals: false,
            exitCode: null,
            drainDelayMs: 0,
        } );
        const promise = lifecycle.shutdown();
        lifecycle.markReady();
        expect( lifecycle.phase ).toBe( 'shutting-down' );
        await promise;
    } );
} );

// ---------------------------------------------------------------------------
// conditionProvider
// ---------------------------------------------------------------------------

describe( 'conditionProvider', () => {
    test( 'returns initializing before markReady', () => {
        const lifecycle = createLifecycle( { handleSignals: false, exitCode: null } );
        expect( lifecycle.conditionProvider() ).toBe( 'initializing' );
    } );

    test( 'returns operational after markReady', () => {
        const lifecycle = createLifecycle( { handleSignals: false, exitCode: null } );
        lifecycle.markReady();
        expect( lifecycle.conditionProvider() ).toBe( 'operational' );
    } );

    test( 'returns not-ready during shutdown', async () => {
        const lifecycle = createLifecycle( {
            handleSignals: false,
            exitCode: null,
            drainDelayMs: 0,
        } );
        lifecycle.markReady();
        const promise = lifecycle.shutdown();
        expect( lifecycle.conditionProvider() ).toBe( 'not-ready' );
        await promise;
    } );
} );

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

describe( 'shutdown', () => {
    test( 'calls onShutdown callback', async () => {
        let called = false;
        const lifecycle = createLifecycle( {
            handleSignals: false,
            exitCode: null,
            drainDelayMs: 0,
            onShutdown: async () => { called = true; },
        } );

        await lifecycle.shutdown();
        expect( called ).toBe( true );
    } );

    test( 'shutdown is idempotent', async () => {
        let callCount = 0;
        const lifecycle = createLifecycle( {
            handleSignals: false,
            exitCode: null,
            drainDelayMs: 0,
            onShutdown: async () => { callCount++; },
        } );

        await Promise.all( [ lifecycle.shutdown(), lifecycle.shutdown() ] );
        expect( callCount ).toBe( 1 );
    } );

    test( 'handles onShutdown errors gracefully', async () => {
        const lifecycle = createLifecycle( {
            handleSignals: false,
            exitCode: null,
            drainDelayMs: 0,
            onShutdown: async () => { throw new Error( 'cleanup failed' ); },
        } );

        // Should not throw
        await expect( lifecycle.shutdown() ).resolves.toBeUndefined();
    } );

    test( 'respects drain delay', async () => {
        const start = performance.now();
        const lifecycle = createLifecycle( {
            handleSignals: false,
            exitCode: null,
            drainDelayMs: 50,
        } );

        await lifecycle.shutdown();
        const elapsed = performance.now() - start;
        expect( elapsed ).toBeGreaterThanOrEqual( 40 ); // Allow 10ms tolerance
    } );
} );
