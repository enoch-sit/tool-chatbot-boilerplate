import express from 'express';
import { authenticateJWT, checkRole } from '../middleware/auth.middleware';
import * as chatController from '../controllers/chat.controller';
import {
  validateCreateSession,
  validateSendMessage,
  validateStreamChat,
  validateUpdateStream,
  validateRequest
} from '../middleware/validation.middleware';

const router = express.Router();

// Session management
router.post(
  '/sessions',
  authenticateJWT,
  validateCreateSession,
  validateRequest,
  chatController.createChatSession
);

router.get(
  '/sessions/:sessionId',
  authenticateJWT,
  chatController.getChatSession
);

router.get(
  '/sessions',
  authenticateJWT,
  chatController.listChatSessions
);

router.delete(
  '/sessions/:sessionId',
  authenticateJWT,
  chatController.deleteChatSession
);

// Chat interactions
router.post(
  '/sessions/:sessionId/messages',
  authenticateJWT,
  validateSendMessage,
  validateRequest,
  chatController.sendMessage
);

router.get(
  '/sessions/:sessionId/messages',
  authenticateJWT,
  chatController.getMessages
);

// Streaming interactions
router.post(
  '/sessions/:sessionId/stream',
  authenticateJWT,
  validateStreamChat,
  validateRequest,
  chatController.streamChatResponse
);

router.post(
  '/sessions/:sessionId/update-stream',
  authenticateJWT,
  validateUpdateStream,
  validateRequest,
  chatController.updateChatWithStreamResponse
);

// Session observation (for monitoring)
router.get(
  '/sessions/:sessionId/observe',
  authenticateJWT,
  checkRole(['admin', 'supervisor']),
  chatController.observeSession
);

export default router;