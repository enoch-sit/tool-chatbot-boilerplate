// src/services/credit.service.ts
import { Op } from 'sequelize';
import CreditAllocation from '../models/credit-allocation.model';
import PricingRule from '../models/credit-allocation.model'; // Will create this later
import UserAccountService from './user-account.service';

export class CreditService {
  /**
   * Get active credit balance for a user
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
   * This is a simplified version since we don't have the PricingRule model yet
   */
  async calculateCreditsForTokens(modelId: string, tokens: number): Promise<number> {
    // Default pricing if not found
    const defaultPricing: Record<string, number> = {
      'anthropic.claude-3-sonnet-20240229-v1:0': 3,
      'anthropic.claude-3-haiku-20240307-v1:0': 0.25,
      'anthropic.claude-instant-v1': 0.8,
      'amazon.titan-text-express-v1': 0.3,
    };
    
    return Math.ceil((tokens / 1000) * (defaultPricing[modelId] || 1));
  }
}

export default new CreditService();