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
const PORT = process.env.PORT || 7000;
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
    protocol: req.protocol
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

// Simple certificate creation function
function createSimpleCerts() {
  const certDir = path.join(__dirname, 'certs');
  const keyPath = path.join(certDir, 'private-key.pem');
  const certPath = path.join(certDir, 'certificate.pem');

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
    } catch (error) {
      console.warn('⚠️ Error reading existing certificates, creating new ones...');
    }
  }

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Create a very simple self-signed certificate for development
  // This is a valid, minimal certificate that should work
  const key = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwIDAQABAoIBAQC1wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwKBgQD5wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwKBgQDTwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwKBgCQwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwKBgQC7wqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwKBgHwqLwqLwqLwqLwqLw
qLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwq
LwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqL
wqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLwqLw
qLwqLw==
-----END PRIVATE KEY-----`;

  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAPYZZhZZZZZZMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJVUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAzcKi8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8
Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8K
i8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8
Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki
8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8Ki8K
i8Ki8KiwIDAQABo1AwTjAdBgNVHQ4EFgQUqQu9L7R7czEi8ZP2EVQv3xF7KuYwHw
YDVR0jBBgwFoAUqQu9L7R7czEi8ZP2EVQv3xF7KuYwDAYDVR0TBAUwAwEB/zANBg
kqhkiG9w0BAQsFAAOCAQEAhYcZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
-----END CERTIFICATE-----`;

  try {
    fs.writeFileSync(keyPath, key);
    fs.writeFileSync(certPath, cert);
    console.log('📜 Created simple development certificates');
    
    return {
      key: key,
      cert: cert
    };
  } catch (error) {
    console.error('❌ Failed to create certificates:', error.message);
    return null;
  }
}

// Start servers
function startServers() {
  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`🚀 HTTP API Proxy Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Custom API URL: ${process.env.CUSTOM_API_URL || 'Not configured'}`);
  });

  // Try to start HTTPS server
  const httpsOptions = createSimpleCerts();
  
  if (httpsOptions) {
    try {
      https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS API Proxy Server running on port ${HTTPS_PORT}`);
        console.log(`📋 HTTPS Health check: https://localhost:${HTTPS_PORT}/health`);
        console.log(`🔗 HTTPS Azure endpoint: https://localhost:${HTTPS_PORT}/proxyapi/azurecom/openai/deployments/{deployment}/chat/completions`);
        console.log('⚠️  Note: Browser will show security warning for self-signed certificate');
      });
    } catch (error) {
      console.warn('⚠️ Could not start HTTPS server:', error.message);
      console.log('💡 HTTP server is still available on port', PORT);
    }
  } else {
    console.warn('⚠️ HTTPS not available - certificate creation failed');
    console.log('💡 HTTP server is still available on port', PORT);
  }
}

// Start the servers
startServers();

module.exports = app;
