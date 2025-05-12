// src/services/streaming-session.service.ts
import { Op } from 'sequelize';
import StreamingSession from '../models/streaming-session.model';
import CreditService from './credit.service';
import UsageService from './usage.service';

export class StreamingSessionService {
  /**
   * Initialize a streaming session and pre-allocate credits
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