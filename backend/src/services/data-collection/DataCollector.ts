import { PrismaClient } from '@prisma/client';
import { DataSource, JobDto } from './interfaces/DataSource';
import { DataTransformer } from './pipeline/DataTransformer';
import { DataValidator } from './pipeline/DataValidator';
import { Deduplicator } from './pipeline/Deduplicator';
import { JobRepository } from './repositories/JobRepository';
import { Logger } from '../../utils/logger';

/**
 * Main service for orchestrating the data collection process
 */
export class DataCollector {
  private sources: Map<string, DataSource>;
  private transformer: DataTransformer;
  private validator: DataValidator;
  private deduplicator: Deduplicator;
  private repository: JobRepository;
  private logger: Logger;
  
  constructor(
    sources: DataSource[],
    prisma: PrismaClient
  ) {
    this.sources = new Map(sources.map(source => [source.id, source]));
    this.transformer = new DataTransformer();
    this.validator = new DataValidator();
    this.deduplicator = new Deduplicator();
    this.repository = new JobRepository(prisma);
    this.logger = new Logger('DataCollector');
  }
  
  /**
   * Collect data from a specific source
   */
  async collectFromSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    if (!source.isEnabled) {
      throw new Error(`Source is disabled: ${sourceId}`);
    }
    
    this.logger.info(`Starting collection from source: ${source.name}`);
    
    try {
      // 1. Collect raw data from source
      const rawJobs = await source.collect();
      this.logger.info(`Collected ${rawJobs.length} raw jobs from source: ${source.name}`);
      
      // 2. Transform jobs
      const transformedJobs = await this.transformer.transform(rawJobs);
      this.logger.info(`Transformed ${transformedJobs.length} jobs from source: ${source.name}`);
      
      // 3. Validate jobs
      const { validJobs, invalidJobs } = await this.validator.validate(transformedJobs);
      this.logger.info(`Validated jobs from source ${source.name}: ${validJobs.length} valid, ${invalidJobs.length} invalid`);
      
      if (invalidJobs.length > 0) {
        this.logger.warn(`${invalidJobs.length} invalid jobs found from source: ${source.name}`);
        // Here we could potentially store invalid jobs for later review or repair
      }
      
      // 4. Deduplicate against existing jobs
      const existingJobs = await this.repository.getExistingJobs();
      const { jobsToCreate, jobsToUpdate } = await this.deduplicator.deduplicate(validJobs, existingJobs);
      
      // 5. Save to database
      await this.repository.createJobs(jobsToCreate);
      await this.repository.updateJobs(jobsToUpdate);
      
      this.logger.info(`Successfully completed collection from source ${source.name}: ${jobsToCreate.length} created, ${jobsToUpdate.length} updated`);
    } catch (error) {
      this.logger.error(`Failed to collect from source ${source.name}`, { error });
      throw error;
    }
  }
  
  /**
   * Collect data from all enabled sources
   */
  async collectFromAllSources(): Promise<void> {
    this.logger.info('Starting collection from all enabled sources');
    
    const enabledSources = [...this.sources.values()].filter(source => source.isEnabled);
    this.logger.info(`Found ${enabledSources.length} enabled sources`);
    
    // Sort sources by priority (highest first)
    const sortedSources = enabledSources.sort((a, b) => b.priority - a.priority);
    
    for (const source of sortedSources) {
      try {
        await this.collectFromSource(source.id);
      } catch (error) {
        this.logger.error(`Failed to collect from source ${source.name}`, { error });
        // Continue with next source
      }
    }
    
    this.logger.info('Completed collection from all sources');
  }
  
  /**
   * Add a new data source
   */
  addSource(source: DataSource): void {
    if (this.sources.has(source.id)) {
      throw new Error(`Source with ID ${source.id} already exists`);
    }
    
    this.sources.set(source.id, source);
    this.logger.info(`Added new source: ${source.name} (${source.id})`);
  }
  
  /**
   * Update an existing data source
   */
  updateSource(sourceId: string, updates: Partial<DataSource>): void {
    const source = this.sources.get(sourceId);
    
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    // Apply updates
    Object.assign(source, updates);
    
    this.logger.info(`Updated source: ${source.name} (${source.id})`);
  }
  
  /**
   * Get all sources
   */
  getSources(): DataSource[] {
    return [...this.sources.values()];
  }
  
  /**
   * Get a specific source
   */
  getSource(sourceId: string): DataSource | undefined {
    return this.sources.get(sourceId);
  }
}