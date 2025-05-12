import { PassThrough } from 'stream';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

type ObserverCallback = (data: string) => void;

/**
 * Manages stream observers for supervisors to monitor student conversations
 * Uses the Singleton pattern to ensure only one instance exists
 */
export class ObservationManager {
  private static instance: ObservationManager;
  private activeStreams: Map<string, PassThrough>;
  private observers: Map<string, Map<string, ObserverCallback>>;
  private eventEmitter: EventEmitter;
  private streamHistory: Map<string, string[]>;
  private streamBufferTime: number = 60000; // 1 minute buffer to keep streams available for observation
  private streamTimeouts: Map<string, NodeJS.Timeout>;
  
  private constructor() {
    this.activeStreams = new Map();
    this.observers = new Map();
    this.eventEmitter = new EventEmitter();
    this.streamHistory = new Map();
    this.streamTimeouts = new Map();
    // Increase max listeners to support many observers
    this.eventEmitter.setMaxListeners(100);
    
    logger.info('Observation Manager initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ObservationManager {
    if (!ObservationManager.instance) {
      ObservationManager.instance = new ObservationManager();
    }
    return ObservationManager.instance;
  }
  
  /**
   * Register a new stream for observation
   */
  public registerStream(sessionId: string, stream: PassThrough): void {
    this.activeStreams.set(sessionId, stream);
    this.observers.set(sessionId, new Map());
    this.streamHistory.set(sessionId, []);
    
    // Cancel existing timeout if there is one
    if (this.streamTimeouts.has(sessionId)) {
      clearTimeout(this.streamTimeouts.get(sessionId)!);
      this.streamTimeouts.delete(sessionId);
    }
    
    // Listen for data events on the stream
    stream.on('data', (data) => {
      const dataStr = data.toString();
      // Store in history for late-joining observers
      const history = this.streamHistory.get(sessionId)!;
      history.push(dataStr);
      // Keep a reasonable history size
      if (history.length > 100) {
        history.shift(); // Remove oldest chunk
      }
      
      // Emit the data to all observers of this session
      this.eventEmitter.emit(`stream:${sessionId}`, dataStr);
    });
    
    // Handle stream end
    stream.on('end', () => {
      logger.debug(`Stream ended for session ${sessionId}, keeping available for ${this.streamBufferTime}ms`);
      
      // Instead of immediately deregistering, set a timeout
      const timeout = setTimeout(() => {
        this.deregisterStream(sessionId);
      }, this.streamBufferTime);
      
      this.streamTimeouts.set(sessionId, timeout);
    });
    
    logger.debug(`Stream registered for observation: ${sessionId}`);
  }
  
  /**
   * Deregister a stream when it's complete
   */
  public deregisterStream(sessionId: string): void {
    // Clean up the stream
    const stream = this.activeStreams.get(sessionId);
    if (stream) {
      this.activeStreams.delete(sessionId);
    }
    
    // Clean up observers
    this.observers.delete(sessionId);
    
    // Clean up history
    this.streamHistory.delete(sessionId);
    
    // Clean up timeouts
    if (this.streamTimeouts.has(sessionId)) {
      clearTimeout(this.streamTimeouts.get(sessionId)!);
      this.streamTimeouts.delete(sessionId);
    }
    
    logger.debug(`Stream deregistered: ${sessionId}`);
  }
  
  /**
   * Check if a stream is active or recently completed
   */
  public isStreamActive(sessionId: string): boolean {
    return this.activeStreams.has(sessionId) || this.streamTimeouts.has(sessionId);
  }
  
  /**
   * Add an observer to a session stream
   * Returns an unsubscribe function
   */
  public addObserver(sessionId: string, callback: ObserverCallback): () => void {
    if (!this.isStreamActive(sessionId)) {
      logger.warn(`Attempted to observe inactive stream: ${sessionId}`);
      return () => {};
    }
    
    // Generate unique observer ID
    const observerId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Store the observer callback
    const sessionObservers = this.observers.get(sessionId)!;
    sessionObservers.set(observerId, callback);
    
    // Set up event listener
    const listener = (data: string) => {
      callback(data);
    };
    
    this.eventEmitter.on(`stream:${sessionId}`, listener);
    
    // Send history to the new observer for catching up
    const history = this.streamHistory.get(sessionId);
    if (history && history.length > 0) {
      // First send a notification that this is historical data
      callback(`event: history-start\ndata: ${JSON.stringify({ 
        message: 'Starting historical data replay' 
      })}\n\n`);
      
      // Send the historical data
      history.forEach(chunk => {
        callback(chunk);
      });
      
      // Mark the end of historical data
      callback(`event: history-end\ndata: ${JSON.stringify({ 
        message: 'End of historical data, now receiving live updates' 
      })}\n\n`);
    }
    
    logger.debug(`Observer ${observerId} added to session ${sessionId}`);
    
    // Return unsubscribe function
    return () => {
      sessionObservers.delete(observerId);
      this.eventEmitter.off(`stream:${sessionId}`, listener);
      logger.debug(`Observer ${observerId} removed from session ${sessionId}`);
    };
  }
  
  /**
   * Get count of active streams
   */
  public getActiveStreamCount(): number {
    return this.activeStreams.size + this.streamTimeouts.size;
  }
  
  /**
   * Get count of observers for a session
   */
  public getObserverCount(sessionId: string): number {
    return this.observers.get(sessionId)?.size || 0;
  }
  
  /**
   * Get all active session IDs
   */
  public getActiveSessionIds(): string[] {
    const activeIds = [...this.activeStreams.keys()];
    const recentIds = [...this.streamTimeouts.keys()];
    return [...new Set([...activeIds, ...recentIds])]; // Remove duplicates
  }
}