import axios from 'axios';
import { UserRole } from '../models/user.model';
import { tokenService } from '../auth/token.service';

class LTICreditService {
  /**
   * Allocate credits for LTI user based on role and course
   */
  async allocateLTICredits(
    email: string, 
    courseId: string, 
    role: UserRole,
    deploymentId?: string
  ): Promise<void> {
    try {
      // 1. Generate admin JWT token for service-to-service call
      const adminToken = await this.generateAdminToken();
      
      // 2. Determine credit amount based on role and course
      const creditAmount = this.getCreditPolicyForCourse(courseId, role);
      
      // 3. Call accounting service credit allocation endpoint
      const accountingServiceUrl = process.env.ACCOUNTING_SERVICE_URL || 'http://localhost:8002';
      
      const creditAllocationData = {
        email,
        credits: creditAmount,
        expiryDays: this.getCreditExpiryDays(role),
        notes: `LTI auto-allocation for course ${courseId}, role: ${role}${deploymentId ? `, deployment: ${deploymentId}` : ''}`
      };

      console.log('💳 Allocating LTI credits:', creditAllocationData);

      const response = await axios.post(
        `${accountingServiceUrl}/api/credits/allocate-by-email`,
        creditAllocationData,
        {
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.status === 200) {
        console.log('✅ Credits allocated successfully:', response.data);
      } else {
        throw new Error(`Credit allocation failed with status: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ LTI credit allocation error:', error);
      throw new Error(`Failed to allocate credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get credit policy for specific course and role
   */
  private getCreditPolicyForCourse(courseId: string, role: UserRole): number {
    // Base credit amounts by role
    const baseCreditsByRole = {
      [UserRole.ADMIN]: 10000,        // Admins get 10,000 credits
      [UserRole.SUPERVISOR]: 5000,    // Instructors get 5,000 credits  
      [UserRole.ENDUSER]: 1000,       // Students get 1,000 credits
      [UserRole.USER]: 1000           // Regular users get 1,000 credits
    };

    const baseCredits = baseCreditsByRole[role] || 1000;

    // Course-specific multipliers (can be configured per course)
    const courseMultipliers = this.getCourseSpecificMultipliers();
    const multiplier = courseMultipliers[courseId] || 1;

    const totalCredits = baseCredits * multiplier;

    console.log('📊 Credit calculation:', {
      courseId,
      role,
      baseCredits,
      multiplier,
      totalCredits
    });

    return totalCredits;
  }

  /**
   * Get course-specific credit multipliers
   */
  private getCourseSpecificMultipliers(): Record<string, number> {
    // TODO: This could be loaded from database or configuration
    // For now, using environment variables or defaults
    
    const multipliers: Record<string, number> = {};
    
    // Parse environment variable for course multipliers
    // Format: COURSE_1=2,COURSE_2=1.5,COURSE_3=0.5
    const courseMultiplierEnv = process.env.LTI_COURSE_CREDIT_MULTIPLIERS;
    if (courseMultiplierEnv) {
      const pairs = courseMultiplierEnv.split(',');
      for (const pair of pairs) {
        const [courseId, multiplierStr] = pair.split('=');
        if (courseId && multiplierStr) {
          const multiplier = parseFloat(multiplierStr);
          if (!isNaN(multiplier)) {
            multipliers[courseId.trim()] = multiplier;
          }
        }
      }
    }

    return multipliers;
  }

  /**
   * Get credit expiry days based on role
   */
  private getCreditExpiryDays(role: UserRole): number {
    const expiryDaysByRole = {
      [UserRole.ADMIN]: 730,      // 2 years for admins
      [UserRole.SUPERVISOR]: 365, // 1 year for instructors
      [UserRole.ENDUSER]: 180,    // 6 months for students
      [UserRole.USER]: 180        // 6 months for regular users
    };

    return expiryDaysByRole[role] || 180;
  }

  /**
   * Generate admin JWT token for service-to-service calls
   */
  private async generateAdminToken(): Promise<string> {
    return tokenService.generateAdminToken();
  }

  /**
   * Check if user already has credits for this course
   */
  async checkExistingCredits(email: string, courseId: string): Promise<boolean> {
    try {
      const adminToken = await this.generateAdminToken();
      const accountingServiceUrl = process.env.ACCOUNTING_SERVICE_URL || 'http://localhost:8002';

      const response = await axios.get(
        `${accountingServiceUrl}/api/credits/balance/${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          timeout: 5000
        }
      );

      // TODO: Check if credits were already allocated for this course
      // This would require additional endpoint in accounting service
      
      return response.data?.credits > 0;
      
    } catch (error) {
      console.warn('⚠️ Could not check existing credits:', error);
      return false; // Assume no credits exist on error
    }
  }

  /**
   * Log credit allocation for audit purposes
   */
  logCreditAllocation(
    email: string,
    courseId: string,
    role: UserRole,
    credits: number,
    success: boolean,
    error?: string
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      email,
      courseId,
      role,
      credits,
      success,
      error: error || null
    };

    console.log('📝 LTI Credit Allocation Log:', logData);
    
    // TODO: In production, this could be sent to a logging service
    // or stored in a database for audit purposes
  }
}

export const ltiCreditService = new LTICreditService();
