import os
import httpx
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Any, Dict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Debugging: Print loaded environment variables ---
print("--- Loading Environment Variables ---")
FLOWISE_API_URL = os.getenv("FLOWISE_API_URL")
FLOWISE_API_KEY = os.getenv("FLOWISE_API_KEY")
BASE_PATH = os.getenv("BASE_PATH")
print(f"DEBUG: FLOWISE_API_URL = {FLOWISE_API_URL}")
print(f"DEBUG: FLOWISE_API_KEY = {'********' if FLOWISE_API_KEY else 'Not Set'}")
print(f"DEBUG: BASE_PATH = {BASE_PATH}")
print("------------------------------------")

# Fallback to default values if environment variables are not set
if not FLOWISE_API_URL:
    FLOWISE_API_URL = "http://localhost:3000"
if not BASE_PATH:
    # If BASE_PATH is not set, routes will be at the root (e.g., /chat/stream)
    BASE_PATH = ""

# Initialize FastAPI App and Router
app = FastAPI(
    title="Flowise Proxy",
    description="A proxy to handle streaming and base path routing for Flowise.",
    # The root_path helps generate correct docs URLs when behind a proxy
    root_path=BASE_PATH if BASE_PATH != "/" else ""
)
router = APIRouter()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class ChatRequest(BaseModel):
    question: str
    chatflow_id: str
    streaming: Optional[bool] = True

# Flowise service
class FlowiseService:
    def __init__(self):
        self.base_url = FLOWISE_API_URL
        self.api_key = FLOWISE_API_KEY
        
    def _get_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    async def stream_prediction(self, chatflow_id: str, question: str):
        """Stream prediction from Flowise"""
        payload = {
            "question": question,
            "streaming": True
        }
        
        # Debugging: Print the request details to Flowise
        print(f"DEBUG: Forwarding request to Flowise: URL={self.base_url}/api/v1/prediction/{chatflow_id}")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/v1/prediction/{chatflow_id}",
                headers=self._get_headers(),
                json=payload
            ) as response:
                if response.status_code != 200:
                    error_detail = f"Flowise API error: {response.status_code} - {await response.aread()}"
                    print(f"ERROR: {error_detail}")
                    raise HTTPException(status_code=response.status_code, detail=error_detail)
                
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk

# Initialize service
flowise_service = FlowiseService()

@router.get("/")
async def root():
    return {"message": "Flowise Proxy API", "status": "running"}

@router.get("/health")
async def health():
    return {"status": "healthy"}

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream chat response from Flowise"""
    try:
        return StreamingResponse(
            flowise_service.stream_prediction(request.chatflow_id, request.question),
            media_type="text/plain"
        )
    except Exception as e:
        print(f"ERROR: Exception in chat_stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router with the base path prefix
app.include_router(router, prefix=BASE_PATH)

# Add a root endpoint for health checks on the main app
@app.get("/")
async def app_root():
    return {"message": "FastAPI root is active. See docs at /docs or your API at " + BASE_PATH}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"--- Starting Uvicorn Server ---")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Serving API with base path: '{BASE_PATH}'")
    print("-------------------------------")
    
    uvicorn.run("main:app", host=host, port=port, reload=True)