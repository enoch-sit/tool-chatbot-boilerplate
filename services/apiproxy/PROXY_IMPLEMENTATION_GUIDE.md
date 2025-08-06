# Azure OpenAI Proxy Implementation Guide

## 🎯 **Overview**

You now have a complete Azure OpenAI proxy that:
- **Accepts requests** in Azure OpenAI format at `/proxyapi/azurecom/`
- **Forwards requests** to your custom API at `https://eduhk-api-ea.azure-api.net`
- **Transforms responses** back to Azure OpenAI format
- **Supports** chat completions, image generation, and embeddings

## 🗂️ **Files Created/Updated**

### New Files:
- **`routes/azureProxy.js`** - Main proxy route handler
- **`transformers/customAPITransformer.js`** - Request/response transformations
- **`test-proxy-endpoint.js`** - Test script for the proxy

### Updated Files:
- **`services/customAPIService.js`** - Updated for your API format
- **`server.js`** - Added new proxy route
- **`.env`** - Updated with your API URL
- **`package.json`** - Added test script

## 🔌 **Endpoint Mapping**

### Azure Format → Your Custom API

| Azure OpenAI Endpoint | Your Custom API | Status |
|------------------------|-----------------|---------|
| `/openai/deployments/{deployment}/chat/completions` | `/chatgpt/v1/completions` | ✅ Ready |
| `/openai/deployments/{deployment}/images/generations` | `/ai/v1/images/generations` | ✅ Ready |
| `/openai/deployments/{deployment}/embeddings` | `/ai/v1/embeddings` | ✅ Ready |

## 🔧 **Configuration**

### 1. Environment Variables (.env)
```bash
# Your Custom API Configuration
CUSTOM_API_URL=https://eduhk-api-ea.azure-api.net
CUSTOM_API_KEY=your-actual-api-key-here

# Server Configuration
PORT=3000
LOG_LEVEL=info
```

### 2. Request Format Transformation

**Azure Request:**
```json
{
  "model": "gpt-35-turbo",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 100,
  "temperature": 0.7,
  "stream": false
}
```

**Your API Request:**
```json
{
  "model": "gpt-35-turbo",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 100,
  "temperature": 0.7,
  "stream": false
}
```

### 3. Response Format Transformation

**Your API Response:**
```json
{
  "id": "chatcmpl-abc123",
  "choices": [{"message": {"content": "Hi there!"}}],
  "usage": {"total_tokens": 15}
}
```

**Azure Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1694123456,
  "model": "gpt-35-turbo",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Hi there!"},
    "finish_reason": "stop",
    "content_filter_results": {
      "hate": {"filtered": false, "severity": "safe"},
      "self_harm": {"filtered": false, "severity": "safe"},
      "sexual": {"filtered": false, "severity": "safe"},
      "violence": {"filtered": false, "severity": "safe"}
    }
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15,
    "completion_tokens_details": {...},
    "prompt_tokens_details": {...}
  },
  "system_fingerprint": "fp_custom_proxy",
  "prompt_filter_results": [...]
}
```

## 🚀 **How to Use**

### 1. Start the Proxy Server
```bash
npm start
# or for development
npm run dev
```

### 2. Test the Endpoints
```bash
# Test all endpoints
npm run test:proxy

# Or test individual components
curl -X POST http://localhost:3000/proxyapi/azurecom/openai/deployments/gpt-35-turbo/chat/completions \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_CUSTOM_API_KEY" \
  -d '{
    "model": "gpt-35-turbo",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'
```

### 3. Use with Azure OpenAI SDK

**Python Example:**
```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="http://localhost:3000/proxyapi/azurecom",
    api_key="your-custom-api-key",
    api_version="2024-10-21"
)

response = client.chat.completions.create(
    model="gpt-35-turbo",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=100
)
```

**JavaScript Example:**
```javascript
const { AzureOpenAI } = require('openai');

const client = new AzureOpenAI({
  endpoint: 'http://localhost:3000/proxyapi/azurecom',
  apiKey: 'your-custom-api-key',
  apiVersion: '2024-10-21'
});

const response = await client.chat.completions.create({
  model: 'gpt-35-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 100
});
```

## 🔒 **Security Features**

### Authentication
- Uses `api-key` header (matches your custom API)
- Forwards authentication to your backend
- No API key transformation needed

### Content Filtering
- Adds Azure-style content filtering to all responses
- Includes safety categories: hate, self_harm, sexual, violence
- Provides prompt filtering results

### Rate Limiting
- Forwards rate limiting headers from your API
- Adds Azure-style rate limit headers
- Preserves original error codes

## 🐛 **Error Handling**

### Custom API Errors → Azure Format
```json
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid parameter",
    "param": null,
    "type": null
  }
}
```

### HTTP Status Code Mapping
- `400` → `BadRequest`
- `401` → `Unauthorized` 
- `429` → `TooManyRequests`
- `500` → `InternalServerError`

## 🎛️ **Advanced Features**

### 1. Streaming Support
- ✅ **Chat completions** - Full streaming support
- ❌ **Vision requests** - Disabled (your API limitation)
- ✅ **Error handling** - Proper SSE format

### 2. Vision Support Detection
- Detects vision requests with `image_url` content
- Returns appropriate error for unsupported features
- Ready for future vision API support

### 3. Multi-Service Support
- **Chat:** `/chatgpt/v1/completions`
- **Images:** `/ai/v1/images/generations`  
- **Embeddings:** `/ai/v1/embeddings`

## 📊 **Testing & Monitoring**

### Test Scripts Available:
```bash
npm run test:proxy          # Test proxy endpoints
npm run investigate         # Test real Azure format
npm run investigate:images  # Test Azure vision format
```

### Health Check:
```bash
curl http://localhost:3000/health
```

### Logging:
- Request/response logging enabled
- Custom API call logging
- Error tracking and transformation

## 🔄 **Next Steps**

1. **Set your API key** in `.env`
2. **Start the server** with `npm start`
3. **Test with your applications** using the proxy endpoints
4. **Monitor logs** for any transformation issues
5. **Customize transformations** if needed for your specific API format

Your Azure OpenAI proxy is now ready to use! 🎉
