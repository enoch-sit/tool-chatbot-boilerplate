/**
 * Azure OpenAI Proxy Route Handler
 * Handles /proxyapi/azurecom/* requests and forwards them to your custom API
 */
const express = require('express');
const { transformAzureRequestToCustom, transformCustomResponseToAzure, isVisionRequest } = require('../transformers/customAPITransformer');
const { callCustomAPI, callCustomAPIStreaming } = require('../services/customAPIService');

const router = express.Router();

/**
 * Azure OpenAI Chat Completions endpoint
 * Maps to your custom API's /chatgpt/v1/completions
 */
router.post('/openai/deployments/:deployment/chat/completions', async (req, res) => {
  const { deployment } = req.params;
  const azureRequest = req.body;
  const apiVersion = req.query['api-version'];

  console.log('📨 Azure Chat Completions - Deployment:', deployment);

  try {
    // Check for vision requests - your API may not support this yet
    if (isVisionRequest(azureRequest)) {
      return res.status(400).json({
        error: {
          code: 'BadRequest',
          message: 'Vision requests are not supported by this deployment.',
          param: null,
          type: null
        }
      });
    }

    // Transform Azure request to your custom API format
    const customRequest = transformAzureRequestToCustom(azureRequest, deployment);
    
    // Handle streaming vs non-streaming
    if (azureRequest.stream) {
      // Set up streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Send initial chunk if Azure expects it
      const initialChunk = {
        choices: [],
        created: 0,
        id: "",
        model: "",
        object: "",
        prompt_filter_results: [{
          prompt_index: 0,
          content_filter_results: {
            hate: { filtered: false, severity: "safe" },
            jailbreak: { detected: false, filtered: false },
            self_harm: { filtered: false, severity: "safe" },
            sexual: { filtered: false, severity: "safe" },
            violence: { filtered: false, severity: "safe" }
          }
        }]
      };
      res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

      try {
        await callCustomAPIStreaming('/chatgpt/v1/completions', customRequest, (chunk) => {
          try {
            // Transform chunk to Azure format
            const azureChunk = transformCustomResponseToAzure(chunk, azureRequest, deployment, true);
            if (azureChunk) {
              res.write(`data: ${JSON.stringify(azureChunk)}\n\n`);
            }
          } catch (error) {
            console.error('Error transforming streaming chunk:', error);
          }
        });

        // End stream
        res.write('data: [DONE]\n\n');
        res.end();
        
      } catch (error) {
        console.error('Streaming error:', error);
        const errorResponse = {
          error: {
            code: 'InternalServerError',
            message: error.message || 'An error occurred during streaming'
          }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming request
      const customResponse = await callCustomAPI('/chatgpt/v1/completions', 'POST', customRequest);
      const azureResponse = transformCustomResponseToAzure(customResponse, azureRequest, deployment, false);
      
      // Add Azure-specific headers
      res.setHeader('apim-request-id', generateRequestId());
      res.setHeader('x-ms-region', 'East US');
      res.setHeader('x-ms-deployment-name', deployment);
      res.setHeader('x-ratelimit-remaining-requests', '249');
      res.setHeader('x-ratelimit-limit-requests', '250');
      res.setHeader('x-ratelimit-remaining-tokens', '249000');
      res.setHeader('x-ratelimit-limit-tokens', '250000');
      
      console.log('✅ Chat completion successful');
      res.json(azureResponse);
    }

  } catch (error) {
    console.error('Azure chat completions error:', error);
    
    // Transform error to Azure format
    const statusCode = error.status || error.response?.status || 500;
    const errorResponse = {
      error: {
        code: getAzureErrorCode(statusCode),
        message: error.message || error.response?.data?.message || 'An error occurred',
        param: null,
        type: null
      }
    };

    res.status(statusCode).json(errorResponse);
  }
});

/**
 * Azure OpenAI Images Generation endpoint
 * Maps to your custom API's /ai/v1/images/generations
 */
router.post('/openai/deployments/:deployment/images/generations', async (req, res) => {
  const { deployment } = req.params;
  const azureRequest = req.body;

  console.log('🎨 Azure Images Generation - Deployment:', deployment);

  try {
    // Your custom API uses different parameter names, transform them
    const customRequest = {
      prompt: azureRequest.prompt,
      quality: azureRequest.quality || 'standard',
      size: azureRequest.size || '1024x1024',
      response_format: azureRequest.response_format || 'url',
      n: azureRequest.n || 1
    };

    const customResponse = await callCustomAPI('/ai/v1/images/generations', 'POST', customRequest);
    
    // Transform to Azure format
    const azureResponse = {
      created: customResponse.created || Math.floor(Date.now() / 1000),
      data: customResponse.data || []
    };

    // Add Azure headers
    res.setHeader('apim-request-id', generateRequestId());
    res.setHeader('x-ms-region', 'East US');
    res.setHeader('x-ms-deployment-name', deployment);
    
    console.log('✅ Image generation successful');
    res.json(azureResponse);

  } catch (error) {
    console.error('Azure images generation error:', error);
    
    const statusCode = error.status || error.response?.status || 500;
    const errorResponse = {
      error: {
        code: getAzureErrorCode(statusCode),
        message: error.message || error.response?.data?.message || 'An error occurred',
        param: null,
        type: null
      }
    };

    res.status(statusCode).json(errorResponse);
  }
});

/**
 * Azure OpenAI Embeddings endpoint
 * Maps to your custom API's /ai/v1/embeddings
 */
router.post('/openai/deployments/:deployment/embeddings', async (req, res) => {
  const { deployment } = req.params;
  const azureRequest = req.body;

  console.log('📊 Azure Embeddings - Deployment:', deployment);

  try {
    // Transform request
    const customRequest = {
      input: azureRequest.input,
      model: azureRequest.model || deployment
    };

    const customResponse = await callCustomAPI('/ai/v1/embeddings', 'POST', customRequest);
    
    // Your custom API already returns the right format, just ensure Azure structure
    const azureResponse = {
      object: 'list',
      data: customResponse.data || [],
      model: customResponse.model || deployment,
      usage: customResponse.usage || {
        prompt_tokens: 0,
        total_tokens: 0
      }
    };

    // Add Azure headers
    res.setHeader('apim-request-id', generateRequestId());
    res.setHeader('x-ms-region', 'East US');
    res.setHeader('x-ms-deployment-name', deployment);
    
    console.log('✅ Embeddings successful');
    res.json(azureResponse);

  } catch (error) {
    console.error('Azure embeddings error:', error);
    
    const statusCode = error.status || error.response?.status || 500;
    const errorResponse = {
      error: {
        code: getAzureErrorCode(statusCode),
        message: error.message || error.response?.data?.message || 'An error occurred',
        param: null,
        type: null
      }
    };

    res.status(statusCode).json(errorResponse);
  }
});

/**
 * Helper function to generate request ID
 */
function generateRequestId() {
  return require('uuid').v4();
}

/**
 * Helper function to map HTTP status codes to Azure error codes
 */
function getAzureErrorCode(statusCode) {
  switch (statusCode) {
    case 400: return 'BadRequest';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'NotFound';
    case 429: return 'TooManyRequests';
    case 500: return 'InternalServerError';
    case 502: return 'BadGateway';
    case 503: return 'ServiceUnavailable';
    default: return 'InternalServerError';
  }
}

module.exports = router;
