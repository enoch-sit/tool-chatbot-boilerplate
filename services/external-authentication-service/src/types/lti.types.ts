export interface LTIClaims {
  iss: string;                    // Issuer (Moodle URL)
  aud: string;                    // Audience (our tool)
  exp: number;                    // Expiration
  iat: number;                    // Issued at
  nonce: string;                  // Nonce
  sub: string;                    // User ID
  name: string;                   // User name
  email: string;                  // User email
  roles: string[];                // LTI roles
  'https://purl.imsglobal.org/spec/lti/claim/context': {
    id: string;                   // Course ID
    title: string;                // Course title
  };
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
    id: string;                   // Resource link ID
    title: string;                // Resource title
  };
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
  'https://purl.imsglobal.org/spec/lti/claim/version': string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
}

export interface LTIValidationResult {
  valid: boolean;
  claims?: LTIClaims;
  error?: string;
}

export interface LTILaunchResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  redirect_url?: string;
  error?: string;
}

export interface LTIPlatform {
  issuer: string;
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  deploymentIds: string[];
}

export interface OIDCLoginRequest {
  iss: string;                    // Issuer
  target_link_uri: string;        // Target resource URL
  login_hint: string;             // User identifier
  lti_message_hint?: string;      // Message hint
  client_id: string;              // Tool client ID
  deployment_id: string;          // Deployment ID
}

export interface OIDCLoginResponse {
  redirect_url: string;
}

export interface JWKSResponse {
  keys: JWK[];
}

export interface JWK {
  kty: string;                    // Key type (RSA)
  use: string;                    // Usage (sig)
  kid: string;                    // Key ID
  n: string;                      // RSA modulus
  e: string;                      // RSA exponent
  alg: string;                    // Algorithm (RS256)
}
