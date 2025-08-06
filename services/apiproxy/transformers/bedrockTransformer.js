/**
 * Transform Bedrock request format to your custom API format
 * @param {Object} bedrockRequest - The Bedrock formatted request
 * @param {string} modelId - The model ID (e.g., 'anthropic.claude-v2')
 * @param {boolean} isStreaming - Whether this is a streaming request
 * @returns {Object} - Request formatted for your custom API
 */
function transformBedrockRequestToCustom(bedrockRequest, modelId, isStreaming = false) {
  // Different models in Bedrock have different request formats
  // This handles the most common ones - adjust based on your needs
  
  let customRequest = {
    model: modelId,
    stream: isStreaming
  };

  // Handle Anthropic Claude format
  if (modelId.includes('anthropic.claude')) {
    // Convert Anthropic format to OpenAI-like format
    const messages = [];
    
    if (bedrockRequest.prompt) {
      // Handle legacy prompt format
      messages.push({
        role: 'user',
        content: bedrockRequest.prompt.replace(/\\n\\nHuman:/g, '').replace(/\\n\\nAssistant:/g, '').trim()
      });
    } else if (bedrockRequest.messages) {
      // Handle messages format
      customRequest.messages = bedrockRequest.messages;
    }
    
    if (messages.length > 0) {
      customRequest.messages = messages;
    }
    
    customRequest.max_tokens = bedrockRequest.max_tokens_to_sample || bedrockRequest.max_tokens || 1000;
    customRequest.temperature = bedrockRequest.temperature;
    customRequest.top_p = bedrockRequest.top_p;
    customRequest.stop = bedrockRequest.stop_sequences || bedrockRequest.stop;
    
  } 
  // Handle Amazon Titan format
  else if (modelId.includes('amazon.titan')) {
    customRequest.messages = [{
      role: 'user',
      content: bedrockRequest.inputText || bedrockRequest.prompt || ''
    }];
    
    customRequest.max_tokens = bedrockRequest.textGenerationConfig?.maxTokenCount || 1000;
    customRequest.temperature = bedrockRequest.textGenerationConfig?.temperature;
    customRequest.top_p = bedrockRequest.textGenerationConfig?.topP;
    customRequest.stop = bedrockRequest.textGenerationConfig?.stopSequences;
  }
  // Handle Cohere format
  else if (modelId.includes('cohere.command')) {
    customRequest.messages = [{
      role: 'user',
      content: bedrockRequest.prompt || bedrockRequest.message || ''
    }];
    
    customRequest.max_tokens = bedrockRequest.max_tokens;
    customRequest.temperature = bedrockRequest.temperature;
    customRequest.top_p = bedrockRequest.p;
    customRequest.stop = bedrockRequest.stop_sequences;
  }
  // Handle AI21 Jurassic format
  else if (modelId.includes('ai21.j2')) {
    customRequest.messages = [{
      role: 'user',
      content: bedrockRequest.prompt || ''
    }];
    
    customRequest.max_tokens = bedrockRequest.maxTokens;
    customRequest.temperature = bedrockRequest.temperature;
    customRequest.top_p = bedrockRequest.topP;
    customRequest.stop = bedrockRequest.stopSequences;
  }
  // Generic fallback
  else {
    customRequest.messages = [{
      role: 'user',
      content: bedrockRequest.prompt || bedrockRequest.inputText || bedrockRequest.message || ''
    }];
    
    customRequest.max_tokens = bedrockRequest.max_tokens || bedrockRequest.maxTokens || 1000;
    customRequest.temperature = bedrockRequest.temperature;
    customRequest.top_p = bedrockRequest.top_p || bedrockRequest.topP;
    customRequest.stop = bedrockRequest.stop || bedrockRequest.stopSequences;
  }

  // Remove undefined values
  Object.keys(customRequest).forEach(key => {
    if (customRequest[key] === undefined) {
      delete customRequest[key];
    }
  });

  return customRequest;
}

/**
 * Transform your custom API response to Bedrock format
 * @param {Object} customResponse - Response from your custom API
 * @param {string} modelId - The model ID
 * @returns {Object} - Response formatted like Bedrock
 */
function transformCustomResponseToBedrock(customResponse, modelId) {
  // Different models in Bedrock have different response formats
  
  let bedrockResponse = {};
  
  // Extract content from custom response
  const content = customResponse.choices?.[0]?.message?.content || 
                 customResponse.content || 
                 customResponse.text || 
                 customResponse.response || '';
  
  const finishReason = customResponse.choices?.[0]?.finish_reason || 
                      customResponse.finish_reason || 
                      'end_turn';

  // Handle Anthropic Claude format
  if (modelId.includes('anthropic.claude')) {
    bedrockResponse = {
      completion: content,
      stop_reason: finishReason === 'stop' ? 'end_turn' : finishReason,
      model: modelId
    };
  }
  // Handle Amazon Titan format
  else if (modelId.includes('amazon.titan')) {
    bedrockResponse = {
      outputText: content,
      index: 0,
      completionReason: finishReason === 'stop' ? 'FINISH' : 'MAX_TOKENS',
      inputTextTokenCount: customResponse.usage?.prompt_tokens || 0,
      outputTextTokenCount: customResponse.usage?.completion_tokens || 0
    };
  }
  // Handle Cohere format
  else if (modelId.includes('cohere.command')) {
    bedrockResponse = {
      generations: [{
        finish_reason: finishReason,
        id: require('uuid').v4(),
        text: content
      }],
      id: require('uuid').v4(),
      prompt: '' // Original prompt would go here
    };
  }
  // Handle AI21 Jurassic format
  else if (modelId.includes('ai21.j2')) {
    bedrockResponse = {
      completions: [{
        data: {
          text: content
        },
        finishReason: {
          reason: finishReason === 'stop' ? 'endoftext' : 'length'
        }
      }],
      id: require('uuid').v4(),
      prompt: {
        text: '' // Original prompt would go here
      }
    };
  }
  // Generic fallback
  else {
    bedrockResponse = {
      completion: content,
      stop_reason: finishReason,
      model: modelId,
      usage: customResponse.usage || {
        input_tokens: 0,
        output_tokens: 0
      }
    };
  }

  return bedrockResponse;
}

module.exports = {
  transformBedrockRequestToCustom,
  transformCustomResponseToBedrock
};
