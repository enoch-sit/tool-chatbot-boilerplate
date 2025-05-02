import logger from '../utils/logger';
import config from '../config/config';

export interface Model {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  creditCost: number;
  maxTokens: number;
  available: boolean;
}

// Available models with their capabilities and characteristics
const AVAILABLE_MODELS: Model[] = [
  {
    id: 'anthropic.claude-3-opus-20240229-v1:0',
    name: 'Claude 3 Opus',
    description: 'Most powerful model for complex tasks requiring deep understanding',
    capabilities: ['reasoning', 'creativity', 'knowledge', 'code', 'long-context'],
    creditCost: 5.0,
    maxTokens: 200000,
    available: true
  },
  {
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    name: 'Claude 3 Sonnet',
    description: 'Balanced model offering strong capabilities at reasonable speed and cost',
    capabilities: ['reasoning', 'creativity', 'knowledge', 'code'],
    creditCost: 2.5,
    maxTokens: 100000,
    available: true
  },
  {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient model for simpler tasks and quick responses',
    capabilities: ['reasoning', 'basic-knowledge', 'simple-code'],
    creditCost: 1.0,
    maxTokens: 50000,
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
 * Filter models based on user role/permissions
 * @param userRole The role of the user requesting the models
 * @returns Array of models available to the user
 */
export function getAvailableModels(userRole: string = 'user'): Model[] {
  // If user is admin or supervisor, return all models
  if (userRole === 'admin' || userRole === 'supervisor') {
    return AVAILABLE_MODELS;
  }
  
  // For regular users, filter out any potentially restricted models
  // For example, could filter based on cost, or specific models reserved for admins
  return AVAILABLE_MODELS.filter(model => {
    // Example: Only allow basic users to use models with cost <= 2.5
    // Could be expanded based on business rules
    return model.available && model.creditCost <= 2.5;
  });
}

/**
 * Recommend a model based on user's task and priorities
 * @param task The type of task the user is trying to perform
 * @param priority The user's priority (speed, quality, cost)
 * @returns Recommended model ID and reason
 */
export function recommendModel(
  task: 'general' | 'code' | 'creative' | 'long-document', 
  priority: 'speed' | 'quality' | 'cost' = 'quality'
): { recommendedModel: string; reason: string } {
  
  let recommendedModelId = config.defaultModelId;
  let reason = 'Default model recommendation';
  
  // Simple recommendation logic based on task and priority
  if (priority === 'speed') {
    if (task === 'code') {
      recommendedModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
      reason = 'For coding tasks with priority on speed, Claude 3 Haiku offers quick responses with good code understanding';
    } else if (task === 'creative') {
      recommendedModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
      reason = 'For creative tasks with speed priority, Claude 3 Haiku provides fast creative outputs';
    } else if (task === 'long-document') {
      recommendedModelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
      reason = 'For long documents with speed priority, Claude 3 Sonnet balances processing capacity with good performance';
    } else {
      recommendedModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
      reason = 'For general tasks with speed priority, Claude 3 Haiku offers the quickest responses';
    }
  } else if (priority === 'quality') {
    if (task === 'code') {
      recommendedModelId = 'anthropic.claude-3-opus-20240229-v1:0';
      reason = 'For coding tasks with quality priority, Claude 3 Opus provides the most accurate and sophisticated code understanding';
    } else if (task === 'creative') {
      recommendedModelId = 'anthropic.claude-3-opus-20240229-v1:0';
      reason = 'For creative tasks with quality priority, Claude 3 Opus offers the most nuanced and original outputs';
    } else if (task === 'long-document') {
      recommendedModelId = 'anthropic.claude-3-opus-20240229-v1:0';
      reason = 'For long documents with quality priority, Claude 3 Opus can process and understand extensive contexts';
    } else {
      recommendedModelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
      reason = 'For general tasks with quality priority, Claude 3 Sonnet offers excellent results at a moderate cost';
    }
  } else if (priority === 'cost') {
    if (task === 'code') {
      recommendedModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
      reason = 'For coding tasks with cost priority, Claude 3 Haiku provides good code capabilities at the lowest cost';
    } else if (task === 'creative') {
      recommendedModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
      reason = 'For creative tasks with cost priority, Claude 3 Haiku offers creative capabilities at minimal expense';
    } else if (task === 'long-document') {
      recommendedModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
      reason = 'For long documents with cost priority, Claude 3 Haiku, though limited in context length, is most economical';
    } else {
      recommendedModelId = 'amazon.titan-text-express-v1';
      reason = 'For general tasks with cost priority, Amazon Titan offers the most economical solution';
    }
  }
  
  logger.debug(`Model recommendation: ${recommendedModelId} for task=${task}, priority=${priority}`);
  return { recommendedModel: recommendedModelId, reason };
}

/**
 * Get a fallback chain for a given model
 * @param primaryModelId The primary model ID
 * @returns Array of model IDs in fallback order
 */
export function getModelFallbackChain(primaryModelId: string): string[] {
  // Define model fallback chains
  const fallbackMap: Record<string, string[]> = {
    'anthropic.claude-3-opus-20240229-v1:0': [
      'anthropic.claude-3-opus-20240229-v1:0',
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0'
    ],
    'anthropic.claude-3-sonnet-20240229-v1:0': [
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0',
      'amazon.titan-text-express-v1'
    ],
    'anthropic.claude-3-haiku-20240307-v1:0': [
      'anthropic.claude-3-haiku-20240307-v1:0',
      'amazon.titan-text-express-v1',
      'meta.llama3-70b-instruct-v1:0'
    ],
    'amazon.titan-text-express-v1': [
      'amazon.titan-text-express-v1',
      'anthropic.claude-3-haiku-20240307-v1:0'
    ],
    'meta.llama3-70b-instruct-v1:0': [
      'meta.llama3-70b-instruct-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0'
    ]
  };
  
  return fallbackMap[primaryModelId] || [primaryModelId, config.defaultModelId];
}

/**
 * Check if an error indicates model availability issues
 * @param error Error object from API call
 * @returns Boolean indicating if error is due to model availability
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