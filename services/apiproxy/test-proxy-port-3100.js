/**
 * Test script for the Azure proxy endpoint (/proxyapi/azurecom/) on port 3100
 * This tests the proxy that forwards requests to your custom API
 */
const axios = require('axios');
require('dotenv').config();

const PROXY_URL = 'http://localhost:3100/proxyapi/azurecom';
const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;

if (!CUSTOM_API_KEY || CUSTOM_API_KEY === 'your-custom-api-key-here') {
  console.log('⚠️  CUSTOM_API_KEY not set or using placeholder value');
  console.log('   Using placeholder key for testing proxy functionality');
}

// Test configurations
const TEST_DEPLOYMENT = 'gpt-35-turbo';
const TEST_CONFIG = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'api-key': CUSTOM_API_KEY || 'test-key',
    'User-Agent': 'Azure-Proxy-Test/1.0'
  }
};

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await axios.get('http://localhost:3100/health', { timeout: 5000 });
    console.log('✅ Health Check:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testChatCompletions() {
  console.log('\n💬 Test 1: Chat Completions (Non-streaming)...');
  
  const chatPayload = {
    model: TEST_DEPLOYMENT,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello! Please respond with just 'Hello back!'" }
    ],
    max_tokens: 50,
    temperature: 0.7,
    stream: false
  };

  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/${TEST_DEPLOYMENT}/chat/completions`,
      chatPayload,
      TEST_CONFIG
    );
    
    console.log('✅ Chat Completions Response:');
    console.log('   Status:', response.status);
    console.log('   Model:', response.data.model);
    console.log('   Content:', response.data.choices?.[0]?.message?.content);
    console.log('   Usage:', response.data.usage);
    return true;
  } catch (error) {
    console.log('❌ Chat Completions Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Network Error:', error.message);
    }
    return false;
  }
}

async function testChatCompletionsStreaming() {
  console.log('\n🌊 Test 2: Chat Completions (Streaming)...');
  
  const streamPayload = {
    model: TEST_DEPLOYMENT,
    messages: [
      { role: "user", content: "Count from 1 to 3, one number per response." }
    ],
    max_tokens: 30,
    temperature: 0.1,
    stream: true
  };

  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/${TEST_DEPLOYMENT}/chat/completions`,
      streamPayload,
      {
        ...TEST_CONFIG,
        responseType: 'stream'
      }
    );
    
    console.log('✅ Streaming Response Started (Status:', response.status, ')');
    
    let chunkCount = 0;
    let content = '';
    
    return new Promise((resolve) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('   Stream completed');
              console.log('   Total chunks:', chunkCount);
              console.log('   Content:', content.trim());
              resolve(true);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                content += delta;
                chunkCount++;
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      });
      
      response.data.on('error', (error) => {
        console.log('❌ Stream Error:', error.message);
        resolve(false);
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('⏰ Stream timeout - got', chunkCount, 'chunks');
        resolve(chunkCount > 0);
      }, 10000);
    });
    
  } catch (error) {
    console.log('❌ Streaming Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Network Error:', error.message);
    }
    return false;
  }
}

async function testImageGeneration() {
  console.log('\n🎨 Test 3: Image Generation...');
  
  const imagePayload = {
    model: "dall-e-3",
    prompt: "A simple red circle on white background",
    n: 1,
    size: "1024x1024",
    quality: "standard"
  };

  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/dall-e-3/images/generations`,
      imagePayload,
      TEST_CONFIG
    );
    
    console.log('✅ Image Generation Response:');
    console.log('   Status:', response.status);
    console.log('   Created:', response.data.created);
    console.log('   Images:', response.data.data?.length || 0);
    if (response.data.data?.[0]?.url) {
      console.log('   Image URL:', response.data.data[0].url.substring(0, 60) + '...');
    }
    return true;
  } catch (error) {
    console.log('❌ Image Generation Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Network Error:', error.message);
    }
    return false;
  }
}

async function testEmbeddings() {
  console.log('\n📊 Test 4: Embeddings...');
  
  const embeddingPayload = {
    model: "text-embedding-ada-002",
    input: ["Hello world", "Test embedding"],
    encoding_format: "float"
  };

  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/text-embedding-ada-002/embeddings`,
      embeddingPayload,
      TEST_CONFIG
    );
    
    console.log('✅ Embeddings Response:');
    console.log('   Status:', response.status);
    console.log('   Model:', response.data.model);
    console.log('   Embeddings:', response.data.data?.length || 0);
    console.log('   Dimensions:', response.data.data?.[0]?.embedding?.length || 0);
    console.log('   Usage:', response.data.usage);
    return true;
  } catch (error) {
    console.log('❌ Embeddings Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Network Error:', error.message);
    }
    return false;
  }
}

async function testVisionRequest() {
  console.log('\n👁️  Test 5: Vision Request (should return error)...');
  
  const visionPayload = {
    model: TEST_DEPLOYMENT,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What is in this image?" },
          { 
            type: "image_url", 
            image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" }
          }
        ]
      }
    ],
    max_tokens: 50
  };

  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/${TEST_DEPLOYMENT}/chat/completions`,
      visionPayload,
      TEST_CONFIG
    );
    
    console.log('❓ Unexpected Success (Vision should be disabled):');
    console.log('   Status:', response.status);
    console.log('   Response:', response.data);
    return false; // Vision should be disabled, so success is unexpected
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('vision')) {
      console.log('✅ Vision correctly disabled:');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data.error.message);
      return true;
    } else {
      console.log('❌ Unexpected Vision Error:');
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Error:', error.response.data);
      } else {
        console.log('   Network Error:', error.message);
      }
      return false;
    }
  }
}

async function testInvalidEndpoint() {
  console.log('\n🚫 Test 6: Invalid Endpoint...');
  
  try {
    const response = await axios.post(
      `${PROXY_URL}/invalid/endpoint`,
      { test: "data" },
      TEST_CONFIG
    );
    
    console.log('❓ Unexpected Success for invalid endpoint');
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Invalid endpoint correctly rejected:');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data?.error?.message || 'Not found');
      return true;
    } else {
      console.log('❌ Unexpected error for invalid endpoint:');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function runAllTests() {
  console.log('🚀 Testing Azure Proxy Endpoints on Port 3100');
  console.log('===============================================');
  console.log(`🔗 Proxy URL: ${PROXY_URL}`);
  console.log(`🔑 Custom API Key: ${CUSTOM_API_KEY ? '[SET]' : '[NOT SET]'}`);
  console.log(`🏭 Custom API URL: ${process.env.CUSTOM_API_URL}`);
  
  const results = {
    health: false,
    chat: false,
    streaming: false,
    images: false,
    embeddings: false,
    vision: false,
    invalid: false
  };

  // Test health first
  results.health = await testHealthCheck();
  
  if (!results.health) {
    console.log('\n❌ Server not responding on port 3100. Please start the server first.');
    return;
  }

  // Run all tests
  results.chat = await testChatCompletions();
  results.streaming = await testChatCompletionsStreaming();
  results.images = await testImageGeneration();
  results.embeddings = await testEmbeddings();
  results.vision = await testVisionRequest();
  results.invalid = await testInvalidEndpoint();

  // Summary
  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log(`🏥 Health Check:           ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`💬 Chat Completions:       ${results.chat ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🌊 Streaming:              ${results.streaming ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🎨 Image Generation:       ${results.images ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📊 Embeddings:             ${results.embeddings ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`👁️  Vision Disabled:        ${results.vision ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🚫 Invalid Endpoint:       ${results.invalid ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed! Your Azure proxy is working correctly.');
  } else if (passCount >= 3) {
    console.log('⚠️  Most tests passed. Check failed tests above.');
  } else {
    console.log('❌ Multiple test failures. Check your configuration and API key.');
  }
}

// Run tests
runAllTests().catch(console.error);
