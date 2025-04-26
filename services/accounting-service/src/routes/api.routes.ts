// src/routes/api.routes.ts
import { Router } from 'express';
import { authenticateJWT, requireAdmin, requireSupervisor } from '../middleware/jwt.middleware';

// Import controllers
import CreditController from '../controllers/credit.controller';
import StreamingSessionController from '../controllers/streaming-session.controller';
import UsageController from '../controllers/usage.controller';

const router = Router();

// Health check endpoint (public)
router.get('/health', (_, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'accounting-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ----- AUTHENTICATED ROUTES -----
// All routes below require authentication
router.use('/credits', authenticateJWT);
router.use('/streaming-sessions', authenticateJWT);
router.use('/usage', authenticateJWT);

// ----- CREDIT MANAGEMENT ROUTES -----
// Get current user's credit balance
router.get('/credits/balance', CreditController.getUserBalance);

// Check if user has sufficient credits
router.post('/credits/check', CreditController.checkCredits);

// Calculate credits for a specific operation
router.post('/credits/calculate', CreditController.calculateCredits);

// Get a user's credit balance (admin and supervisors only)
router.get('/credits/balance/:userId', requireSupervisor, CreditController.getUserBalanceByAdmin);

// Allocate credits to a user (admin and supervisors only)
router.post('/credits/allocate', requireSupervisor, CreditController.allocateCredits);

// ----- STREAMING SESSION ROUTES -----
// Initialize a streaming session
router.post('/streaming-sessions/initialize', StreamingSessionController.initializeSession);

// Finalize a streaming session
router.post('/streaming-sessions/finalize', StreamingSessionController.finalizeSession);

// Abort a streaming session
router.post('/streaming-sessions/abort', StreamingSessionController.abortSession);

// Get active sessions for the current user
router.get('/streaming-sessions/active', StreamingSessionController.getActiveSessions);

// Get all active sessions (admin only)
router.get('/streaming-sessions/active/all', requireAdmin, StreamingSessionController.getAllActiveSessions);

// ----- USAGE TRACKING ROUTES -----
// Record a usage event
router.post('/usage/record', UsageController.recordUsage);

// Get current user's usage statistics
router.get('/usage/stats', UsageController.getUserStats);

// Get usage statistics for a specific user (admin and supervisors only)
router.get('/usage/stats/:userId', requireSupervisor, UsageController.getUserStatsByAdmin);

// Get system-wide usage statistics (admin only)
router.get('/usage/system-stats', requireAdmin, UsageController.getSystemStats);

export default router;