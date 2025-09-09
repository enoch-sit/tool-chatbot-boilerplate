#!/usr/bin/env python3
"""
HS256 JWT Algorithm Validation Script for Flowise Proxy Service

This script thoroughly validates the HS256 (HMAC SHA-256) implementation 
in the JWT authentication system.

Usage: python validate_hs256_jwt.py
"""

import sys
import os
import jwt
import json
import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from typing import Dict, Any

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth.jwt_handler import JWTHandler
from app.config import settings

class HS256Validator:
    """Comprehensive HS256 JWT validation"""
    
    def __init__(self):
        self.test_results = []
        self.secret_key = settings.JWT_SECRET_KEY
        
    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = f"{status} {test_name}"
        if message:
            result += f": {message}"
        
        self.test_results.append((test_name, passed, message))
        print(result)
        
    def validate_algorithm_configuration(self) -> bool:
        """Test 1: Validate HS256 is configured correctly"""
        try:
            algorithm = settings.JWT_ALGORITHM
            expected = "HS256"
            
            if algorithm == expected:
                self.log_test("Algorithm Configuration", True, f"Correctly set to {algorithm}")
                return True
            else:
                self.log_test("Algorithm Configuration", False, f"Expected {expected}, got {algorithm}")
                return False
        except Exception as e:
            self.log_test("Algorithm Configuration", False, f"Error: {str(e)}")
            return False
    
    def validate_secret_strength(self) -> bool:
        """Test 2: Validate JWT secret strength"""
        try:
            is_strong = JWTHandler.validate_secret_strength(self.secret_key)
            
            if is_strong:
                self.log_test("Secret Strength", True, f"Secret length: {len(self.secret_key)} chars")
                return True
            else:
                self.log_test("Secret Strength", False, f"Weak secret detected (length: {len(self.secret_key)})")
                return False
        except Exception as e:
            self.log_test("Secret Strength", False, f"Error: {str(e)}")
            return False
    
    def validate_token_creation_hs256(self) -> bool:
        """Test 3: Validate token creation uses HS256"""
        try:
            payload = {
                "user_id": "test_user_validation",
                "username": "validator",
                "role": "Test"
            }
            
            # Create token
            token = JWTHandler.create_token(payload)
            
            # Decode header to check algorithm
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg")
            
            if algorithm == "HS256":
                self.log_test("Token Creation HS256", True, f"Token header algorithm: {algorithm}")
                return True
            else:
                self.log_test("Token Creation HS256", False, f"Wrong algorithm in header: {algorithm}")
                return False
        except Exception as e:
            self.log_test("Token Creation HS256", False, f"Error: {str(e)}")
            return False
    
    def validate_manual_hs256_verification(self) -> bool:
        """Test 4: Manual HS256 signature verification"""
        try:
            payload = {
                "user_id": "manual_test",
                "username": "manual_validator",
                "exp": (datetime.utcnow() + timedelta(hours=1)).timestamp()
            }
            
            # Create token manually using HS256
            header = {"alg": "HS256", "typ": "JWT"}
            
            # Encode header and payload
            header_b64 = base64.urlsafe_b64encode(
                json.dumps(header, separators=(',', ':')).encode()
            ).decode().rstrip('=')
            
            payload_b64 = base64.urlsafe_b64encode(
                json.dumps(payload, separators=(',', ':')).encode()
            ).decode().rstrip('=')
            
            # Create signature using HMAC SHA-256
            message = f"{header_b64}.{payload_b64}".encode()
            signature = hmac.new(
                self.secret_key.encode(),
                message,
                hashlib.sha256
            ).digest()
            
            signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
            
            # Construct token
            manual_token = f"{header_b64}.{payload_b64}.{signature_b64}"
            
            # Verify with PyJWT
            try:
                decoded = jwt.decode(manual_token, self.secret_key, algorithms=["HS256"])
                self.log_test("Manual HS256 Verification", True, "Manual token verified successfully")
                return True
            except Exception as verify_error:
                self.log_test("Manual HS256 Verification", False, f"Verification failed: {str(verify_error)}")
                return False
                
        except Exception as e:
            self.log_test("Manual HS256 Verification", False, f"Error: {str(e)}")
            return False
    
    def validate_algorithm_tampering_protection(self) -> bool:
        """Test 5: Protection against algorithm tampering"""
        try:
            payload = {"user_id": "tamper_test", "username": "tamper_test"}
            
            # Create valid HS256 token
            valid_token = JWTHandler.create_token(payload)
            
            # Try to decode with different algorithms (should fail)
            algorithms_to_test = ["RS256", "ES256", "none"]
            protection_works = True
            
            for alg in algorithms_to_test:
                try:
                    if alg == "none":
                        # Test none algorithm attack
                        decoded = jwt.decode(valid_token, "", algorithms=[alg])
                        protection_works = False
                        break
                    else:
                        decoded = jwt.decode(valid_token, self.secret_key, algorithms=[alg])
                        protection_works = False
                        break
                except (jwt.InvalidSignatureError, jwt.InvalidTokenError, jwt.DecodeError):
                    continue  # Expected failure
            
            if protection_works:
                self.log_test("Algorithm Tampering Protection", True, "Protected against algorithm confusion")
                return True
            else:
                self.log_test("Algorithm Tampering Protection", False, "Vulnerable to algorithm confusion")
                return False
                
        except Exception as e:
            self.log_test("Algorithm Tampering Protection", False, f"Error: {str(e)}")
            return False
    
    def validate_token_verification(self) -> bool:
        """Test 6: Token verification with HS256"""
        try:
            payload = {
                "user_id": "verify_test",
                "username": "verify_user",
                "role": "User"
            }
            
            # Create and verify token
            token = JWTHandler.create_token(payload)
            decoded = JWTHandler.verify_token(token)
            
            if decoded and decoded.get("user_id") == "verify_test":
                self.log_test("Token Verification", True, "Token verified correctly")
                return True
            else:
                self.log_test("Token Verification", False, "Token verification failed")
                return False
                
        except Exception as e:
            self.log_test("Token Verification", False, f"Error: {str(e)}")
            return False
    
    def validate_security_claims(self) -> bool:
        """Test 7: Validate security claims in tokens"""
        try:
            payload = {"user_id": "claims_test", "username": "claims_user"}
            
            token = JWTHandler.create_token(payload)
            decoded = JWTHandler.verify_token(token)
            
            required_claims = ["exp", "iat", "nbf", "jti", "iss", "aud"]
            missing_claims = []
            
            for claim in required_claims:
                if claim not in decoded:
                    missing_claims.append(claim)
            
            if not missing_claims:
                self.log_test("Security Claims", True, f"All required claims present: {required_claims}")
                return True
            else:
                self.log_test("Security Claims", False, f"Missing claims: {missing_claims}")
                return False
                
        except Exception as e:
            self.log_test("Security Claims", False, f"Error: {str(e)}")
            return False
    
    def validate_timing_attack_resistance(self) -> bool:
        """Test 8: Basic timing attack resistance"""
        try:
            # This is a basic check - in production you'd want more sophisticated timing analysis
            payload = {"user_id": "timing_test", "username": "timing_user"}
            token = JWTHandler.create_token(payload)
            
            # Measure verification time for valid token
            import time
            start = time.time()
            result1 = JWTHandler.verify_token(token)
            valid_time = time.time() - start
            
            # Measure verification time for invalid token
            invalid_token = token[:-10] + "tampered123"
            start = time.time()
            result2 = JWTHandler.verify_token(invalid_token)
            invalid_time = time.time() - start
            
            # Times should be relatively similar (basic check)
            time_ratio = max(valid_time, invalid_time) / min(valid_time, invalid_time)
            
            if time_ratio < 10:  # Allow 10x difference as reasonable
                self.log_test("Timing Attack Resistance", True, f"Time ratio: {time_ratio:.2f}")
                return True
            else:
                self.log_test("Timing Attack Resistance", False, f"Suspicious time ratio: {time_ratio:.2f}")
                return False
                
        except Exception as e:
            self.log_test("Timing Attack Resistance", False, f"Error: {str(e)}")
            return False
    
    def run_all_validations(self) -> Dict[str, Any]:
        """Run all HS256 validations"""
        print("🔐 HS256 JWT Algorithm Validation for Flowise Proxy Service")
        print("=" * 60)
        
        tests = [
            self.validate_algorithm_configuration,
            self.validate_secret_strength,
            self.validate_token_creation_hs256,
            self.validate_manual_hs256_verification,
            self.validate_algorithm_tampering_protection,
            self.validate_token_verification,
            self.validate_security_claims,
            self.validate_timing_attack_resistance
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()
        
        # Summary
        print("=" * 60)
        print(f"📊 VALIDATION SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All HS256 validations PASSED! Implementation is secure.")
            status = "PASS"
        else:
            print("⚠️  Some validations FAILED. Review implementation.")
            status = "FAIL"
        
        return {
            "status": status,
            "passed": passed,
            "total": total,
            "results": self.test_results
        }

def main():
    """Main validation function"""
    try:
        validator = HS256Validator()
        results = validator.run_all_validations()
        
        # Exit with appropriate code
        sys.exit(0 if results["status"] == "PASS" else 1)
        
    except Exception as e:
        print(f"❌ FATAL ERROR during validation: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
