// tests/services/credit.service.test.ts
import { CreditService } from '../../src/services/credit.service';
import CreditAllocation from '../../src/models/credit-allocation.model';
import { Op } from 'sequelize';
import * as creditMocks from './credit-service.mock';

// Mock Sequelize models
jest.mock('../../src/models/credit-allocation.model');

describe('CreditService', () => {
  let creditService: CreditService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    creditService = new CreditService();
  });
  
  describe('getUserBalance', () => {
    it('should return the total credits and allocations for a user', async () => {
      // Use our consistent mock data from the mock file
      const mockAllocations = creditMocks.mockCreditAllocations;
      
      // Mock the findAll method with our consistent mock data
      (CreditAllocation.findAll as jest.Mock).mockResolvedValue(mockAllocations);
      
      // Call the method
      const result = await creditService.getUserBalance('user123');
      
      // Verify the result using the precalculated total
      expect(result.totalCredits).toBe(creditMocks.totalCredits); // This should be 200
      expect(result.activeAllocations.length).toBe(2);
      expect(result.activeAllocations[0].id).toBe(1);
      expect(result.activeAllocations[0].credits).toBe(50);
      expect(result.activeAllocations[1].id).toBe(2);
      expect(result.activeAllocations[1].credits).toBe(150);
      
      // Verify the CreditAllocation.findAll was called correctly
      expect(CreditAllocation.findAll).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          expiresAt: { [Op.gt]: expect.any(Date) },
          remainingCredits: { [Op.gt]: 0 }
        },
        order: [['expiresAt', 'ASC']]
      });
    });
    
    it('should return zero credits when user has no allocations', async () => {
      // Mock the findAll method to return empty array
      (CreditAllocation.findAll as jest.Mock).mockResolvedValue([]);
      
      // Call the method
      const result = await creditService.getUserBalance('user456');
      
      // Verify the result
      expect(result.totalCredits).toBe(0);
      expect(result.activeAllocations.length).toBe(0);
    });
  });
  
  describe('checkUserCredits', () => {
    it('should return true when user has sufficient credits', async () => {
      // Mock the sum method
      (CreditAllocation.sum as jest.Mock).mockResolvedValue(100);
      
      // Call the method
      const result = await creditService.checkUserCredits('user123', 50);
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify the CreditAllocation.sum was called correctly
      expect(CreditAllocation.sum).toHaveBeenCalledWith('remainingCredits', {
        where: {
          userId: 'user123',
          expiresAt: { [Op.gt]: expect.any(Date) }
        }
      });
    });
    
    it('should return false when user has insufficient credits', async () => {
      // Mock the sum method
      (CreditAllocation.sum as jest.Mock).mockResolvedValue(30);
      
      // Call the method
      const result = await creditService.checkUserCredits('user123', 50);
      
      // Verify the result
      expect(result).toBe(false);
    });
  });
  
  describe('allocateCredits', () => {
    it('should create a new credit allocation', async () => {
      // Setup mock data
      const allocateParams = {
        userId: 'user123',
        credits: 100,
        allocatedBy: 'admin',
        expiryDays: 90,
        notes: 'Test allocation'
      };
      
      const mockAllocation = {
        id: 3,
        userId: 'user123',
        totalCredits: 100,
        remainingCredits: 100,
        allocatedBy: 'admin',
        allocatedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        notes: 'Test allocation'
      };
      
      // Mock the create method
      (CreditAllocation.create as jest.Mock).mockResolvedValue(mockAllocation);
      
      // Call the method
      const result = await creditService.allocateCredits(allocateParams);
      
      // Verify the result
      expect(result).toEqual(mockAllocation);
      
      // Verify the CreditAllocation.create was called correctly
      expect(CreditAllocation.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        totalCredits: 100,
        remainingCredits: 100,
        allocatedBy: 'admin',
        notes: 'Test allocation'
      }));
    });
  });
  
  describe('deductCredits', () => {
    it('should deduct credits from user allocations in order of expiration', async () => {
      // Setup mock data
      const mockAllocations = [
        {
          id: 1,
          userId: 'user123',
          totalCredits: 100,
          remainingCredits: 50,
          allocatedBy: 'admin',
          allocatedAt: new Date('2025-01-01'),
          expiresAt: new Date('2025-05-31'),
          save: jest.fn().mockResolvedValue(true)
        },
        {
          id: 2,
          userId: 'user123',
          totalCredits: 200,
          remainingCredits: 150,
          allocatedBy: 'admin',
          allocatedAt: new Date('2025-02-01'),
          expiresAt: new Date('2025-12-31'),
          save: jest.fn().mockResolvedValue(true)
        }
      ];
      
      // Mock the findAll method
      (CreditAllocation.findAll as jest.Mock).mockResolvedValue(mockAllocations);
      
      // Call the method to deduct 70 credits
      const result = await creditService.deductCredits('user123', 70);
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify allocations were updated correctly
      // First allocation should be emptied (50 credits)
      expect(mockAllocations[0].remainingCredits).toBe(0);
      expect(mockAllocations[0].save).toHaveBeenCalled();
      
      // Second allocation should have 20 credits deducted
      expect(mockAllocations[1].remainingCredits).toBe(130);
      expect(mockAllocations[1].save).toHaveBeenCalled();
    });
    
    it('should return false when there are not enough credits', async () => {
      // Setup mock data with insufficient credits
      const mockAllocations = [
        {
          id: 1,
          userId: 'user123',
          totalCredits: 100,
          remainingCredits: 30,
          allocatedBy: 'admin',
          allocatedAt: new Date('2025-01-01'),
          expiresAt: new Date('2025-05-31'),
          save: jest.fn().mockResolvedValue(true)
        }
      ];
      
      // Mock the findAll method
      (CreditAllocation.findAll as jest.Mock).mockResolvedValue(mockAllocations);
      
      // Call the method to deduct 50 credits
      const result = await creditService.deductCredits('user123', 50);
      
      // Verify the result
      expect(result).toBe(false);
      
      // Verify allocation was emptied
      expect(mockAllocations[0].remainingCredits).toBe(0);
      expect(mockAllocations[0].save).toHaveBeenCalled();
    });
  });
  
  describe('calculateCreditsForTokens', () => {
    it('should calculate credits correctly based on the model and token count', async () => {
      // Call the method for different models
      const result1 = await creditService.calculateCreditsForTokens('anthropic.claude-3-sonnet-20240229-v1:0', 1000);
      const result2 = await creditService.calculateCreditsForTokens('anthropic.claude-3-haiku-20240307-v1:0', 1000);
      const result3 = await creditService.calculateCreditsForTokens('unknown-model', 1000);
      
      // Verify the results
      expect(result1).toBe(3); // Claude 3 Sonnet: 3 credits per 1000 tokens
      expect(result2).toBe(1); // Claude 3 Haiku: 0.25 credits per 1000 tokens, rounded up
      expect(result3).toBe(1); // Unknown model: default 1 credit per 1000 tokens
    });
    
    it('should round up credits to ensure sufficient allocation', async () => {
      // Call the method
      const result = await creditService.calculateCreditsForTokens('anthropic.claude-3-sonnet-20240229-v1:0', 1500);
      
      // Verify the result: 1500 tokens at 3 credits per 1000 = 4.5, rounded up to 5
      expect(result).toBe(5);
    });
  });
});