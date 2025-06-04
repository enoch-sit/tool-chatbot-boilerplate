import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-here")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    JWT_ACCESS_SECRET: str = os.getenv("JWT_ACCESS_SECRET", "dev_access_secret_key_change_this_in_production")

    # Flowise Configuration
    FLOWISE_API_URL: str = os.getenv("FLOWISE_API_URL", "http://somepublicendpoint.com")
    FLOWISE_API_KEY: Optional[str] = os.getenv("FLOWISE_API_KEY")

    # External Services URLs - Updated to use new container-based URLs
    ACCOUNTING_API_URL: str = os.getenv("ACCOUNTING_API_URL", "http://accounting-service-accounting-service-1:3001/api")
    AUTH_API_URL: str = os.getenv("AUTH_API_URL", "http://auth-service-dev:3000/api")
    
    # Fallback URLs for local development
    EXTERNAL_AUTH_URL: str = os.getenv("EXTERNAL_AUTH_URL", "http://localhost:3000")
    ACCOUNTING_SERVICE_URL: str = os.getenv("ACCOUNTING_SERVICE_URL", "http://localhost:3001")    # Database - Updated to MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    MONGODB_DATABASE_NAME: str = os.getenv("MONGODB_DATABASE_NAME", "flowise_proxy")

    # Streaming Configuration
    MAX_STREAMING_DURATION: int = int(os.getenv("MAX_STREAMING_DURATION", "120000"))

    # CORS Configuration
    CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "*")

    # Server Configuration
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    class Config:
        env_file = ".env"

settings = Settings()
