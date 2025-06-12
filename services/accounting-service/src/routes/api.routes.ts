// src/routes/api.routes.ts
/**
 * Accounting Service API Routes
 * 
 * This file defines all API endpoints for the Accounting Service,
 * organizing endpoints into logical groups with appropriate authentication
 * and authorization middleware.
 * 
 * The Accounting Service provides endpoints for:
 * - Credit management (balance checks, allocations)
 * - Usage tracking (recording usage, retrieving statistics)
 * - Streaming session management (initialization, finalization)
 * 
 * Authentication:
 * - JWT required for all routes except /api/health
 * - Admin/supervisor role required for accessing other users' data
 * - Admin role required for system-wide operations
 * 
 * Base path: /api
 */
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
 * 
 * Returns basic service status information. [20250522_10:11_test_credit_check.py]
 * 
 * Response:
 *   200 OK: { status: string, service: string, version: string, timestamp: string }
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
 * 
 * Returns the authenticated user's current credit balance. [20250522_10:11_test_credit_check.py]
 * 
 * Authentication: JWT required
 * 
 * Response:
 *   200 OK: { totalCredits: number, activeAllocations: Array }
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If retrieval fails
 */
router.get('/credits/balance', CreditController.getUserBalance);

/**
 * Check if user has sufficient credits
 * POST /api/credits/check
 * 
 * Verifies if the user has enough credits for an operation. [20250522_10:11_test_credit_check.py]
 * 
 * Authentication: JWT required
 * 
 * Request body:
 *   { requiredCredits: number } - Amount of credits needed for the operation
 * 
 * Response:
 *   200 OK: { sufficient: boolean, credits?: number, requiredCredits?: number, message?: string }
 *   400 Bad Request: If requiredCredits field is missing/invalid
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If check fails
 */
router.post('/credits/check', CreditController.checkCredits);

/**
 * Calculate credits for a specific operation
 * POST /api/credits/calculate
 * 
 * Calculates the credit cost for a specific operation.
 * 
 * Authentication: JWT required
 * 
 * Request body:
 *   { modelId: string, tokens: number }
 * 
 * Response:
 *   200 OK: { credits: number }
 *   400 Bad Request: If required fields are missing
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If calculation fails
 */
router.post('/credits/calculate', CreditController.calculateCredits);

/**
 * Get a user's credit balance (admin and supervisors only)
 * GET /api/credits/balance/:userId
 * 
 * Returns a specific user's credit balance (admin/supervisor only).
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Path parameters:
 *   userId: string - ID of the user to check
 * 
 * Response:
 *   200 OK: { totalCredits: number, activeAllocations: Array }
 *   400 Bad Request: If userId is missing
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   404 Not Found: If user doesn't exist
 *   500 Server Error: If retrieval fails
 */
router.get('/credits/balance/:userId', requireSupervisor, CreditController.getUserBalanceByAdmin);

/**
 * Allocate credits to a user (admin and supervisors only)
 * POST /api/credits/allocate
 * 
 * Allocates credits to a specific user (admin/supervisor only). [20250522_10:11_test_credit_check.py]
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Request body:
 *   { 
 *     userId: string,
 *     credits: number,
 *     expiryDays: number (optional),
 *     notes: string (optional)
 *   }
 * 
 * Response:
 *   201 Created: { id: string, userId: string, totalCredits: number, remainingCredits: number, expiresAt: string }
 *   400 Bad Request: If required fields are missing
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   500 Server Error: If allocation fails
 */
router.post('/credits/allocate', requireSupervisor, CreditController.allocateCredits);

/**
 * Allocate credits to a user (admin and supervisors only)
 * POST /api/credits/allocate
 * 
 * Allocates credits to a specific user (admin/supervisor only). [20250522_10:11_test_credit_check.py]
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Request body:
 *   { 
 *     userId: string,
 *     credits: number,
 *     expiryDays: number (optional),
 *     notes: string (optional)
 *   }
 * 
 * Response:
 *   201 Created: { id: string, userId: string, totalCredits: number, remainingCredits: number, expiresAt: string }
 *   400 Bad Request: If required fields are missing
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   500 Server Error: If allocation fails
 */
router.post('/credits/allocate', requireSupervisor, CreditController.allocateCredits);

/**
 * Set absolute credit amount for a user (admin and supervisors only)
 * POST /api/credits/set
 * 
 * Sets the total credit amount for a specific user, replacing current balance.
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Request body:
 *   { 
 *     userId: string,
 *     credits: number,
 *     expiryDays: number (optional),
 *     notes: string (optional)
 *   }
 * 
 * Response:
 *   200 OK: { userId: string, previousCredits: number, newCredits: number, message: string }
 *   400 Bad Request: If required fields are missing or credits is negative
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   404 Not Found: If user doesn't exist
 *   500 Server Error: If operation fails
 */
router.post('/credits/set', requireSupervisor, CreditController.setCredits);

/**
 * Remove/deduct credits from a user (admin and supervisors only)
 * DELETE /api/credits/remove
 * 
 * Removes or deducts a specific amount of credits from a user.
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Request body:
 *   { 
 *     userId: string,
 *     credits: number,
 *     notes: string (optional)
 *   }
 * 
 * Response:
 *   200 OK: { userId: string, previousCredits: number, newCredits: number, removedCredits: number, message: string }
 *   400 Bad Request: If required fields are missing, credits is negative, or insufficient credits
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   404 Not Found: If user doesn't exist
 *   500 Server Error: If operation fails
 */
router.delete('/credits/remove', requireSupervisor, CreditController.removeCredits);

/**
 * Adjust credits for a user (admin and supervisors only)
 * PUT /api/credits/adjust
 * 
 * Adjusts credits by a positive or negative amount (add or subtract).
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Request body:
 *   { 
 *     userId: string,
 *     adjustment: number, // positive to add, negative to subtract
 *     expiryDays: number (optional, only for positive adjustments),
 *     notes: string (optional)
 *   }
 * 
 * Response:
 *   200 OK: { userId: string, previousCredits: number, newCredits: number, adjustment: number, message: string }
 *   400 Bad Request: If required fields are missing or adjustment would result in negative balance
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   404 Not Found: If user doesn't exist
 *   500 Server Error: If operation fails
 */
router.put('/credits/adjust', requireSupervisor, CreditController.adjustCredits);

// ===== STREAMING SESSION ENDPOINTS =====

/**
 * Initialize a streaming session
 * POST /api/streaming-sessions/initialize
 * 
 * Creates a new streaming session and pre-allocates credits.
 * 
 * Authentication: JWT required
 * 
 * Request body:
 *   {
 *     sessionId: string,
 *     modelId: string,
 *     estimatedTokens: number
 *   }
 * 
 * Response:
 *   201 Created: { sessionId: string, allocatedCredits: number, status: string }
 *   400 Bad Request: If required fields are missing
 *   401 Unauthorized: If no user authenticated
 *   402 Payment Required: If user has insufficient credits
 *   500 Server Error: If initialization fails
 */
router.post('/streaming-sessions/initialize', StreamingSessionController.initializeSession);

/**
 * Finalize a streaming session
 * POST /api/streaming-sessions/finalize
 * 
 * Completes a streaming session and reconciles credit usage.
 * 
 * Authentication: JWT required
 * 
 * Request body:
 *   {
 *     sessionId: string,
 *     actualTokens: number,
 *     success: boolean (optional)
 *   }
 * 
 * Response:
 *   200 OK: { sessionId: string, actualCredits: number, refund: number }
 *   400 Bad Request: If required fields are missing
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If finalization fails
 */
router.post('/streaming-sessions/finalize', StreamingSessionController.finalizeSession);

/**
 * Abort a streaming session
 * POST /api/streaming-sessions/abort
 * 
 * Aborts an active streaming session and handles partial credits.
 * 
 * Authentication: JWT required
 * 
 * Request body:
 *   {
 *     sessionId: string,
 *     tokensGenerated: number (optional)
 *   }
 * 
 * Response:
 *   200 OK: { sessionId: string, partialCredits: number, refund: number }
 *   400 Bad Request: If sessionId is missing
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If abort fails
 */
router.post('/streaming-sessions/abort', StreamingSessionController.abortSession);

/**
 * Get active sessions for the current user
 * GET /api/streaming-sessions/active
 * 
 * Returns all active streaming sessions for the current user.
 * 
 * Authentication: JWT required
 * 
 * Response:
 *   200 OK: Array of active session objects
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If retrieval fails
 */
router.get('/streaming-sessions/active', StreamingSessionController.getActiveSessions);

/**
 * Get active sessions for a specific user (admin and supervisors only)
 * GET /api/streaming-sessions/active/:userId
 * 
 * Returns active streaming sessions for a specific user.
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Path parameters:
 *   userId: string - ID of the user to check
 * 
 * Response:
 *   200 OK: Array of active session objects for the user
 *   400 Bad Request: If userId is missing
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   500 Server Error: If retrieval fails
 */
router.get('/streaming-sessions/active/:userId', requireSupervisor, StreamingSessionController.getUserActiveSessions);

/**
 * Get all active sessions (admin only)
 * GET /api/streaming-sessions/active/all
 * 
 * Returns all active streaming sessions across all users.
 * 
 * Authentication: JWT required
 * Authorization: Admin role required
 * 
 * Response:
 *   200 OK: Array of all active session objects
 *   403 Forbidden: If user lacks admin permission
 *   500 Server Error: If retrieval fails
 */
router.get('/streaming-sessions/active/all', requireAdmin, StreamingSessionController.getAllActiveSessions);

/**
 * Get recent sessions (active + recently completed) (admin and supervisors only)
 * GET /api/streaming-sessions/recent
 * 
 * Returns recent streaming sessions (active and recently completed).
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Query parameters:
 *   minutes: number (optional) - Look back period in minutes, default 5
 * 
 * Response:
 *   200 OK: { sessions: Array, timestamp: string, filter: Object }
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   500 Server Error: If retrieval fails
 */
router.get('/streaming-sessions/recent', requireSupervisor, StreamingSessionController.getRecentSessions);

/**
 * Get recent sessions for a specific user (admin and supervisors only)
 * GET /api/streaming-sessions/recent/:userId
 * 
 * Returns recent streaming sessions for a specific user.
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Path parameters:
 *   userId: string - ID of the user to check
 * 
 * Query parameters:
 *   minutes: number (optional) - Look back period in minutes, default 5
 * 
 * Response:
 *   200 OK: { sessions: Array, timestamp: string, filter: Object }
 *   400 Bad Request: If userId is missing
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   500 Server Error: If retrieval fails
 */
router.get('/streaming-sessions/recent/:userId', requireSupervisor, StreamingSessionController.getUserRecentSessions);

// ===== USAGE TRACKING ENDPOINTS =====

/**
 * Record a usage event
 * POST /api/usage/record
 * 
 * Records a service usage event for the current user.
 * 
 * Authentication: JWT required
 * 
 * Request body:
 *   {
 *     service: string,
 *     operation: string,
 *     credits: number,
 *     metadata: object (optional)
 *   }
 * 
 * Response:
 *   201 Created: { id: string, service: string, operation: string, credits: number, timestamp: string }
 *   400 Bad Request: If required fields are missing or invalid
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If recording fails
 */
router.post('/usage/record', UsageController.recordUsage);

/**
 * Get current user's usage statistics
 * GET /api/usage/stats
 * 
 * Returns usage statistics for the current user.
 * 
 * Authentication: JWT required
 * 
 * Query parameters:
 *   startDate: ISO date string (optional)
 *   endDate: ISO date string (optional)
 * 
 * Response:
 *   200 OK: { totalRecords: number, totalCredits: number, byService: object, byDay: object, byModel: object, recentActivity: Array }
 *   401 Unauthorized: If no user authenticated
 *   500 Server Error: If retrieval fails
 */
router.get('/usage/stats', UsageController.getUserStats);

/**
 * Get usage statistics for a specific user (admin and supervisors only)
 * GET /api/usage/stats/:userId
 * 
 * Returns usage statistics for a specific user.
 * 
 * Authentication: JWT required
 * Authorization: Admin or Supervisor role required
 * 
 * Path parameters:
 *   userId: string - ID of the user to check
 * 
 * Query parameters:
 *   startDate: ISO date string (optional)
 *   endDate: ISO date string (optional)
 * 
 * Response:
 *   200 OK: { totalRecords: number, totalCredits: number, byService: object, byDay: object, byModel: object, recentActivity: Array }
 *   400 Bad Request: If userId is missing
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks permission
 *   500 Server Error: If retrieval fails
 */
router.get('/usage/stats/:userId', requireSupervisor, UsageController.getUserStatsByAdmin);

/**
 * Get system-wide usage statistics (admin only)
 * GET /api/usage/system-stats
 * 
 * Returns system-wide usage statistics across all users.
 * 
 * Authentication: JWT required
 * Authorization: Admin role required
 * 
 * Query parameters:
 *   startDate: ISO date string (optional)
 *   endDate: ISO date string (optional)
 * 
 * Response:
 *   200 OK: { totalRecords: number, totalCredits: number, byUser: object, byService: object, byDay: object, byModel: object }
 *   401 Unauthorized: If no user authenticated
 *   403 Forbidden: If user lacks admin permission
 *   500 Server Error: If retrieval fails
 */
router.get('/usage/system-stats', requireAdmin, UsageController.getSystemStats);

export default router;