// src/app.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.config';
import { initializeEmailTransporter } from './config/email.config';
import routes from './routes';
import { errorHandler, setupErrorHandling } from './utils/error-handler';
import { logger } from './utils/logger';

// Load the appropriate .env file based on environment
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '.env.production' });
} else if (process.env.NODE_ENV === 'samehost') {
  require('dotenv').config({ path: '.env.samehost' });
} else {
  require('dotenv').config({ path: '.env.development' });
}

// Initialize database connection
connectDB();

// Initialize email service
initializeEmailTransporter();

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', limiter);

// Standard middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes - now using the consolidated routes file
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

// Setup global error handling
setupErrorHandling();

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
  });
}

export default app;
