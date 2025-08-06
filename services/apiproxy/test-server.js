/**
 * Minimal test server to isolate the proxy route issue
 */
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = 3101; // Use a different port to avoid conflicts

// Middleware
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', port: PORT });
});

// Test 1: Simple route that works
app.post('/test/simple', (req, res) => {
  console.log('Simple route called');
  res.json({ message: 'Simple route works', body: req.body });
});

// Test 2: Route with async/await (like our proxy)
app.post('/test/async', async (req, res) => {
  try {
    console.log('Async route called');
    
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    res.json({ message: 'Async route works', body: req.body });
  } catch (error) {
    console.error('Async route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test 3: Route that imports our transformer (potential crash point)
app.post('/test/transformer', async (req, res) => {
  try {
    console.log('Transformer route called');
    
    const { transformAzureRequestToCustom } = require('./transformers/customAPITransformer');
    
    const testRequest = {
      model: "gpt-35-turbo",
      messages: [{ role: "user", content: "test" }]
    };
    
    const result = transformAzureRequestToCustom(testRequest, 'gpt-35-turbo');
    
    res.json({ message: 'Transformer route works', result });
  } catch (error) {
    console.error('Transformer route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test 4: Route that tries to call custom API service (another potential crash point)
app.post('/test/service', async (req, res) => {
  try {
    console.log('Service route called');
    
    const { callCustomAPI } = require('./services/customAPIService');
    
    // Don't actually call the API, just test the function
    res.json({ 
      message: 'Service route works', 
      serviceExists: typeof callCustomAPI === 'function',
      apiUrl: process.env.CUSTOM_API_URL
    });
  } catch (error) {
    console.error('Service route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message,
    stack: error.stack 
  });
});

// Catch-all
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`Test with:`);
  console.log(`  curl -X POST http://localhost:${PORT}/test/simple -H "Content-Type: application/json" -d '{"test": "data"}'`);
});

module.exports = app;
