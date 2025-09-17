#!/bin/bash

# Test streaming format with vision input
# Make sure your server is running on port 7000

echo "🧪 Testing Stream Format with Vision Input"
echo "=========================================="

# Load environment variables
source .env 2>/dev/null || echo "Warning: .env file not found"

# Test direct API call
echo ""
echo "📡 Direct API Test:"
echo "URL: $CUSTOM_API_URL"
echo "Key: ***${CUSTOM_API_KEY: -4}"

curl -X POST "$CUSTOM_API_URL" \
  -H "Content-Type: application/json" \
  -H "api-key: $CUSTOM_API_KEY" \
  -H "User-Agent: OpenAI/NodeJS" \
  -H "Accept: text/event-stream" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are an AI assistant that helps people find information."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hello, What is this?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABJCAYAAABmUZsVAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARISURBVHhe7ZtdK61BGIDnnCgf+SwiUSiUG1GEC/6CX+oPUFygXLkhXCAfJUTItzrHs5rRYO9tzaxZx7tO89Rur1lba8969juzZt4Zv/68oSIJv/V75I0owyLKsIgyLKIMiyjDIsqwiDIsogyLwo1ADw8P1enpqTo7O1MzMzOqoaFBf5KdwsjY2NhQ+/v7yXF1dbV6eXlRs7OzqqWlJTkXAvHNhCiYn59PRCCBl6GmpkYfhUG0jN3dXbW2tvZFAlCura3VpTCIlUEkbG5ufpFgCNk8DCJl3N7eJn1EORH0F/39/boUDpEyVlZWyooAmkdHR4cuhUOcjJOTE/Xw8KBLXyEqJiYmdCks4mRsb29XbB7Dw8O59BcgSgYRcXNzo0sfQURXV5caGBjQZ8IjSsb19bU++ogRMT4+rs/kg7jIsEECr5GRkdxFgCgZ3Lj93tvbq+bm5pL3f0GucxPGCxcXF8nN3d/fq7q6OtXY2Fj2sUhkPD4+JsPsz6NLPjs/P1eXl5fq7u4uOVdfX//tNV0ILoNK7+zsqOPj4/dfuBTt7e2qu7tb9fT06DNf4VpHR0dqb2/vQxOynzb2d3BNBmO+YoLKMDPLSgMmG3MjdI68WltbkzICeJknS9rrAdckUqamppznLkFk0ByWl5eTirhU3OZzFPlex8D16HSRnJbMMq6urtTS0lLmyueBq5BMTxPasVQRQL3W19eTHywNmWTQNKSKACLDZfjuLYPEi93DSwMRk5OTTsN3LxlIqJR4+WkQQX7U9RHrJYNxhFQQwfDdZ2brJYMBldSoYIzhO3x3lsGYAvsSoV6jo6O65I6zDOYaUmHEmSXx4iyDyZLUJpJ1suYsQ3ITMXMbX7z6DKlkXXd1lvH6+qqP/j+cZUjm6elJH/nhLKOqqkofyeP5+Vkf+eEsQ+qThHqREsyCs4zQ2wBCwvaFLDjLIAkrFSaQaXMXpXCW0dTUJHasQVPZ2trSJXecZTQ3N+sjmbDXi8VrH5xl5LXoGwqig1SfT+LJWQawPiEZhCwuLjqPlr1ktLW1ie03bBYWFpyeMF4yWAkrAkQIG+TYCZSm2XjJIG9ARqkIIIROdXV1VZ8pj5cMGBoaKkRTMfT19emj8njLYJUK60UhTV7UWwawJlGE6EibIM4sQ3p08GMNDg7qUmUyyQCW76RGB/UiKtJuTcgsgy+T/GRhQSktmWUAG0OkRQf1cd0UF0QGYSituZjdQC4EkQF0ppLmLD5bJYPJgOnp6R/PkRKd/LuWD0FlABX5qeZi+gnf9ZNc9oEyKWIKnQYjjvEKfY/JsZK+sz/7Dv52bGys4lbK78hFBiCEyRHbFz/fjLlJbp45A7PgUmMBrsHaLtsgmWxBqWtxjiaaNfGUmwwDKbiDg4Pkl6Y/IYTJh3R2djqFM2PITSDHJG2Iou821rqQu4wiEbwDLTJRhkWUYRFlWEQZFlHGO0r9Bebv61JYgxciAAAAAElFTkSuQmCC"
                    }
                }
            ]
        }
    ],
    "stream": true
}'

echo ""
echo ""
echo "🔄 Proxy API Test:"
echo "URL: http://localhost:${PORT:-7000}/proxyapi/azurecom/openai/deployments/gpt-4.1/chat/completions"

curl -X POST "http://localhost:${PORT:-7000}/proxyapi/azurecom/openai/deployments/gpt-4.1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "api-key: $CUSTOM_API_KEY" \
  -H "api-version: 2024-12-01-preview" \
  -H "Accept: text/event-stream" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are an AI assistant that helps people find information."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hello, What is this?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABJCAYAAABmUZsVAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARISURBVHhe7ZtdK61BGIDnnCgf+SwiUSiUG1GEC/6CX+oPUFygXLkhXCAfJUTItzrHs5rRYO9tzaxZx7tO89Rur1lba8969juzZt4Zv/68oSIJv/V75I0owyLKsIgyLKIMiyjDIsqwiDIsogyLwo1ADw8P1enpqTo7O1MzMzOqoaFBf5KdwsjY2NhQ+/v7yXF1dbV6eXlRs7OzqqWlJTkXAvHNhCiYn59PRCCBl6GmpkYfhUG0jN3dXbW2tvZFAlCura3VpTCIlUEkbG5ufpFgCNk8DCJl3N7eJn1EORH0F/39/boUDpEyVlZWyooAmkdHR4cuhUOcjJOTE/Xw8KBLXyEqJiYmdCks4mRsb29XbB7Dw8O59BcgSgYRcXNzo0sfQURXV5caGBjQZ8IjSsb19bU++ogRMT4+rs/kg7jIsEECr5GRkdxFgCgZ3Lj93tvbq+bm5pL3f0GucxPGCxcXF8nN3d/fq7q6OtXY2Fj2sUhkPD4+JsPsz6NLPjs/P1eXl5fq7u4uOVdfX//tNV0ILoNK7+zsqOPj4/dfuBTt7e2qu7tb9fT06DNf4VpHR0dqb2/vQxOynzb2d3BNBmO+YoLKMDPLSgMmG3MjdI68WltbkzICeJknS9rrAdckUqamppznLkFk0ByWl5eTirhU3OZzFPlex8D16HSRnJbMMq6urtTS0lLmyueBq5BMTxPasVQRQL3W19eTHywNmWTQNKSKACLDZfjuLYPEi93DSwMRk5OTTsN3LxlIqJR4+WkQQX7U9RHrJYNxhFQQwfDdZ2brJYMBldSoYIzhO3x3lsGYAvsSoV6jo6O65I6zDOYaUmHEmSXx4iyDyZLUJpJ1suYsQ3ITMXMbX7z6DKlkXXd1lvH6+qqP/j+cZUjm6elJH/nhLKOqqkofyeP5+Vkf+eEsQ+qThHqREsyCs4zQ2wBCwvaFLDjLIAkrFSaQaXMXpXCW0dTUJHasQVPZ2trSJXecZTQ3N+sjmbDXi8VrH5xl5LXoGwqig1SfT+LJWQawPiEZhCwuLjqPlr1ktLW1ie03bBYWFpyeMF4yWAkrAkQIG+TYCZSm2XjJIG9ARqkIIIROdXV1VZ8pj5cMGBoaKkRTMfT19emj8njLYJUK60UhTV7UWwawJlGE6EibIM4sQ3p08GMNDg7qUmUyyQCW76RGB/UiKtJuTcgsgy+T/GRhQSktmWUAG0OkRQf1cd0UF0QGYSituZjdQC4EkQF0ppLmLD5bJYPJgOnp6R/PkRKd/LuWD0FlABX5qeZi+gnf9ZNc9oEyKWIKnQYjjvEKfY/JsZK+sz/7Dv52bGys4lbK78hFBiCEyRHbFz/fjLlJbp45A7PgUmMBrsHaLtsgmWxBqWtxjiaaNfGUmwwDKbiDg4Pkl6Y/IYTJh3R2djqFM2LITSDHJG2Iou821rqQu4wiEbwDLTJRhkWUYRFlWEQZFlHGO0r9Bebv61JYgxciAAAAAElFTkSuQmCC"
                    }
                }
            ]
        }
    ],
    "stream": true
}'

echo ""
echo "🎉 Tests completed!"
