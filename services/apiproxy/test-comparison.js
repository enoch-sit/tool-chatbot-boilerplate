/**
 * Comprehensive test script to compare Azure OpenAI responses with our proxy
 */
const axios = require('axios');
require('dotenv').config();

// Azure OpenAI Configuration
const AZURE_ENDPOINT = process.env.AZURE_TEST_ENDPOINT || 'https://for-fivesubject.openai.azure.com/';
const DEPLOYMENT = process.env.AZURE_TEST_DEPLOYMENT || 'gpt-4.1';
const API_KEY = process.env.AZURE_TEST_API_KEY;
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

// Proxy Configuration
const PROXY_URL = 'http://localhost:3000';

// Test requests
const testChatRequest = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say hello and count from 1 to 5.' }
  ],
  max_tokens: 150,
  temperature: 0.7
};

const testStreamingRequest = {
  ...testChatRequest,
  stream: true
};

async function testDirectAzure(streaming = false) {
  const requestType = streaming ? 'Streaming' : 'Non-Streaming';
  console.log(`\n🔷 Testing Direct Azure ${requestType}...`);
  
  if (!API_KEY) {
    console.log('❌ Azure API key not set, skipping Azure test');
    return null;
  }
  
  try {
    const url = `${AZURE_ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
    const request = streaming ? testStreamingRequest : testChatRequest;
    
    console.log(`📍 URL: ${url}`);
    console.log(`📝 Request:`, JSON.stringify(request, null, 2));
    
    const config = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY
      },
      data: request
    };
    
    if (streaming) {
      config.responseType = 'stream';
    }
    
    const response = await axios(config);
    
    if (streaming) {
      console.log('✅ Azure Streaming Response Started');
      console.log('📊 Status:', response.status);
      console.log('📋 Headers:', response.headers['content-type']);
      
      return new Promise((resolve) => {
        let chunks = [];
        response.data.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          chunks.push(chunkStr);
          
          // Parse and display chunks
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data.trim() === '[DONE]') {
                console.log('🏁 Azure Stream: [DONE]');
              } else if (data.trim()) {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    process.stdout.write(content);
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        });
        
        response.data.on('end', () => {
          console.log('\n✅ Azure streaming completed');
          resolve({ chunks, status: response.status });
        });
      });
    } else {
      console.log('✅ Azure Response:');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    }
    
  } catch (error) {
    console.error('❌ Azure Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return null;
  }
}

async function testProxy(streaming = false) {
  const requestType = streaming ? 'Streaming' : 'Non-Streaming';
  console.log(`\n🔶 Testing Proxy ${requestType}...`);
  
  try {
    const url = `${PROXY_URL}/azure/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
    const request = streaming ? testStreamingRequest : testChatRequest;
    
    console.log(`📍 URL: ${url}`);
    console.log(`📝 Request:`, JSON.stringify(request, null, 2));
    
    const config = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'test-key' // Use a test key for proxy
      },
      data: request
    };
    
    if (streaming) {
      config.responseType = 'stream';
    }
    
    const response = await axios(config);
    
    if (streaming) {
      console.log('✅ Proxy Streaming Response Started');
      console.log('📊 Status:', response.status);
      console.log('📋 Headers:', response.headers['content-type']);
      
      return new Promise((resolve) => {
        let chunks = [];
        response.data.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          chunks.push(chunkStr);
          
          // Parse and display chunks
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data.trim() === '[DONE]') {
                console.log('🏁 Proxy Stream: [DONE]');
              } else if (data.trim()) {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    process.stdout.write(content);
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        });
        
        response.data.on('end', () => {
          console.log('\n✅ Proxy streaming completed');
          resolve({ chunks, status: response.status });
        });
      });
    } else {
      console.log('✅ Proxy Response:');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    }
    
  } catch (error) {
    console.error('❌ Proxy Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return null;
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Proxy Health Check...');
  
  try {
    const response = await axios.get(`${PROXY_URL}/health`);
    console.log('✅ Health Check:', response.data);
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    console.log('💡 Make sure the proxy server is running: npm start');
  }
}

async function main() {
  console.log('🧪 Azure OpenAI vs Proxy Comparison Test');
  console.log('=========================================');
  console.log(`🔗 Azure Endpoint: ${AZURE_ENDPOINT}`);
  console.log(`🎯 Deployment: ${DEPLOYMENT}`);
  console.log(`📅 API Version: ${API_VERSION}`);
  console.log(`🏠 Proxy URL: ${PROXY_URL}`);
  console.log(`🔑 Azure API Key: ${API_KEY ? '[SET]' : '[NOT SET]'}`);

  // Test health check first
  await testHealthCheck();
  
  console.log('\n' + '='.repeat(50));
  console.log('NON-STREAMING TESTS');
  console.log('='.repeat(50));
  
  // Test non-streaming
  const azureResponse = await testDirectAzure(false);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const proxyResponse = await testProxy(false);
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n' + '='.repeat(50));
  console.log('STREAMING TESTS');
  console.log('='.repeat(50));
  
  // Test streaming
  const azureStreamResponse = await testDirectAzure(true);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const proxyStreamResponse = await testProxy(true);
  
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`✅ Direct Azure (Non-streaming): ${azureResponse ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Proxy (Non-streaming): ${proxyResponse ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Direct Azure (Streaming): ${azureStreamResponse ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Proxy (Streaming): ${proxyStreamResponse ? 'SUCCESS' : 'FAILED'}`);
  
  if (azureResponse && proxyResponse) {
    console.log('\n🔍 Format Compatibility Check:');
    console.log(`   Azure ID format: ${azureResponse.id}`);
    console.log(`   Proxy ID format: ${proxyResponse.id}`);
    console.log(`   Azure object: ${azureResponse.object}`);
    console.log(`   Proxy object: ${proxyResponse.object}`);
    console.log(`   Format match: ${azureResponse.object === proxyResponse.object ? '✅' : '❌'}`);
  }
  
  console.log('\n🎉 Test completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Update your custom API URL in .env');
  console.log('   2. Modify transformers to match your API format');
  console.log('   3. Test with your actual custom API');
}

if (require.main === module) {
  main().catch(console.error);
}
