// src/middleware/jwt.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserAccount from '../models/user-account.model';
import UserAccountService from '../services/user-account.service';

// Extend the Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: string;
  type: string;
  iat: number;
  exp: number;
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token using shared JWT secret
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
    
    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    
    // Find or create user account in accounting database using our service
    try {
      await UserAccountService.findOrCreateUser({
        userId: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role
      });
      
      // Attach user info to request object
      req.user = {
        userId: decoded.sub,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
      
      next();
    } catch (userError) {
      console.error('Error processing user account:', userError);
      return res.status(500).json({ message: 'Failed to process user account' });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
    }
    
    console.error('JWT authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const requireSupervisor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'supervisor' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Supervisor access required' });
  }
  next();
};