import { 
  BedrockRuntimeClient, 
  InvokeModelWithResponseStreamCommand 
} from '@aws-sdk/client-bedrock-runtime';
import { PassThrough } from 'stream';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import config from '../config/config';

// Initialize AWS client
const bedrockClient = new BedrockRuntimeClient({ 
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  }
});

/**
 * Initialize a streaming session with the accounting service
 */
export const initializeStreamingSession = async (
  userId: string,
  messages: any[],
  modelId: string,
  authHeader: string
) => {
  try {
    // Generate a unique session ID
    const sessionId = `stream-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    // Estimate token usage from prompt plus expected response
    const promptText = messages.map(m => m.content).join(' ');
    const estimatedTokens = Math.ceil(promptText.length / 4) + 1000; // Simple estimation with buffer
    
    logger.info(`Initializing streaming session for user ${userId} with model ${modelId}`);
    
    // Initialize session with accounting service
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
    
    return {
      sessionId: response.data.sessionId,
      allocatedCredits: response.data.allocatedCredits
    };
  } catch (error) {
    logger.error('Error initializing streaming session:', error);
    
    if (axios.isAxiosError(error) && error.response?.status === 402) {
      throw new Error('Insufficient credits for streaming');
    }
    
    throw error;
  }
};

/**
 * Stream a response from AWS Bedrock
 */
export const streamResponse = async (
  userId: string,
  sessionId: string,
  messages: any[],
  modelId: string,
  authHeader: string
) => {
  // Create PassThrough stream
  const stream = new PassThrough();
  let totalTokensGenerated = 0;
  
  // Set a timeout to enforce maximum streaming duration
  const timeout = setTimeout(() => {
    logger.warn(`Stream timeout reached for session ${sessionId}`);
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
    // Format messages for Bedrock based on the model
    let promptBody;
    
    if (modelId.includes('anthropic')) {
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
    
    // Create streaming command
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: modelId,
      body: JSON.stringify(promptBody),
      contentType: 'application/json',
      accept: 'application/json'
    });
    
    // Invoke Bedrock with streaming
    logger.debug(`Sending streaming request to Bedrock: ${modelId}`);
    const response = await bedrockClient.send(command);
    
    // Process streaming response
    if (response.body) {
      // Track start time for monitoring
      const startTime = Date.now();
      let lastChunkTime = startTime;
      let responseContent = '';
      
      // Process each chunk as it arrives
      for await (const chunk of response.body) {
        lastChunkTime = Date.now();
        
        if (chunk.chunk?.bytes) {
          try {
            // Parse the chunk data
            const chunkData = JSON.parse(
              Buffer.from(chunk.chunk.bytes).toString('utf-8')
            );
            
            // Extract text based on model type
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
            
            // If we got some text, process it
            if (chunkText) {
              // Approximate token count (very rough estimate)
              const tokenEstimate = Math.ceil(chunkText.length / 4);
              totalTokensGenerated += tokenEstimate;
              responseContent += chunkText;
              
              // Format and send SSE chunk
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
      
      // Send completion event
      stream.write(`event: complete\ndata: ${JSON.stringify({
        status: 'complete',
        tokens: totalTokensGenerated,
        sessionId
      })}\n\n`);
      
      // Record completion time
      const completionTime = Date.now() - startTime;
      logger.debug(`Streaming completed in ${completionTime}ms, generated ${totalTokensGenerated} tokens`);
      
      // Finalize the streaming session with accounting
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
    
    // Clean up timeout
    clearTimeout(timeout);
    
    // Attempt to abort the streaming session
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
    
    // Write error to stream and end
    stream.write(`event: error\ndata: ${JSON.stringify({ 
      error: error.message || 'Stream processing error',
      code: error.code || 'STREAM_ERROR'
    })}\n\n`);
    stream.end();
  }
  
  return stream;
};