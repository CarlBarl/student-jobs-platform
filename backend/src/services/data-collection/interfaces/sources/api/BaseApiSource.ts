import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiSource, ApiSourceConfig, JobDto } from '../../interfaces';
import { Logger } from '../../../../utils/logger';

/**
 * Base class for all API-based job sources
 */
export abstract class BaseApiSource implements ApiSource {
  id: string;
  name: string;
  type: 'api';
  isEnabled: boolean;
  scheduleExpression: string;
  priority: number;
  concurrencyLimit: number;
  requestDelay: number;
  baseUrl: string;
  apiKey?: string;
  headers: Record<string, string>;
  
  protected httpClient: AxiosInstance;
  protected logger: Logger;
  
  constructor(config: ApiSourceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = 'api';
    this.isEnabled = config.isEnabled;
    this.scheduleExpression = config.scheduleExpression;
    this.priority = config.priority;
    this.concurrencyLimit = config.concurrencyLimit;
    this.requestDelay = config.requestDelay;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.headers = config.headers || {};
    
    // Create HTTP client
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.baseUrl,
      headers: this.headers,
      timeout: 30000 // 30 seconds timeout
    };
    
    this.httpClient = axios.create(axiosConfig);
    this.logger = new Logger(`ApiSource:${this.name}`);
    
    // Add request interceptor for logging
    this.httpClient.interceptors.request.use((config) => {
      this.logger.debug(`Making request to: ${config.url}`);
      return config;
    });
    
    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`API request failed: ${error.message}`, { 
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Authenticate with the API if required
   */
  async authenticate(): Promise<void> {
    // Base implementation - override in specific sources if needed
    this.logger.debug('Authentication not required or handled by specific implementation');
  }
  
  /**
   * Main collection method
   */
  abstract collect(): Promise<JobDto[]>;
  
  /**
   * Fetch jobs from the API - to be implemented by specific sources
   */
  abstract fetchJobs(params: Record<string, any>): Promise<JobDto[]>;
  
  /**
   * Helper method to add delay between requests
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}