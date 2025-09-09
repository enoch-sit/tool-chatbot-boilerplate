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
 * Validation Middleware for Creating Chat Sessions
 * 
 * This middleware validates the request body when a user attempts to create a new chat session.
 * It ensures that the input data adheres to the expected format and constraints, preventing invalid
 * or malicious data from reaching the business logic. This is critical for maintaining the integrity
 * and security of the application.
 * 
 * Validation Steps:
 * 1. Title Validation:
 *    - The 'title' field is optional, meaning it can be omitted from the request body.
 *    - If provided, it must be a string.
 *    - Leading and trailing whitespace will be removed automatically.
 *    - The title must not exceed 100 characters in length. This limit is set to ensure concise and
 *      meaningful titles that are easy to display in the UI and do not overwhelm the database or
 *      application logic.
 *    - If the title exceeds 100 characters, a custom error message will be returned to the client.
 * 
 * 2. Initial Message Validation:
 *    - The 'initialMessage' field is also optional.
 *    - If provided, it must be a string.
 *    - Leading and trailing whitespace will be removed automatically.
 *    - The initial message must not exceed 10,000 characters in length. This limit is set to:
 *      a) Ensure compatibility with AI models that have token limits.
 *      b) Manage server performance and prevent excessive processing costs.
 *      c) Encourage users to provide concise and focused initial messages.
 *    - If the initial message exceeds 10,000 characters, a custom error message will be returned.
 * 
 * 3. Model ID Validation:
 *    - The 'modelId' field is validated using a pre-defined validator (modelIdValidator).
 *    - This ensures that the model ID follows the expected format (e.g., provider.model-name:version).
 *    - The format is critical for identifying and interacting with the correct AI model.
 * 
 * Usage:
 * This middleware is used in the '/chat/sessions' POST route to validate the input data before
 * creating a new chat session. If any validation fails, the request will not proceed to the
 * controller, and the client will receive a detailed error response.
 */
export const validateCreateSession = [
  // Validate the 'title' field in the request body
  body('title')
    .optional() // The 'title' field is not required; it can be omitted
    .isString() // If provided, it must be a string
    .trim() // Removes any leading or trailing whitespace from the string
    .isLength({ max: 100 }) // Ensures the string is at most 100 characters long, not limited by database
    .withMessage('Title must be at most 100 characters'), // Custom error message if validation fails

  // Validate the 'initialMessage' field in the request body
  body('initialMessage')
    .optional() // The 'initialMessage' field is not required; it can be omitted
    .isString() // If provided, it must be a string
    .trim() // Removes any leading or trailing whitespace from the string
    .isLength({ max: 10000 }) // Ensures the string is at most 10,000 characters long
    .withMessage('Initial message exceeds maximum length of 10000 characters'), // Custom error message if validation fails

  // Validate the 'modelId' field using a pre-defined validator
  modelIdValidator // Ensures the 'modelId' follows the expected format (e.g., provider.model-name:version)
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