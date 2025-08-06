# Custom Custom API Endpoints Technical Documentation

## Version History

- **v1.0** (Initial Draft): Based on provided user manuals for DALL-E 3 (v1.1), Embeddings (v1.0), and ChatGPT (v1.2).
- **Date**: August 05, 2025.
- **Prepared By**: Grok 4 (xAI) – Automated synthesis from OCR-extracted content.

## Introduction

This documentation details custom API endpoints inspired by Azure OpenAI services, as derived from the provided user manuals. These endpoints appear to be hosted on a custom Azure API Management instance (e.g., `https://eduhk-api-ea.azure-api.net` or similar; URLs in source documents are partially obscured due to OCR artifacts). The APIs cover image generation (DALL-E 3), embeddings generation, and chat completions (ChatGPT-like).

### Key Features

- **Authentication**: All requests require an API key passed in the `api-key` HTTP header. Do not share keys to prevent unauthorized access.
- **Rate Limiting**: Enforced for fair usage. Exceeding limits may result in 429 errors. Contact support for details on quotas.
- **Error Handling**: Errors return JSON objects with `code` and `message` fields. Common codes include 400 (invalid input), 401 (authentication issues), 429 (rate limits), and 500 (server errors).
- **Content-Type**: `application/json` for most requests/responses.
- **Base URL**: Inferred as `https://eduhk-api-ea.azure-api.net` (correct any typos in implementation).

Endpoints are grouped by service. Examples use cURL for requests. Streaming is supported where noted.

## 1. Image Generation API (DALL-E 3)

This API generates images from text prompts using a DALL-E 3-like model. It supports quality variations, sizes, and response formats.

### Endpoint: Image Generations

- **URL**: `/ai/v1/images/generations` (POST)
- **Description**: Generate one or more images based on a text prompt.
- **Method**: POST
- **Headers**:
  - `api-key`: Your API key (required).
  - `Content-Type`: `application/json`.
- **Request Body Parameters** (JSON):

  | Parameter | Type | Required | Default | Description |
  |-----------|------|----------|---------|-------------|
  | prompt | string | Yes | N/A | The text description of the image to generate (max ~4,000 characters). |
  | quality | string | No | "standard" | Image quality: "hd" (finer details, higher consistency) or "standard" (faster generation). |
  | size | string | No | "1024x1024" | Image dimensions: "1024x1024", "1792x1024", or "1024x1792". Square sizes generate faster. |
  | response_format | string | No | "url" | Format of returned images: "url" (temporary URL, expires ~1 hour) or "b64_json" (base64-encoded image data). |
  | n | integer | No | 1 | Number of images to generate (1-10). |

- **Request Example**:

  ```bash
  curl -X POST https://eduhk-api-ea.azure-api.net/ai/v1/images/generations \
    -H "api-key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "A cute puppy in space",
      "quality": "hd",
      "size": "1792x1024",
      "response_format": "b64_json",
      "n": 1
    }'
  ```

- **Response** (JSON):
  - Status: 200 OK
  - Body:

    ```json
    {
      "created": 1694123456,
      "data": [
        {
          "url": "https://example.com/generated-image.png",  // If response_format="url"
          "b64_json": "<base64-encoded-image>",  // If response_format="b64_json"
          "revised_prompt": "Optimized prompt text"
        }
      ]
    }
    ```

  - Notes: Includes content filtering results (e.g., for safety). URLs are temporary.

- **Errors**:

  | Code | Message Example | Solution |
  |------|-----------------|----------|
  | 400 | Invalid parameter | Verify prompt, quality, size, etc. |
  | 401 | Invalid Authentication | Check API key. |
  | 429 | Rate limit reached | Pace requests or check quota. |
  | 500 | Server error | Retry later; contact support. |

- **Notes**: Streaming not explicitly supported in this endpoint. Use for non-interactive image creation.

## 2. Embeddings API

This API generates vector embeddings from input text, suitable for machine learning tasks like semantic search or clustering.

### Endpoint: Embeddings

- **URL**: `/ai/v1/embeddings` (POST) – Inferred; source URL shows `/ai/v1/images/generations` but description matches embeddings (likely OCR error).
- **Description**: Compute embeddings for given input text.
- **Method**: POST
- **Headers**:
  - `api-key`: Your API key (required).
  - `Content-Type`: `application/json`.
- **Request Body Parameters** (JSON):

  | Parameter | Type | Required | Default | Description |
  |-----------|------|----------|---------|-------------|
  | input | string or array | Yes | N/A | Text to embed (single string or array of strings). Max length varies by model. |
  | model | string | No | "text-embedding-ada-002" (inferred) | Embedding model to use. |

- **Request Example**:

  ```bash
  curl -X POST https://eduhk-api-ea.azure-api.net/ai/v1/embeddings \
    -H "api-key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "input": "Your text string goes here",
      "model": "text-embedding-ada-002"
    }'
  ```

- **Response** (JSON):
  - Status: 200 OK
  - Body (simplified; source shows repetitive braces, likely OCR artifact):

    ```json
    {
      "object": "list",
      "data": [
        {
          "object": "embedding",
          "embedding": [0.002306, -0.009327, ...],  // Array of floats
          "index": 0
        }
      ],
      "model": "text-embedding-ada-002",
      "usage": {
        "prompt_tokens": 8,
        "total_tokens": 8
      }
    }
    ```

- **Errors**: Same as Image Generation (400, 401, 429, 500).

- **Notes**: Embeddings are dense vectors (e.g., 1536 dimensions for ada-002). No streaming support.

## 3. Chat Completions API (ChatGPT)

This API generates conversational responses, supporting streaming for real-time output.

### Endpoint: Balance

- **URL**: `/chatgpt/v1/balance` (GET)
- **Description**: Retrieve account balance information (e.g., credits or quota).
- **Method**: GET
- **Headers**:
  - `api-key`: Your API key (required).
- **Request Body**: None.
- **Request Example**:

  ```bash
  curl -X GET https://eduhk-api-ea.azure-api.net/chatgpt/v1/balance \
    -H "api-key: YOUR_API_KEY"
  ```

- **Response** (JSON): Inferred as balance details (e.g., `{"balance": 1000}`); exact format not detailed in source.
- **Errors**: Standard (401, 429, 500).

### Endpoint: Completions

- **URL**: `/chatgpt/v1/completions` (POST) – Source shows `/chatgpt/v1/completion` (likely typo).
- **Description**: Generate chat responses from messages.
- **Method**: POST
- **Headers**:
  - `api-key`: Your API key (required).
  - `Content-Type`: `application/json`.
- **Request Body Parameters** (JSON):

  | Parameter | Type | Required | Default | Description |
  |-----------|------|----------|---------|-------------|
  | model | string | Yes | N/A | Model (e.g., "gpt-35-turbo"). |
  | messages | array | Yes | N/A | Array of message objects: `[{"role": "system/user/assistant", "content": "text"}]`. |
  | temperature | number | No | 0.7 | Sampling temperature (0-2; higher = more creative). |
  | top_p | number | No | 0.95 | Nucleus sampling (0-1). |
  | frequency_penalty | number | No | 0 | Penalty for repeated tokens (-2 to 2). |
  | presence_penalty | number | No | 0 | Penalty for new topics (-2 to 2). |
  | max_tokens | integer | No | 4096 | Max tokens in response. |
  | stream | boolean | No | false | Enable streaming (SSE format). |

- **Request Example** (Non-Streaming):

  ```bash
  curl -X POST https://eduhk-api-ea.azure-api.net/chatgpt/v1/completions \
    -H "api-key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gpt-35-turbo",
      "messages": [{"role": "user", "content": "Hello!"}],
      "temperature": 0.7,
      "max_tokens": 100
    }'
  ```

- **Response (Non-Streaming, JSON)**:

  ```json
  {
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "created": 1694123456,
    "model": "gpt-35-turbo",
    "choices": [
      {
        "index": 0,
        "message": {"role": "assistant", "content": "Hi there!"},
        "finish_reason": "stop"
      }
    ],
    "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
  }
  ```

- **Streaming Response** (With `stream: true`):
  - Content-Type: `text/event-stream`.
  - Events: `data: {"id": "...", "choices": [{"delta": {"content": "chunk"}}]}`
  - Ends with `data: [DONE]`.
  - Includes prompt_filter_results (first chunk) and usage (final chunk).
  - Content filtering: hate, self_harm, etc., with `filtered` and `severity`.

- **Errors**:

  | Code | Overview | Solution |
  |------|----------|----------|
  | 400 | Invalid model/messages | Verify inputs. |
  | 401 | Invalid/incorrect API key or no model available | Check key; retry. |
  | 429 | Rate limit or quota exceeded | Pace requests; replenish credits. |
  | 500 | Server error | Retry; contact support. |

- **Notes**: Supports function/tool calls in responses. System fingerprint for tracking.

## Security and Best Practices

- **API Key Management**: Store securely; rotate if compromised.
- **Content Filtering**: Responses include safety checks; handle filtered content.
- **Quota Management**: Monitor via balance endpoint.
- **Error Retry**: Implement exponential backoff for 429/500 errors.
- **Compliance**: Ensure prompts comply with usage policies (e.g., no harmful content).

For updates or support, refer to the Office of the Chief Information Officer. This doc synthesizes OCR data; verify against original PDFs for accuracy.
