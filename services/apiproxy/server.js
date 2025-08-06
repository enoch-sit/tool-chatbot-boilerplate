const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const azureOpenAIRoutes = require('./routes/azureOpenAI');
const bedrockRoutes = require('./routes/bedrock');
const azureProxyRoutes = require('./routes/azureProxy');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

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
    version: require('./package.json').version
  });
});

// API Routes
app.use('/azure/openai', azureOpenAIRoutes);
app.use('/bedrock', bedrockRoutes);
app.use('/proxyapi/azurecom', azureProxyRoutes); // Your new Azure proxy endpoint

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Proxy Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Custom API URL: ${process.env.CUSTOM_API_URL || 'Not configured'}`);
});

module.exports = app;
