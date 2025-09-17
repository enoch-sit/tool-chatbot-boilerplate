# MimicAzure Service

A Node.js service that mimics the Azure OpenAI chat completions endpoint with streaming support.

## 📚 Documentation

- **[HTTPS Setup Guide](HTTPS_DOCUMENTATION.md)** - Complete guide for secure HTTPS setup
- **[Quick Start](#setup)** - Basic HTTP setup (below)

## Setup

### Option 1: Node.js (Development)

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

### Option 2: Docker (Recommended)

1. Build and start with Docker Compose:

   ```bash
   docker-compose up -d
   ```

   Or use the Windows batch files:

   ```bash
   docker-start.bat
   ```

2. Stop the service:

   ```bash
   docker-compose down
   ```

   Or use:

   ```bash
   docker-stop.bat
   ```

## Usage

The server runs on `http://localhost:5555` and mimics the Azure OpenAI API at:

```
POST /openai/deployments/{deployment}/chat/completions
```

Supports both streaming (`stream=true`) and non-streaming (`stream=false` or omitted) responses.

### Test with curl

```bash
curl -X POST http://localhost:5555/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15&stream=true ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Say something\"}]}"
```

### Test with Postman

- **URL**: `http://localhost:5555/openai/deployments/gpt-35-turbo/chat/completions?stream=true`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{
  "messages": [{"role": "user", "content": "Hello"}]
}
```

The service will stream "hello how are you" word by word with a 500ms delay between chunks.

## Scripts

### Node.js Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:https` - Compile HTTPS server
- `npm start` - Start the compiled HTTP server  
- `npm run start:https` - Start the HTTPS server (recommended)
- `npm run dev` - Build and start HTTP in one command
- `npm run dev:https` - Build and start HTTPS in development mode
- `npm run generate-certs` - Generate SSL certificates

### Docker Scripts (Windows)

- `docker-build.bat` - Build Docker image
- `docker-start.bat` - Start service with Docker Compose
- `docker-stop.bat` - Stop the service

## Features

- Mimics Azure OpenAI chat completions endpoint
- Supports streaming responses
- Returns proper SSE (Server-Sent Events) format
- Compatible with Azure OpenAI API format
