// src/models/credit-allocation.model.ts
/**
 * Credit Allocation Model
 * 
 * Represents a credit allocation to a user account in the system.
 * Each allocation has a total amount of credits, remaining credits,
 * an expiration date, and tracks who allocated the credits.
 * 
 * This model is used to track the lifecycle of credits from allocation
 * to usage, including when they expire.
 * 
 * Database Table: credit_allocations
 * Primary Key: id
 * Foreign Keys: user_id references user_accounts(user_id)
 * 
 * Relations:
 * - Many-to-one with UserAccount (many allocations belong to one user)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

/**
 * Interface defining the attributes of a CreditAllocation
 */
interface CreditAllocationAttributes {
  id?: number;             // Auto-incrementing primary key
  userId: string;          // Foreign key to user_accounts table
  totalCredits: number;    // Total credits in this allocation
  remainingCredits: number; // Remaining credits after usage
  allocatedBy: string;     // User ID or system identifier of allocator
  allocatedAt?: Date;      // When credits were allocated
  expiresAt: Date;         // When credits expire
  notes?: string;          // Optional notes about the allocation
}

/**
 * Credit Allocation Model Class
 * 
 * Represents an allocation of credits to a user account.
 * Credits are deducted from allocations when services are used,
 * with the earliest-expiring allocations consumed first.
 */
class CreditAllocation extends Model<CreditAllocationAttributes> implements CreditAllocationAttributes {
  public id!: number;                 // Primary key
  public userId!: string;             // User the credits are allocated to
  public totalCredits!: number;       // Original credit amount allocated
  public remainingCredits!: number;   // Current remaining credits
  public allocatedBy!: string;        // ID of admin/system that allocated credits
  public readonly allocatedAt!: Date; // When allocation occurred
  public expiresAt!: Date;            // When allocation expires
  public notes!: string;              // Optional allocation notes
}

/**
 * Initialize the Credit Allocation model with its schema definition
 */
CreditAllocation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id',
    comment: 'Primary key for the credit allocation'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',  // Explicitly map userId to user_id column
    references: {
      model: 'user_accounts',
      key: 'user_id'
    },
    comment: 'Foreign key to the user_accounts table'
  },
  totalCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'total_credits',  // Explicitly map totalCredits to total_credits column
    validate: {
      min: 0
    },
    comment: 'Total credits allocated initially'
  },
  remainingCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'remaining_credits',  // Explicitly map remainingCredits to remaining_credits column
    validate: {
      min: 0
    },
    comment: 'Remaining credits after usage'
  },
  allocatedBy: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'allocated_by',  // Explicitly map allocatedBy to allocated_by column
    comment: 'User ID or system identifier that performed the allocation'
  },
  allocatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'allocated_at',  // Explicitly map allocatedAt to allocated_at column
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when credits were allocated'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',  // Explicitly map expiresAt to expires_at column
    comment: 'Timestamp when credits expire'
  },
  notes: {
    type: DataTypes.TEXT,
    field: 'notes',
    comment: 'Optional notes about the allocation (reason, context, etc.)'
  }
}, {
  sequelize,
  tableName: 'credit_allocations',
  timestamps: false,
  underscored: true,  // This tells Sequelize that the DB uses snake_case column names
  indexes: [
    {
      name: 'idx_credit_user_expiry',
      fields: ['user_id', 'expires_at'],
      //comment: 'Index for efficient credit lookups by user and expiration date'
    }
  ]
});

export default CreditAllocation;