/**
 * Controller for job data collection
 */
import { Request, Response } from 'express';
import { collectionOrchestrator } from '../../services/scrapers/orchestrator/collectionOrchestrator';
import { logger } from '../../utils/logger';

/**
 * Starts collection from all sources
 * @param req Express request
 * @param res Express response
 */
export const collectFromAllSources = async (req: Request, res: Response): Promise<void> => {
  try {
    // Start collection in the background
    logger.info('Received request to collect from all sources');
    
    // Return immediate response
    res.json({
      message: 'Collection process started for all sources',
      timestamp: new Date()
    });
    
    // Run collection in the background
    collectionOrchestrator.collectFromAllSources()
      .then(results => {
        logger.info('Collection from all sources completed', {
          sourceCount: results.length,
          jobsCollected: results.reduce((sum, result) => sum + result.jobsCollected, 0),
          jobsStored: results.reduce((sum, result) => sum + result.jobsStored, 0)
        });
      })
      .catch(error => {
        logger.error('Failed to collect from all sources', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
  } catch (error) {
    logger.error('Error starting collection from all sources', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({
      error: 'Failed to start collection process',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Starts collection from a specific source
 * @param req Express request
 * @param res Express response
 */
export const collectFromSource = async (req: Request, res: Response): Promise<void> => {
  const { sourceId } = req.params;
  
  try {
    logger.info(`Received request to collect from source: ${sourceId}`);
    
    // Return immediate response
    res.json({
      message: `Collection process started for source: ${sourceId}`,
      timestamp: new Date()
    });
    
    // Run collection in the background
    collectionOrchestrator.collectFromSource(sourceId)
      .then(result => {
        logger.info(`Collection from source ${sourceId} completed`, {
          status: result.status,
          jobsCollected: result.jobsCollected,
          jobsStored: result.jobsStored
        });
      })
      .catch(error => {
        logger.error(`Failed to collect from source: ${sourceId}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      });
  } catch (error) {
    logger.error(`Error starting collection from source: ${sourceId}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({
      error: `Failed to start collection process for source: ${sourceId}`,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Gets collection status for all sources
 * @param req Express request
 * @param res Express response
 */
export const getCollectionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real implementation, this would query the database for the latest collection results
    // For now, we'll return a placeholder
    res.json({
      message: 'Collection status feature is not yet implemented',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting collection status', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({
      error: 'Failed to get collection status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};