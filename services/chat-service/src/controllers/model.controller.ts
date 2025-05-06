import { Request, Response } from 'express';
import { 
  getAvailableModels, 
  recommendModel,
  Model
} from '../services/model-recommendation.service';
import logger from '../utils/logger';

/**
 * Get available models for the user
 */
export const getModels = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role || 'user';
    
    // Get models based on user role
    const models = getAvailableModels(userRole);
    
    return res.status(200).json({
      models
    });
  } catch (error: unknown) {
    logger.error('Error fetching available models:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve available models', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

/**
 * Get model recommendation based on task and priorities
 */
export const getModelRecommendation = async (req: Request, res: Response) => {
  try {
    const { task = 'general', priority = 'quality' } = req.body;
    
    // Validate task type
    if (!['general', 'code', 'creative', 'long-document'].includes(task)) {
      return res.status(400).json({ 
        message: 'Invalid task type. Must be one of: general, code, creative, long-document' 
      });
    }
    
    // Validate priority
    if (!['speed', 'quality', 'cost'].includes(priority)) {
      return res.status(400).json({ 
        message: 'Invalid priority. Must be one of: speed, quality, cost' 
      });
    }
    
    // Get recommendation
    const recommendation = recommendModel(
      task as 'general' | 'code' | 'creative' | 'long-document',
      priority as 'speed' | 'quality' | 'cost'
    );
    
    // Get full model details
    const allModels = getAvailableModels(req.user?.role || 'user');
    const modelDetails = allModels.find(model => model.id === recommendation.recommendedModel);
    
    return res.status(200).json({
      ...recommendation,
      modelDetails
    });
  } catch (error: unknown) {
    logger.error('Error generating model recommendation:', error);
    return res.status(500).json({ 
      message: 'Failed to generate model recommendation', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};