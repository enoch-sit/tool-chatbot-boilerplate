import pytest
from app.auth.jwt_handler import JWTHandler

def test_create_and_verify_token():
    """Test JWT token creation and verification"""
    payload = {
        "user_id": 1,
        "username": "testuser",
        "role": "User"
    }
    
    # Create token
    token = JWTHandler.create_token(payload)
    assert token is not None
    assert isinstance(token, str)
    
    # Verify token
    decoded = JWTHandler.verify_token(token)
    assert decoded is not None
    assert decoded["user_id"] == 1
    assert decoded["username"] == "testuser"
    assert decoded["role"] == "User"

def test_invalid_token():
    """Test invalid token handling"""
    invalid_token = "invalid.token.here"
    decoded = JWTHandler.verify_token(invalid_token)
    assert decoded is None

def test_decode_token_without_verification():
    """Test token decoding without verification"""
    payload = {
        "user_id": 1,
        "username": "testuser",
        "role": "User"
    }
    
    token = JWTHandler.create_token(payload)
    decoded = JWTHandler.decode_token(token)
    
    assert decoded is not None
    assert decoded["user_id"] == 1
    assert decoded["username"] == "testuser"
