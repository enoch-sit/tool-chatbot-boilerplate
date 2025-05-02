import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import * as modelController from '../controllers/model.controller';
import { body, validationResult } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';

const router = express.Router();

// Get available models
router.get(
  '/',
  authenticateJWT,
  modelController.getModels
);

// Get model recommendation
router.post(
  '/recommend',
  authenticateJWT,
  [
    body('task')
      .optional()
      .isIn(['general', 'code', 'creative', 'long-document'])
      .withMessage('Task must be one of: general, code, creative, long-document'),
    body('priority')
      .optional()
      .isIn(['speed', 'quality', 'cost'])
      .withMessage('Priority must be one of: speed, quality, cost')
  ],
  validateRequest,
  modelController.getModelRecommendation
);

export default router;