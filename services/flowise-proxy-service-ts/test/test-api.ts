import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import { FlowiseClient } from 'flowise-sdk';

// Load environment variables
dotenv.config();

const BASE_URL: string = `http://localhost:${process.env.PORT || 3001}`;
const FLOWISE_ENDPOINT: string = process.env.FLOWISE_ENDPOINT || '';
const FLOWISE_API_KEY: string = process.env.FLOWISE_API_KEY || '';

// Interfaces
interface TestResult {
    success: boolean;
    status?: number;
    data?: any;
    error?: string;
}

interface Colors {
    green: string;
    red: string;
    yellow: string;
    blue: string;
    reset: string;
}

interface PredictionData {
    question: string;
    history: any[];
    streaming?: boolean;
    overrideConfig?: Record<string, any>;
}

// Colors for console output
const colors: Colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color: keyof Colors, message: string): void {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(
    method: string,
    url: string,
    data: any = null,
    description: string
): Promise<TestResult> {
    log('blue', `\n🧪 Testing: ${description}`);
    log('blue', `${method.toUpperCase()} ${url}`);
    
    try {
        const config: AxiosRequestConfig = {
            method: method.toLowerCase() as any,
            url,
            timeout: 10000
        };
        
        if (data) {
            config.data = data;
            config.headers = { 'Content-Type': 'application/json' };
        }
        
        const response: AxiosResponse = await axios(config);
        log('green', `✅ SUCCESS (${response.status})`);
        
        if (response.data) {
            console.log('Response:', JSON.stringify(response.data, null, 2));
        }
        
        return { success: true, status: response.status, data: response.data };
    } catch (error: any) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
            log('red', `❌ FAILED (${axiosError.response.status})`);
            console.log('Error Response:', JSON.stringify(axiosError.response.data, null, 2));
        } else if (axiosError.request) {
            log('red', `❌ FAILED - No response received`);
            console.log('Error:', axiosError.message);
        } else {
            log('red', `❌ FAILED - Request setup error`);
            console.log('Error:', axiosError.message);
        }
        
        return { success: false, error: axiosError.message };
    }
}

async function testStreamingEndpoint(
    chatflowId: string,
    question: string,
    description: string
): Promise<TestResult> {
    log('blue', `\n🧪 Testing Streaming: ${description}`);
    log('blue', `Using /test/prediction/:id endpoint`);
    log('blue', '⏳ Starting streaming test...');
    
    try {
        log('yellow', `Streaming data, collecting chunks...`);
        
        // Track streaming response
        let chunks: any[] = [];
        let fullContent = '';
        
        // Use the test endpoint for streaming prediction
        const url = `${BASE_URL}/test/prediction/${chatflowId}`;
        const data = {
            question: question,
            streaming: true
        };
        
        log('blue', `POST ${url}`);
        log('blue', `Body: ${JSON.stringify(data)}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (!response.body) {
            throw new Error('No response body received');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6); // Remove 'data: '
                        
                        if (dataStr === '[DONE]') {
                            log('green', '📡 Received [DONE] signal');
                            break;
                        }
                        
                        try {
                            const parsedData = JSON.parse(dataStr);
                            chunks.push(parsedData);
                            
                            if (parsedData.event === 'token' && parsedData.data) {
                                fullContent += parsedData.data;
                                log('green', `📡 Token chunk: "${parsedData.data}"`);
                            } else {
                                log('green', `📡 Received event: ${JSON.stringify(parsedData)}`);
                            }
                        } catch (parseError) {
                            // Skip non-JSON data lines
                            if (dataStr.trim()) {
                                log('yellow', `📡 Raw data: ${dataStr}`);
                                fullContent += dataStr;
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
        
        log('green', `✅ STREAMING COMPLETE`);
        log('green', `✅ Received ${chunks.length} chunks`);
        log('blue', '🎯 Streaming test finished successfully');
        
        if (fullContent) {
            log('blue', '\n📝 Full Streaming Response Content:');
            console.log('―'.repeat(50));
            console.log(fullContent);
            console.log('―'.repeat(50));
        }
        
        return {
            success: true,
            data: {
                chunks,
                fullContent,
                totalChunks: chunks.length
            }
        };
        
    } catch (error: any) {
        log('red', `❌ STREAMING FAILED - ${error.message}`);
        log('red', '🎯 Streaming test finished with error');
        console.log('Error details:', error);
        
        return { success: false, error: error.message };
    }
}

async function testDirectFlowiseSDK(
    chatflowId: string,
    question: string,
    description: string
): Promise<TestResult> {
    log('blue', `\n🧪 Testing Direct Flowise SDK: ${description}`);
    log('blue', `Connecting directly to: ${FLOWISE_ENDPOINT}`);
    log('blue', '⏳ Starting direct SDK test...');
    
    try {
        log('yellow', `Initializing FlowiseClient...`);
        
        // Create FlowiseClient pointing directly to Flowise endpoint
        const client = new FlowiseClient({ 
            baseUrl: FLOWISE_ENDPOINT,
            apiKey: FLOWISE_API_KEY
        });
        
        log('yellow', `Making direct prediction request...`);
        
        // Track streaming response
        let chunks: any[] = [];
        let fullContent = '';
        
        // For streaming prediction using direct SDK
        const prediction = await client.createPrediction({
            chatflowId: chatflowId,
            question: question,
            streaming: true,
        });

        for await (const chunk of prediction) {
            // {event: "token", data: "hello"}
            chunks.push(chunk);
            
            if (chunk.event === 'token' && chunk.data) {
                fullContent += chunk.data;
                log('green', `📡 Direct SDK Token chunk: "${chunk.data}"`);
            } else {
                log('green', `📡 Direct SDK Received event: ${JSON.stringify(chunk)}`);
            }
        }
        
        log('green', `✅ DIRECT SDK STREAMING COMPLETE`);
        log('green', `✅ Received ${chunks.length} chunks from direct SDK`);
        log('blue', '🎯 Direct SDK test finished successfully');
        
        if (fullContent) {
            log('blue', '\n📝 Direct SDK Full Streaming Response Content:');
            console.log('―'.repeat(50));
            console.log(fullContent);
            console.log('―'.repeat(50));
        }
        
        return {
            success: true,
            data: {
                chunks,
                fullContent,
                totalChunks: chunks.length,
                source: 'direct-flowise-sdk'
            }
        };
        
    } catch (error: any) {
        log('red', `❌ DIRECT SDK STREAMING FAILED - ${error.message}`);
        log('red', '🎯 Direct SDK test finished with error');
        console.log('Error details:', error);
        
        return { success: false, error: error.message };
    }
}



async function runTests(): Promise<void> {
    log('yellow', '🔍 Starting Flowise Proxy Service API Tests\n');
    
    // Check if server is running
    try {
        await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
        log('green', '✅ Server is running');
    } catch (error: any) {
        log('red', '❌ Server is not running. Please start the server first with: npm start');
        return;
    }
      // Test 1: Health check
    log('yellow', '\n═══════════════════════════════════════════════════════════════════════════════');
    const healthResult = await testEndpoint('GET', `${BASE_URL}/health`, null, 'Health Check');
    log('blue', `Test 1 completed with status: ${healthResult.success ? 'SUCCESS' : 'FAILED'}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    
    // Test 2: Root endpoint
    log('yellow', '\n═══════════════════════════════════════════════════════════════════════════════');
    const rootResult = await testEndpoint('GET', `${BASE_URL}/`, null, 'Root Endpoint');
    log('blue', `Test 2 completed with status: ${rootResult.success ? 'SUCCESS' : 'FAILED'}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    
    // Test 3: List chatflows
    log('yellow', '\n═══════════════════════════════════════════════════════════════════════════════');
    const chatflowsResult: TestResult = await testEndpoint(
        'GET',
        `${BASE_URL}/test/chatflows`,
        null,
        'List All Chatflows'
    );
    log('blue', `Test 3 completed with status: ${chatflowsResult.success ? 'SUCCESS' : 'FAILED'}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    
    let testChatflowId: string | null = null;
    if (chatflowsResult.success && 
        chatflowsResult.data && 
        chatflowsResult.data.data && 
        chatflowsResult.data.data.length > 0) {
        testChatflowId = chatflowsResult.data.data[0].id;
        log('blue', `Found chatflow ID for testing: ${testChatflowId}`);
        
        // Test 4: Make a streaming prediction using test endpoint
        if (testChatflowId) {
            log('yellow', '\n═══════════════════════════════════════════════════════════════════════════════');
            const streamingResult = await testStreamingEndpoint(
                testChatflowId,
                "Hello, this is a streaming test message using the test endpoint. Please respond with multiple chunks.",
                'Make Prediction (Streaming with Test Endpoint)'
            );
            log('blue', `Test 4 completed with status: ${streamingResult.success ? 'SUCCESS' : 'FAILED'}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds after streaming test
        }
        
        // Test 5: Test direct FlowiseClient SDK connection
        if (testChatflowId) {
            log('yellow', '\n═══════════════════════════════════════════════════════════════════════════════');
            const directSDKResult = await testDirectFlowiseSDK(
                testChatflowId,
                "Hello, this is a direct SDK test message. Please respond with multiple chunks.",
                'Make Prediction (Direct FlowiseClient SDK)'
            );
            log('blue', `Test 5 completed with status: ${directSDKResult.success ? 'SUCCESS' : 'FAILED'}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds after streaming test
        }
    } else {
        log('yellow', '⚠️  No chatflows found or unable to fetch chatflows. Skipping chatflow-specific tests.');
    }

    // Test 6: Test proxy endpoint
    log('yellow', '\n═══════════════════════════════════════════════════════════════════════════════');
    const proxyResult = await testEndpoint(
        'GET',
        `${BASE_URL}/api/v1/chatflows`,
        null,
        'Proxy Endpoint - List Chatflows'
    );    log('blue', `Test 6 completed with status: ${proxyResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    log('yellow', '\n═══════════════════════════════════════════════════════════════════════════════');
    log('yellow', '🏁 All tests completed!');
    log('yellow', '═══════════════════════════════════════════════════════════════════════════════');
    
    // Display configuration info    log('blue', '\n📋 Configuration Info:');
    console.log(`   Server URL: ${BASE_URL}`);
    console.log(`   Flowise Endpoint: ${FLOWISE_ENDPOINT}`);
    console.log(`   API Key Set: ${FLOWISE_API_KEY ? 'Yes' : 'No'}`);    // Print summary of supported features    
    log('blue', '\n🔍 Supported Features:');
    console.log(`   ✓ Streaming Predictions (using /test/prediction/:id endpoint)`); 
    console.log(`   ✓ Direct FlowiseClient SDK Connection`);
    console.log(`   ✓ API Proxying`);
    console.log(`   ✓ Flowise SDK Integration`);
    
    if (!FLOWISE_API_KEY) {
        log('yellow', '\n⚠️  Note: FLOWISE_API_KEY is not set in .env file. Some tests may fail.');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

export { runTests, testEndpoint, testStreamingEndpoint, testDirectFlowiseSDK };
