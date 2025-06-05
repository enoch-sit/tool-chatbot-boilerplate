from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timedelta
from pymongo import IndexModel


class RefreshToken(Document):
    """
    Refresh token model for JWT token storage and management.
    Implements TTL (time-to-live) indexes for automatic cleanup.
    """
    token_id: str = Field(..., unique=True, index=True, description="Unique token identifier (jti claim)")
    user_id: str = Field(..., index=True, description="User ID this token belongs to")
    token_hash: str = Field(..., description="Hashed refresh token value for security")
    expires_at: datetime = Field(..., description="Token expiration timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_revoked: bool = Field(default=False, description="Whether token has been revoked")
    revoked_at: Optional[datetime] = Field(default=None)
    user_agent: Optional[str] = Field(default=None, description="Client user agent for tracking")
    ip_address: Optional[str] = Field(default=None, description="Client IP for security tracking")
    
    class Settings:
        collection = "refresh_tokens"
        indexes = [
            # TTL index for automatic cleanup of expired tokens
            IndexModel([("expires_at", 1)], expireAfterSeconds=0),
            # Compound index for efficient user token queries
            IndexModel([("user_id", 1), ("is_revoked", 1)]),
            # Index for token lookup
            IndexModel([("token_hash", 1)]),
        ]
    
    @classmethod
    def create_expiration(cls, days: int = 7) -> datetime:
        """Create expiration datetime for refresh tokens (default 7 days)"""
        return datetime.utcnow() + timedelta(days=days)
    
    def revoke(self) -> None:
        """Mark token as revoked"""
        self.is_revoked = True
        self.revoked_at = datetime.utcnow()
    
    def is_valid(self) -> bool:
        """Check if token is still valid (not expired or revoked)"""
        return (
            not self.is_revoked and 
            self.expires_at > datetime.utcnow()
        )
    
    def __repr__(self):
        return f"<RefreshToken(token_id='{self.token_id}', user_id='{self.user_id}', valid={self.is_valid()})>"
