const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certDir = path.join(__dirname, 'certs');
const keyPath = path.join(certDir, 'private-key.pem');
const certPath = path.join(certDir, 'certificate.pem');

console.log('🔒 Generating HTTPS certificates for development...');

// Create certs directory
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
    console.log('📁 Created certs directory');
}

try {
    // Check if OpenSSL is available
    execSync('openssl version', { stdio: 'ignore' });
    
    console.log('✅ OpenSSL found, generating certificates...');
    
    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`);
    console.log('🔑 Private key generated');
    
    // Generate certificate
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=Development/L=Development/O=Development/OU=Development/CN=localhost"`);
    console.log('📜 Certificate generated');
    
    console.log('🎉 HTTPS certificates created successfully!');
    console.log(`Key: ${keyPath}`);
    console.log(`Cert: ${certPath}`);
    console.log('');
    console.log('🚀 You can now run: npm run https');
    
} catch (error) {
    console.error('❌ OpenSSL not found or failed to generate certificates');
    console.log('');
    console.log('📋 Manual certificate generation options:');
    console.log('');
    console.log('🔧 Option 1: Install OpenSSL');
    console.log('   Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
    console.log('   Or use: choco install openssl (if you have Chocolatey)');
    console.log('');
    console.log('🔧 Option 2: Use mkcert (recommended)');
    console.log('   1. Install mkcert: https://github.com/FiloSottile/mkcert');
    console.log('   2. Run: mkcert -install');
    console.log('   3. Run: mkcert localhost 127.0.0.1');
    console.log('   4. Rename files to private-key.pem and certificate.pem');
    console.log('');
    console.log('🔧 Option 3: Use the HTTPS server anyway');
    console.log('   It will generate a basic certificate automatically');
}
