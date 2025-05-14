// src/models/usage-record.model.ts
/**
 * Usage Record Model
 * 
 * Records individual service usage events by users.
 * Each record represents a single usage of a service that consumed credits,
 * such as a chat completion request, streaming session, or other API call.
 * 
 * Database Table: usage_records
 * Primary Key: id
 * Foreign Keys: user_id references user_accounts(user_id)
 * 
 * Relations:
 * - Many-to-one with UserAccount (many usage records belong to one user)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

/**
 * Interface defining the attributes of a UsageRecord
 */
interface UsageRecordAttributes {
  id?: number;                        // Auto-incrementing primary key
  userId: string;                     // User who used the service
  timestamp?: Date;                   // When the usage occurred
  service: string;                    // Service that was used (e.g., 'chat', 'chat-streaming')
  operation: string;                  // Specific operation (often model name for AI services)
  credits: number;                    // Number of credits consumed
  metadata?: Record<string, any>;     // Additional context about the usage
}

/**
 * Usage Record Model Class
 * 
 * Records details about service usage for reporting, billing, and analysis.
 * Supports querying by user, time period, service type, and operation.
 */
class UsageRecord extends Model<UsageRecordAttributes> implements UsageRecordAttributes {
  public id!: number;                 // Auto-incrementing primary key
  public userId!: string;             // Foreign key to user_accounts table
  public timestamp!: Date;            // When the usage occurred 
  public service!: string;            // Service name (chat, image, etc.)
  public operation!: string;          // Operation name (often model ID)
  public credits!: number;            // Credits consumed by this usage
  public metadata!: Record<string, any>; // Additional usage metadata as JSON
}

/**
 * Initialize the Usage Record model with its schema definition
 */
UsageRecord.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: 'Primary key for usage record'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'user_accounts',
      key: 'user_id'
    },
    comment: 'Foreign key to the user who used the service'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the service was used'
  },
  service: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Name of the service used (e.g., chat, image-generation)'
  },
  operation: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Specific operation performed (often the model name)'
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Number of credits consumed by this usage'
  },
  metadata: {
    type: DataTypes.JSONB,
    comment: 'Additional usage context as JSON (tokens, parameters, etc.)'
  }
}, {
  sequelize,
  tableName: 'usage_records',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      name: 'idx_usage_user_timestamp',
      fields: ['user_id', 'timestamp']
    },
    {
      name: 'idx_usage_service',
      fields: ['service']
    }
  ]
});

export default UsageRecord;