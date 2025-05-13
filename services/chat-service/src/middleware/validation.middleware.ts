/**
 * Request Validation Middleware
 * 
 * This module provides centralized request validation for the Chat Service API,
 * ensuring that all user-provided data meets the expected format and constraints
 * before reaching the business logic. It uses express-validator for schema-based
 * validation with detailed error reporting.
 * 
 * The module provides:
 * - Reusable validation chains for common inputs
 * - Endpoint-specific validation middleware
 * - Standardized error handling for validation failures
 * 
 * This validation layer is critical for:
 * - Preventing security vulnerabilities (injection attacks, etc.)
 * - Ensuring data integrity and consistency
 * - Providing clear feedback on invalid inputs to API clients
 */
import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

/**
 * Common Reusable Validation Chains
 * 
 * These are shared validation rules that can be composed into
 * endpoint-specific validation middleware.
 */

/**
 * Session ID Validator
 * 
 * Validates that the session ID parameter is a valid MongoDB ObjectId.
 * MongoDB ObjectIds are 24 character hexadecimal strings.
 */
export const sessionIdValidator = param('sessionId')
  .isString()
  .trim()
  .matches(/^[0-9a-fA-F]{24}$/)
  .withMessage('Invalid session ID format');

/**
 * Message Content Validator
 * 
 * Validates the user's message content to ensure it:
 * - Is a non-empty string
 * - Is within allowed length limits
 * 
 * This prevents empty messages and excessively long inputs
 * that could impact performance or cost.
 */
export const messageValidator = body('message')
  .isString()
  .trim()
  .notEmpty()
  .withMessage('Message is required')
  .isLength({ max: 10000 })
  .withMessage('Message exceeds maximum length of 10000 characters');

/**
 * Model ID Validator
 * 
 * Validates the format of model IDs to ensure they match the
 * expected pattern for AWS Bedrock and other supported providers.
 * 
 * Format: provider.model-name:version
 * Example: amazon.nova-micro-v1:0
 */
export const modelIdValidator = body('modelId')
  .optional()
  .isString()
  .trim()
  .matches(/^[a-z0-9.-]+:[0-9a-zA-Z-]+$/)
  .withMessage('Invalid model ID format');

/**
 * Endpoint-specific Validation Middleware
 * 
 * These combine the common validation chains into endpoint-specific
 * validation middleware arrays for specific API endpoints.
 */

/**
 * Stream Chat Endpoint Validation
 * 
 * Validates inputs for the streaming chat response endpoint:
 * - Valid session ID
 * - Non-empty message content within size limits
 * - Optional valid model ID if specified
 */
export const validateStreamChat = [
  sessionIdValidator,
  messageValidator,
  modelIdValidator
];

/**
 * Create Chat Session Validation
 * 
 * Validates inputs for creating a new chat session:
 * - Optional title with length constraints
 * - Optional initial message with length constraints
 * - Optional valid model ID if specified
 */
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

/**
 * Update Stream Response Validation
 * 
 * Validates inputs for updating a chat session with a completed stream response:
 * - Valid session ID
 * - Complete response content
 * - Streaming session ID for tracking
 * - Token usage statistics for billing
 */
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

/**
 * Send Message Endpoint Validation
 * 
 * Validates inputs for sending a message in a chat session:
 * - Valid session ID
 * - Non-empty message content within size limits
 * - Optional valid model ID if specified
 */
export const validateSendMessage = [
  sessionIdValidator,
  messageValidator,
  modelIdValidator
];

/**
 * Validation Results Middleware
 * 
 * This middleware processes the validation results from express-validator
 * and returns a standardized error response if validation fails.
 * 
 * It should be applied after validation chains and before route handlers.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns Error response for validation failures, otherwise proceeds to next handler
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Collect any validation errors
  const errors = validationResult(req);
  
  // If validation errors exist, return a 400 Bad Request with error details
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Proceed to the route handler if validation passes
  next();
};