const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certsDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

console.log('🔧 Generating self-signed SSL certificates...');

try {
  // Try to use mkcert first (best option)
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    console.log('✅ Found mkcert, generating certificates...');
    
    execSync(`mkcert -key-file certs/server.key -cert-file certs/server.crt localhost 127.0.0.1`, { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    console.log('✅ Certificates generated with mkcert!');
    console.log('   These certificates will be trusted by your browser.');
  } catch (e) {
    // Fallback to OpenSSL
    console.log('⚠️  mkcert not found, trying OpenSSL...');
    
    // Generate private key
    execSync('openssl genrsa -out certs/server.key 2048', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    // Generate certificate
    execSync(`openssl req -new -x509 -key certs/server.key -out certs/server.crt -days 365 -subj "/C=US/ST=Dev/L=Development/O=MimicAzure/CN=localhost"`, { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    console.log('✅ Certificates generated with OpenSSL!');
    console.log('⚠️  Your browser will show security warnings for self-signed certificates.');
  }
  
  console.log('');
  console.log('📁 Certificate files created:');
  console.log('   🔑 certs/server.key (private key)');
  console.log('   📜 certs/server.crt (certificate)');
  console.log('');
  console.log('🚀 Ready to start HTTPS server!');
  console.log('   Run: npm run start:https');
  
} catch (error) {
  console.error('❌ Could not generate certificates automatically.');
  console.error('   Error:', error.message);
  console.log('');
  console.log('📋 Manual alternatives:');
  console.log('   1. Install mkcert: https://github.com/FiloSottile/mkcert');
  console.log('   2. Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html');
  console.log('   3. Use online certificate generator');
  console.log('');
  console.log('   Then place server.key and server.crt in the certs/ directory');
}
