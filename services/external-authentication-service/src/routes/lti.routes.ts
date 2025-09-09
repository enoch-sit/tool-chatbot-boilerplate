import { Router } from 'express';
import { ltiService } from '../services/lti.service';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// LTI 1.3 Launch endpoint
router.post('/launch', ltiService.handleLTILaunch);

// LTI user sync endpoint  
router.post('/user-sync', authenticate, ltiService.syncLTIUser);

// Course-specific settings
router.get('/course/:id', authenticate, ltiService.getCourseSettings);

// Deep linking endpoint
router.post('/deep-link', ltiService.handleDeepLinking);

// JWKS endpoint for platform verification
router.get('/.well-known/jwks.json', ltiService.getJWKS);

// OIDC login initiation endpoint
router.post('/login', ltiService.handleOIDCLogin);

export default router;
