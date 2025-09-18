# Testing Guide for mimicAzure Non-Streaming Proxy

## Overview

This guide provides step-by-step instructions to test the enhanced non-streaming proxy functionality before deploying to production servers.

## Prerequisites

1. **Node.js** installed (version 14 or higher)
2. **Valid EdUHK API Key** 
3. **SSL Certificates** (for HTTPS testing)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create or update `.env` file:

```env
# Enable proxy mode
USE_EDUHK_PROXY=true

# Your actual EdUHK API key
EDUHK_API_KEY=your-actual-api-key-here

# Server configuration
PORT=5556
REQUIRE_API_KEY=false

# Development settings (optional)
NODE_ENV=development
```

### 3. Generate SSL Certificates (if needed)

```bash
# Windows
generate-certs.bat

# Or manually
node generate-certs.js
```

## Testing Methodology

### Phase 1: Configuration Validation

**Automated Check:**
```bash
node test-nonstream-proxy.js
```

**Manual Check:**
1. Verify `.env` file exists with correct settings
2. Confirm `USE_EDUHK_PROXY=true`
3. Ensure `EDUHK_API_KEY` is set to valid key
4. Check SSL certificates exist in `certs/` folder

### Phase 2: Server Availability

**Start Server:**
```bash
# Option 1: Basic HTTP server
npm start

# Option 2: HTTPS server (recommended)
node src/server-https.js

# Option 3: Using batch file
start-https.bat
```

**Verify Server:**
- Check console for "Server running" message
- Test health endpoint: `https://localhost:5556/health`
- Confirm proxy mode is enabled in logs

### Phase 3: Proxy Functionality Testing

#### Automated Testing (Recommended)

**Run Test Script:**
```bash
# Windows
test-nonstream-proxy.bat

# Cross-platform
node test-nonstream-proxy.js
```

**Expected Output:**
```
✅ Server is running and accessible
📤 Sending request to EdUHK API...
📥 Received EdUHK response
🔄 Transforming response to Azure format
🎉 SUCCESS! Received valid response from EdUHK API
```

#### Manual Testing with curl

**Test Request:**
```bash
curl -k -X POST "https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: test-key-123" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "max_tokens": 150,
    "temperature": 0.7,
    "stream": false
  }'
```

**Expected Response Format:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1758119378,
  "model": "gpt-4o-mini-2024-07-18",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm just a computer program...",
        "refusal": null
      },
      "finish_reason": "stop",
      "content_filter_results": {
        "hate": {"filtered": false, "severity": "safe"}
      }
    }
  ],
  "usage": {
    "prompt_tokens": 21,
    "completion_tokens": 24,
    "total_tokens": 45
  },
  "system_fingerprint": "fp_...",
  "_request_id": "..."
}
```

### Phase 4: Error Handling Validation

#### Test Invalid API Key

**Update .env temporarily:**
```env
EDUHK_API_KEY=invalid-key-123
```

**Expected Behavior:**
- Request should fail gracefully
- Proper error message in response
- No server crash

#### Test Malformed Responses

**Simulate by temporarily modifying EdUHK endpoint in `eduhk-proxy.ts`:**
```typescript
const EDUHK_ENDPOINT = 'https://httpbin.org/json'; // Returns non-standard JSON
```

**Expected Behavior:**
- Parsing error handled gracefully
- Descriptive error message returned
- Server continues running

## Validation Checklist

### ✅ Proxy Configuration
- [ ] `.env` file exists with correct values
- [ ] `USE_EDUHK_PROXY=true`
- [ ] Valid `EDUHK_API_KEY` configured
- [ ] SSL certificates present

### ✅ Server Operation  
- [ ] Server starts without errors
- [ ] HTTPS endpoint accessible
- [ ] Health endpoint responds
- [ ] Proxy mode logs appear

### ✅ Request Processing
- [ ] Azure format requests accepted
- [ ] Request transformed to EdUHK format
- [ ] EdUHK API called successfully
- [ ] Response received and logged

### ✅ Response Handling
- [ ] EdUHK response accumulated properly
- [ ] JSON parsing works correctly
- [ ] Response transformed to Azure format
- [ ] Client receives valid Azure response

### ✅ Error Handling
- [ ] Invalid API key handled gracefully
- [ ] Malformed responses don't crash server
- [ ] Network errors reported appropriately
- [ ] Timeout errors handled correctly

## Troubleshooting

### Common Issues

**1. "Server not accessible" Error**
- Verify server is running: `npm start` or `node src/server-https.js`
- Check port 5556 is not in use by another process
- Ensure SSL certificates exist: run `generate-certs.bat`

**2. "Proxy parsing error"**
- Check EdUHK API key is valid and not expired
- Verify EdUHK endpoint is accessible
- Review response format in server logs

**3. "Request timeout"**
- EdUHK API may be slow or down
- Check network connectivity
- Consider increasing timeout in `sendToEdUHK` function

**4. "SSL Certificate errors"**
- Generate new certificates: `node generate-certs.js`
- Use `-k` flag with curl for self-signed certificates
- Check certificate file permissions

### Debug Mode

**Enable detailed logging:**
```env
NODE_ENV=development
DEBUG=*
```

**Check server logs for:**
- Request/response data
- Transformation steps
- Error details
- Timing information

## Production Deployment

### Pre-deployment Checklist

1. **All tests passing locally**
2. **Valid production EdUHK API key configured**
3. **Proper SSL certificates for domain**
4. **Environment variables set correctly**
5. **Security settings reviewed** (`REQUIRE_API_KEY=true`)
6. **Rate limiting configured** (if needed)

### Deployment Commands

```bash
# Build production version
npm run build

# Start with production settings
NODE_ENV=production npm start

# Or with PM2
pm2 start ecosystem.config.js
```

## Monitoring

### Key Metrics to Monitor

1. **Response Times** - Should be < 10 seconds for non-streaming
2. **Error Rates** - Should be < 1% under normal conditions  
3. **EdUHK API Status** - Monitor upstream API availability
4. **Memory Usage** - Watch for memory leaks in long-running instances
5. **Request Volume** - Track usage patterns and peak times

### Log Analysis

**Look for these patterns:**
```
✅ EdUHK non-streaming completed
📤 Sending transformed Azure response
❌ EdUHK proxy error
🔄 Transforming EdUHK response to Azure format
```

**Alert on:**
- High frequency of parsing errors
- EdUHK API timeouts
- Memory usage spikes
- Response time degradation

## Security Considerations

1. **API Key Protection** - Never log actual API keys
2. **Input Validation** - Validate all incoming requests
3. **Rate Limiting** - Implement to prevent abuse
4. **HTTPS Only** - Never run production on HTTP
5. **Error Information** - Don't expose internal details in production

---

This testing methodology ensures the proxy functionality is robust and ready for production deployment while maintaining compatibility with Azure OpenAI API clients.