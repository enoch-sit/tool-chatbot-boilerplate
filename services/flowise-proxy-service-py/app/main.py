from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api import chatflows, chat
from app.config import settings
import logging
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Flowise Proxy Service",
    description="Proxy service for Flowise with authentication and credit management",
    version="1.0.0",
    debug=settings.DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chatflows.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    return {
        "message": "Flowise Proxy Service", 
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "flowise-proxy-service",
        "version": "1.0.0"
    }

@app.get("/info")
async def service_info():
    return {
        "service": "flowise-proxy-service",
        "version": "1.0.0",
        "flowise_url": settings.FLOWISE_API_URL,
        "debug": settings.DEBUG,
        "endpoints": {
            "authentication": "/chat/authenticate",
            "chatflows": "/chatflows/",
            "prediction": "/chat/predict",
            "credits": "/chat/credits"
        }
    }

if __name__ == "__main__":
    import hypercorn.asyncio
    from hypercorn import Config
    
    config = Config()
    config.bind = [f"{settings.HOST}:{settings.PORT}"]
    config.debug = settings.DEBUG
    
    logger.info(f"Starting Flowise Proxy Service on {settings.HOST}:{settings.PORT}")
    asyncio.run(hypercorn.asyncio.serve(app, config))
