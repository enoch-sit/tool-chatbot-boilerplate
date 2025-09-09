import jwt from 'jsonwebtoken';
import { LTIClaims, LTIValidationResult, LTIPlatform } from '../types/lti.types';
import { registeredPlatforms } from '../config/lti-platforms.js';

class LTIValidationService {
  /**
   * Validate LTI 1.3 token
   */
  async validateLTIToken(idToken: string): Promise<LTIValidationResult> {
    try {
      // 1. Decode JWT without verification to get header and payload
      const unverifiedPayload = jwt.decode(idToken, { complete: true });
      
      if (!unverifiedPayload || typeof unverifiedPayload === 'string') {
        return { valid: false, error: 'Invalid token format' };
      }

      const payload = unverifiedPayload.payload as any;
      const header = unverifiedPayload.header;

      // 2. Validate issuer
      const isValidIssuer = await this.validateIssuer(payload.iss);
      if (!isValidIssuer) {
        return { valid: false, error: 'Invalid or unregistered issuer' };
      }

      // 3. Validate audience
      if (!this.validateAudience(payload.aud)) {
        return { valid: false, error: 'Invalid audience' };
      }

      // 4. Validate nonce
      const isValidNonce = await this.validateNonce(payload.nonce);
      if (!isValidNonce) {
        return { valid: false, error: 'Invalid or reused nonce' };
      }

      // 5. Get platform public key and verify signature
      const platform = this.findPlatformByIssuer(payload.iss);
      if (!platform) {
        return { valid: false, error: 'Platform not found' };
      }

      // For now, we'll skip signature verification and implement it in Phase 4
      // TODO: Implement JWT signature verification with platform public keys
      console.warn('⚠️ JWT signature verification not yet implemented - Phase 4 task');

      // 6. Validate required LTI claims
      const validationResult = this.validateLTIClaims(payload);
      if (!validationResult.valid) {
        return validationResult;
      }

      return {
        valid: true,
        claims: payload as LTIClaims
      };

    } catch (error) {
      console.error('LTI token validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Validate nonce to prevent replay attacks
   */
  async validateNonce(nonce: string): Promise<boolean> {
    // TODO: Implement proper nonce validation in Phase 4
    // For now, just check if nonce exists
    if (!nonce || nonce.length < 10) {
      return false;
    }
    
    // In Phase 4, we'll implement:
    // 1. Check if nonce already used (redis/memory store)
    // 2. Store nonce with expiration
    // 3. Clean up expired nonces
    console.warn('⚠️ Nonce replay protection not yet implemented - Phase 4 task');
    return true;
  }

  /**
   * Validate issuer against registered platforms
   */
  async validateIssuer(issuer: string): Promise<boolean> {
    if (!issuer) return false;
    
    const platform = this.findPlatformByIssuer(issuer);
    return platform !== undefined;
  }

  /**
   * Validate audience
   */
  private validateAudience(audience: string | string[]): boolean {
    const expectedAudience = process.env.LTI_AUDIENCE || 'https://your-tool-domain.com';
    
    if (Array.isArray(audience)) {
      return audience.includes(expectedAudience);
    }
    
    return audience === expectedAudience;
  }

  /**
   * Find platform configuration by issuer
   */
  private findPlatformByIssuer(issuer: string): LTIPlatform | undefined {
    return registeredPlatforms.find((platform: LTIPlatform) => platform.issuer === issuer);
  }

  /**
   * Validate required LTI claims
   */
  private validateLTIClaims(payload: any): LTIValidationResult {
    const requiredClaims = [
      'iss', 'aud', 'exp', 'iat', 'nonce', 'sub', 'email'
    ];

    const requiredLTIClaims = [
      'https://purl.imsglobal.org/spec/lti/claim/context',
      'https://purl.imsglobal.org/spec/lti/claim/resource_link',
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
      'https://purl.imsglobal.org/spec/lti/claim/target_link_uri',
      'https://purl.imsglobal.org/spec/lti/claim/version',
      'https://purl.imsglobal.org/spec/lti/claim/message_type'
    ];

    // Check required standard claims
    for (const claim of requiredClaims) {
      if (!payload[claim]) {
        return { valid: false, error: `Missing required claim: ${claim}` };
      }
    }

    // Check required LTI claims
    for (const claim of requiredLTIClaims) {
      if (!payload[claim]) {
        return { valid: false, error: `Missing required LTI claim: ${claim}` };
      }
    }

    // Validate token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    // Validate issued at time (not too far in the future)
    if (payload.iat > now + 300) { // 5 minutes tolerance
      return { valid: false, error: 'Token issued in the future' };
    }

    // Validate LTI version
    const ltiVersion = payload['https://purl.imsglobal.org/spec/lti/claim/version'];
    if (ltiVersion !== '1.3.0') {
      return { valid: false, error: `Unsupported LTI version: ${ltiVersion}` };
    }

    // Validate message type
    const messageType = payload['https://purl.imsglobal.org/spec/lti/claim/message_type'];
    const supportedTypes = [
      'LtiResourceLinkRequest',
      'LtiDeepLinkingRequest'
    ];
    
    if (!supportedTypes.includes(messageType)) {
      return { valid: false, error: `Unsupported message type: ${messageType}` };
    }

    return { valid: true };
  }

  /**
   * Extract user information from LTI claims
   */
  extractUserInfo(claims: LTIClaims) {
    return {
      sub: claims.sub,
      name: claims.name || claims.email.split('@')[0],
      email: claims.email,
      roles: claims.roles || [],
      courseId: claims['https://purl.imsglobal.org/spec/lti/claim/context']?.id,
      courseTitle: claims['https://purl.imsglobal.org/spec/lti/claim/context']?.title,
      resourceLinkId: claims['https://purl.imsglobal.org/spec/lti/claim/resource_link']?.id,
      deploymentId: claims['https://purl.imsglobal.org/spec/lti/claim/deployment_id']
    };
  }
}

export const ltiValidationService = new LTIValidationService();
