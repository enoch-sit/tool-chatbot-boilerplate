# Complete Azure OpenAI API Format Summary

## 🎯 **Investigation Results**

Based on comprehensive testing of Azure OpenAI endpoint `https://for-fivesubject.openai.azure.com/` with deployment `gpt-4.1`, here's everything your proxy needs to handle both text and vision requests.

## 📋 **Text Chat Completions**

### ✅ **What Works**

- ✅ Non-streaming chat completions
- ✅ Streaming chat completions  
- ✅ Content filtering and safety
- ✅ Rate limiting headers
- ✅ Detailed token usage

### ❌ **What Doesn't Work**

- ❌ Legacy completions endpoint (not supported for chat models)

### **Request Format**

```json
{
  "model": "gpt-4.1",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Count to 10."}
  ],
  "max_tokens": 100,
  "temperature": 0.7,
  "stream": false
}
```

### **Key Response Features**

- **Content Filtering:** Every response includes comprehensive safety filtering
- **Streaming Format:** Standard SSE with `data:` prefix and `[DONE]` terminator
- **Rate Limiting:** Both request and token-based limits in headers
- **Model Identity:** Deployment name in URL, actual model in response

## 🖼️ **Vision/Image Support**

### ✅ **What Works**

- ✅ Single image with text
- ✅ Data URLs with proper MIME types
- ✅ Image detail levels (`low`, `high`, `auto`)
- ✅ Vision-specific content filtering

### ❌ **What Doesn't Work**

- ❌ Multiple images in single request
- ❌ Vision + streaming combination
- ❌ Data URLs without MIME type

### **Vision Request Format**

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
            "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "detail": "auto"
          }
        }
      ]
    }
  ],
  "max_tokens": 150,
  "temperature": 0.3
}
```

### **Token Impact**

- **Text-only:** ~26 prompt tokens
- **Vision low detail:** 81 prompt tokens
- **Vision high/auto detail:** 225+ prompt tokens

## 🔧 **Implementation Requirements**

### 1. **Request Detection & Validation**

```javascript
// Detect vision requests
function isVisionRequest(request) {
  return request.messages?.some(msg => 
    Array.isArray(msg.content) && 
    msg.content.some(item => item.type === 'image_url')
  );
}

// Validate image URLs
function validateImageURL(url) {
  return url.startsWith('data:image/') && url.includes('base64,');
}
```

### 2. **Feature Restrictions**

- **Disable streaming for vision:** Return error if `stream: true` + images
- **Single image only:** Return error for multiple `image_url` items
- **MIME type required:** Validate proper data URL format

### 3. **Response Structure**

```javascript
// Vision responses need additional fields
const visionResponse = {
  // Standard fields...
  prompt_filter_results: [{
    prompt_index: 0,
    content_filter_result: {
      sexual: { filtered: false, severity: 'safe' },
      violence: { filtered: false, severity: 'safe' },
      hate: { filtered: false, severity: 'safe' },
      self_harm: { filtered: false, severity: 'safe' }
    }
  }],
  usage: {
    // Enhanced token details for vision
    completion_tokens_details: {
      accepted_prediction_tokens: 0,
      audio_tokens: 0,
      reasoning_tokens: 0,
      rejected_prediction_tokens: 0
    },
    prompt_tokens_details: {
      audio_tokens: 0,
      cached_tokens: 0
    }
  }
};
```

## 🚦 **Error Handling**

### **Vision-Specific Errors**

```json
// Multiple images
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid image data."
  }
}

// Invalid URL format
{
  "error": {
    "code": "BadRequest", 
    "message": "Invalid image URL. The URL must be a valid HTTP or HTTPS URL, or a data URL with base64 encoding."
  }
}

// Vision + streaming
{
  "error": {
    "code": "BadRequest",
    "message": "Streaming is not supported for vision requests."
  }
}
```

## 📊 **Rate Limiting & Headers**

### **Important Headers to Preserve**

```
x-ratelimit-remaining-requests: 250
x-ratelimit-limit-requests: 250  
x-ratelimit-remaining-tokens: 250000
x-ratelimit-limit-tokens: 250000
x-ms-deployment-name: gpt-4.1
x-ms-region: East US
apim-request-id: {uuid}
```

## 🎯 **Proxy Implementation Strategy**

### 1. **Request Pipeline**

1. **Parse request** → Detect vision vs text
2. **Validate format** → Check image URLs, streaming compatibility
3. **Transform request** → Convert to your custom API format
4. **Route request** → Send to appropriate handler
5. **Transform response** → Convert back to Azure format
6. **Add Azure headers** → Include rate limiting, filtering, etc.

### 2. **Key Functions Needed**

- `isVisionRequest(request)` - Detect image content
- `validateVisionRequest(request)` - Validate image format/limits
- `transformVisionContent(content)` - Handle mixed content arrays
- `addAzureHeaders(response)` - Add Azure-specific headers
- `addContentFiltering(response)` - Add safety filtering results

### 3. **Testing Strategy**

- ✅ Text-only requests (streaming + non-streaming)
- ✅ Single image requests (different detail levels)
- ❌ Multiple image requests (should fail gracefully)
- ❌ Vision + streaming (should return appropriate error)
- ✅ Invalid image formats (should return proper error)

## 📝 **Next Steps**

1. **Update your proxy routes** to handle vision requests
2. **Implement request validation** for image formats and limitations
3. **Add content filtering** to match Azure's safety structure  
4. **Test with your custom API** to see how it handles images
5. **Create transformation logic** between your API and Azure format

You now have everything needed to create a fully compatible Azure OpenAI proxy with both text and vision support! 🚀
