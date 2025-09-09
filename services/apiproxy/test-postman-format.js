/**
 * Simple test that exactly matches your working Postman format
 */

const axios = require('axios');
require('dotenv').config();

// Test configuration
const CUSTOM_API_URL = process.env.CUSTOM_API_URL;
const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;
const PROXY_URL = `http://localhost:${process.env.PORT || 7000}`;

// Exact payload that works in Postman
const postmanPayload = {
    "model": "gpt-4o-mini",
    "messages": [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are an AI assistant that helps people find information."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hello"
                }
            ]
        }
    ],
    "stream": true
};

async function testPostmanFormat() {
    console.log('🧪 Testing Exact Postman Format');
    console.log('================================');
    console.log(`URL: ${CUSTOM_API_URL}`);
    console.log(`Key: ***${CUSTOM_API_KEY ? CUSTOM_API_KEY.slice(-4) : 'Missing'}`);
    console.log('Payload:', JSON.stringify(postmanPayload, null, 2));
    
    try {
        const response = await axios.post(CUSTOM_API_URL, postmanPayload, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': CUSTOM_API_KEY
            },
            responseType: 'stream',
            timeout: 30000
        });

        console.log('\n✅ Connection successful!');
        console.log(`Status: ${response.status}`);
        console.log('Headers:', response.headers);
        
        let chunks = [];
        let messageContent = '';

        response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            chunks.push(chunkStr);
            console.log(`\n📦 Chunk ${chunks.length}:`);
            console.log(chunkStr);
            
            // Parse streaming data
            const lines = chunkStr.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices?.[0]?.delta?.content) {
                            messageContent += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // Not JSON, skip
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n🎉 Stream completed!');
            console.log(`Total chunks: ${chunks.length}`);
            console.log(`Complete message: "${messageContent}"`);
        });

        response.data.on('error', (error) => {
            console.error('❌ Stream error:', error);
        });

        // Wait for completion
        return new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

    } catch (error) {
        console.error('\n❌ Error occurred:');
        console.error('Status:', error.response?.status);
        console.error('StatusText:', error.response?.statusText);
        console.error('Headers:', error.response?.headers);
        
        if (error.response?.data) {
            let errorData = '';
            error.response.data.on('data', (chunk) => {
                errorData += chunk.toString();
            });
            error.response.data.on('end', () => {
                console.error('Error Data:', errorData);
            });
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

async function testProxyFormat() {
    console.log('\n\n🔄 Testing Through Proxy');
    console.log('========================');
    console.log(`URL: ${PROXY_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`);
    
    try {
        const response = await axios.post(
            `${PROXY_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`,
            postmanPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': CUSTOM_API_KEY,
                    'api-version': '2024-12-01-preview'
                },
                responseType: 'stream',
                timeout: 30000
            }
        );

        console.log('\n✅ Proxy connection successful!');
        console.log(`Status: ${response.status}`);
        
        let chunks = [];
        let messageContent = '';

        response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            chunks.push(chunkStr);
            console.log(`\n📦 Proxy Chunk ${chunks.length}:`);
            console.log(chunkStr);
            
            // Parse streaming data
            const lines = chunkStr.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices?.[0]?.delta?.content) {
                            messageContent += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // Not JSON, skip
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n🎉 Proxy stream completed!');
            console.log(`Total chunks: ${chunks.length}`);
            console.log(`Complete message: "${messageContent}"`);
        });

        response.data.on('error', (error) => {
            console.error('❌ Proxy stream error:', error);
        });

        // Wait for completion
        return new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

    } catch (error) {
        console.error('\n❌ Proxy Error occurred:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.message);
    }
}

async function runTest() {
    if (!CUSTOM_API_URL || !CUSTOM_API_KEY) {
        console.error('❌ Missing configuration:');
        console.error(`CUSTOM_API_URL: ${CUSTOM_API_URL ? '✅' : '❌'}`);
        console.error(`CUSTOM_API_KEY: ${CUSTOM_API_KEY ? '✅' : '❌'}`);
        return;
    }

    console.log('🚀 Starting Postman Format Test');
    console.log('================================');
    
    // Test direct API
    await testPostmanFormat();
    
    // Wait between tests
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test through proxy
    await testProxyFormat();
    
    console.log('\n🎉 All tests completed!');
}

// Run if executed directly
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = { testPostmanFormat, testProxyFormat, runTest };
