// src/routes/api.routes.ts
import express from 'express';
import { authenticateJWT, checkRole } from '../middleware/auth.middleware';
import * as chatController from '../controllers/chat.controller';
import * as modelController from '../controllers/model.controller';
import {
  validateCreateSession,
  validateSendMessage,
  validateStreamChat,
  validateUpdateStream,
  validateRequest
} from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = express.Router();

// ===== CHAT ROUTES =====

// Session management
router.post(
  '/chat/sessions',
  authenticateJWT,
  validateCreateSession,
  validateRequest,
  chatController.createChatSession
);

router.get(
  '/chat/sessions/:sessionId',
  authenticateJWT,
  chatController.getChatSession
);

router.get(
  '/chat/sessions',
  authenticateJWT,
  chatController.listChatSessions
);

router.delete(
  '/chat/sessions/:sessionId',
  authenticateJWT,
  chatController.deleteChatSession
);

// Chat interactions
router.post(
  '/chat/sessions/:sessionId/messages',
  authenticateJWT,
  validateSendMessage,
  validateRequest,
  chatController.sendMessage
);

router.get(
  '/chat/sessions/:sessionId/messages',
  authenticateJWT,
  chatController.getMessages
);

// Streaming interactions
router.post(
  '/chat/sessions/:sessionId/stream',
  authenticateJWT,
  validateStreamChat,
  validateRequest,
  chatController.streamChatResponse
);

router.post(
  '/chat/sessions/:sessionId/update-stream',
  authenticateJWT,
  validateUpdateStream,
  validateRequest,
  chatController.updateChatWithStreamResponse
);

// Session observation (for monitoring)
router.get(
  '/chat/sessions/:sessionId/observe',
  authenticateJWT,
  checkRole(['admin', 'supervisor']),
  chatController.observeSession
);

// Supervisor routes for accessing user chat history
router.get(
  '/chat/users/:userId/sessions',
  authenticateJWT,
  checkRole(['admin', 'supervisor']),
  chatController.supervisorListChatSessions
);

router.get(
  '/chat/users/:userId/sessions/:sessionId',
  authenticateJWT,
  checkRole(['admin', 'supervisor']),
  chatController.supervisorGetChatSession
);

// Search for users and their sessions
router.get(
  '/chat/users/search',
  authenticateJWT,
  checkRole(['admin', 'supervisor']),
  chatController.searchUsers
);

// ===== MODEL ROUTES =====

// Get available models
router.get(
  '/models',
  authenticateJWT,
  modelController.getModels
);

// Get model recommendation
router.post(
  '/models/recommend',
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

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'chat-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;