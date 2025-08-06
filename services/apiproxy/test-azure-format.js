/**
 * Test script to investigate Azure OpenAI API format
 * This will help us understand the exact request/response format for both regular and streaming calls
 */
const axios = require('axios');
require('dotenv').config();

const AZURE_ENDPOINT = process.env.AZURE_TEST_ENDPOINT || 'https://for-fivesubject.openai.azure.com/';
const DEPLOYMENT = process.env.AZURE_TEST_DEPLOYMENT || 'gpt-4.1';
const MODEL_NAME = process.env.AZURE_TEST_MODEL_NAME || 'gpt-4';
const API_KEY = process.env.AZURE_TEST_API_KEY;
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

if (!API_KEY) {
  console.error('❌ Please set AZURE_TEST_API_KEY in your .env file');
  process.exit(1);
}

const baseURL = `${AZURE_ENDPOINT}openai/deployments/${DEPLOYMENT}`;

async function testNonStreamingChatCompletion() {
  console.log('\n🔍 Testing Non-Streaming Chat Completion...');
  console.log(`📍 URL: ${baseURL}/chat/completions?api-version=${API_VERSION}`);
  
  try {
    const response = await axios.post(
      `${baseURL}/chat/completions?api-version=${API_VERSION}`,
      {
        model: MODEL_NAME, // Use the actual model name here
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello and tell me what you are.' }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    console.log('✅ Non-Streaming Response:');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('📄 Response Body:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Non-Streaming Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });
  }
}

async function testStreamingChatCompletion() {
  console.log('\n🌊 Testing Streaming Chat Completion...');
  console.log(`📍 URL: ${baseURL}/chat/completions?api-version=${API_VERSION}`);
  
  try {
    const response = await axios.post(
      `${baseURL}/chat/completions?api-version=${API_VERSION}`,
      {
        model: MODEL_NAME, // Use the actual model name here
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Count from 1 to 10 slowly, one number per sentence.' }
        ],
        max_tokens: 200,
        temperature: 0.1,
        stream: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        },
        responseType: 'stream'
      }
    );

    console.log('✅ Streaming Response Started:');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\n📡 Streaming Data:');
    
    let chunkCount = 0;
    response.data.on('data', (chunk) => {
      chunkCount++;
      const chunkStr = chunk.toString();
      console.log(`\n--- Chunk ${chunkCount} ---`);
      console.log('Raw:', JSON.stringify(chunkStr));
      
      // Parse server-sent events
      const lines = chunkStr.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data.trim() === '[DONE]') {
            console.log('🏁 Stream completed: [DONE]');
          } else {
            try {
              const parsed = JSON.parse(data);
              console.log('📦 Parsed:', JSON.stringify(parsed, null, 2));
            } catch (e) {
              console.log('⚠️  Could not parse:', data);
            }
          }
        } else if (line.trim()) {
          console.log('📝 Other line:', line);
        }
      }
    });

    response.data.on('end', () => {
      console.log('\n✅ Streaming completed');
    });

    response.data.on('error', (error) => {
      console.error('❌ Streaming error:', error);
    });
    
  } catch (error) {
    console.error('❌ Streaming Setup Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });
  }
}

async function testLegacyCompletion() {
  console.log('\n📜 Testing Legacy Completion...');
  console.log(`📍 URL: ${baseURL}/completions?api-version=${API_VERSION}`);
  
  try {
    const response = await axios.post(
      `${baseURL}/completions?api-version=${API_VERSION}`,
      {
        model: MODEL_NAME, // Use the actual model name here
        prompt: 'Once upon a time',
        max_tokens: 50,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    console.log('✅ Legacy Completion Response:');
    console.log('📊 Status:', response.status);
    console.log('📄 Response Body:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Legacy Completion Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

async function main() {
  console.log('🚀 Azure OpenAI Format Investigation');
  console.log('=====================================');
  console.log(`🔗 Endpoint: ${AZURE_ENDPOINT}`);
  console.log(`🎯 Deployment: ${DEPLOYMENT}`);
  console.log(`🤖 Model Name: ${MODEL_NAME}`);
  console.log(`📅 API Version: ${API_VERSION}`);
  console.log(`🔑 API Key: ${API_KEY ? '[SET]' : '[NOT SET]'}`);

async function testImageVision() {
  console.log('\n🖼️ Testing Image Vision (Vision API)...');
  console.log(`📍 URL: ${baseURL}/chat/completions?api-version=${API_VERSION}`);
  
  // Using a simple base64 encoded 1x1 red pixel PNG for testing
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  try {
    const response = await axios.post(
      `${baseURL}/chat/completions?api-version=${API_VERSION}`,
      {
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What do you see in this image?'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${testImageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    console.log('✅ Image Vision Response:');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('📄 Response Body:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Image Vision Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

async function testImageVisionStreaming() {
  console.log('\n🌊🖼️ Testing Streaming Image Vision...');
  console.log(`📍 URL: ${baseURL}/chat/completions?api-version=${API_VERSION}`);
  
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  try {
    const response = await axios.post(
      `${baseURL}/chat/completions?api-version=${API_VERSION}`,
      {
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in detail.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${testImageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
        stream: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        },
        responseType: 'stream'
      }
    );

    console.log('✅ Streaming Image Vision Response Started:');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\n📡 Streaming Image Data:\n');

    let chunkCount = 0;
    let buffer = '';

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          chunkCount++;
          
          console.log(`--- Image Vision Chunk ${chunkCount} ---`);
          console.log('Raw:', JSON.stringify(line));
          
          if (data === '[DONE]') {
            console.log('🏁 Image Stream completed: [DONE]');
          } else {
            try {
              const parsed = JSON.parse(data);
              console.log('📦 Parsed:', JSON.stringify(parsed, null, 2));
            } catch (e) {
              console.log('⚠️ Could not parse JSON:', data);
            }
          }
          console.log('');
        }
      }
      
      buffer = lines[lines.length - 1];
    });

    response.data.on('end', () => {
      console.log('✅ Image Vision Streaming completed');
    });

    // Wait for stream to complete
    await new Promise((resolve) => {
      response.data.on('end', resolve);
    });
    
  } catch (error) {
    console.log('❌ Streaming Image Vision Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

  try {
    await testNonStreamingChatCompletion();
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testStreamingChatCompletion();
    
    // Wait for streaming to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    await testImageVision();
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testImageVisionStreaming();
    
    // Wait for streaming to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await testLegacyCompletion();
    
  } catch (error) {
    console.error('💥 Main execution error:', error);
  }
  
  console.log('\n🎉 Investigation completed!');
}

if (require.main === module) {
  main();
}
