import { BaseApiSource } from './BaseApiSource';
import { ApiSourceConfig, JobDto } from '../../interfaces';

interface JobTechJob {
  id: string;
  headline: string;
  description: {
    text: string;
    company_information?: string;
    needs?: string;
    requirements?: string;
  };
  application: {
    url?: string;
    email?: string;
  };
  employer: {
    name: string;
    organization_number?: string;
  };
  publication_date: string;
  last_publication_date: string;
  working_hours_type: {
    concept_id: string;
    label: string;
  };
  salary_type?: {
    concept_id: string;
    label: string;
  };
  salary?: {
    currency: string;
    value: number;
  };
  workplace_address: {
    municipality?: string;
    region?: string;
    country?: string;
    street_address?: string;
    postcode?: string;
    city?: string;
  };
}

interface JobTechSearchResponse {
  total: {
    value: number;
  };
  hits: JobTechJob[];
}

/**
 * JobTech API adapter for Swedish Public Employment Service job listings
 */
export class JobTechApiSource extends BaseApiSource {
  private oauth: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    accessToken?: string;
    expiresAt?: number;
  };
  
  constructor(config: ApiSourceConfig) {
    super(config);
    
    // Extract JobTech-specific configuration
    const { clientId, clientSecret, tokenUrl } = config.sourceSpecificConfig.oauth || {};
    
    if (!clientId || !clientSecret || !tokenUrl) {
      throw new Error('JobTech API requires OAuth client ID, client secret, and token URL');
    }
    
    this.oauth = {
      clientId,
      clientSecret,
      tokenUrl
    };
  }
  
  /**
   * Authenticate with the JobTech API using OAuth
   */
  async authenticate(): Promise<void> {
    // Skip if we have a valid token
    if (this.oauth.accessToken && this.oauth.expiresAt && this.oauth.expiresAt > Date.now()) {
      this.logger.debug('Using existing OAuth token');
      return;
    }
    
    try {
      this.logger.info('Authenticating with JobTech API');
      
      const response = await axios.post(
        this.oauth.tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.oauth.clientId,
          client_secret: this.oauth.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const { access_token, expires_in } = response.data;
      
      this.oauth.accessToken = access_token;
      this.oauth.expiresAt = Date.now() + (expires_in * 1000) - 60000; // Subtract 1 minute for safety
      
      // Update the Authorization header
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      this.logger.info('Successfully authenticated with JobTech API');
    } catch (error) {
      this.logger.error('Failed to authenticate with JobTech API', { error });
      throw new Error(`JobTech API authentication failed: ${error.message}`);
    }
  }
  
  /**
   * Main collection method
   */
  async collect(): Promise<JobDto[]> {
    this.logger.info('Starting job collection from JobTech API');
    
    try {
      // Authenticate first
      await this.authenticate();
      
      // Fetch jobs with student-relevant filters
      const jobs = await this.fetchJobs({
        limit: 100,
        offset: 0,
        filters: [
          // Focus on part-time and temporary jobs for students
          { term: { working_hours_type_concept_id: ['STTJ', 'DELT'] } },
          // Recent jobs only (last 30 days)
          { range: { publication_date: { gte: 'now-30d/d' } } }
        ]
      });
      
      this.logger.info(`Successfully collected ${jobs.length} jobs from JobTech API`);
      return jobs;
    } catch (error) {
      this.logger.error('Failed to collect jobs from JobTech API', { error });
      throw error;
    }
  }
  
  /**
   * Fetch jobs from JobTech API with pagination
   */
  async fetchJobs(params: Record<string, any>): Promise<JobDto[]> {
    let allJobs: JobDto[] = [];
    let offset = 0;
    const limit = params.limit || 100;
    let hasMore = true;
    
    while (hasMore) {
      try {
        // Prepare search query
        const searchParams = {
          ...params,
          offset,
          limit
        };
        
        // Make the API request
        const response = await this.httpClient.post<JobTechSearchResponse>(
          '/search',
          searchParams
        );
        
        // Process the response
        const { hits, total } = response.data;
        
        if (!hits || hits.length === 0) {
          hasMore = false;
          break;
        }
        
        // Transform JobTech jobs to our DTO format
        const transformedJobs = this.transformJobs(hits);
        allJobs = [...allJobs, ...transformedJobs];
        
        // Check if we need to fetch more
        offset += hits.length;
        hasMore = offset < total.value;
        
        // Add delay between requests if configured
        if (hasMore && this.requestDelay > 0) {
          await this.delay(this.requestDelay);
        }
      } catch (error) {
        this.logger.error(`Failed to fetch jobs at offset ${offset}`, { error });
        throw error;
      }
    }
    
    return allJobs;
  }
  
  /**
   * Transform JobTech job data to our standardized format
   */
  private transformJobs(jobs: JobTechJob[]): JobDto[] {
    return jobs.map(job => {
      // Extract location from workplace address
      const location = this.formatLocation(job.workplace_address);
      
      // Format job type based on working hours
      const jobType = job.working_hours_type ? [job.working_hours_type.label] : [];
      
      // Format salary if available
      const salary = job.salary 
        ? `${job.salary.value} ${job.salary.currency}`
        : undefined;
      
      return {
        sourceId: this.id,
        sourceJobId: job.id,
        title: job.headline,
        company: job.employer.name,
        location,
        description: job.description.text,
        requirements: job.description.requirements,
        url: job.application.url || '',
        salary,
        postedDate: new Date(job.publication_date),
        expiryDate: new Date(job.last_publication_date),
        jobType,
        workHours: job.working_hours_type?.label,
        sourceData: job // Store original data for reference
      };
    });
  }
  
  /**
   * Format location from JobTech workplace address
   */
  private formatLocation(address: JobTechJob['workplace_address']): string {
    const parts = [
      address.city,
      address.municipality,
      address.region
    ].filter(Boolean);
    
    return parts.join(', ');
  }
}