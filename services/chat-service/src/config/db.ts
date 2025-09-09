/**
 * Database Connection Module
 * 
 * This module provides MongoDB connection management for the Chat Service.
 * It encapsulates connection initialization, event handling, and graceful
 * shutdown procedures. The module uses Mongoose as the MongoDB ODM
 * (Object-Document Mapper) to facilitate data modeling and operations.
 * 
 * Features:
 * - Centralized MongoDB connection setup
 * - Connection event monitoring
 * - Graceful connection termination on application shutdown
 * - Robust error handling and reporting
 */
import mongoose from 'mongoose';
import config from './config';
import logger from '../utils/logger';

/**
 * Connect to MongoDB Database
 * 
 * Initializes a connection to the MongoDB database using the connection
 * string defined in the application configuration. If the connection fails,
 * the application will terminate with an exit code of 1.
 * 
 * @returns Promise<void> - Resolves when connection is established
 * @throws Will terminate the process if connection cannot be established
 */
export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB database');
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit with failure code
  }
};

/**
 * MongoDB Connection Event Handlers
 * 
 * These event listeners monitor the state of the MongoDB connection
 * throughout the application lifecycle and log appropriate messages
 * for monitoring and debugging purposes.
 */

// Log any connection errors that occur after initial connection
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

// Log when the database connection is lost
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

/**
 * Graceful Shutdown Handler
 * 
 * Ensures that the MongoDB connection is properly closed when the
 * application is terminated (e.g., by Ctrl+C). This prevents potential
 * data corruption and resource leaks.
 * 
 * The SIGINT signal is sent when the user presses Ctrl+C in the terminal.
 */
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to application termination');
    process.exit(0); // Exit with success code
  } catch (error) {
    logger.error('Error during MongoDB connection closure:', error);
    process.exit(1); // Exit with failure code
  }
});

export default mongoose;