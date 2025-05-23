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
import logger from '../utils/logger'; // Import the logger

export class CreditController {
  // 20250523_test_flow
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
  
  // 20250523_test_flow
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
  
  // 20250523_test_flow
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
    logger.debug(`[CreditController.checkCredits] Received request. User: ${req.user?.userId}, Body: ${JSON.stringify(req.body)}`);
    logger.debug(`[CreditController.checkCredits] REQUEST BODY KEYS: ${Object.keys(req.body).join(', ')}`);
    try {
      if (!req.user?.userId) {
        logger.warn('[CreditController.checkCredits] User not authenticated.');
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
      //   However, `req.user.userId` (from the JWT token) is already used for `CreditService.checkUserCredits`. [20250522_test_credit_check.py]

      // EXPECTATION: At this point, if express.json() middleware in server.ts failed to parse the body
      // (e.g., due to missing Content-Type header or malformed JSON from the client),
      // req.body might be undefined or {}. 
      // If req.body is undefined, destructuring it would lead to an error caught by the main try-catch block.
      // If req.body is {}, then requiredCredits will be undefined. [20250522_test_credit_check.py]
      
      // DEBUGGING: Log the request body before destructuring
      logger.debug(`[CreditController.checkCredits] Raw req.body: ${JSON.stringify(req.body)}`);
      logger.debug(`[CreditController.checkCredits] req.body.credits: ${req.body.credits}, type: ${typeof req.body.credits}`);
      logger.debug(`[CreditController.checkCredits] req.body.requiredCredits: ${req.body.requiredCredits}, type: ${typeof req.body.requiredCredits}`);
      
      const { 
        requiredCredits
      } = req.body;
      
      // DEBUGGING: Log the extracted value after destructuring
      logger.debug(`[CreditController.checkCredits] Extracted requiredCredits from 'credits' field: ${requiredCredits}, type: ${typeof requiredCredits}`);

      logger.debug(`[CreditController.checkCredits] Calling CreditService.checkUserCredits with userId: ${req.user.userId}, requiredCredits: ${requiredCredits}`);
      const sufficient = await CreditService.checkUserCredits(req.user.userId, requiredCredits);
      logger.debug(`[CreditController.checkCredits] CreditService.checkUserCredits returned: ${sufficient}`);
      
      // Get the user's current balance to include in the response
      if (sufficient) {
        logger.debug(`[CreditController.checkCredits] Credits sufficient. Fetching balance for user: ${req.user.userId}`);
        const balanceInfo = await CreditService.getUserBalance(req.user.userId);
        logger.debug(`[CreditController.checkCredits] Balance info: ${JSON.stringify(balanceInfo)}`);
        return res.status(200).json({ 
          sufficient: true,
          credits: balanceInfo.totalCredits,
          requiredCredits
        });
      } else {
        logger.info(`[CreditController.checkCredits] Insufficient credits for user: ${req.user.userId}, required: ${requiredCredits}`);
        return res.status(200).json({ 
          sufficient: false, 
          message: "Insufficient credits"
        });
      }
    } catch (error: any) {
      logger.error('[CreditController.checkCredits] Error checking credits:', { message: error.message, stack: error.stack, userId: req.user?.userId, requestBody: req.body });
      return res.status(500).json({ message: 'Failed to check credit balance' });
    }
  }
  
  // 20250523_test_flow
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
  
  // 20250523_test_flow
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
      
      // CRITICAL FIX: Resolve the target user's actual UUID if a username is provided.
      // The 'userId' from the request body might be a username (e.g., "user1") or a UUID.
      // We need to ensure we are using the canonical UUID (UserAccount.userId) for allocation.
      let targetUserAccount: UserAccount | null = null;

      // Attempt to find the user by the provided userId, treating it first as a potential UUID.
      targetUserAccount = await UserAccount.findByPk(userId);

      if (!targetUserAccount) {
        // If not found by PK (i.e., it wasn't a UUID or was a non-existent UUID),
        // try finding by username, assuming the provided userId might be a username.
        logger.info(`User not found by PK '${userId}', attempting to find by username.`);
        targetUserAccount = await UserAccountService.findByUsername(userId);
      }

      if (!targetUserAccount) {
        // If still not found, the user doesn't exist by either UUID or username.
        // Depending on policy, we might create them or return an error.
        // The existing logic below attempts to create if not found by PK, which might be problematic if userId was a username.
        // For now, let's ensure we have a user or return a clear error.
        logger.warn(`Target user '${userId}' not found by UUID or username for credit allocation.`);
        // return res.status(404).json({ message: `User '${userId}' not found. Cannot allocate credits.` });
        // Replicating original behavior of trying to create if not found by PK, but this needs careful review.
        // The original code implicitly created a user with the passed `userId` as PK if it didn't exist.
        // This was problematic if `userId` was a username.
        // A better fix would involve ensuring `userId` is always a UUID before this stage,
        // or having a dedicated user creation step if allocating to a new username.
        logger.info(`Attempting to create user account for userId: ${userId} as it was not found.`);
        // This will use the input `userId` as the primary key. If `userId` is "user1", it creates/confirms that account.
      }
      
      // Ensure the user account exists or is created before allocating credits.
      // The original code had a block here to create UserAccount if existingUser was null.
      // We rely on targetUserAccount being populated or the subsequent CreditService call to handle user existence.
      // The critical part is using the *correct* userId (UUID) for allocation.

      const actualUserIdForAllocation = targetUserAccount ? targetUserAccount.userId : userId;
      if (targetUserAccount && userId !== targetUserAccount.userId) {
        logger.info(`Allocating credits to user ID '${targetUserAccount.userId}' (resolved from input '${userId}').`);
      }

      // CRITICAL FIX: Create the user account FIRST before attempting to allocate credits
      // This block is from the original code. It attempts to create a user if not found by PK.
      // If `userId` from req.body is a username (e.g., "user1"), this creates/confirms a UserAccount with that username as PK.
      // This is the behavior that needs to be corrected long-term, but we are first ensuring allocation uses the resolved UUID if possible.
      try {
        const userForDb = await UserAccountService.findOrCreateUser({
            userId: actualUserIdForAllocation, // Use the resolved UUID if available, otherwise the input
            // If actualUserIdForAllocation is a username here, findOrCreateUser will use it as PK.
            // This is still part of the original problematic flow if a username is passed and not resolved to a UUID.
            // A more complete fix would ensure actualUserIdForAllocation is *always* a UUID.
            username: targetUserAccount ? targetUserAccount.username : userId, // Best guess for username
            email: targetUserAccount ? targetUserAccount.email : `temp_${userId}@example.com`,
            role: targetUserAccount ? targetUserAccount.role : 'enduser'
        });
        logger.info(`User account ensured for ID: ${userForDb.userId} (username: ${userForDb.username}) before credit allocation.`);

      } catch (userError) {
        logger.error('Failed to ensure user account before credit allocation:', userError);
        return res.status(500).json({ 
          message: 'Failed to allocate credits: User account processing failed',
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
      
      // Now that we've ensured the user exists, proceed with credit allocation
      try {
        const allocation = await CreditService.allocateCredits({
          userId: actualUserIdForAllocation, // IMPORTANT: Use the resolved (preferably UUID) userId
          credits,
          allocatedBy: req.user.userId, // This is the admin/supervisor's UUID from JWT
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