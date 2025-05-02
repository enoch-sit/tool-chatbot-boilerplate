// tests/services/credit-service.mock.js
/**
 * This file contains specific mock configurations for Credit Service tests
 * to address the failing test that expected 200 but received 0
 */

const mockCreditAllocations = [
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
const totalCredits = mockCreditAllocations.reduce(
  (total, allocation) => total + allocation.remainingCredits, 0
);

// Verify the total is 200 as expected by the test
console.assert(totalCredits === 200, `Expected total credits to be 200, but got ${totalCredits}`);

module.exports = {
  mockCreditAllocations,
  totalCredits
};