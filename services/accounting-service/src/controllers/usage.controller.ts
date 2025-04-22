// src/controllers/usage.controller.ts
import { Request, Response } from 'express';
import UsageService from '../services/usage.service';

export class UsageController {
  /**
   * Record a usage event
   * POST /api/usage/record
   */
  async recordUsage(req: Request, res: Response) {
    try {
      const { service, operation, credits, metadata } = req.body;
      
      if (!service || !operation || !credits || credits <= 0) {
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
  
  /**
   * Get usage statistics for the current user
   * GET /api/usage/stats
   */
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
  
  /**
   * Get system-wide usage statistics (admin only)
   * GET /api/usage/system-stats
   */
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
  
  /**
   * Get usage statistics for a specific user (admin and supervisor only)
   * GET /api/usage/stats/:userId
   */
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