import express = require('express');
import bodyParser = require('body-parser');
import https = require('https');
import http = require('http');
import fs = require('fs');
import path = require('path');

const app = express();
const port = process.env.PORT || 5555;
const httpsPort = process.env.HTTPS_PORT || 5556;

// API Key configuration
const requireApiKey = process.env.REQUIRE_API_KEY === 'true';
const validApiKeys = process.env.VALID_API_KEYS ? 
  process.env.VALID_API_KEYS.split(',') : 
  ['test-key-123', 'dev-key-456', 'demo-key-789'];

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Request logging middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 [${timestamp}] Incoming Request`);
  console.log('='.repeat(80));
  console.log(`📍 Method: ${req.method}`);
  console.log(`📍 URL: ${req.url}`);
  console.log(`📍 Path: ${req.path}`);
  console.log(`📍 Protocol: ${req.protocol}`);
  console.log(`📍 Host: ${req.get('host')}`);
  console.log(`📍 User-Agent: ${req.get('user-agent') || 'Not provided'}`);
  
  console.log('\n📋 Headers:');
  Object.keys(req.headers).forEach(key => {
    console.log(`   ${key}: ${req.headers[key]}`);
  });
  
  console.log('\n🔗 Query Parameters:');
  if (Object.keys(req.query).length > 0) {
    Object.keys(req.query).forEach(key => {
      console.log(`   ${key}: ${req.query[key]}`);
    });
  } else {
    console.log('   (none)');
  }
  
  console.log('\n📦 Body:');
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(JSON.stringify(req.body, null, 2));
  } else {
    console.log('   (empty or not parsed yet)');
  }
  
  console.log('='.repeat(80));
  next();
});

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

// Mimic Azure OpenAI chat completions endpoint with streaming
app.post('/openai/deployments/:deployment/chat/completions', (req: express.Request, res: express.Response) => {
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
    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, api-key');
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
    const sendChunk = (content: string) => {
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
        sendChunk(chunks[index] + (index < chunks.length - 1 ? ' ' : ''));
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
  const response = {
    choices: [{ message: { content: 'Hello! I\'m doing well, thank you for asking. How can I assist you today?' } }]
  };
  console.log('📤 Response body:', JSON.stringify(response, null, 2));
  res.json(response);
});

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  console.log('🏥 Health check endpoint accessed');
  const response = { status: 'ok', timestamp: new Date().toISOString() };
  console.log('📤 Health response:', JSON.stringify(response, null, 2));
  res.json(response);
});

// Catch-all for unmatched routes
app.use('*', (req: express.Request, res: express.Response) => {
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
});

// Try to load SSL certificates
let httpsServer: https.Server | null = null;

try {
  const certsPath = path.join(__dirname, '..', 'certs');
  
  if (fs.existsSync(path.join(certsPath, 'server.key')) && 
      fs.existsSync(path.join(certsPath, 'server.crt'))) {
    
    const httpsOptions = {
      key: fs.readFileSync(path.join(certsPath, 'server.key')),
      cert: fs.readFileSync(path.join(certsPath, 'server.crt'))
    };

    httpsServer = https.createServer(httpsOptions, app);
    httpsServer.listen(httpsPort, () => {
      console.log(`🔒 HTTPS Server started successfully on port ${httpsPort}`);
      console.log(`🔒 SSL Certificate: certs/server.crt`);
      console.log(`🔒 SSL Private Key: certs/server.key`);
    });
  } else {
    console.log('⚠️  SSL certificates not found in certs/ directory');
    console.log('   Run generate-certs.bat to create self-signed certificates');
  }
} catch (error) {
  console.log('⚠️  Could not start HTTPS server:', error);
}

// Always start HTTP server
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log('\n' + '🌐'.repeat(40));
  console.log(`🌐 HTTP Server running at http://localhost:${port}`);
  console.log('🌐 Available endpoints:');
  console.log('🌐   POST /openai/deployments/{deployment}/chat/completions');
  console.log('🌐   GET  /health');
  if (httpsServer) {
    console.log(`🔒 HTTPS Server running at https://localhost:${httpsPort}`);
    console.log('🔒 Available endpoints:');
    console.log('🔒   POST /openai/deployments/{deployment}/chat/completions');
    console.log('🔒   GET  /health');
  }
  console.log('\n📝 Debug logging enabled - all requests will be logged');
  console.log('📝 Use Ctrl+C to stop the server');
  console.log('='.repeat(80));
});
