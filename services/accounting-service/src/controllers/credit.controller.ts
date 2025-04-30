// src/controllers/credit.controller.ts
import { Request, Response } from 'express';
import CreditService from '../services/credit.service';
import UserAccountService from '../services/user-account.service';
import UserAccount from '../models/user-account.model';

export class CreditController {
  /**
   * Get the current user's credit balance
   * GET /api/credits/balance
   */
  async getUserBalance(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const balanceInfo = await CreditService.getUserBalance(req.user.userId);
      
      return res.status(200).json(balanceInfo);
    } catch (error) {
      console.error('Error fetching user balance:', error);
      return res.status(500).json({ message: 'Failed to fetch credit balance' });
    }
  }
  
  /**
   * Allocate credits to a user (admin and supervisors only)
   * POST /api/credits/allocate
   */
  async allocateCredits(req: Request, res: Response) {
    try {
      const { userId, credits, expiryDays, notes } = req.body;
      
      console.log(`Credit allocation request received - userId: ${userId}, credits: ${credits}, expiryDays: ${expiryDays}`);
      
      if (!userId || !credits || credits <= 0) {
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (!['admin', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      console.log(`Processing credit allocation by admin ${req.user.userId} to user ${userId}`);
      
      // CRITICAL FIX: Create the user account FIRST before attempting to allocate credits
      try {
        // Check if the user already exists in the database
        const existingUser = await UserAccount.findByPk(userId);
        
        if (!existingUser) {
          // Create a new user account if not found
          console.log(`Creating new user account for userId: ${userId}`);
          await UserAccount.create({
            userId: userId,
            email: `temp_${userId}@example.com`,
            username: `temp_user_${userId.substring(0, 8)}`,
            role: 'enduser',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`User account created successfully for userId: ${userId}`);
        } else {
          console.log(`User account already exists for userId: ${userId}`);
        }
      } catch (userError) {
        console.error('Failed to create user account:', userError);
        return res.status(500).json({ 
          message: 'Failed to allocate credits: User account creation failed',
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
      
      // Now that we've ensured the user exists, proceed with credit allocation
      try {
        const allocation = await CreditService.allocateCredits({
          userId,
          credits,
          allocatedBy: req.user.userId,
          expiryDays,
          notes
        });
        
        console.log(`Credit allocation successful: ${JSON.stringify(allocation)}`);
        
        return res.status(201).json({
          id: allocation.id,
          userId: allocation.userId,
          totalCredits: allocation.totalCredits,
          remainingCredits: allocation.remainingCredits,
          expiresAt: allocation.expiresAt
        });
      } catch (creditError) {
        console.error(`Credit allocation service error:`, creditError);
        return res.status(500).json({ 
          message: 'Failed to allocate credits',
          error: creditError instanceof Error ? creditError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error allocating credits:', error);
      return res.status(500).json({ message: 'Failed to allocate credits' });
    }
  }
  
  /**
   * Check if a user has sufficient credits for an operation
   * POST /api/credits/check
   */
  async checkCredits(req: Request, res: Response) {
    try {
      const { requiredCredits } = req.body;
      
      if (!requiredCredits || requiredCredits <= 0) {
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const hasSufficientCredits = await CreditService.checkUserCredits(
        req.user.userId,
        requiredCredits
      );
      
      return res.status(200).json({
        hasSufficientCredits
      });
    } catch (error) {
      console.error('Error checking credits:', error);
      return res.status(500).json({ message: 'Failed to check credits' });
    }
  }
  
  /**
   * Get a user's credit balance (for admins and supervisors)
   * GET /api/credits/balance/:userId
   */
  async getUserBalanceByAdmin(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (!['admin', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const balanceInfo = await CreditService.getUserBalance(userId);
      
      return res.status(200).json(balanceInfo);
    } catch (error) {
      console.error('Error fetching user balance:', error);
      return res.status(500).json({ message: 'Failed to fetch credit balance' });
    }
  }
  
  /**
   * Calculate required credits for a specific operation
   * POST /api/credits/calculate
   */
  async calculateCredits(req: Request, res: Response) {
    try {
      const { modelId, tokens } = req.body;
      
      if (!modelId || !tokens || tokens <= 0) {
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const requiredCredits = await CreditService.calculateCreditsForTokens(modelId, tokens);
      
      return res.status(200).json({
        modelId,
        tokens,
        requiredCredits
      });
    } catch (error) {
      console.error('Error calculating required credits:', error);
      return res.status(500).json({ message: 'Failed to calculate required credits' });
    }
  }
}

export default new CreditController();