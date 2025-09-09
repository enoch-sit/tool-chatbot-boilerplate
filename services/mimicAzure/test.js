const http = require('http');

const postData = JSON.stringify({
  messages: [{ role: 'user', content: 'Say something' }]
});

const options = {
  hostname: 'localhost',
  port: 5555,
  path: '/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15&stream=true',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing mimicAzure service...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  console.log('Response:');
  
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  
  res.on('end', () => {
    console.log('\nTest completed!');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
