// Test streaming functionality of the updated prediction endpoint
const fetch = require('node-fetch');

async function testStreaming() {
    const chatflowId = 'your-chatflow-id-here'; // Replace with actual chatflow ID
    const baseUrl = 'http://localhost:3001'; // Your proxy service URL
    
    console.log('Testing streaming prediction...');
    
    try {
        const response = await fetch(`${baseUrl}/test/prediction/${chatflowId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: 'What is the capital of France?',
                streaming: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Streaming response started...');
        
        // Read the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                console.log('\nStreaming completed');
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            
            // Parse Server-Sent Events
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('event:')) {
                    const event = line.substring(6).trim();
                    console.log(`Event: ${event}`);
                } else if (line.startsWith('data:')) {
                    const data = line.substring(5).trim();
                    try {
                        const parsedData = JSON.parse(data);
                        console.log('Data:', parsedData);
                    } catch (e) {
                        console.log('Data (raw):', data);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testNonStreaming() {
    const chatflowId = 'your-chatflow-id-here'; // Replace with actual chatflow ID
    const baseUrl = 'http://localhost:3001'; // Your proxy service URL
    
    console.log('Testing non-streaming prediction...');
    
    try {
        const response = await fetch(`${baseUrl}/test/prediction/${chatflowId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: 'What is the capital of France?',
                streaming: false // or omit this field
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Non-streaming response:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('=== Testing Flowise Proxy Streaming ===\n');
    
    // Test non-streaming first
    await testNonStreaming();
    
    console.log('\n---\n');
    
    // Test streaming
    await testStreaming();
}

runTests();
