/**
 * Metrics Service Module
 * 
 * This module implements application monitoring through Prometheus metrics.
 * It defines and exports various metrics collectors for tracking API performance,
 * system health, resource utilization, and business-specific indicators.
 * 
 * The service uses prom-client to create standardized metrics that can be
 * scraped by Prometheus and visualized in dashboards (like Grafana).
 * 
 * Key metrics categories:
 * - HTTP API performance metrics
 * - Streaming session metrics
 * - Chat session and message metrics
 * - Token usage metrics
 * - System resource metrics (CPU, memory, etc.)
 */
import client from 'prom-client';
import logger from '../utils/logger';

/**
 * Prometheus Registry
 * 
 * Central registry for all metrics in the application.
 * All metrics must be registered here to be exposed.
 */
const register = new client.Registry();

/**
 * Default System Metrics
 * 
 * Collects standard system metrics like CPU usage, memory usage,
 * event loop lag, and garbage collection statistics.
 */
client.collectDefaultMetrics({ register });

/**
 * HTTP Request Duration Histogram
 * 
 * Tracks the duration of HTTP requests to measure API performance.
 * Segmented by HTTP method, route path, and status code to identify
 * slow endpoints or problematic routes.
 * 
 * Histogram buckets are carefully chosen to cover the expected
 * range of response times from very fast (5ms) to very slow (10s).
 */
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

/**
 * Streaming Session Counter
 * 
 * Counts the total number of streaming sessions initiated,
 * segmented by success/failure and model type.
 * Used to track usage patterns and reliability by model.
 */
const streamingSessionsTotal = new client.Counter({
  name: 'streaming_sessions_total',
  help: 'Total number of streaming sessions',
  labelNames: ['success', 'model']
});

/**
 * Streaming Session Duration Histogram
 * 
 * Measures how long streaming sessions last, segmented by model.
 * Helps understand user interaction times and model performance.
 * 
 * Buckets range from very short (1s) to long sessions (10m).
 */
const streamingSessionDurationSeconds = new client.Histogram({
  name: 'streaming_session_duration_seconds',
  help: 'Duration of streaming sessions in seconds',
  labelNames: ['model'],
  buckets: [1, 5, 15, 30, 60, 120, 300, 600]
});

/**
 * Active Streaming Sessions Gauge
 * 
 * Real-time count of active streaming sessions.
 * Critical for monitoring system load and capacity usage.
 */
const activeStreamingSessions = new client.Gauge({
  name: 'active_streaming_sessions',
  help: 'Current number of active streaming sessions'
});

/**
 * Chat Sessions Counter
 * 
 * Total number of chat sessions created.
 * Key business metric for user engagement.
 */
const chatSessionsTotal = new client.Counter({
  name: 'chat_sessions_total',
  help: 'Total number of chat sessions created'
});

/**
 * Chat Messages Counter
 * 
 * Total number of messages processed, segmented by role (user/assistant/system).
 * Helps understand conversation patterns and system load.
 */
const chatMessagesTotal = new client.Counter({
  name: 'chat_messages_total',
  help: 'Total number of chat messages processed',
  labelNames: ['role']
});

/**
 * Token Usage Counter
 * 
 * Tracks the total number of tokens consumed by model.
 * Critical for monitoring service costs and usage patterns.
 */
const tokensUsedTotal = new client.Counter({
  name: 'tokens_used_total',
  help: 'Total number of tokens used',
  labelNames: ['model']
});

/**
 * Register All Metrics
 * 
 * Add each metric to the Prometheus registry so they can be exposed
 * and scraped by the monitoring system.
 */
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(streamingSessionsTotal);
register.registerMetric(streamingSessionDurationSeconds);
register.registerMetric(activeStreamingSessions);
register.registerMetric(chatSessionsTotal);
register.registerMetric(chatMessagesTotal);
register.registerMetric(tokensUsedTotal);

/**
 * Record HTTP Request Metrics
 * 
 * Updates the HTTP request duration histogram with timing information
 * for a completed request. Called by the metrics middleware.
 * 
 * @param method - HTTP method (GET, POST, etc.)
 * @param route - Normalized route path
 * @param status - HTTP status code
 * @param durationMs - Request duration in milliseconds
 */
export function recordHttpRequest(method: string, route: string, status: number, durationMs: number): void {
  httpRequestDurationMicroseconds
    .labels(method, route, status.toString())
    .observe(durationMs);
}

/**
 * Increment Chat Session Counter
 * 
 * Increases the counter for created chat sessions.
 * Called when a new chat session is created.
 */
export function incrementChatSession(): void {
  chatSessionsTotal.inc();
}

/**
 * Increment Chat Message Counter
 * 
 * Increases the counter for processed chat messages by role.
 * Called when a new message is added to a chat session.
 * 
 * @param role - Message role ('user', 'assistant', or 'system')
 */
export function incrementChatMessage(role: string): void {
  chatMessagesTotal.labels(role).inc();
}

/**
 * Increment Streaming Session Counter
 * 
 * Increases the counter for streaming sessions with outcome tracking.
 * Called when a streaming session completes or fails.
 * 
 * @param model - Model ID used for the streaming session
 * @param success - Whether the session completed successfully
 */
export function incrementStreamingSession(model: string, success: boolean): void {
  streamingSessionsTotal.labels(success ? 'success' : 'failed', model).inc();
}

/**
 * Record Streaming Session Duration
 * 
 * Updates the histogram with the duration of a completed streaming session.
 * Called when a streaming session finishes.
 * 
 * @param model - Model ID used for the streaming session
 * @param durationSeconds - Duration of the session in seconds
 */
export function recordStreamingSessionDuration(model: string, durationSeconds: number): void {
  streamingSessionDurationSeconds.labels(model).observe(durationSeconds);
}

/**
 * Update Active Streaming Sessions Count
 * 
 * Sets the current number of active streaming sessions.
 * Called when sessions start and end to maintain an accurate count.
 * 
 * @param count - Current number of active sessions
 */
export function updateActiveStreamingSessions(count: number): void {
  activeStreamingSessions.set(count);
}

/**
 * Increment Token Usage Counter
 * 
 * Increases the counter for tokens used by model.
 * Called after each AI completion to track resource usage.
 * 
 * @param model - Model ID used for the completion
 * @param tokens - Number of tokens used
 */
export function incrementTokensUsed(model: string, tokens: number): void {
  tokensUsedTotal.labels(model).inc(tokens);
}

// Export the registry for the metrics endpoint
export { register };