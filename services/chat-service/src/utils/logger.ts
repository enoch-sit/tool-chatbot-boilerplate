import winston from 'winston';
import config from '../config/config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log formats for different environments
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

// Create a custom format to highlight supervisor activity
const highlightSupervisorFormat = winston.format((info: winston.Logform.TransformableInfo) => {
  // Add a marker to supervisor activity logs for easier filtering
  if (typeof info.message === 'string' && (
    info.message.includes('Supervisor') || 
    info.message.includes('supervisor') || 
    info.message.includes('observation') || 
    info.message.includes('observe')
  )) {
    info.supervisorActivity = true;
    
    // Add a special prefix in development mode for better visibility
    if (config.nodeEnv === 'development') {
      info.message = `[SUPERVISOR-ACTIVITY] ${info.message}`;
    }
  }
  return info;
});

// Custom filter for supervisor activities
const supervisorFilter = winston.format((info) => {
  // Only pass through logs that have the supervisorActivity flag
  return info.supervisorActivity === true ? info : false;
});

// Create the logger
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  levels,
  format: winston.format.combine(
    highlightSupervisorFormat(),
    formats[config.nodeEnv] || formats.development
  ),
  defaultMeta: { service: 'chat-service' },
  transports: [
    // Write logs to console
    new winston.transports.Console(),
    
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all error logs to 'error.log'
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all supervisor activity to a dedicated log file
    // Use proper Winston filtering with format
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

// Add a specific method for logging supervisor activities
logger.supervisorAction = (message: string) => {
  logger.info({ message, supervisorActivity: true });
};

// Extend the Winston Logger type to include our custom method
declare module 'winston' {
  interface Logger {
    supervisorAction: (message: string) => void;
  }
}

export default logger;