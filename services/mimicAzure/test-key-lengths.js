const https = require('https');

console.log('🔐 Testing different API key lengths and formats...\n');

const testKeys = [
  // 32-bit keys (8 hex characters = 32 bits)
  { name: '32-bit hex', key: 'a1b2c3d4', bits: 32 },
  { name: '32-bit hex uppercase', key: 'A1B2C3D4', bits: 32 },
  
  // Other common lengths
  { name: '64-bit key', key: 'a1b2c3d4e5f6g7h8', bits: 64 },
  { name: '128-bit key', key: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', bits: 128 },
  { name: '256-bit key', key: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6', bits: 256 },
  
  // Azure-like format
  { name: 'Azure-style', key: 'sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', bits: 256 },
  
  // Default mock keys
  { name: 'Default mock key', key: 'test-key-123', bits: 'N/A' },
  
  // Very short
  { name: 'Very short', key: '1234', bits: 16 },
  
  // Very long  
  { name: 'Very long', key: 'this-is-a-very-long-api-key-that-has-many-characters-in-it-to-test-length-limits', bits: 'N/A' }
];

const runTest = (testData) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      messages: [{ role: 'user', content: 'Test message for key length' }]
    });

    const options = {
      hostname: 'localhost',
      port: 5556,
      path: '/openai/deployments/gpt-35-turbo/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'api-key': testData.key
      },
      rejectUnauthorized: false
    };

    console.log(`🧪 Testing: ${testData.name}`);
    console.log(`   Key: "${testData.key}" (${testData.key.length} chars, ${testData.bits} bits)`);

    const req = https.request(options, (res) => {
      console.log(`   Status: ${res.statusCode} ${res.statusCode === 200 ? '✅ WORKS' : '❌ FAILED'}`);
      
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
            console.log(`   Raw error: ${data.substring(0, 50)}...`);
          }
        } else {
          console.log(`   ✅ Success! Server accepted the key`);
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`   ❌ Connection Error: ${e.message}`);
      console.log('   (Make sure HTTPS server is running on port 5556)');
      console.log('');
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log(`   ❌ Timeout after 5 seconds`);
      req.destroy();
      console.log('');
      resolve();
    });

    req.write(postData);
    req.end();
  });
};

async function runAllTests() {
  console.log('🚀 Starting API key length tests...\n');
  
  for (const testData of testKeys) {
    await runTest(testData);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('📋 Summary:');
  console.log('   ✅ 32-bit keys: SHOULD WORK');
  console.log('   ✅ Any length: SHOULD WORK (no validation by default)');
  console.log('   ✅ Any format: SHOULD WORK (string comparison only)');
  console.log('');
  console.log('💡 Note: If validation is enabled (REQUIRE_API_KEY=true),');
  console.log('   only keys in the validApiKeys array will work,');
  console.log('   regardless of length or format.');
}

runAllTests();
