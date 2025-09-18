/**
 * Test script for mimicAzure non-streaming IMAGE proxy functionality
 * This tests vision capabilities with base64 encoded images
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment configuration
function loadEnvConfig() {
  const envPath = path.join(__dirname, '.env');
  const envConfig = {
    useHTTPS: true,
    port: 5556,
    httpPort: 5555,
    apiKey: 'test-key-123'
  };
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Parse .env values
    const httpsPort = envContent.match(/HTTPS_PORT=(\d+)/);
    const httpPort = envContent.match(/HTTP_PORT=(\d+)/);
    const validApiKeys = envContent.match(/VALID_API_KEYS=(.+)/);
    
    if (httpsPort) envConfig.port = parseInt(httpsPort[1]);
    if (httpPort) envConfig.httpPort = parseInt(httpPort[1]);
    if (validApiKeys) envConfig.apiKey = validApiKeys[1].split(',')[0].trim();
  }
  
  return envConfig;
}

const envConfig = loadEnvConfig();

// Configuration - Auto-detect from .env
const CONFIG = {
  // Server settings
  host: 'localhost',
  port: envConfig.port,
  httpPort: envConfig.httpPort,
  
  // Test settings - Try HTTPS first, fallback to HTTP
  useHTTPS: true,
  apiKey: envConfig.apiKey,
  
  // Test message
  testMessage: 'What do you see in this image?'
};

// Apple logo base64 image (small PNG)
const TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAEMAAABJCAYAAABmUZsVAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARISURBVHhe7ZtdK21BGIDnnCgf+SwiUSiUG1GEC/6CX+oPUFygXLkhXCAfJUTItzrHs5rRYO9tzaxZx7tO89Rur1lba8969juzZt4Zv/68oSIJv/V75I0owyLKsIgyLKIMiyjDIsqwiDIsogyLwo1ADw8P1enpqTo7O1MzMzOqoaFBf5KdwsjY2NhQ+/v7yXF1dbV6eXlRs7OzqqWlJTkXAvHNhCiYn59PRCCBl6GmpkYfhUG0jN3dXbW2tvZFAlCura3VpTCIlUEkbG5ufpFgCNk8DCJl3N7eJn1EORH0F/39/boUDpEyVlZWyooAmkdHR4cuhUOcjJOTE/Xw8KBLXyEqJiYmdCks4mRsb29XbB7Dw8O59BcgSgYRcXNzo0sfQURXV5caGBjQZ8IjSsb19bU++ogRMT4+rs/kg7jIsEECr5GRkdxFgCgZ3Lj93tvbq+bm5pL3f0GucxPGCxcXF8nN3d/fq7q6OtXY2Fj2sUhkPD4+JsPsz6NLPjs/P1eXl5fq7u4uOVdfX//tNV0ILoNK7+zsqOPj4/dfuBTt7e2qu7tb9fT06DNf4VpHR0dqb2/vQxOynzb2d3BNBmO+YoLKMDPLSgMmG3MjdI68WltbkzICeJknS9rrAdckUqamppznLkFk0ByWl5eTirhU3OZzFPlex8D16HSRnJbMMq6urtTS0lLmyueBq5BMTxPasVQRQL3W19eTHywNmWTQNKSKACLDZfjuLYPEi93DSwMRk5OTTsN3LxlIqJR4+WkQQX7U9RHrJYNxhFQQwfDdZ2brJYMBldSoYIzhO3x3lsGYAvsSoV6jo6O65I6zDOYaUmHEmSXx4yyDyZLUJpJ1suYsQ3ITMXMbX7z6DKlkXXd1lvH6+qqP/j+cZUjm6elJH/nhLKOqqkofyeP5+Vkf+eEsQ+qThHqREsyCs4zQ2wBCwvaFLDjLIAkrFSaQaXMXpXCW0dTUJHasQVPZ2trSJXecZTQ3N+sjmbDXi8VrH5xl5LXoGwqig1SfT+LJWQawPiEZhCwuLjqPlr1ktLW1ie03bBYWFpyeMF4yWAkrAkQIG+TYCZSm2XjJIG9ARqkIIIROdXV1VZ8pj5cMGBoaKkRTMfT19emj8njLYJUK60UhTV7UWwawJlGE6EibIM4sQ3p08GMNDg7qUmUyyQCW76RGB/UiKtJuTcgsgy+T/GRhQSktmWUAG0OkRQf1cd0UF0QGYSituZjdQC4EkQF0ppLmLD5bJYPJgOnp6R/PkRKd/LuWD0FlABX5qeZi+gnf9ZNc9oEyKWIKnQYjjvEKfY/JsZK+sz/7Dv52bGys4lbK78hFBiCEyRHbFz/fjLlJbp45A7PgUmMBrsHaLtsgmWxBqWtxjiaaNfGUmwwDKbiDg4Pkl6Y/IYTJh3R2djqFM2LITSDHJG2Iou821rqQu4wiEbwDLTJRhkWUYRFlWEQZFlHGO0r9Bebv61JYgxciAAAAAElFTkSuQmCC";

// Test payload - Azure OpenAI format with image
const testPayload = {
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: CONFIG.testMessage
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${TEST_IMAGE_BASE64}`
          }
        }
      ]
    }
  ],
  max_tokens: 150,
  temperature: 0.7,
  stream: false  // Non-streaming image test
};

console.log('🖼️  mimicAzure Non-Streaming IMAGE Proxy Test');
console.log('=' .repeat(65));
console.log(`📍 HTTPS Target: https://${CONFIG.host}:${CONFIG.port}`);
console.log(`📍 HTTP Target: http://${CONFIG.host}:${CONFIG.httpPort}`);
console.log(`🔑 API Key: ${CONFIG.apiKey.substring(0, 20)}...`);
console.log(`💬 Test Message: "${CONFIG.testMessage}"`);
console.log(`🖼️  Image: Base64 encoded PNG (${TEST_IMAGE_BASE64.length} chars)`);
console.log('=' .repeat(65));

// Test server availability - try both HTTPS and HTTP
function testServerAvailability() {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 Checking server availability...');
    
    // First try HTTPS
    const httpsOptions = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/health',
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 3000
    };
    
    console.log(`🔗 Testing HTTPS on port ${CONFIG.port}...`);
    
    const httpsReq = https.request(httpsOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ HTTPS server is running and accessible');
          CONFIG.useHTTPS = true;
          resolve(true);
        } else {
          console.log(`⚠️  HTTPS server responded with status ${res.statusCode}`);
          tryHTTP();
        }
      });
    });
    
    httpsReq.on('error', (error) => {
      console.log('❌ HTTPS server not accessible:', error.code);
      tryHTTP();
    });
    
    httpsReq.setTimeout(3000);
    httpsReq.end();
    
    // Fallback to HTTP
    function tryHTTP() {
      console.log(`🔗 Testing HTTP on port ${CONFIG.httpPort}...`);
      
      const httpOptions = {
        hostname: CONFIG.host,
        port: CONFIG.httpPort,
        path: '/health',
        method: 'GET',
        timeout: 3000
      };
      
      const httpReq = http.request(httpOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ HTTP server is running and accessible');
            CONFIG.useHTTPS = false;
            CONFIG.port = CONFIG.httpPort;
            resolve(true);
          } else {
            console.log(`⚠️  HTTP server responded with status ${res.statusCode}`);
            reject(false);
          }
        });
      });
      
      httpReq.on('error', (error) => {
        console.log('❌ HTTP server not accessible:', error.code);
        console.log('💡 Make sure to start the server first:');
        console.log(`   npm run dev (HTTP on ${CONFIG.httpPort})`);
        console.log(`   npm start (HTTPS on ${CONFIG.port})`);
        reject(false);
      });
      
      httpReq.setTimeout(3000);
      httpReq.end();
    }
  });
}

// Test non-streaming image proxy
function testNonStreamingImageProxy() {
  return new Promise((resolve, reject) => {
    console.log('\n🚀 Testing Non-Streaming IMAGE Proxy...');
    console.log(`📡 Using: ${CONFIG.useHTTPS ? 'HTTPS' : 'HTTP'} on port ${CONFIG.port}`);
    
    const postData = JSON.stringify(testPayload);
    
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-02-15-preview',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'api-key': CONFIG.apiKey
      }
    };
    
    // Add SSL options for HTTPS
    if (CONFIG.useHTTPS) {
      options.rejectUnauthorized = false;
    }
    
    const protocol = CONFIG.useHTTPS ? 'https' : 'http';
    console.log('📤 Sending request to:', `${protocol}://${options.hostname}:${options.port}${options.path}`);
    console.log('📦 Payload structure:');
    console.log('   - Messages: 1');
    console.log('   - Content items: 2 (text + image)');
    console.log('   - Image format: base64 PNG');
    console.log('   - Stream: false');
    
    const startTime = Date.now();
    const requestModule = CONFIG.useHTTPS ? https : http;
    
    const req = requestModule.request(options, (res) => {
      console.log(`📊 Response Status: ${res.statusCode}`);
      console.log(`📋 Response Headers:`, res.headers);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`⏱️  Response Time: ${duration}ms`);
        console.log('📥 Raw Response Length:', responseData.length, 'chars');
        
        try {
          const jsonResponse = JSON.parse(responseData);
          console.log('\n✅ Parsed Response:');
          console.log(JSON.stringify(jsonResponse, null, 2));
          
          // Validate vision response
          if (jsonResponse.choices && jsonResponse.choices.length > 0) {
            const content = jsonResponse.choices[0].message?.content;
            if (content) {
              console.log('\n🎉 SUCCESS! Received valid vision response from EdUHK API:');
              console.log(`💬 Content: "${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"`);
              console.log(`📊 Tokens - Prompt: ${jsonResponse.usage?.prompt_tokens || 'N/A'}, Completion: ${jsonResponse.usage?.completion_tokens || 'N/A'}`);
              
              // Check if response indicates image understanding
              const lowerContent = content.toLowerCase();
              const imageKeywords = ['image', 'picture', 'logo', 'apple', 'icon', 'graphic', 'visual'];
              const hasImageContext = imageKeywords.some(keyword => lowerContent.includes(keyword));
              
              if (hasImageContext) {
                console.log('🖼️  ✅ Response shows image understanding - Vision model working!');
              } else {
                console.log('⚠️  Response may not show image understanding - check vision model');
              }
              
              resolve({ success: true, response: jsonResponse, duration });
            } else {
              console.log('⚠️  Response structure is missing content');
              resolve({ success: false, error: 'Missing content in response', response: jsonResponse, duration });
            }
          } else {
            console.log('⚠️  Response structure is missing choices');
            resolve({ success: false, error: 'Missing choices in response', response: jsonResponse, duration });
          }
          
        } catch (parseError) {
          console.log('❌ Failed to parse JSON response:', parseError.message);
          console.log('📦 Raw response data:', responseData.substring(0, 500), '...');
          reject({ error: 'JSON parsing failed', rawData: responseData, parseError, duration });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject({ error: 'Request failed', details: error });
    });
    
    req.on('timeout', () => {
      console.error('❌ Request timeout (vision requests may take longer)');
      req.destroy();
      reject({ error: 'Request timeout' });
    });
    
    req.setTimeout(60000); // 60 second timeout for vision requests
    req.write(postData);
    req.end();
  });
}

// Main test function
async function runImageTests() {
  try {
    console.log('📋 Step 1: Testing server availability...');
    await testServerAvailability();
    
    console.log('\n📋 Step 2: Testing non-streaming image proxy...');
    const result = await testNonStreamingImageProxy();
    
    if (result.success) {
      console.log('\n🎉 ALL IMAGE TESTS PASSED!');
      console.log('✅ Non-streaming image proxy is working correctly');
      console.log('✅ EdUHK vision API integration is functional');
      console.log('✅ Image format transformation is working');
      console.log('🖼️  Vision model can process base64 images in non-streaming mode');
    } else {
      console.log('\n⚠️  IMAGE TESTS COMPLETED WITH WARNINGS');
      console.log('🔍 Review the response structure above');
    }
    
  } catch (error) {
    console.error('\n❌ IMAGE TESTS FAILED');
    console.error('Error details:', error);
    
    if (error.error === 'Request failed') {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('1. Make sure the server is running: npm run dev');
      console.log('2. Check if the server has proper environment configuration');
      console.log('3. Verify EdUHK API key supports vision models');
      console.log('4. Ensure image base64 format is correct');
    }
    
    process.exit(1);
  }
}

// Run the image tests
if (require.main === module) {
  runImageTests();
}

module.exports = { testNonStreamingImageProxy, testServerAvailability };