import express = require('express');
import { reformatRequest, reformatStreamResponse, reformatNonStreamResponse, sendToEdUHK } from './eduhk-proxy';

// Enable/disable proxy mode
const envValue = process.env.USE_EDUHK_PROXY;
const USE_EDUHK_PROXY = envValue?.trim().toLowerCase() === 'true';
console.log('🔧 Environment variable USE_EDUHK_PROXY:', JSON.stringify(envValue));
console.log('🔧 Trimmed/lowercased value:', envValue?.trim().toLowerCase());
console.log('🔧 Proxy mode enabled:', USE_EDUHK_PROXY);

// Generate random ID similar to Azure format
const generateChatId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'chatcmpl-';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate random system fingerprint
const generateFingerprint = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'fp_';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Content filter template
const contentFilter = {
  hate: { filtered: false, severity: "safe" },
  self_harm: { filtered: false, severity: "safe" },
  sexual: { filtered: false, severity: "safe" },
  violence: { filtered: false, severity: "safe" }
};

// API Key configuration
const requireApiKey = process.env.REQUIRE_API_KEY === 'true';
const validApiKeys = process.env.VALID_API_KEYS ? 
  process.env.VALID_API_KEYS.split(',') : 
  ['test-key-123', 'dev-key-456', 'demo-key-789'];

// OPTIONS handler for CORS preflight requests
export const corsHandler = (req: express.Request, res: express.Response) => {
  console.log('🌐 [CORS PREFLIGHT] OPTIONS request received');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,api-key');
  res.setHeader('Access-Control-Max-Age', '1728000');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Length', '0');
  res.status(204).end();
};

// Chat completions handler
export const chatCompletionsHandler = (req: express.Request, res: express.Response) => {
  console.log('\n🎯 [CHAT COMPLETIONS ENDPOINT HIT]');
  console.log(`📍 Deployment: ${req.params.deployment}`);
  console.log(`📍 Stream requested: ${req.body.stream}`);
  console.log(`📍 API Version: ${req.query['api-version'] || 'not specified'}`);
  console.log(`📍 API Key present: ${req.headers['api-key'] ? '✅ Yes' : '❌ No'}`);
  if (req.headers['api-key']) {
    const apiKey = req.headers['api-key'] as string;
    console.log(`📍 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)} (masked)`);
  }
  
  const { stream, messages, model, temperature, stream_options } = req.body;
  
  // API Key validation (configurable via environment variables)
  if (requireApiKey) {
    const apiKey = req.headers['api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'Unauthorized',
          message: 'Access denied due to missing api-key header'
        }
      });
    }
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        error: {
          code: 'Unauthorized', 
          message: 'Access denied due to invalid api-key'
        }
      });
    }
  }

  if (stream === true) {
    console.log('📤 Starting streaming response...');
    console.log('🔧 USE_EDUHK_PROXY check:', USE_EDUHK_PROXY);
    
    if (USE_EDUHK_PROXY) {
      console.log('🌍 Using EdUHK proxy mode');
      
      // Set headers for Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,api-key');
      res.setHeader('Access-Control-Max-Age', '1728000');
      
      // Transform request to EdUHK format
      const eduhkRequest = reformatRequest(req.body);
      
      // Forward to EdUHK API
      sendToEdUHK(
        eduhkRequest,
        (chunk: string) => {
          // Transform EdUHK response to Azure format
          const azureChunk = reformatStreamResponse(chunk);
          if (azureChunk) {
            console.log('📤 Sending Azure chunk:', azureChunk.replace('\n', '\\n'));
            res.write(azureChunk);
          }
        },
        () => {
          console.log('✅ EdUHK streaming completed');
          res.end();
        },
        (error: Error) => {
          console.error('❌ EdUHK proxy error:', error);
          res.write(`data: {"error": {"message": "Proxy error: ${error.message}"}}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      );
      
      return;
    }
    
    // Fallback to mock mode if proxy disabled
    console.log('🎭 Using mock mode');
    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,api-key');
    res.setHeader('Access-Control-Max-Age', '1728000');
    console.log('📤 SSE headers set');

    const chatId = generateChatId();
    const fingerprint = generateFingerprint();
    const created = Math.floor(Date.now() / 1000);

    // Send initial filter results
    const initialData = {
      choices: [],
      created: 0,
      id: "",
      model: "",
      object: "",
      prompt_filter_results: [{
        prompt_index: 0,
        content_filter_results: {
          ...contentFilter,
          jailbreak: { filtered: false, detected: false }
        }
      }]
    };
    console.log('📤 Sending initial filter data');
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Send role assignment chunk
    const roleData = {
      choices: [{
        content_filter_results: {},
        delta: { content: "", refusal: null, role: "assistant" },
        finish_reason: null,
        index: 0,
        logprobs: null
      }],
      created,
      id: chatId,
      model: model || "gpt-4.1-2025-04-14",
      object: "chat.completion.chunk",
      system_fingerprint: fingerprint
    };
    console.log('📤 Sending role assignment chunk');
    res.write(`data: ${JSON.stringify(roleData)}\n\n`);

    // The message to stream - enhanced response
    const message = 'Hello! I\'m doing well, thank you for asking. How can I assist you today?';
    const chunks = message.split(' ');

    // Function to send a data chunk
    const sendChunk = (content: string, index: number) => {
      const data = {
        choices: [{
          content_filter_results: contentFilter,
          delta: { content },
          finish_reason: null,
          index: 0,
          logprobs: null
        }],
        created,
        id: chatId,
        model: model || "gpt-4.1-2025-04-14",
        object: "chat.completion.chunk",
        system_fingerprint: fingerprint
      };
      console.log(`📤 Sending chunk ${index + 1}/${chunks.length}: "${content}"`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Stream the chunks with a delay
    let index = 0;
    const interval = setInterval(() => {
      if (index < chunks.length) {
        sendChunk(chunks[index] + (index < chunks.length - 1 ? ' ' : ''), index);
        index++;
      } else {
        // Send the final chunk
        console.log('📤 Sending final chunk with finish_reason: stop');
        const finalData = {
          choices: [{
            content_filter_results: {},
            delta: {},
            finish_reason: "stop",
            index: 0,
            logprobs: null
          }],
          created,
          id: chatId,
          model: model || "gpt-4.1-2025-04-14",
          object: "chat.completion.chunk",
          system_fingerprint: fingerprint
        };
        res.write(`data: ${JSON.stringify(finalData)}\n\n`);
        
        // Add usage data if requested
        if (stream_options?.include_usage) {
          console.log('📤 Sending usage data chunk');
          const usageData = {
            choices: [],
            created,
            id: chatId,
            model: model || "gpt-4.1-2025-04-14",
            object: "chat.completion.chunk",
            system_fingerprint: fingerprint,
            usage: {
              prompt_tokens: 25,
              completion_tokens: 15,
              total_tokens: 40
            }
          };
          res.write(`data: ${JSON.stringify(usageData)}\n\n`);
        }
        
        console.log('📤 Sending [DONE] marker');
        res.write('data: [DONE]\n\n');
        console.log('✅ Streaming completed');
        clearInterval(interval);
        res.end();
      }
    }, 200);
    
    return;
  }

  // For non-streaming, just return a simple response
  console.log('📤 Sending non-streaming response');
  
  if (USE_EDUHK_PROXY) {
    console.log('🌍 Using EdUHK proxy mode for non-streaming');
    
    // Transform request to EdUHK format (disable streaming)
    const eduhkRequest = reformatRequest({ ...req.body, stream: false });
    
    // Accumulate response data for non-streaming
    let responseBuffer = '';
    
    // Forward to EdUHK API
    sendToEdUHK(
      eduhkRequest,
      (chunk: string) => {
        // For non-streaming, accumulate all data chunks
        console.log('📥 Received EdUHK chunk:', chunk);
        responseBuffer += chunk;
      },
      () => {
        console.log('✅ EdUHK non-streaming completed');
        console.log('📦 Complete response buffer:', responseBuffer);
        
        try {
          // Parse the complete EdUHK response
          let eduhkResponse;
          if (responseBuffer.trim().startsWith('{')) {
            // Direct JSON response
            eduhkResponse = JSON.parse(responseBuffer.trim());
          } else {
            // Handle potential data: prefix or multiple lines
            const lines = responseBuffer.split('\n').filter(line => line.trim());
            const jsonLine = lines.find(line => 
              line.includes('{') && line.includes('}')
            );
            if (jsonLine) {
              const jsonStr = jsonLine.replace(/^data:\s*/, '').trim();
              eduhkResponse = JSON.parse(jsonStr);
            } else {
              throw new Error('No valid JSON found in response');
            }
          }
          
          // Transform EdUHK response to Azure format
          const azureResponse = reformatNonStreamResponse(eduhkResponse);
          
          console.log('📤 Sending transformed Azure response');
          res.json(azureResponse);
          
        } catch (parseError) {
          console.error('❌ Failed to parse EdUHK response:', parseError);
          console.error('📦 Raw response buffer:', responseBuffer);
          
          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
          res.status(500).json({
            error: {
              code: 'ProxyParsingError',
              message: `Failed to parse API response: ${errorMessage}`,
              details: process.env.NODE_ENV === 'development' ? responseBuffer : undefined
            }
          });
        }
      },
      (error: Error) => {
        console.error('❌ EdUHK proxy error:', error);
        res.status(500).json({
          error: {
            code: 'ProxyRequestError',
            message: `Proxy request failed: ${error.message}`
          }
        });
      }
    );
    
    return;
  }
  
  // Fallback to mock response
  console.log('🎭 Using mock mode for non-streaming');
  const response = {
    choices: [{ message: { content: 'Hello! I\'m doing well, thank you for asking. How can I assist you today?' } }]
  };
  console.log('📤 Response body:', JSON.stringify(response, null, 2));
  res.json(response);
};

// Health check handler
export const healthHandler = (req: express.Request, res: express.Response) => {
  console.log('🏥 Health check endpoint accessed');
  const response = { status: 'ok', timestamp: new Date().toISOString() };
  console.log('📤 Health response:', JSON.stringify(response, null, 2));
  res.json(response);
};

// 404 handler
export const notFoundHandler = (req: express.Request, res: express.Response) => {
  console.log('\n❌ Unmatched route accessed:');
  console.log(`📍 Method: ${req.method}`);
  console.log(`📍 URL: ${req.originalUrl}`);
  console.log(`📍 Path: ${req.path}`);
  res.status(404).json({
    error: {
      code: 'NotFound',
      message: `The requested resource '${req.originalUrl}' was not found.`
    }
  });
};
