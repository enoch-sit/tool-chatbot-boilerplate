// src/models/streaming-session.model.ts
/**
 * Streaming Session Model
 * 
 * Tracks streaming sessions for AI text generation.
 * Special handling is required for streaming responses because credit usage
 * is estimated upfront but needs to be reconciled with actual usage when complete.
 * 
 * Database Table: streaming_sessions
 * Primary Key: id
 * Unique Key: sessionId
 * Foreign Keys: user_id references user_accounts(user_id)
 * 
 * Relations:
 * - Many-to-one with UserAccount (many streaming sessions belong to one user)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

/**
 * Interface defining the attributes of a StreamingSession
 */
interface StreamingSessionAttributes {
  id?: number;                        // Auto-incrementing primary key
  sessionId: string;                  // Unique identifier for the streaming session
  userId: string;                     // User who owns the session
  modelId: string;                    // ID of the AI model being used
  estimatedCredits: number;           // Credits estimated for the session
  allocatedCredits: number;           // Credits pre-allocated (includes buffer)
  usedCredits: number;                // Actual credits used when finalized
  status: 'active' | 'completed' | 'failed'; // Current status of the session
  startedAt: Date;                    // When the session started
  completedAt?: Date;                 // When the session completed/failed
}

/**
 * Streaming Session Model Class
 * 
 * Manages streaming response sessions which require pre-allocation of credits
 * and reconciliation when the stream completes.
 */
class StreamingSession extends Model<StreamingSessionAttributes> implements StreamingSessionAttributes {
  public id!: number;                 // Auto-incrementing primary key
  public sessionId!: string;          // Client-provided session ID
  public userId!: string;             // User ID from auth service
  public modelId!: string;            // AI model identifier
  public estimatedCredits!: number;   // Estimated credits for this session
  public allocatedCredits!: number;   // Credits pre-allocated with buffer
  public usedCredits!: number;        // Actual credits used (set on finalize)
  public status!: 'active' | 'completed' | 'failed'; // Session status
  public startedAt!: Date;            // When session began
  public completedAt?: Date;          // When session ended (if complete/failed)
}

/**
 * Initialize the Streaming Session model with its schema definition
 */
StreamingSession.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: 'Primary key for the streaming session'
  },
  sessionId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'session_id',
    comment: 'Unique external identifier for the streaming session'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'user_accounts',
      key: 'user_id'
    },
    comment: 'Foreign key to the user who owns this session'
  },
  modelId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'model_id',
    comment: 'Identifier for the AI model being used'
  },
  estimatedCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'estimated_credits',
    validate: {
      min: 0
    },
    comment: 'Number of credits estimated for the session'
  },
  allocatedCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'allocated_credits',
    validate: {
      min: 0
    },
    comment: 'Number of credits pre-allocated (includes buffer)'
  },
  usedCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'used_credits',
    validate: {
      min: 0
    },
    comment: 'Actual number of credits used (set after completion)'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Current status of the streaming session'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'started_at',
    comment: 'Timestamp when the session was initialized'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
    comment: 'Timestamp when the session was completed or failed'
  }
}, {
  sequelize,
  tableName: 'streaming_sessions',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      name: 'idx_streaming_user_status',
      fields: ['user_id', 'status'],
      //comment: 'Index for efficient queries by user and session status'
    },
    {
      name: 'idx_streaming_status_started',
      fields: ['status', 'started_at'],
      //comment: 'Index for finding active sessions or sessions by start time'
    }
  ]
});

export default StreamingSession;