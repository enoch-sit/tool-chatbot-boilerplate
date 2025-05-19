// src/controllers/streaming-session.controller.ts
/**
 * Streaming Session Controller
 * 
 * Handles API endpoints related to AI text streaming sessions.
 * Manages initialization, finalization, and monitoring of streaming sessions,
 * which require special handling for credit allocation and reconciliation.
 * 
 * API Routes:
 * - POST /api/streaming-sessions/initialize - Initialize a streaming session
 * - POST /api/streaming-sessions/finalize - Finalize a streaming session
 * - POST /api/streaming-sessions/abort - Abort a streaming session
 * - GET /api/streaming-sessions/active - Get active sessions for current user
 * - GET /api/streaming-sessions/active/:userId - Get active sessions for a specific user (admin/supervisor)
 * - GET /api/streaming-sessions/active/all - Get all active sessions (admin only)
 * - GET /api/streaming-sessions/recent - Get recent sessions (admin/supervisor)
 * - GET /api/streaming-sessions/recent/:userId - Get recent sessions for a specific user (admin/supervisor)
 */
import { Request, Response } from 'express';
import StreamingSessionService from '../services/streaming-session.service';

export class StreamingSessionController {
  /**
   * Initialize a new streaming session
   * POST /api/streaming-sessions/initialize
   * 
   * Request body:
   * {
   *   "sessionId": string (required) - Unique identifier for the session
   *   "modelId": string (required) - ID of the AI model being used
   *   "estimatedTokens": number (required) - Estimated token usage
   * }
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 201 Created: { sessionId: string, allocatedCredits: number, status: string }
   *   - 400 Bad Request: If required fields are missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 402 Payment Required: If user has insufficient credits
   *   - 500 Server Error: If initialization fails
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
   * 
   * Request body:
   * {
   *   "sessionId": string (required) - ID of the session to finalize
   *   "actualTokens": number (required) - Actual tokens used in the session
   *   "success": boolean (optional, default true) - Whether the session was successful
   * }
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { sessionId: string, actualCredits: number, refund: number }
   *   - 400 Bad Request: If required fields are missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If finalization fails
   */
  async finalizeSession(req: Request, res: Response) {
    try {
      const { sessionId, actualTokens, success = true } = req.body;
      
      // Allow actualTokens to be 0, but not negative or non-numeric
      if (!sessionId || typeof actualTokens !== 'number' || actualTokens < 0) {
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
   * 
   * Request body:
   * {
   *   "sessionId": string (required) - ID of the session to abort
   *   "tokensGenerated": number (optional, default 0) - Tokens generated before abort
   * }
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { sessionId: string, partialCredits: number, refund: number }
   *   - 400 Bad Request: If sessionId is missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If abort fails
   */
  async abortSession(req: Request, res: Response) {
    try {
      const { sessionId, tokensGenerated = 0 } = req.body;
      
      // Allow tokensGenerated to be 0, but not negative or non-numeric
      if (!sessionId || typeof tokensGenerated !== 'number' || tokensGenerated < 0) {
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
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: Array of active session objects
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If retrieval fails
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
   * 
   * @param req Express request object with userId param
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: Array of active session objects for the user
   *   - 400 Bad Request: If userId is missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 403 Forbidden: If user lacks permission
   *   - 500 Server Error: If retrieval fails
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
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: Array of all active session objects
   *   - 403 Forbidden: If user lacks admin permission
   *   - 500 Server Error: If retrieval fails
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
   * 
   * Query parameters:
   * - minutes: number (optional, default 5) - Look back period in minutes
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { sessions: Array, timestamp: string, filter: Object }
   *   - 401 Unauthorized: If no user authenticated
   *   - 403 Forbidden: If user lacks permission
   *   - 500 Server Error: If retrieval fails
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
   * 
   * Query parameters:
   * - minutes: number (optional, default 5) - Look back period in minutes
   * 
   * @param req Express request object with userId param
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { sessions: Array, timestamp: string, filter: Object }
   *   - 400 Bad Request: If userId is missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 403 Forbidden: If user lacks permission
   *   - 500 Server Error: If retrieval fails
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