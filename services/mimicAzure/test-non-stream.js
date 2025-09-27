// Test non-streaming endpoint
const https = require('http');

const testNonStreaming = () => {
  const postData = JSON.stringify({
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "max_tokens": 150,
    "temperature": 0.7,
    "stream": false
  });

  const options = {
    hostname: 'localhost',
    port: 5555,
    path: '/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🧪 Testing non-streaming endpoint...');
  console.log('📤 Request:', JSON.stringify(JSON.parse(postData), null, 2));
  
  const req = https.request(options, (res) => {
    let data = '';
    
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📥 Response:');
      try {
        const response = JSON.parse(data);
        console.log(JSON.stringify(response, null, 2));
        console.log('✅ Non-streaming endpoint works correctly!');
      } catch (e) {
        console.log('❌ Invalid JSON response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request failed: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

testNonStreaming();