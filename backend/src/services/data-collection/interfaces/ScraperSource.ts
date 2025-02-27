import { DataSource, DataSourceConfig, JobDto } from './DataSource';

/**
 * Interface for scraper-based data sources
 */
export interface ScraperSource extends DataSource {
  targetUrl: string;
  selectors: Record<string, string | string[]>;
  
  // Scraper-specific methods
  scrapeJobs(): Promise<JobDto[]>;
  detectChanges(): Promise<boolean>;
}

/**
 * Configuration for scraper sources
 */
export interface ScraperSourceConfig extends DataSourceConfig {
  targetUrl: string;
  paginationConfig?: {
    type: 'url' | 'click' | 'scroll' | 'none';
    selector?: string;
    maxPages?: number;
    urlPattern?: string;
  };
  selectors: {
    jobList: string;
    jobCard: string;
    title: string;
    company?: string;
    location?: string;
    url: string;
    description?: string;
    requirements?: string;
    salary?: string;
    postedDate?: string;
    [key: string]: string | undefined;
  };
  useHeadlessBrowser: boolean;
  waitForSelector?: string;
  proxy?: {
    enabled: boolean;
    rotationStrategy?: 'round-robin' | 'random';
  };
}