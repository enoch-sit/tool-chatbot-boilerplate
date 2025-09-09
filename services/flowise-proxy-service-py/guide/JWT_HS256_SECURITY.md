# JWT HS256 Security Implementation

## Overview

The Flowise Proxy Service uses **HS256 (HMAC SHA-256)** algorithm for JWT (JSON Web Token) authentication. This document outlines the security implementation, best practices, and validation procedures.

## HS256 Algorithm Details

### What is HS256?
- **HS256** = HMAC using SHA-256 hash algorithm
- **HMAC** = Hash-based Message Authentication Code
- **Symmetric algorithm**: Same secret key used for both signing and verification
- **Industry standard**: Widely adopted and secure when properly implemented

### Security Features

1. **Algorithm Enforcement**
   - Only HS256 algorithm is accepted
   - Protection against algorithm confusion attacks
   - Explicit algorithm validation in token creation and verification

2. **Enhanced Token Claims**
   ```json
   {
     "user_id": "user_123",
     "username": "john_doe",
     "role": "User",
     "exp": 1640995200,    // Expiration time
     "iat": 1640908800,    // Issued at time
     "nbf": 1640908800,    // Not valid before
     "jti": "abc123...",   // JWT ID (unique identifier)
     "iss": "flowise-proxy-service",  // Issuer
     "aud": "flowise-api"  // Audience
   }
   ```

3. **Secret Key Validation**
   - Minimum 32 characters required
   - Detection of common weak secrets
   - Production environment validation

4. **Timing Attack Resistance**
   - Consistent verification timing
   - Secure comparison operations

## Implementation Details

### JWT Handler (`app/auth/jwt_handler.py`)

```python
class JWTHandler:
    @staticmethod
    def create_token(payload: Dict) -> str:
        """Create JWT token with HS256 algorithm and enhanced security"""
        
    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """Verify JWT token with strict HS256 validation"""
        
    @staticmethod
    def validate_secret_strength(secret: str) -> bool:
        """Validate JWT secret key strength"""
```

### Key Security Features

1. **Explicit Algorithm Specification**
   ```python
   # Token creation - explicitly use HS256
   token = jwt.encode(payload, secret_key, algorithm="HS256")
   
   # Token verification - only allow HS256
   payload = jwt.decode(token, secret_key, algorithms=["HS256"])
   ```

2. **Comprehensive Claim Validation**
   ```python
   options = {
       "verify_signature": True,
       "verify_exp": True,      # Expiration
       "verify_nbf": True,      # Not before
       "verify_iat": True,      # Issued at
       "require_exp": True,
       "require_iat": True,
       "require_nbf": True
   }
   ```

3. **Issuer/Audience Validation**
   ```python
   jwt.decode(
       token, secret_key, algorithms=["HS256"],
       issuer="flowise-proxy-service",
       audience="flowise-api"
   )
   ```

## Security Configurations

### Environment Variables

```bash
# Strong secret key (minimum 32 characters)
JWT_SECRET_KEY=your_very_strong_secret_key_here_at_least_32_chars_long

# Algorithm (must be HS256)
JWT_ALGORITHM=HS256

# Token expiration (in hours)
JWT_EXPIRATION_HOURS=24
```

### Production Security Checklist

- [ ] **Secret Key**: Use a cryptographically strong secret (32+ characters)
- [ ] **Algorithm**: Ensure JWT_ALGORITHM=HS256
- [ ] **HTTPS**: Use HTTPS in production to protect tokens in transit
- [ ] **Expiration**: Set appropriate token expiration times
- [ ] **Key Rotation**: Plan for periodic secret key rotation
- [ ] **Monitoring**: Monitor for invalid token attempts

## Security Validations

### Automated Testing

Run the comprehensive HS256 validation script:

```bash
python validate_hs256_jwt.py
```

### Manual Testing

```bash
# Run JWT-specific tests
python -m pytest tests/test_auth.py -v

# Test specific HS256 functionality
python -m pytest tests/test_auth.py::test_hs256_algorithm_enforcement -v
```

## Attack Prevention

### 1. Algorithm Confusion Attacks
- **Prevention**: Explicitly specify allowed algorithms
- **Implementation**: `algorithms=["HS256"]` in verification
- **Testing**: Attempt to decode with RS256, ES256, none algorithms

### 2. Weak Secret Attacks
- **Prevention**: Secret strength validation
- **Implementation**: Minimum 32 characters, complexity checks
- **Testing**: Automated secret strength validation

### 3. Token Tampering
- **Prevention**: HMAC signature verification
- **Implementation**: PyJWT library handles signature validation
- **Testing**: Modify token content and verify rejection

### 4. Timing Attacks
- **Prevention**: Consistent verification timing
- **Implementation**: Secure comparison in PyJWT
- **Testing**: Measure verification times for valid/invalid tokens

## Best Practices

### Development
1. Use strong, unique secrets for each environment
2. Never commit secrets to version control
3. Use environment variables for configuration
4. Implement comprehensive testing

### Production
1. Use HTTPS exclusively
2. Implement token refresh mechanisms
3. Monitor authentication failures
4. Plan for secret key rotation
5. Use secure secret management systems

### Monitoring
1. Log authentication attempts
2. Monitor for algorithm confusion attempts
3. Track token validation failures
4. Alert on suspicious patterns

## Compliance & Standards

- **RFC 7519**: JSON Web Token standard
- **RFC 2104**: HMAC specification
- **FIPS 180-4**: SHA-256 standard
- **OWASP**: JSON Web Token security guidelines

## Troubleshooting

### Common Issues

1. **Algorithm Mismatch**
   ```
   Error: Invalid algorithm specified
   Solution: Ensure JWT_ALGORITHM=HS256
   ```

2. **Weak Secret Warning**
   ```
   Error: Weak JWT secret detected
   Solution: Use a strong secret (32+ characters)
   ```

3. **Token Verification Failure**
   ```
   Error: Invalid signature
   Solution: Check secret key consistency
   ```

### Debug Tools

```python
# Get token information
token_info = JWTHandler.get_token_info(token)

# Check token expiration
is_expired = JWTHandler.is_token_expired(token)

# Decode without verification (debug only)
payload = JWTHandler.decode_token(token)
```

## Version History

- **v1.0**: Basic HS256 implementation
- **v2.0**: Enhanced security features and validation
- **v2.1**: Comprehensive testing and documentation

## References

- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- [OWASP JWT Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [HMAC RFC 2104](https://tools.ietf.org/html/rfc2104)
