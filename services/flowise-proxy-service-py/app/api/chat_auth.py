"""
Authentication endpoints for the chat API.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Optional
from app.auth.middleware import authenticate_user
from app.services.auth_service import AuthService
from app.services.external_auth_service import ExternalAuthService
from app.auth.jwt_handler import JWTHandler
from .chat_models import AuthRequest, RefreshRequest, RevokeTokenRequest

auth_router = APIRouter(prefix="/api/v1/chat", tags=["chat-auth"])


@auth_router.post("/authenticate")
async def authenticate(auth_request: AuthRequest, request: Request):
    """
    Authenticate user via external auth service and return JWT tokens
    """
    try:
        external_auth_service = ExternalAuthService()

        # Authenticate user via external service
        auth_result = await external_auth_service.authenticate_user(
            auth_request.username, auth_request.password
        )

        if auth_result is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "access_token": auth_result["access_token"],
            "refresh_token": auth_result["refresh_token"],
            "token_type": auth_result["token_type"],
            "user": auth_result["user"],
            "message": auth_result["message"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@auth_router.post("/refresh")
async def refresh_token(refresh_request: RefreshRequest, request: Request):
    """
    Refresh access token using external auth service - NO MIDDLEWARE DEPENDENCY
    This endpoint does not use authenticate_user middleware to avoid circular dependency.
    """
    try:
        external_auth_service = ExternalAuthService()

        # Refresh tokens via external auth service (no middleware)
        refresh_result = await external_auth_service.refresh_token(
            refresh_request.refresh_token
        )

        if refresh_result is None:
            raise HTTPException(
                status_code=401, detail="Invalid or expired refresh token"
            )

        return {
            "access_token": refresh_result["access_token"],
            "refresh_token": refresh_result["refresh_token"],
            "token_type": refresh_result["token_type"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


@auth_router.post("/revoke")
async def revoke_tokens(
    request: Request,
    current_user: Dict = Depends(authenticate_user),
    revoke_request: Optional[RevokeTokenRequest] = None,
):
    """
    Revoke refresh tokens (specific token or all user tokens)
    """
    try:
        auth_service = AuthService()
        user_id = current_user.get("user_id")

        # Get authorization header to extract current token for token_id
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        current_token = auth_header.split(" ")[1]
        # Decode current token to get token_id
        payload = JWTHandler.verify_access_token(current_token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")

        current_token_id = JWTHandler.extract_token_id(payload)

        # Determine revocation scope
        revoke_all = False
        specific_token_id = None

        if revoke_request:
            revoke_all = revoke_request.all_tokens or False
            specific_token_id = revoke_request.token_id

        revoked_count = 0

        if revoke_all:
            # Revoke all user tokens
            success = await auth_service.revoke_all_user_tokens(user_id)
            if success:
                revoked_count = "all"
                return {
                    "message": "All refresh tokens revoked successfully",
                    "revoked_count": revoked_count,
                    "user_id": user_id,
                }
            else:
                raise HTTPException(
                    status_code=500, detail="Failed to revoke all tokens"
                )

        elif specific_token_id:
            # Revoke specific token
            success = await auth_service.revoke_refresh_token(specific_token_id)
            if success:
                revoked_count = 1
                return {
                    "message": "Refresh token revoked successfully",
                    "revoked_count": revoked_count,
                    "token_id": specific_token_id,
                }
            else:
                raise HTTPException(
                    status_code=404, detail="Token not found or already revoked"
                )

        else:
            # Revoke current token (default behavior)
            success = await auth_service.revoke_refresh_token(current_token_id)
            if success:
                revoked_count = 1
                return {
                    "message": "Current refresh token revoked successfully",
                    "revoked_count": revoked_count,
                    "token_id": current_token_id,
                }
            else:
                raise HTTPException(
                    status_code=404, detail="Current token not found or already revoked"
                )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Token revocation failed: {str(e)}"
        )
