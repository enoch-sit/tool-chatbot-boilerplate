import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// In-memory store for rate limiting
// In production, this would be replaced with a Redis-based solution
const requestCounts: Record<string, { count: number, resetTime: number }> = {};

/**
 * Simple in-memory rate limiting middleware
 * @param maxRequests Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @param message Error message to return when rate limit is exceeded
 */
export function rateLimiter(
  maxRequests: number = 30,
  windowMs: number = 60 * 1000,
  message: string = 'Too many requests, please try again later'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get a unique identifier for the client (user ID or IP)
    const userId = req.user?.userId || req.ip || 'anonymous';
    const key = `ratelimit:${userId}`;
    
    // Get current time
    const now = Date.now();
    
    // Initialize or get current record
    if (!requestCounts[key] || requestCounts[key].resetTime <= now) {
      requestCounts[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Increment request count
    requestCounts[key].count += 1;
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCounts[key].count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(requestCounts[key].resetTime / 1000).toString());
    
    // Check if over limit
    if (requestCounts[key].count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${userId}`);
      
      // Set retry-after header
      const retryAfterSeconds = Math.ceil((requestCounts[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      
      return res.status(429).json({ 
        message,
        retryAfter: retryAfterSeconds
      });
    }
    
    next();
  };
}

/**
 * Specialized rate limiter for streaming endpoints
 * This applies stricter limits to prevent resource abuse
 */
export function streamingRateLimiter(
  maxStreams: number = 5,
  windowMs: number = 60 * 1000
) {
  return rateLimiter(
    maxStreams,
    windowMs,
    'Too many streaming requests, please try again later'
  );
}