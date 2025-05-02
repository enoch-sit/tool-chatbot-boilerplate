import { Request, Response } from 'express';
import ChatSession from '../models/chat-session.model';
import { initializeStreamingSession, streamResponse } from '../services/streaming.service';
import { ObservationManager } from '../services/observation.service';
import logger from '../utils/logger';
import config from '../config/config';

// Create a new chat session
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
    
    // Create new session
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

// Get chat session details
export const getChatSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    
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

// List chat sessions for a user
export const listChatSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const skip = (page - 1) * limit;
    
    const sessions = await ChatSession.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id title createdAt updatedAt modelId metadata');
    
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

// Delete a chat session
export const deleteChatSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    
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

// Send a message in non-streaming mode
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    const { message, modelId } = req.body;
    
    // Find the chat session
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    session.messages.push(userMessage);
    session.updatedAt = new Date();
    
    // Update model ID if provided
    if (modelId) {
      session.modelId = modelId;
    }
    
    await session.save();
    
    // TODO: Implement non-streaming response generation
    // This would make a synchronous call to Bedrock and wait for the complete response
    
    return res.status(200).json({
      message: 'Message added successfully',
      sessionId
    });
  } catch (error:any) {
    logger.error('Error sending message:', error);
    return res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// Get messages for a session
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    
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

// Stream chat response
export const streamChatResponse = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.params.sessionId;
  const { message, modelId } = req.body;
  
  // Observation manager to handle supervisor observers
  const observationManager = ObservationManager.getInstance();
  
  try {
    // Find chat session
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Verify no active streaming session for this chat
    if (session.metadata?.activeStreamingSession) {
      return res.status(400).json({ message: 'This chat session already has an active streaming session' });
    }
    
    // Add user message to session
    const userMessage = {
      role: 'user',
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
    
    // Prepare messages for Bedrock
    const messageHistory = session.messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Initialize streaming session with accounting
    const authHeader = req.headers.authorization || '';
    const streamSession = await initializeStreamingSession(
      userId!, 
      messageHistory,
      selectedModel,
      authHeader
    );
    
    // Update session with streaming session ID
    session.metadata.streamingSessionId = streamSession.sessionId;
    await session.save();
    
    // Log streaming start
    logger.info(`Starting streaming session ${streamSession.sessionId} for chat ${sessionId}`);
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Add CORS headers if needed
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.flushHeaders();
    
    // Create and register a placeholder for the assistant's response
    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    session.messages.push(assistantMessage);
    await session.save();
    
    // Create and send the stream
    const responseStream = await streamResponse(
      userId!,
      streamSession.sessionId,
      messageHistory,
      selectedModel,
      authHeader
    );
    
    // Register this stream with the observation manager
    observationManager.registerStream(sessionId, responseStream);
    
    // Pipe the stream to the response
    responseStream.pipe(res);
    
    // Collect the full response to save later
    let fullResponse = '';
    
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
    
    // Handle stream close
    responseStream.on('end', async () => {
      try {
        // Update the assistant message with the complete response
        logger.info(`Completed streaming session for chat ${sessionId}`);
        
        // Find the session again to get the latest state
        const updatedSession = await ChatSession.findById(sessionId);
        if (updatedSession) {
          // Update the last message (assistant's response)
          const lastIndex = updatedSession.messages.length - 1;
          if (lastIndex >= 0 && updatedSession.messages[lastIndex].role === 'assistant') {
            updatedSession.messages[lastIndex].content = fullResponse;
          }
          
          // Update metadata
          updatedSession.metadata = updatedSession.metadata || {};
          updatedSession.metadata.activeStreamingSession = false;
          
          await updatedSession.save();
        }
      } catch (error:any) {
        logger.error('Error updating session after stream end:', error);
      }
    });
    
    // Handle client disconnect
    req.on('close', () => {
      logger.info(`Client disconnected from stream for session ${sessionId}`);
      
      // Attempt to clean up
      responseStream.unpipe(res);
      
      // Note: The stream will still continue processing until completion
      // This allows the response to still be saved to the database
    });
    
  } catch (error:any) {
    logger.error('Streaming error:', error);
    
    // Clean up the session's streaming status
    try {
      if (session) {
        session.metadata.activeStreamingSession = false;
        await session.save();
      }
    } catch (cleanupError) {
      logger.error('Error cleaning up session after streaming error:', cleanupError);
    }
    
    // If headers are already sent, we're in SSE mode
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ 
        error: error.message || 'Unknown streaming error'
      })}\n\n`);
      res.end();
    } else {
      // Otherwise send a normal error response
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

// Update chat with stream response
export const updateChatWithStreamResponse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId;
    const { completeResponse, streamingSessionId, tokensUsed } = req.body;
    
    // Find chat session
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    // Verify this is the right streaming session
    if (session.metadata?.streamingSessionId !== streamingSessionId) {
      return res.status(400).json({ 
        message: 'Streaming session ID mismatch'
      });
    }
    
    // Find the last message (which should be the assistant's response)
    const lastIndex = session.messages.length - 1;
    if (lastIndex < 0 || session.messages[lastIndex].role !== 'assistant') {
      return res.status(400).json({ 
        message: 'Last message in session is not from assistant'
      });
    }
    
    // Update the message content
    session.messages[lastIndex].content = completeResponse;
    
    // Update metadata
    session.metadata = session.metadata || {};
    session.metadata.lastTokensUsed = tokensUsed;
    session.metadata.totalTokensUsed = (session.metadata.totalTokensUsed || 0) + tokensUsed;
    session.metadata.activeStreamingSession = false;
    session.updatedAt = new Date();
    
    await session.save();
    
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

// Observe an active session (for supervisors/monitoring)
export const observeSession = async (req: Request, res: Response) => {
  try {
    const supervisorId = req.user?.userId;
    const role = req.user?.role;
    const sessionId = req.params.sessionId;
    
    // Check if user has permission to observe
    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to observe sessions' });
    }
    
    // Get the observation manager and check if the session is active
    const observationManager = ObservationManager.getInstance();
    const isStreamActive = observationManager.isStreamActive(sessionId);
    
    if (!isStreamActive) {
      return res.status(404).json({ message: 'No active streaming session found for observation' });
    }
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Send initial observer connected message
    res.write(`event: observer\ndata: ${JSON.stringify({ 
      message: 'Observer connected' 
    })}\n\n`);
    
    // Register this observer to receive stream events
    const unsubscribe = observationManager.addObserver(sessionId, (data) => {
      res.write(data);
    });
    
    // Handle client disconnect
    req.on('close', () => {
      logger.info(`Observer ${supervisorId} disconnected from session ${sessionId}`);
      unsubscribe();
    });
    
  } catch (error:any) {
    logger.error('Error setting up observation:', error);
    
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ 
        error: 'Error setting up observation'
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ message: 'Error setting up observation', error: error.message });
    }
  }
};