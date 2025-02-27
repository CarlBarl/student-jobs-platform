import * as cron from 'node-cron';
import { DataSource } from '../interfaces/DataSource';
import { DataCollector } from '../DataCollector';
import { Logger } from '../../../utils/logger';

/**
 * Service for scheduling data collection tasks
 */
export class CollectionScheduler {
  private sources: DataSource[];
  private dataCollector: DataCollector;
  private logger: Logger;
  private schedules: Map<string, cron.ScheduledTask>;
  
  constructor(sources: DataSource[], dataCollector: DataCollector) {
    this.sources = sources;
    this.dataCollector = dataCollector;
    this.logger = new Logger('CollectionScheduler');
    this.schedules = new Map();
  }
  
  /**
   * Initialize all schedules
   */
  initialize(): void {
    this.logger.info('Initializing collection schedules');
    
    for (const source of this.sources) {
      if (!source.isEnabled) {
        this.logger.debug(`Skipping disabled source: ${source.name}`);
        continue;
      }
      
      try {
        this.scheduleSource(source);
      } catch (error) {
        this.logger.error(`Failed to schedule source ${source.name}`, { error });
      }
    }
    
    this.logger.info(`Successfully scheduled ${this.schedules.size} sources`);
  }
  
  /**
   * Schedule a single source
   */
  scheduleSource(source: DataSource): void {
    this.logger.info(`Scheduling source: ${source.name} with expression: ${source.scheduleExpression}`);
    
    // Validate schedule expression
    if (!cron.validate(source.scheduleExpression)) {
      throw new Error(`Invalid schedule expression for source ${source.name}: ${source.scheduleExpression}`);
    }
    
    // Create the scheduled task
    const task = cron.schedule(source.scheduleExpression, async () => {
      this.logger.info(`Running scheduled collection for source: ${source.name}`);
      
      try {
        await this.dataCollector.collectFromSource(source.id);
        this.logger.info(`Successfully completed collection for source: ${source.name}`);
      } catch (error) {
        this.logger.error(`Failed scheduled collection for source: ${source.name}`, { error });
      }
    });
    
    // Store the task for future reference
    this.schedules.set(source.id, task);
  }
  
  /**
   * Run collection immediately for a source
   */
  async runNow(sourceId: string): Promise<void> {
    const source = this.sources.find(s => s.id === sourceId);
    
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    if (!source.isEnabled) {
      throw new Error(`Source is disabled: ${sourceId}`);
    }
    
    this.logger.info(`Running immediate collection for source: ${source.name}`);
    
    try {
      await this.dataCollector.collectFromSource(sourceId);
      this.logger.info(`Successfully completed immediate collection for source: ${source.name}`);
    } catch (error) {
      this.logger.error(`Failed immediate collection for source: ${source.name}`, { error });
      throw error;
    }
  }
  
  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    this.logger.info('Stopping all scheduled tasks');
    
    for (const [sourceId, task] of this.schedules.entries()) {
      this.logger.debug(`Stopping schedule for source: ${sourceId}`);
      task.stop();
    }
    
    this.schedules.clear();
    this.logger.info('All scheduled tasks stopped');
  }
  
  /**
   * Start all scheduled tasks
   */
  startAll(): void {
    this.logger.info('Starting all scheduled tasks');
    
    for (const source of this.sources) {
      if (!source.isEnabled) continue;
      
      if (this.schedules.has(source.id)) {
        const task = this.schedules.get(source.id)!;
        task.start();
      } else {
        this.scheduleSource(source);
      }
    }
    
    this.logger.info('All scheduled tasks started');
  }
  
  /**
   * Update schedule for a source
   */
  updateSchedule(sourceId: string, scheduleExpression: string): void {
    const source = this.sources.find(s => s.id === sourceId);
    
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    // Validate schedule expression
    if (!cron.validate(scheduleExpression)) {
      throw new Error(`Invalid schedule expression: ${scheduleExpression}`);
    }
    
    // Stop the existing schedule if it exists
    if (this.schedules.has(sourceId)) {
      const task = this.schedules.get(sourceId)!;
      task.stop();
      this.schedules.delete(sourceId);
    }
    
    // Update the source's schedule expression
    source.scheduleExpression = scheduleExpression;
    
    // Create a new schedule if the source is enabled
    if (source.isEnabled) {
      this.scheduleSource(source);
    }
    
    this.logger.info(`Updated schedule for source ${source.name} to: ${scheduleExpression}`);
  }
}