# API Proxy Service

A Node.js service that acts as a proxy between your custom API and clients expecting Azure OpenAI or Amazon Bedrock API formats.

## Features

- ✅ Azure OpenAI API format compatibility
- ✅ Amazon Bedrock API format compatibility  
- ✅ Request/Response transformation
- ✅ Error handling and logging
- ✅ CORS support
- ✅ Environment-based configuration

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

3. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Azure OpenAI Compatible Endpoints

- `POST /azure/openai/deployments/{deployment-id}/chat/completions`
- `POST /azure/openai/deployments/{deployment-id}/completions`

### Bedrock Compatible Endpoints  

- `POST /bedrock/model/{model-id}/invoke`
- `POST /bedrock/model/{model-id}/invoke-with-response-stream`

## Configuration

Set these environment variables in your `.env` file:

- `PORT` - Server port (default: 3000)
- `CUSTOM_API_URL` - Your custom API endpoint URL
- `CUSTOM_API_KEY` - API key for your custom endpoint
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

## Example Usage

### Azure OpenAI Format

```bash
curl -X POST http://localhost:3000/azure/openai/deployments/gpt-35-turbo/chat/completions \
  -H "Content-Type: application/json" \
  -H "api-key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

### Bedrock Format

```bash
curl -X POST http://localhost:3000/bedrock/model/anthropic.claude-v2/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: AWS4-HMAC-SHA256 ..." \
  -d '{
    "prompt": "Hello!",
    "max_tokens_to_sample": 100
  }'
```
