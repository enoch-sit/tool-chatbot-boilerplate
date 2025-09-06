# MimicAzure Service

A Node.js service that mimics the Azure OpenAI chat completions endpoint with streaming support.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the project:

   ```bash
   npm run build
   ```

3. Start the server:

   ```bash
   npm start
   ```

## Usage

The server runs on `http://localhost:3000` and mimics the Azure OpenAI streaming API at:

```
POST /openai/deployments/{deployment}/chat/completions?stream=true
```

### Test with curl

```bash
curl -X POST http://localhost:3000/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15&stream=true ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Say something\"}]}"
```

The service will stream "hello how are you" word by word with a 500ms delay between chunks.

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the compiled server
- `npm run dev` - Build and start in one command

## Features

- Mimics Azure OpenAI chat completions endpoint
- Supports streaming responses
- Returns proper SSE (Server-Sent Events) format
- Compatible with Azure OpenAI API format
