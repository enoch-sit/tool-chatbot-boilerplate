from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime

class User(Document):
    username: str = Field(..., unique=True, index=True)
    email: str = Field(..., unique=True, index=True)
    password_hash: str = Field(...)
    role: str = Field(default="User")
    is_active: bool = Field(default=True)
    credits: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "users"
        
    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}', role='{self.role}')>"
