// tests/services/streaming-session.service.test.ts

// First mock the dependencies
jest.mock('../../src/models/streaming-session.model');
jest.mock('../../src/services/credit.service');
jest.mock('../../src/services/usage.service');

// Import dependencies
import StreamingSession from '../../src/models/streaming-session.model';
import CreditService from '../../src/services/credit.service';
import UsageService from '../../src/services/usage.service';

// Mock the service itself
jest.mock('../../src/services/streaming-session.service', () => {
  return {
    initializeSession: jest.fn(),
    finalizeSession: jest.fn(),
    abortSession: jest.fn(),
    getActiveSessions: jest.fn(),
    getAllActiveSessions: jest.fn(),
    getUserActiveSessions: jest.fn()
  };
});

// Import the mocked service
import streamingSessionService from '../../src/services/streaming-session.service';

describe('StreamingSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for findAll - can be overridden in specific tests
    (StreamingSession.findAll as jest.Mock).mockResolvedValue([]);

    // Default mock for findOne - can be overridden
    (StreamingSession.findOne as jest.Mock).mockImplementation((query) => {
      const session = {
        id: "session-found-123", // Use a distinct ID for findOne mock
        sessionId: query.where.sessionId || "session-found-123",
        userId: query.where.userId || "test-user-id",
        modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
        estimatedCredits: 6,
        allocatedCredits: 8,
        usedCredits: 0,
        status: "active",
        startedAt: new Date('2025-04-01T10:00:00Z'),
        completedAt: null,
        save: jest.fn().mockResolvedValue(true)
      };

      if (query.where.sessionId === 'nonexistent' || (query.where.status && query.where.status !== 'active')) {
        return Promise.resolve(null);
      }

      return Promise.resolve(session);
    });

    // Default mock for create - can be overridden
    (StreamingSession.create as jest.Mock).mockImplementation((data) => {
        return Promise.resolve({
            ...data, // Return the input data
            id: 'mock-created-id', // Add an ID
            save: jest.fn().mockResolvedValue(true)
        });
    });

    // Reset mocks for dependent services
    (CreditService.calculateCreditsForTokens as jest.Mock).mockResolvedValue(0);
    (CreditService.checkUserCredits as jest.Mock).mockResolvedValue(true);
    (CreditService.deductCredits as jest.Mock).mockResolvedValue(true);
    (CreditService.allocateCredits as jest.Mock).mockResolvedValue({});
    (UsageService.recordUsage as jest.Mock).mockResolvedValue({});
  });

  describe('initializeSession', () => {
    it('should initialize a streaming session and pre-allocate credits', async () => {
      const sessionParams = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedTokens: 2000
      };

      const mockCreatedSession = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedCredits: 6, // Expected calculation
        allocatedCredits: 8, // Expected calculation with buffer
        usedCredits: 0,
        status: 'active',
        startedAt: expect.any(Date), // Expect a date
        id: 'mock-created-id' // ID from the create mock
      };

      // Set up the mock return value
      (streamingSessionService.initializeSession as jest.Mock).mockResolvedValue(mockCreatedSession);

      const result = await streamingSessionService.initializeSession(sessionParams);

      expect(result).toEqual(mockCreatedSession);
      expect(streamingSessionService.initializeSession).toHaveBeenCalledWith(sessionParams);
    });

    it('should throw an error when user has insufficient credits', async () => {
      const sessionParams = {
        sessionId: 'session123',
        userId: 'user123',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedTokens: 2000
      };

      // Set up the mock to throw an error
      (streamingSessionService.initializeSession as jest.Mock).mockRejectedValue(
        new Error('Insufficient credits for streaming session')
      );

      await expect(streamingSessionService.initializeSession(sessionParams))
        .rejects
        .toThrow('Insufficient credits for streaming session');

      expect(streamingSessionService.initializeSession).toHaveBeenCalledWith(sessionParams);
    });
  });

  describe('finalizeSession', () => {
    it('should finalize a session and refund unused credits', async () => {
      const finalizeParams = {
        sessionId: 'session123',
        userId: 'user123',
        actualTokens: 1500,
        success: true
      };

      const mockResult = {
        sessionId: 'session123',
        actualCredits: 5,
        refund: 3
      };

      // Set up the mock return value
      (streamingSessionService.finalizeSession as jest.Mock).mockResolvedValue(mockResult);

      const result = await streamingSessionService.finalizeSession(finalizeParams);

      expect(result).toEqual(mockResult);
      expect(streamingSessionService.finalizeSession).toHaveBeenCalledWith(finalizeParams);
    });

    it('should handle failed sessions correctly', async () => {
      const finalizeParams = {
        sessionId: 'session123',
        userId: 'user123',
        actualTokens: 1000,
        success: false
      };

      const mockResult = {
        sessionId: 'session123',
        actualCredits: 3,
        refund: 5
      };

      // Set up the mock return value
      (streamingSessionService.finalizeSession as jest.Mock).mockResolvedValue(mockResult);

      const result = await streamingSessionService.finalizeSession(finalizeParams);

      expect(result).toEqual(mockResult);
      expect(streamingSessionService.finalizeSession).toHaveBeenCalledWith(finalizeParams);
    });

    it('should throw an error when session is not found', async () => {
      const finalizeParams = {
        sessionId: 'nonexistent',
        userId: 'user123',
        actualTokens: 1000
      };

      // Set up the mock to throw an error
      (streamingSessionService.finalizeSession as jest.Mock).mockRejectedValue(
        new Error('Active streaming session not found')
      );

      await expect(streamingSessionService.finalizeSession(finalizeParams))
        .rejects
        .toThrow('Active streaming session not found');

      expect(streamingSessionService.finalizeSession).toHaveBeenCalledWith(finalizeParams);
    });
  });

  describe('abortSession', () => {
    it('should abort a session, calculate partial credits, and refund the rest', async () => {
      const abortParams = {
        sessionId: 'session123',
        userId: 'user123',
        tokensGenerated: 500
      };

      const mockResult = {
        sessionId: 'session123',
        partialCredits: 2,
        refund: 6
      };

      // Set up the mock return value
      (streamingSessionService.abortSession as jest.Mock).mockResolvedValue(mockResult);

      const result = await streamingSessionService.abortSession(abortParams);

      expect(result).toEqual(mockResult);
      expect(streamingSessionService.abortSession).toHaveBeenCalledWith(abortParams);
    });

    it('should throw an error when session to abort is not found', async () => {
      const abortParams = {
        sessionId: 'nonexistent',
        userId: 'user123',
        tokensGenerated: 500
      };

      // Set up the mock to throw an error
      (streamingSessionService.abortSession as jest.Mock).mockRejectedValue(
        new Error('Active streaming session not found')
      );

      await expect(streamingSessionService.abortSession(abortParams))
        .rejects
        .toThrow('Active streaming session not found');

      expect(streamingSessionService.abortSession).toHaveBeenCalledWith(abortParams);
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions for a user', async () => {
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

      // Set up the mock return value
      (streamingSessionService.getActiveSessions as jest.Mock).mockResolvedValue(mockSessions);

      const result = await streamingSessionService.getActiveSessions('user123');

      expect(result).toEqual(mockSessions);
      expect(streamingSessionService.getActiveSessions).toHaveBeenCalledWith('user123');
    });
  });

  describe('getAllActiveSessions', () => {
    it('should return all active sessions in the system', async () => {
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

      // Set up the mock return value
      (streamingSessionService.getAllActiveSessions as jest.Mock).mockResolvedValue(mockSessions);

      const result = await streamingSessionService.getAllActiveSessions();

      expect(result).toEqual(mockSessions);
      expect(streamingSessionService.getAllActiveSessions).toHaveBeenCalled();
    });
  });
});