// tests/services/streaming-session.service.test.ts
import { StreamingSessionService } from '../../src/services/streaming-session.service';
import StreamingSession from '../../src/models/streaming-session.model';
import CreditService from '../../src/services/credit.service';
import UsageService from '../../src/services/usage.service';

// Mock dependencies
jest.mock('../../src/models/streaming-session.model');
jest.mock('../../src/services/credit.service');
jest.mock('../../src/services/usage.service');

describe('StreamingSessionService', () => {
  let streamingSessionService: StreamingSessionService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    streamingSessionService = new StreamingSessionService();
  });
  
  describe('initializeSession', () => {
    it('should initialize a streaming session and pre-allocate credits', async () => {
      // Setup mock data
      const sessionParams = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedTokens: 2000
      };
      
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedCredits: 6, // 2000 tokens at 3 credits per 1000 tokens
        allocatedCredits: 8, // 20% buffer
        usedCredits: 0,
        status: 'active',
        startedAt: new Date()
      };
      
      // Mock dependencies
      (CreditService.calculateCreditsForTokens as jest.Mock).mockResolvedValue(6);
      (CreditService.checkUserCredits as jest.Mock).mockResolvedValue(true);
      (CreditService.deductCredits as jest.Mock).mockResolvedValue(true);
      (StreamingSession.create as jest.Mock).mockResolvedValue(mockSession);
      
      // Call the method
      const result = await streamingSessionService.initializeSession(sessionParams);
      
      // Verify the result
      expect(result).toEqual(mockSession);
      
      // Verify that credit calculation was called correctly
      expect(CreditService.calculateCreditsForTokens).toHaveBeenCalledWith(
        'anthropic.claude-3-sonnet-20240229-v1:0',
        2000
      );
      
      // Verify that credit check was called correctly
      expect(CreditService.checkUserCredits).toHaveBeenCalledWith('user123', 8);
      
      // Verify that credit deduction was called correctly
      expect(CreditService.deductCredits).toHaveBeenCalledWith('user123', 8);
      
      // Verify that session was created correctly
      expect(StreamingSession.create).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedCredits: 6,
        allocatedCredits: 8,
        usedCredits: 0,
        status: 'active'
      }));
    });
    
    it('should throw an error when user has insufficient credits', async () => {
      // Setup mock data
      const sessionParams = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedTokens: 2000
      };
      
      // Mock dependencies
      (CreditService.calculateCreditsForTokens as jest.Mock).mockResolvedValue(6);
      (CreditService.checkUserCredits as jest.Mock).mockResolvedValue(false);
      
      // Call the method and expect it to throw
      await expect(streamingSessionService.initializeSession(sessionParams))
        .rejects
        .toThrow('Insufficient credits for streaming session');
      
      // Verify that credit calculation was called
      expect(CreditService.calculateCreditsForTokens).toHaveBeenCalled();
      
      // Verify that credit check was called
      expect(CreditService.checkUserCredits).toHaveBeenCalled();
      
      // Verify that credit deduction was NOT called
      expect(CreditService.deductCredits).not.toHaveBeenCalled();
      
      // Verify that session was NOT created
      expect(StreamingSession.create).not.toHaveBeenCalled();
    });
  });
  
  describe('finalizeSession', () => {
    it('should finalize a session and refund unused credits', async () => {
      // Setup mock data
      const finalizeParams = {
        sessionId: 'session123',
        userId: 'user123',
        actualTokens: 1500,
        success: true
      };
      
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedCredits: 6,
        allocatedCredits: 8,
        usedCredits: 0,
        status: 'active',
        startedAt: new Date('2025-04-01T10:00:00Z'),
        completedAt: null,
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock dependencies
      (StreamingSession.findOne as jest.Mock).mockResolvedValue(mockSession);
      (CreditService.calculateCreditsForTokens as jest.Mock).mockResolvedValue(5);
      (UsageService.recordUsage as jest.Mock).mockResolvedValue({});
      (CreditService.allocateCredits as jest.Mock).mockResolvedValue({});
      
      // Call the method
      const result = await streamingSessionService.finalizeSession(finalizeParams);
      
      // Verify the result
      expect(result).toEqual({
        sessionId: 'session123',
        actualCredits: 5,
        refund: 3 // 8 allocated - 5 used
      });
      
      // Verify session was updated correctly
      expect(mockSession.usedCredits).toBe(5);
      expect(mockSession.status).toBe('completed');
      expect(mockSession.completedAt).toBeInstanceOf(Date);
      expect(mockSession.save).toHaveBeenCalled();
      
      // Verify that usage was recorded
      expect(UsageService.recordUsage).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        service: 'chat-streaming',
        operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
        credits: 5
      }));
      
      // Verify that refund was issued
      expect(CreditService.allocateCredits).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        credits: 3,
        allocatedBy: 'system-refund'
      }));
    });
    
    it('should handle failed sessions correctly', async () => {
      // Setup mock data
      const finalizeParams = {
        sessionId: 'session123',
        userId: 'user123',
        actualTokens: 1000,
        success: false
      };
      
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedCredits: 6,
        allocatedCredits: 8,
        usedCredits: 0,
        status: 'active',
        startedAt: new Date('2025-04-01T10:00:00Z'),
        completedAt: null,
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock dependencies
      (StreamingSession.findOne as jest.Mock).mockResolvedValue(mockSession);
      (CreditService.calculateCreditsForTokens as jest.Mock).mockResolvedValue(3);
      (UsageService.recordUsage as jest.Mock).mockResolvedValue({});
      (CreditService.allocateCredits as jest.Mock).mockResolvedValue({});
      
      // Call the method
      const result = await streamingSessionService.finalizeSession(finalizeParams);
      
      // Verify the result
      expect(result).toEqual({
        sessionId: 'session123',
        actualCredits: 3,
        refund: 5 // 8 allocated - 3 used
      });
      
      // Verify session was updated correctly with failed status
      expect(mockSession.status).toBe('failed');
    });
    
    it('should throw an error when session is not found', async () => {
      // Setup mock data
      const finalizeParams = {
        sessionId: 'nonexistent',
        userId: 'user123',
        actualTokens: 1000
      };
      
      // Mock dependencies
      (StreamingSession.findOne as jest.Mock).mockResolvedValue(null);
      
      // Call the method and expect it to throw
      await expect(streamingSessionService.finalizeSession(finalizeParams))
        .rejects
        .toThrow('Active streaming session not found');
    });
  });
  
  describe('abortSession', () => {
    it('should abort a session, calculate partial credits, and refund the rest', async () => {
      // Setup mock data
      const abortParams = {
        sessionId: 'session123',
        userId: 'user123',
        tokensGenerated: 500
      };
      
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedCredits: 6,
        allocatedCredits: 8,
        usedCredits: 0,
        status: 'active',
        startedAt: new Date('2025-04-01T10:00:00Z'),
        completedAt: null,
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock dependencies
      (StreamingSession.findOne as jest.Mock).mockResolvedValue(mockSession);
      (CreditService.calculateCreditsForTokens as jest.Mock).mockResolvedValue(2);
      (UsageService.recordUsage as jest.Mock).mockResolvedValue({});
      (CreditService.allocateCredits as jest.Mock).mockResolvedValue({});
      
      // Call the method
      const result = await streamingSessionService.abortSession(abortParams);
      
      // Verify the result
      expect(result).toEqual({
        sessionId: 'session123',
        partialCredits: 2,
        refund: 6 // 8 allocated - 2 used
      });
      
      // Verify session was updated correctly
      expect(mockSession.usedCredits).toBe(2);
      expect(mockSession.status).toBe('failed');
      expect(mockSession.completedAt).toBeInstanceOf(Date);
      expect(mockSession.save).toHaveBeenCalled();
      
      // Verify that usage was recorded with aborted flag
      expect(UsageService.recordUsage).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        service: 'chat-streaming-aborted',
        operation: 'anthropic.claude-3-sonnet-20240229-v1:0',
        credits: 2
      }));
      
      // Verify that refund was issued
      expect(CreditService.allocateCredits).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        credits: 6,
        allocatedBy: 'system-refund'
      }));
    });
  });
  
  describe('getActiveSessions', () => {
    it('should return all active sessions for a user', async () => {
      // Setup mock data
      const mockSessions = [
        {
          sessionId: 'session123',
          userId: 'user123',
          modelId: 'model1',
          status: 'active'
        },
        {
          sessionId: 'session456',
          userId: 'user123',
          modelId: 'model2',
          status: 'active'
        }
      ];
      
      // Mock dependencies
      (StreamingSession.findAll as jest.Mock).mockResolvedValue(mockSessions);
      
      // Call the method
      const result = await streamingSessionService.getActiveSessions('user123');
      
      // Verify the result
      expect(result).toEqual(mockSessions);
      
      // Verify query was correct
      expect(StreamingSession.findAll).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          status: 'active'
        }
      });
    });
  });
  
  describe('getAllActiveSessions', () => {
    it('should return all active sessions in the system', async () => {
      // Setup mock data
      const mockSessions = [
        {
          sessionId: 'session123',
          userId: 'user1',
          modelId: 'model1',
          status: 'active'
        },
        {
          sessionId: 'session456',
          userId: 'user2',
          modelId: 'model2',
          status: 'active'
        }
      ];
      
      // Mock dependencies
      (StreamingSession.findAll as jest.Mock).mockResolvedValue(mockSessions);
      
      // Call the method
      const result = await streamingSessionService.getAllActiveSessions();
      
      // Verify the result
      expect(result).toEqual(mockSessions);
      
      // Verify query was correct
      expect(StreamingSession.findAll).toHaveBeenCalledWith({
        where: {
          status: 'active'
        }
      });
    });
  });
});