// src/controllers/credit.controller.ts
/**
 * Credit Controller
 * 
 * Handles API endpoints related to user credit management.
 * Responsible for credit balance checks, allocation, and credit calculations.
 * 
 * API Routes:
 * - GET /api/credits/balance - Get current user's credit balance
 * - POST /api/credits/check - Check if user has sufficient credits
 * - POST /api/credits/calculate - Calculate credits for a specific operation
 * - GET /api/credits/balance/:userId - Get a user's credit balance (admin/supervisor)
 * - POST /api/credits/allocate - Allocate credits to a user (admin/supervisor)
 */
import { Request, Response } from 'express';
import CreditService from '../services/credit.service';
import UserAccountService from '../services/user-account.service';
import UserAccount from '../models/user-account.model';

export class CreditController {
  /**
   * Get current user's credit balance
   * GET /api/credits/balance
   * 
   * @param req Express request object (requires authenticated user)
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { totalCredits: number, activeAllocations: Array }
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If retrieval fails
   */
  async getUserBalance(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const balanceInfo = await CreditService.getUserBalance(req.user.userId);
      return res.status(200).json(balanceInfo);
    } catch (error) {
      console.error('Error getting user balance:', error);
      return res.status(500).json({ message: 'Failed to retrieve credit balance' });
    }
  }
  
  /**
   * Get a specific user's credit balance (admin/supervisor only)
   * GET /api/credits/balance/:userId
   * 
   * @param req Express request object with userId param
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { totalCredits: number, activeAllocations: Array }
   *   - 400 Bad Request: If userId is missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 403 Forbidden: If user lacks permission
   *   - 500 Server Error: If retrieval fails
   */
  async getUserBalanceByAdmin(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Check if target user exists
      const userExists = await UserAccountService.userExists(userId);
      if (!userExists) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const balanceInfo = await CreditService.getUserBalance(userId);
      return res.status(200).json(balanceInfo);
    } catch (error) {
      console.error('Error getting user balance by admin:', error);
      return res.status(500).json({ message: 'Failed to retrieve credit balance' });
    }
  }
  
  /**
   * Check if user has sufficient credits for an operation
   * POST /api/credits/check
   * 
   * Request body:
   * {
   *   "credits": number (required)
   * }
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { sufficient: boolean, credits: number, requiredCredits: number } or { sufficient: boolean, message: string }
   *   - 400 Bad Request: If credits field is missing/invalid
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If check fails
   */
  async checkCredits(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { credits: requiredCredits } = req.body;
      
      if (typeof requiredCredits !== 'number' || requiredCredits <= 0) {
        return res.status(400).json({ message: 'Valid credits amount required' });
      }
      
      const sufficient = await CreditService.checkUserCredits(req.user.userId, requiredCredits);
      
      // Get the user's current balance to include in the response
      if (sufficient) {
        const balanceInfo = await CreditService.getUserBalance(req.user.userId);
        return res.status(200).json({ 
          sufficient: true,
          credits: balanceInfo.totalCredits,
          requiredCredits
        });
      } else {
        return res.status(200).json({ 
          sufficient: false, 
          message: "Insufficient credits"
        });
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      return res.status(500).json({ message: 'Failed to check credit balance' });
    }
  }
  
  /**
   * Calculate credits for a token count (often used for estimation)
   * POST /api/credits/calculate
   * 
   * Request body:
   * {
   *   "modelId": string (required),
   *   "tokens": number (required)
   * }
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: { credits: number }
   *   - 400 Bad Request: If required fields are missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If calculation fails
   */
  async calculateCredits(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { modelId, tokens } = req.body;
      
      if (!modelId || typeof tokens !== 'number' || tokens < 0) {
        return res.status(400).json({ message: 'Valid modelId and tokens required' });
      }
      
      const credits = await CreditService.calculateCreditsForTokens(modelId, tokens);
      
      return res.status(200).json({ credits });
    } catch (error) {
      console.error('Error calculating credits:', error);
      return res.status(500).json({ message: 'Failed to calculate credits' });
    }
  }
  
  /**
   * Allocate credits to a user (admin/supervisor only)
   * POST /api/credits/allocate
   * 
   * Request body:
   * {
   *   "userId": string (required),
   *   "credits": number (required),
   *   "expiryDays": number (optional, default 30),
   *   "notes": string (optional)
   * }
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 201 Created: { id: string, userId: string, credits: number, expiresAt: string }
   *   - 400 Bad Request: If required fields are missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 403 Forbidden: If user lacks permission
   *   - 500 Server Error: If allocation fails
   */
  async allocateCredits(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const { userId, credits, expiryDays, notes } = req.body;
      
      if (!userId || typeof credits !== 'number' || credits <= 0) {
        return res.status(400).json({ message: 'Valid userId and credits required' });
      }
      
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
}

export default new CreditController();