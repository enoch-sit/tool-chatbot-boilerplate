// tests/services/credit-service.mock.ts
/**
 * This file contains specific mock configurations for Credit Service tests
 * to address the failing test that expected 200 but received 0
 */

import CreditAllocation from '../../src/models/credit-allocation.model';

// Define a type to match the interface from the model file
type CreditAllocationAttributes = {
  id?: number;
  userId: string;
  totalCredits: number;
  remainingCredits: number;
  allocatedBy: string;
  allocatedAt?: Date;
  expiresAt: Date;
  notes?: string;
};

// Define a type for our mock allocations to ensure proper TypeScript typing
type MockCreditAllocation = Partial<CreditAllocationAttributes> & {
  id: number;
  userId: string;
  totalCredits: number;
  remainingCredits: number;
  allocatedBy: string;
  allocatedAt: Date;
  expiresAt: Date;
};

export const mockCreditAllocations: MockCreditAllocation[] = [
  {
    id: 1,
    userId: 'user123',
    totalCredits: 100,
    remainingCredits: 50,
    allocatedBy: 'admin',
    allocatedAt: new Date('2025-01-01'),
    expiresAt: new Date('2025-12-31')
  },
  {
    id: 2,
    userId: 'user123',
    totalCredits: 200,
    remainingCredits: 150,
    allocatedBy: 'admin',
    allocatedAt: new Date('2025-02-01'),
    expiresAt: new Date('2025-12-31')
  }
];

// Calculate the total correctly (50 + 150 = 200)
export const totalCredits: number = mockCreditAllocations.reduce(
  (total, allocation) => total + allocation.remainingCredits, 0
);

// Verify the total is 200 as expected by the test
console.assert(totalCredits === 200, `Expected total credits to be 200, but got ${totalCredits}`);