/**
 * Simple test script for mimicAzure non-streaming proxy functionality
 * This script helps verify the proxy works before deploying to server
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
  testMessage: 'Hello, how are you doing today?'
};

// Test payload - Azure OpenAI format
const testPayload = {
  messages: [
    {
      role: 'user',
      content: CONFIG.testMessage
    }
  ],
  max_tokens: 150,
  temperature: 0.7,
  stream: false
};

console.log('🧪 Starting mimicAzure Non-Streaming Proxy Test');
console.log('=' .repeat(60));
console.log(`📍 HTTPS Target: https://${CONFIG.host}:${CONFIG.port}`);
console.log(`📍 HTTP Target: http://${CONFIG.host}:${CONFIG.httpPort}`);
console.log(`🔑 API Key: ${CONFIG.apiKey.substring(0, 20)}...`);
console.log(`💬 Test Message: "${CONFIG.testMessage}"`);
console.log('=' .repeat(60));

// Check if .env file exists and proxy is enabled
function checkProxyConfiguration() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  No .env file found. Creating sample configuration...');
    
    const sampleEnv = `# mimicAzure Configuration
USE_EDUHK_PROXY=true
EDUHK_API_KEY=your-actual-eduhk-api-key-here
REQUIRE_API_KEY=false
PORT=5556
`;
    
    fs.writeFileSync(envPath, sampleEnv);
    console.log('✅ Created .env file. Please update EDUHK_API_KEY with your actual key.');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const useProxy = envContent.includes('USE_EDUHK_PROXY=true');
  const hasApiKey = envContent.match(/EDUHK_API_KEY=(.+)/);
  
  console.log('📋 Environment Configuration:');
  console.log(`   USE_EDUHK_PROXY: ${useProxy ? '✅ true' : '❌ false'}`);
  console.log(`   EDUHK_API_KEY: ${hasApiKey ? '✅ configured' : '❌ not set'}`);
  
  if (!useProxy) {
    console.log('⚠️  Proxy mode is disabled. Set USE_EDUHK_PROXY=true in .env to test proxy functionality.');
    return false;
  }
  
  if (!hasApiKey || hasApiKey[1].includes('your-actual')) {
    console.log('⚠️  Please set a valid EDUHK_API_KEY in .env file.');
    return false;
  }
  
  return true;
}

// Test non-streaming proxy
function testNonStreamingProxy() {
  return new Promise((resolve, reject) => {
    console.log('\n🚀 Testing Non-Streaming Proxy...');
    console.log(`📡 Using: ${CONFIG.useHTTPS ? 'HTTPS' : 'HTTP'} on port ${CONFIG.port}`);
    
    const postData = JSON.stringify(testPayload);
    
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-15-preview',
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
    console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
    
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
        console.log('📥 Raw Response:', responseData);
        
        try {
          const jsonResponse = JSON.parse(responseData);
          console.log('\n✅ Parsed Response:');
          console.log(JSON.stringify(jsonResponse, null, 2));
          
          // Validate response structure
          if (jsonResponse.choices && jsonResponse.choices.length > 0) {
            const content = jsonResponse.choices[0].message?.content;
            if (content) {
              console.log('\n🎉 SUCCESS! Received valid response from EdUHK API:');
              console.log(`💬 Content: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
              console.log(`📊 Tokens - Prompt: ${jsonResponse.usage?.prompt_tokens || 'N/A'}, Completion: ${jsonResponse.usage?.completion_tokens || 'N/A'}`);
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
          console.log('📦 Raw response data:', responseData);
          reject({ error: 'JSON parsing failed', rawData: responseData, parseError, duration });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject({ error: 'Request failed', details: error });
    });
    
    req.on('timeout', () => {
      console.error('❌ Request timeout');
      req.destroy();
      reject({ error: 'Request timeout' });
    });
    
    req.setTimeout(30000); // 30 second timeout
    req.write(postData);
    req.end();
  });
}

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

// Main test function
async function runTests() {
  try {
    console.log('📋 Step 1: Checking proxy configuration...');
    const configValid = checkProxyConfiguration();
    
    if (!configValid) {
      console.log('\n❌ Configuration check failed. Please fix the configuration and try again.');
      process.exit(1);
    }
    
    console.log('\n📋 Step 2: Testing server availability...');
    await testServerAvailability();
    
    console.log('\n📋 Step 3: Testing non-streaming proxy...');
    const result = await testNonStreamingProxy();
    
    if (result.success) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Non-streaming proxy is working correctly');
      console.log('✅ EdUHK API integration is functional');
      console.log('✅ Response transformation is working');
    } else {
      console.log('\n⚠️  TESTS COMPLETED WITH WARNINGS');
      console.log('🔍 Review the response structure above');
    }
    
  } catch (error) {
    console.error('\n❌ TESTS FAILED');
    console.error('Error details:', error);
    
    if (error.error === 'Request failed') {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('1. Make sure the server is running: npm start');
      console.log('2. Check if port 5556 is available');
      console.log('3. Verify SSL certificates exist in certs/ folder');
      console.log('4. Run: npm run generate-certs if certificates are missing');
    }
    
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { testNonStreamingProxy, testServerAvailability, checkProxyConfiguration };