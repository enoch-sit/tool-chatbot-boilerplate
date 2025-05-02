import client from 'prom-client';
import logger from '../utils/logger';

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory usage, etc.)
client.collectDefaultMetrics({ register });

// HTTP request duration metric
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

// Streaming metrics
const streamingSessionsTotal = new client.Counter({
  name: 'streaming_sessions_total',
  help: 'Total number of streaming sessions',
  labelNames: ['success', 'model']
});

const streamingSessionDurationSeconds = new client.Histogram({
  name: 'streaming_session_duration_seconds',
  help: 'Duration of streaming sessions in seconds',
  labelNames: ['model'],
  buckets: [1, 5, 15, 30, 60, 120, 300, 600]
});

const activeStreamingSessions = new client.Gauge({
  name: 'active_streaming_sessions',
  help: 'Current number of active streaming sessions'
});

// Chat session metrics
const chatSessionsTotal = new client.Counter({
  name: 'chat_sessions_total',
  help: 'Total number of chat sessions created'
});

const chatMessagesTotal = new client.Counter({
  name: 'chat_messages_total',
  help: 'Total number of chat messages processed',
  labelNames: ['role']
});

const tokensUsedTotal = new client.Counter({
  name: 'tokens_used_total',
  help: 'Total number of tokens used',
  labelNames: ['model']
});

// Register metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(streamingSessionsTotal);
register.registerMetric(streamingSessionDurationSeconds);
register.registerMetric(activeStreamingSessions);
register.registerMetric(chatSessionsTotal);
register.registerMetric(chatMessagesTotal);
register.registerMetric(tokensUsedTotal);

// Helper functions to update metrics
export function recordHttpRequest(method: string, route: string, status: number, durationMs: number): void {
  httpRequestDurationMicroseconds
    .labels(method, route, status.toString())
    .observe(durationMs);
}

export function incrementChatSession(): void {
  chatSessionsTotal.inc();
}

export function incrementChatMessage(role: string): void {
  chatMessagesTotal.labels(role).inc();
}

export function incrementStreamingSession(model: string, success: boolean): void {
  streamingSessionsTotal.labels(success ? 'success' : 'failed', model).inc();
}

export function recordStreamingSessionDuration(model: string, durationSeconds: number): void {
  streamingSessionDurationSeconds.labels(model).observe(durationSeconds);
}

export function updateActiveStreamingSessions(count: number): void {
  activeStreamingSessions.set(count);
}

export function incrementTokensUsed(model: string, tokens: number): void {
  tokensUsedTotal.labels(model).inc(tokens);
}

export { register };