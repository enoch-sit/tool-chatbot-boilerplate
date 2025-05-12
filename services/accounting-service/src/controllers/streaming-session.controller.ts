// src/controllers/streaming-session.controller.ts
import { Request, Response } from 'express';
import StreamingSessionService from '../services/streaming-session.service';

export class StreamingSessionController {
  /**
   * Initialize a new streaming session
   * POST /api/streaming-sessions/initialize
   */
  async initializeSession(req: Request, res: Response) {
    try {
      const { sessionId, modelId, estimatedTokens } = req.body;
      
      if (!sessionId || !modelId || !estimatedTokens) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const session = await StreamingSessionService.initializeSession({
        sessionId,
        userId: req.user.userId,
        modelId,
        estimatedTokens
      });
      
      return res.status(201).json({
        sessionId: session.sessionId,
        allocatedCredits: session.allocatedCredits,
        status: session.status
      });
    } catch (error: unknown) {
      console.error('Error initializing streaming session:', error);
      
      if (error instanceof Error && error.message === 'Insufficient credits for streaming session') {
        return res.status(402).json({ message: error.message });
      }
      
      return res.status(500).json({ message: 'Failed to initialize streaming session' });
    }
  }
  
  /**
   * Finalize a streaming session
   * POST /api/streaming-sessions/finalize
   */
  async finalizeSession(req: Request, res: Response) {
    try {
      const { sessionId, actualTokens, success = true } = req.body;
      
      if (!sessionId || !actualTokens) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const result = await StreamingSessionService.finalizeSession({
        sessionId,
        userId: req.user.userId,
        actualTokens,
        success
      });
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      console.error('Error finalizing streaming session:', error);
      return res.status(500).json({ message: 'Failed to finalize streaming session' });
    }
  }
  
  /**
   * Abort a streaming session
   * POST /api/streaming-sessions/abort
   */
  async abortSession(req: Request, res: Response) {
    try {
      const { sessionId, tokensGenerated = 0 } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const result = await StreamingSessionService.abortSession({
        sessionId,
        userId: req.user.userId,
        tokensGenerated
      });
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      console.error('Error aborting streaming session:', error);
      return res.status(500).json({ message: 'Failed to abort streaming session' });
    }
  }
  
  /**
   * Get active sessions for the current user
   * GET /api/streaming-sessions/active
   */
  async getActiveSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const sessions = await StreamingSessionService.getActiveSessions(req.user.userId);
      
      return res.status(200).json(sessions);
    } catch (error: unknown) {
      console.error('Error fetching active sessions:', error);
      return res.status(500).json({ message: 'Failed to fetch active sessions' });
    }
  }
  
  /**
   * Get active sessions for a specific user (supervisor/admin only)
   * GET /api/streaming-sessions/active/:userId
   */
  async getUserActiveSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Check if user is admin or supervisor
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const targetUserId = req.params.userId;
      
      if (!targetUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const sessions = await StreamingSessionService.getActiveSessions(targetUserId);
      
      return res.status(200).json(sessions);
    } catch (error: unknown) {
      console.error('Error fetching user active sessions:', error);
      return res.status(500).json({ message: 'Failed to fetch user active sessions' });
    }
  }
  
  /**
   * Get all active sessions in the system (admin only)
   * GET /api/streaming-sessions/active/all
   */
  async getAllActiveSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const sessions = await StreamingSessionService.getAllActiveSessions();
      
      return res.status(200).json(sessions);
    } catch (error: unknown) {
      console.error('Error fetching all active sessions:', error);
      return res.status(500).json({ message: 'Failed to fetch all active sessions' });
    }
  }
  
  /**
   * Get recent streaming sessions (active + recently completed)
   * GET /api/streaming-sessions/recent
   */
  async getRecentSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Admin or supervisor role required
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      // Parse minutes parameter
      const minutesAgo = req.query.minutes ? parseInt(req.query.minutes as string) : 5;
      
      const sessions = await StreamingSessionService.getRecentSessions(minutesAgo);
      
      return res.status(200).json({
        sessions,
        timestamp: new Date().toISOString(),
        filter: {
          minutes: minutesAgo,
        }
      });
    } catch (error: unknown) {
      console.error('Error fetching recent sessions:', error);
      return res.status(500).json({ message: 'Failed to fetch recent sessions' });
    }
  }
  
  /**
   * Get recent streaming sessions for a specific user
   * GET /api/streaming-sessions/recent/:userId
   */
  async getUserRecentSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Admin or supervisor role required
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const targetUserId = req.params.userId;
      
      if (!targetUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Parse minutes parameter
      const minutesAgo = req.query.minutes ? parseInt(req.query.minutes as string) : 5;
      
      const sessions = await StreamingSessionService.getUserRecentSessions(targetUserId, minutesAgo);
      
      return res.status(200).json({
        sessions,
        timestamp: new Date().toISOString(),
        filter: {
          userId: targetUserId,
          minutes: minutesAgo,
        }
      });
    } catch (error: unknown) {
      console.error('Error fetching user recent sessions:', error);
      return res.status(500).json({ message: 'Failed to fetch user recent sessions' });
    }
  }
}

export default new StreamingSessionController();