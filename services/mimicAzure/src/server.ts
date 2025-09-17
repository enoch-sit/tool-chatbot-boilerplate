import express = require('express');
import bodyParser = require('body-parser');
import http = require('http');
import { chatCompletionsHandler, healthHandler, notFoundHandler } from './shared-handlers';
import { basicLoggingMiddleware } from './middleware';

const app = express();
const port = process.env.PORT || 5555;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Basic request logging
app.use(basicLoggingMiddleware);

// Chat completions endpoint
app.post('/openai/deployments/:deployment/chat/completions', chatCompletionsHandler);

// Health check endpoint
app.get('/health', healthHandler);

// Catch-all for unmatched routes
app.use('*', notFoundHandler);

// Start HTTP server only
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log('\n' + '🌐'.repeat(40));
  console.log(`🌐 HTTP Server running at http://localhost:${port}`);
  console.log('🌐 Available endpoints:');
  console.log('🌐   POST /openai/deployments/{deployment}/chat/completions');
  console.log('🌐   GET  /health');
  console.log('\n📝 Basic logging enabled - requests will be logged');
  console.log('📝 Use Ctrl+C to stop the server');
  console.log('='.repeat(80));
});
