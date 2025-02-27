/**
 * Interface for all data sources used in the collection framework
 */
export interface DataSource {
    id: string;
    name: string;
    type: 'api' | 'scraper';
    isEnabled: boolean;
    scheduleExpression: string; // cron expression for scheduling
    priority: number; // higher number = higher priority
    concurrencyLimit: number; // max concurrent requests
    requestDelay: number; // delay between requests in ms
    
    // Collection method to be implemented by specific sources
    collect(): Promise<JobDto[]>;
  }
  
  /**
   * Configuration options for all data sources
   */
  export interface DataSourceConfig {
    id: string;
    name: string;
    type: 'api' | 'scraper';
    isEnabled: boolean;
    scheduleExpression: string;
    priority: number;
    concurrencyLimit: number;
    requestDelay: number;
    sourceSpecificConfig: Record<string, any>;
  }
  
  /**
   * Data transfer object for job data
   */
  export interface JobDto {
    sourceId: string;
    sourceJobId: string;
    title: string;
    company: string;
    location: string;
    description: string;
    requirements?: string;
    url: string;
    salary?: string;
    postedDate?: Date;
    expiryDate?: Date;
    educationArea?: string[];
    jobType?: string[];
    workHours?: string;
    sourceData?: Record<string, any>; // Original data from source
  }