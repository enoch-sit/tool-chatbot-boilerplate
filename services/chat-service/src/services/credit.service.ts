/**
 * Credit Service Module
 * 
 * This module provides functionality for interacting with the accounting service
 * to manage user credits. It handles credit checking and usage for both streaming
 * and non-streaming chat operations.
 * 
 * Key features:
 * - Credit availability checking before processing messages
 * - Credit usage calculation based on token consumption
 * - Integration with the accounting service API
 */
import axios from 'axios';
import config from '../config/config';
import logger from '../utils/logger';

/**
 * Check if user has sufficient credits for an operation
 * 
 * Verifies with the accounting service if the user has enough credits
 * available for the requested operation.
 * 
 * @param userId - ID of the user to check credits for
 * @param requiredCredits - Number of credits needed for the operation
 * @param authHeader - Authorization header value for accounting service auth
 * @returns Boolean indicating if user has sufficient credits
 */
export const checkUserCredits = async (
  userId: string,
  requiredCredits: number,
  authHeader: string
): Promise<boolean> => {
  try {
    logger.info(`Checking if user ${userId} has ${requiredCredits} credits available`);
    
    const response = await axios.post(
      `${config.accountingApiUrl}/credits/check`,
      {
        credits: requiredCredits  // Using correct parameter name to match accounting service expectation
      },
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    
    // Extract the hasSufficientCredits field from the response
    const hasSufficientCredits = response.data.hasSufficientCredits || response.data.sufficient;
    logger.debug(`Credit check for user ${userId}: ${hasSufficientCredits ? 'Sufficient' : 'Insufficient'}`);
    
    return hasSufficientCredits;
  } catch (error) {
    logger.error('Error checking user credits:', error);
    
    // Instead of failing, default to allowing the operation if credit check fails
    // This prevents technical errors from blocking valid user operations
    logger.warn(`Credit check failed, defaulting to allow operation for user ${userId}`);
    return true;
  }
};

/**
 * Calculate required credits for a message
 * 
 * Estimates the number of credits needed for processing a message
 * based on token count and model pricing.
 * 
 * @param message - The message content to estimate credits for
 * @param modelId - ID of the AI model to be used
 * @param authHeader - Authorization header value for accounting service auth
 * @returns Number of estimated required credits
 */
export const calculateRequiredCredits = async (
  message: string,
  modelId: string,
  authHeader: string
): Promise<number> => {
  try {
    // Estimate tokens - simple estimation using a character-to-token ratio of 4:1
    // plus a buffer for the expected response length
    const estimatedTokens = Math.ceil(message.length / 4) + 1000; // Simple estimation with buffer
    
    // Request credit calculation from accounting service
    const response = await axios.post(
      `${config.accountingApiUrl}/credits/calculate`,
      {
        modelId,
        tokens: estimatedTokens
      },
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    
    return response.data.credits;
  } catch (error) {
    logger.error('Error calculating required credits:', error);
    // Return a safe default if calculation fails
    return Math.ceil(message.length / 200); // Very conservative fallback
  }
};

/**
 * Record usage for non-streaming operations
 * 
 * Records the usage of a non-streaming chat operation with the
 * accounting service for proper credit deduction.
 * 
 * @param userId - ID of the user to record usage for
 * @param modelId - ID of the AI model used
 * @param tokensUsed - Number of tokens consumed in the operation
 * @param authHeader - Authorization header value for accounting service auth
 */
export const recordChatUsage = async (
  userId: string,
  modelId: string,
  tokensUsed: number,
  authHeader: string
): Promise<void> => {
  try {
    logger.info(`Recording chat usage for user ${userId}: ${tokensUsed} tokens with model ${modelId}`);
    
    // Calculate credits from tokens
    const response = await axios.post(
      `${config.accountingApiUrl}/credits/calculate`,
      {
        modelId,
        tokens: tokensUsed
      },
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    
    const credits = response.data.credits;
    logger.debug(`Calculated credits for usage recording: ${credits} (type: ${typeof credits}) for ${tokensUsed} tokens with model ${modelId}`);

    if (typeof credits !== 'number' || credits < 0) { // Allow credits to be 0
      logger.error(`Invalid credits calculated (${credits}) for user ${userId}, model ${modelId}, tokens ${tokensUsed}. Skipping usage recording.`);
      return; 
    }
    
    // Record the usage with the accounting service
    await axios.post(
      `${config.accountingApiUrl}/usage/record`,
      {
        service: 'chat',
        operation: modelId,
        credits: credits,
        metadata: {
          tokens: tokensUsed,
          timestamp: new Date().toISOString()
        }
      },
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    
    logger.debug(`Successfully recorded ${credits} credits usage for user ${userId}`);
  } catch (error) {
    logger.error('Error recording chat usage:', error);
    // This is non-blocking - we log the error but don't fail the operation
  }
};

export default {
  checkUserCredits,
  calculateRequiredCredits,
  recordChatUsage
};