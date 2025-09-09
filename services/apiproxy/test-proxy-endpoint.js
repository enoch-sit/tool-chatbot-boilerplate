/**
 * Test script for the Azure proxy endpoint (/proxyapi/azurecom/)
 * This tests the proxy that forwards requests to your custom API
 */
const axios = require('axios');
require('dotenv').config();

const PROXY_URL = 'http://localhost:3002/proxyapi/azurecom';
const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;

if (!CUSTOM_API_KEY) {
  console.error('❌ Please set CUSTOM_API_KEY in your .env file');
  process.exit(1);
}

async function testProxyEndpoints() {
  console.log('🚀 Testing Azure Proxy Endpoints');
  console.log('=================================');
  console.log(`🔗 Proxy URL: ${PROXY_URL}`);
  console.log(`🔑 Custom API Key: ${CUSTOM_API_KEY ? '[SET]' : '[NOT SET]'}`);

  // Test 1: Chat Completions (Non-streaming)
  await testChatCompletions();
  
  // Test 2: Chat Completions (Streaming) 
  await testChatCompletionsStreaming();
  
  // Test 3: Image Generation
  await testImageGeneration();
  
  // Test 4: Embeddings
  await testEmbeddings();
}

async function testChatCompletions() {
  console.log('\n💬 Test 1: Chat Completions (Non-streaming)...');
  
  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-10-21`,
      {
        model: 'gpt-35-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello! Say hi and count to 3.' }
        ],
        max_tokens: 100,
        temperature: 0.7,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': CUSTOM_API_KEY
        }
      }
    );

    console.log('✅ Chat Completions Success:');
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Chat Completions Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testChatCompletionsStreaming() {
  console.log('\n🌊 Test 2: Chat Completions (Streaming)...');
  
  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-10-21`,
      {
        model: 'gpt-35-turbo',
        messages: [
          { role: 'user', content: 'Count from 1 to 5, putting each number on a new line.' }
        ],
        max_tokens: 50,
        temperature: 0.3,
        stream: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': CUSTOM_API_KEY
        },
        responseType: 'stream'
      }
    );

    console.log('✅ Streaming Chat Completions Started:');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\n📡 Streaming Data:\n');

    let chunkCount = 0;
    let buffer = '';
    let fullContent = '';

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          chunkCount++;
          
          if (data === '[DONE]') {
            console.log('🏁 Streaming completed: [DONE]');
            console.log('📝 Full Content:', fullContent);
          } else {
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                fullContent += parsed.choices[0].delta.content;
                console.log(`Chunk ${chunkCount}: "${parsed.choices[0].delta.content}"`);
              }
            } catch (e) {
              console.log(`Chunk ${chunkCount}: Could not parse:`, data);
            }
          }
        }
      }
      
      buffer = lines[lines.length - 1];
    });

    await new Promise((resolve) => {
      response.data.on('end', resolve);
    });
    
  } catch (error) {
    console.log('❌ Streaming Chat Completions Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testImageGeneration() {
  console.log('\n🖼️ Test 3: Image Generation...');
  
  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/dall-e-3/images/generations?api-version=2024-10-21`,
      {
        prompt: 'A cute cat wearing a space helmet',
        quality: 'standard',
        size: '1024x1024',
        response_format: 'url',
        n: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': CUSTOM_API_KEY
        }
      }
    );

    console.log('✅ Image Generation Success:');
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Image Generation Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testEmbeddings() {
  console.log('\n📊 Test 4: Embeddings...');
  
  try {
    const response = await axios.post(
      `${PROXY_URL}/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-10-21`,
      {
        input: 'The quick brown fox jumps over the lazy dog',
        model: 'text-embedding-ada-002'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': CUSTOM_API_KEY
        }
      }
    );

    console.log('✅ Embeddings Success:');
    console.log('📊 Status:', response.status);
    console.log('📋 Response (truncated):', {
      object: response.data.object,
      model: response.data.model,
      usage: response.data.usage,
      data_count: response.data.data?.length,
      embedding_dimensions: response.data.data?.[0]?.embedding?.length
    });
    
  } catch (error) {
    console.log('❌ Embeddings Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

async function main() {
  try {
    await testProxyEndpoints();
  } catch (error) {
    console.error('💥 Main execution error:', error);
  }
  
  console.log('\n🎉 Proxy endpoint testing completed!');
}

if (require.main === module) {
  main();
}

module.exports = {
  testProxyEndpoints,
  testChatCompletions,
  testChatCompletionsStreaming,
  testImageGeneration,
  testEmbeddings
};
