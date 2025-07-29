# LTI Integration Implementation TODO

## Phase 1: Core LTI Route Implementation ✅ COMPLETED

### 1. Create LTI Routes Module
**Location**: `services/external-authentication-service/src/routes/lti.routes.ts`
**Status**: ✅ Completed

✅ **File Created**: LTI routes with endpoints for launch, user-sync, course settings, deep linking, JWKS, and OIDC login

```typescript
// TODO: Create new file
import { Router } from 'express';
import { ltiService } from '../services/lti.service';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

// LTI 1.3 Launch endpoint
router.post('/launch', ltiService.handleLTILaunch);

// LTI user sync endpoint  
router.post('/user-sync', requireAuth, ltiService.syncLTIUser);

// Course-specific settings
router.get('/course/:id', requireAuth, ltiService.getCourseSettings);

// Deep linking endpoint
router.post('/deep-link', ltiService.handleDeepLinking);

export default router;
```

### 2. Create LTI Service Implementation
**Location**: `services/external-authentication-service/src/services/lti.service.ts`
**Status**: ✅ Completed

✅ **File Created**: Complete LTI service with handleLTILaunch, OIDC login, user sync, course settings, deep linking, and JWKS endpoints

### 3. Create LTI Validation Service
**Location**: `services/external-authentication-service/src/services/lti-validation.service.ts`
**Status**: ✅ Completed

✅ **File Created**: LTI 1.3 token validation with claims validation, issuer checking, audience validation, and user info extraction

### 4. Create LTI Types Definition
**Location**: `services/external-authentication-service/src/types/lti.types.ts`
**Status**: ✅ Completed

✅ **File Created**: Complete TypeScript interfaces for LTI claims, validation results, platform configuration, and API responses

### 5. Create LTI Role Mapper Service
**Location**: `services/external-authentication-service/src/services/lti-role-mapper.service.ts`
**Status**: ✅ Completed

✅ **File Created**: Role mapping service with priority-based role selection, fuzzy matching, and credit multipliers

### 6. Create LTI Credit Service
**Location**: `services/external-authentication-service/src/services/lti-credit.service.ts`
**Status**: ✅ Completed

✅ **File Created**: Credit allocation service with role-based policies, course-specific multipliers, and accounting service integration

### 7. Update Main Routes File
**Location**: `services/external-authentication-service/src/routes/index.ts`
**Status**: ✅ Completed

✅ **Updated**: Added LTI routes import and registration at `/auth/lti` endpoint

## Phase 2: Package Dependencies & Configuration ✅ COMPLETED

### 8. Update Package Dependencies
**Location**: `services/external-authentication-service/package.json`
**Status**: ✅ Completed

✅ **Updated**: Added axios to dependencies, added node-jose and @types/node-jose for JWT/JWK handling

### 9. Environment Configuration
**Location**: `services/external-authentication-service/.env.development`
**Status**: ✅ Completed

✅ **Updated**: Added LTI environment variables including issuer whitelist, audience, JWKS URL, accounting service URL, frontend URL, and course credit multipliers

## Phase 3: Integration Points

### 10. Verify Accounting Service Integration
**Location**: `services/accounting-service/src/routes/credits.routes.ts`
**Status**: ✅ Already Exists - Verify endpoint

```typescript
// TODO: Verify this endpoint exists and works:
// POST /api/credits/allocate-by-email
// Expected request body: { email, credits, expiryDays, notes }
```

### 11. Test Flowise Proxy Auto-Sync
**Location**: `services/flowise-proxy-service-py/app/auth/middleware.py`
**Status**: ✅ Already Exists - Test LTI tokens

```python
# TODO: Test that ensure_user_exists_locally works with LTI-generated JWT tokens
# Location: Lines 21-65 in middleware.py
# Verify JWT payload structure compatibility
```

### 12. Test Accounting Service Auto-Sync  
**Location**: `services/accounting-service/src/middleware/jwt.middleware.ts`
**Status**: ✅ Already Exists - Test LTI tokens

```typescript
// TODO: Test that UserAccountService.findOrCreateUser works with LTI users
// Location: Lines 64-113 in jwt.middleware.ts
// Verify JWT payload structure compatibility
```

## Phase 4: Security Implementation

### 13. Implement JWT Signature Validation
**Location**: `services/external-authentication-service/src/services/lti-validation.service.ts`
**Status**: ❌ Not Started

```typescript
// TODO: Add to LTIValidationService class
import { JWK } from 'node-jose';

async getplatformPublicKey(issuer: string, kid: string): Promise<JWK.Key> {
  // TODO: Implement JWKS endpoint fetching
  // 1. Fetch JWKS from platform
  // 2. Find key by kid
  // 3. Cache keys for performance
}

async verifyJWTSignature(token: string, publicKey: JWK.Key): Promise<boolean> {
  // TODO: Implement signature verification
}
```

### 14. Implement Nonce Management
**Location**: `services/external-authentication-service/src/services/nonce.service.ts`
**Status**: ❌ Not Started

```typescript
// TODO: Create new file for nonce management
class NonceService {
  private usedNonces = new Set<string>();

  async validateAndStoreNonce(nonce: string): Promise<boolean> {
    // TODO: Implement nonce validation
    // 1. Check if nonce already used
    // 2. Store nonce with expiration
    // 3. Clean up expired nonces
  }
}
```

### 15. Platform Registration Configuration
**Location**: `services/external-authentication-service/src/config/lti-platforms.ts`
**Status**: ✅ Completed

✅ **File Created**: Platform registration configuration with example platforms, utility functions for finding platforms, and deployment ID validation

## Phase 5: Testing Implementation

### 16. Create LTI Unit Tests
**Location**: `services/external-authentication-service/tests/lti/`
**Status**: ❌ Not Started

```typescript
// TODO: Create test files:
// - lti.service.test.ts
// - lti-validation.service.test.ts  
// - lti-role-mapper.service.test.ts
// - lti-credit.service.test.ts
```

### 17. Create Integration Tests
**Location**: `services/external-authentication-service/tests/integration/lti.integration.test.ts`
**Status**: ❌ Not Started

```typescript
// TODO: Create integration tests
// Test complete flow: LTI launch -> JWT generation -> service calls
```

## Phase 6: Documentation & Deployment

### 18. Create Moodle Configuration Guide
**Location**: `services/moodlelti-service/MOODLE_SETUP_GUIDE.md`
**Status**: ❌ Not Started

```markdown
# TODO: Document Moodle LTI 1.3 tool configuration
# Include: Tool URL, Login URL, Redirection URLs, Public key, etc.
```

### 19. Update Docker Configuration
**Location**: `services/external-authentication-service/docker-compose.yml`
**Status**: ❌ Not Started

```yaml
# TODO: Add LTI environment variables to docker configuration
```

### 20. Create Troubleshooting Guide
**Location**: `services/moodlelti-service/TROUBLESHOOTING.md`
**Status**: ❌ Not Started

```markdown
# TODO: Document common LTI integration issues and solutions
```

## Current Status Summary

### ✅ Completed (Analysis + Implementation Phase 1 & 2)
- Authentication infrastructure analysis
- Code location identification  
- Architecture decision (extend External Auth Service)
- Implementation plan documentation
- **✅ Core LTI route implementation (Phase 1) - ALL 7 TASKS COMPLETED**
- **✅ Package dependencies and configuration (Phase 2) - ALL 2 TASKS COMPLETED**
- **✅ Platform registration configuration (Phase 4, Item 15) - COMPLETED**

### ❌ Not Started
- 10 remaining implementation tasks across phases 3-6
- JWT signature validation and nonce management (Phase 4)
- Testing implementation (Phase 5)
- Documentation and deployment (Phase 6)

## Priority Order

### Week 1 (High Priority)
1. Items 1-7: Core LTI implementation
2. Items 8-9: Dependencies and configuration
3. Items 10-12: Integration verification

### Week 2 (Medium Priority) 
4. Items 13-15: Security implementation
5. Items 16-17: Testing

### Week 3-4 (Lower Priority)
6. Items 18-20: Documentation and deployment

## Dependencies

### External Dependencies
- `axios`: HTTP client for service calls
- `node-jose`: JWT/JWK handling
- LTI 1.3 specification compliance

### Internal Dependencies  
- External Authentication Service (primary integration point)
- Accounting Service (credit allocation API)
- Flowise Proxy Service (auto-sync verification)

### Configuration Dependencies
- Moodle platform registration
- Environment variables setup
- Docker configuration updates