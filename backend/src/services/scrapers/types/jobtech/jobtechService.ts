/**
 * JobTech API service for fetching job listings
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { JobTechSearchParams, JobTechSearchResponse, JobTechAd } from './jobtechTypes';
import { ErrorDetails, CollectionResult } from '../types';
import { jobTechConfig } from '../config/sourceConfigs';
import { logger } from '../../../../utils/logger';
import { jobtechToJobData } from './jobtechMapper';
import { validateJobData } from '../validators/jobDataValidator';
import NodeCache from 'node-cache';

export class JobTechService {
  private apiClient: AxiosInstance;
  private cache: NodeCache;
  private rateLimitCounter: number = 0;
  private rateLimitResetTime: number = Date.now() + 60000; // Reset after 1 minute

  constructor() {
    // Initialize axios client with base configuration
    this.apiClient = axios.create({
      baseURL: process.env.JOBTECH_API_URL || 'https://jobsearch.api.jobtechdev.se',
      timeout: parseInt(process.env.JOBTECH_REQUEST_TIMEOUT_MS || '30000'),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Student-Jobs-Platform/1.0 (https://studentjobsplatform.com; admin@studentjobsplatform.com)'
      }
    });

    // Setup request interceptor for rate limiting
    this.apiClient.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => this.handleRateLimiting(config)
    );
    
    // Setup response interceptor for error handling
    this.apiClient.interceptors.response.use(
      response => response,
      this.handleApiError.bind(this)
    );

    // Initialize cache
    const cacheTTL = parseInt(process.env.JOBTECH_API_CACHE_MINUTES || '15') * 60; // Convert to seconds
    this.cache = new NodeCache({ stdTTL: cacheTTL, checkperiod: 120 });
    
    logger.info('JobTech API service initialized');
  }

  /**
   * Search for jobs using the JobTech API
   * @param params Search parameters
   * @returns Search response
   */
  public async searchJobs(params: JobTechSearchParams): Promise<JobTechSearchResponse> {
    // Ensure limit is set
    const searchParams = {
      ...params,
      limit: params.limit || parseInt(process.env.JOBTECH_SEARCH_DEFAULT_LIMIT || '20')
    };
    
    const cacheKey = `search_${JSON.stringify(searchParams)}`;
    
    // Check cache first
    const cachedResult = this.cache.get<JobTechSearchResponse>(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached JobTech search results', { params: searchParams });
      return cachedResult;
    }
    
    try {
      logger.debug('Searching jobs via JobTech API', { params: searchParams });
      const response = await this.apiClient.get('/search', { params: searchParams });
      
      // Cache the result
      this.cache.set(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      logger.error('Error searching jobs via JobTech API', {
        error: error instanceof Error ? error.message : String(error),
        params: searchParams
      });
      throw error;
    }
  }

  /**
   * Get a specific job by ID
   * @param id Job ID
   * @returns Job data
   */
  public async getJob(id: string): Promise<JobTechAd> {
    const cacheKey = `job_${id}`;
    
    // Check cache first
    const cachedResult = this.cache.get<JobTechAd>(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached JobTech job details', { id });
      return cachedResult;
    }
    
    try {
      logger.debug('Fetching job details from JobTech API', { id });
      const response = await this.apiClient.get(`/ad/${id}`);
      
      // Cache the result
      this.cache.set(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching job details from JobTech API', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  /**
   * Collect jobs from JobTech API
   * @param studentRelevantOnly Only collect jobs relevant for students
   * @returns Collection result
   */
  public async collectJobs(studentRelevantOnly: boolean = true): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: ErrorDetails[] = [];
    const allJobs: JobTechAd[] = [];
    let jobsCollected = 0;
    
    logger.info('Starting JobTech API collection', { studentRelevantOnly });
    
    try {
      // Prepare search parameters optimized for student-relevant jobs
      const searchParams = this.getStudentJobsSearchParams(studentRelevantOnly);
      const limit = searchParams.limit!; // We know limit is defined from getStudentJobsSearchParams
      
      // Execute initial search
      const initialSearch = await this.searchJobs(searchParams);
      const totalJobs = initialSearch.total.value;
      const totalPages = Math.ceil(totalJobs / limit);
      
      logger.info('JobTech API initial search complete', { 
        totalJobs, 
        totalPages,
        searchParams 
      });
      
      // Add first page results to collection
      allJobs.push(...initialSearch.hits);
      jobsCollected += initialSearch.hits.length;
      
      // Process remaining pages (up to a reasonable limit)
      const maxPages = Math.min(totalPages, 50); // Limit to 50 pages to avoid excessive API calls
      
      for (let page = 1; page < maxPages; page++) {
        try {
          const pageParams = { ...searchParams, offset: page * limit };
          const pageResults = await this.searchJobs(pageParams);
          
          allJobs.push(...pageResults.hits);
          jobsCollected += pageResults.hits.length;
          
          logger.debug(`Collected page ${page + 1} of ${maxPages}`, { 
            pageJobCount: pageResults.hits.length,
            totalCollected: jobsCollected 
          });
          
          // Introduce a small delay to be nice to the API
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          const errorDetail: ErrorDetails = {
            code: 'jobtech_page_fetch_error',
            message: `Failed to fetch page ${page + 1}: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            severity: 'error',
            context: { page }
          };
          errors.push(errorDetail);
          logger.error('Error fetching JobTech API page', errorDetail);
        }
      }
      
      // Process and validate all collected jobs
      logger.info('Processing and validating collected JobTech jobs', { count: allJobs.length });
      
      const processedJobs = [];
      let validationFailures = 0;
      
      for (const job of allJobs) {
        try {
          // Transform JobTech data to our unified format
          const jobData = jobtechToJobData(job);
          
          // Validate the job data
          const validationResult = validateJobData(jobData);
          
          if (validationResult.valid) {
            processedJobs.push(jobData);
          } else {
            validationFailures++;
            // Add validation issues to the job for reporting
            jobData.collectingMetadata.validationIssues = validationResult.issues;
            
            // If only warnings, still include the job
            if (validationResult.issues.every(issue => issue.severity !== 'error')) {
              processedJobs.push(jobData);
            }
          }
        } catch (error) {
          validationFailures++;
          const errorDetail: ErrorDetails = {
            code: 'jobtech_job_processing_error',
            message: `Failed to process job: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            severity: 'error',
            context: { jobId: job.id }
          };
          errors.push(errorDetail);
          logger.error('Error processing JobTech job', errorDetail);
        }
      }
      
      const status = errors.length === 0 ? 'success' : (processedJobs.length > 0 ? 'partial' : 'failure');
      
      return {
        sourceId: jobTechConfig.id,
        timestamp: new Date(),
        status,
        jobsCollected,
        jobsProcessed: processedJobs.length,
        jobsStored: processedJobs.length, // This will be updated when jobs are actually stored
        validationFailures,
        durationMs: Date.now() - startTime,
        errors,
        jobs: processedJobs
      };
    } catch (error) {
      const errorDetail: ErrorDetails = {
        code: 'jobtech_collection_error',
        message: `Failed to collect jobs from JobTech API: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        severity: 'critical',
        context: {}
      };
      errors.push(errorDetail);
      logger.error('Critical error in JobTech API collection', errorDetail);
      
      return {
        sourceId: jobTechConfig.id,
        timestamp: new Date(),
        status: 'failure',
        jobsCollected,
        jobsProcessed: 0,
        jobsStored: 0,
        validationFailures: 0,
        durationMs: Date.now() - startTime,
        errors,
        jobs: []
      };
    }
  }

  /**
   * Get search parameters optimized for student-relevant jobs
   * @param studentRelevantOnly Only include student-relevant filters if true
   * @returns JobTech search parameters with a guaranteed limit value
   */
  private getStudentJobsSearchParams(studentRelevantOnly: boolean): Required<Pick<JobTechSearchParams, 'limit'>> & JobTechSearchParams {
    const params: JobTechSearchParams = {
      limit: parseInt(process.env.JOBTECH_SEARCH_DEFAULT_LIMIT || '20'),
      offset: 0,
      sort: 'pubdate-desc'
    };
    
    if (studentRelevantOnly) {
      // Add filters to target student-friendly jobs
      params.q = 'student praktik trainee extrajobb deltid'; // Keywords for student jobs
      params.experience = false; // No experience required
      params['worktime-extent'] = ['PART_TIME']; // Part-time jobs
      
      // Include education fields popular with students
      params['occupation-field'] = [
        '3',  // Data/IT
        '5',  // Education
        '9',  // Natural sciences/Research
        '11', // Economics/Administration
        '12', // Healthcare
        '18', // Technology/Engineering
        '22'  // Culture/Media/Design
      ];
    }
    
    return params as Required<Pick<JobTechSearchParams, 'limit'>> & JobTechSearchParams;
  }

  /**
   * Handle rate limiting for API requests
   * @param config Axios request config
   * @returns Modified config
   */
  private async handleRateLimiting(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    // Check if we need to reset the counter
    if (Date.now() > this.rateLimitResetTime) {
      this.rateLimitCounter = 0;
      this.rateLimitResetTime = Date.now() + 60000; // Reset after 1 minute
    }
    
    // Check if we've exceeded the rate limit
    if (this.rateLimitCounter >= jobTechConfig.rateLimitPerMinute) {
      // Wait until the reset time
      const waitTime = this.rateLimitResetTime - Date.now();
      if (waitTime > 0) {
        logger.debug(`Rate limit reached, waiting ${waitTime}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Reset counter and time after waiting
        this.rateLimitCounter = 0;
        this.rateLimitResetTime = Date.now() + 60000;
      }
    }
    
    // Increment counter and return config
    this.rateLimitCounter++;
    return config;
  }

  /**
   * Handle API errors with retry logic
   * @param error Axios error
   * @returns Promise rejection or resolved response
   */
  private async handleApiError(error: AxiosError): Promise<any> {
    if (!error.config) {
      return Promise.reject(error);
    }
    
    // Extract retry count from config
    const config = error.config as any;
    const retryCount = config.__retryCount || 0;
    
    // Check if we should retry
    if (retryCount < jobTechConfig.retryConfig.maxRetries) {
      // Retry count will be used in the interceptor again
      config.__retryCount = retryCount + 1;
      
      // Calculate delay time with exponential backoff
      const delayTime = jobTechConfig.retryConfig.initialDelay * 
                        Math.pow(jobTechConfig.retryConfig.backoffFactor, retryCount);
      
      logger.debug(`Retrying JobTech API request (${retryCount + 1}/${jobTechConfig.retryConfig.maxRetries}) after ${delayTime}ms`, {
        url: config.url,
        method: config.method,
        status: error.response?.status
      });
      
      // Wait for the delay time
      await new Promise(resolve => setTimeout(resolve, delayTime));
      
      // Retry the request
      return this.apiClient(config);
    }
    
    // If we've used all retries, reject with the original error
    return Promise.reject(error);
  }
}

// Create and export a singleton instance
const jobtechService = new JobTechService();
export { jobtechService };