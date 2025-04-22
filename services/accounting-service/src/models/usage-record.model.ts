// src/models/usage-record.model.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface UsageRecordAttributes {
  id?: number;
  userId: string;
  timestamp?: Date;
  service: string;
  operation: string;
  credits: number;
  metadata?: Record<string, any>;
}

class UsageRecord extends Model<UsageRecordAttributes> implements UsageRecordAttributes {
  public id!: number;
  public userId!: string;
  public timestamp!: Date;
  public service!: string;
  public operation!: string;
  public credits!: number;
  public metadata!: Record<string, any>;
}

UsageRecord.init({
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
      key: 'userId'
    }
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  service: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  operation: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  sequelize,
  tableName: 'usage_records',
  timestamps: false,
  indexes: [
    {
      name: 'idx_usage_user_timestamp',
      fields: ['userId', 'timestamp']
    }
  ]
});

export default UsageRecord;