/**
 * Well-Known Path Resolution
 *
 * Fetch and validate discovery documents from /.well-known/operational-state
 */

import type {
    DiscoveryDocument,
    ValidationResult,
    ValidationError,
    ValidationWarning,
} from '@open-operational-state/types';

import { isProfileId } from '@open-operational-state/types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the discovery document from /.well-known/operational-state.
 *
 * Returns null if the endpoint is not available or returns invalid data.
 */
export async function fetchDiscoveryDocument(
    baseUrl: string,
): Promise<DiscoveryDocument | null> {
    const url = new URL( '/.well-known/operational-state', baseUrl ).href;

    try {
        const response = await fetch( url );
        if ( !response.ok ) { return null; }

        const body = await response.json();
        const validation = validateDiscoveryDocument( body );

        if ( !validation.valid ) { return null; }

        return body as DiscoveryDocument;
    } catch {
        return null;
    }
}

/**
 * Validate the structure of a discovery document.
 */
export function validateDiscoveryDocument( doc: unknown ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if ( !doc || typeof doc !== 'object' || Array.isArray( doc ) ) {
        errors.push( {
            path: '',
            message: 'Discovery document must be a non-null object',
            code: 'DISCOVERY_INVALID_TYPE',
        } );
        return { valid: false, errors, warnings };
    }

    const obj = doc as Record<string, unknown>;

    // version
    if ( obj.version !== '1.0' ) {
        errors.push( {
            path: 'version',
            message: `Discovery document version must be '1.0', got '${obj.version}'`,
            code: 'DISCOVERY_INVALID_VERSION',
        } );
    }

    // subject
    if ( !obj.subject || typeof obj.subject !== 'object' || Array.isArray( obj.subject ) ) {
        errors.push( {
            path: 'subject',
            message: 'Discovery document must have a subject object',
            code: 'DISCOVERY_MISSING_SUBJECT',
        } );
    } else {
        const subject = obj.subject as Record<string, unknown>;
        if ( typeof subject.id !== 'string' || !subject.id ) {
            errors.push( {
                path: 'subject.id',
                message: 'Discovery document subject must have an id',
                code: 'DISCOVERY_MISSING_SUBJECT_ID',
            } );
        }
    }

    // resources
    if ( !Array.isArray( obj.resources ) ) {
        errors.push( {
            path: 'resources',
            message: 'Discovery document must have a resources array',
            code: 'DISCOVERY_MISSING_RESOURCES',
        } );
    } else {
        for ( let i = 0; i < obj.resources.length; i++ ) {
            const resource = obj.resources[i] as Record<string, unknown>;

            if ( typeof resource.href !== 'string' || !resource.href ) {
                errors.push( {
                    path: `resources[${i}].href`,
                    message: `Resource ${i} must have an href`,
                    code: 'DISCOVERY_MISSING_HREF',
                } );
            }

            if ( !Array.isArray( resource.profiles ) || resource.profiles.length === 0 ) {
                errors.push( {
                    path: `resources[${i}].profiles`,
                    message: `Resource ${i} must have a non-empty profiles array`,
                    code: 'DISCOVERY_MISSING_PROFILES',
                } );
            } else {
                for ( const p of resource.profiles ) {
                    if ( typeof p === 'string' && !isProfileId( p ) ) {
                        warnings.push( {
                            path: `resources[${i}].profiles`,
                            message: `Unknown profile identifier: '${p}'`,
                            code: 'DISCOVERY_UNKNOWN_PROFILE',
                        } );
                    }
                }
            }

            if ( typeof resource.serialization !== 'string' || !resource.serialization ) {
                errors.push( {
                    path: `resources[${i}].serialization`,
                    message: `Resource ${i} must have a serialization`,
                    code: 'DISCOVERY_MISSING_SERIALIZATION',
                } );
            }

            // auth is RECOMMENDED, not REQUIRED — only warn
            if ( resource.auth !== undefined && resource.auth !== 'none' && resource.auth !== 'required' ) {
                warnings.push( {
                    path: `resources[${i}].auth`,
                    message: `Resource ${i} auth should be 'none' or 'required', got '${resource.auth}'`,
                    code: 'DISCOVERY_INVALID_AUTH',
                } );
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}
