const { v4: uuidv4 } = require('uuid');

/**
 * Transform Azure OpenAI request format to your custom API format
 * @param {Object} azureRequest - The Azure OpenAI formatted request
 * @param {string} deploymentId - The deployment/model ID
 * @returns {Object} - Request formatted for your custom API
 */
function transformAzureRequestToCustom(azureRequest, deploymentId) {
  // Your custom API expects this format based on the documentation
  const customRequest = {
    model: deploymentId, // Use deployment as model name
    messages: azureRequest.messages || [],
    temperature: azureRequest.temperature || 0.7,
    top_p: azureRequest.top_p || 0.95,
    frequency_penalty: azureRequest.frequency_penalty || 0,
    presence_penalty: azureRequest.presence_penalty || 0,
    max_tokens: azureRequest.max_tokens || 4096,
    stream: azureRequest.stream || false
  };

  // Remove undefined values
  Object.keys(customRequest).forEach(key => {
    if (customRequest[key] === undefined) {
      delete customRequest[key];
    }
  });

  return customRequest;
}

/**
 * Transform your custom API response to Azure OpenAI format
 * @param {Object} customResponse - Response from your custom API
 * @param {Object} originalRequest - The original Azure request for context
 * @param {string} deploymentId - The deployment/model ID
 * @param {boolean} isStreaming - Whether this is a streaming response
 * @returns {Object} - Response formatted like Azure OpenAI
 */
function transformCustomResponseToAzure(customResponse, originalRequest, deploymentId, isStreaming = false) {
  // Generate a unique ID for this completion
  const id = customResponse.id || `chatcmpl-${uuidv4()}`;
  const created = customResponse.created || Math.floor(Date.now() / 1000);
  
  if (isStreaming) {
    // Handle streaming chunks
    return transformStreamingChunk(customResponse, id, created, deploymentId);
  }

  // Non-streaming response
  const azureResponse = {
    id: id,
    object: 'chat.completion',
    created: created,
    model: customResponse.model || deploymentId,
    choices: [],
    usage: {
      prompt_tokens: customResponse.usage?.prompt_tokens || 0,
      completion_tokens: customResponse.usage?.completion_tokens || 0,
      total_tokens: customResponse.usage?.total_tokens || 0,
      // Add detailed token usage like real Azure
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
    },
    system_fingerprint: 'fp_custom_proxy',
    // Add Azure content filtering
    prompt_filter_results: [{
      prompt_index: 0,
      content_filter_results: {
        hate: { filtered: false, severity: 'safe' },
        jailbreak: { detected: false, filtered: false },
        self_harm: { filtered: false, severity: 'safe' },
        sexual: { filtered: false, severity: 'safe' },
        violence: { filtered: false, severity: 'safe' }
      }
    }]
  };

  // Transform choices
  if (customResponse.choices && Array.isArray(customResponse.choices)) {
    azureResponse.choices = customResponse.choices.map((choice, index) => ({
      index: index,
      message: {
        role: choice.message?.role || 'assistant',
        content: choice.message?.content || '',
        annotations: [],
        refusal: null
      },
      finish_reason: choice.finish_reason || 'stop',
      logprobs: null,
      content_filter_results: {
        hate: { filtered: false, severity: 'safe' },
        self_harm: { filtered: false, severity: 'safe' },
        sexual: { filtered: false, severity: 'safe' },
        violence: { filtered: false, severity: 'safe' }
      }
    }));
  } else {
    // Handle single response format
    azureResponse.choices = [{
      index: 0,
      message: {
        role: 'assistant',
        content: customResponse.content || customResponse.message?.content || '',
        annotations: [],
        refusal: null
      },
      finish_reason: customResponse.finish_reason || 'stop',
      logprobs: null,
      content_filter_results: {
        hate: { filtered: false, severity: 'safe' },
        self_harm: { filtered: false, severity: 'safe' },
        sexual: { filtered: false, severity: 'safe' },
        violence: { filtered: false, severity: 'safe' }
      }
    }];
  }

  return azureResponse;
}

/**
 * Transform streaming chunk from your custom API to Azure OpenAI streaming format
 * @param {Object} customChunk - Streaming chunk from your custom API
 * @param {string} id - Stream ID
 * @param {number} created - Created timestamp
 * @param {string} model - Model name
 * @returns {Object|null} - Azure OpenAI streaming chunk or null to skip
 */
function transformStreamingChunk(customChunk, id, created, model) {
  // Skip empty or invalid chunks
  if (!customChunk || typeof customChunk !== 'object') {
    return null;
  }

  // Your API already returns Azure OpenAI compatible format!
  // Just ensure it has the right structure and add any missing fields
  
  // If it already has the correct structure, use it as-is
  if (customChunk.object === 'chat.completion.chunk' && customChunk.choices) {
    return customChunk;
  }

  // Base streaming response structure matching Azure OpenAI format
  const azureChunk = {
    id: customChunk.id || id,
    object: 'chat.completion.chunk',
    created: customChunk.created || created,
    model: customChunk.model || model,
    system_fingerprint: customChunk.system_fingerprint || 'fp_custom_proxy',
    choices: customChunk.choices || []
  };

  // If your API returns choices in a different format, transform them
  if (!customChunk.choices && customChunk.delta) {
    // Handle single delta format
    azureChunk.choices = [{
      index: 0,
      delta: customChunk.delta,
      finish_reason: customChunk.finish_reason || null,
      logprobs: null,
      content_filter_results: customChunk.finish_reason ? {} : {
        hate: { filtered: false, severity: 'safe' },
        self_harm: { filtered: false, severity: 'safe' },
        sexual: { filtered: false, severity: 'safe' },
        violence: { filtered: false, severity: 'safe' }
      }
    }];
  }

  // Add usage info if present and it's the final chunk
  if (customChunk.usage) {
    azureChunk.usage = customChunk.usage;
  }

  return azureChunk;
}

/**
 * Check if a request contains vision/image content
 * @param {Object} request - The request object
 * @returns {boolean} - True if request contains images
 */
function isVisionRequest(request) {
  if (!request.messages) return false;
  
  return request.messages.some(message => {
    if (Array.isArray(message.content)) {
      return message.content.some(item => item.type === 'image_url');
    }
    return false;
  });
}

module.exports = {
  transformAzureRequestToCustom,
  transformCustomResponseToAzure,
  transformStreamingChunk,
  isVisionRequest
};
