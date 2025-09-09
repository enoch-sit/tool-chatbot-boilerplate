/**
 * Prometheus Metrics Middleware
 * 
 * This module provides middleware for collecting and exposing application metrics
 * in Prometheus format. It automatically tracks HTTP request durations, response
 * codes, and other performance metrics to enable monitoring and alerting.
 * 
 * The metrics collected include:
 * - Request duration histograms (by endpoint and method)
 * - Response status code counts
 * - Request rate tracking
 * 
 * These metrics are exposed via a /metrics endpoint for scraping by Prometheus
 * or other compatible monitoring systems.
 */
import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest, register } from '../services/metrics.service';

/**
 * HTTP Request Metrics Middleware
 * 
 * Tracks the duration and outcome of each HTTP request processed by the
 * application. This middleware hooks into the response lifecycle to capture
 * timing information and final status codes.
 * 
 * The metrics are collected in a format compatible with Prometheus and include:
 * - HTTP method (GET, POST, etc.)
 * - Route path (normalized to avoid cardinality explosion)
 * - Response status code
 * - Request duration in milliseconds
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Record the start time of the request
  const start = Date.now();
  
  // Add a finished event listener to capture metrics when the response completes
  res.on('finish', () => {
    // Calculate request duration
    const duration = Date.now() - start;
    
    // Get normalized route path to avoid high cardinality metrics
    // Uses the route pattern (e.g., '/users/:id') instead of actual path ('/users/123')
    const route = req.route ? req.route.path : req.path;
    
    // Record HTTP request metrics via the metrics service
    recordHttpRequest(req.method, route, res.statusCode, duration);
  });
  
  // Continue to the next middleware or route handler
  next();
}

/**
 * Prometheus Metrics Endpoint Handler
 * 
 * Exposes collected metrics in Prometheus format for scraping.
 * This endpoint is typically accessed by a Prometheus server
 * on a regular interval to collect application metrics.
 * 
 * The endpoint returns metrics with the appropriate content type
 * for Prometheus to parse correctly.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export function metricsEndpoint(req: Request, res: Response) {
  // Set the correct content type for Prometheus metrics
  res.set('Content-Type', register.contentType);
  
  // Get the current metrics from the registry and send them in the response
  register.metrics().then(data => res.send(data));
}