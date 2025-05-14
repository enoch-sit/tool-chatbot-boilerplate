/**
 * Chat Controller Module
 * 
 * This module provides the business logic for the chat API endpoints.
 * It handles chat session management, message processing, streaming responses,
 * and supervisor monitoring capabilities.
 * 
 * Core responsibilities:
 * - Managing chat sessions (create, retrieve, list, delete)
 * - Processing and storing messages
 * - Streaming AI responses in real-time
 * - Handling supervisor observation functionality
 * - Enforcing permissions and access control
 */
import { Request, Response } from 'express';
import ChatSession from '../models/chat-session.model';
import { initializeStreamingSession, streamResponse } from '../services/streaming.service';
import CreditService from '../services/credit.service';
import { ObservationManager } from '../services/observation.service';
import logger from '../utils/logger';
import config from '../config/config';
import { 
  BedrockRuntimeClient, 
  InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime';

// Define types for message content
interface MessageContent {
  text: string;
  [key: string]: any; // Allow for additional properties
}

interface ChatMessage {
  role: string;
  content: string | MessageContent | MessageContent[];
}

// Initialize AWS Bedrock client
const bedrockClient = new BedrockRuntimeClient({ 
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  }
});

/**
 * Create Chat Session
 * 
 * Creates a new chat conversation for a user with optional initial message.
 * The session is initialized with a system message defining the AI assistant's role.
 * 
 * Request Body:
 * - title: Optional custom title for the chat session
 * - initialMessage: Optional first user message to start the conversation
 * - modelId: Optional AI model ID to use for this session
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 201 with session details on success, error response otherwise
 */
export const createChatSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { title, initialMessage, modelId = config.defaultModelId } = req.body;
    
    // Create initial messages array with system message
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.',
        timestamp: new Date()
      }
    ];
    
    // Add initial user message if provided
    if (initialMessage) {
      messages.push({
        role: 'user',
        content: initialMessage,
        timestamp: new Date()
      });
    }
    
    // Create new session with metadata for tracking and analytics
    const session = new ChatSession({
      userId,
      title: title || 'New Chat',
      messages,
      modelId,
      metadata: {
        source: req.body.source || 'web',
        userAgent: req.headers['user-agent']
      }
    });
    
    await session.save();
    
    return res.status(201).json({
      sessionId: session._id,
      title: session.title,
      createdAt: session.createdAt
    });
  } catch (error:any) {
    logger.error('Error creating chat session:', error);
    return res.status(500).json({ message: 'Failed to create chat session', error: error.message });
  }
};

/**
 * Get Chat Session
 * 
 * Retrieves the details of a specific chat session including
 * all messages and metadata. Limited to sessions owned by the
 * requesting user for security.
 * 
 * URL Parameters:
 * - sessionId: The unique identifier of the chat session
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with full session details on success, error response otherwise
 */
export const getChatSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    
    // Retrieve session with ownership verification
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    return res.status(200).json({
      sessionId: session._id,
      title: session.title,
      messages: session.messages,
      modelId: session.modelId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata
    });
  } catch (error:any) {
    logger.error('Error retrieving chat session:', error);
    return res.status(500).json({ message: 'Failed to retrieve chat session', error: error.message });
  }
};

/**
 * List Chat Sessions
 * 
 * Retrieves a paginated list of all chat sessions belonging
 * to the requesting user, sorted by most recently updated.
 * 
 * Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Number of sessions per page (default: 20)
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with sessions list and pagination info, error response otherwise
 */
export const listChatSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const skip = (page - 1) * limit;
    
    // Retrieve paginated list of sessions
    const sessions = await ChatSession.find({ userId })
      .sort({ updatedAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .select('_id title createdAt updatedAt modelId metadata'); // Exclude message content for efficiency
    
    // Get total count for pagination
    const total = await ChatSession.countDocuments({ userId });
    
    return res.status(200).json({
      sessions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit
      }
    });
  } catch (error:any) {
    logger.error('Error listing chat sessions:', error);
    return res.status(500).json({ message: 'Failed to list chat sessions', error: error.message });
  }
};

/**
 * Delete Chat Session
 * 
 * Permanently removes a chat session and all its messages.
 * Limited to sessions owned by the requesting user.
 * 
 * URL Parameters:
 * - sessionId: The unique identifier of the chat session
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with success message on deletion, error response otherwise
 */
export const deleteChatSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    
    // Delete session with ownership verification
    const session = await ChatSession.findOneAndDelete({ _id: sessionId, userId });
    
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    return res.status(200).json({
      message: 'Chat session deleted successfully',
      sessionId
    });
  } catch (error:any) {
    logger.error('Error deleting chat session:', error);
    return res.status(500).json({ message: 'Failed to delete chat session', error: error.message });
  }
};

/**
 * Send Message (Non-streaming)
 * 
 * Adds a user message to a chat session and generates a non-streaming AI response.
 * This implementation checks credits before processing and records usage afterwards.
 * 
 * URL Parameters:
 * - sessionId: The unique identifier of the chat session
 * 
 * Request Body:
 * - message: The user's message content
 * - modelId: Optional AI model to use for this message
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with success message and AI response, error response otherwise
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    const { message, modelId } = req.body;
    const authHeader = req.headers.authorization || '';
    
    // Find chat session with ownership verification
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Calculate estimated required credits for this operation
    const selectedModel = modelId || session.modelId || config.defaultModelId;
    const requiredCredits = await CreditService.calculateRequiredCredits(
      message,
      selectedModel,
      authHeader
    );
    
    // Check if user has sufficient credits
    const hasSufficientCredits = await CreditService.checkUserCredits(
      userId!,
      requiredCredits,
      authHeader
    );
    
    if (!hasSufficientCredits) {
      return res.status(402).json({
        message: 'Insufficient credits to process message',
        error: 'INSUFFICIENT_CREDITS'
      });
    }
    
    // Add user message to the session
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    
    session.messages.push(userMessage);
    session.updatedAt = new Date();
    
    // Update model ID if provided
    if (modelId) {
      session.modelId = modelId;
    }
    
    // Prepare message history for the AI model in the correct format
    const messageHistory = session.messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Format the prompt based on model type
    let promptBody;
    
    if (selectedModel.includes('anthropic')) {
      // Format for Anthropic Claude models
      promptBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: messageHistory
      };
    } else if (selectedModel.includes('amazon.titan')) {
      // Format for Amazon's Titan models
      promptBody = {
        inputText: messageHistory.map(m => `${m.role}: ${m.content}`).join('\n'),
        textGenerationConfig: {
          maxTokenCount: 2000,
          temperature: 0.7,
          topP: 0.9
        }
      };
    } else if (selectedModel.includes('amazon.nova')) {
      // Format for Amazon's Nova models
      const formattedMessages = messageHistory.map(m => {
        // Properly handle different types of content
        let textContent: string;
        if (typeof m.content === 'string') {
          textContent = m.content;
        } else if (m.content && typeof m.content === 'object') {
          // Handle object or array content safely
          const contentObj = m.content as any;
          textContent = contentObj.text || 
                       (contentObj.toString ? contentObj.toString() : JSON.stringify(contentObj));
        } else {
          textContent = String(m.content || '');
        }
        
        return {
          role: m.role,
          content: [{
            text: textContent
          }]
        };
      });
      
      promptBody = {
        inferenceConfig: {
          max_new_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9
        },
        messages: formattedMessages
      };
    } else if (selectedModel.includes('meta.llama')) {
      // Format for Meta's Llama models
      promptBody = {
        prompt: messageHistory.map(m => `${m.role}: ${m.content}`).join('\n'),
        temperature: 0.7,
        top_p: 0.9,
        max_gen_len: 2000
      };
    } else {
      // Default format (Claude-compatible)
      promptBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: messageHistory
      };
    }
    
    logger.info(`Processing non-streaming request for user ${userId} with model ${selectedModel}`);
    
    // Create the command to invoke the model
    const command = new InvokeModelCommand({
      modelId: selectedModel,
      body: JSON.stringify(promptBody),
      contentType: 'application/json',
      accept: 'application/json'
    });
    
    // Send the request to AWS Bedrock and wait for the complete response
    const startTime = Date.now();
    const bedrockResponse = await bedrockClient.send(command);
    const completionTime = Date.now() - startTime;
    
    // Parse the response
    let responseContent = '';
    let tokensUsed = 0;
    
    if (bedrockResponse.body) {
      const responseBody = JSON.parse(
        new TextDecoder().decode(bedrockResponse.body)
      );
      
      // Extract response content based on model
      if (selectedModel.includes('anthropic')) {
        responseContent = responseBody.content?.[0]?.text || '';
      } else if (selectedModel.includes('amazon.titan')) {
        responseContent = responseBody.results?.[0]?.outputText || '';
      } else if (selectedModel.includes('amazon.nova')) {
        responseContent = responseBody.results?.[0]?.outputText || '';
      } else if (selectedModel.includes('meta.llama')) {
        responseContent = responseBody.generation || '';
      }
      
      // Estimate token usage (actual tokens not available in non-streaming response)
      tokensUsed = Math.ceil((message.length + responseContent.length) / 4);
    }
    
    // Add AI response to the session
    const assistantMessage = {
      role: 'assistant' as const,
      content: responseContent,
      timestamp: new Date()
    };
    
    session.messages.push(assistantMessage);
    
    // Update session metadata with token usage statistics
    session.metadata = session.metadata || {};
    session.metadata.lastTokensUsed = tokensUsed;
    session.metadata.totalTokensUsed = (session.metadata.totalTokensUsed || 0) + tokensUsed;
    
    await session.save();
    
    // Record usage with accounting service
    await CreditService.recordChatUsage(
      userId!,
      selectedModel,
      tokensUsed,
      authHeader
    );
    
    logger.debug(`Non-streaming chat completed in ${completionTime}ms, used ~${tokensUsed} tokens`);
    
    return res.status(200).json({
      message: 'Message processed successfully',
      sessionId,
      response: responseContent,
      tokensUsed
    });
  } catch (error:any) {
    logger.error('Error processing non-streaming message:', error);
    return res.status(500).json({ message: 'Failed to process message', error: error.message });
  }
};

/**
 * Get Messages
 * 
 * Retrieves all messages from a specific chat session.
 * Limited to sessions owned by the requesting user.
 * 
 * URL Parameters:
 * - sessionId: The unique identifier of the chat session
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with array of messages, error response otherwise
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    
    // Retrieve session with ownership verification
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    return res.status(200).json({
      messages: session.messages
    });
  } catch (error:any) {
    logger.error('Error retrieving messages:', error);
    return res.status(500).json({ message: 'Failed to retrieve messages', error: error.message });
  }
};

/**
 * Stream Chat Response
 * 
 * The core method for real-time AI interactions. It:
 * 1. Adds the user's message to the session
 * 2. Initializes a streaming session with the accounting service
 * 3. Sets up a streaming connection with AWS Bedrock
 * 4. Sends real-time chunks to the client via SSE
 * 5. Registers the stream for potential supervisor observation
 * 6. Saves the complete response to the database when finished
 * 
 * URL Parameters:
 * - sessionId: The unique identifier of the chat session
 * 
 * Request Body:
 * - message: The user's message content
 * - modelId: Optional AI model to use for this response
 * 
 * @param req - Express request object (with authorization header for accounting service)
 * @param res - Express response object (used as SSE stream to client)
 */
export const streamChatResponse = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.params.sessionId;
  const { message, modelId } = req.body;
  
  // Get singleton observation manager for supervisor monitoring
  const observationManager = ObservationManager.getInstance();
  
  // Declare session variable at function scope level for error handling
  let session;
  
  try {
    // Find chat session with ownership verification
    session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Prevent multiple simultaneous streaming sessions for the same chat
    if (session.metadata?.activeStreamingSession) {
      return res.status(400).json({ message: 'This chat session already has an active streaming session' });
    }
    
    // Add user message to the session
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    session.messages.push(userMessage);
    
    // Update model if specified
    const selectedModel = modelId || session.modelId;
    if (modelId && modelId !== session.modelId) {
      session.modelId = modelId;
    }
    
    // Mark session as having an active streaming session
    session.metadata = session.metadata || {};
    session.metadata.activeStreamingSession = true;
    await session.save();
    
    // Prepare message history for the AI model in the correct format
    const messageHistory = session.messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Initialize streaming session with the accounting service
    // This ensures the user has sufficient credits and creates a billing record
    const authHeader = req.headers.authorization || '';
    const streamSession = await initializeStreamingSession(
      userId!, 
      messageHistory,
      selectedModel,
      authHeader
    );
    
    // Update session with streaming session ID for tracking
    session.metadata.streamingSessionId = streamSession.sessionId;
    await session.save();
    
    // Log streaming start for monitoring and debugging
    logger.info(`Starting streaming session ${streamSession.sessionId} for chat ${sessionId}`);
    
    /**
     * Set up Server-Sent Events (SSE) headers
     * 
     * These headers configure the response as a real-time
     * event stream that can push data to the client as it arrives.
     */
    // Set streaming session ID header FIRST before any other headers
    if (streamSession.sessionId) {
      logger.debug(`Setting streaming session ID header: ${streamSession.sessionId}`);
      res.setHeader('X-Streaming-Session-Id', streamSession.sessionId);
    } else {
      logger.error('Missing streaming session ID when trying to set header');
    }
    
    // Add CORS headers if needed for cross-origin requests
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'X-Streaming-Session-Id');
    }
    
    // Then set the standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Finally flush headers to send them to the client
    res.flushHeaders();
    
    // Create a placeholder for the assistant's response in the database
    // This will be updated with the complete response when streaming ends
    const assistantMessage = {
      role: 'assistant' as const,
      content: ' ', // Using a space instead of empty string to satisfy validation
      timestamp: new Date()
    };
    session.messages.push(assistantMessage);
    await session.save();
    
    /**
     * Create and initiate the streaming response
     * 
     * This calls the streaming service to establish a connection with AWS Bedrock
     * and start receiving chunks of the AI response in real-time.
     */
    const responseStream = await streamResponse(
      streamSession.sessionId,
      messageHistory,
      selectedModel,
      authHeader
    );
    
    /**
     * Register stream with observation manager
     * 
     * This makes the stream available for supervisors to observe,
     * enabling real-time monitoring of conversations.
     */
    observationManager.registerStream(sessionId, responseStream);
    
    // Pipe the stream directly to the client response
    responseStream.pipe(res);
    
    // Collect the full response to save to the database when complete
    let fullResponse = '';
    
    /**
     * Process streaming data chunks
     * 
     * As data arrives from the AI model, parse each chunk to extract
     * the text content and accumulate the complete response.
     */
    responseStream.on('data', (data) => {
      const sseData = data.toString();
      
      // Extract content from SSE format (event: chunk\ndata: {...})
      if (sseData.includes('event: chunk')) {
        try {
          const jsonStr = sseData.split('data: ')[1].trim();
          const chunkData = JSON.parse(jsonStr);
          if (chunkData.text) {
            fullResponse += chunkData.text;
          }
        } catch (parseError) {
          logger.error('Error parsing SSE chunk:', parseError);
        }
      }
    });
    
    /**
     * Handle stream completion
     * 
     * When the stream ends, update the database with the complete
     * AI response and reset the streaming status flags.
     */
    responseStream.on('end', async () => {
      try {
        // Log completion for monitoring
        logger.info(`Completed streaming session for chat ${sessionId}`);
        
        // Find the session again to get the latest state
        const updatedSession = await ChatSession.findById(sessionId);
        if (updatedSession) {
          // Update the last message (assistant's response) with complete text
          const lastIndex = updatedSession.messages.length - 1;
          if (lastIndex >= 0 && updatedSession.messages[lastIndex].role === 'assistant') {
            updatedSession.messages[lastIndex].content = fullResponse;
          }
          
          // Mark streaming as inactive
          updatedSession.metadata = updatedSession.metadata || {};
          updatedSession.metadata.activeStreamingSession = false;
          
          await updatedSession.save();
        }
      } catch (error:any) {
        logger.error('Error updating session after stream end:', error);
      }
    });
    
    /**
     * Handle client disconnect
     * 
     * If the client disconnects before the stream completes,
     * perform cleanup but allow the stream to finish processing
     * so the response can still be saved to the database.
     */
    req.on('close', () => {
      logger.info(`Client disconnected from stream for session ${sessionId}`);
      
      // Disconnect response stream from the HTTP response
      responseStream.unpipe(res);
      
      // Note: The stream will still continue processing until completion
      // This allows the response to still be saved to the database
    });
    
  } catch (error:any) {
    logger.error('Streaming error:', error);
    
    /**
     * Clean up streaming status on error
     * 
     * If an error occurs, ensure the session is marked as not streaming
     * to prevent it from being stuck in a streaming state.
     */
    try {
      if (session) {
        session.metadata.activeStreamingSession = false;
        await session.save();
      }
    } catch (cleanupError) {
      logger.error('Error cleaning up session after streaming error:', cleanupError);
    }
    
    /**
     * Send appropriate error response
     * 
     * Handle errors differently based on whether we've already
     * started sending the SSE stream or not.
     */
    if (res.headersSent) {
      // If we're already streaming, send an error event
      res.write(`event: error\ndata: ${JSON.stringify({ 
        error: error.message || 'Unknown streaming error'
      })}\n\n`);
      res.end();
    } else {
      // Otherwise send a standard error response
      if (error.message === 'Insufficient credits for streaming') {
        return res.status(402).json({
          message: 'Insufficient credits to start streaming session',
          error: 'INSUFFICIENT_CREDITS'
        });
      }
      
      res.status(500).json({ 
        message: 'Error streaming chat response', 
        error: error.message 
      });
    }
  }
};

/**
 * Update Chat with Stream Response
 * 
 * Updates a chat session with the complete response from a streaming session.
 * This endpoint is used as a fallback mechanism to ensure the response is saved
 * if the automatic database update in the streaming endpoint fails.
 * 
 * URL Parameters:
 * - sessionId: The unique identifier of the chat session
 * 
 * Request Body:
 * - completeResponse: The complete AI-generated text
 * - streamingSessionId: ID of the streaming session for verification
 * - tokensUsed: Number of tokens consumed by this interaction
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with success message, error response otherwise
 */
export const updateChatWithStreamResponse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    const { completeResponse, streamingSessionId, tokensUsed } = req.body;
    
    // Add request debugging
    logger.debug(`Update request for session ${sessionId}:
      - userId: ${userId}
      - streamingSessionId: ${streamingSessionId}
      - tokensUsed: ${tokensUsed}
      - responseLength: ${completeResponse?.length || 0}
    `);

    // Attempt to retrieve the session up to 3 times with progressively longer waits
    // This helps handle race conditions where the DB may not have been updated yet
    let session = null;
    let latestError = null;
    const maxRetries = 3;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        // Find chat session with ownership verification
        session = await ChatSession.findOne({ _id: sessionId, userId });
        
        if (session) {
          // If we found the session and it has metadata with streamingSessionId, break the retry loop
          if (session.metadata?.streamingSessionId) {
            break;
          } else {
            logger.debug(`Session found but missing streamingSessionId - retry ${retry + 1}/${maxRetries}`);
          }
        } else {
          logger.debug(`Session not found - retry ${retry + 1}/${maxRetries}`);
        }
        
        // Only wait and try again if this isn't the last attempt
        if (retry < maxRetries - 1) {
          // Progressive backoff - wait longer between each retry
          const delayMs = 500 * Math.pow(2, retry); // 500ms, 1000ms, 2000ms
          logger.debug(`Waiting ${delayMs}ms before retry ${retry + 2}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err) {
        latestError = err;
        logger.error(`Error retrieving session on attempt ${retry + 1}:`, err);
      }
    }
    
    // After all retries, check if we have a valid session
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found', error: latestError instanceof Error ? latestError.message : String(latestError) });
    }
    
    // Super detailed comparison with optional chaining and fallbacks
    const storedId = (session.metadata?.streamingSessionId || '').toString().trim().toLowerCase();
    const providedId = (streamingSessionId || '').toString().trim().toLowerCase();
    
    // Enhanced detailed logging
    logger.debug(`Session ID comparison details:
      - Session metadata: ${JSON.stringify(session.metadata || {})}
      - Stored ID (raw): "${session.metadata?.streamingSessionId}"
      - Provided ID (raw): "${streamingSessionId}"
      - Stored ID (normalized): "${storedId}"
      - Provided ID (normalized): "${providedId}"
      - Exact match: ${session.metadata?.streamingSessionId === streamingSessionId}
      - Normalized match: ${storedId === providedId}
    `);

    // Special case: First time the ID is being set
    if (!storedId && providedId) {
      logger.debug(`No stored ID found, but client provided a valid ID. Accepting update.`);
      // We'll accept the client's ID and set it in the database
      session.metadata = session.metadata || {};
      session.metadata.streamingSessionId = streamingSessionId;
    } 
    // Normal case: Careful comparison that handles undefined, null, and other edge cases
    else if (!providedId || !storedId || storedId !== providedId) {
      return res.status(400).json({ 
        message: 'Streaming session ID mismatch',
        details: {
          expected: storedId || '(no stored ID)',
          received: providedId || '(no provided ID)'
        }
      });
    }
    
    // Verify the last message is from the assistant
    const lastIndex = session.messages.length - 1;
    if (lastIndex < 0 || session.messages[lastIndex].role !== 'assistant') {
      return res.status(400).json({ 
        message: 'Last message in session is not from assistant'
      });
    }
    
    // Update the message content with the complete response
    session.messages[lastIndex].content = completeResponse || ' '; // Ensure not empty
    
    // Update session metadata with token usage and status
    session.metadata = session.metadata || {};
    session.metadata.lastTokensUsed = tokensUsed;
    session.metadata.totalTokensUsed = (session.metadata.totalTokensUsed || 0) + tokensUsed;
    session.metadata.activeStreamingSession = false;
    session.updatedAt = new Date();
    
    await session.save();
    
    logger.debug(`Successfully updated chat session ${sessionId} with streaming response`);
    
    return res.status(200).json({
      message: 'Chat session updated successfully',
      sessionId,
      tokensUsed
    });
  } catch (error:any) {
    logger.error('Error updating chat with stream response:', error);
    return res.status(500).json({ 
      message: 'Error updating chat session', 
      error: error.message 
    });
  }
};

/**
 * Observe Session
 * 
 * Allows supervisors and admins to monitor an active chat session in real-time.
 * Sets up a second SSE stream that receives the same data as the primary user.
 * Used for quality assurance, training, and monitoring purposes.
 * 
 * URL Parameters:
 * - sessionId: The unique identifier of the chat session to observe
 * 
 * @param req - Express request object
 * @param res - Express response object (used as SSE stream to the supervisor)
 * @returns SSE stream of the observed session, or error response if unavailable
 */
export const observeSession = async (req: Request, res: Response) => {
  try {
    const supervisorId = req.user?.userId;
    const role = req.user?.role;
    const sessionId = req.params.sessionId;
    
    // Permission check: only supervisors and admins can observe sessions
    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to observe sessions' });
    }
    
    // Get the observation manager and check if the session is available
    const observationManager = ObservationManager.getInstance();
    const isStreamActive = observationManager.isStreamActive(sessionId);
    
    // If session isn't active, return helpful error with available sessions list
    if (!isStreamActive) {
      logger.info(`Supervisor ${supervisorId} attempted to observe inactive session ${sessionId}`);
      return res.status(404).json({ 
        message: 'No active streaming session found for observation',
        errorCode: 'SESSION_NOT_ACTIVE',
        availableSessions: observationManager.getActiveSessionIds().length > 0 
          ? observationManager.getActiveSessionIds() 
          : undefined
      });
    }
    
    // Log the observation for audit trail
    logger.supervisorAction(`Supervisor ${supervisorId} started observing session ${sessionId}`);
    
    /**
     * Set up SSE stream for supervisor
     * 
     * Configure headers for Server-Sent Events to stream
     * the observed conversation to the supervisor in real-time.
     */
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Send initial connection confirmation event
    res.write(`event: observer\ndata: ${JSON.stringify({ 
      message: 'Observer connected',
      sessionId: sessionId,
      observerId: supervisorId,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    /**
     * Register the supervisor as an observer
     * 
     * This function returns an unsubscribe function that will be used
     * when the supervisor disconnects to clean up resources.
     */
    const unsubscribe = observationManager.addObserver(sessionId, (data) => {
      res.write(data);
    });
    
    // Handle supervisor disconnect
    req.on('close', () => {
      logger.supervisorAction(`Supervisor ${supervisorId} disconnected from session ${sessionId}`);
      unsubscribe();
    });
    
  } catch (error:any) {
    logger.error('Error setting up observation:', error);
    
    // Send appropriate error response based on connection state
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ 
        error: 'Error setting up observation',
        message: error.message
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ 
        message: 'Error setting up observation', 
        error: error.message 
      });
    }
  }
};

/**
 * Supervisor Get Chat Session
 * 
 * Allows supervisors and admins to retrieve the details of any user's chat session.
 * Used for monitoring user experiences and addressing support issues.
 * 
 * URL Parameters:
 * - userId: ID of the user whose session is being accessed
 * - sessionId: The unique identifier of the chat session
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with session details, error response otherwise
 */
export const supervisorGetChatSession = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const targetUserId = req.params.userId;
    const sessionId = req.params.sessionId;
    
    // Permission check: only supervisors and admins can access
    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to view user sessions' });
    }
    
    // Find the session by both user ID and session ID
    const session = await ChatSession.findOne({ _id: sessionId, userId: targetUserId });
    
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Log the access for audit trail
    logger.supervisorAction(`Supervisor ${req.user?.userId} accessed session ${sessionId} of user ${targetUserId}`);
    
    return res.status(200).json({
      sessionId: session._id,
      userId: session.userId,
      title: session.title,
      messages: session.messages,
      modelId: session.modelId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata
    });
  } catch (error:any) {
    logger.error('Error retrieving chat session as supervisor:', error);
    return res.status(500).json({ message: 'Failed to retrieve chat session', error: error.message });
  }
};

/**
 * Supervisor List Chat Sessions
 * 
 * Allows supervisors and admins to list all chat sessions for a specific user.
 * Used for user support and monitoring user activity patterns.
 * 
 * URL Parameters:
 * - userId: ID of the user whose sessions are being listed
 * 
 * Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Number of sessions per page (default: 20)
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with sessions list and pagination info, error response otherwise
 */
export const supervisorListChatSessions = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const targetUserId = req.params.userId;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const skip = (page - 1) * limit;
    
    // Permission check: only supervisors and admins can access
    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to list user sessions' });
    }
    
    // Get paginated sessions for the target user
    const sessions = await ChatSession.find({ userId: targetUserId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id userId title createdAt updatedAt modelId metadata');
    
    const total = await ChatSession.countDocuments({ userId: targetUserId });
    
    // Log the access for audit trail
    logger.supervisorAction(`Supervisor ${req.user?.userId} listed chat sessions for user ${targetUserId}`);
    
    return res.status(200).json({
      userId: targetUserId,
      sessions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit
      }
    });
  } catch (error:any) {
    logger.error('Error listing user chat sessions as supervisor:', error);
    return res.status(500).json({ message: 'Failed to list user sessions', error: error.message });
  }
};

/**
 * Search Users
 * 
 * Allows supervisors and admins to search for users based on various criteria
 * and see summary information about their chat sessions.
 * Used for finding specific users for support or monitoring purposes.
 * 
 * Query Parameters:
 * - query: Search term to match against user IDs, session titles, etc.
 * - page: Page number for pagination (default: 1)
 * - limit: Number of results per page (default: 20)
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200 with matching users and session counts, error response otherwise
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const { query } = req.query;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const skip = (page - 1) * limit;
    
    // Permission check: only supervisors and admins can search
    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to search users' });
    }
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Find users with exact matching IDs (highest priority matches)
    const exactMatches = await ChatSession.aggregate([
      { $match: { userId: query.toString() } },
      { $group: { _id: '$userId', sessionCount: { $sum: 1 } } }
    ]);
    
    // Find users with partial matches in sessions or metadata
    const partialMatches = await ChatSession.aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { 'metadata.source': { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $group: { _id: '$userId', sessionCount: { $sum: 1 } } }
    ]);
    
    // Combine results and remove duplicates
    const allUsers = [...exactMatches, ...partialMatches.filter(pm => 
      !exactMatches.some(em => em._id === pm._id)
    )];
    
    // Apply pagination to the results
    const paginatedUsers = allUsers.slice(skip, skip + limit);
    
    // Log the search for audit trail
    logger.supervisorAction(`Supervisor ${req.user?.userId} searched for users with query: ${query}`);
    
    return res.status(200).json({
      users: paginatedUsers,
      pagination: {
        total: allUsers.length,
        pages: Math.ceil(allUsers.length / limit),
        currentPage: page,
        perPage: limit
      }
    });
  } catch (error:any) {
    logger.error('Error searching users:', error);
    return res.status(500).json({ message: 'Failed to search users', error: error.message });
  }
};