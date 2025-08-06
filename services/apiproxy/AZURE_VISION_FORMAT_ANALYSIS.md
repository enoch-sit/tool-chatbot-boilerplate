# Azure OpenAI Vision API Format Analysis

## Summary

Based on the investigation of Azure OpenAI's Vision API capabilities, here's what we discovered:

## ✅ **What Works**

### 1. Single Image with Text

- **Format:** Mixed content array with `text` and `image_url` objects
- **Status:** ✅ Working perfectly
- **Token Usage:** Images consume significantly more tokens (228 prompt tokens vs ~26 for text-only)

### 2. Data URL Format

- **Supported:** `data:image/png;base64,{base64_data}`
- **Required:** Must include proper MIME type
- **Not Supported:** `data:;base64,{base64_data}` (without MIME type)

### 3. Image Detail Levels

- **Supported:** `low`, `high`, `auto`
- **Token Impact:**
  - `low`: 81 prompt tokens
  - `high`: 225 prompt tokens  
  - `auto`: 225 prompt tokens
- **Performance:** All detail levels work, `high` and `auto` consume more tokens

## ❌ **Current Limitations**

### 1. Multiple Images

- **Status:** ❌ Not supported by this deployment
- **Error:** `"Invalid image data."`
- **Note:** May be model-specific limitation

### 2. Image with Streaming

- **Status:** ❌ Not supported
- **Error:** 400 Bad Request
- **Note:** Vision + streaming combination not available

### 3. Data URL without MIME Type

- **Status:** ❌ Rejected
- **Error:** `"Invalid image URL. The URL must be a valid HTTP or HTTPS URL, or a data URL with base64 encoding."`

## 📋 **Request Format**

### Single Image Request Structure

```json
{
  "model": "gpt-4.1",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What do you see in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,{base64_data}",
            "detail": "auto"  // Optional: "low", "high", "auto"
          }
        }
      ]
    }
  ],
  "max_tokens": 150,
  "temperature": 0.3
}
```

### Headers

```
Content-Type: application/json
api-key: {API_KEY}
```

## 📋 **Response Format**

### Successful Vision Response

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
        "content": "The pixel is a bright yellow color...",
        "refusal": null,
        "role": "assistant"
      }
    }
  ],
  "created": 1754397203,
  "id": "chatcmpl-C1B91dBiElLvRKpjcvTPOEAZBENl6",
  "model": "gpt-4.1-2025-04-14",
  "object": "chat.completion",
  "prompt_filter_results": [
    {
      "prompt_index": 0,
      "content_filter_result": {
        "sexual": { "filtered": false, "severity": "safe" },
        "violence": { "filtered": false, "severity": "safe" },
        "hate": { "filtered": false, "severity": "safe" },
        "self_harm": { "filtered": false, "severity": "safe" }
      }
    }
  ],
  "system_fingerprint": "fp_b663f05c2c",
  "usage": {
    "completion_tokens": 47,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens": 228,  // Note: Much higher for images
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    },
    "total_tokens": 275
  }
}
```

## 🚫 **Error Responses**

### Multiple Images Error

```json
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid image data.",
    "param": null,
    "type": null
  }
}
```

### Invalid URL Format Error

```json
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid image URL. The URL must be a valid HTTP or HTTPS URL, or a data URL with base64 encoding.",
    "param": null,
    "type": null
  }
}
```

## 💡 **Key Insights for Proxy Implementation**

### 1. Content Structure

- Vision requests use `content` as an array instead of a string
- Mix `text` and `image_url` objects in the content array
- Preserve the exact structure for compatibility

### 2. Token Consumption

- Images dramatically increase token usage
- Detail level affects token consumption significantly
- Factor this into rate limiting and cost calculations

### 3. Error Handling

- Validate image URL format before forwarding
- Handle vision-specific error codes
- Consider fallback for unsupported features

### 4. Feature Detection

- Not all Azure OpenAI deployments support vision
- Multiple images may not be supported universally
- Streaming + vision is not supported

## 🔧 **Implementation Requirements**

### Request Transformation

1. **Detect Vision Requests:** Check for `image_url` in content array
2. **Validate Image URLs:** Ensure proper data URL format with MIME type
3. **Handle Detail Levels:** Support `low`, `high`, `auto` parameters
4. **Token Estimation:** Account for higher token usage with images

### Response Handling

1. **Preserve Content Filtering:** Keep vision-specific content filter results
2. **Handle Errors:** Map vision-specific error codes appropriately
3. **Token Tracking:** Monitor elevated token consumption patterns

### Feature Flags

1. **Vision Support Detection:** Test deployment capabilities
2. **Multiple Image Support:** Feature flag for multi-image requests
3. **Streaming Compatibility:** Disable streaming for vision requests

This analysis provides everything needed to implement Azure OpenAI vision compatibility in your proxy! 🎯
