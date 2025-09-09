// src/config/config.ts
import dotenv from 'dotenv';

dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  port: process.env.PORT || '3001',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Add other accounting-service specific configurations here
};

export default config;
