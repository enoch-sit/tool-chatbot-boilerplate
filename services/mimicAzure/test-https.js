const https = require('https');
const fs = require('fs');

const postData = JSON.stringify({
  messages: [{ role: 'user', content: 'Say something' }]
});

const options = {
  hostname: 'localhost',
  port: 5556,
  path: '/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15&stream=true',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  // For self-signed certificates, we need to disable cert verification in dev
  rejectUnauthorized: false
};

console.log('Testing mimicAzure HTTPS service...');
console.log('URL: https://localhost:5556');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  console.log('Response:');
  
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  
  res.on('end', () => {
    console.log('\n🔒 HTTPS Test completed!');
  });
});

req.on('error', (e) => {
  console.error(`❌ Problem with HTTPS request: ${e.message}`);
  console.log('Make sure the HTTPS server is running on port 5556');
});

req.write(postData);
req.end();
