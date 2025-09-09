const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const azureOpenAIRoutes = require('./routes/azureOpenAI');
const bedrockRoutes = require('./routes/bedrock');
const azureProxyRoutes = require('./routes/azureProxy');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

const app = express();
const HTTP_PORT = process.env.PORT || 7000;
const HTTPS_PORT = process.env.HTTPS_PORT || 7443;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    secure: req.secure,
    protocol: req.protocol,
    port: req.get('host')
  });
});

// API Routes
app.use('/azure/openai', azureOpenAIRoutes);
app.use('/bedrock', bedrockRoutes);
app.use('/proxyapi/azurecom', azureProxyRoutes);

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NotFound',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      supported_endpoints: [
        'POST /azure/openai/deployments/{deployment-id}/chat/completions',
        'POST /azure/openai/deployments/{deployment-id}/completions',
        'POST /bedrock/model/{model-id}/invoke',
        'POST /bedrock/model/{model-id}/invoke-with-response-stream',
        'POST /proxyapi/azurecom/openai/deployments/{deployment}/chat/completions',
        'POST /proxyapi/azurecom/openai/deployments/{deployment}/images/generations',
        'POST /proxyapi/azurecom/openai/deployments/{deployment}/embeddings'
      ]
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Start servers
function startServers() {
  // Always start HTTP server
  app.listen(HTTP_PORT, () => {
    console.log(`🚀 HTTP API Proxy Server running on port ${HTTP_PORT}`);
    console.log(`📋 Health check: http://localhost:${HTTP_PORT}/health`);
    console.log(`🔗 Azure endpoint: http://localhost:${HTTP_PORT}/proxyapi/azurecom/openai/deployments/{deployment}/chat/completions`);
    console.log(`🔗 Custom API URL: ${process.env.CUSTOM_API_URL || 'Not configured'}`);
  });

  // Try to start HTTPS server with certificates
  const certsDir = path.join(__dirname, 'certs');
  const keyPath = path.join(certsDir, 'private-key.pem');
  const certPath = path.join(certsDir, 'certificate.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };

      // Test if the certificates are valid by creating the server
      const httpsServer = https.createServer(httpsOptions, app);
      
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS API Proxy Server running on port ${HTTPS_PORT}`);
        console.log(`📋 HTTPS Health check: https://localhost:${HTTPS_PORT}/health`);
        console.log(`🔗 HTTPS Azure endpoint: https://localhost:${HTTPS_PORT}/proxyapi/azurecom/openai/deployments/{deployment}/chat/completions`);
        console.log('⚠️  Note: Browser will show security warning for self-signed certificate');
      });

    } catch (error) {
      console.warn('⚠️ Could not start HTTPS server:', error.message);
      console.log('💡 Run "npm run generate-certs" to create new certificates');
      console.log('💡 HTTP server is available on port', HTTP_PORT);
    }
  } else {
    console.warn('⚠️ HTTPS certificates not found');
    console.log('💡 Run "npm run generate-certs" to create certificates for HTTPS');
    console.log('💡 HTTP server is available on port', HTTP_PORT);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📄 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📄 Shutting down gracefully...');
  process.exit(0);
});

// Start the servers
startServers();

module.exports = app;
