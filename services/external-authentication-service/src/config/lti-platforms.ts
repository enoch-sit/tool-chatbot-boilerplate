import { LTIPlatform } from '../types/lti.types';

export const registeredPlatforms: LTIPlatform[] = [
  {
    issuer: 'https://your-moodle.edu',
    clientId: 'your-client-id',
    authUrl: 'https://your-moodle.edu/mod/lti/auth.php',
    tokenUrl: 'https://your-moodle.edu/mod/lti/token.php',
    jwksUrl: 'https://your-moodle.edu/.well-known/jwks.json',
    deploymentIds: ['1', '2', '3']
  },
  // Add more platforms as needed
  {
    issuer: 'https://demo-moodle.example.com',
    clientId: 'demo-client-id',
    authUrl: 'https://demo-moodle.example.com/mod/lti/auth.php',
    tokenUrl: 'https://demo-moodle.example.com/mod/lti/token.php',
    jwksUrl: 'https://demo-moodle.example.com/.well-known/jwks.json',
    deploymentIds: ['demo-deployment-1']
  }
];

/**
 * Find platform by issuer
 */
export function findPlatformByIssuer(issuer: string): LTIPlatform | undefined {
  return registeredPlatforms.find(platform => platform.issuer === issuer);
}

/**
 * Find platform by client ID
 */
export function findPlatformByClientId(clientId: string): LTIPlatform | undefined {
  return registeredPlatforms.find(platform => platform.clientId === clientId);
}

/**
 * Validate deployment ID for platform
 */
export function isValidDeploymentId(issuer: string, deploymentId: string): boolean {
  const platform = findPlatformByIssuer(issuer);
  return platform ? platform.deploymentIds.includes(deploymentId) : false;
}

/**
 * Get all registered issuers
 */
export function getRegisteredIssuers(): string[] {
  return registeredPlatforms.map(platform => platform.issuer);
}
