import express, { Request, Response, Application } from 'express';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { FlowiseClient } from 'flowise-sdk';
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3001');
const FLOWISE_ENDPOINT: string = process.env.FLOWISE_ENDPOINT || '';
const FLOWISE_API_KEY: string = process.env.FLOWISE_API_KEY || '';

// Interfaces
interface HealthResponse {
    status: string;
    timestamp: string;
    flowiseEndpoint: string;
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    count?: number;
    error?: any;
    status?: number;
    message?: string;
    timestamp: string;
}

interface PredictionRequest {
    question: string;
    history?: any[];
    overrideConfig?: Record<string, any>;
    streaming?: boolean;
}

interface Chatflow {
    id: string;
    name: string;
    flowData: string;
    deployed: boolean;
    isPublic: boolean;
    apikeyid: string;
    chatbotConfig: string;
    apiConfig: string;
    analytic: string;
    speechToText: string;
    category: string;
    type: string;
    createdDate: string;
    updatedDate: string;
}

interface EndpointsInfo {
    health: string;
    testChatflows: string;
    testChatflowById: string;
    testPrediction: string;
    proxy: string;
}

interface ServiceInfo {
    message: string;
    endpoints: EndpointsInfo;
    documentation: string;
}

// Middleware
app.use(cors());
app.use(express.json());

// Validate environment variables
if (!FLOWISE_ENDPOINT) {
    console.error('ERROR: FLOWISE_ENDPOINT is not set in .env file');
    process.exit(1);
}

if (!FLOWISE_API_KEY) {
    console.error('ERROR: FLOWISE_API_KEY is not set in .env file');
    process.exit(1);
}

// Axios instance for Flowise API calls
const flowiseApi: AxiosInstance = axios.create({
    baseURL: FLOWISE_ENDPOINT,
    headers: {
        'Authorization': `Bearer ${FLOWISE_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

// Error handler helper function
const handleApiError = (error: any, res: Response): void => {
    console.error('API Error:', error.message);
    
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            // Server responded with error status
            res.status(axiosError.response.status).json({
                success: false,
                error: axiosError.response.data,
                status: axiosError.response.status,
                timestamp: new Date().toISOString()
            } as ApiResponse);
        } else if (axiosError.request) {
            // Request was made but no response received
            res.status(503).json({
                success: false,
                error: 'Service Unavailable - Could not reach Flowise API',
                message: axiosError.message,
                timestamp: new Date().toISOString()
            } as ApiResponse);
        } else {
            // Something else happened
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: axiosError.message,
                timestamp: new Date().toISOString()
            } as ApiResponse);
        }
    } else {
        // Non-Axios error
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        } as ApiResponse);
    }
};

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
    const response: HealthResponse = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        flowiseEndpoint: FLOWISE_ENDPOINT
    };
    res.json(response);
});

// Test endpoint to list all chatflows
app.get('/test/chatflows', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Fetching chatflows from:', `${FLOWISE_ENDPOINT}/api/v1/chatflows`);
        
        const response = await flowiseApi.get<Chatflow[]>('/api/v1/chatflows');
        
        const apiResponse: ApiResponse<Chatflow[]> = {
            success: true,
            data: response.data,
            count: response.data.length,
            timestamp: new Date().toISOString()
        };
        
        res.json(apiResponse);
    } catch (error: any) {
        handleApiError(error, res);
    }
});

// Test endpoint to get a specific chatflow by ID
app.get('/test/chatflows/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        console.log('Fetching chatflow:', id);
        
        const response = await flowiseApi.get<Chatflow>(`/api/v1/chatflows/${id}`);
        
        const apiResponse: ApiResponse<Chatflow> = {
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        };
        
        res.json(apiResponse);
    } catch (error: any) {
        handleApiError(error, res);
    }
});

// Test endpoint for streaming prediction using Flowise SDK
app.post('/test/prediction/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { question, streaming = false } = req.body;
        
        if (!question) {
            res.status(400).json({
                success: false,
                error: 'Question is required',
                timestamp: new Date().toISOString()
            } as ApiResponse);
            return;
        }
          console.log(`Making prediction for chatflow ${id} with streaming: ${streaming}`);
        
        // Initialize Flowise client with API key
        const client = new FlowiseClient({ 
            baseUrl: FLOWISE_ENDPOINT,
            apiKey: FLOWISE_API_KEY
        });
        
        if (streaming) {
            // Handle streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
            
            try {
                const prediction = await client.createPrediction({
                    chatflowId: id,
                    question: question,
                    streaming: true,
                });
                
                for await (const chunk of prediction) {
                    console.log('📡 SDK streaming chunk:', chunk);
                    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                }
                
                res.write('data: [DONE]\n\n');
                res.end();
                
            } catch (streamError: any) {
                console.error('SDK streaming error:', streamError);
                res.write(`event: error\ndata: ${JSON.stringify({ error: streamError.message })}\n\n`);
                res.end();
            }
        } else {
            // Handle regular (non-streaming) response
            const prediction = await client.createPrediction({
                chatflowId: id,
                question: question,
                streaming: false,
            });
            
            const apiResponse: ApiResponse = {
                success: true,
                data: prediction,
                timestamp: new Date().toISOString()
            };
            
            res.json(apiResponse);
        }
    } catch (error: any) {
        handleApiError(error, res);
    }
});
       

// Proxy endpoint - forward all requests to Flowise API with streaming support
app.use('/api/*', async (req: Request, res: Response): Promise<void> => {
    try {
        const path = req.originalUrl;
        console.log(`Proxying ${req.method} request to:`, `${FLOWISE_ENDPOINT}${path}`);
        
        // Check if this is a streaming request
        const isStreamingRequest = req.body && req.body.streaming === true;
        console.log('Streaming enabled in proxy:', !!isStreamingRequest);
        
        const config: AxiosRequestConfig = {
            method: req.method as any,
            url: path,
            ...(req.body && Object.keys(req.body).length > 0 && { data: req.body }),
            ...(req.query && Object.keys(req.query).length > 0 && { params: req.query }),
            ...(isStreamingRequest && { responseType: 'stream' })
        };
        
        if (isStreamingRequest) {
            // Handle streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
              try {
                const response = await flowiseApi.request(config);
                  // Forward the stream directly to the client
                response.data.on('data', (chunk: Buffer) => {
                    const chunkStr = chunk.toString();
                    console.log('📡 Proxy streaming chunk:', chunkStr);
                    res.write(chunk);
                });
                
                response.data.on('end', () => {
                    console.log('Proxy streaming completed for:', path);
                    res.end();
                });
                
                response.data.on('error', (error: any) => {
                    console.error('Proxy streaming error:', error);
                    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
                    res.end();
                });
                
                // Handle client disconnect
                req.on('close', () => {
                    console.log('Client disconnected during proxy streaming');
                    response.data.destroy();
                });
                
            } catch (streamError: any) {
                console.error('Proxy streaming request error:', streamError);
                res.write(`event: error\ndata: ${JSON.stringify({ error: streamError.message })}\n\n`);
                res.end();
            }
        } else {
            // Handle regular (non-streaming) response
            const response = await flowiseApi.request(config);
            res.status(response.status).json(response.data);
        }
    } catch (error: any) {
        console.error('Proxy error:', error.message);
        
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                error: 'Proxy Error',
                message: error.message
            });
        }
    }
});

// Default route
app.get('/', (req: Request, res: Response): void => {
    const response: ServiceInfo = {
        message: 'Flowise Proxy Service',
        endpoints: {
            health: '/health',
            testChatflows: '/test/chatflows',
            testChatflowById: '/test/chatflows/:id',
            testPrediction: '/test/prediction/:id',
            proxy: '/api/* (supports streaming)'
        },
        documentation: 'See flowiseAPI.md for API details'
    };
    res.json(response);
});

// Start server
app.listen(PORT, (): void => {
    console.log(`\n🚀 Flowise Proxy Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Flowise endpoint: ${FLOWISE_ENDPOINT}`);
    console.log(`🔑 API Key configured: ${FLOWISE_API_KEY ? 'Yes' : 'No'}`);    console.log(`\nAvailable test endpoints:`);
    console.log(`  GET  /test/chatflows          - List all chatflows`);
    console.log(`  GET  /test/chatflows/:id      - Get specific chatflow`);
    console.log(`  POST /test/prediction/:id     - Make a prediction (supports streaming)`);
    console.log(`  *    /api/*                   - Proxy to Flowise API (supports streaming)`);
    console.log(`\nStreaming examples:`);
    console.log(`  POST /test/prediction/:id`);
    console.log(`  Body: { "question": "Hello", "streaming": true }`);
    console.log(`  POST /api/v1/prediction/:id`);
    console.log(`  Body: { "question": "Hello", "streaming": true }\n`);
});

export default app;
