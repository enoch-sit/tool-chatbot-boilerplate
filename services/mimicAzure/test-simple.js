const https = require('https');

// Disable SSL verification for testing with self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const data = JSON.stringify({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "user",
      content: "Say hello just once"
    }
  ],
  stream: true
});

const options = {
  hostname: 'localhost',
  port: 5556,
  path: '/openai/deployments/test/chat/completions?api-version=2024-02-15-preview',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'api-key': 'test-key-123'
  }
};

console.log('🚀 Testing proxy with simple request...');
console.log('📦 Request:', data);

const req = https.request(options, (res) => {
  console.log('📊 Status:', res.statusCode);
  console.log('📋 Headers:', res.headers);
  
  let responseCount = 0;
  const maxResponses = 20; // Limit to prevent infinite logging
  
  res.on('data', (chunk) => {
    responseCount++;
    if (responseCount <= maxResponses) {
      console.log(`📥 Response ${responseCount}:`, chunk.toString());
    } else if (responseCount === maxResponses + 1) {
      console.log('⚠️ Too many responses, stopping logging...');
    }
  });
  
  res.on('end', () => {
    console.log(`✅ Response ended after ${responseCount} chunks`);
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.write(data);
req.end();

// Auto-exit after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout, exiting...');
  process.exit(0);
}, 10000);
