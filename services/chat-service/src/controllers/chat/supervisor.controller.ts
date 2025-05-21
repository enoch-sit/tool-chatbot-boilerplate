import { Request, Response } from 'express';
import ChatSession from '../../models/chat-session.model';
import { ObservationManager } from '../../services/observation.service';
import logger from '../../utils/logger';
import { escapeRegExp } from './utils';

/**
 * Observe Session
 */
export const observeSession = async (req: Request, res: Response) => {
  try {
    const supervisorId = req.user?.userId;
    const role = req.user?.role;
    const sessionId = req.params.sessionId;

    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to observe sessions' });
    }

    const observationManager = ObservationManager.getInstance();
    const isStreamActive = observationManager.isStreamActive(sessionId);

    if (!isStreamActive) {
      logger.info(`Supervisor ${supervisorId} attempted to observe inactive session ${sessionId}`);
      return res.status(404).json({
        message: 'No active streaming session found for observation',
        errorCode: 'SESSION_NOT_ACTIVE',
        availableSessions: observationManager.getActiveSessionIds().length > 0
          ? observationManager.getActiveSessionIds()
          : undefined,
      });
    }

    logger.supervisorAction(`Supervisor ${supervisorId} started observing session ${sessionId}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`event: observer\ndata: ${JSON.stringify({
      message: 'Observer connected',
      sessionId: sessionId,
      observerId: supervisorId,
      timestamp: new Date().toISOString(),
    })}\n\n`);

    const unsubscribe = observationManager.addObserver(sessionId, (data) => {
      res.write(data);
    });

    req.on('close', () => {
      logger.supervisorAction(`Supervisor ${supervisorId} disconnected from session ${sessionId}`);
      unsubscribe();
    });

  } catch (error: any) {
    logger.error('Error setting up observation:', error);
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({
        error: 'Error setting up observation',
        message: error.message,
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({
        message: 'Error setting up observation',
        error: error.message,
      });
    }
  }
};

/**
 * Supervisor Get Chat Session
 */
export const supervisorGetChatSession = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const targetUserId = req.params.userId;
    const sessionId = req.params.sessionId;

    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to view user sessions' });
    }

    const session = await ChatSession.findOne({
      _id: sessionId,
      $or: [
        { userId: targetUserId },
        { username: targetUserId },
      ],
    });

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    logger.supervisorAction(`Supervisor ${req.user?.userId} accessed session ${sessionId} of user ${targetUserId}`);
    return res.status(200).json({
      sessionId: session._id,
      userId: session.userId,
      username: session.username,
      title: session.title,
      messages: session.messages,
      modelId: session.modelId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata,
    });
  } catch (error: any) {
    logger.error('Error retrieving chat session as supervisor:', error);
    return res.status(500).json({ message: 'Failed to retrieve chat session', error: error.message });
  }
};

/**
 * Supervisor List Chat Sessions
 */
export const supervisorListChatSessions = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const targetUserId = req.params.userId;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const skip = (page - 1) * limit;

    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to list user sessions' });
    }

    const sessions = await ChatSession.find({
      $or: [
        { userId: targetUserId },
        { username: targetUserId },
      ],
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id userId username title createdAt updatedAt modelId metadata');

    const total = await ChatSession.countDocuments({
      $or: [
        { userId: targetUserId },
        { username: targetUserId },
      ],
    });

    logger.supervisorAction(`Supervisor ${req.user?.userId} listed chat sessions for user ${targetUserId}`);
    return res.status(200).json({
      userId: targetUserId,
      sessions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error: any) {
    logger.error('Error listing user chat sessions as supervisor:', error);
    return res.status(500).json({ message: 'Failed to list user sessions', error: error.message });
  }
};

/**
 * Search Users
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const { query } = req.query;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const skip = (page - 1) * limit;

    if (role !== 'admin' && role !== 'supervisor') {
      return res.status(403).json({ message: 'Insufficient permissions to search users' });
    }
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    let matchCondition;
    if (query === '*') {
      matchCondition = {};
      logger.info(`Supervisor ${req.user?.userId} performed a wildcard search (match all)`);
    } else {
      const safeQuery = escapeRegExp(query.toString());
      //logger.debug(`Original query: "${query}", escaped for regex: "${safeQuery}"`);

      const exactMatches = await ChatSession.aggregate([
        { $match: { userId: query.toString() } },
        { $group: { _id: '$userId', sessionCount: { $sum: 1 } } },
      ]);

      const partialMatches = await ChatSession.aggregate([
        {
          $match: {
            $or: [
              { title: { $regex: safeQuery, $options: 'i' } },
              { 'metadata.source': { $regex: safeQuery, $options: 'i' } },
            ],
          },
        },
        { $group: { _id: '$userId', sessionCount: { $sum: 1 } } },
      ]);

      const allUsers = [...exactMatches, ...partialMatches.filter(pm =>
        !exactMatches.some(em => em._id === pm._id)
      )];
      const paginatedUsers = allUsers.slice(skip, skip + limit);

      logger.supervisorAction(`Supervisor ${req.user?.userId} searched for users with query: ${query}`);
      return res.status(200).json({
        users: paginatedUsers,
        pagination: {
          total: allUsers.length,
          pages: Math.ceil(allUsers.length / limit),
          currentPage: page,
          perPage: limit,
        },
      });
    }

    // Handle wildcard search with the match all condition
    if (matchCondition !== undefined) {
      const allSessions = await ChatSession.aggregate([
        { $match: matchCondition },
        { $group: { _id: '$userId', sessionCount: { $sum: 1 } } }
      ]);
      const paginatedUsers = allSessions.slice(skip, skip + limit);
      return res.status(200).json({
        users: paginatedUsers,
        pagination: {
          total: allSessions.length,
          pages: Math.ceil(allSessions.length / limit),
          currentPage: page,
          perPage: limit
        }
      });
    }

  } catch (error: any) {
    logger.error('Error searching users:', error);
    return res.status(500).json({ message: 'Failed to search users', error: error.message });
  }
};
