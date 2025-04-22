// src/routes/credit.routes.ts
import { Router } from 'express';
import CreditController from '../controllers/credit.controller';
import { authenticateJWT, requireAdmin, requireSupervisor } from '../middleware/jwt.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Get current user's credit balance
router.get('/balance', CreditController.getUserBalance);

// Allocate credits to a user (admin and supervisors only)
router.post('/allocate', requireSupervisor, CreditController.allocateCredits);

// Check if user has sufficient credits
router.post('/check', CreditController.checkCredits);

// Get a user's credit balance (admin and supervisors only)
router.get('/balance/:userId', requireSupervisor, CreditController.getUserBalanceByAdmin);

// Calculate credits for a specific operation
router.post('/calculate', CreditController.calculateCredits);

export default router;