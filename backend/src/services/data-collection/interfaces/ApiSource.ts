import { DataSource, DataSourceConfig, JobDto } from './DataSource';

/**
 * Interface for API-based data sources
 */
export interface ApiSource extends DataSource {
  baseUrl: string;
  apiKey?: string;
  headers: Record<string, string>;
  
  // API-specific methods
  authenticate(): Promise<void>;
  fetchJobs(params: Record<string, any>): Promise<JobDto[]>;
}

/**
 * Configuration for API sources
 */
export interface ApiSourceConfig extends DataSourceConfig {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  authType?: 'none' | 'basic' | 'oauth' | 'api-key';
  authConfig?: Record<string, any>;
  endpoints?: Record<string, string>;
}