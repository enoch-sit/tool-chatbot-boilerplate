import { Request, Response } from 'express';
import { authService } from '../auth/auth.service';
import { ltiValidationService } from './lti-validation.service';
import { ltiCreditService } from './lti-credit.service';
import { ltiRoleMapper } from './lti-role-mapper.service';
import { tokenService } from '../auth/token.service';
import { 
  LTIClaims, 
  LTILaunchResponse, 
  OIDCLoginRequest, 
  OIDCLoginResponse,
  JWKSResponse 
} from '../types/lti.types';

class LTIService {
  /**
   * Handle LTI 1.3 launch request
   */
  async handleLTILaunch(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚀 LTI Launch Request received:', req.body);

      const { id_token, state } = req.body;

      if (!id_token) {
        res.status(400).json({
          success: false,
          error: 'Missing id_token parameter'
        } as LTILaunchResponse);
        return;
      }

      // 1. Validate LTI token
      const validationResult = await ltiValidationService.validateLTIToken(id_token);
      
      if (!validationResult.valid || !validationResult.claims) {
        res.status(401).json({
          success: false,
          error: `LTI validation failed: ${validationResult.error}`
        } as LTILaunchResponse);
        return;
      }

      const claims = validationResult.claims;
      console.log('✅ LTI token validated successfully');

      // 2. Extract user information
      const userInfo = ltiValidationService.extractUserInfo(claims);
      console.log('👤 User info extracted:', userInfo);

      // 3. Map LTI roles to internal roles
      const internalRole = ltiRoleMapper.mapLTIRoleToInternal(userInfo.roles);
      ltiRoleMapper.logRoleMapping(userInfo.roles, internalRole);

      // 4. Create/sync user using existing authService
      let userResult;
      try {
        userResult = await authService.adminCreateUser(
          userInfo.name,
          userInfo.email,
          this.generateSecurePassword(), // Generate random password for LTI users
          internalRole,
          true // skipVerification for LTI users
        );

        console.log('👤 User created/synced:', userResult);
      } catch (error) {
        console.error('❌ User creation failed:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create/sync user account'
        } as LTILaunchResponse);
        return;
      }

      // 5. Allocate credits if user creation was successful
      if (userResult.success && userInfo.courseId) {
        try {
          await ltiCreditService.allocateLTICredits(
            userInfo.email,
            userInfo.courseId,
            internalRole,
            userInfo.deploymentId
          );
          console.log('💳 Credits allocated successfully');
        } catch (creditError) {
          console.error('⚠️ Credit allocation failed:', creditError);
          // Don't fail the entire login for credit allocation failure
        }
      }

      // 6. Generate JWT tokens for the user
      const accessToken = tokenService.generateAccessToken(
        userResult.userId || userInfo.sub,
        userInfo.name,
        userInfo.email,
        internalRole
      );

      const refreshToken = await tokenService.generateRefreshToken(
        userResult.userId || userInfo.sub,
        userInfo.name,
        userInfo.email,
        internalRole
      );

      // 7. Determine redirect URL
      const redirectUrl = this.buildRedirectUrl(userInfo.courseId, claims);

      console.log('🎯 LTI launch successful, redirecting to:', redirectUrl);

      // 8. Return successful response
      res.json({
        success: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        redirect_url: redirectUrl
      } as LTILaunchResponse);

    } catch (error) {
      console.error('❌ LTI launch error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      } as LTILaunchResponse);
    }
  }

  /**
   * Handle OIDC login initiation
   */
  async handleOIDCLogin(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 OIDC Login Request:', req.body);

      const loginRequest: OIDCLoginRequest = req.body;

      // Validate required parameters
      const required = ['iss', 'target_link_uri', 'login_hint', 'client_id'];
      for (const param of required) {
        if (!loginRequest[param as keyof OIDCLoginRequest]) {
          res.status(400).json({
            error: `Missing required parameter: ${param}`
          });
          return;
        }
      }

      // Build authorization redirect URL
      const authUrl = this.buildAuthorizationUrl(loginRequest);

      console.log('🔗 Redirecting to authorization URL:', authUrl);

      res.json({
        redirect_url: authUrl
      } as OIDCLoginResponse);

    } catch (error) {
      console.error('❌ OIDC login error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Handle LTI user sync (for existing users)
   */
  async syncLTIUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, courseId } = req.body;
      
      if (!email || !courseId) {
        res.status(400).json({
          success: false,
          error: 'Missing email or courseId'
        });
        return;
      }

      // TODO: Implement user sync logic
      // This could update user course associations, refresh credits, etc.
      
      res.json({
        success: true,
        message: 'User sync completed'
      });

    } catch (error) {
      console.error('❌ User sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      });
    }
  }

  /**
   * Get course-specific settings
   */
  async getCourseSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id: courseId } = req.params;

      // TODO: Implement course settings retrieval
      // This could include course-specific configurations, available tools, etc.

      res.json({
        courseId,
        settings: {
          creditsEnabled: true,
          defaultCredits: 1000,
          maxCredits: 10000,
          features: ['chat', 'flowise']
        }
      });

    } catch (error) {
      console.error('❌ Get course settings error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get settings'
      });
    }
  }

  /**
   * Handle deep linking requests
   */
  async handleDeepLinking(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔗 Deep linking request:', req.body);

      // TODO: Implement deep linking logic
      // This allows the tool to return content items to the platform

      res.json({
        success: true,
        message: 'Deep linking not yet implemented'
      });

    } catch (error) {
      console.error('❌ Deep linking error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Deep linking failed'
      });
    }
  }

  /**
   * Provide JWKS endpoint for platform verification
   */
  async getJWKS(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement JWKS endpoint in Phase 4
      // This should return the public keys for JWT verification

      const jwks: JWKSResponse = {
        keys: [
          // TODO: Add actual public keys
        ]
      };

      res.json(jwks);

    } catch (error) {
      console.error('❌ JWKS error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'JWKS failed'
      });
    }
  }

  /**
   * Generate secure random password for LTI users
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Build redirect URL after successful authentication
   */
  private buildRedirectUrl(courseId?: string, claims?: LTIClaims): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const targetUri = claims?.['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'];
    
    // If target_link_uri is provided, use it
    if (targetUri) {
      return targetUri;
    }
    
    // Otherwise, build URL with course context
    let redirectUrl = `${baseUrl}/chat`;
    
    if (courseId) {
      redirectUrl += `?course=${encodeURIComponent(courseId)}`;
    }
    
    return redirectUrl;
  }

  /**
   * Build authorization URL for OIDC flow
   */
  private buildAuthorizationUrl(loginRequest: OIDCLoginRequest): string {
    const params = new URLSearchParams({
      response_type: 'id_token',
      scope: 'openid',
      client_id: loginRequest.client_id,
      redirect_uri: loginRequest.target_link_uri,
      login_hint: loginRequest.login_hint,
      state: this.generateState(),
      nonce: this.generateNonce(),
      prompt: 'none'
    });

    if (loginRequest.lti_message_hint) {
      params.append('lti_message_hint', loginRequest.lti_message_hint);
    }

    // TODO: Get platform auth URL from platform configuration
    const authUrl = 'https://platform.edu/auth'; // This should come from platform config
    
    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Generate state parameter for OIDC
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate nonce parameter for OIDC
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString();
  }
}

export const ltiService = new LTIService();
