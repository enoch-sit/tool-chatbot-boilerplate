# Delete Chat History Endpoint Usage

This document shows how to use the new delete chat history endpoint.

## Endpoint Details

- **URL**: `DELETE /api/v1/chat/history`
- **Authentication**: JWT Bearer token required
- **Description**: Deletes all chat history (sessions and messages) for the authenticated user

## Usage Examples

### JavaScript/Fetch Example

```javascript
async function deleteUserChatHistory(jwtToken) {
    try {
        const response = await fetch('/api/v1/chat/history', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Chat history deleted successfully:', result);
        
        return {
            success: true,
            sessionsDeleted: result.sessions_deleted,
            messagesDeleted: result.messages_deleted,
            userId: result.user_id
        };
        
    } catch (error) {
        console.error('Error deleting chat history:', error);
        return { success: false, error: error.message };
    }
}

// Usage
deleteUserChatHistory('your-jwt-token-here')
    .then(result => {
        if (result.success) {
            alert(`Successfully deleted ${result.sessionsDeleted} sessions and ${result.messagesDeleted} messages`);
        } else {
            alert(`Failed to delete chat history: ${result.error}`);
        }
    });
```

### Python/Requests Example

```python
import requests

def delete_user_chat_history(jwt_token):
    """Delete all chat history for the authenticated user"""
    
    headers = {
        'Authorization': f'Bearer {jwt_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.delete(
            'http://localhost:8000/api/v1/chat/history',
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: Deleted {data['sessions_deleted']} sessions and {data['messages_deleted']} messages")
            return data
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

# Usage
result = delete_user_chat_history('your-jwt-token-here')
```

### cURL Example

```bash
curl -X DELETE \
  http://localhost:8000/api/v1/chat/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## Response Format

### Success Response (200 OK)

```json
{
    "message": "Chat history deleted successfully",
    "sessions_deleted": 5,
    "messages_deleted": 42,
    "user_id": "user123"
}
```

### Error Responses

#### Unauthorized (401)

```json
{
    "detail": "Invalid token"
}
```

#### Internal Server Error (500)

```json
{
    "detail": "Failed to delete chat history: Database connection error"
}
```

## Security Notes

- ⚠️ **This operation is irreversible** - all chat history will be permanently deleted
- Only the authenticated user's own chat history is deleted
- Requires valid JWT authentication token
- No additional confirmation is required - deletion happens immediately

## Use Cases

1. **Privacy Compliance**: Allow users to delete their chat data for GDPR compliance
2. **Data Management**: Let users clean up their chat history when needed
3. **Account Cleanup**: Clear chat data when user wants a fresh start
4. **Testing**: Clear test data during development

## Integration Tips

1. **Confirmation Dialog**: Always show a confirmation dialog before calling this endpoint
2. **Loading State**: Show loading indicator as deletion may take a moment for large histories
3. **Success Feedback**: Show clear success message with deletion counts
4. **Error Handling**: Implement proper error handling for network and server errors
5. **Refresh UI**: Refresh chat-related UI components after successful deletion
