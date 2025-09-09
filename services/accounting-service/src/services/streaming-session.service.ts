// src/services/streaming-session.service.ts
/**
 * Streaming Session Service
 * 
 * Manages streaming sessions for AI text generation.
 * Handles credit allocation, tracking, and finalization for streaming responses,
 * which require special handling to pre-allocate credits and then reconcile
 * actual usage when complete.
 */
import { Op } from 'sequelize';
import StreamingSession from '../models/streaming-session.model';
import CreditService from './credit.service';
import UsageService from './usage.service';

export class StreamingSessionService {
  /**
   * Initialize a streaming session and pre-allocate credits
   * 
   * @param {Object} params - Session initialization parameters
   * @param {string} params.sessionId - Unique ID for the streaming session
   * @param {string} params.userId - User ID who owns the session
   * @param {string} params.modelId - ID of the AI model being used
   * @param {number} params.estimatedTokens - Estimated number of tokens for the session
   * @returns {Promise<StreamingSession>} - The created streaming session record
   * @throws {Error} If there are insufficient credits or allocation fails
   */
  async initializeSession(params: {
    sessionId: string,
    userId: string,
    modelId: string,
    estimatedTokens: number
  }) {
    const { sessionId, userId, modelId, estimatedTokens } = params;
    
    // Calculate estimated credits
    const estimatedCredits = await CreditService.calculateCreditsForTokens(modelId, estimatedTokens);
    
    // Add buffer for streaming (20% extra)
    const creditBuffer = Math.ceil(estimatedCredits * 1.2);
    
    // Check if user has sufficient credits
    const hasSufficientCredits = await CreditService.checkUserCredits(userId, creditBuffer);
    
    if (!hasSufficientCredits) {
      throw new Error('Insufficient credits for streaming session');
    }
    
    // Pre-allocate credits
    const success = await CreditService.deductCredits(userId, creditBuffer);
    
    if (!success) {
      throw new Error('Failed to allocate credits for streaming session');
    }
    
    // Create streaming session record
    const session = await StreamingSession.create({
      sessionId,
      userId,
      modelId,
      estimatedCredits,
      allocatedCredits: creditBuffer,
      usedCredits: 0,
      status: 'active',
      startedAt: new Date()
    });
    
    return session;
  }
  
  /**
   * Finalize a streaming session with actual usage
   * Calculates actual credits used and refunds any excess allocation
   * 
   * @param {Object} params - Session finalization parameters
   * @param {string} params.sessionId - ID of the session to finalize
   * @param {string} params.userId - User ID who owns the session
   * @param {number} params.actualTokens - Actual number of tokens used
   * @param {boolean} [params.success=true] - Whether the session completed successfully
   * @returns {Promise<Object>} Object containing:
   *   - sessionId: ID of the finalized session
   *   - actualCredits: Credits actually used
   *   - refund: Credits refunded to the user
   * @throws {Error} If the session cannot be found or finalization fails
   */
  async finalizeSession(params: {
    sessionId: string,
    userId: string,
    actualTokens: number,
    success?: boolean
  }) {
    const { sessionId, userId, actualTokens, success = true } = params;
    
    // Find the streaming session
    const session = await StreamingSession.findOne({
      where: { sessionId, userId, status: 'active' }
    });
    
    if (!session) {
      throw new Error('Active streaming session not found');
    }
    
    // Calculate actual credits used
    const actualCredits = await CreditService.calculateCreditsForTokens(session.modelId, actualTokens);
    
    // Update session
    session.usedCredits = actualCredits;
    session.status = success ? 'completed' : 'failed';
    session.completedAt = new Date();
    await session.save();
    
    // Record usage
    await UsageService.recordUsage({
      userId,
      service: 'chat-streaming',
      operation: session.modelId,
      credits: actualCredits,
      metadata: {
        sessionId,
        tokens: actualTokens,
        streamingDuration: (session.completedAt.getTime() - session.startedAt.getTime()) / 1000
      }
    });
    
    // Refund unused credits if we allocated more than used
    if (actualCredits < session.allocatedCredits) {
      // Calculate refund amount
      const refundAmount = session.allocatedCredits - actualCredits;
      
      // Find a valid allocation to add the refund to
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Standard 30-day expiry
      
      await CreditService.allocateCredits({
        userId,
        credits: refundAmount,
        allocatedBy: 'system-refund',
        expiryDays: 30,
        notes: `Refund from streaming session ${sessionId}`
      });
    }
    
    return {
      sessionId,
      actualCredits,
      refund: actualCredits < session.allocatedCredits ? session.allocatedCredits - actualCredits : 0
    };
  }
  
  /**
   * Get active streaming sessions for a user
   * 
   * @param {string} userId - User ID to get sessions for
   * @returns {Promise<StreamingSession[]>} Array of active session records
   */
  async getActiveSessions(userId: string) {
    return StreamingSession.findAll({
      where: {
        userId,
        status: 'active'
      }
    });
  }
  
  /**
   * Get all active streaming sessions (admin only)
   * 
   * @returns {Promise<StreamingSession[]>} Array of all active session records
   */
  async getAllActiveSessions() {
    return StreamingSession.findAll({
      where: {
        status: 'active'
      }
    });
  }
  
  /**
   * Get recent streaming sessions (including recently completed)
   * This helps supervisors to catch sessions that completed very recently
   * 
   * @param {number} [minutesAgo=5] - Look back period in minutes
   * @returns {Promise<StreamingSession[]>} Array of recent session records
   */
  async getRecentSessions(minutesAgo = 5) {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesAgo);
    
    return StreamingSession.findAll({
      where: {
        [Op.or]: [
          { status: 'active' },
          {
            status: { [Op.in]: ['completed', 'failed'] },
            completedAt: { [Op.gt]: cutoffTime }
          }
        ]
      },
      order: [
        ['status', 'ASC'],  // Active sessions first
        ['completedAt', 'DESC']  // Most recently completed next
      ],
      limit: 50  // Limit to a reasonable number
    });
  }
  
  /**
   * Get recent sessions for a specific user
   * 
   * @param {string} userId - User ID to get sessions for
   * @param {number} [minutesAgo=5] - Look back period in minutes
   * @returns {Promise<StreamingSession[]>} Array of recent session records for the user
   */
  async getUserRecentSessions(userId: string, minutesAgo = 5) {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesAgo);
    
    return StreamingSession.findAll({
      where: {
        userId,
        [Op.or]: [
          { status: 'active' },
          {
            status: { [Op.in]: ['completed', 'failed'] },
            completedAt: { [Op.gt]: cutoffTime }
          }
        ]
      },
      order: [
        ['status', 'ASC'],
        ['completedAt', 'DESC']
      ],
      limit: 20
    });
  }
  
  /**
   * Abort a streaming session (for errors or timeouts)
   * Calculates credits for partial usage and refunds the rest
   * 
   * @param {Object} params - Session abort parameters
   * @param {string} params.sessionId - ID of the session to abort
   * @param {string} params.userId - User ID who owns the session
   * @param {number} [params.tokensGenerated=0] - Number of tokens generated before abort
   * @returns {Promise<Object>} Object containing:
   *   - sessionId: ID of the aborted session
   *   - partialCredits: Credits used for partial generation
   *   - refund: Credits refunded to the user
   * @throws {Error} If the session cannot be found or abort fails
   */
  async abortSession(params: {
    sessionId: string,
    userId: string,
    tokensGenerated?: number
  }) {
    const { sessionId, userId, tokensGenerated = 0 } = params;
    
    // Find the streaming session
    const session = await StreamingSession.findOne({
      where: { sessionId, userId, status: 'active' }
    });
    
    if (!session) {
      throw new Error('Active streaming session not found');
    }
    
    // Calculate partial credits used
    const partialCredits = await CreditService.calculateCreditsForTokens(
      session.modelId, 
      tokensGenerated
    );
    
    // Update session
    session.usedCredits = partialCredits;
    session.status = 'failed';
    session.completedAt = new Date();
    await session.save();
    
    // Record partial usage
    await UsageService.recordUsage({
      userId,
      service: 'chat-streaming-aborted',
      operation: session.modelId,
      credits: partialCredits,
      metadata: {
        sessionId,
        partialTokens: tokensGenerated,
        streamingDuration: (session.completedAt.getTime() - session.startedAt.getTime()) / 1000
      }
    });
    
    // Refund unused credits
    if (partialCredits < session.allocatedCredits) {
      const refundAmount = session.allocatedCredits - partialCredits;
      
      await CreditService.allocateCredits({
        userId,
        credits: refundAmount,
        allocatedBy: 'system-refund',
        expiryDays: 30,
        notes: `Refund from aborted streaming session ${sessionId}`
      });
    }
    
    return {
      sessionId,
      partialCredits,
      refund: partialCredits < session.allocatedCredits ? session.allocatedCredits - partialCredits : 0
    };
  }
}

export default new StreamingSessionService();