# Azure OpenAI Investigation Guide

## 🎯 Objective

Before implementing our API proxy, we need to investigate your Azure OpenAI endpoint to understand the exact request/response format, especially for streaming.

## 📋 Your Azure Configuration

- **Endpoint**: `https://for-fivesubject.openai.azure.com/`
- **Deployment**: `gpt-4.1`
- **Model**: `gpt-4.1`

## 🚀 Quick Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure your Azure API key:**
   Copy `.env.example` to `.env` and add your Azure API key:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   ```
   AZURE_TEST_API_KEY=your-actual-azure-api-key-here
   ```

## 🔍 Investigation Steps

### Step 1: Test Azure Format

Run the investigation script to understand Azure OpenAI's exact format:

```bash
npm run investigate
```

This will test:

- ✅ Non-streaming chat completions
- ✅ Streaming chat completions  
- ✅ Legacy completions (if supported)

### Step 2: Start the Proxy Server

In a separate terminal, start the proxy server:

```bash
npm start
```

### Step 3: Compare Formats

Run the comparison test to see how our proxy matches Azure's format:

```bash
npm run test:comparison
```

This will test both your Azure endpoint and our proxy side-by-side.

## 📊 What to Look For

### Non-Streaming Response Format

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4.1",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant", 
      "content": "Hello! I'm an AI assistant..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 30,
    "total_tokens": 50
  }
}
```

### Streaming Response Format

Each chunk should look like:

```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4.1","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4.1","choices":[{"index":0,"delta":{"content":" there"},"finish_reason":null}]}

data: [DONE]
```

Key points:

- Each line starts with `data:`
- JSON format for each chunk
- `delta.content` contains the incremental text
- Final `data: [DONE]` message
- Content-Type: `text/plain; charset=utf-8`

## 🛠️ Next Steps After Investigation

Once you run the investigation scripts, we'll:

1. **Understand your Azure format** - exact structure and streaming behavior
2. **Update the transformers** - match the exact format your Azure endpoint uses
3. **Configure for your custom API** - update the proxy to call your actual API
4. **Test compatibility** - ensure clients can't tell the difference

## 🐛 Troubleshooting

### "API key not set" error

Make sure you've copied `.env.example` to `.env` and set `AZURE_TEST_API_KEY`.

### Connection errors

- Check if your Azure endpoint URL is correct
- Verify your API key has the right permissions
- Ensure your deployment name matches exactly

### Proxy server not starting

- Check if port 3000 is available
- Make sure all dependencies are installed with `npm install`

## 📝 Information to Gather

From the investigation, we need to document:

1. **Request Headers**: What headers does Azure expect/return?
2. **Response Structure**: Exact JSON structure for both streaming and non-streaming
3. **Error Format**: How does Azure format error responses?
4. **Streaming Behavior**: Server-sent events format, chunk structure, termination
5. **Model Naming**: How deployment names appear in responses

## 🎯 Ready to Test?

Run this command to start the investigation:

```bash
npm run investigate
```

Then share the output so we can fine-tune the proxy to perfectly match Azure OpenAI's behavior!
