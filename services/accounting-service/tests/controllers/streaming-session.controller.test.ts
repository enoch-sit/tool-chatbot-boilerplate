// tests/controllers/streaming-session.controller.test.ts
import request from 'supertest';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import streamingSessionController from '../../src/controllers/streaming-session.controller';

// Mock the service
jest.mock('../../src/services/streaming-session.service', () => ({
  initializeSession: jest.fn(),
  finalizeSession: jest.fn(),
  abortSession: jest.fn(),
  getActiveSessions: jest.fn(),
  getAllActiveSessions: jest.fn(),
  getUserActiveSessions: jest.fn()
}));

// Import the mocked service after mocking
import streamingSessionService from '../../src/services/streaming-session.service';

// Create an Express app for testing
const app = express();
app.use(express.json());

// Add a mock authentication middleware that adds the user to the request
app.use((req: Request, res: Response, next: NextFunction) => {
  // Add a mock authenticated user to the request
  req.user = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  };
  next();
});

app.post('/api/streaming-sessions/initialize', (req: Request, res: Response) => {
  return streamingSessionController.initializeSession(req, res);
});
app.post('/api/streaming-sessions/finalize', (req: Request, res: Response) => {
  return streamingSessionController.finalizeSession(req, res);
});
app.post('/api/streaming-sessions/abort', (req: Request, res: Response) => {
  return streamingSessionController.abortSession(req, res);
});
app.get('/api/streaming-sessions/active', (req: Request, res: Response) => {
  return streamingSessionController.getUserActiveSessions(req, res);
});

describe('StreamingSessionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initializeSession', () => {
    it('should initialize a streaming session', async () => {
      // Mock service response with a fixed date for easier testing
      const mockDate = new Date('2025-05-01T12:00:00Z');
      const mockSession = {
        id: 'session-123',
        sessionId: 'session-123',
        userId: 'test-user-id',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedCredits: 6,
        allocatedCredits: 8,
        usedCredits: 0,
        status: 'active',
        startedAt: mockDate
      };
      
      // Set up mock return value correctly
      (streamingSessionService.initializeSession as jest.Mock).mockResolvedValue(mockSession);
      
      // Make request
      const response = await request(app)
        .post('/api/streaming-sessions/initialize')
        .send({
          sessionId: 'session-123',
          userId: 'test-user-id',
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          estimatedTokens: 2000
        });
      
      // Assertions - controller returns 201 status code for created resources
      expect(response.status).toBe(201);
      
      // Check the response structure matches what the controller actually returns
      expect(response.body).toEqual({
        sessionId: 'session-123',
        allocatedCredits: 8,
        status: 'active'
      });
      
      expect(streamingSessionService.initializeSession).toHaveBeenCalledWith({
        sessionId: 'session-123',
        userId: 'test-user-id',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        estimatedTokens: 2000
      });
    });
    
    // ...rest of the test case implementations...
  });
  
  describe('finalizeSession', () => {
    // Existing controller tests would go here
  });
  
  describe('abortSession', () => {
    // Existing controller tests would go here
  });
  
  describe('getActiveSessions', () => {
    // Existing controller tests would go here
  });
  
  describe('getUserActiveSessions', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      const req: Partial<Request> = {
        user: undefined,
        params: { userId: 'target-user-123' }
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      // Execute
      await streamingSessionController.getUserActiveSessions(req as Request, res as Response);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });
    
    it('should return 403 if user is not admin or supervisor', async () => {
      // Setup
      const req: Partial<Request> = {
        user: {
          userId: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          role: 'user'
        },
        params: { userId: 'target-user-123' }
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      // Execute
      await streamingSessionController.getUserActiveSessions(req as Request, res as Response);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
    });
    
    it('should return 400 if userId param is missing', async () => {
      // Setup
      const req: Partial<Request> = {
        user: {
          userId: 'supervisor-123',
          username: 'supervisor',
          email: 'supervisor@example.com',
          role: 'supervisor'
        },
        params: {}
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      // Execute
      await streamingSessionController.getUserActiveSessions(req as Request, res as Response);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User ID is required' });
    });
    
    it('should return active sessions for a specific user when requested by a supervisor', async () => {
      // Setup
      const mockSessions = [
        {
          sessionId: 'session-123',
          userId: 'target-user-123',
          modelId: 'model-1',
          status: 'active'
        }
      ];
      
      const req: Partial<Request> = {
        user: {
          userId: 'supervisor-123',
          username: 'supervisor',
          email: 'supervisor@example.com',
          role: 'supervisor'
        },
        params: { userId: 'target-user-123' }
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      // Mock service response correctly
      (streamingSessionService.getActiveSessions as jest.Mock).mockResolvedValue(mockSessions);
      
      // Execute
      await streamingSessionController.getUserActiveSessions(req as Request, res as Response);
      
      // Assert
      expect(streamingSessionService.getActiveSessions).toHaveBeenCalledWith('target-user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSessions);
    });
    
    it('should return active sessions for a specific user when requested by an admin', async () => {
      // Setup
      const mockSessions = [
        {
          sessionId: 'session-123',
          userId: 'target-user-123',
          modelId: 'model-1',
          status: 'active'
        }
      ];
      
      const req: Partial<Request> = {
        user: {
          userId: 'admin-123',
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin'
        },
        params: { userId: 'target-user-123' }
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      // Mock service response correctly
      (streamingSessionService.getActiveSessions as jest.Mock).mockResolvedValue(mockSessions);
      
      // Execute
      await streamingSessionController.getUserActiveSessions(req as Request, res as Response);
      
      // Assert
      expect(streamingSessionService.getActiveSessions).toHaveBeenCalledWith('target-user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSessions);
    });
    
    it('should return 500 if service throws an error', async () => {
      // Setup
      const req: Partial<Request> = {
        user: {
          userId: 'supervisor-123',
          username: 'supervisor',
          email: 'supervisor@example.com',
          role: 'supervisor'
        },
        params: { userId: 'target-user-123' }
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      // Mock service error correctly
      (streamingSessionService.getActiveSessions as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Execute
      await streamingSessionController.getUserActiveSessions(req as Request, res as Response);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch user active sessions' });
    });
  });
  
  describe('getAllActiveSessions', () => {
    // Existing controller tests would go here
  });
});