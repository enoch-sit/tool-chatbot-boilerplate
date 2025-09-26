import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Any, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
FLOWISE_API_URL = os.getenv("FLOWISE_API_URL", "http://localhost:3000")
FLOWISE_API_KEY = os.getenv("FLOWISE_API_KEY", "")
BASE_PATH = os.getenv("BASE_PATH", "/projectproxy")

# Initialize FastAPI with base path
app = FastAPI(
    title="Flowise Proxy",
    root_path=BASE_PATH
)

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
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/v1/prediction/{chatflow_id}",
                headers=self._get_headers(),
                json=payload
            ) as response:
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail="Flowise API error")
                
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk

# Initialize service
flowise_service = FlowiseService()

@app.get("/")
async def root():
    return {"message": "Flowise Proxy API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream chat response from Flowise"""
    try:
        return StreamingResponse(
            flowise_service.stream_prediction(request.chatflow_id, request.question),
            media_type="text/plain"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)