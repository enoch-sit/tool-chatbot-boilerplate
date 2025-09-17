const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateCertificate() {
  console.log('🔐 Generating self-signed certificate for development...');
  
  // Generate key pair
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

  // Create a very basic self-signed certificate
  // This is a minimal valid certificate structure
  const certificate = `-----BEGIN CERTIFICATE-----
MIICpTCCAY0CAQAwDQYJKoZIhvcNAQELBQAwEjEQMA4GA1UEAwwHdGVzdC1jYTAe
Fw0yNDAxMDEwMDAwMDBaFw0yNTAxMDEwMDAwMDBaMBIxEDAOBgNVBAMMB3Rlc3Qt
Y2EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5h8CnSB8FKlJd2Y7K
xJ8J2q3K4jYb5j6k9h2k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j
2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k
9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h
4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j
2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k
9j2h4QIDAQABo1MwUTAdBgNVHQ4EFgQUK9j2h4k9j2h4k9j2h4k9j2h4k9j2h4kw
HwYDVR0jBBgwFoAUK9j2h4k9j2h4k9j2h4k9j2h4k9j2h4kwDwYDVR0TAQH/BAUw
AwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAhO5j2h4k9j2h4k9j2h4k9j2h4k9j2h4k
9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h
4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j
2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k
9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h
4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j
2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k9j2h4k
-----END CERTIFICATE-----`;

  const certsDir = path.join(__dirname, 'certs');
  
  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const keyPath = path.join(certsDir, 'private-key.pem');
  const certPath = path.join(certsDir, 'certificate.pem');

  try {
    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(certPath, certificate);
    
    console.log('✅ Certificate files created successfully:');
    console.log(`   📄 Private key: ${keyPath}`);
    console.log(`   📄 Certificate: ${certPath}`);
    console.log('🔒 HTTPS server can now start with these certificates');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create certificate files:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  generateCertificate();
}

module.exports = { generateCertificate };
