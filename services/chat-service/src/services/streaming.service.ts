/**
 * Streaming Service Module
 * 
 * This module provides real-time streaming capabilities for AI responses using
 * AWS Bedrock. It handles the establishment of streaming sessions, credit allocation,
 * streaming of responses in Server-Sent Events (SSE) format, and proper session
 * finalization for billing purposes.
 * 
 * Key features:
 * - Streaming session initialization with credit pre-allocation
 * - Real-time response streaming from AWS Bedrock models
 * - Support for multiple model providers (Anthropic, Amazon, Meta)
 * - Token usage tracking for billing and analytics
 * - Automatic session timeout handling
 * - Error handling and recovery mechanisms
 */
import { 
  BedrockRuntimeClient, 
  InvokeModelWithResponseStreamCommand 
} from '@aws-sdk/client-bedrock-runtime';
import { PassThrough } from 'stream';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import config from '../config/config';

/**
 * AWS Bedrock Client Configuration
 * 
 * Initialize the Bedrock client with region and authentication
 * credentials from the application configuration.
 */
const bedrockClient = new BedrockRuntimeClient({ 
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  }
});

/**
 * Initialize Streaming Session
 * 
 * Creates a new streaming session by coordinating with the accounting service
 * to pre-allocate credits for the upcoming streaming request.
 * 
 * Process:
 * 1. Generate a unique session identifier
 * 2. Estimate token usage based on prompt length and expected response
 * 3. Register the session with the accounting service to reserve credits
 * 
 * @param userId - ID of the user initiating the stream
 * @param messages - Array of conversation messages that form the prompt
 * @param modelId - ID of the AI model to be used
 * @param authHeader - Authorization header value for accounting service auth
 * @returns Object containing session ID and allocated credits
 * @throws Error if credit allocation fails or other errors occur
 */
export const initializeStreamingSession = async (
  userId: string,
  messages: any[],
  modelId: string,
  authHeader: string
) => {
  try {
    // Generate a unique session ID with timestamp and UUID for tracking
    const sessionId = `stream-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    /**
     * Estimate token usage based on input prompt
     * 
     * This is a simple estimation using a character-to-token ratio of 4:1,
     * plus a buffer for the expected response length.
     * More sophisticated token counting would be needed for production.
     */
    const promptText = messages.map(m => m.content).join(' ');
    const estimatedTokens = Math.ceil(promptText.length / 4) + 1000; // Simple estimation with buffer
    
    logger.info(`Initializing streaming session for user ${userId} with model ${modelId}`);
    
    /**
     * Initialize session with accounting service
     * 
     * This reserves credits for the streaming session and ensures
     * the user has sufficient balance before starting the stream.
     */
    const response = await axios.post(
      `${config.accountingApiUrl}/streaming-sessions/initialize`,
      {
        userId,
        sessionId,
        modelId,
        estimatedTokens
      },
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    
    logger.debug(`Streaming session initialized: ${sessionId}, allocated credits: ${response.data.allocatedCredits}`);
    
    // Return session details to be used by the streaming endpoint
    return {
      sessionId: response.data.sessionId,
      allocatedCredits: response.data.allocatedCredits
    };
  } catch (error) {
    logger.error('Error initializing streaming session:', error);
    
    // Special handling for insufficient credits
    if (axios.isAxiosError(error) && error.response?.status === 402) {
      throw new Error('Insufficient credits for streaming');
    }
    
    // Re-throw for other errors
    throw error;
  }
};

/**
 * Stream Response from AWS Bedrock
 * 
 * Establishes a streaming connection with AWS Bedrock to receive
 * real-time AI-generated content and forwards it to the client
 * using Server-Sent Events (SSE).
 * 
 * Features:
 * - Handles multiple model formats (Anthropic, Titan, Nova, Llama)
 * - Streams partial responses as they arrive
 * - Tracks token usage for billing
 * - Implements timeouts to prevent runaway sessions
 * - Finalizes sessions with the accounting service
 * 
 * @param sessionId - Streaming session identifier from initialization
 * @param messages - Array of conversation messages forming the prompt
 * @param modelId - ID of the AI model to use
 * @param authHeader - Authorization header for accounting service calls
 * @returns PassThrough stream that emits Server-Sent Events
 */
export const streamResponse = async (
  sessionId: string,
  messages: any[],
  modelId: string,
  authHeader: string
) => {
  /**
   * Create a PassThrough stream for SSE
   * 
   * This stream allows us to push events to the client in real-time
   * as they arrive from AWS Bedrock.
   */
  const stream = new PassThrough();
  let totalTokensGenerated = 0;
  
  /**
   * Stream Timeout Handler
   * 
   * Sets a maximum duration for streaming to prevent runaway
   * sessions that could consume excessive resources or credits.
   * If the timeout is reached, the stream is closed and the
   * session is aborted.
   */
  const timeout = setTimeout(() => {
    logger.warn(`Stream timeout reached for session ${sessionId}`);
    
    // Send error event to the client
    stream.write(`event: error\ndata: ${JSON.stringify({ 
      error: 'Stream timeout reached', 
      code: 'STREAM_TIMEOUT' 
    })}\n\n`);
    stream.end();
    
    // Attempt to finalize the session with a timeout status
    try {
      axios.post(
        `${config.accountingApiUrl}/streaming-sessions/abort`,
        {
          sessionId
        },
        {
          headers: {
            Authorization: authHeader
          }
        }
      );
    } catch (error) {
      logger.error('Error finalizing timed-out session:', error);
    }
  }, config.maxStreamingDuration);
  
  try {
    /**
     * Model-specific Prompt Formatting
     * 
     * Different AI models require different input formats.
     * This section detects the model type and formats the messages
     * appropriately for the specific model API.
     */
    let promptBody;
    
    if (modelId.includes('anthropic')) {
      // Format for Anthropic Claude models
      promptBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: messages
      };
    } else if (modelId.includes('amazon.titan')) {
      // Format for Amazon's Titan models
      promptBody = {
        inputText: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        textGenerationConfig: {
          maxTokenCount: 2000,
          temperature: 0.7,
          topP: 0.9
        }
      };
    } else if (modelId.includes('amazon.nova')) {
      // Format for Amazon's Nova models
      const formattedMessages = messages.map(m => ({
        role: m.role,
        content: [{
          text: typeof m.content === 'string' ? m.content : m.content.text || m.content
        }]
      }));
      
      promptBody = {
        inferenceConfig: {
          max_new_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9
        },
        messages: formattedMessages
      };
    } else if (modelId.includes('meta.llama')) {
      // Format for Meta's Llama models
      promptBody = {
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        temperature: 0.7,
        top_p: 0.9,
        max_gen_len: 2000
      };
    } else {
      // Default format (Claude-compatible)
      promptBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: messages
      };
    }
    
    /**
     * Create AWS Bedrock Streaming Command
     * 
     * Prepares the API request for AWS Bedrock with the properly
     * formatted prompt and streaming configuration.
     */
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: modelId,
      body: JSON.stringify(promptBody),
      contentType: 'application/json',
      accept: 'application/json'
    });
    
    // Send streaming request to AWS Bedrock
    logger.debug(`Sending streaming request to Bedrock: ${modelId}`);
    const response = await bedrockClient.send(command);
    
    // Process the streaming response
    if (response.body) {
      // Track performance metrics
      const startTime = Date.now();
      let lastChunkTime = startTime;
      let responseContent = ''; // Collect the complete response
      
      /**
       * Process Streaming Response Chunks
       * 
       * Iterates through the chunks of data as they arrive from AWS Bedrock,
       * extracts the text content, and forwards them to the client as SSE events.
       */
      for await (const chunk of response.body) {
        lastChunkTime = Date.now();
        
        if (chunk.chunk?.bytes) {
          try {
            // Parse the binary chunk data as JSON
            const chunkData = JSON.parse(
              Buffer.from(chunk.chunk.bytes).toString('utf-8')
            );
            
            /**
             * Model-specific Text Extraction
             * 
             * Different models return text in different JSON structures.
             * This section extracts the text content based on the model type.
             */
            let chunkText = '';
            if (modelId.includes('anthropic')) {
              chunkText = chunkData.delta?.text || '';
            } else if (modelId.includes('amazon.titan')) {
              chunkText = chunkData.outputText || '';
            } else if (modelId.includes('amazon.nova')) {
              chunkText = chunkData.generatedText || '';
            } else if (modelId.includes('meta.llama')) {
              chunkText = chunkData.generation || '';
            }
            
            // Process the text chunk if we got valid content
            if (chunkText) {
              // Estimate token count for billing
              // This is a rough approximation; a proper tokenizer would be more accurate
              const tokenEstimate = Math.ceil(chunkText.length / 4);
              totalTokensGenerated += tokenEstimate;
              responseContent += chunkText; // Accumulate the full response
              
              // Send the chunk to the client as an SSE event
              stream.write(`event: chunk\ndata: ${JSON.stringify({
                text: chunkText,
                tokens: tokenEstimate,
                totalTokens: totalTokensGenerated
              })}\n\n`);
            }
          } catch (parseError) {
            logger.error('Error parsing chunk data:', parseError);
          }
        }
      }
      
      /**
       * Send Completion Event
       * 
       * Signals to the client that the streaming response is complete
       * and provides final statistics.
       */
      stream.write(`event: complete\ndata: ${JSON.stringify({
        status: 'complete',
        tokens: totalTokensGenerated,
        sessionId
      })}\n\n`);
      
      // Log completion metrics
      const completionTime = Date.now() - startTime;
      logger.debug(`Streaming completed in ${completionTime}ms, generated ${totalTokensGenerated} tokens`);
      
      /**
       * Finalize Streaming Session with Accounting
       * 
       * Records the actual token usage with the accounting service
       * to ensure proper billing and credit deduction.
       */
      try {
        await axios.post(
          `${config.accountingApiUrl}/streaming-sessions/finalize`,
          {
            sessionId,
            tokensUsed: totalTokensGenerated,
            responseContent
          },
          {
            headers: {
              Authorization: authHeader
            }
          }
        );
        logger.info(`Successfully finalized streaming session ${sessionId}`);
      } catch (finalizationError) {
        logger.error('Error finalizing streaming session:', finalizationError);
      }
    }
    
    // Clean up and end the stream
    clearTimeout(timeout);
    stream.end();
    
  } catch (error:any) {
    logger.error('Error in stream processing:', error);
    
    // Clean up timeout to prevent memory leaks
    clearTimeout(timeout);
    
    /**
     * Error Recovery: Abort Streaming Session
     * 
     * In case of errors during streaming, attempt to properly
     * abort the session with the accounting service to ensure
     * accurate credit tracking.
     */
    try {
      await axios.post(
        `${config.accountingApiUrl}/streaming-sessions/abort`,
        {
          sessionId
        },
        {
          headers: {
            Authorization: authHeader
          }
        }
      );
      
      logger.info(`Aborted streaming session ${sessionId} due to error`);
    } catch (abortError) {
      logger.error('Error aborting streaming session:', abortError);
    }
    
    // Send error event to the client
    stream.write(`event: error\ndata: ${JSON.stringify({ 
      error: error.message || 'Stream processing error',
      code: error.code || 'STREAM_ERROR'
    })}\n\n`);
    stream.end();
  }
  
  // Return the stream for the controller to pipe to the HTTP response
  return stream;
};