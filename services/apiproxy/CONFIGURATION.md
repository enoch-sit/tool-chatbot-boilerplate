# Configuration Guide

## Setting Up Your Custom API

This API proxy service needs to be configured to work with your specific custom API endpoint. Here's how to customize it:

### 1. Environment Configuration

Copy `.env.example` to `.env` and update these variables:

```bash
# Your custom API details
CUSTOM_API_URL=https://your-api.com/v1
CUSTOM_API_KEY=your-secret-key

# Server settings
PORT=3000
LOG_LEVEL=info
```

### 2. Customizing API Integration

The main file to modify is `services/customAPIService.js`:

- **URL Path**: Update the endpoint path in the `callCustomAPI` method
- **Authentication**: Modify how the API key is sent (Bearer token, header, etc.)
- **Request Format**: Adjust the request structure if needed

### 3. Request/Response Transformations

#### Azure OpenAI Transformations

Edit `transformers/azureTransformer.js`:

- **`transformAzureRequestToCustom`**: Maps Azure OpenAI request format to your API
- **`transformCustomResponseToAzure`**: Maps your API response back to Azure OpenAI format

#### Bedrock Transformations  

Edit `transformers/bedrockTransformer.js`:

- **`transformBedrockRequestToCustom`**: Maps Bedrock request format to your API
- **`transformCustomResponseToBedrock`**: Maps your API response back to Bedrock format

### 4. Common Customization Scenarios

#### Scenario 1: Your API expects different parameter names

```javascript
// In azureTransformer.js
function transformAzureRequestToCustom(azureRequest, deploymentId) {
  return {
    model_name: deploymentId,           // Instead of 'model'
    chat_messages: azureRequest.messages, // Instead of 'messages'
    max_response_tokens: azureRequest.max_tokens, // Different naming
    // ... other mappings
  };
}
```

#### Scenario 2: Your API has a different response structure

```javascript
// In azureTransformer.js
function transformCustomResponseToAzure(customResponse, originalRequest) {
  return {
    id: `chatcmpl-${uuidv4()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: originalRequest.model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: customResponse.generated_text // Your API's field name
      },
      finish_reason: customResponse.is_complete ? 'stop' : 'length'
    }],
    usage: {
      prompt_tokens: customResponse.input_token_count || 0,
      completion_tokens: customResponse.output_token_count || 0,
      total_tokens: (customResponse.input_token_count || 0) + (customResponse.output_token_count || 0)
    }
  };
}
```

#### Scenario 3: Your API uses different authentication

```javascript
// In customAPIService.js
const config = {
  method: 'POST',
  url: `${this.baseURL}/generate`,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': this.apiKey,  // Instead of Bearer token
    // or
    'Custom-Auth-Header': this.apiKey,
  },
  data: request
};
```

### 5. Testing Your Configuration

1. Start the server:

```bash
npm start
```

2. Test with a simple Azure OpenAI request:

```bash
curl -X POST http://localhost:3000/azure/openai/deployments/gpt-35-turbo/chat/completions \
  -H "Content-Type: application/json" \
  -H "api-key: test-key" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

3. Test with a Bedrock request:

```bash
curl -X POST http://localhost:3000/bedrock/model/anthropic.claude-v2/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: AWS4-HMAC-SHA256 Credential=..." \
  -d '{
    "prompt": "Hello!",
    "max_tokens_to_sample": 100
  }'
```

### 6. Advanced Features

#### Adding New Model Support

To support additional models in Bedrock format, edit the transformer files and add new conditions:

```javascript
// In bedrockTransformer.js
else if (modelId.includes('your-custom-model')) {
  customRequest.messages = [{
    role: 'user',
    content: bedrockRequest.your_prompt_field || ''
  }];
  // ... other mappings
}
```

#### Adding Streaming Support

The service includes basic streaming simulation. For real streaming, you'll need to:

1. Modify `customAPIService.js` to handle streaming responses
2. Update the Bedrock streaming endpoint to properly stream data
3. Handle server-sent events or WebSocket connections as needed

### 7. Error Handling

The service includes comprehensive error handling. You can customize error responses in `middleware/errorHandler.js` to match your needs or your custom API's error format.

### 8. Logging

Request/response logging is handled in `middleware/logger.js`. Sensitive data is automatically redacted. Adjust the logging level with the `LOG_LEVEL` environment variable.
