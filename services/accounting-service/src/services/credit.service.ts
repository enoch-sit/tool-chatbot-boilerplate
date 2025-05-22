// src/services/credit.service.ts
/**
 * Credit Service
 * 
 * Manages the user credit system for the application. This service is the core component
 * of the accounting service that handles all credit-related operations:
 * 
 * - Credit balance checks and retrievals
 * - Credit allocation and expiration management
 * - Credit consumption and deduction 
 * - Credit requirement calculations for different AI models
 * 
 * The service uses a time-based credit allocation approach where credits can have
 * expiration dates, and consumption uses credits that expire soonest first.
 * 
 * This service integrates with UserAccountService to ensure valid users exist
 * before allocating or checking credits.
 */
import { Op } from 'sequelize';
import CreditAllocation from '../models/credit-allocation.model';
import PricingRule from '../models/credit-allocation.model'; // Will create this later
import UserAccountService from './user-account.service';
import logger from '../utils/logger'; // Import the logger

export class CreditService {
  /**
   * Get active credit balance for a user
   * 
   * Retrieves the total available credits and details of all active (non-expired)
   * credit allocations for a specific user. Creates the user account if it doesn't exist.
   * 
   * @param {string} userId - The ID of the user to check balance for
   * @returns {Promise<Object>} Object containing:
   *   - totalCredits: The sum of all active credit allocations
   *   - activeAllocations: Array of allocation objects with details including expiration dates
   */
  async getUserBalance(userId: string): Promise<{ totalCredits: number, activeAllocations: any[] }> {
    // First ensure the user exists in our system
    logger.debug(`[CreditService.getUserBalance] Getting balance for userId: ${userId}`);
    try {
      await UserAccountService.findOrCreateUser({ userId });
      logger.debug(`[CreditService.getUserBalance] User account ensured for userId: ${userId}`);
    } catch (error: any) {
      logger.error('[CreditService.getUserBalance] Failed to find or create user account:', { userId, message: error.message, stack: error.stack });
      // Return zero balance rather than failing when user doesn't exist
      return {
        totalCredits: 0,
        activeAllocations: []
      };
    }
    
    const now = new Date();
    logger.debug(`[CreditService.getUserBalance] Current time: ${now.toISOString()} for userId: ${userId}`);
    
    const allocations = await CreditAllocation.findAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: now },
        remainingCredits: { [Op.gt]: 0 }
      },
      order: [['expiresAt', 'ASC']]
    });
    logger.debug(`[CreditService.getUserBalance] Found ${allocations.length} active allocations for userId: ${userId}`);
    
    const totalCredits = allocations.reduce((sum, allocation) => sum + allocation.remainingCredits, 0);
    logger.debug(`[CreditService.getUserBalance] Calculated totalCredits: ${totalCredits} for userId: ${userId}`);
    
    return {
      totalCredits,
      activeAllocations: allocations.map(a => ({
        id: a.id,
        credits: a.remainingCredits,
        expiresAt: a.expiresAt,
        allocatedAt: a.allocatedAt
      }))
    };
  }
  
  /**
   * Check if user has sufficient credits for an operation
   * 
   * Verifies if a user has enough remaining credits across all their active allocations
   * to perform an operation that requires the specified number of credits.
   * This method is essential for pre-checking before starting credit-consuming operations.
   * 
   * @param {string} userId - The ID of the user to check
   * @param {number} requiredCredits - The number of credits needed for the operation
   * @returns {Promise<boolean>} True if user has sufficient credits, false otherwise
   */
  async checkUserCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const now = new Date();
    logger.debug(`[CreditService.checkUserCredits] PARAMETER CHECK: Function received requiredCredits=${requiredCredits} of type ${typeof requiredCredits}`);
    logger.debug(`[CreditService.checkUserCredits] Checking credits for userId: ${userId}, required: ${requiredCredits}, time: ${now.toISOString()}`);
    
    // Get sum of all remaining credits
    const result = await CreditAllocation.sum('remainingCredits', {
      where: {
        userId,
        expiresAt: { [Op.gt]: now }
      }
    });
    logger.debug(`[CreditService.checkUserCredits] Sum of remaining credits for userId ${userId}: ${result}`);
    
    const hasSufficient = result >= requiredCredits;
    logger.debug(`[CreditService.checkUserCredits] User ${userId} has sufficient credits: ${hasSufficient} (found: ${result}, required: ${requiredCredits})`);
    return hasSufficient;
  }
  
  /**
   * Allocate credits to a user
   * 
   * Creates a new credit allocation for a specific user with an expiration date.
   * This method is typically called by administrators or automated systems to add
   * credits to a user's account, such as after purchase or as part of promotional offers.
   * 
   * The allocation includes metadata about who allocated the credits and when they will expire.
   * The method ensures the user exists before allocating credits.
   * 
   * @param {Object} params - Allocation parameters
   * @param {string} params.userId - ID of user receiving credits
   * @param {number} params.credits - Number of credits to allocate
   * @param {string} params.allocatedBy - ID or name of system/admin allocating credits
   * @param {number} [params.expiryDays=30] - Days until credits expire
   * @param {string} [params.notes] - Optional notes about allocation reason or source
   * @returns {Promise<CreditAllocation>} The created allocation record with full details
   * @throws {Error} If allocation fails due to database issues or invalid input
   */
  async allocateCredits(params: {
    userId: string,
    credits: number,
    allocatedBy: string,
    expiryDays?: number,
    notes?: string
  }) {
    const { userId, credits, allocatedBy, expiryDays = 30, notes } = params;
    
    console.log(`[CreditService] Starting credit allocation process for user ${userId}`);
    
    // First ensure the user exists in our system
    try {
      console.log(`[CreditService] Checking if user account exists for userId: ${userId}`);
      const userAccount = await UserAccountService.findOrCreateUser({ userId });
      console.log(`[CreditService] User account found/created: ${userAccount.userId}`);
    } catch (error) {
      console.error('[CreditService] Failed to find or create user account:', error);
      throw new Error('Failed to allocate credits: User account creation failed');
    }
    
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
      
      console.log(`[CreditService] Creating credit allocation record with data:`, {
        userId,
        totalCredits: credits,
        remainingCredits: credits,
        allocatedBy,
        expiresAt: expiresAt.toISOString(),
      });
      
      const allocation = await CreditAllocation.create({
        userId,
        totalCredits: credits,
        remainingCredits: credits,
        allocatedBy,
        allocatedAt: new Date(),
        expiresAt,
        notes: notes || ''
      });
      
      console.log(`[CreditService] Credit allocation created successfully with ID: ${allocation.id}`);
      return allocation;
    } catch (error) {
      console.error('[CreditService] Error creating credit allocation:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to allocate credits: ${error.message}`);
      } else {
        throw new Error('Failed to allocate credits: Unknown error');
      }
    }
  }
  
  /**
   * Deduct credits from a user's balance
   * 
   * Consumes a specified number of credits from a user's allocations, starting with
   * the ones that expire soonest. This implements a "use oldest credits first" approach
   * to maximize value for users.
   * 
   * The method distributes the deduction across multiple allocations if needed and
   * updates each allocation's remaining credits in the database.
   * 
   * @param {string} userId - The ID of the user to deduct credits from
   * @param {number} credits - Number of credits to deduct
   * @returns {Promise<boolean>} True if deduction was successful (sufficient credits existed),
   *                             false if insufficient credits
   */
  async deductCredits(userId: string, credits: number): Promise<boolean> {
    const now = new Date();
    
    // Get allocations ordered by expiration (soonest first)
    const allocations = await CreditAllocation.findAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: now },
        remainingCredits: { [Op.gt]: 0 }
      },
      order: [['expiresAt', 'ASC']]
    });
    
    let remainingToDeduct = credits;
    
    for (const allocation of allocations) {
      if (remainingToDeduct <= 0) break;
      
      const deductFromThis = Math.min(allocation.remainingCredits, remainingToDeduct);
      allocation.remainingCredits -= deductFromThis;
      remainingToDeduct -= deductFromThis;
      
      await allocation.save();
    }
    
    return remainingToDeduct <= 0;
  }
  
  /**
   * Calculate credits needed for a token count
   * 
   * Computes the credit cost for a specific AI model operation based on token count.
   * Uses a model-specific pricing structure where credit costs are based on tokens processed.
   * 
   * The calculation can be performed separately for input tokens, output tokens, or both,
   * with different models having different rates for input vs. output processing.
   * 
   * Credit costs are calculated per 1000 tokens and then rounded up to ensure
   * the service always has sufficient credits to cover operations.
   * 
   * @param {string} modelId - The ID of the AI model being used (e.g., 'amazon.titan-text-express-v1')
   * @param {number} tokens - The number of tokens used/estimated
   * @param {string} [tokenType='both'] - Whether to calculate for 'input', 'output', or 'both' tokens
   * @returns {Promise<number>} The calculated credit cost (rounded up to nearest credit)
   */
  async calculateCreditsForTokens(modelId: string, tokens: number, tokenType: 'input' | 'output' | 'both' = 'both'): Promise<number> {
    // Model pricing (in USD per 1000 tokens, which directly equals credits per 1000 tokens)
    const modelPricing: Record<string, { input: number, output: number }> = {
      // Amazon models
      'amazon.nova-micro-v1:0': { input: 0.060, output: 0.060 },
      'amazon.nova-lite-v1:0': { input: 0.250, output: 0.800 },
      'amazon.titan-text-express-v1': { input: 0.200, output: 0.600 },
      // Meta model
      'meta.llama3-70b-instruct-v1:0': { input: 0.265, output: 0.350 },
      
      // Default fallback pricing
      'default': { input: 0.200, output: 0.500 }
    };
    
    const pricing = modelPricing[modelId] || modelPricing['default'];
    
    // Calculate based on token type
    if (tokenType === 'input') {
      return Math.ceil((tokens / 1000) * pricing.input);
    } else if (tokenType === 'output') {
      return Math.ceil((tokens / 1000) * pricing.output);
    } else {
      // For 'both', assume half input, half output for estimation purposes
      const inputCost = (tokens / 2 / 1000) * pricing.input;
      const outputCost = (tokens / 2 / 1000) * pricing.output;
      return Math.ceil(inputCost + outputCost);
    }
  }
}

export default new CreditService();