import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-here")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # Flowise Configuration
    FLOWISE_API_URL: str = os.getenv("FLOWISE_API_URL", "http://localhost:3000")
    FLOWISE_API_KEY: Optional[str] = os.getenv("FLOWISE_API_KEY")

    # External Services
    EXTERNAL_AUTH_URL: str = os.getenv("EXTERNAL_AUTH_URL", "http://localhost:8001")
    ACCOUNTING_SERVICE_URL: str = os.getenv("ACCOUNTING_SERVICE_URL", "http://localhost:8002")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/flowise_proxy")

    # Server Configuration
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    class Config:
        env_file = ".env"

settings = Settings()
