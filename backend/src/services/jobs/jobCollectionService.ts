/**
 * Service for initializing and managing job data collection
 */
import { collectionOrchestrator } from '../scrapers/orchestrator/collectionOrchestrator';
import { logger } from '../../utils/logger';

class JobCollectionService {
  /**
   * Initializes the job collection service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing job collection service');
      
      // Initialize collection orchestrator
      await collectionOrchestrator.initialize();
      
      logger.info('Job collection service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize job collection service', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Starts scheduled collection
   */
  public async startScheduledCollection(): Promise<void> {
    try {
      logger.info('Starting scheduled job collection');
      
      // Schedule collection tasks
      collectionOrchestrator.scheduleCollectionTasks();
      
      logger.info('Scheduled job collection started successfully');
    } catch (error) {
      logger.error('Failed to start scheduled job collection', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Runs an initial collection on startup if enabled
   */
  public async runInitialCollection(): Promise<void> {
    // Check if initial collection is enabled
    const runInitialCollection = process.env.RUN_INITIAL_COLLECTION === 'true';
    
    if (!runInitialCollection) {
      logger.info('Initial collection disabled, skipping');
      return;
    }
    
    try {
      logger.info('Running initial job collection');
      
      // Delay initial collection to ensure server is fully started
      setTimeout(async () => {
        try {
          const results = await collectionOrchestrator.collectFromAllSources();
          
          logger.info('Initial job collection completed', {
            sourceCount: results.length,
            jobsCollected: results.reduce((sum, result) => sum + result.jobsCollected, 0),
            jobsStored: results.reduce((sum, result) => sum + result.jobsStored, 0)
          });
        } catch (error) {
          logger.error('Error in initial job collection', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, 10000); // 10 second delay
      
      logger.info('Initial job collection scheduled');
    } catch (error) {
      logger.error('Failed to schedule initial job collection', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Create and export a singleton instance
export const jobCollectionService = new JobCollectionService();