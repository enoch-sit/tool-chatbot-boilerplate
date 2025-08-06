const { v4: uuidv4 } = require('uuid');

/**
 * Transform Azure OpenAI request format to your custom API format
 * @param {Object} azureRequest - The Azure OpenAI formatted request
 * @param {string} deploymentId - The deployment/model ID
 * @returns {Object} - Request formatted for your custom API
 */
function transformAzureRequestToCustom(azureRequest, deploymentId) {
  // This is a generic transformation - modify based on your custom API's expected format
  const customRequest = {
    // Map common OpenAI parameters to your custom format
    model: deploymentId,
    messages: transformMessages(azureRequest.messages || []),
    max_tokens: azureRequest.max_tokens,
    temperature: azureRequest.temperature,
    top_p: azureRequest.top_p,
    frequency_penalty: azureRequest.frequency_penalty,
    presence_penalty: azureRequest.presence_penalty,
    stop: azureRequest.stop,
    stream: azureRequest.stream || false,
    
    // Add any custom parameters your API expects
    // custom_param: azureRequest.custom_param,
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
 * Transform messages to handle vision/image content
 * @param {Array} messages - Array of message objects
 * @returns {Array} - Transformed messages
 */
function transformMessages(messages) {
  return messages.map(message => {
    if (message.content && Array.isArray(message.content)) {
      // Handle vision messages with mixed content
      return {
        ...message,
        content: transformMessageContent(message.content)
      };
    }
    return message;
  });
}

/**
 * Transform message content array (for vision support)
 * @param {Array} content - Array of content objects (text, image_url)
 * @returns {Array|string} - Transformed content
 */
function transformMessageContent(content) {
  // Check if this is a vision request
  const hasImages = content.some(item => item.type === 'image_url');
  
  if (!hasImages) {
    // Convert back to simple string if no images
    const textContent = content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join(' ');
    return textContent;
  }
  
  // For vision requests, preserve the structure but transform as needed
  return content.map(item => {
    if (item.type === 'image_url') {
      return {
        type: 'image_url',
        image_url: {
          url: item.image_url.url,
          detail: item.image_url.detail || 'auto'
        }
      };
    }
    return item;
  });
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

/**
 * Transform your custom API response to Azure OpenAI format
 * @param {Object} customResponse - Response from your custom API
 * @param {Object} originalRequest - The original Azure request for context
 * @param {string} deploymentId - The deployment/model ID
 * @returns {Object} - Response formatted like Azure OpenAI
 */
function transformCustomResponseToAzure(customResponse, originalRequest, deploymentId) {
  // Generate a unique ID for this completion
  const id = `chatcmpl-${uuidv4()}`;
  const created = Math.floor(Date.now() / 1000);
  const isVision = isVisionRequest(originalRequest);
  
  // Transform based on your custom API's response format
  // This assumes your API returns something similar to OpenAI format
  const azureResponse = {
    id: id,
    object: 'chat.completion',
    created: created,
    model: deploymentId || originalRequest.model || 'gpt-35-turbo',
    choices: [],
    usage: {
      prompt_tokens: customResponse.usage?.prompt_tokens || 0,
      completion_tokens: customResponse.usage?.completion_tokens || 0,
      total_tokens: customResponse.usage?.total_tokens || 0,
      // Add detailed token usage for vision requests
      ...(isVision && {
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
      })
    },
    system_fingerprint: null,
    // Add Azure-specific content filtering for vision
    ...(isVision && {
      prompt_filter_results: [{
        prompt_index: 0,
        content_filter_result: {
          sexual: { filtered: false, severity: 'safe' },
          violence: { filtered: false, severity: 'safe' },
          hate: { filtered: false, severity: 'safe' },
          self_harm: { filtered: false, severity: 'safe' }
        }
      }]
    })
  };

  // Transform choices
  if (customResponse.choices && Array.isArray(customResponse.choices)) {
    azureResponse.choices = customResponse.choices.map((choice, index) => ({
      index: index,
      message: {
        role: choice.message?.role || 'assistant',
        content: choice.message?.content || choice.text || '',
        ...(isVision && {
          annotations: [],
          refusal: null
        })
      },
      finish_reason: choice.finish_reason || 'stop',
      logprobs: null,
      // Add content filtering for vision responses
      ...(isVision && {
        content_filter_results: {
          hate: { filtered: false, severity: 'safe' },
          self_harm: { filtered: false, severity: 'safe' },
          sexual: { filtered: false, severity: 'safe' },
          violence: { filtered: false, severity: 'safe' }
        }
      })
    }));
  } else {
    // Handle single response format
    azureResponse.choices = [{
      index: 0,
      message: {
        role: 'assistant',
        content: customResponse.content || customResponse.text || customResponse.response || '',
        ...(isVision && {
          annotations: [],
          refusal: null
        })
      },
      finish_reason: customResponse.finish_reason || 'stop',
      logprobs: null,
      // Add content filtering for vision responses
      ...(isVision && {
        content_filter_results: {
          hate: { filtered: false, severity: 'safe' },
          self_harm: { filtered: false, severity: 'safe' },
          sexual: { filtered: false, severity: 'safe' },
          violence: { filtered: false, severity: 'safe' }
        }
      })
    }];
  }

  return azureResponse;
}

/**
 * Transform streaming chunk from your custom API to Azure OpenAI streaming format
 * @param {Object} customChunk - Streaming chunk from your custom API
 * @param {Object} streamContext - Context for the stream (id, created, model)
 * @returns {Object|null} - Azure OpenAI streaming chunk or null to skip
 */
function transformCustomStreamToAzureStream(customChunk, streamContext) {
  // Skip empty or invalid chunks
  if (!customChunk || typeof customChunk !== 'object') {
    return null;
  }

  // Base streaming response structure matching Azure OpenAI format
  const azureChunk = {
    id: streamContext.id,
    object: 'chat.completion.chunk',
    created: streamContext.created,
    model: streamContext.model,
    system_fingerprint: null,
    choices: []
  };

  // Transform choices from your custom API format
  if (customChunk.choices && Array.isArray(customChunk.choices)) {
    azureChunk.choices = customChunk.choices.map((choice, index) => {
      const transformedChoice = {
        index: index,
        delta: {},
        finish_reason: choice.finish_reason || null
      };

      // Handle message content delta
      if (choice.delta?.content || choice.message?.content) {
        transformedChoice.delta.content = choice.delta?.content || choice.message?.content;
      }

      // Handle role (usually only in first chunk)
      if (choice.delta?.role || choice.message?.role) {
        transformedChoice.delta.role = choice.delta?.role || choice.message?.role;
      }

      return transformedChoice;
    });
  } else {
    // Handle single choice format (most common)
    const choice = {
      index: 0,
      delta: {},
      finish_reason: customChunk.finish_reason || null
    };

    // Extract content from various possible locations in your custom format
    if (customChunk.content) {
      choice.delta.content = customChunk.content;
    } else if (customChunk.delta?.content) {
      choice.delta.content = customChunk.delta.content;
    } else if (customChunk.text) {
      choice.delta.content = customChunk.text;
    }

    // Handle role (usually only in first chunk)
    if (customChunk.role || customChunk.delta?.role) {
      choice.delta.role = customChunk.role || customChunk.delta.role;
    }

    azureChunk.choices = [choice];
  }

  // Only return chunk if it has meaningful content
  const hasContent = azureChunk.choices.some(choice => 
    choice.delta.content || choice.delta.role || choice.finish_reason
  );

  return hasContent ? azureChunk : null;
}

module.exports = {
  transformAzureRequestToCustom,
  transformCustomResponseToAzure,
  transformCustomStreamToAzureStream,
  transformMessages,
  transformMessageContent,
  isVisionRequest
};
