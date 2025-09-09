/**
 * Quick test for Azure OpenAI endpoint
 */
const axios = require('axios');
require('dotenv').config();

const AZURE_ENDPOINT = process.env.AZURE_TEST_ENDPOINT;
const DEPLOYMENT = process.env.AZURE_TEST_DEPLOYMENT;
const API_KEY = process.env.AZURE_TEST_API_KEY;
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION;

async function quickTest() {
  console.log('🚀 Quick Azure OpenAI Test');
  console.log('==========================');
  
  if (!API_KEY) {
    console.error('❌ AZURE_TEST_API_KEY not found in .env');
    return;
  }
  
  const url = `${AZURE_ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
  console.log(`📍 Testing: ${url}`);
  
  try {
    const response = await axios.post(url, {
      messages: [{ role: 'user', content: 'Say hello!' }],
      max_tokens: 50
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('✅ SUCCESS!');
    console.log('📊 Status:', response.status);
    console.log('💬 Response:', response.data.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ ERROR:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.error?.message || error.message
    });
  }
}

if (require.main === module) {
  quickTest();
}
