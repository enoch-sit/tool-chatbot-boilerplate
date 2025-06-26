// src/types/admin.ts

/**
 * Represents a single chatflow instance.
 * This type is used throughout the admin panel to display and manage chatflows.
 */
export interface Chatflow {
  id: string;
  name: string;
  description?: string;
  deployed: boolean;
  public: boolean;
  status: 'active' | 'deleted' | 'error';
  sync_status?: string;
  last_updated?: string;
  error_message?: string;
}

/**
 * Defines the structure for chatflow statistics.
 * This is used on the admin dashboard to provide a high-level overview.
 */
export interface ChatflowStats {
  total: number;
  active: number;
  deleted: number;
  error: number;
  last_sync?: string;
}

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
