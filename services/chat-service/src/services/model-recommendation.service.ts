/**
 * Model Recommendation Service
 * 
 * This module provides intelligent model selection capabilities for the chat service.
 * It maintains a catalog of available AI models, recommends appropriate models based 
 * on user tasks and priorities, and provides fallback mechanisms when models are 
 * unavailable.
 * 
 * Key features:
 * - Comprehensive model catalog with capabilities and pricing
 * - Task-based and priority-based recommendation engine
 * - Role-based model access control
 * - Fallback chains for reliability
 * - Model availability error detection
 */
import logger from '../utils/logger';
import config from '../config/config';

/**
 * AI Model Interface
 * 
 * Defines the structure of model metadata including capabilities,
 * pricing, and technical specifications.
 */
export interface Model {
  id: string;             // Unique identifier for the model in AWS Bedrock format
  name: string;           // Human-friendly name of the model
  description: string;    // Brief description of the model's capabilities
  capabilities: string[]; // Array of capability tags (e.g., 'reasoning', 'code')
  creditCost: number;     // Cost in platform credits per 1K tokens
  maxTokens: number;      // Maximum context window size in tokens
  available: boolean;     // Whether the model is currently available for use
}

/**
 * Available Models Catalog
 * 
 * Comprehensive list of AI models available through the service.
 * Each model includes detailed information about its capabilities,
 * pricing, and specifications to support the recommendation engine.
 */
const AVAILABLE_MODELS: Model[] = [
  {
    id: 'amazon.nova-micro-v1:0',
    name: 'Amazon Nova Micro',
    description: 'Fast and efficient model for general purpose AI tasks',
    capabilities: ['reasoning', 'basic-knowledge', 'simple-code', 'creative'],
    creditCost: 0.8,
    maxTokens: 25000,
    available: true
  },
  {
    id: 'amazon.nova-lite-v1:0',
    name: 'Amazon Nova Lite',
    description: 'Balanced model for more complex reasoning and knowledge tasks',
    capabilities: ['reasoning', 'knowledge', 'code', 'creative'],
    creditCost: 1.2,
    maxTokens: 32000,
    available: true
  },
  {
    id: 'amazon.titan-text-express-v1',
    name: 'Amazon Titan Text Express',
    description: 'Efficient model for text generation and understanding',
    capabilities: ['text-generation', 'basic-reasoning'],
    creditCost: 0.5,
    maxTokens: 8000,
    available: true
  },
  {
    id: 'meta.llama3-70b-instruct-v1:0',
    name: 'Meta Llama 3 70B',
    description: 'Open model with strong reasoning capabilities',
    capabilities: ['reasoning', 'knowledge', 'code'],
    creditCost: 1.5,
    maxTokens: 8000,
    available: true
  }
];

/**
 * Get Available Models By User Role
 * 
 * Filters the model catalog based on user permissions to return
 * only the models that the user is authorized to access. This
 * supports role-based access control for premium or restricted models.
 * 
 * @param userRole - Role of the requesting user (admin, supervisor, user)
 * @returns Array of models available to the specified user role
 */
export function getAvailableModels(userRole: string = 'user'): Model[] {
  // Admins and supervisors have access to all models, including testing/preview models
  if (userRole === 'admin' || userRole === 'supervisor') {
    return AVAILABLE_MODELS;
  }
  
  // Regular users have access to models based on business rules
  // This could be expanded with more sophisticated filtering logic
  return AVAILABLE_MODELS.filter(model => {
    // Only return models that are:
    // 1. Marked as available
    // 2. Below the credit cost threshold for regular users
    return model.available && model.creditCost <= 2.5;
  });
}

/**
 * Recommend AI Model
 * 
 * Suggests the most appropriate model for a user based on their
 * specific task requirements and priorities. This helps users
 * select models without needing to understand the technical
 * details of each model.
 * 
 * Tasks:
 * - general: Everyday conversation and information requests
 * - code: Programming assistance and code generation
 * - creative: Creative writing, brainstorming, and content creation
 * - long-document: Processing and analyzing lengthy documents
 * 
 * Priorities:
 * - quality: Best possible results, regardless of speed or cost
 * - speed: Quick responses, optimizing for low latency
 * - cost: Most economical option, minimizing credit usage
 * 
 * @param task - The type of task the user wants to perform
 * @param priority - The user's priority between quality, speed, and cost
 * @returns Object containing the recommended model ID and explanation
 */
export function recommendModel(
  task: 'general' | 'code' | 'creative' | 'long-document', 
  priority: 'speed' | 'quality' | 'cost' = 'quality'
): { recommendedModel: string; reason: string } {
  
  let recommendedModelId = config.defaultModelId;
  let reason = 'Default model recommendation';
  
  /**
   * Model Recommendation Logic
   * 
   * This decision matrix selects models based on the combination
   * of task type and user priority. The recommendations balance
   * model capabilities, performance characteristics, and cost.
   */
  if (priority === 'speed') {
    // Speed-prioritized recommendations
    if (task === 'code') {
      recommendedModelId = 'amazon.nova-micro-v1:0';
      reason = 'For coding tasks with priority on speed, Amazon Nova Micro offers quick responses with good code understanding';
    } else if (task === 'creative') {
      recommendedModelId = 'amazon.nova-micro-v1:0';
      reason = 'For creative tasks with speed priority, Amazon Nova Micro provides fast creative outputs';
    } else if (task === 'long-document') {
      recommendedModelId = 'amazon.nova-micro-v1:0';
      reason = 'For long documents with speed priority, Amazon Nova Micro balances processing capacity with good performance';
    } else {
      recommendedModelId = 'amazon.nova-micro-v1:0';
      reason = 'For general tasks with speed priority, Amazon Nova Micro offers quick responses';
    }
  } else if (priority === 'quality') {
    // Quality-prioritized recommendations
    if (task === 'code') {
      recommendedModelId = 'amazon.nova-lite-v1:0';
      reason = 'For coding tasks with quality priority, Amazon Nova Lite provides accurate code understanding and generation';
    } else if (task === 'creative') {
      recommendedModelId = 'amazon.nova-lite-v1:0';
      reason = 'For creative tasks with quality priority, Amazon Nova Lite offers nuanced and original outputs';
    } else if (task === 'long-document') {
      recommendedModelId = 'amazon.nova-lite-v1:0';
      reason = 'For long documents with quality priority, Amazon Nova Lite can process and understand extensive contexts';
    } else {
      recommendedModelId = 'amazon.nova-lite-v1:0';
      reason = 'For general tasks with quality priority, Amazon Nova Lite offers excellent results at a reasonable cost';
    }
  } else if (priority === 'cost') {
    // Cost-prioritized recommendations
    if (task === 'code') {
      recommendedModelId = 'amazon.nova-micro-v1:0';
      reason = 'For coding tasks with cost priority, Amazon Nova Micro provides good code capabilities at an economical cost';
    } else if (task === 'creative') {
      recommendedModelId = 'amazon.nova-micro-v1:0';
      reason = 'For creative tasks with cost priority, Amazon Nova Micro offers creative capabilities at a reasonable price';
    } else if (task === 'long-document') {
      recommendedModelId = 'amazon.nova-micro-v1:0';
      reason = 'For long documents with cost priority, Amazon Nova Micro balances context length with economical pricing';
    } else {
      recommendedModelId = 'amazon.titan-text-express-v1';
      reason = 'For general tasks with cost priority, Amazon Titan offers the most economical solution';
    }
  }
  
  //logger.debug(`Model recommendation: ${recommendedModelId} for task=${task}, priority=${priority}`);
  return { recommendedModel: recommendedModelId, reason };
}

/**
 * Get Model Fallback Chain
 * 
 * Provides an ordered list of fallback models to try if the primary model
 * is unavailable or fails. This enhances system reliability by gracefully
 * handling model unavailability without disrupting the user experience.
 * 
 * The fallback chain is designed to maintain similar capabilities while
 * potentially trading off some aspect of performance or cost.
 * 
 * @param primaryModelId - The ID of the first-choice model
 * @returns Array of model IDs in fallback priority order
 */
export function getModelFallbackChain(primaryModelId: string): string[] {
  // Define model fallback chains with carefully ordered alternatives
  const fallbackMap: Record<string, string[]> = {
    // Nova Micro falls back to Titan as a cost-effective alternative
    'amazon.nova-micro-v1:0': [
      'amazon.nova-micro-v1:0',
      'amazon.titan-text-express-v1'
    ],
    // Nova Lite falls back to Nova Micro (less powerful but similar family)
    // then to Titan as a last resort
    'amazon.nova-lite-v1:0': [
      'amazon.nova-lite-v1:0',
      'amazon.nova-micro-v1:0',
      'amazon.titan-text-express-v1'
    ],
    // Titan falls back to Nova Micro for better reliability
    'amazon.titan-text-express-v1': [
      'amazon.titan-text-express-v1',
      'amazon.nova-micro-v1:0'
    ],
    // Meta's model falls back to Amazon's options when unavailable
    'meta.llama3-70b-instruct-v1:0': [
      'meta.llama3-70b-instruct-v1:0',
      'amazon.nova-micro-v1:0'
    ]
  };
  
  // Return the defined chain or a default fallback if no specific chain exists
  return fallbackMap[primaryModelId] || [primaryModelId, config.defaultModelId];
}

/**
 * Check for Model Availability Errors
 * 
 * Analyzes error messages from the model provider to determine if
 * the error is related to model availability rather than a more
 * fundamental API or system error.
 * 
 * This helps distinguish between temporary model unavailability
 * (which should trigger fallback) versus other types of errors
 * that require different handling.
 * 
 * @param error - Error object from the model API call
 * @returns Boolean indicating if the error relates to model availability
 */
export function isModelAvailabilityError(error: any): boolean {
  const message = error.message || '';
  return (
    message.includes('model is currently overloaded') ||
    message.includes('model not available') ||
    message.includes('capacity') ||
    message.includes('rate limit') ||
    message.includes('throttled')
  );
}