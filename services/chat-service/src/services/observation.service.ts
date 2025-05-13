/**
 * Observation Management Service
 * 
 * This module provides real-time monitoring capabilities for supervisors
 * to observe ongoing chat sessions. It implements a publish-subscribe pattern
 * for streaming chat data to multiple observers without affecting the
 * primary user experience.
 * 
 * Key features:
 * - Singleton pattern for centralized stream management
 * - Support for multiple observers per session
 * - Historical data replay for newly joined observers
 * - Session buffering to allow observation after completion
 * - Efficient memory management and cleanup
 * 
 * This service is critical for quality assurance, training, and
 * monitoring capabilities within the chat platform.
 */
import { PassThrough } from 'stream';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

/**
 * Observer Callback Type
 * 
 * Defines the function signature for stream data consumers.
 * Each observer provides a callback that receives stream data as it arrives.
 */
type ObserverCallback = (data: string) => void;

/**
 * Observation Manager Class
 * 
 * Singleton class that manages the observation of chat session streams.
 * It allows supervisors to monitor ongoing conversations in real-time
 * and maintains a short history buffer for catching up on recent interactions.
 */
export class ObservationManager {
  /**
   * Singleton instance reference
   */
  private static instance: ObservationManager;
  
  /**
   * Collection of active streams by session ID
   * Maps session IDs to their corresponding PassThrough streams
   */
  private activeStreams: Map<string, PassThrough>;
  
  /**
   * Nested map of observers by session ID and observer ID
   * For each session, tracks all observer callbacks
   */
  private observers: Map<string, Map<string, ObserverCallback>>;
  
  /**
   * Event emitter for publishing stream data to observers
   * Uses a topic per session in the format "stream:${sessionId}"
   */
  private eventEmitter: EventEmitter;
  
  /**
   * Historical message buffer by session ID
   * Stores recent messages for replay to new observers
   */
  private streamHistory: Map<string, string[]>;
  
  /**
   * Time to keep session available for observation after completion
   * Sessions remain observable for this period after they end
   */
  private streamBufferTime: number = 60000; // 1 minute buffer to keep streams available for observation
  
  /**
   * Cleanup timeout references by session ID
   * Used to manage delayed cleanup of completed sessions
   */
  private streamTimeouts: Map<string, NodeJS.Timeout>;
  
  /**
   * Private Constructor (Singleton Pattern)
   * 
   * Initializes the observation system's internal data structures.
   * Private to enforce the singleton pattern through getInstance().
   */
  private constructor() {
    this.activeStreams = new Map();
    this.observers = new Map();
    this.eventEmitter = new EventEmitter();
    this.streamHistory = new Map();
    this.streamTimeouts = new Map();
    
    // Increase max listeners to support many supervisors observing simultaneously
    this.eventEmitter.setMaxListeners(100);
    
    logger.info('Observation Manager initialized');
  }
  
  /**
   * Singleton Instance Accessor
   * 
   * Returns the single instance of ObservationManager, creating it if needed.
   * This ensures that all stream observation is centralized through one manager.
   * 
   * @returns The singleton ObservationManager instance
   */
  public static getInstance(): ObservationManager {
    if (!ObservationManager.instance) {
      ObservationManager.instance = new ObservationManager();
    }
    return ObservationManager.instance;
  }
  
  /**
   * Register Stream for Observation
   * 
   * Makes a stream available for supervisor observation by registering
   * it with the observation system. Sets up data handling and history tracking.
   * 
   * @param sessionId - Unique identifier for the chat session
   * @param stream - PassThrough stream from the user's chat session
   */
  public registerStream(sessionId: string, stream: PassThrough): void {
    // Store the stream reference
    this.activeStreams.set(sessionId, stream);
    
    // Initialize observer collection for this session
    this.observers.set(sessionId, new Map());
    
    // Initialize history buffer for this session
    this.streamHistory.set(sessionId, []);
    
    // Cancel existing cleanup timeout if the stream was recently completed
    if (this.streamTimeouts.has(sessionId)) {
      clearTimeout(this.streamTimeouts.get(sessionId)!);
      this.streamTimeouts.delete(sessionId);
    }
    
    /**
     * Set up data forwarding from source stream to observers
     * 
     * When data arrives from the original stream, it's:
     * 1. Added to the history buffer
     * 2. Published to all observers via the event emitter
     */
    stream.on('data', (data) => {
      const dataStr = data.toString();
      
      // Store in history buffer for late-joining observers
      const history = this.streamHistory.get(sessionId)!;
      history.push(dataStr);
      
      // Limit history size to prevent memory issues
      if (history.length > 100) {
        history.shift(); // Remove oldest chunk
      }
      
      // Publish the data to all observers of this session
      this.eventEmitter.emit(`stream:${sessionId}`, dataStr);
    });
    
    /**
     * Handle stream completion
     * 
     * When the source stream ends, the session is not immediately
     * deregistered. Instead, it's kept available for a buffer period
     * to allow supervisors to observe recently completed sessions.
     */
    stream.on('end', () => {
      logger.debug(`Stream ended for session ${sessionId}, keeping available for ${this.streamBufferTime}ms`);
      
      // Schedule delayed cleanup
      const timeout = setTimeout(() => {
        this.deregisterStream(sessionId);
      }, this.streamBufferTime);
      
      // Store the timeout reference for potential cancellation
      this.streamTimeouts.set(sessionId, timeout);
    });
    
    logger.debug(`Stream registered for observation: ${sessionId}`);
  }
  
  /**
   * Deregister Stream
   * 
   * Removes a stream from the observation system and cleans up related resources.
   * Called automatically after the buffer period expires, or can be called manually.
   * 
   * @param sessionId - Unique identifier for the chat session to deregister
   */
  public deregisterStream(sessionId: string): void {
    // Clean up the stream reference
    const stream = this.activeStreams.get(sessionId);
    if (stream) {
      this.activeStreams.delete(sessionId);
    }
    
    // Clean up observer references
    this.observers.delete(sessionId);
    
    // Clean up history buffer
    this.streamHistory.delete(sessionId);
    
    // Clean up any pending timeout
    if (this.streamTimeouts.has(sessionId)) {
      clearTimeout(this.streamTimeouts.get(sessionId)!);
      this.streamTimeouts.delete(sessionId);
    }
    
    logger.debug(`Stream deregistered: ${sessionId}`);
  }
  
  /**
   * Check Stream Availability
   * 
   * Determines if a session is available for observation, either because
   * it's actively ongoing or recently completed and still in buffer.
   * 
   * @param sessionId - Unique identifier for the chat session
   * @returns True if the session can be observed, false otherwise
   */
  public isStreamActive(sessionId: string): boolean {
    return this.activeStreams.has(sessionId) || this.streamTimeouts.has(sessionId);
  }
  
  /**
   * Add Session Observer
   * 
   * Registers a new observer for a specific chat session. If the session
   * is available, the observer will receive both historical data and live updates.
   * 
   * @param sessionId - Unique identifier for the chat session to observe
   * @param callback - Function to receive stream data events
   * @returns Unsubscribe function to stop observation
   */
  public addObserver(sessionId: string, callback: ObserverCallback): () => void {
    // Check if the session is available for observation
    if (!this.isStreamActive(sessionId)) {
      logger.warn(`Attempted to observe inactive stream: ${sessionId}`);
      return () => {}; // Return no-op function when session isn't available
    }
    
    // Generate a unique identifier for this observer
    const observerId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Register the observer callback
    const sessionObservers = this.observers.get(sessionId)!;
    sessionObservers.set(observerId, callback);
    
    // Create listener function for event subscription
    const listener = (data: string) => {
      callback(data);
    };
    
    // Subscribe to session events
    this.eventEmitter.on(`stream:${sessionId}`, listener);
    
    /**
     * Send Historical Data Replay
     * 
     * New observers receive all recent messages from the session to provide
     * context before receiving live updates.
     */
    const history = this.streamHistory.get(sessionId);
    if (history && history.length > 0) {
      // Mark the start of historical data replay
      callback(`event: history-start\ndata: ${JSON.stringify({ 
        message: 'Starting historical data replay' 
      })}\n\n`);
      
      // Send each historical chunk
      history.forEach(chunk => {
        callback(chunk);
      });
      
      // Mark the end of historical data replay
      callback(`event: history-end\ndata: ${JSON.stringify({ 
        message: 'End of historical data, now receiving live updates' 
      })}\n\n`);
    }
    
    logger.debug(`Observer ${observerId} added to session ${sessionId}`);
    
    /**
     * Return Unsubscribe Function
     * 
     * Returns a function that, when called, will remove this observer
     * from the session and clean up event listeners.
     */
    return () => {
      sessionObservers.delete(observerId);
      this.eventEmitter.off(`stream:${sessionId}`, listener);
      logger.debug(`Observer ${observerId} removed from session ${sessionId}`);
    };
  }
  
  /**
   * Get Active Stream Count
   * 
   * Returns the total number of sessions available for observation,
   * including both active and recently ended sessions.
   * 
   * @returns Total number of observable sessions
   */
  public getActiveStreamCount(): number {
    return this.activeStreams.size + this.streamTimeouts.size;
  }
  
  /**
   * Get Observer Count
   * 
   * Returns the number of active observers for a specific session.
   * 
   * @param sessionId - Unique identifier for the chat session
   * @returns Number of observers for the session, or 0 if none or invalid
   */
  public getObserverCount(sessionId: string): number {
    return this.observers.get(sessionId)?.size || 0;
  }
  
  /**
   * Get Active Session IDs
   * 
   * Returns a list of all session IDs currently available for observation,
   * including both active and recently ended sessions.
   * 
   * @returns Array of session identifiers
   */
  public getActiveSessionIds(): string[] {
    const activeIds = [...this.activeStreams.keys()];
    const recentIds = [...this.streamTimeouts.keys()];
    return [...new Set([...activeIds, ...recentIds])]; // Remove duplicates
  }
}