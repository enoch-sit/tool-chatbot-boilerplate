// src/services/credit.service.ts
/**
 * Credit Service
 * 
 * Manages the user credit system for the application.
 * Handles operations related to user credit balances, allocations,
 * and credit calculations for various service operations.
 */
import { Op } from 'sequelize';
import CreditAllocation from '../models/credit-allocation.model';
import PricingRule from '../models/credit-allocation.model'; // Will create this later
import UserAccountService from './user-account.service';

export class CreditService {
  /**
   * Get active credit balance for a user
   * 
   * @param {string} userId - The ID of the user to check balance for
   * @returns {Promise<Object>} Object containing:
   *   - totalCredits: The sum of all active credit allocations
   *   - activeAllocations: Array of allocation objects with details
   */
  async getUserBalance(userId: string): Promise<{ totalCredits: number, activeAllocations: any[] }> {
    // First ensure the user exists in our system
    try {
      await UserAccountService.findOrCreateUser({ userId });
    } catch (error) {
      console.error('Failed to find or create user account when getting balance:', error);
      // Return zero balance rather than failing when user doesn't exist
      return {
        totalCredits: 0,
        activeAllocations: []
      };
    }
    
    const now = new Date();
    
    const allocations = await CreditAllocation.findAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: now },
        remainingCredits: { [Op.gt]: 0 }
      },
      order: [['expiresAt', 'ASC']]
    });
    
    const totalCredits = allocations.reduce((sum, allocation) => sum + allocation.remainingCredits, 0);
    
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
   * @param {string} userId - The ID of the user to check
   * @param {number} requiredCredits - The number of credits needed
   * @returns {Promise<boolean>} Whether user has enough credits
   */
  async checkUserCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const now = new Date();
    
    // Get sum of all remaining credits
    const result = await CreditAllocation.sum('remainingCredits', {
      where: {
        userId,
        expiresAt: { [Op.gt]: now }
      }
    });
    
    return result >= requiredCredits;
  }
  
  /**
   * Allocate credits to a user
   * 
   * @param {Object} params - Allocation parameters
   * @param {string} params.userId - ID of user receiving credits
   * @param {number} params.credits - Number of credits to allocate
   * @param {string} params.allocatedBy - ID or name of system/admin allocating credits
   * @param {number} [params.expiryDays=30] - Days until credits expire
   * @param {string} [params.notes] - Optional notes about allocation
   * @returns {Promise<CreditAllocation>} The created allocation record
   * @throws {Error} If allocation fails
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
   * Credits are deducted from allocations that expire first
   * 
   * @param {string} userId - The ID of the user to deduct from
   * @param {number} credits - Number of credits to deduct
   * @returns {Promise<boolean>} Whether the deduction was successful
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
   * Uses a simple model-based pricing structure where 1 credit = price in USD
   * 
   * @param {string} modelId - The ID of the AI model being used
   * @param {number} tokens - The number of tokens used/estimated
   * @param {string} [tokenType='both'] - Whether to calculate for 'input', 'output', or 'both' tokens
   * @returns {Promise<number>} The calculated credit cost
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