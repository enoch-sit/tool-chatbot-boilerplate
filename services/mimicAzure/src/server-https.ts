// Load environment variables from .env file
require('dotenv').config();
console.log('🔧 Loaded environment from .env file');

import express = require('express');
import bodyParser = require('body-parser');
import https = require('https');
import http = require('http');
import fs = require('fs');
import path = require('path');
import { chatCompletionsHandler, healthHandler, notFoundHandler, corsHandler } from './shared-handlers';
import { requestLoggingMiddleware } from './middleware';

const app = express();
const port = process.env.PORT || 5555;
const httpsPort = process.env.HTTPS_PORT || 5556;

// Middleware to parse JSON bodies with increased size limit for large payloads (images, long conversations)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Detailed request logging
app.use(requestLoggingMiddleware);

// Handle OPTIONS requests for CORS preflight
app.options('*', corsHandler);

// Chat completions endpoint
app.post('/openai/deployments/:deployment/chat/completions', chatCompletionsHandler);

// Health check endpoint
app.get('/health', healthHandler);

// Catch-all for unmatched routes
app.use('*', notFoundHandler);

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
