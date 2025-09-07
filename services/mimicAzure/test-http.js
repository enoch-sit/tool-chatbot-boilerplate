const http = require('http');

const postData = JSON.stringify({
  messages: [{ role: 'user', content: 'Say something' }]
});

const options = {
  hostname: 'localhost',
  port: 5557, // Different port to avoid conflicts
  path: '/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15&stream=true',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing mimicAzure HTTP service...');
console.log('URL: http://localhost:5557');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  console.log('Response:');
  
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  
  res.on('end', () => {
    console.log('\n🌐 HTTP Test completed!');
  });
});

req.on('error', (e) => {
  console.error(`❌ Problem with HTTP request: ${e.message}`);
  console.log('Make sure the HTTP server is running on port 5557');
});

req.write(postData);
req.end();
