/**
 * Rate Limiting Middleware
 * 
 * This module provides protection against excessive API usage through
 * a configurable rate limiting mechanism. It tracks request frequency
 * for individual users and limits access when thresholds are exceeded.
 * 
 * The implementation uses an in-memory store for development/testing,
 * but should be replaced with a distributed solution (Redis) in production
 * to support horizontal scaling.
 * 
 * Features:
 * - User-specific rate limiting (by user ID or IP)
 * - Configurable request thresholds and time windows
 * - Standard rate limit HTTP headers
 * - Specialized limiters for resource-intensive operations
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * In-memory store for tracking request counts per user
 * 
 * In a production environment, this should be replaced with a
 * Redis-based solution to support distributed deployment and
 * prevent memory leaks.
 * 
 * Structure:
 * {
 *   "ratelimit:userId": { count: number, resetTime: timestamp }
 * }
 */
const requestCounts: Record<string, { count: number, resetTime: number }> = {};

/**
 * Rate Limiting Middleware Factory
 * 
 * Creates a middleware function that enforces request rate limits
 * for API clients. The middleware identifies clients by user ID
 * (when authenticated) or IP address (when not authenticated).
 * 
 * The middleware sets standard rate limit headers:
 * - X-RateLimit-Limit: Maximum requests allowed in window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Time when the current window resets (Unix timestamp)
 * - Retry-After: Seconds to wait before retrying (when limited)
 * 
 * @param maxRequests - Maximum number of requests allowed in the time window (default: 30)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param message - Error message to return when rate limit is exceeded
 * @returns Express middleware function that enforces rate limits
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
    // Reset the counter if the time window has expired
    if (!requestCounts[key] || requestCounts[key].resetTime <= now) {
      requestCounts[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Increment request count
    requestCounts[key].count += 1;
    
    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCounts[key].count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(requestCounts[key].resetTime / 1000).toString());
    
    // Check if client has exceeded the rate limit
    if (requestCounts[key].count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${userId}`);
      
      // Set retry-after header (standard way to indicate when to retry)
      const retryAfterSeconds = Math.ceil((requestCounts[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      
      // Return 429 Too Many Requests with helpful information
      return res.status(429).json({ 
        message,
        retryAfter: retryAfterSeconds
      });
    }
    
    // Continue to the next middleware if within rate limits
    next();
  };
}

/**
 * Specialized Rate Limiter for Streaming Endpoints
 * 
 * Creates a middleware specifically for streaming endpoints, which
 * typically consume more server resources and require stricter limits.
 * 
 * This is a specialized instance of the general rate limiter with
 * lower thresholds to protect server resources during streaming operations.
 * 
 * @param maxStreams - Maximum number of streaming requests allowed in the window (default: 5)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Express middleware function that enforces streaming-specific rate limits
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