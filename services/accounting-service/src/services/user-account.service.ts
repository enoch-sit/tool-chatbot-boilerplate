// src/services/user-account.service.ts
import UserAccount from '../models/user-account.model';

export class UserAccountService {
  /**
   * Create a user account in the Accounting service if it doesn't exist
   * This is used when a user from the Auth service needs to be created in Accounting
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
}

export default new UserAccountService();