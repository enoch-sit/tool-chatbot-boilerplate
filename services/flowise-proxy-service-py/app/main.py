from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api import chatflows, chat, admin
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.tasks.chatflow_sync import chatflow_sync_task
from app.core.logging import logger
import logging
import asyncio
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)

# Create FastAPI application
app = FastAPI(
    title="Flowise Proxy Service",
    description="Proxy service for Flowise with authentication and credit management",
    version="1.0.0",
    debug=settings.DEBUG
)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events for the FastAPI application."""
    # Startup logic
    logger.info("Starting Flowise Proxy Service")
    
    # Initialize database connection
    await connect_to_mongo()
    
    # Start periodic chatflow sync if enabled
    if hasattr(settings, 'ENABLE_CHATFLOW_SYNC') and settings.ENABLE_CHATFLOW_SYNC:
        asyncio.create_task(chatflow_sync_task.start_periodic_sync())
    
    try:
        yield  # Application runs here
    finally:
        # Shutdown logic
        logger.info("Shutting down Flowise Proxy Service")
        
        # Stop periodic sync
        chatflow_sync_task.stop_periodic_sync()
        
        # Close database connection
        await close_mongo_connection()

# Attach lifespan to the app
app.lifespan = lifespan

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
app.include_router(admin.router)

@app.get("/")
async def root():
    return {
        "message": "Flowise Proxy Service", 
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    print("=ok=")
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