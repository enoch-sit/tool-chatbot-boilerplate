// jest.setup.js
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.test file
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

console.log('Jest test environment setup complete');
console.log(`Using database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

// Mock user-account.service to prevent actual database connections
jest.mock('./src/services/user-account.service', () => {
  return {
    UserAccountService: jest.fn().mockImplementation(() => {
      return {
        findOrCreateUser: jest.fn().mockResolvedValue({
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          role: 'enduser',
        }),
        userExists: jest.fn().mockResolvedValue(true)
      };
    }),
    __esModule: true,
    default: {
      findOrCreateUser: jest.fn().mockResolvedValue({
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        role: 'enduser',
      }),
      userExists: jest.fn().mockResolvedValue(true)
    }
  };
});

// Mock streaming-session.service to prevent database connections
jest.mock('./src/services/streaming-session.service', () => {
  const mockSession = {
    id: 'session-123',
    userId: 'test-user-id',
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    status: 'active',
    tokenCount: 0,
    creditCost: 0,
    startedAt: new Date(),
    endedAt: null,
  };

  return {
    StreamingSessionService: jest.fn().mockImplementation(() => {
      return {
        createSession: jest.fn().mockResolvedValue(mockSession),
        endSession: jest.fn().mockResolvedValue({ ...mockSession, status: 'completed', endedAt: new Date() }),
        getActiveSessionsForUser: jest.fn().mockResolvedValue([mockSession]),
        getAllActiveSessions: jest.fn().mockResolvedValue([mockSession]),
        getSessionById: jest.fn().mockResolvedValue(mockSession),
        updateSessionTokenCount: jest.fn().mockResolvedValue({ ...mockSession, tokenCount: 500 }),
      };
    }),
    __esModule: true,
    default: {
      createSession: jest.fn().mockResolvedValue(mockSession),
      endSession: jest.fn().mockResolvedValue({ ...mockSession, status: 'completed', endedAt: new Date() }),
      getActiveSessionsForUser: jest.fn().mockResolvedValue([mockSession]),
      getAllActiveSessions: jest.fn().mockResolvedValue([mockSession]),
      getSessionById: jest.fn().mockResolvedValue(mockSession),
      updateSessionTokenCount: jest.fn().mockResolvedValue({ ...mockSession, tokenCount: 500 }),
    }
  };
});

// Mock usage.service to prevent database connections
jest.mock('./src/services/usage.service', () => {
  const mockUsageRecord = {
    id: 'usage-123',
    userId: 'test-user-id',
    sessionId: 'session-123',
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    promptTokens: 100,
    completionTokens: 400,
    totalTokens: 500,
    creditCost: 3,
    timestamp: new Date(),
  };

  return {
    UsageService: jest.fn().mockImplementation(() => {
      return {
        recordUsage: jest.fn().mockResolvedValue(mockUsageRecord),
        getUserUsage: jest.fn().mockResolvedValue([mockUsageRecord]),
        getModelUsage: jest.fn().mockResolvedValue([mockUsageRecord]),
      };
    }),
    __esModule: true,
    default: {
      recordUsage: jest.fn().mockResolvedValue(mockUsageRecord),
      getUserUsage: jest.fn().mockResolvedValue([mockUsageRecord]),
      getModelUsage: jest.fn().mockResolvedValue([mockUsageRecord]),
    }
  };
});

// Set up the timezone for consistent date handling in tests
process.env.TZ = 'UTC';