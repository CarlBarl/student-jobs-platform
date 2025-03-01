/**
 * Configuration for data sources
 */
import { SourceConfig } from '../types';

export const jobTechConfig: SourceConfig = {
  id: 'jobtech',
  name: 'JobTech API',
  type: 'api',
  enabled: true,
  schedule: {
    frequency: 'hourly',
    cron: '0 * * * *'  // Every hour
  },
  maxConcurrentRequests: 5,
  rateLimitPerMinute: 60,  // Maximum requests per minute
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,    // 1 second
    backoffFactor: 2       // Exponential backoff
  }
};

// Export all source configurations
export const sourceConfigs: SourceConfig[] = [
  jobTechConfig
];