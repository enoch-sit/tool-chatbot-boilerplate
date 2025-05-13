/**
 * Structured Logging Utility
 * 
 * This module provides a centralized logging system for the Chat Service
 * with environment-aware formatting, log level filtering, and dedicated
 * file outputs for different log categories. It uses Winston as the underlying
 * logging framework.
 * 
 * Key features:
 * - Environment-specific log formats (colored for development, JSON for production)
 * - Multiple output targets (console, combined log file, error log file)
 * - Special handling for supervisor activities
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
 * Supervisor Activity Highlighting Format
 * 
 * Custom Winston format that identifies and marks logs related to
 * supervisor activities. This enables special handling and filtering
 * of supervisor-related logs for monitoring and auditing.
 * 
 * In development mode, it adds a visible prefix to make these logs
 * stand out in console output.
 */
const highlightSupervisorFormat = winston.format((info: winston.Logform.TransformableInfo) => {
  // Add a marker to supervisor activity logs for easier filtering
  if (typeof info.message === 'string' && (
    info.message.includes('Supervisor') || 
    info.message.includes('supervisor') || 
    info.message.includes('observation') || 
    info.message.includes('observe')
  )) {
    // Add metadata flag for filtering
    info.supervisorActivity = true;
    
    // Add a special prefix in development mode for better visibility
    if (config.nodeEnv === 'development') {
      info.message = `[SUPERVISOR-ACTIVITY] ${info.message}`;
    }
  }
  return info;
});

/**
 * Supervisor Activity Filter
 * 
 * Winston format that acts as a filter, only allowing logs tagged
 * as supervisor activities to pass through. This is used to route
 * supervisor logs to a dedicated output file.
 */
const supervisorFilter = winston.format((info) => {
  // Only pass through logs that have the supervisorActivity flag
  return info.supervisorActivity === true ? info : false;
});

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
  
  // Apply environment-specific format with supervisor highlighting
  format: winston.format.combine(
    highlightSupervisorFormat(),
    formats[config.nodeEnv] || formats.development
  ),
  
  // Add service name to all log entries
  defaultMeta: { service: 'chat-service' },
  
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
    
    /**
     * Supervisor Activity Log File
     * 
     * Records only logs related to supervisor activities.
     * Uses the supervisorFilter to isolate these logs.
     * Implements log rotation with a 5MB size limit and 5 files max.
     */
    new winston.transports.File({
      filename: 'logs/supervisor.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        supervisorFilter(),
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
});

/**
 * Supervisor Action Logger
 * 
 * Custom method added to the logger for explicitly logging
 * supervisor actions. This ensures consistent tagging of
 * supervisor-related logs for filtering and monitoring.
 * 
 * @param message - The log message describing the supervisor action
 */
logger.supervisorAction = (message: string) => {
  logger.info({ message, supervisorActivity: true });
};

/**
 * TypeScript Type Extension
 * 
 * Extends Winston's Logger type to include our custom supervisorAction method,
 * ensuring proper TypeScript support when using this method.
 */
declare module 'winston' {
  interface Logger {
    supervisorAction: (message: string) => void;
  }
}

export default logger;