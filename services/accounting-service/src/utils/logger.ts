// src/utils/logger.ts
/**
 * Structured Logging Utility for Accounting Service
 * 
 * This module provides a centralized logging system for the Accounting Service
 * with environment-aware formatting, log level filtering, and dedicated
 * file outputs for different log categories. It uses Winston as the underlying
 * logging framework.
 *
 * Key features:
 * - Environment-specific log formats (colored for development, JSON for production)
 * - Multiple output targets (console, combined log file, error log file)
 * - Configurable log levels via environment variables
 * - Log rotation to prevent excessive disk usage
 * 
 * Log levels (in order of severity):
 * - error: Runtime errors that require attention
 * - warn: Warnings that don't disrupt operation but might indicate issues
 * - info: General operational information
 * - http: HTTP request/response details
 * - debug: Detailed debugging information
 */
import winston from 'winston';
import config from '../config/config';

/**
 * Log Levels Definition
 * 
 * Define severity levels for logging with numerical values
 * for comparison. Lower numbers indicate higher severity.
 */
const levels = {
  error: 0, // Critical errors that disrupt service functionality
  warn: 1,  // Warnings about potential issues or unusual conditions
  info: 2,  // General operational information about service events
  http: 3,  // HTTP request/response logging
  debug: 4, // Detailed information for debugging purposes
};

/**
 * Environment-specific Log Formats
 * 
 * Different formatting configurations for development and production:
 * - Development: Colorized, human-readable format for console output
 * - Production: JSON format for machine parsing and analysis
 */
const formats: Record<string, winston.Logform.Format> = {
  development: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  production: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
};


/**
 * Logger Configuration and Initialization
 * 
 * Creates a Winston logger instance with multiple transports (outputs)
 * for different purposes. The log level is configurable through the
 * environment and defaults to 'info' if not specified.
 */
const logger = winston.createLogger({
  // Use log level from config (environment variable or default)
  level: config.logLevel || 'info',
  
  // Use custom level definitions
  levels,
  
  // Apply environment-specific format
  format: formats[config.nodeEnv] || formats.development,
  
  // Add service name to all log entries
  defaultMeta: { service: 'accounting-service' },
  
  // Define multiple output destinations (transports)
  transports: [
    // Write logs to console for immediate visibility
    new winston.transports.Console(),
    
    /**
     * Combined Log File
     * 
     * Records all logs of all levels to a single file.
     * Implements log rotation with a 5MB size limit and 5 files max.
     */
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    /**
     * Error Log File
     * 
     * Records only error-level logs for focused error monitoring.
     * Implements log rotation with a 5MB size limit and 5 files max.
     */
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

export default logger;
