import httpx
from typing import Dict, Optional
from app.config import settings

class AccountingService:
    def __init__(self):
        self.accounting_url = settings.ACCOUNTING_SERVICE_URL

    async def check_user_credits(self, user_id: str) -> Optional[int]:
        """Check user's available credits"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.accounting_url}/users/{user_id}/credits",
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("credits", 0)
                else:
                    return None
                    
        except httpx.RequestError as e:
            print(f"Accounting service error: {e}")
            return None
        except Exception as e:
            print(f"Unexpected accounting error: {e}")
            return None

    async def deduct_credits(self, user_id: str, amount: int, reason: str = "Chat request") -> bool:
        """Deduct credits from user account"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.accounting_url}/users/{user_id}/deduct",
                    json={
                        "amount": amount,
                        "reason": reason
                    },
                    timeout=30.0
                )
                
                return response.status_code == 200
                
        except httpx.RequestError as e:
            print(f"Credit deduction error: {e}")
            return False
        except Exception as e:
            print(f"Unexpected deduction error: {e}")
            return False

    async def get_chatflow_cost(self, chatflow_id: str) -> int:
        """Get the cost of using a specific chatflow"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.accounting_url}/chatflows/{chatflow_id}/cost",
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("cost", 1)  # Default to 1 credit
                else:
                    return 1
                    
        except Exception as e:
            print(f"Cost lookup error: {e}")
            return 1  # Default cost

    async def log_transaction(self, user_id: str, chatflow_id: str, cost: int, success: bool) -> None:
        """Log transaction for audit purposes"""
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{self.accounting_url}/transactions/log",
                    json={
                        "user_id": user_id,
                        "chatflow_id": chatflow_id,
                        "cost": cost,
                        "success": success,
                        "timestamp": None  # Will be set by service
                    },
                    timeout=30.0
                )
        except Exception as e:
            print(f"Transaction logging error: {e}")
            # Don't fail the request if logging fails
