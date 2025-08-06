const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { callCustomAPI, callCustomAPIStream } = require('../services/customAPIService');
const { 
  transformAzureRequestToCustom, 
  transformCustomResponseToAzure,
  transformCustomStreamToAzureStream 
} = require('../transformers/azureTransformer');

const router = express.Router();

// Chat Completions endpoint
router.post('/deployments/:deploymentId/chat/completions', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const apiVersion = req.query['api-version'] || process.env.AZURE_OPENAI_API_VERSION;
    const isStreaming = req.body.stream === true;
    
    // Validate API key
    const apiKey = req.headers['api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'Unauthorized',
          message: 'API key is required. Provide it in api-key header or Authorization header.'
        }
      });
    }

    // Transform Azure OpenAI request to custom API format
    const customRequest = transformAzureRequestToCustom(req.body, deploymentId);
    
    if (isStreaming) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      
      // Generate completion ID for this stream
      const completionId = `chatcmpl-${uuidv4()}`;
      const created = Math.floor(Date.now() / 1000);
      
      try {
        await callCustomAPIStream(customRequest, (chunk) => {
          // Transform each chunk to Azure OpenAI streaming format
          const azureChunk = transformCustomStreamToAzureStream(chunk, {
            id: completionId,
            created: created,
            model: deploymentId
          });
          
          if (azureChunk) {
            res.write(`data: ${JSON.stringify(azureChunk)}\n\n`);
          }
        });
        
        // Send final [DONE] message
        res.write('data: [DONE]\n\n');
        res.end();
        
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({
          error: {
            code: streamError.code || 'InternalServerError',
            message: streamError.message || 'Stream processing failed'
          }
        })}\n\n`);
        res.end();
      }
      
    } else {
      // Handle non-streaming response
      const customResponse = await callCustomAPI(customRequest);
      const azureResponse = transformCustomResponseToAzure(customResponse, req.body, deploymentId);
      res.json(azureResponse);
    }
    
  } catch (error) {
    console.error('Azure OpenAI Chat Completions Error:', error);
    res.status(error.status || 500).json({
      error: {
        code: error.code || 'InternalServerError',
        message: error.message || 'An unexpected error occurred'
      }
    });
  }
});

// Legacy Completions endpoint
router.post('/deployments/:deploymentId/completions', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    
    // Validate API key
    const apiKey = req.headers['api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'Unauthorized',
          message: 'API key is required'
        }
      });
    }

    // Transform legacy completions request to chat format
    const chatRequest = {
      messages: [{ role: 'user', content: req.body.prompt }],
      max_tokens: req.body.max_tokens,
      temperature: req.body.temperature,
      top_p: req.body.top_p,
      stop: req.body.stop,
      stream: req.body.stream
    };

    // Transform to custom API format
    const customRequest = transformAzureRequestToCustom(chatRequest, deploymentId);
    
    // Call your custom API
    const customResponse = await callCustomAPI(customRequest);
    
    // Transform response to legacy completions format
    const completionsResponse = {
      id: `cmpl-${uuidv4()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: deploymentId,
      choices: [{
        text: customResponse.choices?.[0]?.message?.content || customResponse.content || '',
        index: 0,
        logprobs: null,
        finish_reason: customResponse.choices?.[0]?.finish_reason || 'stop'
      }],
      usage: customResponse.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
    
    res.json(completionsResponse);
    
  } catch (error) {
    console.error('Azure OpenAI Completions Error:', error);
    res.status(error.status || 500).json({
      error: {
        code: error.code || 'InternalServerError',
        message: error.message || 'An unexpected error occurred'
      }
    });
  }
});

module.exports = router;
