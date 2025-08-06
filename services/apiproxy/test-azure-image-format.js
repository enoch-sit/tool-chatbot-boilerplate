/**
 * Test script specifically for Azure OpenAI Vision/Image API format investigation
 * This will help us understand how to handle image inputs and outputs
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

// Test images (base64 encoded)
const TEST_IMAGES = {
  // 1x1 red pixel PNG
  redPixel: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  
  // Simple 2x2 checkerboard pattern
  checkerboard: 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQIHWNgYGBgYGBgYGBgYGBgYAAABQABDQottAAAAABJRU5ErkJggg=='
};

async function testImageFormats() {
  console.log('🚀 Azure OpenAI Vision API Format Investigation');
  console.log('=============================================');
  console.log(`🔗 Endpoint: ${AZURE_ENDPOINT}`);
  console.log(`🎯 Deployment: ${DEPLOYMENT}`);
  console.log(`🤖 Model Name: ${MODEL_NAME}`);
  console.log(`📅 API Version: ${API_VERSION}`);
  console.log(`🔑 API Key: ${API_KEY ? '[SET]' : '[NOT SET]'}`);

  // Test 1: Single Image with Text
  await testSingleImageWithText();
  
  // Test 2: Multiple Images
  await testMultipleImages();
  
  // Test 3: Image with Different URL formats
  await testImageURLFormats();
  
  // Test 4: Image with Streaming
  await testImageStreaming();
  
  // Test 5: Image Detail Levels
  await testImageDetailLevels();
}

async function testSingleImageWithText() {
  console.log('\n🖼️ Test 1: Single Image with Text...');
  
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
                text: 'What color is this pixel? Describe what you see.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${TEST_IMAGES.redPixel}`
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    console.log('✅ Single Image Response:');
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Single Image Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testMultipleImages() {
  console.log('\n🖼️🖼️ Test 2: Multiple Images...');
  
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
                text: 'Compare these two images. What are the differences?'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${TEST_IMAGES.redPixel}`
                }
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${TEST_IMAGES.checkerboard}`
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    console.log('✅ Multiple Images Response:');
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Multiple Images Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testImageURLFormats() {
  console.log('\n🔗 Test 3: Different Image URL Formats...');
  
  const urlFormats = [
    {
      name: 'Data URL with PNG',
      url: `data:image/png;base64,${TEST_IMAGES.redPixel}`
    },
    {
      name: 'Data URL without MIME type',
      url: `data:;base64,${TEST_IMAGES.redPixel}`
    }
  ];
  
  for (const format of urlFormats) {
    console.log(`\n🔍 Testing: ${format.name}`);
    
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
                  text: 'Describe this image briefly.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: format.url
                  }
                }
              ]
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': API_KEY
          }
        }
      );

      console.log(`✅ ${format.name} - Success:`, response.data.choices[0].message.content);
      
    } catch (error) {
      console.log(`❌ ${format.name} - Error:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

async function testImageStreaming() {
  console.log('\n🌊🖼️ Test 4: Image with Streaming...');
  
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
                text: 'Analyze this image and provide a detailed description.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${TEST_IMAGES.checkerboard}`
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.5,
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

    console.log('✅ Image Streaming Started:');
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
            console.log('🏁 Image Stream completed: [DONE]');
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
    console.log('❌ Image Streaming Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testImageDetailLevels() {
  console.log('\n🔍 Test 5: Image Detail Levels...');
  
  const detailLevels = ['low', 'high', 'auto'];
  
  for (const detail of detailLevels) {
    console.log(`\n🔍 Testing detail level: ${detail}`);
    
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
                    url: `data:image/png;base64,${TEST_IMAGES.redPixel}`,
                    detail: detail
                  }
                }
              ]
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': API_KEY
          }
        }
      );

      console.log(`✅ Detail ${detail} - Success:`, response.data.choices[0].message.content);
      console.log(`📊 Tokens used:`, response.data.usage);
      
    } catch (error) {
      console.log(`❌ Detail ${detail} - Error:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

async function main() {
  try {
    await testImageFormats();
  } catch (error) {
    console.error('💥 Main execution error:', error);
  }
  
  console.log('\n🎉 Image format investigation completed!');
}

if (require.main === module) {
  main();
}

module.exports = {
  testImageFormats,
  testSingleImageWithText,
  testMultipleImages,
  testImageURLFormats,
  testImageStreaming,
  testImageDetailLevels
};
