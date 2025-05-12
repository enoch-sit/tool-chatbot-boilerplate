// src/routes/api.routes.ts
import { Router } from 'express';
import { authenticateJWT, requireAdmin, requireSupervisor } from '../middleware/jwt.middleware';

// Import controllers
import CreditController from '../controllers/credit.controller';
import StreamingSessionController from '../controllers/streaming-session.controller';
import UsageController from '../controllers/usage.controller';

const router = Router();

// ===== PUBLIC ENDPOINTS =====

/**
 * Health check endpoint (public)
 * GET /api/health
 */
router.get('/health', (_, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'accounting-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ===== AUTHENTICATION MIDDLEWARE =====
// Apply authentication to all routes under these paths
router.use('/credits', authenticateJWT);
router.use('/streaming-sessions', authenticateJWT);
router.use('/usage', authenticateJWT);

// ===== CREDIT MANAGEMENT ENDPOINTS =====

/**
 * Get current user's credit balance
 * GET /api/credits/balance
 */
router.get('/credits/balance', CreditController.getUserBalance);

/**
 * Check if user has sufficient credits
 * POST /api/credits/check
 */
router.post('/credits/check', CreditController.checkCredits);

/**
 * Calculate credits for a specific operation
 * POST /api/credits/calculate
 */
router.post('/credits/calculate', CreditController.calculateCredits);

/**
 * Get a user's credit balance (admin and supervisors only)
 * GET /api/credits/balance/:userId
 */
router.get('/credits/balance/:userId', requireSupervisor, CreditController.getUserBalanceByAdmin);

/**
 * Allocate credits to a user (admin and supervisors only)
 * POST /api/credits/allocate
 */
router.post('/credits/allocate', requireSupervisor, CreditController.allocateCredits);

// ===== STREAMING SESSION ENDPOINTS =====

/**
 * Initialize a streaming session
 * POST /api/streaming-sessions/initialize
 */
router.post('/streaming-sessions/initialize', StreamingSessionController.initializeSession);

/**
 * Finalize a streaming session
 * POST /api/streaming-sessions/finalize
 */
router.post('/streaming-sessions/finalize', StreamingSessionController.finalizeSession);

/**
 * Abort a streaming session
 * POST /api/streaming-sessions/abort
 */
router.post('/streaming-sessions/abort', StreamingSessionController.abortSession);

/**
 * Get active sessions for the current user
 * GET /api/streaming-sessions/active
 */
router.get('/streaming-sessions/active', StreamingSessionController.getActiveSessions);

/**
 * Get active sessions for a specific user (admin and supervisors only)
 * GET /api/streaming-sessions/active/:userId
 */
router.get('/streaming-sessions/active/:userId', requireSupervisor, StreamingSessionController.getUserActiveSessions);

/**
 * Get all active sessions (admin only)
 * GET /api/streaming-sessions/active/all
 */
router.get('/streaming-sessions/active/all', requireAdmin, StreamingSessionController.getAllActiveSessions);

/**
 * Get recent sessions (active + recently completed) (admin and supervisors only)
 * GET /api/streaming-sessions/recent
 */
router.get('/streaming-sessions/recent', requireSupervisor, StreamingSessionController.getRecentSessions);

/**
 * Get recent sessions for a specific user (admin and supervisors only)
 * GET /api/streaming-sessions/recent/:userId
 */
router.get('/streaming-sessions/recent/:userId', requireSupervisor, StreamingSessionController.getUserRecentSessions);

// ===== USAGE TRACKING ENDPOINTS =====

/**
 * Record a usage event
 * POST /api/usage/record
 */
router.post('/usage/record', UsageController.recordUsage);

/**
 * Get current user's usage statistics
 * GET /api/usage/stats
 */
router.get('/usage/stats', UsageController.getUserStats);

/**
 * Get usage statistics for a specific user (admin and supervisors only)
 * GET /api/usage/stats/:userId
 */
router.get('/usage/stats/:userId', requireSupervisor, UsageController.getUserStatsByAdmin);

/**
 * Get system-wide usage statistics (admin only)
 * GET /api/usage/system-stats
 */
router.get('/usage/system-stats', requireAdmin, UsageController.getSystemStats);

export default router;