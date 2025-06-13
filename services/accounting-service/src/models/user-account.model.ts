// src/models/user-account.model.ts
/**
 * User Account Model
 * 
 * Represents a user account in the Accounting service. This model stores
 * user information synced from the Authentication service, allowing the
 * accounting service to track credits and usage per user without direct
 * dependency on the Auth service database.
 * 
 * Database Table: user_accounts
 * Primary Key: user_id
 * 
 * Relations:
 * - One-to-many with CreditAllocation (a user has many credit allocations)
 * - One-to-many with UsageRecord (a user has many usage records)
 * - One-to-many with StreamingSession (a user has many streaming sessions)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

/**
 * Interface defining the attributes of a UserAccount
 */
interface UserAccountAttributes {
  userId: string;  // This will be the user ID from Authentication service
  email: string;   // For identification
  username: string; // For identification
  role: string;    // For permissions (admin, supervisor, user, enduser)
  sub?: string;     // JWT subject claim from Authentication service
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Account Model Class
 * 
 * Represents a user in the Accounting service's database.
 * The model is kept in sync with the Authentication service
 * via API calls or message queue updates.
 */
class UserAccount extends Model<UserAccountAttributes> implements UserAccountAttributes {
  public userId!: string;   // Primary key, matches Auth service user ID
  public email!: string;    // User's email address
  public username!: string; // User's display name
  public role!: string;     // User's role (determines permissions)
  public sub?: string;      // JWT subject claim
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * Initialize the User Account model with its schema definition
 */
UserAccount.init({
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    primaryKey: true,
    field: 'user_id',  // Explicitly map userId to user_id column
    comment: 'Primary key, matches user ID from Auth service'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'email',
    comment: 'User email address'
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'username',
    comment: 'Username for display purposes'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'user',
    field: 'role',
    comment: 'User role (admin, supervisor, user, etc.)'
  },
  sub: { // New field for JWT subject
    type: DataTypes.STRING(255),
    allowNull: true, // Making it nullable for existing data and flexibility
    unique: true,    // JWT sub should be unique
    field: 'jwt_sub',
    comment: 'JWT subject claim (sub) from the Authentication service'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
    comment: 'Timestamp when record was created'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
    comment: 'Timestamp when record was last updated'
  }
}, {
  sequelize,
  tableName: 'user_accounts',
  timestamps: true,
  underscored: true  // This tells Sequelize that the DB uses snake_case column names
});

export default UserAccount;