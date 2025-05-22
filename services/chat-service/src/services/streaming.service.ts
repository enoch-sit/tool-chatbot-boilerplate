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
 * Helper function to format the prompt body based on the modelId.
 */
const formatPromptBody = (modelId: string, messages: any[]): any => {
  let promptBody;
  if (modelId.includes('anthropic')) {
    promptBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: messages
    };
  } else if (modelId.includes('amazon.titan')) {
    promptBody = {
      inputText: messages.map(m => `${m.role}: ${m.content}`).join('\\\\n'),
      textGenerationConfig: {
        maxTokenCount: 2000,
        temperature: 0.7,
        topP: 0.9
      }
    };
  } else if (modelId.includes('amazon.nova')) {
    const systemMessage = messages.find(m => m.role === 'system');
    const userAssistantMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    const formattedMessages = userAssistantMessages.map(m => ({
      role: m.role,
      content: [{
        text: typeof m.content === 'string' ? m.content : (m.content as any)?.text || JSON.stringify(m.content)
      }]
    }));
    if (systemMessage && formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
      const systemText = typeof systemMessage.content === 'string' ? systemMessage.content : (systemMessage.content as any)?.text || JSON.stringify(systemMessage.content);
      if (systemText) {
        formattedMessages[0].content[0].text = systemText + "\\\\n\\\\n" + formattedMessages[0].content[0].text;
      }
    } else if (systemMessage && formattedMessages.length === 0) {
      logger.warn('System message provided for Nova model without subsequent user/assistant messages. System message may be ignored or cause an error.');
    }
    promptBody = {
      inferenceConfig: {
        max_new_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9
      },
      messages: formattedMessages
    };
  } else if (modelId.includes('meta.llama')) {
    promptBody = {
      prompt: messages.map(m => `${m.role}: ${m.content}`).join('\\\\n'),
      temperature: 0.7,
      top_p: 0.9,
      max_gen_len: 2000
    };
  } else {
    // Default format (Anthropic Claude compatible)
    promptBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: messages
    };
  }
  return promptBody;
};

/**
 * Extracts the text content from a streaming chunk received from the AI model.
 * This function handles different response structures from various models.
 *
 * @param chunkData - The parsed JSON data of the chunk.
 * @param modelId - The ID of the model that generated the chunk.
 * @returns The extracted text content, or an empty string if not found.
 */
export const extractTextFromChunk = (chunkData: any, modelId: string): string => {
  // DEBUG.MD_NOTE: Nova Response Format Issue & User Provided Log
  // The debug.md report and user-provided logs confirm that Amazon Nova models
  // use a specific format: `contentBlockDelta.delta.text`.
  // User log example of a raw chunk from Nova:
  // 2025-05-20 17:09:30 {"level":"debug","message":"Received chunk data for amazon.nova-micro-v1:0: {\\"contentBlockDelta\\":{\\"delta\\":{\\"text\\":\\"Artificial\\"},\\"contentBlockIndex\\":0}}","service":"chat-service","timestamp":"2025-05-20T09:09:30.796Z"}
  // The JSON part `{\\"contentBlockDelta\\":{\\"delta\\":{\\"text\\":\\"Artificial\\"},\\"contentBlockIndex\\":0}}`
  // should be correctly parsed by the logic below, extracting "Artificial".

  if (modelId.includes('amazon.nova')) {
    // Handle Amazon Nova's specific format
    return chunkData.contentBlockDelta?.delta?.text || '';
  } else if (modelId.includes('anthropic.claude-3')) {
    return chunkData.delta?.text || '';
  } else if (modelId.includes('amazon.titan')) {
    return chunkData.completion || chunkData.outputText || '';
  } else if (modelId.includes('meta.llama')) {
    return chunkData.text || chunkData.generation || '';
  } else if (modelId.includes('cohere')) {
    return chunkData.text || chunkData.generation || '';
  } else if (modelId.includes('mistral')) {
    return chunkData.text || '';
  }
  return '';
};

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
    // POTENTIAL ERROR SOURCE: If the accounting service at config.accountingApiUrl (e.g., http://localhost:3001)
    // is not running or is inaccessible, this axios.post call will fail.
    // This can result in an 'ECONNREFUSED' error, as seen in logs when attempting to connect to port 3001.
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
  // Create a PassThrough stream. This is a special kind of stream that can be used to
  // pipe data from a source (AWS Bedrock in this case) to a destination (the client's browser).
  // It acts like a "pipe" where data flows through.
  const stream = new PassThrough();
  // Initialize a counter for the total number of tokens generated in this streaming session.
  // Tokens are units of text (like words or parts of words) that AI models process.
  let totalTokensGenerated = 0;
  
  // --- Stream Timeout Handler ---
  // This sets up a safety net. If the streaming takes too long (defined by config.maxStreamingDuration),
  // we want to stop it to prevent it from running forever and consuming resources.
  const timeout = setTimeout(() => {
    // Log a warning that the timeout was reached.
    logger.warn(`Stream timeout reached for session ${sessionId}`);
    
    // Send an 'error' event to the client through the Server-Sent Events (SSE) stream.
    // This tells the client's browser that something went wrong.
    stream.write(`event: error\ndata: ${JSON.stringify({ 
      error: 'Stream timeout reached', 
      code: 'STREAM_TIMEOUT' 
    })}\n\n`);
    // End the stream, signaling that no more data will be sent.
    stream.end();
    
    // Attempt to inform the accounting service that this session was aborted due to a timeout.
    // This is important for correct billing and resource management.
    // POTENTIAL ERROR SOURCE: If the accounting service is down, this call to abort the session
    // will also fail, potentially with an 'ECONNREFUSED' error.
    try {
      axios.post(
        `${config.accountingApiUrl}/streaming-sessions/abort`, // Endpoint in the accounting service
        {
          sessionId // The ID of the session that timed out
        },
        {
          headers: {
            Authorization: authHeader // Authentication token for the accounting service
          }
        }
      ).catch(abortError => {
        // If there's an error while trying to abort the session with the accounting service, log it.
        logger.error('Error aborting timed-out session with accounting service:', abortError);
      });
    } catch (error) {
      logger.error('Error finalizing timed-out session:', error);
    }
  }, config.maxStreamingDuration); // The maximum duration is set in the application's configuration.
  
  try {
    // --- Model-specific Prompt Formatting ---
    const promptBody = formatPromptBody(modelId, messages);
    
    // --- Create AWS Bedrock Streaming Command ---
    // This prepares the actual request to be sent to AWS Bedrock.
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: modelId, // The ID of the AI model to use
      body: JSON.stringify(promptBody), // The formatted prompt, converted to a JSON string
      contentType: 'application/json', // Tells Bedrock the body is JSON
      accept: 'application/json' // Tells Bedrock we want a JSON response (for streaming metadata)
    });
    
    // Log that we're about to send the request to Bedrock.
    logger.debug(`Sending streaming request to Bedrock: ${modelId}`);
    // Send the command to Bedrock and wait for the initial response.
    // This response will contain the stream of data.
    const response = await bedrockClient.send(command);
    
    // Check if the response body (the stream) exists.
    if (response.body) {
      // --- Process the Streaming Response ---
      // Record the start time to measure how long streaming takes.
      const startTime = Date.now();
      // Keep track of when the last chunk of data was received.
      // let lastChunkTime = startTime; // This variable is declared but not used later, could be removed or used for inactivity timeouts.
      // Accumulate the full response text as chunks arrive.
      let responseContent = ''; 
      
      // This loop iterates over the chunks of data as they arrive from AWS Bedrock.
      // 'for await...of' is used for asynchronously iterating over the stream.
      for await (const chunk of response.body) {
        // lastChunkTime = Date.now(); // Update the time of the last received chunk. (If used for inactivity)
        
        // Each 'chunk' can contain different types of information.
        // We are interested in 'chunk.chunk.bytes', which holds the actual data payload.
        if (chunk.chunk?.bytes) {
          try {
            // The data in 'bytes' is usually a binary buffer. We need to convert it to a UTF-8 string
            // and then parse it as JSON, as Bedrock sends structured data in chunks.
            const chunkDataString = Buffer.from(chunk.chunk.bytes).toString('utf-8');
            const chunkData = JSON.parse(chunkDataString);
            
            // ***** PLACE TO ADD MORE LOGGING FOR EACH CHUNK *****
            // The line below already logs the entire parsed chunk.
            // You can add more specific logging here if needed, for example,
            // to log only specific parts of chunkData or to log it in a different format.
            // Example: logger.info(`STREAMING CHUNK DETAILS: Text part - ${chunkData.delta?.text || chunkData.outputText || 'N/A'}`);
            logger.debug(`Received chunk data for ${modelId}: ${JSON.stringify(chunkData)}`);
            
            // --- Model-specific Text Extraction from Chunk ---
            const chunkText = extractTextFromChunk(chunkData, modelId);
            logger.debug(`Raw chunkText for session ${sessionId}, model ${modelId}: [${chunkText}]`);
            
            // How to log the chunk text?
            // Log the extracted text from this chunk at debug level
            if (chunkText) {
              logger.debug(`Session ${sessionId}, Model ${modelId} - Chunk text: ${chunkText.substring(0, 100)}${chunkText.length > 100 ? '...' : ''}`);
            }
            // If we successfully extracted text from the chunk:
            if (chunkText) {
              // Estimate the number of tokens in this chunk. This is a rough estimate.
              // For accurate billing, a proper tokenizer library for the specific model is better.
              const tokenEstimate = Math.ceil(chunkText.length / 4); // Simple char/4 ratio
              totalTokensGenerated += tokenEstimate; // Add to the session's total
              responseContent += chunkText; // Append the text to the full response being built

              // Construct the payload for the SSE 'chunk' event.
              // This object structure { text: chunkText } is expected by the client-side parser
              // (see message.controller.ts, streamChatResponse data handler)
              // and helps address SSE parsing issues noted in DEBUG.MD.
              const sseEventPayload = { text: chunkText };
              
              // DEBUG.MD_NOTE: SSE Parsing Errors
              // The chat-service might be generating invalid JSON data for Server-Sent Events.
              // This can be due to issues with character escaping (e.g., unescaped backslashes
              // or other special characters) within the JSON strings constructed for SSE data.
              // This leads to "Error parsing SSE chunk: Unexpected token \\ in JSON at position XX"
              // errors, indicating data sent doesn't conform to JSON standards for SSE events.
              // (debug.md, 2025-05-21)
              
              // The following line sends the correctly formatted JSON string as the SSE data.
              const jsonPayloadString = JSON.stringify(sseEventPayload);
              logger.debug(`SSE JSON Payload String for session ${sessionId}: [${jsonPayloadString}]`); // Log with delimiters
              // [20250521_16_52] Problem identified: Streaming - Malformed SSE Chunk Parsing. message.controller.js is failing to parse JSON strings from this service. The "Unexpected token \\\\" error indicates improperly escaped characters when JSON.parse() is called in message.controller.js.
              stream.write(`event: chunk\ndata: ${jsonPayloadString}\n\n`); // SSE messages end with two newlines.
              //stream.write(`event: chunk\\\\ndata: ${JSON.stringify(sseEventPayload)}\\\\n\\\\n`); 
            }
          } catch (parseError) {
            // If there's an error parsing a chunk (e.g., it's not valid JSON), log it.
            logger.error('Error parsing chunk data:', parseError);
            // Consider if you want to send an error to the client here or try to continue.
          }
        }
      }
      
      // --- Send Completion Event ---
      // After all chunks have been processed, send a 'complete' event to the client.
      stream.write(`event: complete\\ndata: ${JSON.stringify({
        status: 'complete',
        tokens: totalTokensGenerated, // Final total tokens for the session
        sessionId
      })}\\n\\n`);
      
      // Log how long the streaming took and how many tokens were generated.
      const completionTime = Date.now() - startTime;
      logger.debug(`Streaming completed in ${completionTime}ms, generated ${totalTokensGenerated} tokens`);
      
      // --- Finalize Streaming Session with Accounting ---
      // Inform the accounting service that the stream is complete and provide the actual token usage.
      // POTENTIAL ERROR SOURCE: If the accounting service is down, this call to finalize the session
      // will fail, potentially with an 'ECONNREFUSED' error.
      try {
        await axios.post(
          `${config.accountingApiUrl}/streaming-sessions/finalize`, // Endpoint in accounting service
          {
            sessionId,
            actualTokens: totalTokensGenerated, // The actual tokens used
            responseContent // The full response text (optional, for logging or auditing)
          },
          {
            headers: {
              Authorization: authHeader // Authentication for the accounting service
            }
          }
        ).catch(finalizationError => {
          // If there's an error during finalization with the accounting service, log it.
          logger.error('Error finalizing streaming session with accounting service:', finalizationError);
        });
        logger.info(`Successfully finalized streaming session ${sessionId}`);
      } catch (finalizationError) {
        // If there's an error during finalization with the accounting service, log it.
        logger.error('Error finalizing streaming session:', finalizationError);
      }
    }
    
    // --- Clean Up ---
    // Clear the timeout that we set up at the beginning, as the stream completed successfully.
    clearTimeout(timeout);
    // End the stream to the client, signaling that no more data will be sent.
    stream.end();
    
  } catch (error:any) {
    // --- Error Handling for the Entire Streaming Process ---
    // If any error occurs in the `try` block above (e.g., Bedrock connection issue,
    // unexpected error during prompt formatting), it will be caught here.
    logger.error('Error in stream processing:', error);
    
    // Important: Clear the timeout to prevent it from running if it hasn't already.
    clearTimeout(timeout);
    
    // --- Error Recovery: Abort Streaming Session with Accounting ---
    // Try to inform the accounting service that the session was aborted due to an error.
    // POTENTIAL ERROR SOURCE: If the accounting service is down, this call to abort the session
    // will also fail, potentially with an 'ECONNREFUSED' error.
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
      ).catch(abortError => {
        // If aborting also fails, log that error too.
        logger.error('Error aborting streaming session with accounting service after main error:', abortError);
      });
      logger.info(`Aborted streaming session ${sessionId} due to error`);
    } catch (abortError) {
      // If aborting also fails, log that error too.
      logger.error('Error aborting streaming session:', abortError);
    }
    
    // Send an 'error' event to the client through the SSE stream.
    stream.write(`event: error\\ndata: ${JSON.stringify({ 
      error: error.message || 'Stream processing error', // The error message
      code: error.code || 'STREAM_ERROR' // An error code, if available
    })}\\n\\n`);
    // End the stream.
    stream.end();
  }
  
  // Return the PassThrough stream. The controller that called this function will
  // then pipe this stream to the client's HTTP response.
  return stream;
};

// DEBUG.MD_NOTE: Malformed SSE Chunk Generation (Streaming Messages)
// [20250521_16_52] Problem identified: Streaming - Malformed SSE Chunk Parsing. message.controller.js is failing to parse JSON strings from this service. The "Unexpected token \\\\" error indicates improperly escaped characters when JSON.parse() is called in message.controller.js. (General note for the issue)
// The chat-service is generating invalid JSON data for the Server-Sent Events it streams to the client.
// This is likely due to character escaping issues (e.g., unescaped backslashes or other special characters)
// within the JSON strings being constructed for the SSE `data` field, leading to parsing errors on the client and in chat-service logs.
// Root Cause: The chat-service is generating invalid JSON data for the Server-Sent Events it streams to the client.
// The "Unexpected token \\\\\\\\" error typically points to issues with character escaping
// (e.g., unescaped backslashes or other special characters) within the JSON strings being constructed for the SSE data field.
// This means the chat-service is sending data that doesn\\\'t conform to the JSON standard for SSE events.