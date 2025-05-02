import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest, register } from '../services/metrics.service';

/**
 * Middleware to track HTTP request durations and responses
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Add a finished event listener
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Get route path (use route pattern if available, otherwise use path)
    const route = req.route ? req.route.path : req.path;
    
    // Record metrics
    recordHttpRequest(req.method, route, res.statusCode, duration);
  });
  
  next();
}

/**
 * Endpoint handler to expose Prometheus metrics
 */
export function metricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(data => res.send(data));
}