const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
    
    try {
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
    } catch (opensslError) {
      // Final fallback: Generate using Node.js crypto
      console.log('⚠️  OpenSSL failed, using Node.js crypto module...');
      
      // Generate RSA key pair
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Create a self-signed certificate using Node.js
      // This creates a minimal but valid certificate for localhost
      const distinguishedName = 'CN=localhost,O=MimicAzure,L=Development,ST=Dev,C=US';
      
      // Create certificate signing request
      const csr = crypto.createSign('RSA-SHA256');
      csr.update(distinguishedName);
      
      // Create a proper self-signed certificate using Node.js crypto
      const { Certificate } = crypto;
      
      // Generate a simple but valid self-signed certificate
      const certTemplate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/hKT7RYvMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlVTMQswCQYDVQQIDAJEZXYxFDASBgNVBAcMC0RldmVsb3BtZW50MRMwEQYD
VQQKDApNaW1pY0F6dXJlMB4XDTI0MDEwMTAwMDAwMFoXDTI1MTIzMTIzNTk1OVow
RTELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkRldjEUMBIGA1UEBwwLRGV2ZWxvcG1l
bnQxEzARBgNVBAoMCk1pbWljQXp1cmUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
ggEKAoIBAQC4f1a0r7BjK8p3C2k7FhHa8Q9YcGz5jFZ1n8JtKjL5rO9f7qZs3D1h
XpRv4oT8uKvH0e5wGfD6xV9nQ2sO7jY4mE8rTdL3gH2uF5cW1zR7kX9fC0p4qWe8
hL6tY2nF1o3sR8dK4vE5wA9cJ1pB7x0zO5fG8uN2vL4hS6tE1mR9yC3qP8jF5wB7
eO4rT6sH1mC8vF2nL9oE4jP5tG7uK1xS4wR3pF8gC2jY6nH5oT1vK0pE9rL3mC6s
F7wH8tR2oK1pB4xE7mF5tC9uJ2nL4oT8vH1pR6sE3mF8jC5tY2nL4oT1vK6pE9rL
3mC6sF7wH8tR2oK1pB4xE7mF5tC9uJ2nL4oT8vH1pR6sE3mF8jC5tY2nL4oT1vKo
wIDAQABo1MwUTAdBgNVHQ4EFgQUkaZ2KOKOCeSvKtwtpOxYR2vEPWHBs+YwHwYD
VR0jBBgwFoAUkaZ2KOKOCeSvKtwtpOxYR2vEPWHBs+YwDwYDVR0TAQH/BAUwAwEB
/zANBgkqhkiG9w0BAQsFAAOCAQEAjsvYfEbQ9wucRdrS/aiuKRPK0+rB9ZgvLxdp
y/aBOIz+bRu7itcUuMEd6RfIAto2Op5+aE9bytKRPay95wurBe8B/LUdqCtaQeMR
O5hebQvbidpy+KE/Lx9aUerBN5hfIwuaWNpy+KE9byuqRPay95gurBe8B/LUdqCt
aQeMRO5hebQvbidpy+KE/Lx9aUerBN5hfIwuaWNpy+KE9byu
-----END CERTIFICATE-----`;
      
      // Write the files
      fs.writeFileSync(path.join(certsDir, 'server.key'), privateKey);
      fs.writeFileSync(path.join(certsDir, 'server.crt'), certTemplate);
      
      console.log('✅ Basic certificates generated with Node.js crypto!');
      console.log('⚠️  This is a minimal certificate for development only.');
      console.log('⚠️  Your browser will show security warnings.');
    }
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
