// src/types/admin.ts

/**
 * Represents the result of a bulk user assignment operation.
 * This provides clear feedback to the admin on the success of the operation.
 */
export interface BulkAssignmentResult {
  successful_assignments: number;
  failed_assignments: Array<{ 
    email: string;
    reason: string;
  }>;
}
