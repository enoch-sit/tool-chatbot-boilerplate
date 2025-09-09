// src/services/usage.service.ts
/**
 * Usage Service
 * 
 * Manages the recording and retrieval of service usage statistics.
 * This service tracks credit usage across different services and operations,
 * providing detailed statistics for users and admins.
 */
import { Op } from 'sequelize';
import UsageRecord from '../models/usage-record.model';

interface UsageStats {
  [key: string]: number;
}

export class UsageService {
  // 20250523_test_flow
  /**
   * Record usage of a service
   * 
   * @param {Object} params - Usage record parameters
   * @param {string} params.userId - ID of the user using the service
   * @param {string} params.service - Name of the service being used (e.g., 'chat', 'chat-streaming')
   * @param {string} params.operation - Operation being performed (often the model name for LLM services)
   * @param {number} params.credits - Number of credits consumed
   * @param {Object} [params.metadata] - Additional metadata about the usage
   * @returns {Promise<UsageRecord>} The created usage record
   */
  async recordUsage(params: {
    userId: string,
    service: string,
    operation: string,
    credits: number,
    metadata?: any
  }) {
    const { userId, service, operation, credits, metadata } = params;
    
    // Create the usage record with the expected fields to match the tests
    return UsageRecord.create({
      userId,
      timestamp: new Date(),
      service,
      operation,
      credits,
      metadata: metadata || {}
    });
  }
  
  // 20250523_test_flow
  /**
   * Get usage statistics for a user in a date range
   * 
   * @param {Object} params - Query parameters
   * @param {string} params.userId - ID of the user to get stats for
   * @param {Date} [params.startDate] - Start of date range to filter by
   * @param {Date} [params.endDate] - End of date range to filter by
   * @returns {Promise<Object>} Object containing usage statistics:
   *  - totalRecords: Number of usage records found
   *  - totalCredits: Total credits consumed
   *  - byService: Credits broken down by service
   *  - byDay: Credits broken down by day
   *  - byModel: Credits broken down by model (for chat operations)
   *  - recentActivity: Last 10 usage records
   */
  async getUserStats(params: {
    userId: string,
    startDate?: Date,
    endDate?: Date
  }) {
    const { userId, startDate, endDate } = params;
    
    const where: any = { userId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      
      if (startDate) {
        where.timestamp[Op.gte] = startDate;
      }
      
      if (endDate) {
        where.timestamp[Op.lte] = endDate;
      }
    }
    
    const usageRecords = await UsageRecord.findAll({ where });
    
    // Calculate statistics
    const totalCredits = usageRecords.reduce((sum, record) => sum + record.credits, 0);
    
    // Usage by service
    const byService: UsageStats = {};
    usageRecords.forEach(record => {
      byService[record.service] = (byService[record.service] || 0) + record.credits;
    });
    
    // Usage by day
    const byDay: UsageStats = {};
    usageRecords.forEach(record => {
      const day = record.timestamp.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + record.credits;
    });
    
    // Usage by model (for chat operations)
    const byModel: UsageStats = {};
    usageRecords.filter(r => r.service === 'chat' || r.service === 'chat-streaming')
      .forEach(record => {
        const model = record.operation;
        byModel[model] = (byModel[model] || 0) + record.credits;
      });
    
    return {
      totalRecords: usageRecords.length,
      totalCredits,
      byService,
      byDay,
      byModel,
      recentActivity: usageRecords.slice(-10) // Last 10 records
    };
  }
  
  // 20250523_test_flow
  /**
   * Get system-wide usage statistics (admin only)
   * 
   * @param {Object} params - Query parameters
   * @param {Date} [params.startDate] - Start of date range to filter by
   * @param {Date} [params.endDate] - End of date range to filter by
   * @returns {Promise<Object>} Object containing system-wide usage statistics:
   *  - totalRecords: Number of usage records found
   *  - totalCredits: Total credits consumed across all users
   *  - byUser: Credits broken down by user
   *  - byService: Credits broken down by service
   *  - byDay: Credits broken down by day
   *  - byModel: Credits broken down by model (for chat operations)
   */
  async getSystemStats(params: {
    startDate?: Date,
    endDate?: Date
  }) {
    const { startDate, endDate } = params;
    
    const where: any = {};
    
    if (startDate || endDate) {
      where.timestamp = {};
      
      if (startDate) {
        where.timestamp[Op.gte] = startDate;
      }
      
      if (endDate) {
        where.timestamp[Op.lte] = endDate;
      }
    }
    
    const usageRecords = await UsageRecord.findAll({ where });
    
    // Calculate statistics
    const totalCredits = usageRecords.reduce((sum, record) => sum + record.credits, 0);
    
    // Usage by user
    const byUser: UsageStats = {};
    usageRecords.forEach(record => {
      byUser[record.userId] = (byUser[record.userId] || 0) + record.credits;
    });
    
    // Usage by service
    const byService: UsageStats = {};
    usageRecords.forEach(record => {
      byService[record.service] = (byService[record.service] || 0) + record.credits;
    });
    
    // Usage by day
    const byDay: UsageStats = {};
    usageRecords.forEach(record => {
      const day = record.timestamp.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + record.credits;
    });
    
    // Top models used
    const byModel: UsageStats = {};
    usageRecords.filter(r => r.service === 'chat' || r.service === 'chat-streaming')
      .forEach(record => {
        const model = record.operation;
        byModel[model] = (byModel[model] || 0) + record.credits;
      });
    
    return {
      totalRecords: usageRecords.length,
      totalCredits,
      byUser,
      byService,
      byDay,
      byModel
    };
  }
}

export default new UsageService();