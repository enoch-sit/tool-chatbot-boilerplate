import { Request, Response } from 'express';
import ChatSession from '../../models/chat-session.model';
import logger from '../../utils/logger';
import config from '../../config/config';
import { ChatMessage } from './utils';

/**
 * Create Chat Session
 */
// 20250523_test_flow
export const createChatSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const username = req.headers['x-user-id'] as string || req.user?.username;
    const { title, initialMessage, modelId = config.defaultModelId } = req.body;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.',
        timestamp: new Date(),
      },
    ];

    // If initialMessage is provided, add it to the messages array
    if (initialMessage) {
      messages.push({
        role: 'user',
        content: initialMessage,
        timestamp: new Date(),
      });
    }

    // The userId field is required by the ChatSession schema.
    // If userId is undefined here (e.g., due to an authentication issue where req.user or req.user.userId is not set),
    // the session.save() call below will trigger a Mongoose ValidationError: "Path `userId` is required."
    const session = new ChatSession({
      userId,
      username: username,
      title: title || 'New Chat',
      messages,
      modelId,
      metadata: {
        source: req.body.source || 'web',
        userAgent: req.headers['user-agent'],
      },
    });

    await session.save();

    return res.status(201).json({
      sessionId: session._id,
      title: session.title,
      createdAt: session.createdAt,
    });
  } catch (error: any) {
    logger.error('Error creating chat session:', error);
    return res.status(500).json({ message: 'Failed to create chat session', error: error.message });
  }
};

/**
 * Get Chat Session
 */
// 20250523_test_flow
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
      metadata: session.metadata,
    });
  } catch (error: any) {
    logger.error('Error retrieving chat session:', error);
    return res.status(500).json({ message: 'Failed to retrieve chat session', error: error.message });
  }
};

/**
 * List Chat Sessions
 */
// 20250523_test_flow
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
        perPage: limit,
      },
    });
  } catch (error: any) {
    logger.error('Error listing chat sessions:', error);
    return res.status(500).json({ message: 'Failed to list chat sessions', error: error.message });
  }
};

/**
 * Delete Chat Session
 */
// 20250523_test_flow
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
      sessionId,
    });
  } catch (error: any) {
    logger.error('Error deleting chat session:', error);
    return res.status(500).json({ message: 'Failed to delete chat session', error: error.message });
  }
};
