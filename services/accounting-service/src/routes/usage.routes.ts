// src/routes/usage.routes.ts
import { Router } from 'express';
import UsageController from '../controllers/usage.controller';
import { authenticateJWT, requireAdmin, requireSupervisor } from '../middleware/jwt.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Record a usage event
router.post('/record', UsageController.recordUsage);

// Get current user's usage statistics
router.get('/stats', UsageController.getUserStats);

// Get system-wide usage statistics (admin only)
router.get('/system-stats', requireAdmin, UsageController.getSystemStats);

// Get usage statistics for a specific user (admin and supervisors only)
router.get('/stats/:userId', requireSupervisor, UsageController.getUserStatsByAdmin);

export default router;