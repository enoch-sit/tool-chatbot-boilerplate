import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { connectToDatabase } from './config/db';
import chatRoutes from './routes/chat.routes';
import modelRoutes from './routes/model.routes';
import logger from './utils/logger';
import config from './config/config';
import { ObservationManager } from './services/observation.service';
import { rateLimiter } from './middleware/rate-limit.middleware';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.middleware';

// Initialize the Express application
const app = express();

// Initialize the Observation Manager singleton
ObservationManager.getInstance();

// Middleware
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

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/models', modelRoutes);

// Metrics endpoint (internal access only)
app.get('/metrics', metricsEndpoint);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'chat-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Chat Service API',
    documentation: '/api/docs'
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Not found middleware
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Start the server
const PORT = config.port;

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