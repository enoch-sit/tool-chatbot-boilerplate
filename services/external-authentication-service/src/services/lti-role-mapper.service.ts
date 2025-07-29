import { UserRole } from '../models/user.model';

class LTIRoleMapper {
  /**
   * Map LTI roles to internal user roles
   */
  mapLTIRoleToInternal(ltiRoles: string[]): UserRole {
    if (!ltiRoles || ltiRoles.length === 0) {
      return UserRole.ENDUSER; // Default role
    }

    // Role mapping with priority (higher priority roles override lower ones)
    const roleMapping: Record<string, UserRole> = {
      // Administrator roles (highest priority)
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator': UserRole.ADMIN,
      'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator': UserRole.ADMIN,
      'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator': UserRole.ADMIN,
      
      // Instructor roles (medium-high priority)
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor': UserRole.SUPERVISOR,
      'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper': UserRole.SUPERVISOR,
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Manager': UserRole.SUPERVISOR,
      
      // Teaching Assistant roles (medium priority)
      'http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant': UserRole.ENDUSER,
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor': UserRole.ENDUSER,
      
      // Student roles (lowest priority)
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner': UserRole.ENDUSER,
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Student': UserRole.ENDUSER,
    };

    // Priority order for role selection (highest to lowest)
    const rolePriority = [
      UserRole.ADMIN,
      UserRole.SUPERVISOR,
      UserRole.ENDUSER
    ];

    // Find the highest priority role that matches
    for (const priorityRole of rolePriority) {
      for (const ltiRole of ltiRoles) {
        // Check exact match
        if (roleMapping[ltiRole] === priorityRole) {
          return priorityRole;
        }
        
        // Check partial match for flexibility with different LTI implementations
        if (this.isRoleMatch(ltiRole, priorityRole)) {
          return priorityRole;
        }
      }
    }

    // Default to enduser if no matches found
    return UserRole.ENDUSER;
  }

  /**
   * Check if LTI role matches internal role (fuzzy matching)
   */
  private isRoleMatch(ltiRole: string, internalRole: UserRole): boolean {
    const lowerRole = ltiRole.toLowerCase();
    
    switch (internalRole) {
      case UserRole.ADMIN:
        return lowerRole.includes('administrator') || 
               lowerRole.includes('admin') ||
               lowerRole.includes('manager');
               
      case UserRole.SUPERVISOR:
        return lowerRole.includes('instructor') ||
               lowerRole.includes('teacher') ||
               lowerRole.includes('faculty') ||
               lowerRole.includes('staff') ||
               lowerRole.includes('contentdeveloper');
               
      case UserRole.ENDUSER:
        return lowerRole.includes('learner') ||
               lowerRole.includes('student') ||
               lowerRole.includes('participant') ||
               lowerRole.includes('assistant');
               
      default:
        return false;
    }
  }

  /**
   * Get role display name for logging/debugging
   */
  getRoleDisplayName(role: UserRole): string {
    const displayNames = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.SUPERVISOR]: 'Supervisor/Instructor',
      [UserRole.ENDUSER]: 'End User/Student',
      [UserRole.USER]: 'User'
    };
    
    return displayNames[role] || role;
  }

  /**
   * Determine if role has administrative privileges
   */
  hasAdminPrivileges(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }

  /**
   * Determine if role has supervisor privileges
   */
  hasSupervisorPrivileges(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
  }

  /**
   * Get credit allocation multiplier based on role
   */
  getCreditMultiplier(role: UserRole): number {
    const multipliers = {
      [UserRole.ADMIN]: 10,        // 10x credits for admins
      [UserRole.SUPERVISOR]: 5,    // 5x credits for instructors
      [UserRole.ENDUSER]: 1,       // 1x credits for students
      [UserRole.USER]: 1           // 1x credits for regular users
    };
    
    return multipliers[role] || 1;
  }

  /**
   * Log role mapping decision for debugging
   */
  logRoleMapping(ltiRoles: string[], mappedRole: UserRole): void {
    console.log('🎭 LTI Role Mapping:', {
      input_roles: ltiRoles,
      mapped_role: mappedRole,
      display_name: this.getRoleDisplayName(mappedRole),
      admin_privileges: this.hasAdminPrivileges(mappedRole),
      supervisor_privileges: this.hasSupervisorPrivileges(mappedRole),
      credit_multiplier: this.getCreditMultiplier(mappedRole)
    });
  }
}

export const ltiRoleMapper = new LTIRoleMapper();
