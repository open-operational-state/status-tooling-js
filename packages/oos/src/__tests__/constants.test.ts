/**
 * Constants tests
 */

import { describe, expect, test } from 'bun:test';
import {
    Condition,
    Profile,
    Exposure,
    Serialization,
    ProvenanceType,
    Role,
} from '../constants.js';

describe( 'Condition', () => {
    test( 'contains all health orderable values', () => {
        expect( Condition.OPERATIONAL ).toBe( 'operational' );
        expect( Condition.DEGRADED ).toBe( 'degraded' );
        expect( Condition.PARTIAL_OUTAGE ).toBe( 'partial-outage' );
        expect( Condition.MAJOR_OUTAGE ).toBe( 'major-outage' );
        expect( Condition.DOWN ).toBe( 'down' );
    } );

    test( 'contains all health categorical values', () => {
        expect( Condition.MAINTENANCE ).toBe( 'maintenance' );
        expect( Condition.UNKNOWN ).toBe( 'unknown' );
    } );

    test( 'contains all liveness values', () => {
        expect( Condition.ALIVE ).toBe( 'alive' );
        expect( Condition.UNREACHABLE ).toBe( 'unreachable' );
    } );

    test( 'contains all readiness values', () => {
        expect( Condition.READY ).toBe( 'ready' );
        expect( Condition.INITIALIZING ).toBe( 'initializing' );
        expect( Condition.NOT_READY ).toBe( 'not-ready' );
    } );
} );

describe( 'Profile', () => {
    test( 'contains all profile identifiers', () => {
        expect( Profile.LIVENESS ).toBe( 'liveness' );
        expect( Profile.READINESS ).toBe( 'readiness' );
        expect( Profile.HEALTH ).toBe( 'health' );
        expect( Profile.STATUS ).toBe( 'status' );
    } );
} );

describe( 'Exposure', () => {
    test( 'contains all exposure tiers', () => {
        expect( Exposure.CONDITION_ONLY ).toBe( 'condition-only' );
        expect( Exposure.CONDITION_METADATA ).toBe( 'condition-metadata' );
        expect( Exposure.COMPONENT_LEVEL ).toBe( 'component-level' );
        expect( Exposure.FULL_DIAGNOSTIC ).toBe( 'full-diagnostic' );
    } );
} );

describe( 'Serialization', () => {
    test( 'contains format names and media types', () => {
        expect( Serialization.HEALTH_RESPONSE ).toBe( 'health-response' );
        expect( Serialization.SERVICE_STATUS ).toBe( 'service-status' );
        expect( Serialization.HEALTH_RESPONSE_MEDIA_TYPE ).toBe( 'application/health+json' );
        expect( Serialization.SERVICE_STATUS_MEDIA_TYPE ).toBe( 'application/status+json' );
    } );
} );

describe( 'ProvenanceType', () => {
    test( 'contains all provenance types', () => {
        expect( ProvenanceType.SELF_REPORTED ).toBe( 'self-reported' );
        expect( ProvenanceType.EXTERNALLY_OBSERVED ).toBe( 'externally-observed' );
        expect( ProvenanceType.DERIVED ).toBe( 'derived' );
        expect( ProvenanceType.MANUALLY_DECLARED ).toBe( 'manually-declared' );
    } );
} );

describe( 'Role', () => {
    test( 'contains all check roles', () => {
        expect( Role.COMPONENT ).toBe( 'component' );
        expect( Role.DEPENDENCY ).toBe( 'dependency' );
    } );
} );
