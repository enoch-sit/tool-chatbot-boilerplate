// src/controllers/usage.controller.ts
/**
 * Usage Controller
 * 
 * Handles API endpoints related to service usage tracking and statistics.
 * Provides functionality for recording usage events and retrieving usage data
 * for both individual users and system-wide analysis.
 * 
 * API Routes:
 * - POST /api/usage/record - Record a usage event
 * - GET /api/usage/stats - Get current user's usage statistics
 * - GET /api/usage/stats/:userId - Get usage statistics for a specific user (admin/supervisor)
 * - GET /api/usage/system-stats - Get system-wide usage statistics (admin only)
 */
import { Request, Response } from 'express';
import UsageService from '../services/usage.service';

// 20250523_test_flow
export class UsageController {
  // 20250523_test_flow
  /**
   * Record a usage event
   * POST /api/usage/record
   * 
   * Request body:
   * {
   *   "service": string (required) - Name of service being used (e.g. "chat", "chat-streaming")
   *   "operation": string (required) - Operation being performed (often model name)
   *   "credits": number (required) - Number of credits consumed
   *   "metadata": object (optional) - Additional context about the usage
   * }
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 201 Created: Usage record details
   *   - 400 Bad Request: If required fields are missing or invalid
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If recording fails
   */
  // 20250523_test_flow
  async recordUsage(req: Request, res: Response) {
    try {
      const { service, operation, credits, metadata } = req.body;
      
      // Allow credits to be 0, but not negative or non-numeric
      if (!service || !operation || typeof credits !== 'number' || credits < 0) {
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const usage = await UsageService.recordUsage({
        userId: req.user.userId,
        service,
        operation,
        credits,
        metadata
      });
      
      return res.status(201).json({
        id: usage.id,
        service: usage.service,
        operation: usage.operation,
        credits: usage.credits,
        timestamp: usage.timestamp
      });
    } catch (error) {
      console.error('Error recording usage:', error);
      return res.status(500).json({ message: 'Failed to record usage' });
    }
  }
  
  // 20250523_test_flow
  /**
   * Get usage statistics for the current user
   * GET /api/usage/stats
   * 
   * Query parameters:
   * - startDate: ISO date string (optional) - Start date for filtering records
   * - endDate: ISO date string (optional) - End date for filtering records
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: Object containing usage statistics 
   *     (totalRecords, totalCredits, byService, byDay, byModel, recentActivity)
   *   - 401 Unauthorized: If no user authenticated
   *   - 500 Server Error: If retrieval fails
   */
  // 20250523_test_flow
  async getUserStats(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Parse date parameters
      const { startDate: startDateStr, endDate: endDateStr } = req.query;
      
      let startDate = undefined;
      let endDate = undefined;
      
      if (startDateStr && typeof startDateStr === 'string') {
        startDate = new Date(startDateStr);
      }
      
      if (endDateStr && typeof endDateStr === 'string') {
        endDate = new Date(endDateStr);
      }
      
      const usageStats = await UsageService.getUserStats({
        userId: req.user.userId,
        startDate,
        endDate
      });
      
      return res.status(200).json(usageStats);
    } catch (error) {
      console.error('Error fetching user usage stats:', error);
      return res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
  }
  
  // 20250523_test_flow
  /**
   * Get system-wide usage statistics (admin only)
   * GET /api/usage/system-stats
   * 
   * Query parameters:
   * - startDate: ISO date string (optional) - Start date for filtering records
   * - endDate: ISO date string (optional) - End date for filtering records
   * 
   * @param req Express request object
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: Object containing system-wide usage statistics
   *     (totalRecords, totalCredits, byUser, byService, byDay, byModel)
   *   - 401 Unauthorized: If no user authenticated
   *   - 403 Forbidden: If user lacks admin permission
   *   - 500 Server Error: If retrieval fails
   */
  // 20250523_test_flow
  async getSystemStats(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // Parse date parameters
      const { startDate: startDateStr, endDate: endDateStr } = req.query;
      
      let startDate = undefined;
      let endDate = undefined;
      
      if (startDateStr && typeof startDateStr === 'string') {
        startDate = new Date(startDateStr);
      }
      
      if (endDateStr && typeof endDateStr === 'string') {
        endDate = new Date(endDateStr);
      }
      
      const systemStats = await UsageService.getSystemStats({
        startDate,
        endDate
      });
      
      return res.status(200).json(systemStats);
    } catch (error) {
      console.error('Error fetching system usage stats:', error);
      return res.status(500).json({ message: 'Failed to fetch system usage statistics' });
    }
  }
  
  // 20250523_test_flow
  /**
   * Get usage statistics for a specific user (admin and supervisor only)
   * GET /api/usage/stats/:userId
   * 
   * Query parameters:
   * - startDate: ISO date string (optional) - Start date for filtering records
   * - endDate: ISO date string (optional) - End date for filtering records
   * 
   * @param req Express request object with userId param
   * @param res Express response object
   * 
   * @returns {Promise<Response>} JSON response with:
   *   - 200 OK: Object containing user's usage statistics
   *   - 400 Bad Request: If userId is missing
   *   - 401 Unauthorized: If no user authenticated
   *   - 403 Forbidden: If user lacks permission
   *   - 500 Server Error: If retrieval fails
   */
  // 20250523_test_flow
  async getUserStatsByAdmin(req: Request, res: Response) {
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
      
      // Parse date parameters
      const { startDate: startDateStr, endDate: endDateStr } = req.query;
      
      let startDate = undefined;
      let endDate = undefined;
      
      if (startDateStr && typeof startDateStr === 'string') {
        startDate = new Date(startDateStr);
      }
      
      if (endDateStr && typeof endDateStr === 'string') {
        endDate = new Date(endDateStr);
      }
      
      const usageStats = await UsageService.getUserStats({
        userId,
        startDate,
        endDate
      });
      
      return res.status(200).json(usageStats);
    } catch (error) {
      console.error('Error fetching user usage stats:', error);
      return res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
  }
}

export default new UsageController();