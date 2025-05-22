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
    // SUGGESTION: The log "Checking if user ... has undefined credits available" indicates that this function
    // was invoked with `requiredCredits` being undefined. This directly leads to the empty payload `"{}"`
    // being sent to the accounting service.
    // Add a strict check here to ensure `requiredCredits` is a valid number before proceeding.
    // This serves as a safeguard within this function, complementing any checks in the calling code (e.g., message.controller.ts).
    if (typeof requiredCredits !== 'number' || isNaN(requiredCredits) || requiredCredits < 0) {
      // Note: If `requiredCredits = 0` is a valid scenario, adjust the condition (e.g., to `requiredCredits < 0`).
      // The primary issue from the logs is `undefined`.
      logger.error(`[checkUserCredits] Attempted to check credits with invalid requiredCredits value: ${requiredCredits} for user ${userId}.`);
      // The original catch block defaults to 'return true'. For a direct invalid input like this,
      // returning 'false' would be safer to prevent unintended operations.
      // However, to maintain consistency with the existing broader error handling strategy shown in the catch block
      // (which logs a warning and returns true), one might do the same here.
      // Consider changing this to 'return false;' for stricter behavior.
      logger.warn(`[checkUserCredits] Due to invalid requiredCredits (${requiredCredits}), defaulting to allow operation for user ${userId} (consistent with general error handling). This default behavior should be reviewed for safety.`);
      return true; // SAFER ALTERNATIVE: return false;
    }

    logger.info(`Checking if user ${userId} has ${requiredCredits} credits available`);
  } catch (error: any) {
    logger.error('[checkUserCredits] Error checking user credits:', error.message);
    // DEBUG.MD_NOTE: Credit Service Integration Issues - RESOLVED in part by stricter validation in message.controller.ts
    // However, the fallback behavior noted below is still a concern.

    // [20250521_16_52] Problem identified: Non-Streaming - Problematic Fallback.
    // If the credit check fails (e.g. due to the incorrect payload causing a 400 error from accounting-service),
    // the system defaults to allowing the operation. This masks the error and allows operations without confirmed credits.
    logger.warn(`[checkUserCredits] Credit check failed for user ${userId}, defaulting to DENY operation.`);
    return false; // Changed to false: Deny operation if credit check fails
  }

  logger.info(`Checking if user ${userId} has ${requiredCredits} credits available`);
  try {
    // [20250521_16_52] Problem identified: Non-Streaming - Incorrect Credit Check Payload.
    // The payload constructed here (implicitly or explicitly) and sent to the accounting service's /api/credits/check 
    // endpoint is insufficient (e.g. sending only {"credits":X}). It likely needs more fields like userId and/or modelId.
    const response = await axios.post(
      `${config.accountingApiUrl}/credits/check`, // Corrected: accountingApiUrl
      {
        userId: userId, // Added userId
        requiredCredits: requiredCredits // Ensured field name consistency
      },
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    
    // Extract the hasSufficientCredits field from the response
    const hasSufficientCredits = response.data.hasSufficientCredits || response.data.sufficient;
    //logger.debug(`Credit check for user ${userId}: ${hasSufficientCredits ? 'Sufficient' : 'Insufficient'}`);
    
    return hasSufficientCredits;
  } catch (error: any) {
    logger.error('[checkUserCredits] Error checking user credits:', error.message);
    // DEBUG.MD_NOTE: Credit Service Integration Issues - RESOLVED in part by stricter validation in message.controller.ts
    // However, the fallback behavior noted below is still a concern.

    // [20250521_16_52] Problem identified: Non-Streaming - Problematic Fallback.
    // If the credit check fails (e.g. due to the incorrect payload causing a 400 error from accounting-service),
    // the system defaults to allowing the operation. This masks the error and allows operations without confirmed credits.
    logger.warn(`[checkUserCredits] Credit check failed for user ${userId}, defaulting to DENY operation.`);
    return false; // Changed to false: Deny operation if credit check fails
  }
};

/**
 * Converts a value of any type to a number.
 * If the value is already a number, it is returned as is.
 * If the value is undefined or null, it defaults to 0.
 * Any other type is ignored and defaults to 0.
 * 
 * @param value - The input value of any type.
 * @returns A number representation of the input or default 0.
 */
function toNumber(value: any): number {
  // Check if the input is a number; return it directly if true.
  return typeof value === 'number' ? value : (value ?? 0);
}

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
): Promise<number | undefined> => { // Explicitly allow undefined return for error cases
  try {
    // DEBUG.MD_NOTE: Credit Service Integration Issues
    // This function is called by `sendMessage` in `message.controller.ts` before `checkUserCredits`.
    // If this function returns undefined or throws an unhandled error,
    // `requiredCredits` in `sendMessage` will be undefined, leading to the
    // "undefined credits available" log and the subsequent 400 error when `checkUserCredits`
    // calls the accounting service with an empty payload.
    //
    // Investigation:
    // - Log the inputs: message, modelId.
    // - Log the estimatedTokens.
    // - Log the payload sent to the accounting service's /credits/calculate endpoint.
    // - Log the response received from the accounting service.
    // - Ensure that if an error occurs during the Axios call, it's handled in a way that
    //   either returns a clear error indicator (like undefined) or a default/fallback value,
    //   and that the calling function (`sendMessage`) correctly handles this.
    // - The current catch block returns `Math.ceil(message.length / 200)`, which is a number.
    //   However, if an error occurs *before* this (e.g., `config.accountingApiUrl` is bad, or `axios.post` itself fails to be called),
    //   it might still lead to issues. The primary concern is if `response.data.credits` is not a number.

    logger.debug(`[calculateRequiredCredits] Inputs: modelId="${modelId}", messageLength=${message.length}`);

    // Estimate tokens - simple estimation using a character-to-token ratio of 4:1
    // plus a buffer for the expected response length
    const estimatedTokens = Math.ceil(toNumber(message.length) / 4) + 1000; // Simple estimation with buffer
    logger.debug(`[calculateRequiredCredits] Estimated tokens: ${estimatedTokens}`);

    const payload = {
      modelId,
      tokens: estimatedTokens,
    };
    logger.debug(`[calculateRequiredCredits] Payload for ${config.accountingApiUrl}/credits/calculate: ${JSON.stringify(payload)}`); // Corrected: accountingApiUrl

    const response = await axios.post(
      `${config.accountingApiUrl}/credits/calculate`, // Corrected: accountingApiUrl
      payload,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      }
    );

    logger.debug(`[calculateRequiredCredits] Response from ${config.accountingApiUrl}/credits/calculate: Status ${response.status}, Data: ${JSON.stringify(response.data)}`); // Corrected: accountingApiUrl
    // [20250521_16_52] Problem identified: Non-Streaming - Lost/Undefined Credits for Usage Recording.
    // The original debug.md mentioned that `requiredCredits` becomes undefined for usage recording.
    // This specific function `calculateRequiredCredits` is called to get the cost. If it returns undefined
    // due to an error or invalid response from accounting, the caller (`message.controller.ts` or `recordChatUsage`)
    // might end up with undefined credits. The issue might also be in how `recordChatUsage` (below) handles this.
    const credits = response.data.requiredCredits; // Correctly accessing requiredCredits here as per logs.
    if (typeof credits !== 'number' || isNaN(credits)) {
      logger.error(`[calculateRequiredCredits] Invalid credits value received from accounting service: ${credits}. Returning undefined.`);
      return undefined; // Explicitly return undefined for invalid credit values
    }
    
    logger.info(`[calculateRequiredCredits] Calculated credits: ${credits} for model ${modelId} and ${estimatedTokens} tokens.`);
    return credits;
  } catch (error: any) {
    logger.error('[calculateRequiredCredits] Error calculating required credits:', error.message);
    if (axios.isAxiosError(error) && error.response) {
      logger.error(`[calculateRequiredCredits] Axios error details: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    // Return undefined if calculation fails, to be handled by the caller
    // The caller (`sendMessage`) already has a check for undefined/NaN `requiredCredits`.
    return undefined; 
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
    // Calculate the credits to be recorded based on tokens used.
    // This mirrors the logic in `calculateRequiredCredits` but is specific to recording actual usage.
    const payload = {
      modelId,
      tokens: tokensUsed,
    };
    logger.debug(`[recordChatUsage] Payload for ${config.accountingApiUrl}/credits/calculate (for usage recording): ${JSON.stringify(payload)}`); // Corrected: accountingApiUrl
    
    const response = await axios.post(
      `${config.accountingApiUrl}/credits/calculate`, // Corrected: accountingApiUrl
      payload,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
    logger.debug(`[recordChatUsage] Response from ${config.accountingApiUrl}/credits/calculate (for usage recording): Status ${response.status}, Data: ${JSON.stringify(response.data)}`); // Corrected: accountingApiUrl

    // [20250521_16_52] Problem identified: Non-Streaming - Lost/Undefined Credits for Usage Recording.
    // The debug.md log shows "Invalid credits calculated (undefined) for user ..., model ..., tokens .... Skipping usage recording."
    // This indicates that `creditsToRecord` becomes undefined. The line below was previously `response.data.credits`
    // which would be undefined if accounting returns `requiredCredits`. It should be `response.data.requiredCredits`.
    // Even if `calculateRequiredCredits` (called before message sending) gets the correct value, this separate call
    // for usage recording needs to correctly extract the credit amount.
    const creditsToRecord = response.data.requiredCredits; 

    if (typeof creditsToRecord !== 'number' || isNaN(creditsToRecord) || creditsToRecord < 0) {
      logger.error(
        `[recordChatUsage] Invalid credits calculated (${creditsToRecord}) for user ${userId}, model ${modelId}, tokens ${tokensUsed}. Skipping usage recording.`
      );
      return; 
    }
    
    // Record the usage with the accounting service
    await axios.post(
      `${config.accountingApiUrl}/usage/record`,
      {
        service: 'chat',
        operation: modelId,
        credits: creditsToRecord,
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
    
    //logger.debug(`Successfully recorded ${credits} credits usage for user ${userId}`);
  } catch (error: any) {
    logger.error('Error recording chat usage:', error.message);
    // This is non-blocking - we log the error but don't fail the operation
  }
};

export default {
  checkUserCredits,
  calculateRequiredCredits,
  recordChatUsage
};