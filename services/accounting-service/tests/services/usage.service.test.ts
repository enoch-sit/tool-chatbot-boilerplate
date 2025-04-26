// tests/services/usage.service.test.ts
import { UsageService } from '../../src/services/usage.service';
import UsageRecord from '../../src/models/usage-record.model';
import { Op } from 'sequelize';

// Mock Sequelize models
jest.mock('../../src/models/usage-record.model');

describe('UsageService', () => {
  let usageService: UsageService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    usageService = new UsageService();
  });
  
  describe('recordUsage', () => {
    it('should create a new usage record', async () => {
      // Setup mock data
      const usageParams = {
        userId: 'user123',
        service: 'chat-streaming',
        operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
        credits: 5,
        metadata: {
          sessionId: 'session123',
          tokens: 1800,
          streamingDuration: 15.5
        }
      };
      
      const mockRecord = {
        id: 1,
        userId: 'user123',
        timestamp: new Date(),
        service: 'chat-streaming',
        operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
        credits: 5,
        metadata: {
          sessionId: 'session123',
          tokens: 1800,
          streamingDuration: 15.5
        }
      };
      
      // Mock the create method
      (UsageRecord.create as jest.Mock).mockResolvedValue(mockRecord);
      
      // Call the method
      const result = await usageService.recordUsage(usageParams);
      
      // Verify the result
      expect(result).toEqual(mockRecord);
      
      // Verify the UsageRecord.create was called correctly
      expect(UsageRecord.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        service: 'chat-streaming',
        operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
        credits: 5,
        metadata: usageParams.metadata
      }));
    });
    
    it('should handle optional metadata field', async () => {
      // Setup mock data without metadata
      const usageParams = {
        userId: 'user123',
        service: 'chat-streaming',
        operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
        credits: 5
      };
      
      const mockRecord = {
        id: 1,
        userId: 'user123',
        timestamp: new Date(),
        service: 'chat-streaming',
        operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
        credits: 5,
        metadata: {}
      };
      
      // Mock the create method
      (UsageRecord.create as jest.Mock).mockResolvedValue(mockRecord);
      
      // Call the method
      const result = await usageService.recordUsage(usageParams);
      
      // Verify the result
      expect(result).toEqual(mockRecord);
      
      // Verify that empty metadata object was passed
      expect(UsageRecord.create).toHaveBeenCalledWith(expect.objectContaining({
        metadata: {}
      }));
    });
  });
  
  describe('getUserStats', () => {
    it('should return usage statistics for a user', async () => {
      // Setup mock data
      const mockRecords = [
        {
          id: 1,
          userId: 'user123',
          timestamp: new Date('2025-04-01T10:00:00Z'),
          service: 'chat-streaming',
          operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
          credits: 5,
          metadata: {}
        },
        {
          id: 2,
          userId: 'user123',
          timestamp: new Date('2025-04-01T14:00:00Z'),
          service: 'chat-streaming',
          operation: 'anthropic.claude-3-haiku-20240307-v1:0',
          credits: 2,
          metadata: {}
        },
        {
          id: 3,
          userId: 'user123',
          timestamp: new Date('2025-04-02T09:00:00Z'),
          service: 'chat',
          operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
          credits: 3,
          metadata: {}
        }
      ];
      
      // Mock the findAll method
      (UsageRecord.findAll as jest.Mock).mockResolvedValue(mockRecords);
      
      // Call the method
      const result = await usageService.getUserStats({
        userId: 'user123',
        startDate: new Date('2025-04-01T00:00:00Z'),
        endDate: new Date('2025-04-30T23:59:59Z')
      });
      
      // Verify the result
      expect(result.totalRecords).toBe(3);
      expect(result.totalCredits).toBe(10); // 5 + 2 + 3
      
      // Check service breakdown
      expect(result.byService['chat-streaming']).toBe(7); // 5 + 2
      expect(result.byService['chat']).toBe(3);
      
      // Check date breakdown
      expect(result.byDay['2025-04-01']).toBe(7); // 5 + 2
      expect(result.byDay['2025-04-02']).toBe(3);
      
      // Check model breakdown
      expect(result.byModel['anthropic.claude-3-sonnet-20240229-v1:0']).toBe(8); // 5 + 3
      expect(result.byModel['anthropic.claude-3-haiku-20240307-v1:0']).toBe(2);
      
      // Verify that the query parameters were correct
      expect(UsageRecord.findAll).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          timestamp: {
            [Op.gte]: expect.any(Date),
            [Op.lte]: expect.any(Date)
          }
        }
      });
    });
    
    it('should handle missing date parameters', async () => {
      // Setup mock data
      const mockRecords = [
        {
          id: 1,
          userId: 'user123',
          timestamp: new Date('2025-04-01T10:00:00Z'),
          service: 'chat-streaming',
          operation: 'model1',
          credits: 5,
          metadata: {}
        }
      ];
      
      // Mock the findAll method
      (UsageRecord.findAll as jest.Mock).mockResolvedValue(mockRecords);
      
      // Call the method without date parameters
      const result = await usageService.getUserStats({
        userId: 'user123'
      });
      
      // Verify the result
      expect(result.totalRecords).toBe(1);
      expect(result.totalCredits).toBe(5);
      
      // Verify that the query parameters were correct
      expect(UsageRecord.findAll).toHaveBeenCalledWith({
        where: {
          userId: 'user123'
        }
      });
    });
    
    it('should handle empty results', async () => {
      // Mock the findAll method to return empty array
      (UsageRecord.findAll as jest.Mock).mockResolvedValue([]);
      
      // Call the method
      const result = await usageService.getUserStats({
        userId: 'user123'
      });
      
      // Verify the result
      expect(result.totalRecords).toBe(0);
      expect(result.totalCredits).toBe(0);
      expect(Object.keys(result.byService).length).toBe(0);
      expect(Object.keys(result.byDay).length).toBe(0);
      expect(Object.keys(result.byModel).length).toBe(0);
      expect(result.recentActivity).toEqual([]);
    });
  });
  
  describe('getSystemStats', () => {
    it('should return system-wide usage statistics', async () => {
      // Setup mock data
      const mockRecords = [
        {
          id: 1,
          userId: 'user1',
          timestamp: new Date('2025-04-01T10:00:00Z'),
          service: 'chat-streaming',
          operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
          credits: 5,
          metadata: {}
        },
        {
          id: 2,
          userId: 'user2',
          timestamp: new Date('2025-04-01T14:00:00Z'),
          service: 'chat-streaming',
          operation: 'anthropic.claude-3-haiku-20240307-v1:0',
          credits: 2,
          metadata: {}
        },
        {
          id: 3,
          userId: 'user1',
          timestamp: new Date('2025-04-02T09:00:00Z'),
          service: 'chat',
          operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
          credits: 3,
          metadata: {}
        }
      ];
      
      // Mock the findAll method
      (UsageRecord.findAll as jest.Mock).mockResolvedValue(mockRecords);
      
      // Call the method
      const result = await usageService.getSystemStats({
        startDate: new Date('2025-04-01T00:00:00Z'),
        endDate: new Date('2025-04-30T23:59:59Z')
      });
      
      // Verify the result
      expect(result.totalRecords).toBe(3);
      expect(result.totalCredits).toBe(10); // 5 + 2 + 3
      
      // Check user breakdown
      expect(result.byUser['user1']).toBe(8); // 5 + 3
      expect(result.byUser['user2']).toBe(2);
      
      // Check service breakdown
      expect(result.byService['chat-streaming']).toBe(7); // 5 + 2
      expect(result.byService['chat']).toBe(3);
      
      // Check date breakdown
      expect(result.byDay['2025-04-01']).toBe(7); // 5 + 2
      expect(result.byDay['2025-04-02']).toBe(3);
      
      // Check model breakdown
      expect(result.byModel['anthropic.claude-3-sonnet-20240229-v1:0']).toBe(8); // 5 + 3
      expect(result.byModel['anthropic.claude-3-haiku-20240307-v1:0']).toBe(2);
      
      // Verify that the query parameters were correct
      expect(UsageRecord.findAll).toHaveBeenCalledWith({
        where: {
          timestamp: {
            [Op.gte]: expect.any(Date),
            [Op.lte]: expect.any(Date)
          }
        }
      });
    });
    
    it('should handle missing date parameters', async () => {
      // Setup mock data
      const mockRecords = [
        {
          id: 1,
          userId: 'user1',
          timestamp: new Date('2025-04-01T10:00:00Z'),
          service: 'chat-streaming',
          operation: 'model1',
          credits: 5,
          metadata: {}
        }
      ];
      
      // Mock the findAll method
      (UsageRecord.findAll as jest.Mock).mockResolvedValue(mockRecords);
      
      // Call the method without date parameters
      const result = await usageService.getSystemStats({});
      
      // Verify the result
      expect(result.totalRecords).toBe(1);
      expect(result.totalCredits).toBe(5);
      
      // Verify that the query parameters were correct
      expect(UsageRecord.findAll).toHaveBeenCalledWith({
        where: {}
      });
    });
    
    it('should handle empty results', async () => {
      // Mock the findAll method to return empty array
      (UsageRecord.findAll as jest.Mock).mockResolvedValue([]);
      
      // Call the method
      const result = await usageService.getSystemStats({});
      
      // Verify the result
      expect(result.totalRecords).toBe(0);
      expect(result.totalCredits).toBe(0);
      expect(Object.keys(result.byUser).length).toBe(0);
      expect(Object.keys(result.byService).length).toBe(0);
      expect(Object.keys(result.byDay).length).toBe(0);
      expect(Object.keys(result.byModel).length).toBe(0);
    });
  });
});