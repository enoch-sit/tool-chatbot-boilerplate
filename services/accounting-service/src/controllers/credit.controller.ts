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
      
      // DEBUG.MD_NOTE: Credit Service Integration Issues
      // This is the receiving endpoint for the /api/credits/check call from chat-service.
      // The chat-service logs (AWScloudlogfor_test_send_messages.py.json) show it sends an empty JSON object '{}'
      // and receives a 400 error with "Missing or invalid required fields".
      //
      // This controller expects 'credits' in the request body.
      // const { credits: requiredCredits } = req.body;
      //
      // If req.body is an empty object `{}`, then `requiredCredits` will be undefined.
      // The validation `typeof requiredCredits !== 'number' || requiredCredits <= 0` will then be true,
      // leading to the 400 error with message 'Valid credits amount required'.
      //
      // Investigation:
      // - The primary issue seems to be that chat-service is sending an empty payload.
      // - This controller correctly identifies that the 'credits' field is missing or invalid if the payload is empty.
      // - Consider if other fields like 'userId' or 'modelId' should also be expected here,
      //   as suggested by debug.md for robustness, although the current code only strictly requires 'credits'.
      //   If 'userId' from the request body is needed, it should be extracted and validated.
      //   However, `req.user.userId` (from the JWT token) is already used for `CreditService.checkUserCredits`.

      const { 
        credits: requiredCredits, 
        //userId: bodyUserId, 
        //modelId: bodyModelId 
      } = req.body;
      
      console.log(`Received /api/credits/check request with body: ${JSON.stringify(req.body)} for user ${req.user.userId}`);

      // SUGGESTION: The current validation for `requiredCredits` below is appropriate.
      // It correctly handles the scenario where chat-service sends an empty or invalid payload,
      // by returning a 400 error. No changes are strictly needed in this validation logic
      // to address the root cause of the error (which lies in chat-service).
      if (typeof requiredCredits !== 'number' || requiredCredits <= 0) {
        return res.status(400).json({ message: 'Valid credits amount required' });
      }
      
      // SUGGESTION (Optional Enhancement based on Investigation Point 3):
      // The comment mentions considering if 'userId' or 'modelId' from the request body should be used.
      // 1. For 'userId':
      //    - `req.user.userId` (from JWT) is already used by `CreditService.checkUserCredits`, which is secure.
      //    - If `bodyUserId` were to be used, it should ideally be validated against `req.user.userId`:
      //      Example:
      //      if (bodyUserId && bodyUserId !== req.user.userId) {
      //        console.warn(`[CreditController.checkCredits] Mismatch: body userId (${bodyUserId}), JWT userId (${req.user.userId}).`);
      //        return res.status(403).json({ message: 'User ID mismatch in request.' });
      //      }
      //    - However, this is optional and adds redundancy if the JWT is the source of truth.
      // 2. For 'modelId':
      //    - If `requiredCredits` is already calculated (e.g., by chat-service calling this service's 
      //      `/api/credits/calculate` endpoint, which *does* use `modelId`), then `modelId` might be
      //      redundant for this `/api/credits/check` endpoint. The check is primarily "does the user have X credits?".
      //    - If `modelId` were to be used here, its purpose would need to be clearly defined (e.g., for more granular logging
      //      or if the credit check logic itself becomes model-dependent beyond the pre-calculated `requiredCredits`).
      // For now, the existing logic using `req.user.userId` from JWT for the service call is standard.

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
      
      // DEBUG.MD_NOTE: Credit Service Integration Issues
      // This is the receiving endpoint for the /api/credits/calculate call from chat-service's `calculateRequiredCredits` function.
      //
      // Investigation:
      // - Log the received request body (modelId, tokens).
      // - Ensure `CreditService.calculateCreditsForTokens` behaves as expected and returns a valid number.
      // - If this endpoint fails or returns an unexpected response structure,
      //   `calculateRequiredCredits` in chat-service might return undefined or an invalid value,
      //   propagating the error.

      const { modelId, tokens } = req.body;
      console.log(`[CreditController.calculateCredits] Received request: user=${req.user.userId}, modelId=${modelId}, tokens=${tokens}`);
      
      if (!modelId || typeof tokens !== 'number' || tokens < 0) {
        console.warn(`[CreditController.calculateCredits] Invalid request body: modelId=${modelId}, tokens=${tokens}`);
        return res.status(400).json({ message: 'Valid modelId and tokens required' });
      }
      
      const credits = await CreditService.calculateCreditsForTokens(modelId, tokens);
      console.log(`[CreditController.calculateCredits] Calculated credits: ${credits} for modelId=${modelId}, tokens=${tokens}`);
      
      // Ensure the response structure is { credits: number }
      if (typeof credits !== 'number' || isNaN(credits)) {
        console.error(`[CreditController.calculateCredits] CreditService.calculateCreditsForTokens returned invalid value: ${credits}. Responding with 500.`);
        return res.status(500).json({ message: 'Failed to calculate credits due to internal error' });
      }

      return res.status(200).json({ credits });
    } catch (error: any) {
      console.error('[CreditController.calculateCredits] Error calculating credits:', error.message);
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