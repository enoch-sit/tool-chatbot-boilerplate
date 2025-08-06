# Azure OpenAI API Format Analysis

## Summary

Based on the investigation of `https://for-fivesubject.openai.azure.com/` with deployment `gpt-4.1`, here's the complete Azure OpenAI API format analysis:

## URL Structure

```
https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version={version}
```

**Example:**

```
https://for-fivesubject.openai.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2024-10-21
```

## Request Headers

```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

## Non-Streaming Response Format

### Status & Headers

- **Status:** 200 OK
- **Content-Type:** `application/json`
- **Key Headers:**
  - `apim-request-id`: Request tracking ID
  - `x-ms-region`: "East US"
  - `x-ratelimit-remaining-requests`: Rate limit info
  - `x-ratelimit-limit-requests`: Rate limit info
  - `x-ratelimit-remaining-tokens`: Token limit info
  - `x-ratelimit-limit-tokens`: Token limit info
  - `x-ms-deployment-name`: Deployment name
  - `azureml-model-session`: Model session ID

### Response Body Structure

```json
{
  "choices": [
    {
      "content_filter_results": {
        "hate": { "filtered": false, "severity": "safe" },
        "self_harm": { "filtered": false, "severity": "safe" },
        "sexual": { "filtered": false, "severity": "safe" },
        "violence": { "filtered": false, "severity": "safe" }
      },
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "annotations": [],
        "content": "Response content here",
        "refusal": null,
        "role": "assistant"
      }
    }
  ],
  "created": 1754396640,
  "id": "chatcmpl-C1AzwZZD1ea9wUuqXbOHCWwGHYVJX",
  "model": "gpt-4.1-2025-04-14",
  "object": "chat.completion",
  "prompt_filter_results": [
    {
      "prompt_index": 0,
      "content_filter_results": {
        "hate": { "filtered": false, "severity": "safe" },
        "jailbreak": { "filtered": false, "detected": false },
        "self_harm": { "filtered": false, "severity": "safe" },
        "sexual": { "filtered": false, "severity": "safe" },
        "violence": { "filtered": false, "severity": "safe" }
      }
    }
  ],
  "system_fingerprint": "fp_b663f05c2c",
  "usage": {
    "completion_tokens": 29,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens": 26,
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    },
    "total_tokens": 55
  }
}
```

## Streaming Response Format

### Status & Headers

- **Status:** 200 OK
- **Content-Type:** `text/event-stream; charset=utf-8`
- **Transfer-Encoding:** `chunked`
- **Key Headers:** Same as non-streaming + streaming-specific headers

### Streaming Chunks Structure

#### 1. Initial Filter Check Chunk

```json
{
  "choices": [],
  "created": 0,
  "id": "",
  "model": "",
  "object": "",
  "prompt_filter_results": [
    {
      "prompt_index": 0,
      "content_filter_results": {
        "hate": { "filtered": false, "severity": "safe" },
        "jailbreak": { "detected": false, "filtered": false },
        "self_harm": { "filtered": false, "severity": "safe" },
        "sexual": { "filtered": false, "severity": "safe" },
        "violence": { "filtered": false, "severity": "safe" }
      }
    }
  ]
}
```

#### 2. Role Assignment Chunk

```json
{
  "choices": [
    {
      "content_filter_results": {},
      "delta": {
        "content": "",
        "refusal": null,
        "role": "assistant"
      },
      "finish_reason": null,
      "index": 0,
      "logprobs": null
    }
  ],
  "created": 1754396642,
  "id": "chatcmpl-C1AzysAdkp3doW7GcVTFlewYGO4n7",
  "model": "gpt-4.1-2025-04-14",
  "object": "chat.completion.chunk",
  "system_fingerprint": "fp_b663f05c2c"
}
```

#### 3. Content Chunks

```json
{
  "choices": [
    {
      "content_filter_results": {
        "hate": { "filtered": false, "severity": "safe" },
        "self_harm": { "filtered": false, "severity": "safe" },
        "sexual": { "filtered": false, "severity": "safe" },
        "violence": { "filtered": false, "severity": "safe" }
      },
      "delta": {
        "content": "One"  // Content piece
      },
      "finish_reason": null,
      "index": 0,
      "logprobs": null
    }
  ],
  "created": 1754396642,
  "id": "chatcmpl-C1AzysAdkp3doW7GcVTFlewYGO4n7",
  "model": "gpt-4.1-2025-04-14",
  "object": "chat.completion.chunk",
  "system_fingerprint": "fp_b663f05c2c"
}
```

#### 4. Final Chunk

```json
{
  "choices": [
    {
      "content_filter_results": {},
      "delta": {},
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null
    }
  ],
  "created": 1754396642,
  "id": "chatcmpl-C1AzysAdkp3doW7GcVTFlewYGO4n7",
  "model": "gpt-4.1-2025-04-14",
  "object": "chat.completion.chunk",
  "system_fingerprint": "fp_b663f05c2c"
}
```

#### 5. Stream End

```
data: [DONE]
```

## Key Azure-Specific Features

### 1. Content Filtering

- Every chunk includes `content_filter_results`
- Initial prompt filtering in `prompt_filter_results`
- Categories: `hate`, `self_harm`, `sexual`, `violence`
- Additional `jailbreak` detection in prompt filtering

### 2. Model Information

- Response model: `"gpt-4.1-2025-04-14"` (actual model, not deployment name)
- Deployment tracked in headers: `x-ms-deployment-name`

### 3. Usage Tracking

- Detailed token usage with subcategories
- `completion_tokens_details` and `prompt_tokens_details`

### 4. Legacy Completions

- **NOT SUPPORTED** for chat models like GPT-4
- Returns 400 Bad Request with clear error message

## Rate Limiting

- Request-based: `x-ratelimit-limit-requests: 250`
- Token-based: `x-ratelimit-limit-tokens: 250000`
- Current limits tracked in response headers

## Server-Sent Events Format

```
data: {JSON_CHUNK}

data: {JSON_CHUNK}

data: [DONE]

```

## Implementation Notes for Proxy

1. **Content Filtering:** Must preserve Azure's content filtering structure
2. **Streaming:** Use proper SSE format with `data:` prefix
3. **Headers:** Include Azure-specific headers for compatibility
4. **Model Mapping:** Handle deployment vs. actual model name distinction
5. **Error Handling:** Match Azure's error response format
6. **Rate Limiting:** Preserve rate limit headers if available
