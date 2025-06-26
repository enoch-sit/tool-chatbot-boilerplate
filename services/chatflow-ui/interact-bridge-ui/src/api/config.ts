// src/api/config.ts

/**
 * The base URL for all API requests.
 * It's configured to use the REACT_APP_FLOWISE_PROXY_API_URL environment variable,
 * with a fallback to a local development server.
 */
export const API_BASE_URL = import.meta.env.VITE_FLOWISE_PROXY_API_URL || 'http://localhost:8000';

/**
 * The default timeout for standard API requests, in milliseconds.
 */
export const API_TIMEOUT = 30000000;

/**
 * A long timeout specifically for streaming operations.
 * This is set to 30 minutes (1,800,000 ms) to accommodate chatflows
 * that may take a very long time to complete, preventing the connection
 * from closing prematurely.
 */
export const STREAM_TIMEOUT = 18000000;
