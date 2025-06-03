import jwt
from datetime import datetime, timedelta
from typing import Dict, Optional
from app.config import settings

class JWTHandler:
    @staticmethod
    def create_token(payload: Dict) -> str:
        """Create a JWT token with the given payload"""
        try:
            # Add expiration time
            expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
            payload.update({"exp": expire})
            
            # Generate token
            token = jwt.encode(
                payload, 
                settings.JWT_SECRET_KEY, 
                algorithm=settings.JWT_ALGORITHM
            )
            return token
        except Exception as e:
            raise Exception(f"Error creating token: {str(e)}")

    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except Exception:
            return None

    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """Decode a JWT token without verification (for debugging)"""
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload
        except Exception:
            return None
