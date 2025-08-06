/**
 * Simple debug test to isolate proxy connection issues
 */
const axios = require('axios');
require('dotenv').config();

async function debugTest() {
  console.log('🔍 Debug Test - Isolating Connection Issues');
  console.log('==========================================');
  
  const baseURL = 'http://localhost:3100';
  
  // Test 1: Health check (working)
  console.log('\n1. Health Check...');
  try {
    const response = await axios.get(`${baseURL}/health`);
    console.log('✅ Health:', response.status, response.data);
  } catch (error) {
    console.log('❌ Health failed:', error.message);
    return;
  }
  
  // Test 2: Simple GET to proxy base path
  console.log('\n2. Proxy Base Path...');
  try {
    const response = await axios.get(`${baseURL}/proxyapi/azurecom`);
    console.log('✅ Proxy base:', response.status);
  } catch (error) {
    console.log('❌ Proxy base error:', error.response?.status, error.response?.data || error.message);
  }
  
  // Test 3: Try a simple POST with minimal data
  console.log('\n3. Simple POST to Chat Endpoint...');
  try {
    const response = await axios.post(
      `${baseURL}/proxyapi/azurecom/openai/deployments/test/chat/completions`,
      {
        model: "test",
        messages: [{ role: "user", content: "hello" }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'test-key'
        },
        timeout: 5000
      }
    );
    console.log('✅ Chat endpoint:', response.status);
  } catch (error) {
    if (error.response) {
      console.log('❌ Chat endpoint HTTP error:', error.response.status, error.response.data);
    } else if (error.code === 'ECONNRESET') {
      console.log('❌ Connection reset - server may be crashing');
    } else {
      console.log('❌ Chat endpoint network error:', error.code, error.message);
    }
  }
  
  // Test 4: Check if server logs show anything
  console.log('\n4. Check server logs in the terminal where you ran "npm start"');
  console.log('   Look for any error messages or stack traces');
}

debugTest().catch(console.error);
