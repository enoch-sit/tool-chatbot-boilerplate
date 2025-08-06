/**
 * Test individual components to find what's causing the server crash
 */
console.log('🔍 Testing Individual Components...');
console.log('==================================');

// Test 1: Basic imports
console.log('\n1. Testing imports...');
try {
  const express = require('express');
  console.log('✅ express');
  
  const { transformAzureRequestToCustom, transformCustomResponseToAzure, isVisionRequest } = require('./transformers/customAPITransformer');
  console.log('✅ customAPITransformer');
  
  const { callCustomAPI, callCustomAPIStreaming } = require('./services/customAPIService');
  console.log('✅ customAPIService');
  
  const { logRequest, logResponse } = require('./middleware/logger');
  console.log('✅ logger middleware');
  
} catch (error) {
  console.log('❌ Import error:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
}

// Test 2: Test transformer functions with sample data
console.log('\n2. Testing transformer functions...');
try {
  const { transformAzureRequestToCustom, isVisionRequest } = require('./transformers/customAPITransformer');
  
  const sampleAzureRequest = {
    model: "gpt-35-turbo",
    messages: [{ role: "user", content: "hello" }],
    max_tokens: 50
  };
  
  const isVision = isVisionRequest(sampleAzureRequest);
  console.log('✅ isVisionRequest:', isVision);
  
  const customRequest = transformAzureRequestToCustom(sampleAzureRequest, 'gpt-35-turbo');
  console.log('✅ transformAzureRequestToCustom:', !!customRequest);
  
} catch (error) {
  console.log('❌ Transformer error:', error.message);
  console.log('Stack:', error.stack);
}

// Test 3: Test service instantiation (without making actual API calls)
console.log('\n3. Testing service instantiation...');
try {
  const { callCustomAPI } = require('./services/customAPIService');
  console.log('✅ Service import successful');
  
  // Don't actually call the API, just test if the function exists
  console.log('✅ callCustomAPI function exists:', typeof callCustomAPI === 'function');
  
} catch (error) {
  console.log('❌ Service error:', error.message);
  console.log('Stack:', error.stack);
}

console.log('\n✅ Component test complete');
