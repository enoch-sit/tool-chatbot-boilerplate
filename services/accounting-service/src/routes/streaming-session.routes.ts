// src/routes/streaming-session.routes.ts
import { Router } from 'express';
import StreamingSessionController from '../controllers/streaming-session.controller';
import { authenticateJWT, requireAdmin } from '../middleware/jwt.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Initialize a streaming session
router.post('/initialize', StreamingSessionController.initializeSession);

// Finalize a streaming session
router.post('/finalize', StreamingSessionController.finalizeSession);

// Abort a streaming session
router.post('/abort', StreamingSessionController.abortSession);

// Get active sessions for the current user
router.get('/active', StreamingSessionController.getActiveSessions);

// Get all active sessions (admin only)
router.get('/active/all', requireAdmin, StreamingSessionController.getAllActiveSessions);

export default router;