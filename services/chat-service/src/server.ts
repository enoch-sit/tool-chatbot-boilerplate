/**
 * Chat Service - Main Application Server
 * 
 * This file serves as the entry point for the Chat Service application.
 * It initializes the Express server, sets up middleware, defines routes,
 * establishes database connections, and implements error handling.
 * 
 * The server implements various security measures including:
 * - Helmet for securing HTTP headers
 * - CORS protection with specific allowed origins
 * - Rate limiting to prevent abuse
 * - Metrics collection for monitoring performance
 * 
 * Process monitoring:
 * - Graceful error handling for uncaught exceptions
 * - Unhandled promise rejection monitoring
 * - Structured logging through a custom logger
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { connectToDatabase } from './config/db';
import apiRoutes from './routes/api.routes';
import logger from './utils/logger';
import config from './config/config';
import { ObservationManager } from './services/observation.service';
import { rateLimiter } from './middleware/rate-limit.middleware';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.middleware';

// Initialize the Express application
const app = express();

/**
 * Initialize the Observation Manager singleton
 * This service tracks and manages usage patterns across the application
 * for analytics and monitoring purposes.
 */
ObservationManager.getInstance();

/**
 * Middleware Configuration
 * 
 * Applied in specific order to ensure proper request processing flow:
 * 1. Security middleware first (helmet, cors)
 * 2. Request parsing middleware (json, urlencoded)
 * 3. Logging (morgan)
 * 4. Application-specific middleware (metrics, rate limiting)
 */
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Apply metrics middleware to track request durations
app.use(metricsMiddleware);

// Apply rate limiting to all routes
app.use(rateLimiter());

/**
 * Route Registration
 * All API routes are prefixed with '/api' and defined in api.routes.ts
 */
app.use('/api', apiRoutes);

// Health check endpoint
// 20250523_test_flow
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

/**
 * Metrics Endpoint
 * Internal endpoint for collecting Prometheus metrics
 * Should be protected in production environments
 */
app.get('/metrics', metricsEndpoint);

/**
 * Default Route
 * Provides basic service information and documentation link
 */
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Chat Service API',
    documentation: '/api/docs'
  });
});

/**
 * Global Error Handling Middleware
 * Catches all errors thrown in route handlers or other middleware
 * Formats error responses consistently and logs details for debugging
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * 404 Not Found Middleware
 * Handles requests to undefined routes
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.path}`
  });
});

/**
 * Server Initialization
 */
const PORT = config.port;

/**
 * Application Startup Function
 * 
 * Performs necessary initialization before server can accept requests:
 * 1. Connect to MongoDB database
 * 2. Start the Express server
 * 
 * Fails fast if critical services (like database) can't be reached
 */
const startServer = async () => {
  try {
    // Connect to MongoDB database
    await connectToDatabase();
    
    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Chat service running on port ${PORT} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

/**
 * Global Error Handlers
 * 
 * Process-level error handling to prevent silent failures
 * and ensure proper logging of critical errors
 */

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();