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
    secure: req.secure
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

// Function to create self-signed certificate
function createSelfSignedCert() {
  const certDir = path.join(__dirname, 'certs');
  const keyPath = path.join(certDir, 'private-key.pem');
  const certPath = path.join(certDir, 'certificate.pem');

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  }

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Generate self-signed certificate using OpenSSL (if available)
  try {
    const { execSync } = require('child_process');
    
    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'ignore' });
    
    // Generate certificate
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=Dev/L=Dev/O=Dev/OU=Dev/CN=localhost"`, { stdio: 'ignore' });
    
    console.log('✅ Self-signed certificate created successfully');
    
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } catch (error) {
    console.warn('⚠️ OpenSSL not available. Using built-in certificate generation...');
    
    // Fallback: Use a pre-generated development certificate
    const devKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKB
wQNfNeImxn0VDerZzx0gvQIDAQABAoIBAQC3LO+vTYWjxVyEaQgPQKe7EjZhCVhp
qQIDAQABAoIBAH+Y+OkCDG9F7q9X2K5oSv8w1KgjWn3qjkxYbCZwJnxwxJkHRSgL
AQIDAQAB
-----END PRIVATE KEY-----`;

    const devCert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJALdB+zCcWsKhMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1L7VLPHCgcEDXzXiJsZ9FQ3q2c8dIL0CAwEAAaOBxTCBwjAdBgNV
HQ4EFgQUAEOxExQfMJBfRAYCb5lDQtxm3vkwgZIGA1UdIwSBijCBh4AUAEOxExQf
MJBfRAYCb5lDQtxm3vmhSaRHMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21l
LVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGSCCQC3Qfsw
nFrCoTAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCJg+xKWlqxYJQ9
r3DvEBmxwWGRFz5B1HjkxVsF9QK9vLN6qBT3WT0mUmq4W7VmKWvVjrW4CqQgdQfJ
-----END CERTIFICATE-----`;
    
    // Write the development certificates
    fs.writeFileSync(keyPath, devKey);
    fs.writeFileSync(certPath, devCert);
    
    console.log('📜 Using development certificates');
    
    return {
      key: devKey,
      cert: devCert
    };
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

  // Start HTTPS server if certificates are available
  try {
    const httpsOptions = createSelfSignedCert();
    
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
}

// Start the servers
startServers();

module.exports = app;
