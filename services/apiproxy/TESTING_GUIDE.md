# Azure OpenAI Endpoint Testing Guide

## Available Testing Methods

### 1. Direct Azure API Testing (First Priority)
Test the Azure OpenAI service directly to verify credentials and endpoint:

```bash
# Quick test
node quick-test.js

# Comprehensive test (includes streaming, images, legacy completions)
npm run test:azure
# or
node test-azure-format.js

# Image vision testing
npm run investigate:images
# or
node test-azure-image-format.js
```

### 2. Start the Proxy Server
Start your proxy server that translates between formats:

```bash
# Start the proxy server (default port 3000)
npm start
# or
node server.js

# Development mode with auto-restart
npm run dev
```

### 3. Test Through the Proxy
Test your custom API through the Azure OpenAI-compatible proxy:

```bash
# Test proxy endpoints (requires server running on port 3002)
npm run test:proxy
# or
node test-proxy-endpoint.js

# Test on specific port
npm run test:proxy:3100
# or
node test-proxy-port-3100.js
```

## Quick Start Testing

### Step 1: Test Direct Azure Connection
```bash
node quick-test.js
```

### Step 2: Start the Server
```bash
npm start
```

### Step 3: Test a Simple Request via cURL
```bash
# Windows Command Prompt
curl -X POST "http://localhost:3000/openai/deployments/gpt-4.1/chat/completions?api-version=2024-12-01-preview" ^
-H "Content-Type: application/json" ^
-H "api-key: your-azure-openai-api-key-here" ^
-d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello!\"}],\"max_tokens\":50}"
```

## Environment Configuration
Your `.env` file should have these variables set:

```env
# Your proxy server port
PORT=3000

# Azure OpenAI Test Configuration
AZURE_TEST_ENDPOINT=https://for-fivesubject.openai.azure.com/
AZURE_TEST_DEPLOYMENT=gpt-4.1
AZURE_TEST_MODEL_NAME=gpt-4.1
AZURE_TEST_API_KEY=your-azure-openai-api-key-here
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Your Custom API Configuration (for proxy testing)
CUSTOM_API_URL=https://your-custom-api.com/v1
CUSTOM_API_KEY=your-custom-api-key-here
```

## Testing Endpoints

### Available Routes:
1. **Chat Completions**: `/openai/deployments/{deployment}/chat/completions`
2. **Legacy Completions**: `/openai/deployments/{deployment}/completions`
3. **Bedrock**: `/bedrock/*` (if configured)
4. **Custom API**: Direct passthrough routes

### Sample Requests:

#### Chat Completions (Non-streaming)
```json
POST /openai/deployments/gpt-4.1/chat/completions?api-version=2024-12-01-preview
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

#### Chat Completions (Streaming)
```json
POST /openai/deployments/gpt-4.1/chat/completions?api-version=2024-12-01-preview
{
  "messages": [
    {"role": "user", "content": "Count from 1 to 5"}
  ],
  "max_tokens": 100,
  "stream": true
}
```

## Troubleshooting

### Common Issues:
1. **Module not found**: Run `npm install`
2. **401 Unauthorized**: Check your API key in `.env`
3. **Connection timeout**: Verify your Azure endpoint URL
4. **404 Not found**: Check the deployment name and API version

### Debug Commands:
```bash
# Check dependencies
node check-dependencies.js

# Debug connection
node debug-connection.js

# Full investigation
npm run investigate:full
```
