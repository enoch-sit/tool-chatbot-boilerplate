import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.jwt_handler import JWTHandler

client = TestClient(app)

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "flowise-proxy-service"

def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Flowise Proxy Service"
    assert data["version"] == "1.0.0"

def test_info_endpoint():
    """Test service info endpoint"""
    response = client.get("/info")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "flowise-proxy-service"
    assert "endpoints" in data

def test_chatflows_without_auth():
    """Test chatflows endpoint without authentication"""
    response = client.get("/chatflows/")
    assert response.status_code == 403  # Should require authentication

def test_chat_predict_without_auth():
    """Test chat predict endpoint without authentication"""
    response = client.post("/chat/predict", json={
        "chatflow_id": "test-flow",
        "question": "Hello"
    })
    assert response.status_code == 403  # Should require authentication

def test_authenticate_endpoint_invalid_credentials():
    """Test authentication with invalid credentials"""
    response = client.post("/chat/authenticate", json={
        "username": "invalid",
        "password": "invalid"
    })
    # This will depend on external auth service being available
    # For now, we expect it to handle the error gracefully
    assert response.status_code in [401, 500]

def create_test_token():
    """Helper function to create a test token"""
    payload = {
        "user_id": 1,
        "username": "testuser",
        "role": "User",
        "email": "test@example.com"
    }
    return JWTHandler.create_token(payload)

def test_chatflows_with_auth():
    """Test chatflows endpoint with authentication"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/chatflows/", headers=headers)
    # This will depend on external services being available
    # The endpoint should at least accept the valid token
    assert response.status_code in [200, 503]  # 503 if services unavailable

def test_credits_with_auth():
    """Test credits endpoint with authentication"""
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/chat/credits", headers=headers)
    # This will depend on external services being available
    assert response.status_code in [200, 503]  # 503 if services unavailable
