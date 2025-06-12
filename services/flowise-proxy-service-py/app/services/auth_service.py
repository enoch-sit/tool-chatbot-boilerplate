import httpx
import logging
import bcrypt
from typing import Dict, Optional
from datetime import datetime
from app.config import settings
from app.auth.jwt_handler import JWTHandler
from app.models.user import User
from app.models.chatflow import UserChatflow
from app.models.refresh_token import RefreshToken


class AuthService:
    def __init__(self):
        self.jwt_handler = JWTHandler()
        self.logger = logging.getLogger(__name__)
        logging.basicConfig(level=logging.INFO)

    async def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user using MongoDB database with bcrypt password verification"""
        try:
            # Find user in local MongoDB database
            user = await User.find_one(User.username == username)
            if not user:
                self.logger.warning(f"User {username} not found in database")
                return None
            
            if not user.is_active:
                self.logger.warning(f"User {username} is not active")
                return None
            
            # Verify password using bcrypt
            if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                self.logger.warning(f"Invalid password for user {username}")
                return None
            
            # Authentication successful
            self.logger.info(f"User {username} authenticated successfully")
            return {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "credits": user.credits
            }
            
        except Exception as e:
            self.logger.error(f"Auth service error during authentication: {e}")
            return None

    async def validate_user_permissions(self, user_id: str, chatflow_id: str) -> bool:
        """Validate if user has access to specific chatflow using MongoDB"""
        try:
            # 🔍 DEBUG: Log what we're looking for
            self.logger.info(f"🔍 Permission validation request:")
            self.logger.info(f"  Looking for user_id: '{user_id}' (type: {type(user_id)}, len: {len(user_id)})")
            self.logger.info(f"  Looking for chatflow_id: '{chatflow_id}' (type: {type(chatflow_id)})")
        
            # 🔍 DEBUG: Check what UserChatflow records actually exist
            all_records = await UserChatflow.find().limit(10).to_list()
            self.logger.info(f"📊 Database contains {len(all_records)} UserChatflow records:")
            for i, record in enumerate(all_records):
                self.logger.info(f"  Record {i+1}: user_id='{record.user_id}' (len: {len(record.user_id)}), chatflow_id='{record.chatflow_id}', active={record.is_active}")
        
            # Your existing query
            user_chatflow = await UserChatflow.find_one(
                UserChatflow.user_id == user_id,
                UserChatflow.chatflow_id == chatflow_id,
            )
            
            if user_chatflow:
                self.logger.info("✅ EXACT MATCH FOUND!")
            else:
                self.logger.warning("❌ NO EXACT MATCH FOUND")
            
            return user_chatflow is not None
        
        except Exception as e:
            self.logger.error(f"Permission validation error: {e}")
            return False
    
    def create_access_token(self, user_data: Dict) -> str:
        """Create JWT access token for authenticated user (legacy method)"""
        user_id = user_data.get("id")
        role = user_data.get("role", "User")
        return self.jwt_handler.create_access_token(user_id, role)
    
    async def create_token_pair(self, user_data: Dict, user_agent: str = None, ip_address: str = None) -> Dict:
        """Create both access and refresh tokens, store refresh token in database"""
        try:
            user_id = str(user_data.get("id"))
            role = user_data.get("role", "User")
            
            # Create token pair
            token_pair = self.jwt_handler.create_token_pair(user_id, role)
            
            # Store refresh token in database
            refresh_token_doc = RefreshToken(
                token_id=token_pair["token_id"],
                user_id=user_id,
                token_hash=self.jwt_handler.hash_token(token_pair["refresh_token"]),
                expires_at=RefreshToken.create_expiration(settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
                user_agent=user_agent,
                ip_address=ip_address
            )
            await refresh_token_doc.insert()
            
            self.logger.info(f"Created token pair for user {user_id}")
            return token_pair
            
        except Exception as e:
            self.logger.error(f"Error creating token pair: {e}")
            raise
    
    async def refresh_access_token(self, refresh_token: str, user_agent: str = None, ip_address: str = None) -> Optional[Dict]:
        """Refresh access token using refresh token with rotation"""
        try:
            # Verify refresh token
            payload = self.jwt_handler.verify_refresh_token(refresh_token)
            if not payload:
                return None
            
            user_id = self.jwt_handler.extract_user_id(payload)
            token_id = self.jwt_handler.extract_token_id(payload)
            
            # Find and validate stored refresh token
            stored_token = await RefreshToken.find_one(
                RefreshToken.token_id == token_id,
                RefreshToken.user_id == user_id
            )
            
            if not stored_token or not stored_token.is_valid():
                return None
            
            # Verify token hash matches
            if stored_token.token_hash != self.jwt_handler.hash_token(refresh_token):
                # Potential security issue - revoke all user tokens
                await self.revoke_all_user_tokens(user_id)
                self.logger.warning(f"Refresh token hash mismatch for user {user_id} - all tokens revoked")
                return None
            
            # Get user data for new tokens
            user = await User.get(user_id)
            if not user or not user.is_active:
                return None
            
            # Revoke old refresh token
            await self.revoke_refresh_token(token_id)
            
            # Create new token pair (token rotation)
            user_data = {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "credits": user.credits
            }
            
            new_token_pair = await self.create_token_pair(user_data, user_agent, ip_address)
            self.logger.info(f"Refreshed tokens for user {user_id}")
            return new_token_pair
            
        except Exception as e:
            self.logger.error(f"Error refreshing token: {e}")
            return None
    
    async def revoke_refresh_token(self, token_id: str) -> bool:
        """Revoke a specific refresh token"""
        try:
            token = await RefreshToken.find_one(RefreshToken.token_id == token_id)
            if token:
                token.revoke()
                await token.save()
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error revoking token {token_id}: {e}")
            return False
    
    async def revoke_all_user_tokens(self, user_id: str) -> bool:
        """Revoke all refresh tokens for a user"""
        try:
            tokens = await RefreshToken.find(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False
            ).to_list()
            
            for token in tokens:
                token.revoke()
                await token.save()
            
            self.logger.info(f"Revoked {len(tokens)} tokens for user {user_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error revoking all tokens for user {user_id}: {e}")
            return False
    
    async def cleanup_expired_tokens(self) -> int:
        """Clean up expired refresh tokens (manual cleanup, TTL handles automatic)"""
        try:
            expired_tokens = await RefreshToken.find(
                RefreshToken.expires_at < datetime.utcnow()
            ).to_list()
            
            for token in expired_tokens:
                await token.delete()
            
            self.logger.info(f"Cleaned up {len(expired_tokens)} expired tokens")
            return len(expired_tokens)
        except Exception as e:
            self.logger.error(f"Error cleaning up expired tokens: {e}")
            return 0
