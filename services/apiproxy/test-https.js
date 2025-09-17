/**
 * Test HTTPS endpoint
 */

const axios = require('axios');
const https = require('https');
require('dotenv').config();

// Disable SSL verification for self-signed certificates in development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;
const HTTPS_PORT = process.env.HTTPS_PORT || 7443;
const HTTPS_URL = `https://localhost:${HTTPS_PORT}`;

const testPayload = {
    "model": "gpt-4o-mini",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hello HTTPS!"
                }
            ]
        }
    ],
    "stream": false
};

async function testHTTPS() {
    console.log('🔒 Testing HTTPS Endpoint');
    console.log('=========================');
    console.log(`URL: ${HTTPS_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`);
    
    try {
        // Test health endpoint first
        const healthResponse = await axios.get(`${HTTPS_URL}/health`, {
            httpsAgent,
            timeout: 10000
        });
        
        console.log('✅ HTTPS Health check successful!');
        console.log('Health:', healthResponse.data);
        
        // Test API endpoint
        const response = await axios.post(
            `${HTTPS_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`,
            testPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': CUSTOM_API_KEY,
                    'api-version': '2024-12-01-preview'
                },
                httpsAgent,
                timeout: 30000
            }
        );

        console.log('✅ HTTPS API call successful!');
        console.log(`Status: ${response.status}`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ HTTPS test failed:');
        if (error.code === 'ECONNREFUSED') {
            console.error('🔧 Server not running. Start with: npm run https');
        } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            console.error('🔧 Certificate issue. This is normal for self-signed certificates.');
            console.error('   The test uses rejectUnauthorized: false to bypass this.');
        } else {
            console.error('Status:', error.response?.status);
            console.error('Message:', error.message);
        }
    }
}

if (require.main === module) {
    testHTTPS().catch(console.error);
}

module.exports = { testHTTPS };
