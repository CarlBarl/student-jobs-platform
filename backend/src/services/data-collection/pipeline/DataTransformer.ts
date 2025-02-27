import { JobDto } from '../interfaces/DataSource';
import { Logger } from '../../../utils/logger';

/**
 * Service for transforming and normalizing job data
 */
export class DataTransformer {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('DataTransformer');
  }
  
  /**
   * Transform and normalize job data
   */
  async transform(jobs: JobDto[]): Promise<JobDto[]> {
    this.logger.info(`Transforming ${jobs.length} jobs`);
    
    return Promise.all(jobs.map(async job => {
      try {
        return this.transformJob(job);
      } catch (error) {
        this.logger.error(`Failed to transform job ${job.sourceJobId}`, { error });
        return job; // Return original job if transformation fails
      }
    }));
  }
  
  /**
   * Transform a single job
   */
  private async transformJob(job: JobDto): Promise<JobDto> {
    // Create a new object to avoid modifying the original
    const transformedJob: JobDto = { ...job };
    
    // Normalize title - remove extra whitespace and common prefixes
    transformedJob.title = this.normalizeTitle(job.title);
    
    // Normalize company name
    transformedJob.company = this.normalizeCompanyName(job.company);
    
    // Normalize and enrich location
    transformedJob.location = this.normalizeLocation(job.location);
    
    // Clean description - remove HTML, normalize whitespace
    if (job.description) {
      transformedJob.description = this.cleanDescription(job.description);
    }
    
    // Clean requirements if present
    if (job.requirements) {
      transformedJob.requirements = this.cleanDescription(job.requirements);
    }
    
    // Ensure URL is absolute
    transformedJob.url = this.ensureAbsoluteUrl(job.url, job.sourceId);
    
    return transformedJob;
  }
  
  /**
   * Normalize job title by removing extra whitespace and common prefixes
   */
  private normalizeTitle(title: string): string {
    let normalized = title.trim();
    
    // Remove common prefixes like "Looking for:" or "Now hiring:"
    const commonPrefixes = [
      /^(looking for|seeking|hiring|now hiring|we need a|join us as an?|position available:?\s*)/i
    ];
    
    for (const prefix of commonPrefixes) {
      normalized = normalized.replace(prefix, '');
    }
    
    // Replace multiple spaces with a single space
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
  
  /**
   * Normalize company name
   */
  private normalizeCompanyName(company: string): string {
    let normalized = company.trim();
    
    // Remove legal entity suffixes if present
    const legalSuffixes = [
      /\s+(AB|Aktiebolag|Inc\.|LLC|Ltd\.?|GmbH|S\.A\.|B\.V\.)$/i
    ];
    
    for (const suffix of legalSuffixes) {
      normalized = normalized.replace(suffix, '');
    }
    
    // Replace multiple spaces with a single space
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
  
  /**
   * Normalize and enrich location information
   */
  private normalizeLocation(location: string): string {
    // For now, just clean up the string
    return location.replace(/\s+/g, ' ').trim();
    
    // TODO: In the future, we could:
    // 1. Geocode the location to get standardized city/region names
    // 2. Add missing information (e.g., add country if missing)
    // 3. Format consistently (e.g., "City, Region, Country")
  }
  
  /**
   * Clean job description by removing HTML tags and normalizing whitespace
   */
  private cleanDescription(description: string): string {
    // Remove HTML tags
    let cleaned = description.replace(/<[^>]*>/g, ' ');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
  
  /**
   * Ensure URL is absolute by adding base URL if needed
   */
  private ensureAbsoluteUrl(url: string, sourceId: string): string {
    if (!url) return '';
    
    try {
      // Check if URL is already absolute
      new URL(url);
      return url;
    } catch (error) {
      // URL is relative, add base URL based on source
      // This is a simplified example - in a real implementation,
      // we would look up the base URL for each source
      const sourceBaseUrls: Record<string, string> = {
        'jobtech-api': 'https://arbetsformedlingen.se',
        // Add other sources as needed
      };
      
      const baseUrl = sourceBaseUrls[sourceId] || '';
      
      if (!baseUrl) {
        this.logger.warn(`Unknown source ID for relative URL: ${sourceId}`);
        return url;
      }
      
      // Ensure the URL starts with a slash
      const relativeUrl = url.startsWith('/') ? url : `/${url}`;
      
      return `${baseUrl}${relativeUrl}`;
    }
  }
}