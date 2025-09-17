const https = require('https');

console.log('🧪 Testing EdUHK Proxy Mode...\n');

// Test data - simple text message
const testRequest = {
  messages: [
    {
      role: "system",
      content: "You are an AI assistant that helps people find information."
    },
    {
      role: "user", 
      content: "Hello, how are you today?"
    }
  ],
  model: "gpt-4o-mini",
  stream: true,
  temperature: 0.7
};

const postData = JSON.stringify(testRequest);

const options = {
  hostname: 'localhost',
  port: 5556,
  path: '/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-12-01',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'api-key': 'test-key-123'
  },
  rejectUnauthorized: false // For self-signed certificates
};

console.log('📡 Sending request to proxy server...');
console.log('🎯 URL: https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions');
console.log('📦 Request body:', JSON.stringify(testRequest, null, 2));
console.log('\n📥 Streaming response:');
console.log('='.repeat(80));

const req = https.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('\n🌊 Stream data:');
  
  let chunkCount = 0;
  res.on('data', (chunk) => {
    chunkCount++;
    const chunkStr = chunk.toString();
    console.log(`📦 Chunk ${chunkCount}:`, chunkStr);
  });
  
  res.on('end', () => {
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Test completed! Received ${chunkCount} chunks`);
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Make sure the proxy server is running:');
  console.log('   npm run dev:proxy');
});

req.setTimeout(30000, () => {
  console.error('❌ Request timed out after 30 seconds');
  req.destroy();
});

req.write(postData);
req.end();
