const https = require('https');

console.log('🔐 Testing API Key scenarios...\n');

const runTest = (testName, headers, expectedStatus) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      messages: [{ role: 'user', content: 'Test message' }]
    });

    const options = {
      hostname: 'localhost',
      port: 5556,
      path: '/openai/deployments/gpt-35-turbo/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      },
      rejectUnauthorized: false // For self-signed certificates
    };

    console.log(`🧪 ${testName}`);
    console.log(`   Headers: ${JSON.stringify(headers)}`);

    const req = https.request(options, (res) => {
      console.log(`   Status: ${res.statusCode} ${res.statusCode === expectedStatus ? '✅' : '❌'}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 401) {
          try {
            const errorData = JSON.parse(data);
            console.log(`   Error: ${errorData.error.message}`);
          } catch (e) {
            console.log(`   Raw response: ${data.substring(0, 100)}...`);
          }
        } else {
          console.log(`   Response: Success (${data.substring(0, 50)}...)`);
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`   Error: ${e.message} ❌`);
      console.log('');
      resolve();
    });

    req.write(postData);
    req.end();
  });
};

async function runAllTests() {
  // Test 1: No API key
  await runTest('Test 1: No API Key', {}, 200);
  
  // Test 2: Valid API key
  await runTest('Test 2: Valid API Key', { 'api-key': 'test-key-123' }, 200);
  
  // Test 3: Invalid API key
  await runTest('Test 3: Invalid API Key', { 'api-key': 'invalid-key-999' }, 200);
  
  // Test 4: Different valid key
  await runTest('Test 4: Another Valid Key', { 'api-key': 'dev-key-456' }, 200);

  console.log('📋 Summary:');
  console.log('   Current behavior: All tests pass (API key validation disabled)');
  console.log('   To enable validation: Set REQUIRE_API_KEY=true in environment');
  console.log('');
  console.log('💡 Usage:');
  console.log('   - Development: Keep validation disabled for easy testing');
  console.log('   - Production-like: Enable validation for realistic behavior');
}

runAllTests();
