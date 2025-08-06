const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { callCustomAPI } = require('../services/customAPIService');
const { 
  transformBedrockRequestToCustom, 
  transformCustomResponseToBedrock 
} = require('../transformers/bedrockTransformer');

const router = express.Router();

// Bedrock Model Invoke endpoint
router.post('/model/:modelId/invoke', async (req, res) => {
  try {
    const { modelId } = req.params;
    
    // Validate AWS credentials (simplified - you might want more robust AWS auth)
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.includes('AWS4-HMAC-SHA256')) {
      return res.status(401).json({
        __type: 'UnauthorizedException',
        message: 'AWS signature is required'
      });
    }

    // Transform Bedrock request to custom API format
    const customRequest = transformBedrockRequestToCustom(req.body, modelId);
    
    // Call your custom API
    const customResponse = await callCustomAPI(customRequest);
    
    // Transform custom API response back to Bedrock format
    const bedrockResponse = transformCustomResponseToBedrock(customResponse, modelId);
    
    res.json(bedrockResponse);
    
  } catch (error) {
    console.error('Bedrock Invoke Error:', error);
    res.status(error.status || 500).json({
      __type: 'InternalServerException',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Bedrock Model Invoke with Response Stream endpoint
router.post('/model/:modelId/invoke-with-response-stream', async (req, res) => {
  try {
    const { modelId } = req.params;
    
    // Validate AWS credentials
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.includes('AWS4-HMAC-SHA256')) {
      return res.status(401).json({
        __type: 'UnauthorizedException',
        message: 'AWS signature is required'
      });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'application/vnd.amazon.eventstream');
    res.setHeader('x-amzn-RequestId', uuidv4());
    
    // Transform Bedrock request to custom API format (with streaming)
    const customRequest = transformBedrockRequestToCustom(req.body, modelId, true);
    
    // For now, we'll simulate streaming by calling the API once and chunking the response
    // In a real implementation, you'd want to handle actual streaming from your custom API
    const customResponse = await callCustomAPI(customRequest);
    
    // Simulate streaming response
    const content = customResponse.choices?.[0]?.message?.content || customResponse.content || '';
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const chunk = words.slice(0, i + 1).join(' ');
      const streamChunk = {
        bytes: Buffer.from(JSON.stringify({
          completion: chunk,
          stop_reason: i === words.length - 1 ? 'end_turn' : null,
          model: modelId
        })).toString('base64')
      };
      
      res.write(`data: ${JSON.stringify(streamChunk)}\n\n`);
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    res.end();
    
  } catch (error) {
    console.error('Bedrock Streaming Invoke Error:', error);
    res.status(error.status || 500).json({
      __type: 'InternalServerException',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

module.exports = router;
