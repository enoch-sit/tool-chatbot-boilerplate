/**
 * Authentication and Authorization Middleware
 * 
 * This module provides middleware functions for user authentication and
 * role-based authorization in the Chat Service. It verifies JWT tokens
 * and enforces access control policies based on user roles.
 * 
 * The module handles:
 * - JWT token extraction and verification
 * - User identity attachment to request objects
 * - Role-based access control for protected routes
 * - Comprehensive error handling for authentication failures
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import logger from '../utils/logger';

/**
 * Type Extension for Express Request
 * 
 * Extends the Express Request interface to include a user object
 * that contains authenticated user information after successful
 * JWT validation.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;     // Unique identifier for the user
        username?: string;  // User's display name
        email?: string;     // User's email address
        role?: string;      // User's role (admin, supervisor, user)
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * 
 * Validates JWT tokens from the request Authorization header,
 * extracts user information, and attaches it to the request object.
 * 
 * Authentication process:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Extract user details from token payload
 * 4. Attach user info to request for downstream handlers
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns void, calls next() on success or returns error response
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists
  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication token is missing' });
  }

  // Extract token from header (remove "Bearer " prefix)
  const token = authHeader.split(' ')[1];

  try {
    // Verify token using service's JWT secret
    const decoded = jwt.verify(token, config.jwtAccessSecret) as any;
    
    // Attach user info to request object
    req.user = {
      userId: decoded.sub,     // Subject claim contains user ID
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Log authentication failure for security monitoring
    logger.error('JWT verification failed:', error);
    
    // Return standardized error response
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Role-Based Access Control Middleware Factory
 * 
 * Creates middleware that restricts access to routes based on user roles.
 * This factory function returns a middleware that checks if the authenticated
 * user has one of the required roles.
 * 
 * @param roles - Array of role names that are permitted access
 * @returns Express middleware function that enforces role-based access
 */
export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure user is authenticated and has a defined role
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Permission denied: User role not defined' });
    }

    // Check if user's role is in the list of allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied: Insufficient role privileges' });
    }

    // User has required role, proceed to the protected route
    next();
  };
};