const https = require('https');

// Data to send (equivalent to the -d flag in curl)
const postData = JSON.stringify({
  messages: [
    {
      role: "user", 
      content: "Hello!"
    }
  ]
});

// Options for the HTTPS request (equivalent to curl options)
const options = {
  hostname: 'localhost',
  port: 5556,
  path: '/openai/deployments/gpt-35-turbo/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    // 🔑 API Key options (choose one):
    // Option 1: No API key (current default - server accepts without key)
    // (no api-key header)
    
    // Option 2: Use a mock API key (uncomment one of these):
    'api-key': 'test-key-123'  // ✅ Valid mock key
    // 'api-key': 'dev-key-456'   // ✅ Valid mock key  
    // 'api-key': 'demo-key-789'  // ✅ Valid mock key
    // 'api-key': 'invalid-key'   // ❌ Invalid key (works unless REQUIRE_API_KEY=true)
    
    // Option 3: Real Azure format (also works as mock):
    // 'api-key': 'sk-1234567890abcdef1234567890abcdef'
  },
  // This is equivalent to curl's -k flag (ignore SSL certificate errors)
  rejectUnauthorized: false
};

console.log('🧪 Testing HTTPS server with JavaScript...');
console.log('📡 Sending POST request to: https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions');
console.log('📝 Request body:', postData);
console.log('');

// Make the HTTPS request
const req = https.request(options, (res) => {
  console.log('✅ Response received!');
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');
  console.log('📄 Response Body:');
  console.log('================================================================================');
  
  let responseData = '';
  
  // Collect response data
  res.on('data', (chunk) => {
    responseData += chunk;
    process.stdout.write(chunk);
  });
  
  // Handle end of response
  res.on('end', () => {
    console.log('');
    console.log('================================================================================');
    console.log('✅ Test completed successfully!');
    
    // Try to parse as JSON if it looks like JSON
    if (responseData.trim().startsWith('{')) {
      try {
        const jsonResponse = JSON.parse(responseData);
        console.log('📋 Parsed JSON Response:');
        console.log(JSON.stringify(jsonResponse, null, 2));
      } catch (e) {
        console.log('⚠️  Response is not valid JSON');
      }
    }
  });
});

// Handle request errors
req.on('error', (error) => {
  console.error('❌ Request failed:');
  console.error(`   Error: ${error.message}`);
  console.error('');
  console.error('💡 Possible solutions:');
  console.error('   1. Make sure the HTTPS server is running on port 5556');
  console.error('   2. Check if certificates are properly configured');
  console.error('   3. Verify the server is accepting connections');
});

// Handle timeout
req.setTimeout(10000, () => {
  console.error('❌ Request timed out after 10 seconds');
  req.destroy();
});

// Send the request with the data
req.write(postData);
req.end();

console.log('⏳ Waiting for response...');
