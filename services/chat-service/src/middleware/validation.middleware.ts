import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

// Common validation chains
export const sessionIdValidator = param('sessionId')
  .isString()
  .trim()
  .matches(/^[0-9a-fA-F]{24}$/)
  .withMessage('Invalid session ID format');

export const messageValidator = body('message')
  .isString()
  .trim()
  .notEmpty()
  .withMessage('Message is required')
  .isLength({ max: 10000 })
  .withMessage('Message exceeds maximum length of 10000 characters');

export const modelIdValidator = body('modelId')
  .optional()
  .isString()
  .trim()
  .matches(/^[a-z0-9.-]+:[0-9a-zA-Z-]+$/)
  .withMessage('Invalid model ID format');

// Validation for stream chat endpoint
export const validateStreamChat = [
  sessionIdValidator,
  messageValidator,
  modelIdValidator
];

// Validation for create chat session endpoint
export const validateCreateSession = [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must be at most 100 characters'),
  body('initialMessage')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Initial message exceeds maximum length of 10000 characters'),
  modelIdValidator
];

// Validation for update stream endpoint
export const validateUpdateStream = [
  sessionIdValidator,
  body('completeResponse')
    .isString()
    .withMessage('Complete response must be a string'),
  body('streamingSessionId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Streaming session ID is required'),
  body('tokensUsed')
    .isInt({ min: 0 })
    .withMessage('Tokens used must be a positive integer')
];

// Validation for send message endpoint
export const validateSendMessage = [
  sessionIdValidator,
  messageValidator,
  modelIdValidator
];

// Middleware to check validation results
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};