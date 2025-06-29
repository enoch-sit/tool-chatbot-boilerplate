import httpx
from typing import Dict, Optional, Any
from app.config import settings


class AccountingService:
    def __init__(self):
        self.accounting_url = settings.ACCOUNTING_SERVICE_URL.rstrip(
            "/"
        )  # Ensure no trailing slash

    async def get_chatflow_cost(self, chat_flow_id) -> Optional[int]:
        return 1

    async def check_user_credits(self, user_id: str, user_token) -> Optional[int]:
        """Check user's available credits via the accounting service."""
        try:
            async with httpx.AsyncClient() as client:
                # Assuming 'your_bearer_token' variable holds your actual token
                headers = {"Authorization": f"Bearer {user_token}"}
                response = await client.get(
                    f"{self.accounting_url}/api/credits/total-balance",  # Corrected endpoint
                    timeout=30.0,
                    headers=headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("totalCredits", 0)  # Corrected response field
                else:
                    # Log error more informatively
                    print(
                        f"Accounting service error (check_user_credits for {user_id}): {response.status_code} - {response.text}"
                    )
                    return None

        except httpx.RequestError as e:
            print(f"Accounting service request error (check_user_credits): {e}")
            return None
        except Exception as e:
            print(f"Unexpected accounting error (check_user_credits): {e}")
            return None

    async def deduct_credits(self, user_id: str, amount: int, user_token: str) -> bool:
        """Deduct credits from user account via the accounting service."""
        if amount <= 0:
            print("Deduct credits amount must be positive.")
            return False
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {user_token}"}
                response = await client.post(
                    f"{self.accounting_url}/api/credits/deduct",
                    json={"credits": amount},
                    timeout=30.0,
                    headers=headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        return True
                    else:
                        print(
                            f"Credit deduction failed for {user_id}: {data.get('message')}"
                        )
                        return False
                else:
                    print(
                        f"Credit deduction error for {user_id}: {response.status_code} - {response.text}"
                    )
                    return False

        except httpx.RequestError as e:
            print(f"Credit deduction request error: {e}")
            return False
        except Exception as e:
            print(f"Unexpected deduction error: {e}")
            return False

    async def get_operation_cost(
        self, model_id: str, tokens: int
    ) -> int:  # Signature changed
        """Get the cost of a specific operation (e.g., based on model and tokens)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(  # Corrected HTTP method
                    f"{self.accounting_url}/api/credits/calculate",  # Corrected endpoint
                    json={  # Corrected request body
                        "modelId": model_id,
                        "tokens": tokens,
                    },
                    timeout=30.0,
                    # Headers for JWT auth might be needed here
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("credits", 1)  # Use "credits" field, default to 1
                else:
                    print(
                        f"Cost lookup error for model {model_id}: {response.status_code} - {response.text}"
                    )
                    return 1  # Default cost on error

        except httpx.RequestError as e:
            print(f"Cost lookup request error: {e}")
            return 1
        except Exception as e:
            print(f"Unexpected cost lookup error: {e}")
            return 1

    async def log_transaction(
        self,
        user_token: str,  # JWT token for authentication
        user_id: str,  # Kept for metadata, but actual user often from JWT
        service_name: str,  # More generic parameter
        operation_name: str,  # More generic parameter
        cost: int,
        success: bool,
        metadata: Optional[Dict[str, Any]] = None,  # Allow passing additional metadata
    ) -> None:
        """Log transaction for audit purposes via the accounting service."""
        try:
            # Prepare metadata, ensuring user_id and original identifiers are included if not part of standard fields
            final_metadata = metadata if metadata is not None else {}
            final_metadata.setdefault(
                "user_id_source", user_id
            )  # Original user_id if needed for cross-referencing
            final_metadata.setdefault(
                "original_operation_details", operation_name
            )  # e.g. chatflow_id

            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {user_token}"}
                await client.post(
                    f"{self.accounting_url}/api/usage/record",  # Corrected endpoint
                    json={  # Corrected request body
                        "service": service_name,
                        "operation": operation_name,  # This could be a more specific operation identifier
                        "credits": cost,
                        "metadata": {
                            "success": success,
                            **final_metadata,  # Include success and any other relevant data
                        },
                    },
                    timeout=30.0,
                    headers=headers,
                    # Headers for JWT auth might be needed here
                )
        except httpx.RequestError as e:
            print(f"Transaction logging request error: {e}")
        except Exception as e:
            print(f"Unexpected transaction logging error: {e}")
            # Don't fail the original request if logging fails
