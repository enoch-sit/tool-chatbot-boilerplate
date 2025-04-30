// src/models/credit-allocation.model.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface CreditAllocationAttributes {
  id?: number;
  userId: string;
  totalCredits: number;
  remainingCredits: number;
  allocatedBy: string;
  allocatedAt?: Date;
  expiresAt: Date;
  notes?: string;
}

class CreditAllocation extends Model<CreditAllocationAttributes> implements CreditAllocationAttributes {
  public id!: number;
  public userId!: string;
  public totalCredits!: number;
  public remainingCredits!: number;
  public allocatedBy!: string;
  public readonly allocatedAt!: Date;
  public expiresAt!: Date;
  public notes!: string;
}

CreditAllocation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',  // Explicitly map userId to user_id column
    references: {
      model: 'user_accounts',
      key: 'user_id'
    }
  },
  totalCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'total_credits',  // Explicitly map totalCredits to total_credits column
    validate: {
      min: 0
    }
  },
  remainingCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'remaining_credits',  // Explicitly map remainingCredits to remaining_credits column
    validate: {
      min: 0
    }
  },
  allocatedBy: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'allocated_by'  // Explicitly map allocatedBy to allocated_by column
  },
  allocatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'allocated_at',  // Explicitly map allocatedAt to allocated_at column
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'  // Explicitly map expiresAt to expires_at column
  },
  notes: {
    type: DataTypes.TEXT,
    field: 'notes'
  }
}, {
  sequelize,
  tableName: 'credit_allocations',
  timestamps: false,
  underscored: true,  // This tells Sequelize that the DB uses snake_case column names
  indexes: [
    {
      name: 'idx_credit_user_expiry',
      fields: ['user_id', 'expires_at']
    }
  ]
});

export default CreditAllocation;