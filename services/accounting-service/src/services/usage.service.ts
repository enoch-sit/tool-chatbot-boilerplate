// src/services/usage.service.ts
import { Op } from 'sequelize';
import UsageRecord from '../models/usage-record.model';

interface UsageStats {
  [key: string]: number;
}

export class UsageService {
  /**
   * Record usage of a service
   */
  async recordUsage(params: {
    userId: string,
    service: string,
    operation: string,
    credits: number,
    metadata?: any
  }) {
    const { userId, service, operation, credits, metadata } = params;
    
    return UsageRecord.create({
      userId,
      timestamp: new Date(),
      service,
      operation,
      credits,
      metadata: metadata || {}
    });
  }
  
  /**
   * Get usage statistics for a user in a date range
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
  
  /**
   * Get system-wide usage statistics (admin only)
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