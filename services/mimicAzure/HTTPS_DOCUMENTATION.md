# MimicAzure HTTPS Server Documentation

## 🔒 Secure Azure OpenAI API Mock Service

The MimicAzure HTTPS server provides a **production-ready HTTPS endpoint** that mimics the Azure OpenAI Chat Completions API with streaming support. Perfect for development, testing, and integration work without using real Azure OpenAI credits.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [HTTPS Configuration](#https-configuration)
- [API Usage](#api-usage)
- [Testing](#testing)
- [Postman Integration](#postman-integration)
- [Docker Deployment](#docker-deployment)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

```bash
# 1. Generate SSL certificates
npm run generate-certs

# 2. Start HTTPS server
npm run start:https

# 3. Test the service
node test-https.js
```

**Access URLs:**

- **HTTPS**: `https://localhost:5556` ✅ (Trusted certificates)
- **HTTP**: `http://localhost:5555` (Fallback)

---

## 📋 Prerequisites

### Required Software

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)

### For Trusted SSL Certificates (Recommended)

Choose one of these options:

#### Option 1: mkcert (Easiest - Recommended)

```bash
# Install via Chocolatey (Windows)
choco install mkcert

# Or download from: https://github.com/FiloSottile/mkcert/releases
```

#### Option 2: OpenSSL

```bash
# Download from: https://slproweb.com/products/Win32OpenSSL.html
```

#### Option 3: winget (Windows Package Manager)

```bash
winget install FiloSottile.mkcert
```

---

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate SSL Certificates

```bash
# Automatic certificate generation (tries mkcert first, then OpenSSL)
npm run generate-certs

# Or use specific method
mkcert localhost 127.0.0.1  # Creates localhost+1.pem and localhost+1-key.pem
```

### 3. Start the Server

```bash
# Start both HTTP (5555) and HTTPS (5556) servers
npm run start:https

# Or use the convenient batch file (Windows)
start-https.bat
```

---

## 🔒 HTTPS Configuration

### Certificate Files

The server expects SSL certificates in the `certs/` directory:

```
certs/
├── server.key    # Private key
└── server.crt    # Certificate
```

### Automatic Certificate Detection

The server automatically:

1. ✅ **Checks for certificates** in `certs/` directory
2. ✅ **Starts HTTPS** on port 5556 if certificates found
3. ✅ **Always starts HTTP** on port 5555 as fallback
4. ✅ **Shows helpful messages** about certificate status

### Certificate Types Supported

| Certificate Type | Trust Level | Browser Warnings | Use Case |
|------------------|-------------|-------------------|----------|
| **mkcert** | ✅ Fully trusted | ❌ None | Recommended for development |
| **Self-signed** | ⚠️ Not trusted | ⚠️ Security warnings | Basic testing |
| **OpenSSL** | ⚠️ Not trusted | ⚠️ Security warnings | Manual setup |

---

## 🌐 API Usage

### Base Endpoint

```
https://localhost:5556/openai/deployments/{deployment}/chat/completions
```

### Supported Parameters

- `{deployment}`: Any string (e.g., `gpt-35-turbo`, `gpt-4.1`)
- `stream`: `true` for streaming, `false` or omit for single response
- `api-version`: Any version string (e.g., `2023-05-15`, `2024-10-21`)

### Request Format

#### Streaming Request

```bash
POST https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions?stream=true&api-version=2024-10-21
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ]
}
```

#### Non-Streaming Request

```bash
POST https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions
Content-Type: application/json

{
  "messages": [
    {
      "role": "user", 
      "content": "Hello, how are you?"
    }
  ]
}
```

### Response Format

#### Streaming Response

```
data: {"choices":[],"created":0,"id":"","model":"","object":"","prompt_filter_results":[{"prompt_index":0,"content_filter_results":{"hate":{"filtered":false,"severity":"safe"},"jailbreak":{"filtered":false,"detected":false},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}}}]}

data: {"choices":[{"content_filter_results":{},"delta":{"content":"","refusal":null,"role":"assistant"},"finish_reason":null,"index":0,"logprobs":null}],"created":1757229229,"id":"chatcmpl-8eotzk8dntczkylivz0v","model":"gpt-4.1-2025-04-14","object":"chat.completion.chunk","system_fingerprint":"fp_9ahsuj8xcl"}

data: {"choices":[{"content_filter_results":{"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"Hello! "},"finish_reason":null,"index":0,"logprobs":null}],"created":1757229229,"id":"chatcmpl-8eotzk8dntczkylivz0v","model":"gpt-4.1-2025-04-14","object":"chat.completion.chunk","system_fingerprint":"fp_9ahsuj8xcl"}

data: [DONE]
```

#### Non-Streaming Response

```json
{
  "choices": [
    {
      "message": {
        "content": "Hello! I'm doing well, thank you for asking. How can I assist you today?"
      }
    }
  ]
}
```

---

## 🧪 Testing

### Built-in Test Scripts

#### Test HTTPS Endpoint

```bash
node test-https.js
```

#### Test HTTP Endpoint

```bash
node test.js
```

### Manual Testing with curl

#### HTTPS Streaming Test

```bash
curl -k -X POST https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions?stream=true ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]}"
```

#### HTTPS Non-Streaming Test

```bash
curl -k -X POST https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]}"
```

**Note**: The `-k` flag bypasses SSL verification for self-signed certificates.

---

## 📮 Postman Integration

### Collection Setup

#### 1. Create New Request

- **Method**: `POST`
- **URL**: `https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions`

#### 2. Query Parameters

| Key | Value |
|-----|-------|
| `stream` | `true` |
| `api-version` | `2024-10-21` |

#### 3. Headers

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

#### 4. Request Body (raw JSON)

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Write a short poem about coding"
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7
}
```

### SSL Certificate Handling

#### For mkcert Certificates (Recommended)

- ✅ **No configuration needed** - Postman will trust the certificates automatically

#### For Self-Signed Certificates

1. **Disable SSL verification**:
   - Go to Postman Settings → General
   - Turn OFF "SSL certificate verification"

2. **Or add certificate exception**:
   - Go to Postman Settings → Certificates
   - Add your certificate files

### Expected Response

You should see streaming JSON chunks with realistic Azure OpenAI format including:

- Content filter results
- System fingerprint
- Dynamic chat completion IDs
- Proper finish reasons

---

## 🐳 Docker Deployment

### Docker Compose (Recommended)

#### 1. Generate Certificates First

```bash
npm run generate-certs
```

#### 2. Start with Docker

```bash
docker-compose up -d
```

#### 3. Verify Service

```bash
# Check logs
docker-compose logs -f

# Test endpoint
curl -k https://localhost:5556/health
```

### Manual Docker Build

#### 1. Build Image

```bash
docker build -t mimic-azure-https .
```

#### 2. Run Container

```bash
docker run -d \
  -p 5555:5555 \
  -p 5556:5556 \
  -v $(pwd)/certs:/app/certs:ro \
  --name mimic-azure \
  mimic-azure-https
```

### Docker Configuration

The `docker-compose.yml` includes:

```yaml
services:
  mimic-azure:
    build: .
    ports:
      - "5555:5555"   # HTTP
      - "5556:5556"   # HTTPS
    environment:
      - PORT=5555
      - HTTPS_PORT=5556
    volumes:
      - ./certs:/app/certs:ro  # Mount certificates
    restart: unless-stopped
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5555
```

**Solution:**

```bash
# Stop existing Docker container
docker-compose down

# Or kill process using port
netstat -ano | findstr :5555
taskkill /PID <PID> /F
```

#### 2. SSL Certificate Not Found

```
⚠️ SSL certificates not found in certs/ directory
```

**Solution:**

```bash
# Generate certificates
npm run generate-certs

# Or manually create with mkcert
mkcert localhost 127.0.0.1
mv localhost+1.pem certs/server.crt
mv localhost+1-key.pem certs/server.key
```

#### 3. Browser Security Warnings

```
Your connection is not private
```

**Solutions:**

1. **Use mkcert** (recommended):

   ```bash
   mkcert -install  # Install CA
   npm run generate-certs
   ```

2. **Accept self-signed certificate**:
   - Click "Advanced" → "Proceed to localhost (unsafe)"

3. **Disable security in development**:
   - Chrome: `--ignore-certificate-errors` flag
   - Postman: Disable SSL verification

#### 4. TypeScript Compilation Errors

```
error TS1259: Module can only be default-imported using the 'esModuleInterop' flag
```

**Solution:** The server uses CommonJS imports - ensure you're using the correct syntax in any modifications.

### Health Check

#### Endpoint

```bash
GET https://localhost:5556/health
```

#### Expected Response

```json
{
  "status": "ok",
  "timestamp": "2025-09-07T07:13:49.123Z"
}
```

### Log Analysis

#### Check Server Logs

```bash
# Docker logs
docker-compose logs -f mimic-azure

# Direct server logs
npm run start:https
```

#### Expected Startup Messages

```
🔒 HTTPS Server running at https://localhost:5556
🌐 HTTP Server running at http://localhost:5555
```

---

## 📚 Advanced Usage

### Custom Response Modification

To modify the response content, edit the `message` variable in `src/server-https.ts`:

```typescript
// Current response
const message = 'Hello! I\'m doing well, thank you for asking. How can I assist you today?';

// Custom response example
const message = 'This is a custom response from your mock Azure OpenAI service.';
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5555` | HTTP port |
| `HTTPS_PORT` | `5556` | HTTPS port |
| `NODE_ENV` | `development` | Environment mode |

### Integration with Existing Applications

Replace your Azure OpenAI endpoint:

```javascript
// Before (Real Azure OpenAI)
const endpoint = 'https://your-azure-openai.openai.azure.com';

// After (MimicAzure)
const endpoint = 'https://localhost:5556';
```

---

## 🏁 Conclusion

The MimicAzure HTTPS server provides a **production-quality development environment** for Azure OpenAI integration testing. With trusted SSL certificates and realistic API responses, it's perfect for:

- ✅ **Development**: Test without API costs
- ✅ **CI/CD**: Reliable testing environment  
- ✅ **Integration**: Drop-in Azure OpenAI replacement
- ✅ **Debugging**: Consistent, predictable responses
- ✅ **Security**: HTTPS with trusted certificates

**Happy coding!** 🚀
