from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class Chatflow(Base):
    __tablename__ = "chatflows"
    
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    cost_per_request = Column(Integer, default=1, nullable=False)  # Credits per request
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Chatflow(id='{self.id}', name='{self.name}', active={self.is_active})>"

class UserChatflow(Base):
    __tablename__ = "user_chatflows"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chatflow_id = Column(String(50), ForeignKey("chatflows.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    assigned_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="user_chatflows")
    chatflow = relationship("Chatflow", backref="user_assignments")

    def __repr__(self):
        return f"<UserChatflow(user_id={self.user_id}, chatflow_id='{self.chatflow_id}')>"
