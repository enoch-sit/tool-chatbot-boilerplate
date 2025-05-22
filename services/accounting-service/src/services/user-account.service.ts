// src/services/user-account.service.ts
/**
 * User Account Service
 * 
 * Manages user account operations in the Accounting service.
 * Responsible for creating and checking user accounts that are synced from the Auth service.
 */
import UserAccount from '../models/user-account.model';

export class UserAccountService {
  /**
   * Create a user account in the Accounting service if it doesn't exist
   * This is used when a user from the Auth service needs to be created in Accounting
   * 
   * @param {Object} params - The user account parameters
   * @param {string} params.userId - Unique identifier for the user (required)
   * @param {string} params.email - User's email address (optional)
   * @param {string} params.username - User's username (optional)
   * @param {string} params.role - User's role (optional)
   * @returns {Promise<UserAccount>} - The existing or newly created user account
   * @throws {Error} If the operation fails
   */
  async findOrCreateUser(params: {
    userId: string,
    email?: string,
    username?: string,
    role?: string
  }): Promise<UserAccount> {
    const { userId, email = 'unknown@example.com', username = 'unknown', role = 'enduser' } = params;
    
    try {
      // Check if user already exists
      const existingUser = await UserAccount.findByPk(userId);
      
      if (existingUser) {
        return existingUser;
      }
      
      // Create new user if not found
      console.log(`Creating new user account for userId: ${userId}`);
      const newUser = await UserAccount.create({
        userId,
        email,
        username,
        role
      });
      
      return newUser;
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw new Error('Failed to find or create user account');
    }
  }
  
  /**
   * Check if a user exists in the Accounting service
   * 
   * @param {string} userId - Unique identifier for the user
   * @returns {Promise<boolean>} - True if the user exists, false otherwise
   */
  async userExists(userId: string): Promise<boolean> {
    try {
      const user = await UserAccount.findByPk(userId);
      return !!user;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }

  /**
   * Find a user account by username
   * 
   * @param {string} username - The username to search for
   * @returns {Promise<UserAccount | null>} - The user account if found, otherwise null
   */
  async findByUsername(username: string): Promise<UserAccount | null> {
    try {
      const user = await UserAccount.findOne({ where: { username } });
      return user;
    } catch (error) {
      console.error('Error finding user by username:', error);
      // Optionally, rethrow or handle as per application's error strategy
      return null;
    }
  }
}

export default new UserAccountService();