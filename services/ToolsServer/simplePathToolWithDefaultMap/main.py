"""
FastAPI Server for Simple Path Tool

RESTful API server for pathfinding with turn instructions.
"""

from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uvicorn
import os

from path_tool import get_path_with_turns, get_available_locations


# API Key Configuration
API_KEY = os.getenv("API_KEY", "your-secret-api-key-change-this")
security = HTTPBearer()


def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify the provided API key."""
    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


# Pydantic models for request/response
class PathRequest(BaseModel):
    start: str
    end: str


class PathResponse(BaseModel):
    success: bool
    path: Optional[List[str]] = None
    edges: Optional[List[Dict]] = None
    total_steps: Optional[int] = None
    message: Optional[str] = None


class LocationsResponse(BaseModel):
    buildings: List[str]
    street_nodes: List[str]
    all_locations: List[str]
    total_count: int


# Create FastAPI app
app = FastAPI(
    title="Simple Path Tool API",
    description="API for pathfinding with turn instructions using default city map. Requires Bearer token authentication for protected endpoints.",
    version="1.0.0",
)

# Create router for /simpletool endpoints
router = APIRouter(prefix="/simpletool", tags=["pathfinding"])

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def app_root():
    """Application root endpoint."""
    return {
        "message": "Simple Path Tool API",
        "version": "1.0.0",
        "base_path": "/simpletool",
        "documentation": "/docs",
        "health": "/simpletool/health",
    }


@router.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Simple Path Tool API",
        "version": "1.0.0",
        "base_path": "/simpletool",
        "endpoints": {
            "GET /simpletool/": "This information",
            "POST /simpletool/path": "Get path with turn instructions (requires auth)",
            "GET /simpletool/locations": "Get all available locations",
            "GET /simpletool/health": "Health check",
        },
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Simple Path Tool API"}


@router.get("/locations", response_model=LocationsResponse)
async def get_locations():
    """Get all available locations in the city map."""
    try:
        locations = get_available_locations()
        return LocationsResponse(
            buildings=locations["buildings"],
            street_nodes=locations["street_nodes"],
            all_locations=locations["all_locations"],
            total_count=len(locations["all_locations"]),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting locations: {str(e)}"
        )


@router.post("/path", response_model=PathResponse)
async def get_path(request: PathRequest, api_key: str = Depends(verify_api_key)):
    """
    Get path with turn instructions between two locations.

    Returns path nodes and edges with turn instructions.
    """
    try:
        # Validate input
        if not request.start or not request.end:
            raise HTTPException(
                status_code=400, detail="Both start and end locations are required"
            )

        # Get path with turns
        path, edges = get_path_with_turns(request.start, request.end)

        if path is None or edges is None:
            return PathResponse(
                success=False,
                message=f"No path found from {request.start} to {request.end}",
            )

        return PathResponse(
            success=True,
            path=path,
            edges=edges,
            total_steps=len(edges),
            message=f"Path found: {len(path)} nodes, {len(edges)} steps",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding path: {str(e)}")


@router.get("/path/{start}/{end}", response_model=PathResponse)
async def get_path_get(start: str, end: str, api_key: str = Depends(verify_api_key)):
    """
    Alternative GET endpoint for path finding.

    Usage: GET /path/Police%20Station/Bakery
    """
    request = PathRequest(start=start, end=end)
    return await get_path(request)


# Additional utility endpoints
@router.get("/path/example")
async def get_example_path():
    """Get an example path for testing."""
    path, edges = get_path_with_turns("Police Station", "Bakery")

    return {
        "example": "Police Station to Bakery",
        "path": path,
        "raw_edge_data": edges,
        "formatted_instructions": [
            f"Step {i+1}: {edge['turn']} → {edge['direction']} from {edge['from']} to {edge['to']}"
            for i, edge in enumerate(edges)
        ],
    }


@router.get("/buildings")
async def get_buildings():
    """Get just the building names."""
    locations = get_available_locations()
    return {"buildings": locations["buildings"]}


@router.get("/streets")
async def get_street_nodes():
    """Get just the street node names."""
    locations = get_available_locations()
    return {"street_nodes": locations["street_nodes"]}


# Include the router in the app
app.include_router(router)


if __name__ == "__main__":
    # Run the server on port 8001 to avoid conflicts
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True, log_level="info")
