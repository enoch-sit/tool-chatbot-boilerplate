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
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'user'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'user_accounts',
  timestamps: true
});

export default UserAccount;