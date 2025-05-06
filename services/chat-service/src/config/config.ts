import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  // Server configuration
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB connection string
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/chat-service',
  
  // JWT configuration
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'default-secret-key-for-dev',
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  
  // AWS Bedrock configuration
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  
  // Default model configuration
  defaultModelId: process.env.DEFAULT_MODEL_ID || 'amazon.nova-micro-v1:0',
  
  // External services URLs
  accountingApiUrl: process.env.ACCOUNTING_API_URL || 'http://localhost:3001/api',
  authApiUrl: process.env.AUTH_API_URL || 'http://localhost:3000/api',
  
  // Streaming configuration
  maxStreamingDuration: parseInt(process.env.MAX_STREAMING_DURATION || '120000', 10),
  
  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Redis configuration (for rate limiting and caching)
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
};