import { PrismaClient } from '@prisma/client';
import { DataCollector } from './DataCollector';
import { CollectionScheduler } from './scheduler/CollectionScheduler';
import { JobTechApiSource } from './sources/api/JobTechApiSource';
import { Logger } from '../../utils/logger';
import { ApiSourceConfig } from './interfaces/ApiSource';

export class DataCollectionService {
  private dataCollector: DataCollector;
  private scheduler: CollectionScheduler;
  private logger: Logger;
  
  constructor(prisma: PrismaClient) {
    this.logger = new Logger('DataCollectionService');
    
    // Initialize sources
    const sources = this.initializeSources();
    
    // Initialize data collector
    this.dataCollector = new DataCollector(sources, prisma);
    
    // Initialize scheduler
    this.scheduler = new CollectionScheduler(sources, this.dataCollector);
  }
  
  /**
   * Initialize the service
   */
  initialize(): void {
    this.logger.info('Initializing data collection service');
    
    // Initialize scheduler
    this.scheduler.initialize();
    
    this.logger.info('Data collection service initialized');
  }
  
  /**
   * Start all scheduled collections
   */
  start(): void {
    this.logger.info('Starting data collection service');
    this.scheduler.startAll();
  }
  
  /**
   * Stop all scheduled collections
   */
  stop(): void {
    this.logger.info('Stopping data collection service');
    this.scheduler.stopAll();
  }
  
  /**
   * Run collection manually for a source
   */
  async runCollection(sourceId: string): Promise<void> {
    return this.scheduler.runNow(sourceId);
  }
  
  /**
   * Get all data sources
   */
  getSources() {
    return this.dataCollector.getSources();
  }
  
  /**
   * Initialize data sources from configuration
   */
  private initializeSources() {
    this.logger.info('Initializing data sources');
    
    // In a real application, this configuration would likely come from
    // a database or configuration files. For simplicity, we're hardcoding it here.
    
    // JobTech API Source configuration
    const jobTechConfig: ApiSourceConfig = {
      id: 'jobtech-api',
      name: 'JobTech API',
      type: 'api',
      isEnabled: true,
      scheduleExpression: '0 0 * * *', // Daily at midnight
      priority: 100,
      concurrencyLimit: 5,
      requestDelay: 1000,
      baseUrl: 'https://jobsearch.api.jobtechdev.se/search',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      authType: 'oauth',
      sourceSpecificConfig: {
        oauth: {
          clientId: process.env.JOBTECH_CLIENT_ID || '',
          clientSecret: process.env.JOBTECH_CLIENT_SECRET || '',
          tokenUrl: 'https://auth.jobtechdev.se/auth/realms/jobtech/protocol/openid-connect/token'
        }
      }
    };
    
    // Create the sources
    const jobTechSource = new JobTechApiSource(jobTechConfig);
    
    // Return all sources as an array
    return [jobTechSource];
  }
}