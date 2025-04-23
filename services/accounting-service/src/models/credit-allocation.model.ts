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
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'user_accounts',
      key: 'user_id'  // Changed from 'userId' to 'user_id' to match the actual DB column name
    }
  },
  totalCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  remainingCredits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  allocatedBy: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  allocatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  tableName: 'credit_allocations',
  timestamps: false,
  indexes: [
    {
      name: 'idx_credit_user_expiry',
      fields: ['user_id', 'expires_at']  // Changed from 'userId', 'expiresAt' to match the DB column names
    }
  ]
});

export default CreditAllocation;