/**
 * Configuration Management Module
 * 
 * This module centralizes all configuration parameters for the Chat Service.
 * It loads environment variables from a .env file and provides defaults
 * for all required configuration settings to ensure the application can
 * start even with minimal environment setup.
 * 
 * Configuration categories include:
 * - Server settings (port, environment)
 * - Database connection (MongoDB)
 * - Authentication (JWT secrets and expiration)
 * - AWS Bedrock for LLM access
 * - Model defaults
 * - External service endpoints
 * - Security settings (CORS)
 * - Caching and rate limiting (Redis)
 * - Logging configuration
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  // Server configuration
  port: process.env.PORT || 3002,                      // HTTP port for the service
  nodeEnv: process.env.NODE_ENV || 'development',      // Application environment (development, production, testing)
  
  // MongoDB connection string
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/chat-service',  // Database connection URI
  
  // JWT configuration
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'default-secret-key-for-dev', // Secret for JWT verification
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',               // JWT token lifespan
  
  // AWS Bedrock configuration
  awsRegion: process.env.AWS_REGION || 'us-east-1',                 // AWS region for Bedrock service
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',              // AWS access credentials
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',      // AWS secret credentials
  
  // Default model configuration
  defaultModelId: process.env.DEFAULT_MODEL_ID || 'amazon.nova-micro-v1:0', // Fallback model ID if not specified
  
  // External services URLs
  accountingApiUrl: process.env.ACCOUNTING_API_URL || 'http://accounting-service-accounting-service-1:3001/api', // Credit management service
  authApiUrl: process.env.AUTH_API_URL || 'http://auth-service-dev:3000/api',                                   // Authentication service
  
  // Streaming configuration
  maxStreamingDuration: parseInt(process.env.MAX_STREAMING_DURATION || '120000', 10), // Maximum streaming time in ms (default 2 min)
  
  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || '*', // Controls which origins can access the API
  
  // Redis configuration (for rate limiting and caching)
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379', // Redis connection string
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info' // Minimum log level to record (debug, info, warn, error)
};