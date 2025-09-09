/**
 * Test case for streaming format with vision input
 * Tests both direct API call and through Azure proxy
 */

const axios = require('axios');
require('dotenv').config();

// Test configuration
const CUSTOM_API_URL = process.env.CUSTOM_API_URL;
const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;
const PROXY_URL = `http://localhost:${process.env.PORT || 7000}`;

// Test payload - Simple text only (matches your working Postman test)
const streamingPayload = {
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

// Test payload with vision (image) input
const streamingPayloadWithVision = {
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
                    "text": "Hello, What is this?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABJCAYAAABmUZsVAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARISURBVHhe7ZtdK61BGIDnnCgf+SwiUSiUG1GEC/6CX+oPUFygXLkhXCAfJUTItzrHs5rRYO9tzaxZx7tO89Rur1lba8969juzZt4Zv/68oSIJv/V75I0owyLKsIgyLKIMiyjDIsqwiDIsogyLwo1ADw8P1enpqTo7O1MzMzOqoaFBf5KdwsjY2NhQ+/v7yXF1dbV6eXlRs7OzqqWlJTkXAvHNhCiYn59PRCCBl6GmpkYfhUG0jN3dXbW2tvZFAlCura3VpTCIlUEkbG5ufpFgCNk8DCJl3N7eJn1EORH0F/39/boUDpEyVlZWyooAmkdHR4cuhUOcjJOTE/Xw8KBLXyEqJiYmdCks4mRsb29XbB7Dw8O59BcgSgYRcXNzo0sfQURXV5caGBjQZ8IjSsb19bU++ogRMT4+rs/kg7jIsEECr5GRkdxFgCgZ3Lj93tvbq+bm5pL3f0GucxPGCxcXF8nN3d/fq7q6OtXY2Fj2sUhkPD4+JsPsz6NLPjs/P1eXl5fq7u4uOVdfX//tNV0ILoNK7+zsqOPj4/dfuBTt7e2qu7tb9fT06DNf4VpHR0dqb2/vQxOynzb2d3BNBmO+YoLKMDPLSgMmG3MjdI68WltbkzICeJknS9rrAdckUqamppznLkFk0ByWl5eTirhU3OZzFPlex8D16HSRnJbMMq6urtTS0lLmyueBq5BMTxPasVQRQL3W19eTHywNmWTQNKSKACLDZfjuLYPEi93DSwMRk5OTTsN3LxlIqJR4+WkQQX7U9RHrJYNxhFQQwfDdZ2brJYMBldSoYIzhO3x3lsGYAvsSoV6jo6O65I6zDOYaUmHEmSXx4iyDyZLUJpJ1suYsQ3ITMXMbX7z6DKlkXXd1lvH6+qqP/j+cZUjm6elJH/nhLKOqqkofyeP5+Vkf+eEsQ+qThHqREsyCs4zQ2wBCwvaFLDjLIAkrFSaQaXMXpXCW0dTUJHasQVPZ2trSJXecZTQ3N+sjmbDXi8VrH5xl5LXoGwqig1SfT+LJWQawPiEZhCwuLjqPlr1ktLW1ie03bBYWFpyeMF4yWAkrAkQIG+TYCZSm2XjJIG9ARqkIIIROdXV1VZ8pj5cMGBoaKkRTMfT19emj8njLYJUK60UhTV7UWwawJlGE6EibIM4sQ3p08GMNDg7qUmUyyQCW76RGB/UiKtJuTcgsgy+T/GRhQSktmWUAG0OkRQf1cd0UF0QGYSituZjdQC4EkQF0ppLmLD5bJYPJgOnp6R/PkRKd/LuWD0FlABX5qeZi+gnf9ZNc9oEyKWIKnQYjjvEKfY/JsZK+sz/7Dv52bGys4lbK78hFBiCEyRHbFz/fjLlJbp45A7PgUmMBrsHaLtsgmWxBqWtxjiaaNfGUmwwDKbiDg4Pkl6Y/IYTJh3R2djqFM2LITSDHJG2Iou821rqQu4wiEbwDLTJRhkWUYRFlWEQZFlHGO0r9Bebv61JYgxciAAAAAElFTkSuQmCC"
                    }
                }
            ]
        }
    ],
    "stream": true
};

/**
 * Test 1: Direct API call with simple text (matches your working Postman test)
 */
async function testDirectStreamingAPI() {
    console.log('\n🧪 Testing Direct Streaming API Call (Simple Text - Postman Format)');
    console.log('====================================================================');
    console.log(`Endpoint: ${CUSTOM_API_URL}`);
    console.log(`API Key: ${CUSTOM_API_KEY ? '***' + CUSTOM_API_KEY.slice(-4) : 'Not configured'}`);
    
    try {
        const response = await axios.post(CUSTOM_API_URL, streamingPayload, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': CUSTOM_API_KEY
                //'User-Agent': 'OpenAI/NodeJS',
                //'Accept': 'text/event-stream'
            },
            //responseType: 'stream',
            //timeout: 30000
        });

        console.log('✅ Connection established');
        console.log(`Response Status: ${response.status}`);
        console.log('Response Headers:', response.headers);
        
        let chunkCount = 0;
        let completeMessage = '';

        response.data.on('data', (chunk) => {
            chunkCount++;
            const chunkStr = chunk.toString();
            console.log(`\n📦 Chunk ${chunkCount}:`);
            console.log(chunkStr);
            
            // Try to parse SSE data
            const lines = chunkStr.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                            completeMessage += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // Not JSON, continue
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n✅ Stream completed');
            console.log(`Total chunks received: ${chunkCount}`);
            console.log(`Complete message: ${completeMessage}`);
        });

        response.data.on('error', (error) => {
            console.error('❌ Stream error:', error);
        });

        // Wait for stream to complete
        await new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

    } catch (error) {
        console.error('❌ Direct API Error:');
        console.error('Status:', error.response?.status);
        console.error('Headers:', error.response?.headers);
        console.error('Data:', error.response?.data?.toString() || error.message);
    }
}

/**
 * Test 2: Through Azure proxy endpoint
 */
async function testProxyStreamingAPI() {
    console.log('\n\n🧪 Testing Proxy Streaming API Call');
    console.log('===================================');
    console.log(`Proxy URL: ${PROXY_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`);
    
    try {
        const response = await axios.post(
            `${PROXY_URL}/proxyapi/azurecom/openai/deployments/gpt-4o-mini/chat/completions`,
            streamingPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': CUSTOM_API_KEY,
                    'api-version': '2024-12-01-preview',
                    'Accept': 'text/event-stream'
                },
                responseType: 'stream',
                timeout: 30000
            }
        );

        console.log('✅ Proxy connection established');
        console.log(`Response Status: ${response.status}`);
        console.log('Response Headers:', response.headers);
        
        let chunkCount = 0;
        let completeMessage = '';

        response.data.on('data', (chunk) => {
            chunkCount++;
            const chunkStr = chunk.toString();
            console.log(`\n📦 Proxy Chunk ${chunkCount}:`);
            console.log(chunkStr);
            
            // Try to parse SSE data
            const lines = chunkStr.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                            completeMessage += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // Not JSON, continue
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n✅ Proxy stream completed');
            console.log(`Total chunks received: ${chunkCount}`);
            console.log(`Complete message: ${completeMessage}`);
        });

        response.data.on('error', (error) => {
            console.error('❌ Proxy stream error:', error);
        });

        // Wait for stream to complete
        await new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

    } catch (error) {
        console.error('❌ Proxy API Error:');
        console.error('Status:', error.response?.status);
        console.error('Headers:', error.response?.headers);
        console.error('Data:', error.response?.data?.toString() || error.message);
    }
}

/**
 * Test 3: Non-streaming version for comparison
 */
async function testNonStreamingAPI() {
    console.log('\n\n🧪 Testing Non-Streaming API Call (for comparison)');
    console.log('==================================================');
    
    const nonStreamingPayload = { ...streamingPayload, stream: false };
    
    try {
        const response = await axios.post(CUSTOM_API_URL, nonStreamingPayload, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': CUSTOM_API_KEY,
                'User-Agent': 'OpenAI/NodeJS'
            },
            timeout: 30000
        });

        console.log('✅ Non-streaming response received');
        console.log(`Response Status: ${response.status}`);
        console.log('Response Data:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Non-streaming API Error:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data || error.message);
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting Stream Format Tests');
    console.log('===============================');
    console.log('Configuration:');
    console.log(`- Custom API URL: ${CUSTOM_API_URL}`);
    console.log(`- Custom API Key: ${CUSTOM_API_KEY ? '***' + CUSTOM_API_KEY.slice(-4) : 'Not configured'}`);
    console.log(`- Proxy Port: ${process.env.PORT || 7000}`);
    console.log(`- Model: gpt-4o-mini`);
    console.log(`- Stream: true`);
    console.log(`- Simple Text: "Hello"`);
    
    // Test 1: Direct API (Simple Text - matches your Postman test)
    await testDirectStreamingAPI();
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Through proxy
    await testProxyStreamingAPI();
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Non-streaming for comparison
    await testNonStreamingAPI();
    
    console.log('\n\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    // Check if environment variables are configured
    if (!CUSTOM_API_URL || !CUSTOM_API_KEY) {
        console.error('❌ Missing environment variables:');
        console.error(`CUSTOM_API_URL: ${CUSTOM_API_URL ? '✅' : '❌'}`);
        console.error(`CUSTOM_API_KEY: ${CUSTOM_API_KEY ? '✅' : '❌'}`);
        process.exit(1);
    }
    
    runAllTests().catch(console.error);
}

module.exports = {
    testDirectStreamingAPI,
    testProxyStreamingAPI,
    testNonStreamingAPI,
    runAllTests
};
