// Load environment variables from .env file
require('dotenv').config();

import express = require('express');
import bodyParser = require('body-parser');
import https = require('https');
import http = require('http');
import fs = require('fs');
import path = require('path');
import { chatCompletionsHandler, healthHandler, notFoundHandler } from './shared-handlers';
import { requestLoggingMiddleware } from './middleware';

const app = express();

// Configuration from environment variables
const httpPort = process.env.HTTP_PORT || process.env.CONTAINER_HTTP_PORT || 5555;
const httpsPort = process.env.HTTPS_PORT || process.env.CONTAINER_HTTPS_PORT || 5556;
const enableHttp = process.env.ENABLE_HTTP === 'true';
const enableHttps = process.env.ENABLE_HTTPS === 'true';
const maxRequestSize = process.env.MAX_REQUEST_SIZE || '50mb';
const sslCertPath = process.env.SSL_CERT_PATH || 'certs/server.crt';
const sslKeyPath = process.env.SSL_KEY_PATH || 'certs/server.key';

console.log('🚀 Starting Azure OpenAI Mock Server...');
console.log('🔧 Configuration:');
console.log(`   📍 HTTP enabled: ${enableHttp} (port: ${httpPort})`);
console.log(`   📍 HTTPS enabled: ${enableHttps} (port: ${httpsPort})`);
console.log(`   📍 Proxy mode: ${process.env.USE_EDUHK_PROXY === 'true' ? 'EdUHK API' : 'Mock responses'}`);
console.log(`   📍 Max request size: ${maxRequestSize}`);
console.log(`   📍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Middleware to parse JSON bodies with configurable size limit
app.use(bodyParser.json({ limit: maxRequestSize }));
app.use(bodyParser.urlencoded({ limit: maxRequestSize, extended: true }));

// Detailed request logging
app.use(requestLoggingMiddleware);

// Chat completions endpoint
app.post('/openai/deployments/:deployment/chat/completions', chatCompletionsHandler);

// Health check endpoint
app.get('/health', healthHandler);

// 404 handler
app.use('*', notFoundHandler);

// Start HTTP server if enabled
if (enableHttp) {
  const httpServer = http.createServer(app);
  
  httpServer.listen(httpPort, () => {
    console.log('\n🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐');
    console.log(`🌐 HTTP Server running at http://localhost:${httpPort}`);
    console.log('🌐 Available endpoints:');
    console.log('🌐   POST /openai/deployments/{deployment}/chat/completions');
    console.log('🌐   GET  /health');
    console.log('🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐');
  });

  httpServer.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ HTTP Port ${httpPort} is already in use`);
    } else {
      console.error('❌ HTTP Server error:', error);
    }
  });
} else {
  console.log('ℹ️  HTTP server disabled');
}

// Start HTTPS server if enabled
if (enableHttps) {
  // Check if SSL certificates exist
  if (fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath)) {
    try {
      const options = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };

      const httpsServer = https.createServer(options, app);
      
      httpsServer.listen(httpsPort, () => {
        console.log('\n🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒');
        console.log(`🔒 HTTPS Server running at https://localhost:${httpsPort}`);
        console.log('🔒 Available endpoints:');
        console.log('🔒   POST /openai/deployments/{deployment}/chat/completions');
        console.log('🔒   GET  /health');
        console.log(`🔒 SSL Certificate: ${sslCertPath}`);
        console.log(`🔒 SSL Private Key: ${sslKeyPath}`);
        console.log('🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒');
      });

      httpsServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ HTTPS Port ${httpsPort} is already in use`);
        } else {
          console.error('❌ HTTPS Server error:', error);
        }
      });

      console.log(`🔒 HTTPS Server configured successfully`);
      console.log(`🔒 SSL Certificate: ${sslCertPath}`);
      console.log(`🔒 SSL Private Key: ${sslKeyPath}`);
      
    } catch (error) {
      console.error('❌ Failed to start HTTPS server:', error);
      console.error('💡 Make sure SSL certificates exist and are valid');
    }
  } else {
    console.error('❌ SSL certificates not found!');
    console.error(`   Missing: ${sslCertPath} or ${sslKeyPath}`);
    console.error('💡 Generate certificates with: npm run generate-certs');
    console.log('ℹ️  HTTPS server disabled due to missing certificates');
  }
} else {
  console.log('ℹ️  HTTPS server disabled');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

console.log('\n📝 Debug logging enabled - all requests will be logged');
console.log('📝 Use Ctrl+C to stop the server');
console.log('================================================================================');
