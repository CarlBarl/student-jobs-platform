/**
 * Orchestrates job data collection from multiple sources
 */
import { SourceAdapter, CollectionResult, ErrorDetails } from '../types';
import { jobtechService } from '../jobtech/jobtechService';
import { academicWorkScraper } from '../academicwork/academicWorkScraper';
import { sourceConfigs } from '../config/sourceConfigs';
import { jobRepository } from '../../jobs/jobRepository';
import { logger } from '../../../utils/logger';
import cron from 'node-cron';
import * as path from 'path';
import * as fs from 'fs';

class CollectionOrchestrator {
  private sources: Map<string, SourceAdapter> = new Map();
  private activeTasks: Map<string, Promise<CollectionResult>> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private readonly resultsDir: string;
  
  constructor() {
    this.resultsDir = path.join(__dirname, '../../../../data/collection-results');
    
    // Create results directory if it doesn't exist
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Initializes the orchestrator with all data sources
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing collection orchestrator');
    
    try {
      // Register sources
      this.registerSource('jobtech-api', jobtechService);
      this.registerSource('academic-work', academicWorkScraper);
      // Add more sources here as they become available
      
      // Initialize all enabled sources
      for (const [sourceId, source] of this.sources.entries()) {
        if (source.config.enabled) {
          try {
            await source.initialize();
            logger.info(`Initialized source: ${sourceId}`);
          } catch (error) {
            logger.error(`Failed to initialize source: ${sourceId}`, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      // Schedule collection tasks
      this.scheduleCollectionTasks();
      
      logger.info('Collection orchestrator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize collection orchestrator', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Registers a data source
   * @param sourceId Source ID
   * @param source Source adapter
   */
  public registerSource(sourceId: string, source: SourceAdapter): void {
    this.sources.set(sourceId, source);
    logger.info(`Registered source: ${sourceId}`);
  }

  /**
   * Schedules collection tasks based on source configurations
   */
  public scheduleCollectionTasks(): void {
    logger.info('Scheduling collection tasks');
    
    // Clear any existing scheduled tasks
    for (const [sourceId, task] of this.scheduledJobs.entries()) {
      task.stop();
      logger.debug(`Stopped existing scheduled task for ${sourceId}`);
    }
    this.scheduledJobs.clear();
    
    // Schedule new tasks
    for (const [sourceId, source] of this.sources.entries()) {
      if (!source.config.enabled) {
        logger.debug(`Skipping disabled source: ${sourceId}`);
        continue;
      }
      
      const cronExpression = source.config.schedule.cron || this.frequencyToCron(source.config.schedule.frequency);
      
      try {
        const task = cron.schedule(cronExpression, () => {
          this.collectFromSource(sourceId)
            .catch(error => {
              logger.error(`Error in scheduled collection for ${sourceId}`, {
                error: error instanceof Error ? error.message : String(error)
              });
            });
        });
        
        this.scheduledJobs.set(sourceId, task);
        logger.info(`Scheduled collection for ${sourceId} with cron: ${cronExpression}`);
      } catch (error) {
        logger.error(`Failed to schedule collection for ${sourceId}`, {
          error: error instanceof Error ? error.message : String(error),
          cronExpression
        });
      }
    }
    
    logger.info(`Scheduled ${this.scheduledJobs.size} collection tasks`);
  }

  /**
   * Collects data from all enabled sources
   */
  public async collectFromAllSources(): Promise<CollectionResult[]> {
    logger.info('Starting collection from all enabled sources');
    
    const results: CollectionResult[] = [];
    const errors: ErrorDetails[] = [];
    
    for (const [sourceId, source] of this.sources.entries()) {
      if (!source.config.enabled) {
        logger.debug(`Skipping disabled source: ${sourceId}`);
        continue;
      }
      
      try {
        const result = await this.collectFromSource(sourceId);
        results.push(result);
      } catch (error) {
        const errorDetail: ErrorDetails = {
          code: 'collection_error',
          message: `Failed to collect from source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date(),
          severity: 'error',
          context: { sourceId }
        };
        errors.push(errorDetail);
        logger.error(`Failed to collect from source: ${sourceId}`, errorDetail);
      }
    }
    
    logger.info(`Completed collection from all sources: ${results.length} successful, ${errors.length} failed`);
    
    return results;
  }

  /**
   * Collects data from a specific source
   * @param sourceId Source ID
   * @returns Collection result
   */
  public async collectFromSource(sourceId: string): Promise<CollectionResult> {
    logger.info(`Starting collection from source: ${sourceId}`);
    
    // Check if source exists
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    // Check if a collection is already in progress
    if (this.activeTasks.has(sourceId)) {
      logger.warn(`Collection already in progress for source: ${sourceId}`);
      return this.activeTasks.get(sourceId)!;
    }
    
    const startTime = Date.now();
    
    try {
      // Create a task for this collection
      const task = (async () => {
        try {
          // Detect structural changes first
          await this.detectSourceChanges(sourceId);
          
          // Collect data
          const result = await source.collect();
          
          // Save jobs to database
          if (result.jobs.length > 0) {
            try {
              const savedCount = await jobRepository.saveJobs(result.jobs);
              
              // Update the result with the actual number of jobs stored
              result.jobsStored = savedCount;
              
              logger.info(`Saved ${savedCount} jobs from ${sourceId}`);
            } catch (error) {
              logger.error(`Failed to save jobs from ${sourceId}`, {
                error: error instanceof Error ? error.message : String(error)
              });
              
              // Add error to result
              result.errors.push({
                code: 'save_error',
                message: `Failed to save jobs: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date(),
                severity: 'error',
                context: { sourceId }
              });
              
              // Update status if saving failed completely
              if (result.jobsStored === 0) {
                result.status = result.status === 'success' ? 'partial' : result.status;
              }
            }
          }
          
          // Save result to disk
          this.saveCollectionResult(sourceId, result);
          
          return result;
        } finally {
          // Remove task from active tasks when done
          this.activeTasks.delete(sourceId);
        }
      })();
      
      // Store the task
      this.activeTasks.set(sourceId, task);
      
      // Execute the task and return the result
      return await task;
    } catch (error) {
      logger.error(`Critical error in collection from ${sourceId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      const errorResult: CollectionResult = {
        sourceId,
        timestamp: new Date(),
        status: 'failure',
        jobsCollected: 0,
        jobsProcessed: 0,
        jobsStored: 0,
        validationFailures: 0,
        durationMs: Date.now() - startTime,
        errors: [{
          code: 'critical_error',
          message: `Critical error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date(),
          severity: 'critical',
          context: { sourceId }
        }],
        jobs: []
      };
      
      // Save error result to disk
      this.saveCollectionResult(sourceId, errorResult);
      
      throw error;
    }
  }

  /**
   * Detects changes in a source's structure
   * @param sourceId Source ID
   * @returns Change detection result
   */
  public async detectSourceChanges(sourceId: string): Promise<boolean> {
    logger.info(`Detecting changes for source: ${sourceId}`);
    
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    try {
      const result = await source.detectStructuralChanges();
      
      if (result.status === 'unchanged') {
        logger.info(`No changes detected for ${sourceId}`);
        return false;
      }
      
      logger.info(`Detected ${result.status} for ${sourceId} with ${result.changes.length} changes`);
      
      // Log changes
      for (const change of result.changes) {
        logger.info(`Change in ${sourceId}: ${change.message}`, {
          elementType: change.elementType,
          path: change.path,
          impact: change.impact
        });
      }
      
      // For high-impact changes, send notifications
      const highImpactChanges = result.changes.filter(change => change.impact === 'high');
      if (highImpactChanges.length > 0) {
        this.notifyAboutChanges(sourceId, highImpactChanges);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to detect changes for ${sourceId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Saves a collection result to disk
   * @param sourceId Source ID
   * @param result Collection result
   */
  private saveCollectionResult(sourceId: string, result: CollectionResult): void {
    try {
      const sourceDir = path.join(this.resultsDir, sourceId);
      
      // Create source directory if it doesn't exist
      if (!fs.existsSync(sourceDir)) {
        fs.mkdirSync(sourceDir, { recursive: true });
      }
      
      // Generate result file name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
      const fileName = `${timestamp}.json`;
      const filePath = path.join(sourceDir, fileName);
      
      // Create a copy with truncated job data to avoid huge files
      const resultCopy = {
        ...result,
        jobs: result.jobs.map(job => ({
          externalId: job.externalId,
          title: job.title,
          source: job.source,
          company: job.company.name,
          location: job.location.city || job.location.municipality,
          collectingMetadata: job.collectingMetadata
        }))
      };
      
      // Save to disk
      fs.writeFileSync(filePath, JSON.stringify(resultCopy, null, 2));
      logger.debug(`Saved collection result for ${sourceId} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to save collection result for ${sourceId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Sends notifications about structural changes
   * @param sourceId Source ID
   * @param changes Changes to notify about
   */
  private notifyAboutChanges(sourceId: string, changes: any[]): void {
    // In a real implementation, this would send emails or Slack notifications
    logger.warn(`High-impact changes detected in ${sourceId}`, { changes });
    
    // Log to a special file
    try {
      const notificationsDir = path.join(__dirname, '../../../../data/change-notifications');
      
      // Create notifications directory if it doesn't exist
      if (!fs.existsSync(notificationsDir)) {
        fs.mkdirSync(notificationsDir, { recursive: true });
      }
      
      // Generate notification file name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
      const fileName = `${sourceId}_${timestamp}.json`;
      const filePath = path.join(notificationsDir, fileName);
      
      // Save to disk
      fs.writeFileSync(filePath, JSON.stringify({
        sourceId,
        timestamp: new Date(),
        changes
      }, null, 2));
      
      logger.info(`Saved change notification for ${sourceId} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to save change notification for ${sourceId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Converts frequency to cron expression
   * @param frequency Frequency
   * @returns Cron expression
   */
  private frequencyToCron(frequency: string): string {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *'; // Run at the start of every hour
      case 'daily':
        return '0 0 * * *'; // Run at midnight every day
      case 'weekly':
        return '0 0 * * 1'; // Run at midnight on Monday
      default:
        return '0 0 * * *'; // Default to daily
    }
  }
}

// Create and export a singleton instance
export const collectionOrchestrator = new CollectionOrchestrator();