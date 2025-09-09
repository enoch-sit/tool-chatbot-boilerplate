# Example API Requests

This file contains example requests for testing the API proxy service with both Azure OpenAI and Bedrock formats.

## Azure OpenAI Examples

### Chat Completions

```bash
curl -X POST http://localhost:3000/azure/openai/deployments/gpt-35-turbo/chat/completions \
  -H "Content-Type: application/json" \
  -H "api-key: your-api-key" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "max_tokens": 150,
    "temperature": 0.7,
    "top_p": 1.0
  }'
```

### Legacy Completions

```bash
curl -X POST http://localhost:3000/azure/openai/deployments/gpt-35-turbo/completions \
  -H "Content-Type: application/json" \
  -H "api-key: your-api-key" \
  -d '{
    "prompt": "Once upon a time",
    "max_tokens": 100,
    "temperature": 0.8
  }'
```

## Bedrock Examples

### Anthropic Claude

```bash
curl -X POST http://localhost:3000/bedrock/model/anthropic.claude-v2/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20230101/us-east-1/bedrock/aws4_request, SignedHeaders=host;x-amz-date, Signature=example" \
  -d '{
    "prompt": "\\n\\nHuman: What is machine learning?\\n\\nAssistant:",
    "max_tokens_to_sample": 200,
    "temperature": 0.7,
    "top_p": 0.9
  }'
```

### Amazon Titan

```bash
curl -X POST http://localhost:3000/bedrock/model/amazon.titan-text-express-v1/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: AWS4-HMAC-SHA256 Credential=..." \
  -d '{
    "inputText": "Explain quantum computing in simple terms",
    "textGenerationConfig": {
      "maxTokenCount": 200,
      "temperature": 0.7,
      "topP": 0.9,
      "stopSequences": []
    }
  }'
```

### Cohere Command

```bash
curl -X POST http://localhost:3000/bedrock/model/cohere.command-text-v14/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: AWS4-HMAC-SHA256 Credential=..." \
  -d '{
    "prompt": "Write a short story about a robot learning to paint",
    "max_tokens": 150,
    "temperature": 0.8,
    "p": 0.9
  }'
```

### Streaming Request (Bedrock)

```bash
curl -X POST http://localhost:3000/bedrock/model/anthropic.claude-v2/invoke-with-response-stream \
  -H "Content-Type: application/json" \
  -H "Authorization: AWS4-HMAC-SHA256 Credential=..." \
  -d '{
    "prompt": "\\n\\nHuman: Tell me a joke\\n\\nAssistant:",
    "max_tokens_to_sample": 100
  }'
```

## Testing with Different Languages

### Python Example

```python
import requests
import json

# Azure OpenAI format
url = "http://localhost:3000/azure/openai/deployments/gpt-35-turbo/chat/completions"
headers = {
    "Content-Type": "application/json",
    "api-key": "your-api-key"
}
data = {
    "messages": [{"role": "user", "content": "Hello, world!"}],
    "max_tokens": 50
}

response = requests.post(url, headers=headers, json=data)
print(json.dumps(response.json(), indent=2))
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function testAzureOpenAI() {
  try {
    const response = await axios.post('http://localhost:3000/azure/openai/deployments/gpt-35-turbo/chat/completions', {
      messages: [{ role: 'user', content: 'What is AI?' }],
      max_tokens: 100
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'your-api-key'
      }
    });
    
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAzureOpenAI();
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Error Testing

### Invalid API Key

```bash
curl -X POST http://localhost:3000/azure/openai/deployments/gpt-35-turbo/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

### Invalid Route

```bash
curl -X POST http://localhost:3000/invalid/route \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```
