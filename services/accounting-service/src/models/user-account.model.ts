// src/models/user-account.model.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

interface UserAccountAttributes {
  userId: string;  // This will be the user ID from Authentication service
  email: string;   // For identification
  username: string; // For identification
  role: string;    // For permissions
  createdAt?: Date;
  updatedAt?: Date;
}

class UserAccount extends Model<UserAccountAttributes> implements UserAccountAttributes {
  public userId!: string;
  public email!: string;
  public username!: string;
  public role!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserAccount.init({
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    primaryKey: true,
    field: 'user_id'  // Explicitly map userId to user_id column
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'email'
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'username'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'user',
    field: 'role'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  sequelize,
  tableName: 'user_accounts',
  timestamps: true,
  underscored: true  // This tells Sequelize that the DB uses snake_case column names
});

export default UserAccount;