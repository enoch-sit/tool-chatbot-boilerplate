/**
 * Quick proxy test - just test the proxy endpoint
 */

const axios = require('axios');
require('dotenv').config();

const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;
const PROXY_URL = `http://localhost:${process.env.PORT || 7000}`;

const testPayload = {
    "model": "gpt-4o-mini",
    "messages": [
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

async function quickProxyTest() {
    console.log('🔄 Quick Proxy Test');
    console.log('===================');
    console.log(`URL: ${PROXY_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`);
    
    try {
        const response = await axios.post(
            `${PROXY_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`,
            testPayload,
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

        console.log('✅ Proxy connection successful!');
        console.log(`Status: ${response.status}`);
        
        let chunks = [];
        let messageContent = '';

        response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            chunks.push(chunkStr);
            console.log(`\n📦 Chunk ${chunks.length}: ${chunkStr.slice(0, 100)}...`);
            
            // Extract content
            const lines = chunkStr.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices?.[0]?.delta?.content) {
                            messageContent += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n🎉 Proxy test completed!');
            console.log(`Total chunks: ${chunks.length}`);
            console.log(`Complete message: "${messageContent}"`);
        });

        response.data.on('error', (error) => {
            console.error('❌ Stream error:', error);
        });

        return new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

    } catch (error) {
        console.error('\n❌ Proxy test failed:');
        console.error('Status:', error.response?.status);
        console.error('Message:', error.message);
        
        if (error.response?.data) {
            let errorData = '';
            error.response.data.on('data', (chunk) => {
                errorData += chunk.toString();
            });
            error.response.data.on('end', () => {
                console.error('Error details:', errorData);
            });
        }
    }
}

if (require.main === module) {
    quickProxyTest().catch(console.error);
}

module.exports = { quickProxyTest };
